"""
Indexer module for RepoChat.
Handles cloning, file traversal, code chunking, vector embedding,
and database loading inside a thread pool with progress updates.
"""

import os
import re
import shutil
import tempfile
import threading
import json
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
from concurrent.futures import ThreadPoolExecutor

from git import Repo
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

from utils import (
    ingest_logger,
    parse_github_url,
    sanitize_collection_name,
    count_tokens,
    chunk_text_lines
)

import ast

# ── Paths & Configuration ──────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
CHROMA_PATH = PROJECT_ROOT / "chroma_db"
REPO_CACHE_PATH = BASE_DIR / "cache" / "repo_data.json"

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
MAX_FILE_SIZE = 1024 * 1024       # 1MB
MAX_REPO_SIZE_MB = 100            # 100MB
MAX_INDEX_FILES = 2000

BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp",
    ".pdf", ".zip", ".tar", ".gz", ".rar", ".7z",
    ".exe", ".dll", ".so", ".dylib",
    ".mp3", ".mp4", ".wav", ".avi", ".mov", ".mkv",
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    ".pyc", ".pyo", ".class", ".o", ".obj",
}

SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx",
    ".java", ".cpp", ".go", ".rs",
    ".md", ".txt", ".json", ".yaml", ".yml", ".toml", ".env.example"
}

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", ".nuxt", ".output",
    ".cache", ".tox", ".mypy_cache", ".pytest_cache",
    "vendor", "target", "bin", "obj",
    ".idea", ".vscode", ".vs",
    "coverage", ".nyc_output",
}

# ── Singleton Managers for Model & Vector DB ───────────
_lock = threading.Lock()
_model: Optional[SentenceTransformer] = None
_chroma_client: Optional[chromadb.PersistentClient] = None

def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                ingest_logger.info(f"Loading SentenceTransformer: {EMBEDDING_MODEL}")
                _model = SentenceTransformer(EMBEDDING_MODEL)
                ingest_logger.info("SentenceTransformer model loaded.")
    return _model

def get_chroma_client() -> chromadb.PersistentClient:
    global _chroma_client
    if _chroma_client is None:
        with _lock:
            if _chroma_client is None:
                CHROMA_PATH.mkdir(parents=True, exist_ok=True)
                ingest_logger.info(f"Initializing ChromaDB client at: {CHROMA_PATH}")
                _chroma_client = chromadb.PersistentClient(path=str(CHROMA_PATH))
    return _chroma_client


# ── Metadata Cache Store ────────────────────────────────

def _load_cache() -> Dict[str, Any]:
    if not REPO_CACHE_PATH.exists():
        return {"repos": {}}
    try:
        with open(REPO_CACHE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"repos": {}}

def _save_cache(data: Dict[str, Any]) -> None:
    REPO_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(REPO_CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)

def list_repos() -> List[Dict[str, Any]]:
    cache = _load_cache()
    return list(cache["repos"].values())

def get_repo(slug: str) -> Optional[Dict[str, Any]]:
    if not slug:
        return None
    cache = _load_cache()
    repos = cache.get("repos", {})
    if slug in repos:
        return repos[slug]
    normalized_input = slug.replace("/", "_").lower()
    for k, v in repos.items():
        if k.replace("/", "_").lower() == normalized_input:
            return v
    return None

def delete_repo_from_cache(slug: str) -> bool:
    if not slug:
        return False
    cache = _load_cache()
    repos = cache.get("repos", {})
    target = None
    if slug in repos:
        target = slug
    else:
        normalized_input = slug.replace("/", "_").lower()
        for k in repos.keys():
            if k.replace("/", "_").lower() == normalized_input:
                target = k
                break
    if target and target in repos:
        del repos[target]
        _save_cache(cache)
        return True
    return False

def add_repo_to_cache(
    slug: str,
    url: str,
    file_count: int,
    chunk_count: int,
    languages: Dict[str, int],
    processed_files: List[str],
    total_size: int
) -> None:
    cache = _load_cache()
    cache["repos"][slug] = {
        "slug": slug,
        "url": url,
        "file_count": file_count,
        "chunk_count": chunk_count,
        "languages": languages,
        "processed_files": processed_files,
        "total_size": total_size,
        "indexed_at": Path(REPO_CACHE_PATH).stat().st_mtime if REPO_CACHE_PATH.exists() else 0
    }
    _save_cache(cache)


