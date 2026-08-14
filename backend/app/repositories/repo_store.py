"""
app/repositories/repo_store.py
JSON-file cache for indexed repository metadata.
All disk I/O is isolated here — no other module touches the cache file.
"""

import json
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config.settings import REPO_CACHE_FILE
from app.utils.logging import app_log


def _load() -> Dict[str, Any]:
    if not REPO_CACHE_FILE.exists():
        return {"repos": {}}
    try:
        with open(REPO_CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"repos": {}}


def _save(data: Dict[str, Any]) -> None:
    REPO_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(REPO_CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


def list_repos() -> List[Dict[str, Any]]:
    return list(_load()["repos"].values())


def get_repo(slug: str) -> Optional[Dict[str, Any]]:
    if not slug:
        return None
    from app.utils.text import normalize_repo_slug
    norm = normalize_repo_slug(slug)
    repos = _load()["repos"]
    if norm in repos:
        return repos[norm]
    if slug in repos:
        return repos[slug]
    for k, v in repos.items():
        if k.lower() == norm.lower() or k.replace("/", "_").lower() == norm.lower():
            return v
    return None


def add_repo(
    slug: str,
    url: str,
    file_count: int,
    chunk_count: int,
    languages: Dict[str, int],
    processed_files: List[str],
    total_size: int,
) -> None:
    data = _load()
    data["repos"][slug] = {
        "slug": slug,
        "url": url,
        "file_count": file_count,
        "chunk_count": chunk_count,
        "languages": languages,
        "processed_files": processed_files,
        "total_size": total_size,
        "indexed_at": time.time(),
    }
    _save(data)


def delete_repo(slug: str) -> bool:
    data = _load()
    if slug in data["repos"]:
        del data["repos"][slug]
        _save(data)
        return True
    return False
