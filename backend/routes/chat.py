import json
from flask import Blueprint, jsonify, request, Response

from services.chat_service import ask_question, ask_question_stream, get_repo_summary, explain_code
from services.llm_service import generate_explanation, generate_answer_stream
from vectorstore.retriever import retrieve_chunks
from utils.validators import validate_slug, validate_question, sanitize_input
from utils.logger import chat_logger

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/api/chat/stream", methods=["POST"])
def chat_stream_route():
    """
    POST /api/chat/stream
    Body: { "slug": "owner_repo", "question": "How does X work?", "history": [], "mode": "qa" }

    Streams response chunks for Q&A with context and citations.
    """
    payload = request.get_json(silent=True) or {}
    slug = sanitize_input(payload.get("slug", ""))
    question = sanitize_input(payload.get("question", ""))
    history = payload.get("history", [])
    mode = payload.get("mode", "qa")

    # Validate inputs
    valid, error = validate_slug(slug)
    if not valid:
        return jsonify({"error": error}), 400

    valid, error = validate_question(question)
    if not valid:
        return jsonify({"error": error}), 400

    # Check if repository is indexed
    from cache.repo_cache import is_indexed
    if not is_indexed(slug):
        chat_logger.warning(f"Attempted to query non-indexed repository: {slug}")
        return jsonify({
            "error": f"Repository '{slug}' is not indexed. Please index it first by pasting the GitHub URL."
        }), 404

    def generate():
        try:
            for item in ask_question_stream(slug, question, history):
                yield f"data: {json.dumps(item)}\n\n"
        except Exception as e:
            chat_logger.error(f"Error in streaming generation: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    response = Response(generate(), mimetype="text/event-stream")
    response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
    return response


@chat_bp.route("/api/chat", methods=["POST"])
def chat_route():
    """
    POST /api/chat
    Body: { "slug": "owner_repo", "question": "How does X work?" }

    Ask a question about an indexed repository.
    Returns an AI-generated answer with source references.
    """
    payload = request.get_json(silent=True) or {}
    slug = sanitize_input(payload.get("slug", ""))
    question = sanitize_input(payload.get("question", ""))
    mode = payload.get("mode", "qa")  # "qa" or "explain"

    # Validate inputs
    valid, error = validate_slug(slug)
    if not valid:
        return jsonify({"error": error}), 400

    valid, error = validate_question(question)
    if not valid:
        return jsonify({"error": error}), 400

    # Check if repository is indexed
    from cache.repo_cache import is_indexed
    if not is_indexed(slug):
        chat_logger.warning(f"Attempted to query non-indexed repository: {slug}")
        return jsonify({
            "error": f"Repository '{slug}' is not indexed. Please index it first by pasting the GitHub URL."
        }), 404

    try:
        if mode == "explain":
            result = explain_code(slug, question)
        else:
            result = ask_question(slug, question)

        return jsonify({
            "answer": result["answer"],
            "sources": result["sources"],
        })

    except ValueError as e:
        chat_logger.error(f"Chat error: {e}")
        return jsonify({"error": str(e)}), 400

    except Exception as e:
        chat_logger.error(f"Unexpected chat error: {e}", exc_info=True)
        return jsonify({
            "error": "Something went wrong while generating the answer. Please try again."
        }), 500


@chat_bp.route("/api/chat/summary/<slug>", methods=["GET"])
def summary_route(slug):
    """
    GET /api/chat/summary/:slug

    Generate an AI-powered project summary for a repository.
    """
    valid, error = validate_slug(slug)
    if not valid:
        return jsonify({"error": error}), 400

    try:
        summary = get_repo_summary(slug)
        return jsonify({"summary": summary})

    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    except Exception as e:
        chat_logger.error(f"Summary error: {e}")
        return jsonify({
            "error": "Failed to generate summary. Please try again."
        }), 500
