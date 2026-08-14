"""
app/utils/text.py
Text processing utilities: token counting, ChromaDB name sanitisation,
URL parsing, and sliding-window line chunker.
"""

import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


# ── Token Counting ─────────────────────────────────────────────────────────

def count_tokens(text: str) -> int:
    """Rough token estimate: max(word_count * 1.3, char_count / 4)."""
    if not text:
        return 0
    return max(int(len(text.split()) * 1.3), int(len(text) / 4), 1)


def normalize_repo_slug(slug_or_url: str) -> str:
    """Normalize any GitHub URL, owner/repo string, or slug into canonical 'owner_repo' format."""
    if not slug_or_url or not isinstance(slug_or_url, str):
        return ""
    text = slug_or_url.strip()
    if "github.com" in text or text.startswith("git@") or text.startswith("ssh://"):
        match = re.search(r'(?:https?://|git@|ssh://git@|git://)?(?:www\.)?github\.com[:/]([^/]+)/([^/.]+?)(?:\.git)?(?:/|$|\?)', text)
        if match:
            owner, repo = match.group(1), match.group(2)
            slug = f"{owner}_{repo}"
            return re.sub(r'[^a-zA-Z0-9_\-]', '', slug)
    if "/" in text:
        parts = [p for p in text.split("/") if p]
        if len(parts) >= 2:
            owner, repo = parts[0], parts[1].replace(".git", "")
            slug = f"{owner}_{repo}"
            return re.sub(r'[^a-zA-Z0-9_\-]', '', slug)
    return re.sub(r'[^a-zA-Z0-9_\-]', '', text)


# ── Collection name sanitisation ──────────────────────────────────────────

def sanitize_collection_name(name: str) -> str:
    """
    Sanitise a string to satisfy ChromaDB collection name constraints:
    3–63 chars, alphanumeric / underscore / hyphen, start/end alphanumeric.
    """
    sanitized = re.sub(r"[^a-zA-Z0-9_\-]", "_", name)
    sanitized = re.sub(r"^[^a-zA-Z0-9]+", "", sanitized)
    sanitized = re.sub(r"[^a-zA-Z0-9]+$", "", sanitized)
    if len(sanitized) < 3:
        sanitized = f"repo_{sanitized}" if sanitized else "repo_collection"
    if len(sanitized) > 63:
        sanitized = re.sub(r"[^a-zA-Z0-9]+$", "", sanitized[:63])
        if len(sanitized) < 3:
            sanitized = f"repo_{sanitized}"
    return sanitized.lower()


# ── GitHub URL Parsing ─────────────────────────────────────────────────────

def parse_github_url(url: str, token: Optional[str] = None) -> Tuple[str, str]:
    """
    Parse a GitHub URL (HTTPS or SSH) and return (clone_url, repo_slug).
    Optionally injects a personal-access token for private repos.
    """
    url = url.strip()
    match = re.search(
        r"(?:https://|git@|ssh://git@|git://)?github\.com[:/]"
        r"([^/]+)/([^/.]+?)(?:\.git)?(?:/|$)",
        url,
    )
    if not match:
        raise ValueError("Invalid GitHub repository URL.")
    owner, repo = match.group(1), match.group(2)
    slug = re.sub(r"[^a-zA-Z0-9_\-]", "", f"{owner}_{repo}")
    if token and token.strip():
        clone_url = f"https://x-access-token:{token.strip()}@github.com/{owner}/{repo}.git"
    else:
        clone_url = f"https://github.com/{owner}/{repo}.git"
    return clone_url, slug


# ── Sliding-window line chunker ────────────────────────────────────────────

def chunk_text_lines(
    lines: List[str],
    start_line_offset: int,
    file_path: str,
    max_tokens: int = 512,
    overlap_tokens: int = 50,
) -> List[Dict[str, Any]]:
    """
    Split a list of source lines into overlapping token-bounded chunks.
    Returns list of {chunk, metadata} dicts compatible with ChromaDB ingestion.
    """
    chunks: List[Dict[str, Any]] = []
    current_lines: List[str] = []
    current_tokens = 0
    start_line = start_line_offset
    i = 0

    while i < len(lines):
        line = lines[i]
        line_tokens = count_tokens(line) + 1  # +1 for newline

        if current_tokens + line_tokens > max_tokens and current_lines:
            end_line = start_line + len(current_lines) - 1
            chunks.append({
                "chunk": "\n".join(current_lines),
                "metadata": {
                    "file": file_path,
                    "type": "lines",
                    "name": f"lines_{start_line}-{end_line}",
                    "start_line": start_line,
                    "end_line": end_line,
                },
            })
            # Backtrack to create overlap
            back = 0
            acc = 0
            for j in range(len(current_lines) - 1, -1, -1):
                acc += count_tokens(current_lines[j])
                back += 1
                if acc >= overlap_tokens:
                    break
            i = i - back + 1
            current_lines = []
            current_tokens = 0
            start_line = start_line_offset + i
        else:
            current_lines.append(line)
            current_tokens += line_tokens
            i += 1

    if current_lines:
        end_line = start_line + len(current_lines) - 1
        chunks.append({
            "chunk": "\n".join(current_lines),
            "metadata": {
                "file": file_path,
                "type": "lines",
                "name": f"lines_{start_line}-{end_line}",
                "start_line": start_line,
                "end_line": end_line,
            },
        })

    return chunks
