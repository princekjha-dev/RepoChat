"""
GitHub Service for RepoChat.
Fetches repository metadata, README, languages, and PR diffs via GitHub API.
"""

import os
import re
import requests
from typing import Dict, Any, Optional, Tuple

from utils import app_logger

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

# ── GitHub API Helpers ─────────────────────────────────

def _github_headers() -> Dict[str, str]:
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "RepoChat-AI/1.0",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"
    return headers


def _github_get(url: str, timeout: int = 15) -> Optional[Dict]:
    """Makes a GET request to GitHub API. Returns None on failure."""
    try:
        resp = requests.get(url, headers=_github_headers(), timeout=timeout)
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 404:
            return None
        else:
            app_logger.warning(f"GitHub API returned {resp.status_code} for {url}")
            return None
    except Exception as e:
        app_logger.warning(f"GitHub API request failed for {url}: {e}")
        return None


def parse_github_url_to_owner_repo(url: str) -> Tuple[str, str]:
    """
    Extract owner and repo name from a GitHub URL.
    Supports: https://github.com/owner/repo, git@github.com:owner/repo.git
    """
    url = url.strip().rstrip("/")
    match = re.search(
        r'(?:https://|git@|ssh://git@|git://)?github\.com[:/]([^/\s]+)/([^/\s.]+?)(?:\.git)?(?:/.*)?$',
        url
    )
    if not match:
        raise ValueError(f"Cannot parse owner/repo from URL: {url}")
    return match.group(1), match.group(2)


def get_repo_metadata(repo_url: str) -> Dict[str, Any]:
    """
    Fetches repository metadata from GitHub API.
    Returns enriched dict with stars, forks, language, description, etc.
    """
    try:
        owner, repo = parse_github_url_to_owner_repo(repo_url)
    except ValueError:
        return {}
    
    api_url = f"https://api.github.com/repos/{owner}/{repo}"
    data = _github_get(api_url)
    
    if not data:
        return {
            "owner": owner,
            "repo": repo,
            "full_name": f"{owner}/{repo}",
            "api_available": False
        }
    
    return {
        "owner": owner,
        "repo": repo,
        "full_name": data.get("full_name", f"{owner}/{repo}"),
        "description": data.get("description", ""),
        "stars": data.get("stargazers_count", 0),
        "forks": data.get("forks_count", 0),
        "open_issues": data.get("open_issues_count", 0),
        "watchers": data.get("watchers_count", 0),
        "primary_language": data.get("language", "Unknown"),
        "default_branch": data.get("default_branch", "main"),
        "topics": data.get("topics", []),
        "license": data.get("license", {}).get("name") if data.get("license") else None,
        "created_at": data.get("created_at"),
        "updated_at": data.get("updated_at"),
        "pushed_at": data.get("pushed_at"),
        "size_kb": data.get("size", 0),
        "homepage": data.get("homepage"),
        "archived": data.get("archived", False),
        "fork": data.get("fork", False),
        "visibility": data.get("visibility", "public"),
        "html_url": data.get("html_url", f"https://github.com/{owner}/{repo}"),
        "api_available": True
    }


def get_repo_languages(repo_url: str) -> Dict[str, int]:
    """
    Fetches language breakdown from GitHub API.
    Returns dict of {language: bytes_of_code}.
    """
    try:
        owner, repo = parse_github_url_to_owner_repo(repo_url)
    except ValueError:
        return {}
    
    api_url = f"https://api.github.com/repos/{owner}/{repo}/languages"
    data = _github_get(api_url)
    return data or {}


def get_latest_commit(repo_url: str, branch: Optional[str] = None) -> Optional[str]:
    """
    Returns the latest commit SHA for a given branch (defaults to HEAD).
    """
    try:
        owner, repo = parse_github_url_to_owner_repo(repo_url)
    except ValueError:
        return None
    
    ref = branch or "HEAD"
    api_url = f"https://api.github.com/repos/{owner}/{repo}/commits/{ref}"
    data = _github_get(api_url)
    
    if data and "sha" in data:
        return data["sha"]
    return None


def get_readme(repo_url: str) -> Optional[str]:
    """
    Fetches the README content (decoded) from GitHub.
    """
    import base64
    try:
        owner, repo = parse_github_url_to_owner_repo(repo_url)
    except ValueError:
        return None
    
    api_url = f"https://api.github.com/repos/{owner}/{repo}/readme"
    data = _github_get(api_url)
    
    if data and data.get("encoding") == "base64" and data.get("content"):
        try:
            content = base64.b64decode(data["content"]).decode("utf-8", errors="ignore")
            return content[:5000]  # Cap to 5k chars
        except Exception:
            return None
    return None


def get_pr_diff(repo_url: str, pr_number: int) -> Optional[str]:
    """
    Fetches the raw diff of a GitHub Pull Request.
    """
    try:
        owner, repo = parse_github_url_to_owner_repo(repo_url)
    except ValueError:
        return None
    
    api_url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}"
    headers = {**_github_headers(), "Accept": "application/vnd.github.v3.diff"}
    
    try:
        resp = requests.get(api_url, headers=headers, timeout=30)
        if resp.status_code == 200:
            return resp.text[:15000]  # Cap diff size
        return None
    except Exception as e:
        app_logger.warning(f"Failed to fetch PR diff: {e}")
        return None


def get_enriched_repo_data(repo_url: str) -> Dict[str, Any]:
    """
    Fetches combined enriched metadata: repo info + languages + latest commit + README.
    """
    metadata = get_repo_metadata(repo_url)
    languages = get_repo_languages(repo_url)
    latest_commit = get_latest_commit(repo_url)
    readme = get_readme(repo_url)
    
    return {
        **metadata,
        "github_languages": languages,
        "latest_commit_sha": latest_commit,
        "readme_preview": readme[:500] if readme else None,
    }
