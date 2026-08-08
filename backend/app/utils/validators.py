"""
app/utils/validators.py
Input validation helpers — URL, slug, and question sanitisation.
"""

import re
from typing import Optional, Tuple


def validate_github_url(url: str) -> Tuple[bool, Optional[str]]:
    """Validate a GitHub repository URL (HTTPS or SSH)."""
    if not url or not url.strip():
        return False, "Repository URL is required."
    pattern = (
        r"^(?:https://|git@|ssh://git@|git://)?github\.com[:/]"
        r"[\w.\-]+/[\w.\-]+(?:\.git)?/?$"
    )
    if not re.match(pattern, url.strip()):
        return False, "Invalid GitHub URL. Expected: https://github.com/owner/repository"
    return True, None


def validate_slug(slug: str) -> Tuple[bool, Optional[str]]:
    if not slug or not slug.strip():
        return False, "Repository slug is required."
    if not re.match(r"^[a-zA-Z0-9_\-]+$", slug.strip()):
        return False, "Invalid repository slug format."
    return True, None


def validate_question(question: str) -> Tuple[bool, Optional[str]]:
    if not question or not question.strip():
        return False, "Question cannot be empty."
    if len(question.strip()) > 5000:
        return False, "Question is too long (max 5000 characters)."
    return True, None


def sanitize_str(text: str) -> str:
    return text.strip() if text else ""
