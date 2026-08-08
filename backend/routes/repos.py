"""
Repository routes — repo listing, metadata, files, stats, search.
"""

from flask import Blueprint, jsonify, request

from cache.repo_cache import (
    list_repos,
    list_repo_slugs,
    get_repo,
    get_repo_files,
    get_repo_stats,
    delete_repo,
)
from services.github_service import build_file_tree
from vectorstore.retriever import search_chunks
from vectorstore.client import delete_collection
from utils.validators import validate_slug, sanitize_input
from utils.logger import app_logger

repos_bp = Blueprint("repos", __name__)


@repos_bp.route("/api/repos", methods=["GET"])
def list_repos_route():
    """
    GET /api/repos

    List all indexed repositories with metadata.
    """
    repos = list_repos()
    return jsonify({"repos": list_repo_slugs(), "details": repos})


@repos_bp.route("/api/repos/<slug>", methods=["GET"])
def get_repo_route(slug):
    """
    GET /api/repos/:slug

    Get metadata for a specific repository.
    """
    valid, error = validate_slug(slug)
    if not valid:
        return jsonify({"error": error}), 400

    repo = get_repo(slug)
    if not repo:
        return jsonify({"error": "Repository not found."}), 404

    return jsonify(repo)


@repos_bp.route("/api/repos/<slug>/files", methods=["GET"])
def get_repo_files_route(slug):
    """
    GET /api/repos/:slug/files

    Get the file tree for a repository.
    """
    valid, error = validate_slug(slug)
    if not valid:
        return jsonify({"error": error}), 400

    files = get_repo_files(slug)
    if not files:
        return jsonify({"error": "Repository not found or no files indexed."}), 404

    tree = build_file_tree(files)
    return jsonify({"files": files, "tree": tree})


@repos_bp.route("/api/repos/<slug>/stats", methods=["GET"])
def get_repo_stats_route(slug):
    """
    GET /api/repos/:slug/stats

    Get statistics for a repository.
    """
    valid, error = validate_slug(slug)
    if not valid:
        return jsonify({"error": error}), 400

    stats = get_repo_stats(slug)
    if not stats:
        return jsonify({"error": "Repository not found."}), 404

    return jsonify(stats)


@repos_bp.route("/api/repos/<slug>/search", methods=["GET"])
def search_repo_route(slug):
    """
    GET /api/repos/:slug/search?q=query

    Search indexed chunks in a repository.
    """
    valid, error = validate_slug(slug)
    if not valid:
        return jsonify({"error": error}), 400

    query = sanitize_input(request.args.get("q", ""))
    if not query:
        return jsonify({"error": "Search query is required."}), 400

    results = search_chunks(query, slug, top_k=10)

    return jsonify({
        "query": query,
        "results": [
            {
                "file": r["file"],
                "name": r["name"],
                "type": r["type"],
                "start_line": r.get("start_line"),
                "end_line": r.get("end_line"),
                "preview": r["chunk"][:200] + "..." if len(r["chunk"]) > 200 else r["chunk"],
            }
            for r in results
        ],
    })


@repos_bp.route("/api/repos/<slug>", methods=["DELETE"])
def delete_repo_route(slug):
    """
    DELETE /api/repos/:slug

    Remove a repository from the index and cache.
    """
    valid, error = validate_slug(slug)
    if not valid:
        return jsonify({"error": error}), 400

    # Delete from ChromaDB
    delete_collection(slug)

    # Delete from cache
    deleted = delete_repo(slug)

    if deleted:
        app_logger.info(f"Repository deleted: {slug}")
        return jsonify({"status": "deleted", "slug": slug})
    else:
        return jsonify({"error": "Repository not found."}), 404


@repos_bp.route("/api/repos/compare", methods=["POST"])
def compare_repos_route():
    """
    POST /api/repos/compare
    Body: { "slugs": ["owner1_repo1", "owner2_repo2"] }

    Compare two repositories side by side.
    """
    payload = request.get_json(silent=True) or {}
    slugs = payload.get("slugs", [])

    if len(slugs) != 2:
        return jsonify({"error": "Exactly two repository slugs are required."}), 400

    results = []
    for slug in slugs:
        stats = get_repo_stats(slug)
        if not stats:
            return jsonify({"error": f"Repository not found: {slug}"}), 404
        results.append(stats)

    return jsonify({"comparison": results})
