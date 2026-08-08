"""app/routes/chat.py — Streaming RAG chat and semantic search endpoints."""

import json
import re

from flask import Blueprint, Response, jsonify, request, stream_with_context

from app.repositories.repo_store import get_repo
from app.services.chat_service import retrieve_top_chunks, stream_chat_response
from app.utils.logging import app_log

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/api/chat", methods=["POST"])
@chat_bp.route("/api/chat/stream", methods=["POST"])
def chat():
    payload = request.get_json(silent=True) or {}
    query = (payload.get("message") or payload.get("question", "")).strip()
    repo_name = (payload.get("repo_name") or payload.get("slug", "")).strip()
    history = payload.get("conversation_history") or payload.get("history") or []

    if not query:
        return jsonify({"error": "Query message cannot be empty."}), 400
    if not repo_name:
        return jsonify({"error": "repo_name is required."}), 400
    if not get_repo(repo_name):
        return jsonify({"error": f"Repository '{repo_name}' is not indexed."}), 404

    def generate():
        try:
            yield from stream_chat_response(query, repo_name, history)
        except Exception as exc:
            app_log.error(f"SSE error: {exc}", exc_info=True)
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    resp = Response(stream_with_context(generate()), mimetype="text/event-stream")
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["X-Accel-Buffering"] = "no"
    return resp


@chat_bp.route("/api/search", methods=["POST"])
def search_repo():
    payload = request.get_json(silent=True) or {}
    query = payload.get("query", "").strip()
    repo_name = payload.get("repo_name", "").strip()
    top_k = min(int(payload.get("top_k", 10)), 20)

    if not query:
        return jsonify({"error": "Query is required."}), 400
    if not repo_name:
        return jsonify({"error": "repo_name is required."}), 400
    if not get_repo(repo_name):
        return jsonify({"error": f"Repository '{repo_name}' not found."}), 404

    try:
        chunks = retrieve_top_chunks(query, repo_name, top_k=top_k)
        return jsonify({"query": query, "repo": repo_name,
                        "count": len(chunks), "results": chunks})
    except Exception as exc:
        app_log.error(f"Search failed: {exc}", exc_info=True)
        return jsonify({"error": str(exc)}), 500
