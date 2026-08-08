"""
app/git/github_client.py
GitHub REST API client: repo metadata, languages, commits, README, PR diffs.
"""

import base64
import re
from typing import Any, Dict, Optional, Tuple

import requests

from app.config.settings import GITHUB_TOKEN
from app.utils.logging import github_log


def _headers() -> Dict[str, str]:
    h = {"Accept": "application/vnd.github.v3+json", "User-Agent": "RepoChat-AI/2.0"}
    if GITHUB_TOKEN:
        h["Authorization"] = f"token {GITHUB_TOKEN}"
    return h


def _get(url: str, timeout: int = 15) -> Optional[Dict]:
    try:
        resp = requests.get(url, headers=_headers(), timeout=timeout)
        return resp.json() if resp.status_code == 200 else None
    except Exception as exc:
        github_log.warning(f"GitHub API error for {url}: {exc}")
        return None


def _parse_owner_repo(url: str) -> Tuple[str, str]:
    m = re.search(
        r"(?:https://|git@|ssh://git@|git://)?github\.com[:/]"
        r"([^/\s]+)/([^/\s.]+?)(?:\.git)?(?:/.*)?$",
        url.strip().rstrip("/"),
    )
    if not m:
        raise ValueError(f"Cannot parse owner/repo from: {url}")
    return m.group(1), m.group(2)


def get_repo_metadata(repo_url: str) -> Dict[str, Any]:
    try:
        owner, repo = _parse_owner_repo(repo_url)
    except ValueError:
        return {}
    data = _get(f"https://api.github.com/repos/{owner}/{repo}")
    if not data:
        return {"owner": owner, "repo": repo, "full_name": f"{owner}/{repo}", "api_available": False}
    return {
        "owner": owner, "repo": repo,
        "full_name": data.get("full_name", f"{owner}/{repo}"),
        "description": data.get("description", ""),
        "stars": data.get("stargazers_count", 0),
        "forks": data.get("forks_count", 0),
        "open_issues": data.get("open_issues_count", 0),
        "watchers": data.get("watchers_count", 0),
        "primary_language": data.get("language", "Unknown"),
        "default_branch": data.get("default_branch", "main"),
        "topics": data.get("topics", []),
        "license": (data.get("license") or {}).get("name"),
        "created_at": data.get("created_at"),
        "updated_at": data.get("updated_at"),
        "pushed_at": data.get("pushed_at"),
        "size_kb": data.get("size", 0),
        "homepage": data.get("homepage"),
        "archived": data.get("archived", False),
        "fork": data.get("fork", False),
        "visibility": data.get("visibility", "public"),
        "html_url": data.get("html_url", f"https://github.com/{owner}/{repo}"),
        "api_available": True,
    }


def get_repo_languages(repo_url: str) -> Dict[str, int]:
    try:
        owner, repo = _parse_owner_repo(repo_url)
    except ValueError:
        return {}
    return _get(f"https://api.github.com/repos/{owner}/{repo}/languages") or {}


def get_latest_commit(repo_url: str, branch: Optional[str] = None) -> Optional[str]:
    try:
        owner, repo = _parse_owner_repo(repo_url)
    except ValueError:
        return None
    data = _get(f"https://api.github.com/repos/{owner}/{repo}/commits/{branch or 'HEAD'}")
    return data.get("sha") if data else None


def get_readme(repo_url: str) -> Optional[str]:
    try:
        owner, repo = _parse_owner_repo(repo_url)
    except ValueError:
        return None
    data = _get(f"https://api.github.com/repos/{owner}/{repo}/readme")
    if data and data.get("encoding") == "base64" and data.get("content"):
        try:
            return base64.b64decode(data["content"]).decode("utf-8", errors="ignore")[:5000]
        except Exception:
            return None
    return None


def get_pr_diff(repo_url: str, pr_number: int) -> Optional[str]:
    try:
        owner, repo = _parse_owner_repo(repo_url)
    except ValueError:
        return None
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}"
    h = {**_headers(), "Accept": "application/vnd.github.v3.diff"}
    try:
        resp = requests.get(url, headers=h, timeout=30)
        return resp.text[:15000] if resp.status_code == 200 else None
    except Exception as exc:
        github_log.warning(f"PR diff fetch failed: {exc}")
        return None


def get_enriched_repo_data(repo_url: str) -> Dict[str, Any]:
    return {
        **get_repo_metadata(repo_url),
        "github_languages": get_repo_languages(repo_url),
        "latest_commit_sha": get_latest_commit(repo_url),
        "readme_preview": (get_readme(repo_url) or "")[:500] or None,
    }
