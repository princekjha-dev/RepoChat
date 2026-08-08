"""
Utils module for RepoChat.
Contains input validators, loggers, GitHub URL parsers, token counting,
and text line sliding window chunking utilities.
"""

import logging
import sys
import re
from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any

# ── Logging Setup ─────────────────────────────────────

def setup_logger(name: str = "repochat", level: int = logging.INFO) -> logging.Logger:
    """Create and configure a logger with console output."""
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(level)
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)-12s | %(message)s",
        datefmt="%H:%M:%S",
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger

app_logger = setup_logger("repochat.app")
ingest_logger = setup_logger("repochat.ingest")
chat_logger = setup_logger("repochat.chat")
vector_logger = setup_logger("repochat.vector")

def log_request(method: str, path: str, status: int, duration_ms: float) -> None:
    """Log an HTTP request with timing info."""
    app_logger.info(f"{method} {path} → {status} ({duration_ms:.0f}ms)")


# ── Input Validators ──────────────────────────────────

def validate_github_url(url: str) -> Tuple[bool, Optional[str]]:
    """Validate a GitHub repository URL (supporting both HTTPS and SSH)."""
    if not url or not url.strip():
        return False, "Repository URL is required."
    
    url = url.strip()
    
    # Matches HTTPS and SSH formats
    # HTTPS: https://github.com/owner/repo(.git)?
    # SSH: git@github.com:owner/repo.git or ssh://git@github.com/owner/repo.git
    pattern = r"^(?:https://|git@|ssh://git@|git://)?github\.com[:/][\w.\-]+/[\w.\-]+(?:\.git)?/?$"
    if not re.match(pattern, url):
        return False, (
            "Invalid GitHub URL. Expected format: "
            "https://github.com/owner/repository"
        )
    return True, None


def validate_slug(slug: str) -> Tuple[bool, Optional[str]]:
    """Validate a repository slug."""
    if not slug or not slug.strip():
        return False, "Repository slug is required."
    if not re.match(r"^[a-zA-Z0-9_\-]+$", slug.strip()):
        return False, "Invalid repository slug format."
    return True, None


def validate_question(question: str) -> Tuple[bool, Optional[str]]:
    """Validate a chat question."""
    if not question or not question.strip():
        return False, "Question cannot be empty."
    if len(question.strip()) > 5000:
        return False, "Question is too long (max 5000 characters)."
    return True, None


def sanitize_input(text: str) -> str:
    """Basic input sanitization — strip whitespace."""
    return text.strip() if text else ""


# ── URL Parsing & Credentials ─────────────────────────

def parse_github_url(url: str, token: Optional[str] = None) -> Tuple[str, str]:
    """
    Parses a GitHub URL (HTTPS or SSH) and returns (clone_url, repo_slug).
    Also supports injecting a token for private repositories.
    """
    url = url.strip()
    
    # Try to extract owner and repo
    match = re.search(r'(?:https://|git@|ssh://git@|git://)?github\.com[:/]([^/]+)/([^/.]+?)(?:\.git)?(?:/|$)', url)
    if not match:
        raise ValueError("Invalid GitHub repository URL. Must be a GitHub HTTPS or SSH URL.")
        
    owner = match.group(1)
    repo = match.group(2)
    
    # Sanitize owner and repo to build a slug
    slug = f"{owner}_{repo}"
    slug = re.sub(r'[^a-zA-Z0-9_\-]', '', slug)
    
    if token and token.strip():
        clone_url = f"https://x-access-token:{token.strip()}@github.com/{owner}/{repo}.git"
    else:
        clone_url = f"https://github.com/{owner}/{repo}.git"
        
    return clone_url, slug


# ── ChromaDB Collection Sanitization ──────────────────

def sanitize_collection_name(name: str) -> str:
    """
    Sanitize collection name to adhere to ChromaDB constraints:
    - Between 3 and 63 characters long.
    - Start and end with alphanumeric character.
    - Only alphanumeric, underscores, hyphens.
    - No two consecutive periods.
    """
    sanitized = re.sub(r'[^a-zA-Z0-9_\-]', '_', name)
    
    # Ensure start is alphanumeric
    sanitized = re.sub(r'^[^a-zA-Z0-9]+', '', sanitized)
    # Ensure end is alphanumeric
    sanitized = re.sub(r'[^a-zA-Z0-9]+$', '', sanitized)
    
    if len(sanitized) < 3:
        sanitized = f"repo_{sanitized}" if sanitized else "repo_collection"
    if len(sanitized) > 63:
        sanitized = sanitized[:63]
        # Re-check end character
        sanitized = re.sub(r'[^a-zA-Z0-9]+$', '', sanitized)
        if len(sanitized) < 3:
            sanitized = f"repo_{sanitized}"
            
    return sanitized.lower()


# ── Token Counting ────────────────────────────────────

def count_tokens(text: str) -> int:
    """
    Estimates the number of tokens in a string using word counts and average multipliers.
    A safe standard for LLMs and word density is 1 token ~ 1.3 words or 4 characters,
    whichever is larger.
    """
    if not text:
        return 0
    words = len(text.split())
    chars = len(text)
    # Word based estimate with multiplier
    word_est = int(words * 1.3)
    char_est = int(chars / 4)
    return max(word_est, char_est, 1)


# ── Sliding Window Text Chunking ──────────────────────

def chunk_text_lines(lines: List[str], start_line_offset: int, file_path: str) -> List[Dict[str, Any]]:
    """
    Split a list of text lines into chunks of approximately 500-800 tokens max,
    using a sliding window of ~512 tokens with a 50 token overlap.
    Tracks precise start and end lines.
    """
    chunks = []
    current_lines = []
    current_tokens = 0
    start_line = start_line_offset
    
    i = 0
    while i < len(lines):
        line = lines[i]
        line_tokens = count_tokens(line) + 1  # +1 for newline character
        
        # If adding this line exceeds 512 tokens (and we already have some text accumulated)
        if current_tokens + line_tokens > 512 and current_lines:
            chunk_text = "\n".join(current_lines)
            end_line = start_line + len(current_lines) - 1
            chunks.append({
                "chunk": chunk_text,
                "metadata": {
                    "file": file_path,
                    "type": "lines",
                    "name": f"lines_{start_line}-{end_line}",
                    "start_line": start_line,
                    "end_line": end_line
                }
            })
            
            # Backtrack to implement overlapping window
            backtrack_lines = 0
            overlap_tokens = 0
            for j in range(len(current_lines) - 1, -1, -1):
                overlap_tokens += count_tokens(current_lines[j])
                backtrack_lines += 1
                if overlap_tokens >= 50:
                    break
                    
            # Move the index pointer back, clear current accumulator
            i = i - backtrack_lines + 1
            current_lines = []
            current_tokens = 0
            start_line = start_line_offset + i
        else:
            current_lines.append(line)
            current_tokens += line_tokens
            i += 1
            
    if current_lines:
        chunk_text = "\n".join(current_lines)
        end_line = start_line + len(current_lines) - 1
        chunks.append({
            "chunk": chunk_text,
            "metadata": {
                "file": file_path,
                "type": "lines",
                "name": f"lines_{start_line}-{end_line}",
                "start_line": start_line,
                "end_line": end_line
            }
        })
        
    return chunks
