"""
Share cache for RepoChat.
Persists the last N chat exchanges per repo so they can be fetched
via the public /api/share/:slug/:message_id endpoint.
Uses the same JSON-file pattern as repo_cache.py — no new database.
"""

import json
import os
import time
import random
import string
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from utils import app_logger

# Store share data alongside the existing cache dir
_SHARE_CACHE_PATH = Path(__file__).resolve().parent / "cache" / "share_data.json"

# Keep at most this many exchanges per repo slug in memory
MAX_SHARES_PER_REPO = 100


# ── Internal helpers ───────────────────────────────────

def _ensure_dir() -> None:
    _SHARE_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)


def _load() -> Dict[str, Any]:
    if not _SHARE_CACHE_PATH.exists():
        return {}
    try:
        with open(_SHARE_CACHE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        app_logger.warning("share_data.json corrupted, starting fresh.")
        return {}


def _save(data: Dict[str, Any]) -> None:
    _ensure_dir()
    with open(_SHARE_CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


def _short_id(length: int = 8) -> str:
    """Generate a short alphanumeric ID (URL-safe)."""
    chars = string.ascii_lowercase + string.digits
    return "".join(random.choices(chars, k=length))


# ── Public API ─────────────────────────────────────────

def save_exchange(
    slug: str,
    question: str,
    answer: str,
    citations: List[Dict[str, Any]],
    repo_url: str = "",
) -> str:
    """
    Persist a Q&A exchange and return its short message_id.
    Thread-safe enough for single-process Flask dev server;
    for multi-worker prod you'd use a proper store.
    """
    data = _load()
    if slug not in data:
        data[slug] = {}

    message_id = _short_id()
    # Avoid (astronomically rare) collisions
    while message_id in data[slug]:
        message_id = _short_id()

    data[slug][message_id] = {
        "message_id": message_id,
        "slug": slug,
        "repo_url": repo_url,
        "question": question,
        "answer": answer,
        "citations": citations,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    # Trim old entries if over limit
    slugged = data[slug]
    if len(slugged) > MAX_SHARES_PER_REPO:
        # Remove the oldest entries by timestamp
        sorted_ids = sorted(
            slugged.keys(),
            key=lambda k: slugged[k].get("timestamp", ""),
        )
        for old_id in sorted_ids[: len(slugged) - MAX_SHARES_PER_REPO]:
            del slugged[old_id]

    _save(data)
    app_logger.info(f"Saved share exchange {message_id} for {slug}")
    return message_id


def get_exchange(slug: str, message_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a stored exchange by slug + message_id."""
    data = _load()
    return data.get(slug, {}).get(message_id)


def list_exchanges(slug: str) -> List[Dict[str, Any]]:
    """List all stored exchanges for a repo slug."""
    data = _load()
    return list(data.get(slug, {}).values())
