from flask import Blueprint, jsonify, request

from services.github_service import slugify_repo_url
from services.ingest_queue import queue_ingestion, get_task_status, cancel_task
from cache.repo_cache import is_indexed, get_repo
from utils.validators import validate_github_url, validate_slug, sanitize_input
from utils.logger import ingest_logger

ingest_bp = Blueprint("ingest", __name__)


@ingest_bp.route("/api/ingest", methods=["POST"])
def ingest_route():
    """
    POST /api/ingest
    Body: { "repo_url": "https://github.com/owner/repo", "force": false }

    Indexes a GitHub repository for Q&A in the background.
    Returns status, slug, and details if already running.
    """
    payload = request.get_json(silent=True) or {}
    repo_url = sanitize_input(payload.get("repo_url", ""))
    force = payload.get("force", False)

    # Validate URL
    is_valid, error = validate_github_url(repo_url)
    if not is_valid:
        return jsonify({"error": error}), 400

    try:
        slug = slugify_repo_url(repo_url)

        # Check if already indexed (without force)
        if not force and is_indexed(slug):
            cached = get_repo(slug)
            return jsonify({
                "status": "completed",
                "slug": slug,
                "chunks": cached.get("chunk_count", 0),
                "files": cached.get("file_count", 0),
                "languages": cached.get("languages", {}),
                "already_indexed": True,
            })

        # Queue the ingestion in the background
        result = queue_ingestion(repo_url, force, slug)
        return jsonify(result)

    except ValueError as e:
        ingest_logger.error(f"Ingest validation error: {e}")
        return jsonify({"error": str(e)}), 400

    except Exception as e:
        ingest_logger.error(f"Unexpected ingest error: {e}")
        return jsonify({
            "error": "Failed to index repository. Please check the URL and try again."
        }), 500


@ingest_bp.route("/api/ingest/status/<slug>", methods=["GET"])
def ingest_status_route(slug):
    """
    GET /api/ingest/status/<slug>

    Get the current ingestion progress for a repository.
    """
    valid, error = validate_slug(slug)
    if not valid:
        return jsonify({"error": error}), 400

    status_info = get_task_status(slug)
    if status_info:
        return jsonify(status_info)

    # If task is not in active memory queue, check cache
    if is_indexed(slug):
        cached = get_repo(slug)
        return jsonify({
            "status": "completed",
            "progress": 100,
            "processed_files": cached.get("file_count", 0),
            "total_files": cached.get("file_count", 0),
            "error": None,
            "result": {
                "slug": slug,
                "chunks": cached.get("chunk_count", 0),
                "files": cached.get("file_count", 0),
                "languages": cached.get("languages", {}),
                "already_indexed": True
            }
        })

    return jsonify({
        "status": "not_found",
        "error": "No indexing task found for this repository."
    }), 404


@ingest_bp.route("/api/ingest/cancel/<slug>", methods=["POST"])
def ingest_cancel_route(slug):
    """
    POST /api/ingest/cancel/<slug>

    Cancel an ongoing indexing task for a repository.
    """
    valid, error = validate_slug(slug)
    if not valid:
        return jsonify({"error": error}), 400

    cancelled = cancel_task(slug)
    if cancelled:
        return jsonify({
            "status": "cancelled",
            "message": "Ingestion cancellation requested."
        })

    return jsonify({
        "error": "Task cannot be cancelled (not active, or already completed/failed)."
    }), 400
