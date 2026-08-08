"""
Ingestion service.
Orchestrates: validate → check cache → clone → chunk → embed → store.
"""

import os
import shutil
from pathlib import Path
from typing import Dict, List

from services.github_service import slugify_repo_url, clone_repo, extract_repo_metadata
from chunkers.chunker_registry import chunk_file, should_skip_dir
from vectorstore.client import get_model, get_collection
from cache.repo_cache import is_indexed, add_repo
from config import BINARY_EXTENSIONS, MAX_FILE_SIZE, MAX_REPO_SIZE_MB, MAX_INDEX_FILES
from utils.logger import ingest_logger


def ingest_repo(repo_url: str, force: bool = False, status_callback = None) -> Dict[str, object]:
    """
    Ingest a GitHub repository:
    1. Slugify the URL
    2. Check if already indexed (skip if so, unless force=True)
    3. Clone the repository (shallow)
    4. Extract metadata
    5. Chunk all supported files
    6. Generate embeddings and store in ChromaDB
    7. Cache repo metadata

    Returns dict with: slug, file_count, chunk_count, languages, files, etc.
    """
    try:
        slug = slugify_repo_url(repo_url)
    except Exception as e:
        ingest_logger.error(f"Failed to create slug from {repo_url}: {e}", exc_info=True)
        raise

    # Check if already indexed
    if not force and is_indexed(slug):
        ingest_logger.info(f"Repository already indexed: {slug} (use force=True to re-index)")
        from cache.repo_cache import get_repo
        cached = get_repo(slug)
        if status_callback:
            status_callback("completed", 100, processed=cached.get("file_count", 0), total=cached.get("file_count", 0))
        return {
            "slug": slug,
            "chunks": cached.get("chunk_count", 0),
            "files": cached.get("file_count", 0),
            "languages": cached.get("languages", {}),
            "processed_files": cached.get("processed_files", []),
            "already_indexed": True,
        }

    # Clone the repository
    if status_callback:
        status_callback("cloning", 15)
    repo_dir = clone_repo(repo_url)

    try:
        # Extract metadata
        if status_callback:
            status_callback("cloning", 30)
        metadata = extract_repo_metadata(repo_dir)

        # Size and file count validations
        total_size = metadata.get("total_size", 0)
        file_count = metadata.get("file_count", 0)
        if total_size > MAX_REPO_SIZE_MB * 1024 * 1024:
            raise ValueError(f"Repository size ({total_size / (1024 * 1024):.1f}MB) exceeds the {MAX_REPO_SIZE_MB}MB limit.")
        if file_count > MAX_INDEX_FILES:
            raise ValueError(f"Repository file count ({file_count}) exceeds the {MAX_INDEX_FILES} files limit.")

        # Chunk all files
        if status_callback:
            status_callback("chunking", 45, processed=0, total=file_count)

        processed_files: List[str] = []
        all_chunks = []

        for root, dirs, files in os.walk(repo_dir):
            root_path = Path(root)
            dirs[:] = [d for d in dirs if not should_skip_dir(root_path / d)]

            for file_name in files:
                file_path = root_path / file_name

                if should_skip_dir(file_path):
                    continue
                if file_path.suffix.lower() in BINARY_EXTENSIONS:
                    continue
                try:
                    if file_path.stat().st_size > MAX_FILE_SIZE:
                        continue
                except OSError:
                    continue

                chunks = chunk_file(file_path, repo_dir)
                if not chunks:
                    continue

                relative = str(file_path.relative_to(repo_dir)).replace("\\", "/")
                processed_files.append(relative)

                for item in chunks:
                    all_chunks.append((item["chunk"], item["metadata"]))

                if status_callback:
                    # chunking progress scale: 45% -> 60%
                    pct = 45 + int((len(processed_files) / max(1, file_count)) * 15)
                    status_callback("chunking", pct, processed=len(processed_files), total=file_count)

        # Generate embeddings and store
        if all_chunks:
            model = get_model()
            collection = get_collection(slug)

            # If force is True, delete the existing collection to prevent duplication
            if force:
                from vectorstore.client import delete_collection
                delete_collection(slug)
                collection = get_collection(slug)

            documents = [chunk for chunk, _ in all_chunks]
            metadatas = [meta for _, meta in all_chunks]

            # Ensure metadata values are strings (ChromaDB requirement for some fields)
            clean_metadatas = []
            for meta in metadatas:
                clean = {}
                for k, v in meta.items():
                    if v is None:
                        clean[k] = ""
                    elif isinstance(v, (int, float)):
                        clean[k] = v
                    else:
                        clean[k] = str(v)
                clean_metadatas.append(clean)

            ids = [
                f"{meta['file']}-{index}"
                for index, meta in enumerate(clean_metadatas)
            ]

            ingest_logger.info(f"Generating embeddings for {len(documents)} chunks...")
            
            try:
                # Batch embedding generation and vector store adds
                batch_size = 32
                total_chunks = len(documents)
                
                # Import db_lock to serialize write operations
                from vectorstore.client import db_lock
                
                for i in range(0, total_chunks, batch_size):
                    if status_callback:
                        # embedding progress scale: 60% -> 95%
                        pct = 60 + int((i / total_chunks) * 35) if total_chunks > 0 else 60
                        status_callback("embedding", pct, processed=len(processed_files), total=file_count)
                    
                    batch_docs = documents[i:i + batch_size]
                    batch_metas = clean_metadatas[i:i + batch_size]
                    batch_ids = ids[i:i + batch_size]
                    
                    try:
                        ingest_logger.debug(f"Encoding batch {i//batch_size + 1} ({len(batch_docs)} docs)")
                        batch_embeddings = model.encode(batch_docs, normalize_embeddings=True)
                        
                        ingest_logger.debug(f"Adding batch to collection: {len(batch_ids)} chunks")
                        with db_lock:
                            collection.add(
                                ids=batch_ids,
                                documents=batch_docs,
                                embeddings=batch_embeddings.tolist(),
                                metadatas=batch_metas,
                            )
                        ingest_logger.debug(f"Successfully added batch {i//batch_size + 1}")
                    except Exception as batch_error:
                        ingest_logger.error(f"Error processing batch at position {i}: {batch_error}", exc_info=True)
                        raise
                
                ingest_logger.info(f"Successfully stored {len(documents)} chunks in ChromaDB.")
                
            except Exception as embed_error:
                ingest_logger.error(f"Failed to generate embeddings or store in ChromaDB: {embed_error}", exc_info=True)
                raise
        else:
            ingest_logger.warning(f"No chunks to embed for repository {slug} - possibly no indexable files found")

        # Cache the repo metadata
        if status_callback:
            status_callback("embedding", 98, processed=len(processed_files), total=file_count)

        add_repo(
            slug=slug,
            url=repo_url,
            file_count=len(processed_files),
            chunk_count=len(all_chunks),
            languages=metadata["languages"],
            processed_files=processed_files,
            total_size=metadata["total_size"],
        )

        ingest_logger.info(
            f"Ingestion complete: {slug} "
            f"({len(processed_files)} files, {len(all_chunks)} chunks)"
        )

        return {
            "slug": slug,
            "chunks": len(all_chunks),
            "files": len(processed_files),
            "languages": metadata["languages"],
            "processed_files": processed_files,
            "already_indexed": False,
        }

    finally:
        shutil.rmtree(repo_dir, ignore_errors=True)
