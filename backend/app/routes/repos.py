"""app/routes/repos.py — Repository CRUD and file explorer endpoints."""

from flask import Blueprint, jsonify

from app.core.vector_store import get_chroma_client
from app.git.github_client import get_enriched_repo_data
from app.repositories.repo_store import delete_repo, get_repo, list_repos
from app.services.indexing_service import indexing_jobs, jobs_lock
from app.utils.logging import app_log
from app.utils.text import sanitize_collection_name

repos_bp = Blueprint("repos", __name__)


@repos_bp.route("/api/repos", methods=["GET"])
def get_repos_list():
    repos = list_repos()
    return jsonify({"repos": [r["slug"] for r in repos], "details": repos})


@repos_bp.route("/api/repos/<slug>", methods=["GET"])
def get_repo_details(slug):
    repo = get_repo(slug)
    if not repo:
        return jsonify({"error": "Repository not found."}), 404
    return jsonify(repo)


@repos_bp.route("/api/repos/<slug>/files", methods=["GET"])
def get_repo_files(slug):
    repo = get_repo(slug)
    if not repo:
        return jsonify({"error": "Repository not found."}), 404

    files = repo.get("processed_files", [])
    tree: dict = {}
    for filepath in sorted(files):
        parts = filepath.split("/")
        node = tree
        for i, part in enumerate(parts):
            if i == len(parts) - 1:
                node.setdefault("_files", []).append(part)
            else:
                node = node.setdefault(part, {})

    return jsonify({"files": files, "tree": tree, "count": len(files)})


@repos_bp.route("/api/repos/<slug>/enrich", methods=["GET"])
def get_repo_enriched(slug):
    repo = get_repo(slug)
    if not repo:
        return jsonify({"error": "Repository not found."}), 404
    url = repo.get("url", "")
    if not url:
        return jsonify({"error": "Repository URL not available."}), 400
    try:
        return jsonify(get_enriched_repo_data(url))
    except Exception as exc:
        app_log.warning(f"GitHub enrichment failed for {slug}: {exc}")
        return jsonify({"error": str(exc)}), 500


@repos_bp.route("/api/repos/<repo_name>", methods=["DELETE"])
@repos_bp.route("/api/repo/<repo_name>", methods=["DELETE"])
def delete_repo_endpoint(repo_name):
    repo_name = repo_name.strip()
    try:
        get_chroma_client().delete_collection(sanitize_collection_name(repo_name))
    except Exception as exc:
        app_log.warning(f"ChromaDB delete failed for {repo_name}: {exc}")

    with jobs_lock:
        indexing_jobs.pop(repo_name, None)

    if delete_repo(repo_name):
        return jsonify({"status": "deleted", "repo_name": repo_name})
    return jsonify({"error": "Repository not found in cache."}), 404


@repos_bp.route("/api/cache", methods=["DELETE"])
def clear_cache():
    try:
        deleted = 0
        for repo in list_repos():
            slug = repo.get("slug", "")
            try:
                get_chroma_client().delete_collection(sanitize_collection_name(slug))
            except Exception:
                pass
            if delete_repo(slug):
                deleted += 1
        return jsonify({"status": "cleared", "deleted_count": deleted})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
