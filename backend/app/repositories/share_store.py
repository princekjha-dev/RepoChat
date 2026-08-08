"""
app/repositories/share_store.py
JSON-file persistence for shareable Q&A exchanges.
"""

import json
import random
import string
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.config.settings import SHARE_CACHE_FILE, MAX_SHARES_PER_REPO
from app.utils.logging import app_log


def _load() -> Dict[str, Any]:
    if not SHARE_CACHE_FILE.exists():
        return {}
    try:
        with open(SHARE_CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        app_log.warning("share_data.json corrupted — starting fresh.")
        return {}


def _save(data: Dict[str, Any]) -> None:
    SHARE_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SHARE_CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


def _short_id(length: int = 8) -> str:
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=length))


def save_exchange(
    slug: str,
    question: str,
    answer: str,
    citations: List[Dict[str, Any]],
    repo_url: str = "",
) -> str:
    data = _load()
    data.setdefault(slug, {})

    message_id = _short_id()
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

    # Trim oldest entries beyond limit
    slugged = data[slug]
    if len(slugged) > MAX_SHARES_PER_REPO:
        oldest = sorted(slugged, key=lambda k: slugged[k].get("timestamp", ""))
        for old_id in oldest[: len(slugged) - MAX_SHARES_PER_REPO]:
            del slugged[old_id]

    _save(data)
    app_log.info(f"Saved share exchange {message_id} for {slug}")
    return message_id


def get_exchange(slug: str, message_id: str) -> Optional[Dict[str, Any]]:
    return _load().get(slug, {}).get(message_id)


def list_exchanges(slug: str) -> List[Dict[str, Any]]:
    return list(_load().get(slug, {}).values())