# ── Thread-Safe Background Jobs Tracker ─────────────────
jobs_lock = threading.Lock()
# { job_id/slug: { percent, current_file, status, error } }
indexing_jobs: Dict[str, Dict[str, Any]] = {}
cancellation_tokens = set()

def update_job_status(
    slug: str,
    percent: int,
    current_file: str,
    status: str,
    error: Optional[str] = None,
    processed_files: int = 0,
    total_files: int = 0
):
    with jobs_lock:
        indexing_jobs[slug] = {
            "percent": percent,
            "current_file": current_file,
            "status": status,
            "error": error,
            "processed_files": processed_files,
            "total_files": total_files
        }

def get_job_status(slug: str) -> Optional[Dict[str, Any]]:
    with jobs_lock:
        return indexing_jobs.get(slug)

def request_job_cancel(slug: str) -> bool:
    with jobs_lock:
        if slug in indexing_jobs and indexing_jobs[slug]["status"] in ["pending", "cloning", "chunking", "embedding"]:
            cancellation_tokens.add(slug)
            indexing_jobs[slug]["status"] = "cancelled"
            indexing_jobs[slug]["percent"] = 100
            indexing_jobs[slug]["error"] = "Cancelled by user"
            return True
        return False


# ── Python AST Chunker ──────────────────────────────────

