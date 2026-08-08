"""
app/services/indexing_service.py
Background indexing pipeline: clone → traverse → chunk → embed → store.
Exposes a thread-pool job queue with progress tracking and cancellation.
"""

import os
import shutil
import tempfile
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from git import Repo

from app.config.settings import (
    BINARY_EXTENSIONS, SUPPORTED_EXTENSIONS, SKIP_DIRS,
    MAX_FILE_SIZE, MAX_REPO_SIZE_MB, MAX_INDEX_FILES, CHUNK_BATCH_SIZE,
)
from app.core.chunkers import chunk_file
from app.core.vector_store import get_chroma_client, get_embedding_model
from app.repositories.repo_store import add_repo
from app.utils.logging import ingest_log
from app.utils.text import parse_github_url, sanitize_collection_name

# ── Job state ──────────────────────────────────────────────────────────────
_jobs_lock = threading.Lock()
_jobs: Dict[str, Dict[str, Any]] = {}
_cancel_tokens: set[str] = set()
_executor = ThreadPoolExecutor(max_workers=2)

# Public aliases needed by routes
jobs_lock = _jobs_lock
indexing_jobs = _jobs


def get_job_status(slug: str) -> Optional[Dict[str, Any]]:
    with _jobs_lock:
        return _jobs.get(slug)


def request_cancel(slug: str) -> bool:
    with _jobs_lock:
        job = _jobs.get(slug)
        if job and job["status"] in {"pending", "cloning", "chunking", "embedding"}:
            _cancel_tokens.add(slug)
            job.update({"status": "cancelled", "percent": 100, "error": "Cancelled by user"})
            return True
    return False


def _update(slug: str, percent: int, current_file: str, status: str,
            error: Optional[str] = None, processed: int = 0, total: int = 0) -> None:
    with _jobs_lock:
        _jobs[slug] = {
            "percent": percent,
            "current_file": current_file,
            "status": status,
            "error": error,
            "processed_files": processed,
            "total_files": total,
        }


def _worker(repo_url: str, github_token: Optional[str], slug: str) -> None:
    temp_dir = Path(tempfile.mkdtemp(prefix="repochat_"))
    try:
        # 1. Clone
        _update(slug, 10, "cloning repository…", "cloning")
        clone_url, _ = parse_github_url(repo_url, github_token)
        ingest_log.info(f"Cloning {clone_url}")
        Repo.clone_from(clone_url, temp_dir, depth=1)

        if slug in _cancel_tokens:
            raise InterruptedError()

        # 2. Traverse
        _update(slug, 30, "scanning files…", "traversing")
        all_files: list[Path] = []
        total_size = 0

        for root, dirs, files in os.walk(temp_dir):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for fname in files:
                fpath = Path(root) / fname
                if slug in _cancel_tokens:
                    raise InterruptedError()
                if fpath.suffix.lower() in BINARY_EXTENSIONS:
                    continue
                if fpath.suffix.lower() not in SUPPORTED_EXTENSIONS:
                    continue
                try:
                    size = fpath.stat().st_size
                    if size > MAX_FILE_SIZE:
                        continue
                    total_size += size
                except Exception:
                    continue
                all_files.append(fpath)

        if len(all_files) > MAX_INDEX_FILES:
            raise ValueError(f"File count exceeds limit ({MAX_INDEX_FILES}).")
        if total_size > MAX_REPO_SIZE_MB * 1024 * 1024:
            raise ValueError(f"Repository size exceeds {MAX_REPO_SIZE_MB} MB.")

        # 3. Chunk
        n = len(all_files)
        _update(slug, 45, f"chunking {n} files…", "chunking", total=n)
        all_chunks: list[Dict[str, Any]] = []
        processed_files: list[str] = []
        lang_counter: Dict[str, int] = {}

        for i, fpath in enumerate(all_files):
            if slug in _cancel_tokens:
                raise InterruptedError()
            rel = str(fpath.relative_to(temp_dir)).replace("\\", "/")
            _update(slug, 45 + int(i / n * 15), f"chunking: {rel}", "chunking", processed=i, total=n)
            chunks = chunk_file(fpath, temp_dir)
            if chunks:
                all_chunks.extend(chunks)
                processed_files.append(rel)
                lang_counter[fpath.suffix.lower()] = lang_counter.get(fpath.suffix.lower(), 0) + 1

        if not all_chunks:
            raise ValueError("No extractable content found in repository.")

        # 4. Embed & ingest
        _update(slug, 60, "loading embedding model…", "embedding",
                processed=len(processed_files), total=n)
        model = get_embedding_model()
        chroma = get_chroma_client()
        col_name = sanitize_collection_name(slug)

        try:
            chroma.delete_collection(col_name)
        except Exception:
            pass
        collection = chroma.create_collection(col_name)

        docs = [c["chunk"] for c in all_chunks]
        metadatas = []
        for c in all_chunks:
            meta = {**c["metadata"], "repo_name": slug}
            metadatas.append({k: ("" if v is None else v) for k, v in meta.items()})
        ids = [f"{m['file']}-{idx}" for idx, m in enumerate(metadatas)]

        total_chunks = len(docs)
        for start in range(0, total_chunks, CHUNK_BATCH_SIZE):
            if slug in _cancel_tokens:
                raise InterruptedError()
            end = min(start + CHUNK_BATCH_SIZE, total_chunks)
            _update(slug, 60 + int(start / total_chunks * 35),
                    f"embedding {start}–{end}/{total_chunks}…", "embedding",
                    processed=len(processed_files), total=n)
            embs = model.encode(docs[start:end], normalize_embeddings=True).tolist()
            collection.add(ids=ids[start:end], documents=docs[start:end],
                           embeddings=embs, metadatas=metadatas[start:end])

        # 5. Persist metadata
        _update(slug, 98, "writing metadata…", "saving")
        add_repo(slug=slug, url=repo_url, file_count=len(processed_files),
                 chunk_count=total_chunks, languages=lang_counter,
                 processed_files=processed_files, total_size=total_size)
        _update(slug, 100, "done.", "completed", processed=len(processed_files), total=n)
        ingest_log.info(f"Indexed {slug}: {len(processed_files)} files, {total_chunks} chunks.")

    except InterruptedError:
        ingest_log.warning(f"Indexing cancelled: {slug}")
        try:
            get_chroma_client().delete_collection(sanitize_collection_name(slug))
        except Exception:
            pass
        _update(slug, 100, "cancelled.", "cancelled", error="Cancelled by user")

    except Exception as exc:
        ingest_log.error(f"Indexing failed for {slug}: {exc}", exc_info=True)
        try:
            get_chroma_client().delete_collection(sanitize_collection_name(slug))
        except Exception:
            pass
        _update(slug, 100, f"failed: {exc}", "failed", error=str(exc))

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
        with _jobs_lock:
            _cancel_tokens.discard(slug)


def start_indexing_job(repo_url: str, github_token: Optional[str]) -> Tuple[str, str]:
    """Submit a new indexing job. Returns (slug, initial_status)."""
    _, slug = parse_github_url(repo_url, github_token)
    with _jobs_lock:
        existing = _jobs.get(slug)
        if existing and existing["status"] in {"pending", "cloning", "chunking", "embedding"}:
            return slug, existing["status"]
        _jobs[slug] = {"percent": 0, "current_file": "queued…", "status": "pending", "error": None}
    _executor.submit(_worker, repo_url, github_token, slug)
    return slug, "pending"
