"""
app/__init__.py
Application factory — assembles Flask app, extensions, middleware, and blueprints.
"""

from flask import Flask, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from app.config.settings import CORS_ORIGINS, RATE_LIMIT_DEFAULT
from app.middleware.request_logger import register_middleware
from app.routes.chat import chat_bp
from app.routes.health import health_bp
from app.routes.indexing import indexing_bp
from app.routes.repos import repos_bp
from app.routes.review import review_bp
from app.routes.share import share_bp
from app.utils.logging import app_log


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, origins=CORS_ORIGINS)

    # Rate limiting
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=RATE_LIMIT_DEFAULT,
    )

    # Per-route limits
    limiter.limit("30 per hour")(review_bp.view_functions.get("review.review_code", lambda: None))
    limiter.limit("60 per hour")(review_bp.view_functions.get("review.explain_code", lambda: None))
    limiter.limit("20 per hour")(review_bp.view_functions.get("review.get_repo_summary", lambda: None))
    limiter.limit("20 per hour")(review_bp.view_functions.get("review.compare_repos", lambda: None))
    limiter.limit("100 per hour")(chat_bp.view_functions.get("chat.search_repo", lambda: None))
    limiter.exempt(indexing_bp.view_functions.get("indexing.get_status", lambda: None))
    limiter.exempt(share_bp.view_functions.get("share.get_share", lambda: None))
    limiter.exempt(share_bp.view_functions.get("share.list_shares", lambda: None))

    # Middleware
    register_middleware(app)

    # Blueprints
    for bp in (health_bp, indexing_bp, repos_bp, chat_bp, review_bp, share_bp):
        app.register_blueprint(bp)

    # Error handlers
    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({"error": "Endpoint not found."}), 404

    @app.errorhandler(429)
    def rate_limit(_e):
        return jsonify({"error": "Rate limit exceeded. Please try again later."}), 429

    @app.errorhandler(Exception)
    def unhandled(exc):
        app_log.error(f"Unhandled exception: {exc}", exc_info=True)
        return jsonify({"error": "Internal server error.", "message": str(exc)}), 500

    app_log.info("RepoChat AI application factory complete.")
    return app