def chunk_python_file(path: Path, repo_root: Path) -> List[Dict[str, Any]]:
    try:
        source = path.read_text(encoding="utf-8")
    except Exception:
        return []
        
    relative_path = str(path.relative_to(repo_root)).replace("\\", "/")
    
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return chunk_text_lines(source.splitlines(), 1, relative_path)
        
    chunks = []
    lines = source.splitlines()
    
    def get_node_text(node):
        start = node.lineno - 1
        end = node.end_lineno if getattr(node, "end_lineno", None) else start + 1
        return "\n".join(lines[start:end]), start + 1, end

    # Retrieve all classes and functions
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            docstring = ast.get_docstring(node) or ""
            class_text, start, end = get_node_text(node)
            tokens = count_tokens(class_text)
            
            if tokens <= 800:
                chunks.append({
                    "chunk": class_text,
                    "metadata": {
                        "file": relative_path,
                        "type": "class",
                        "name": node.name,
                        "start_line": start,
                        "end_line": end,
                        "docstring": docstring
                    }
                })
            else:
                # Class outline up to first method definition
                first_func_line = end
                for subnode in node.body:
                    if isinstance(subnode, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        first_func_line = subnode.lineno - 1
                        break
                header_lines = lines[start-1:first_func_line]
                header_text = "\n".join(header_lines)
                chunks.append({
                    "chunk": header_text,
                    "metadata": {
                        "file": relative_path,
                        "type": "class_header",
                        "name": node.name,
                        "start_line": start,
                        "end_line": first_func_line,
                        "docstring": docstring
                    }
                })
                
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            # Determine parent ClassDef
            parent_class = ""
            for class_node in [n for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]:
                c_start = class_node.lineno
                c_end = class_node.end_lineno if getattr(class_node, "end_lineno", None) else c_start
                if c_start <= node.lineno <= c_end and class_node != node:
                    parent_class = class_node.name
                    break
                    
            func_text, start, end = get_node_text(node)
            docstring = ast.get_docstring(node) or ""
            name = f"{parent_class}.{node.name}" if parent_class else node.name
            tokens = count_tokens(func_text)
            
            if tokens <= 800:
                chunks.append({
                    "chunk": func_text,
                    "metadata": {
                        "file": relative_path,
                        "type": "method" if parent_class else "function",
                        "name": name,
                        "start_line": start,
                        "end_line": end,
                        "docstring": docstring
                    }
                })
            else:
                sub_chunks = chunk_text_lines(func_text.splitlines(), start, relative_path)
                for sc in sub_chunks:
                    sc["metadata"]["type"] = "method_chunk" if parent_class else "function_chunk"
                    sc["metadata"]["name"] = name
                    sc["metadata"]["docstring"] = docstring
                    chunks.append(sc)
                    
    if not chunks:
        chunks = chunk_text_lines(lines, 1, relative_path)
        
    return chunks


# ── JS/TS Brace Matching Chunker ────────────────────────

def chunk_jsts_file(path: Path, repo_root: Path) -> List[Dict[str, Any]]:
    try:
        source = path.read_text(encoding="utf-8")
    except Exception:
        return []
    
    relative_path = str(path.relative_to(repo_root)).replace("\\", "/")
    
    pattern = re.compile(
        r'(?:export\s+(?:default\s+)?)?(?:'
        r'class\s+(?P<class_name>\w+)|'
        r'function\s+(?P<func_name>\w+)|'
        r'const\s+(?P<comp_name>\w+)\s*=\s*(?:\([^)]*\)|[^=]+)?\s*=>|'
        r'const\s+(?P<func_expr_name>\w+)\s*=\s*function'
        r')',
        re.MULTILINE
    )
    
    chunks = []
    lines = source.splitlines()
    line_starts = []
    current_idx = 0
    for line in lines:
        line_starts.append(current_idx)
        current_idx += len(line) + 1
        
    def get_line_num(char_idx):
        import bisect
        return bisect.bisect_right(line_starts, char_idx)
        
    matches = list(pattern.finditer(source))
    covered_lines = set()
    
    for match in matches:
        start_char = match.start()
        name = (match.group('class_name') or 
                match.group('func_name') or 
                match.group('comp_name') or 
                match.group('func_expr_name'))
        if not name:
            continue
            
        search_start = match.end()
        brace_idx = source.find('{', search_start)
        if brace_idx == -1:
            continue
            
        # Count braces
        brace_count = 1
        curr_idx = brace_idx + 1
        n = len(source)
        while curr_idx < n and brace_count > 0:
            char = source[curr_idx]
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
            curr_idx += 1
            
        if brace_count == 0:
            end_char = curr_idx
            start_line = get_line_num(start_char)
            end_line = get_line_num(end_char)
            
            chunk_text = source[start_char:end_char]
            lines_range = set(range(start_line, end_line + 1))
            
            if not lines_range.intersection(covered_lines) and chunk_text.strip():
                covered_lines.update(lines_range)
                
                chunk_type = "class" if match.group('class_name') else "function"
                tokens = count_tokens(chunk_text)
                
                if tokens <= 800:
                    chunks.append({
                        "chunk": chunk_text,
                        "metadata": {
                            "file": relative_path,
                            "type": chunk_type,
                            "name": name,
                            "start_line": start_line,
                            "end_line": end_line
                        }
                    })
                else:
                    sub_chunks = chunk_text_lines(chunk_text.splitlines(), start_line, relative_path)
                    for sc in sub_chunks:
                        sc["metadata"]["type"] = f"{chunk_type}_chunk"
                        sc["metadata"]["name"] = name
                        chunks.append(sc)
                        
    # Fill remaining gaps
    uncovered_start = 1
    for start_line in range(1, len(lines) + 1):
        if start_line in covered_lines:
            if uncovered_start < start_line:
                gap_lines = lines[uncovered_start - 1 : start_line - 1]
                gap_chunks = chunk_text_lines(gap_lines, uncovered_start, relative_path)
                chunks.extend(gap_chunks)
            uncovered_start = start_line + 1
            
    if uncovered_start <= len(lines):
        gap_lines = lines[uncovered_start - 1 :]
        gap_chunks = chunk_text_lines(gap_lines, uncovered_start, relative_path)
        chunks.extend(gap_chunks)
        
    return chunks


# ── Traversal and Main Chunk Router ────────────────────

def chunk_file_router(path: Path, repo_root: Path) -> List[Dict[str, Any]]:
    suffix = path.suffix.lower()
    
    if suffix == ".py":
        return chunk_python_file(path, repo_root)
    elif suffix in {".js", ".ts", ".jsx", ".tsx"}:
        return chunk_jsts_file(path, repo_root)
    elif suffix in SUPPORTED_EXTENSIONS:
        try:
            source = path.read_text(encoding="utf-8")
            return chunk_text_lines(source.splitlines(), 1, str(path.relative_to(repo_root)).replace("\\", "/"))
        except Exception:
            return []
    return []


# ── Index Worker Task ──────────────────────────────────

def run_indexing_worker(repo_url: str, github_token: Optional[str], slug: str):
    # Setup cancellation token
    with jobs_lock:
        if slug in cancellation_tokens:
            cancellation_tokens.discard(slug)
            
    temp_dir = Path(tempfile.mkdtemp(prefix="repochat_cloning_"))
    try:
        # 1. Clone
        update_job_status(slug, 10, "cloning repository...", "cloning")
        clone_url, _ = parse_github_url(repo_url, github_token)
        
        ingest_logger.info(f"Cloning {clone_url} to {temp_dir}")
        Repo.clone_from(clone_url, temp_dir, depth=1)
        
        if slug in cancellation_tokens:
            raise InterruptedError("Cancelled by user")
            
        # 2. Traversal
        update_job_status(slug, 30, "scanning files...", "traversing", total_files=0, processed_files=0)
        
        all_files = []
        total_size = 0
        
        for root, dirs, files in os.walk(temp_dir):
            # Skip ignored directories
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            
            for file_name in files:
                file_path = Path(root) / file_name
                
                # Check cancellation
                if slug in cancellation_tokens:
                    raise InterruptedError("Cancelled by user")
                    
                if file_path.suffix.lower() in BINARY_EXTENSIONS:
                    continue
                if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
                    continue
                
                try:
                    size = file_path.stat().st_size
                    if size > MAX_FILE_SIZE:
                        continue
                    total_size += size
                except Exception:
                    continue
                    
                all_files.append(file_path)
                
        if len(all_files) > MAX_INDEX_FILES:
            raise ValueError(f"Repository file count exceeds limit of {MAX_INDEX_FILES}.")
        if total_size > MAX_REPO_SIZE_MB * 1024 * 1024:
            raise ValueError(f"Repository total size exceeds limit of {MAX_REPO_SIZE_MB}MB.")
            
        # 3. Chunking
        total_file_count = len(all_files)
        update_job_status(slug, 45, f"chunking {total_file_count} files...", "chunking", total_files=total_file_count, processed_files=0)
        
        all_chunks: List[Dict[str, Any]] = []
        processed_files: List[str] = []
        language_counter = {}
        
        for index, file_path in enumerate(all_files):
            if slug in cancellation_tokens:
                raise InterruptedError("Cancelled by user")
                
            relative_name = str(file_path.relative_to(temp_dir)).replace("\\", "/")
            update_job_status(
                slug,
                45 + int((index / total_file_count) * 15),
                f"chunking: {relative_name}",
                "chunking",
                processed_files=index,
                total_files=total_file_count
            )
            
            chunks = chunk_file_router(file_path, temp_dir)
            if chunks:
                all_chunks.extend(chunks)
                processed_files.append(relative_name)
                
                ext = file_path.suffix.lower()
                language_counter[ext] = language_counter.get(ext, 0) + 1
                
        if not all_chunks:
            raise ValueError("No extractable code or text found in repository.")
            
        # 4. Embeddings & ChromaDB Ingestion
        # Pre-warm model NOW so it doesn't hang silently at 60%
        update_job_status(
            slug, 60, "loading embedding model...", "embedding",
            processed_files=len(processed_files),
            total_files=total_file_count
        )
        model = get_embedding_model()   # blocks here if first load — progress shows it clearly
        chroma = get_chroma_client()
        
        collection_name = sanitize_collection_name(slug)
        
        # Re-indexing collection cleanup
        try:
            chroma.delete_collection(collection_name)
            ingest_logger.info(f"Deleted old ChromaDB collection {collection_name}")
        except Exception:
            pass
            
        collection = chroma.create_collection(collection_name)
        
        # Prepare inputs
        documents = [c["chunk"] for c in all_chunks]
        
        # Ensure metadata values are strings or valid numeric types
        metadatas = []
        for c in all_chunks:
            meta = c["metadata"].copy()
            meta["repo_name"] = slug
            cleaned = {}
            for k, v in meta.items():
                if v is None:
                    cleaned[k] = ""
                elif isinstance(v, (int, float)):
                    cleaned[k] = v
                else:
                    cleaned[k] = str(v)
            metadatas.append(cleaned)
            
        ids = [f"{m['file']}-{idx}" for idx, m in enumerate(metadatas)]
        
        # Batch upload to ChromaDB — smaller batches = more frequent progress
        batch_size = 32   # was 100; smaller = smoother progress bar
        total_chunks = len(documents)
        
        update_job_status(
            slug, 62, f"embedding {total_chunks} chunks across {len(processed_files)} files...",
            "embedding", processed_files=len(processed_files), total_files=total_file_count
        )

        for batch_start in range(0, total_chunks, batch_size):
            if slug in cancellation_tokens:
                raise InterruptedError("Cancelled by user")

            batch_end = min(batch_start + batch_size, total_chunks)
            pct = 62 + int((batch_start / total_chunks) * 33)
            update_job_status(
                slug, pct,
                f"embedding batch {batch_start // batch_size + 1}/{-(-total_chunks // batch_size)} "
                f"({batch_end}/{total_chunks} chunks)",
                "embedding",
                processed_files=len(processed_files),
                total_files=total_file_count
            )

            b_docs   = documents[batch_start:batch_end]
            b_metas  = metadatas[batch_start:batch_end]
            b_ids    = ids[batch_start:batch_end]

            # encode with explicit batch_size to avoid internal stalls
            b_embeddings = model.encode(
                b_docs,
                normalize_embeddings=True,
                batch_size=32,
                show_progress_bar=False,
            ).tolist()

            collection.add(
                ids=b_ids,
                documents=b_docs,
                embeddings=b_embeddings,
                metadatas=b_metas
            )
            
        # 5. Success
        update_job_status(slug, 98, "writing metadata cache...", "saving")
        add_repo_to_cache(
            slug=slug,
            url=repo_url,
            file_count=len(processed_files),
            chunk_count=total_chunks,
            languages=language_counter,
            processed_files=processed_files,
            total_size=total_size
        )
        
        update_job_status(
            slug, 100, "indexing completed successfully.", "completed",
            processed_files=len(processed_files),
            total_files=total_file_count
        )
        ingest_logger.info(f"Successfully indexed repository: {slug}")
        
    except InterruptedError:
        ingest_logger.warning(f"Indexing job for {slug} was cancelled.")
        # Cleanup collection
        try:
            get_chroma_client().delete_collection(sanitize_collection_name(slug))
        except Exception:
            pass
        update_job_status(slug, 100, "cancelled by user.", "cancelled", "Cancelled by user")
        
    except Exception as e:
        ingest_logger.error(f"Error in indexing worker for {slug}: {e}", exc_info=True)
        # Cleanup collection
        try:
            get_chroma_client().delete_collection(sanitize_collection_name(slug))
        except Exception:
            pass
        update_job_status(slug, 100, f"failed: {str(e)}", "failed", str(e))
        
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
        with jobs_lock:
            cancellation_tokens.discard(slug)


# ── Background Thread Queue Entry ──────────────────────

_executor = ThreadPoolExecutor(max_workers=2)

def start_indexing_job(repo_url: str, github_token: Optional[str]) -> Tuple[str, str]:
    """
    Validates URL, parses credentials, initializes status, and submits job to pool.
    Returns (job_id / slug, initial_status).
    """
    clone_url, slug = parse_github_url(repo_url, github_token)
    
    with jobs_lock:
        existing = indexing_jobs.get(slug)
        if existing and existing["status"] in ["pending", "cloning", "chunking", "embedding"]:
            return slug, existing["status"]
            
        # Reset state
        indexing_jobs[slug] = {
            "percent": 0,
            "current_file": "queued...",
            "status": "pending",
            "error": None
        }
        
    _executor.submit(run_indexing_worker, repo_url, github_token, slug)
    return slug, "pending"
