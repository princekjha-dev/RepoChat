"""app/routes/health.py — Health check endpoint."""

from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "repochat-ai",
        "version": "2.0.0",
        "features": [
            "semantic-search", "rag-chat", "code-review",
            "bug-detection", "security-analysis",
            "repo-comparison", "code-explanation", "summary-generation",
        ],
    })
