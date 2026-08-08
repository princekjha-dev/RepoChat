"""
app/services/review_service.py
AI code review, explanation, comparison, and summary generation.
"""

import json
from typing import Any, Dict, Generator, List, Optional

from app.ai.llm_client import call_llm_json, call_llm_stream
from app.utils.logging import chat_log

# ── Prompts ────────────────────────────────────────────────────────────────

_REVIEW_PROMPT = """You are an expert senior software engineer and security auditor.
Analyse the provided code diff and return a JSON response with exactly this structure:
{
  "summary": "Brief overall assessment",
  "score": {"overall": 85, "security": 80, "performance": 88, "maintainability": 90, "architecture": 82},
  "issues": [{"severity":"critical|high|medium|low|info","category":"bug|security|performance|maintainability|style",
               "title":"...","description":"...","file":"...","line_start":0,"line_end":0,"suggestion":"..."}],
  "positives": ["..."],
  "recommendations": ["..."]
}
Focus: bugs, security (OWASP Top 10), performance, maintainability, architecture. Return ONLY valid JSON."""

_EXPLAIN_PROMPT = """You are an expert code analyst. Explain:
1. What this code does
2. Step-by-step logic
3. Dependencies and their purpose
4. Potential issues or improvements
5. Related patterns/concepts
Format in clear markdown with code examples where helpful."""

_COMPARE_PROMPT = """You are an expert software architect. Compare two repositories:
1. Architecture (structure, patterns, organisation)
2. Technology stack differences
3. Code quality for each
4. Scalability and maintainability
5. Best use-cases for each
Format in markdown with headers and tables where helpful."""

_SUMMARY_PROMPT = """You are an expert software architect. Generate a comprehensive repository analysis:
1. **Executive Overview**: purpose, architecture, design philosophy
2. **Technology Stack**: languages, frameworks, databases, APIs
3. **Architecture Map**: component relationships and data flow
4. **Key Components**: most important files/modules and their roles
5. **Code Quality**: initial assessment
6. **Getting Started**: how a developer would begin exploring this codebase
Format in beautiful markdown with tables and code snippets."""


# ── Public functions ───────────────────────────────────────────────────────

def review_code_diff(
    diff_content: str,
    context: Optional[str] = None,
    repo_name: Optional[str] = None,
) -> Dict[str, Any]:
    user = f"Review this code diff"
    if repo_name:
        user += f" from repository '{repo_name}'"
    if context:
        user += f"\n\nContext: {context}"
    user += f"\n\n```diff\n{diff_content[:8000]}\n```"

    result = call_llm_json(_REVIEW_PROMPT, user, max_tokens=3000)

    defaults = {"overall": 75, "security": 75, "performance": 75,
                "maintainability": 75, "architecture": 75}
    result.setdefault("summary", "Review completed.")
    result.setdefault("score", defaults)
    result.setdefault("issues", [])
    result.setdefault("positives", [])
    result.setdefault("recommendations", [])
    for k, v in defaults.items():
        result["score"][k] = min(100, max(0, int(result["score"].get(k, v))))
    return result


def explain_code_snippet(
    code: str,
    language: Optional[str] = None,
    repo_name: Optional[str] = None,
) -> Generator[str, None, None]:
    lang = f" ({language})" if language else ""
    user = f"Explain this code{lang}"
    if repo_name:
        user += f" from repository '{repo_name}'"
    user += f":\n\n```{language or ''}\n{code[:6000]}\n```"
    return call_llm_stream(_EXPLAIN_PROMPT, user, max_tokens=2000)


def compare_repositories(
    repo1: Dict[str, Any],
    repo2: Dict[str, Any],
) -> Generator[str, None, None]:
    user = (
        f"Compare these two repositories:\n\n"
        f"**Repository 1:**\n{json.dumps(repo1, indent=2)}\n\n"
        f"**Repository 2:**\n{json.dumps(repo2, indent=2)}\n\n"
        f"Provide a comprehensive architectural and quality comparison."
    )
    return call_llm_stream(_COMPARE_PROMPT, user, max_tokens=2500)


def generate_repo_summary(
    repo_meta: Dict[str, Any],
    sample_files: Optional[List[str]] = None,
) -> Generator[str, None, None]:
    user = f"Analyse this repository:\n\n**Metadata:**\n{json.dumps(repo_meta, indent=2)}\n"
    if sample_files:
        user += "\n**File Structure Sample:**\n" + "\n".join(f"  {f}" for f in sample_files[:50])
    return call_llm_stream(_SUMMARY_PROMPT, user, max_tokens=3000)
