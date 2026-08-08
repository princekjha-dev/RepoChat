"""
RepoChat Security Input Validators — Strict Schema Validation Module.
Validates input types, lengths, formats, and structural constraints across all API endpoints.
Rejects non-matching inputs with explicit error details.
"""

import re
from typing import Dict, Any, Tuple, List, Optional

# Regex Patterns
GITHUB_URL_REGEX = re.compile(
    r'^(https://github\.com/[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+/?|git@github\.com:[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+(\.git)?)$'
)
SLUG_REGEX = re.compile(r'^[a-zA-Z0-9_/.-]{1,128}$')
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')
TOKEN_REGEX = re.compile(r'^[a-zA-Z0-9_.-]{1,255}$')


def validate_index_input(data: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Validates /api/index and /api/ingest payload."""
    if not isinstance(data, dict):
        return False, {"error": "Invalid request body", "details": "Request body must be a JSON object."}

    repo_url = data.get("repo_url") or data.get("url")
    if not repo_url or not isinstance(repo_url, str):
        return False, {"error": "Validation error", "details": {"repo_url": "Repository URL is required and must be a string."}}

    repo_url = repo_url.strip()
    if len(repo_url) > 255:
        return False, {"error": "Validation error", "details": {"repo_url": "Repository URL exceeds maximum length of 255 characters."}}

    if not GITHUB_URL_REGEX.match(repo_url):
        return False, {
            "error": "Validation error",
            "details": {"repo_url": "Must be a valid GitHub repository URL (e.g., https://github.com/owner/repo)."}
        }

    github_token = data.get("github_token") or data.get("token")
    if github_token is not None and github_token != "":
        if not isinstance(github_token, str):
            return False, {"error": "Validation error", "details": {"github_token": "GitHub token must be a string."}}
        github_token = github_token.strip()
        if len(github_token) > 255:
            return False, {"error": "Validation error", "details": {"github_token": "Token exceeds maximum length of 255 characters."}}

    return True, None


def validate_chat_input(data: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Validates /api/chat payload."""
    if not isinstance(data, dict):
        return False, {"error": "Invalid request body", "details": "Request body must be a JSON object."}

    repo_name = data.get("repo_name") or data.get("slug") or data.get("activeRepo")
    if not repo_name or not isinstance(repo_name, str):
        try:
            from indexer import list_repos
            repos = list_repos()
            if repos:
                repo_name = repos[0].get("slug", "")
        except Exception:
            pass

    if not repo_name or not isinstance(repo_name, str):
        return False, {"error": "Validation error", "details": {"repo_name": "Repository name is required and must be a string."}}

    repo_name = repo_name.strip()
    if not SLUG_REGEX.match(repo_name):
        return False, {"error": "Validation error", "details": {"repo_name": "Invalid repository slug format."}}

    query = data.get("query") or data.get("question") or data.get("message")
    if not query or not isinstance(query, str):
        return False, {"error": "Validation error", "details": {"query": "Query message is required and must be a non-empty string."}}

    query = query.strip()
    if len(query) == 0 or len(query) > 4000:
        return False, {"error": "Validation error", "details": {"query": "Query must be between 1 and 4000 characters."}}

    history = data.get("history") or data.get("conversation_history") or []
    if not isinstance(history, list):
        return False, {"error": "Validation error", "details": {"history": "Conversation history must be an array."}}

    if len(history) > 100:
        return False, {"error": "Validation error", "details": {"history": "Conversation history exceeds maximum limit of 100 items."}}

    for i, item in enumerate(history):
        if not isinstance(item, dict):
            return False, {"error": "Validation error", "details": {f"history[{i}]": "Each history item must be an object."}}
        role = item.get("role")
        if role not in ("user", "assistant", "system"):
            return False, {"error": "Validation error", "details": {f"history[{i}].role": "Role must be 'user', 'assistant', or 'system'."}}
        content = item.get("content")
        if not isinstance(content, str) or len(content) > 10000:
            return False, {"error": "Validation error", "details": {f"history[{i}].content": "Content must be a string under 10,000 characters."}}

    return True, None


def validate_review_input(data: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Validates /api/review and /api/explain payload."""
    if not isinstance(data, dict):
        return False, {"error": "Invalid request body", "details": "Request body must be a JSON object."}

    code = data.get("code") or data.get("diff")
    pr_url = data.get("pr_url")

    if not code and not pr_url:
        return False, {"error": "Validation error", "details": {"code": "Code, diff snippet, or PR URL is required."}}

    if code:
        if not isinstance(code, str):
            return False, {"error": "Validation error", "details": {"code": "Code snippet must be a string."}}
        if len(code.strip()) == 0 or len(code) > 500000:
            return False, {"error": "Validation error", "details": {"code": "Code length must be between 1 and 500,000 characters."}}

    language = data.get("language", "auto")
    if language and (not isinstance(language, str) or len(language) > 50):
        return False, {"error": "Validation error", "details": {"language": "Language must be a string under 50 characters."}}

    repo = data.get("repo") or data.get("repo_name") or data.get("activeRepo") or data.get("slug")
    if repo is not None and repo != "":
        if not isinstance(repo, str) or not SLUG_REGEX.match(repo.strip()):
            return False, {"error": "Validation error", "details": {"repo": "Invalid repository slug format."}}

    return True, None


def validate_compare_input(data: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Validates /api/compare payload."""
    if not isinstance(data, dict):
        return False, {"error": "Invalid request body", "details": "Request body must be a JSON object."}

    repo1 = data.get("repo1") or data.get("slug1")
    repo2 = data.get("repo2") or data.get("slug2")

    if not repo1 or not isinstance(repo1, str) or not SLUG_REGEX.match(repo1.strip()):
        return False, {"error": "Validation error", "details": {"repo1": "repo1 is required and must be a valid repository slug."}}

    if not repo2 or not isinstance(repo2, str) or not SLUG_REGEX.match(repo2.strip()):
        return False, {"error": "Validation error", "details": {"repo2": "repo2 is required and must be a valid repository slug."}}

    return True, None


def validate_auth_input(data: Dict[str, Any], is_signup: bool = False) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Validates authentication payloads (login, signup, password reset)."""
    if not isinstance(data, dict):
        return False, {"error": "Invalid request body", "details": "Request body must be a JSON object."}

    email = data.get("email")
    if not email or not isinstance(email, str):
        return False, {"error": "Validation error", "details": {"email": "Email address is required."}}

    email = email.strip()
    if len(email) > 254 or not EMAIL_REGEX.match(email):
        return False, {"error": "Validation error", "details": {"email": "Invalid email address format."}}

    password = data.get("password")
    if not password or not isinstance(password, str):
        return False, {"error": "Validation error", "details": {"password": "Password is required."}}

    if len(password) < 8 or len(password) > 128:
        return False, {"error": "Validation error", "details": {"password": "Password must be between 8 and 128 characters."}}

    if is_signup:
        name = data.get("name")
        if name is not None:
            if not isinstance(name, str) or len(name) > 100:
                return False, {"error": "Validation error", "details": {"name": "Name must be a string under 100 characters."}}

    return True, None


def validate_export_input(data: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Validates /api/export payload."""
    if not isinstance(data, dict):
        return False, {"error": "Invalid request body", "details": "Request body must be a JSON object."}

    export_format = data.get("format", "markdown").lower()
    if export_format not in ("markdown", "json"):
        return False, {"error": "Validation error", "details": {"format": "Export format must be 'markdown' or 'json'."}}

    messages = data.get("messages")
    if not isinstance(messages, list):
        return False, {"error": "Validation error", "details": {"messages": "Messages must be an array."}}

    return True, None
