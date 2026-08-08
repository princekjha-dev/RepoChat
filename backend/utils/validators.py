"""
Input validation utilities for RepoChat.
"""

import re
from typing import Optional, Tuple


def validate_github_url(url: str) -> Tuple[bool, Optional[str]]:
    """
    Validate a GitHub repository URL.

    Returns:
        (is_valid, error_message) — error_message is None when valid.
    """
    if not url or not url.strip():
        return False, "Repository URL is required."

    url = url.strip()

    # Match GitHub URLs: https://github.com/owner/repo or git@ variants
    pattern = r"^https?://github\.com/[\w.\-]+/[\w.\-]+/?$"
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
