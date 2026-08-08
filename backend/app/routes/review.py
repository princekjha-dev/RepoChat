"""app/routes/review.py — Code review, explain, compare, and summary endpoints."""

import json
import re

from flask import Blueprint, Response, jsonify, request, stream_with_context

from app.git.github_client import get_pr_diff
from app.repositories.repo_store import get_repo
from app.services.review_service import (
    compare_repositories,
    explain_code_snippet,
    generate_repo_summary,
    review_code_diff,
)
from app.utils.logging import app_log

review_bp = Blueprint("review", __name__)


def _sse_stream(generator):
    """Wrap a token generator into an SSE Response."""
    def produce():
        try:
            yield f"data: {json.dumps({'status': 'generating'})}\n\n"
            for token in generator:
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            app_log.error(f"SSE stream error: {exc}", exc_info=True)
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    resp = Response(stream_with_context(produce()), mimetype="text/event-stream")
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["X-Accel-Buffering"] = "no"
    return resp


@review_bp.route("/api/review", methods=["POST"])
def review_code():
    payload = request.get_json(silent=True) or {}
    diff = payload.get("diff", "").strip()
    context = payload.get("context", "").strip()
    repo_name = payload.get("repo_name", "").strip()
    pr_url = payload.get("pr_url", "").strip()

    if pr_url and not diff:
        m = re.search(r"github\.com/([^/]+)/([^/]+)/pull/(\d+)", pr_url)
        if m:
            try:
                diff = get_pr_diff(f"https://github.com/{m.group(1)}/{m.group(2)}", int(m.group(3))) or ""
            except Exception as exc:
                app_log.warning(f"PR diff fetch failed: {exc}")

    if not diff:
        return jsonify({"error": "Diff content or PR URL is required."}), 400

    try:
        result = review_code_diff(diff[:20000], context or None, repo_name or None)
        return jsonify(result)
    except Exception as exc:
        app_log.error(f"Review failed: {exc}", exc_info=True)
        return jsonify({"error": str(exc)}), 500


@review_bp.route("/api/explain", methods=["POST"])
def explain_code():
    payload = request.get_json(silent=True) or {}
    code = payload.get("code", "").strip()
    language = payload.get("language", "").strip()
    repo_name = payload.get("repo_name", "").strip()

    if not code:
        return jsonify({"error": "Code snippet is required."}), 400

    return _sse_stream(explain_code_snippet(code[:8000], language or None, repo_name or None))


@review_bp.route("/api/repos/<slug>/summary", methods=["GET"])
def get_repo_summary(slug):
    repo = get_repo(slug)
    if not repo:
        return jsonify({"error": "Repository not found."}), 404
    return _sse_stream(generate_repo_summary(repo, repo.get("processed_files", [])[:100]))


@review_bp.route("/api/compare", methods=["POST"])
def compare_repos():
    payload = request.get_json(silent=True) or {}
    slug1 = payload.get("repo1", "").strip()
    slug2 = payload.get("repo2", "").strip()
    if not slug1 or not slug2:
        return jsonify({"error": "Both repo1 and repo2 are required."}), 400

    repo1, repo2 = get_repo(slug1), get_repo(slug2)
    if not repo1:
        return jsonify({"error": f"Repository '{slug1}' not found."}), 404
    if not repo2:
        return jsonify({"error": f"Repository '{slug2}' not found."}), 404

    def _summary(r):
        return {k: r.get(k) for k in
                ("slug", "url", "file_count", "chunk_count", "languages",
                 "total_size", "indexed_at", "github")}

    return _sse_stream(compare_repositories(_summary(repo1), _summary(repo2)))
