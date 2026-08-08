"""app/routes/indexing.py — Repository indexing and status endpoints."""

from flask import Blueprint, jsonify, request

from app.repositories.repo_store import get_repo
from app.services.indexing_service import (
    get_job_status, request_cancel, start_indexing_job,
    indexing_jobs, jobs_lock,
)
from app.utils.logging import app_log
from app.utils.validators import validate_github_url

indexing_bp = Blueprint("indexing", __name__)


@indexing_bp.route("/api/index", methods=["POST"])
@indexing_bp.route("/api/ingest", methods=["POST"])
def index_repo():
    payload = request.get_json(silent=True) or {}
    repo_url = payload.get("repo_url", "").strip()
    token = (payload.get("github_token") or payload.get("token") or "")
    token = str(token).strip() if token else None

    ok, err = validate_github_url(repo_url)
    if not ok:
        return jsonify({"error": err}), 400

    try:
        job_id, status = start_indexing_job(repo_url, token)
        return jsonify({"job_id": job_id, "slug": job_id, "status": status,
                        "message": "Indexing started in the background."}), 202
    except Exception as exc:
        app_log.error(f"Failed to start indexing: {exc}")
        return jsonify({"error": str(exc)}), 500


@indexing_bp.route("/api/status/<job_id>", methods=["GET"])
@indexing_bp.route("/api/ingest/status/<job_id>", methods=["GET"])
def get_status(job_id):
    job_id = job_id.strip()
    info = get_job_status(job_id)

    if info:
        if info["status"] == "completed":
            meta = get_repo(job_id)
            if meta:
                info["processed_files"] = meta.get("file_count", 0)
                info["total_files"] = meta.get("file_count", 0)
                info["files"] = meta.get("processed_files", [])
        return jsonify(info)

    meta = get_repo(job_id)
    if meta:
        return jsonify({
            "percent": 100, "current_file": "done", "status": "completed",
            "processed_files": meta.get("file_count", 0),
            "total_files": meta.get("file_count", 0),
            "files": meta.get("processed_files", []),
        })

    return jsonify({"error": f"No active job or cache found for: {job_id}"}), 404


@indexing_bp.route("/api/ingest/cancel/<job_id>", methods=["POST"])
def cancel_indexing(job_id):
    if request_cancel(job_id.strip()):
        return jsonify({"status": "cancelled", "message": "Cancellation requested."})
    return jsonify({"error": "Job not in a cancellable state."}), 400


@indexing_bp.route("/api/repos/<slug>/reindex", methods=["POST"])
def reindex_repo(slug):
    meta = get_repo(slug)
    if not meta:
        return jsonify({"error": "Repository not found."}), 404
    url = meta.get("url", "")
    if not url:
        return jsonify({"error": "Repository URL not stored."}), 400
    try:
        job_id, status = start_indexing_job(url, None)
        return jsonify({"job_id": job_id, "slug": job_id, "status": status,
                        "message": "Re-indexing started."}), 202
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
