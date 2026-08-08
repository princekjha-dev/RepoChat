"""
Repository metadata cache.
Replaces the old text-file repo index with a proper JSON store
that tracks metadata per repository (files, chunks, languages, etc.).
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from config import REPO_CACHE_PATH
from utils.logger import app_logger


def _ensure_cache_dir() -> None:
    """Create cache directory if it doesn't exist."""
    REPO_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)


def _load_cache() -> Dict[str, Any]:
    """Load the cache from disk."""
    if not REPO_CACHE_PATH.exists():
        return {"repos": {}}
    try:
        with open(REPO_CACHE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        app_logger.warning("Cache file corrupted, starting fresh.")
        return {"repos": {}}


def _save_cache(data: Dict[str, Any]) -> None:
    """Write the cache to disk."""
    _ensure_cache_dir()
    with open(REPO_CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


def is_indexed(slug: str) -> bool:
    """Check if a repository has already been indexed."""
    cache = _load_cache()
    return slug in cache["repos"]


def get_repo(slug: str) -> Optional[Dict[str, Any]]:
    """Get metadata for a single repository."""
    cache = _load_cache()
    return cache["repos"].get(slug)


def add_repo(
    slug: str,
    url: str,
    file_count: int,
    chunk_count: int,
    languages: Dict[str, int],
    processed_files: List[str],
    total_size: int = 0,
) -> Dict[str, Any]:
    """Add or update a repository in the cache."""
    cache = _load_cache()

    repo_data = {
        "slug": slug,
        "url": url,
        "file_count": file_count,
        "chunk_count": chunk_count,
        "languages": languages,
        "processed_files": processed_files,
        "total_size": total_size,
        "indexed_at": datetime.now(timezone.utc).isoformat(),
    }

    cache["repos"][slug] = repo_data
    _save_cache(cache)
    app_logger.info(f"Cached repo: {slug} ({file_count} files, {chunk_count} chunks)")
    return repo_data


def list_repos() -> List[Dict[str, Any]]:
    """List all indexed repositories."""
    cache = _load_cache()
    return list(cache["repos"].values())


def list_repo_slugs() -> List[str]:
    """List all indexed repository slugs."""
    cache = _load_cache()
    return list(cache["repos"].keys())


def delete_repo(slug: str) -> bool:
    """Remove a repository from the cache."""
    cache = _load_cache()
    if slug in cache["repos"]:
        del cache["repos"][slug]
        _save_cache(cache)
        app_logger.info(f"Deleted repo from cache: {slug}")
        return True
    return False


def get_repo_files(slug: str) -> List[str]:
    """Get the list of processed files for a repository."""
    repo = get_repo(slug)
    if repo:
        return repo.get("processed_files", [])
    return []


def get_repo_stats(slug: str) -> Optional[Dict[str, Any]]:
    """Get statistics for a repository."""
    repo = get_repo(slug)
    if not repo:
        return None
    return {
        "slug": repo["slug"],
        "file_count": repo["file_count"],
        "chunk_count": repo["chunk_count"],
        "languages": repo["languages"],
        "total_size": repo["total_size"],
        "indexed_at": repo["indexed_at"],
    }
