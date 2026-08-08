"""
RepoChat Flask Application — Production AI Code Intelligence Platform.
Endpoints: indexing, status, chat (SSE), code review, explain, compare,
summary generation, file explorer, export, file upload, auth, and repository management.
"""

import time
import os
import json
import uuid
from flask import Flask, jsonify, request, Response, g, stream_with_context
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv

load_dotenv()

from utils import app_logger, log_request, validate_github_url, validate_slug
from indexer import (
    start_indexing_job,
    get_job_status,
    request_job_cancel,
    list_repos,
    get_repo,
    delete_repo_from_cache,
    get_chroma_client,
    sanitize_collection_name,
    jobs_lock,
    indexing_jobs
)
from chat import stream_chat_response
from review_service import review_code_diff, explain_code_snippet, compare_repositories, generate_repo_summary
from github_service import get_enriched_repo_data, get_pr_diff
from share_cache import get_exchange, list_exchanges
from validators import (
    validate_index_input,
    validate_chat_input,
    validate_review_input,
    validate_compare_input,
    validate_auth_input,
    validate_export_input
)
from rate_limiter import (
    RATE_LIMIT_AUTH,
    RATE_LIMIT_PUBLIC,
    RATE_LIMIT_USER,
    check_auth_exponential_backoff,
    record_failed_auth_attempt,
    record_successful_auth
)
from file_security import validate_and_save_upload

# ── App Initialization ─────────────────────────────────
app = Flask(__name__)
CORS(app, origins="*")

# ── Configurable Rate Limiting ─────────────────────────
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=[RATE_LIMIT_USER]
)

# ── Request Logger & Correlation Middleware ────────────
@app.before_request
def before_request():
    g.start_time = time.time()
    g.request_id = str(uuid.uuid4())[:8]

@app.after_request
def after_request(response):
    if hasattr(g, "start_time"):
        duration = (time.time() - g.start_time) * 1000
        log_request(request.method, request.path, response.status_code, duration)
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["X-Request-ID"] = getattr(g, "request_id", "")
    return response

# ── Global Error Handlers (Anti Information Leakage) ───
@app.errorhandler(400)
def bad_request(e):
    return jsonify({
        "error": "Bad request",
        "details": getattr(e, "description", "The request payload was invalid.")
    }), 400

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found."}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed on this endpoint."}), 405

@app.errorhandler(413)
def payload_too_large(e):
    return jsonify({"error": "Payload size exceeds maximum allowed limit."}), 413

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({"error": "Rate limit exceeded. Please try again later.", "details": str(e.description)}), 429

@app.errorhandler(Exception)
def handle_exception(e):
    request_id = getattr(g, "request_id", "unknown")
    app_logger.error(f"[Req #{request_id}] Unhandled Exception: {str(e)}", exc_info=True)
    # Never leak internal file paths, module names, or tracebacks to the client
    return jsonify({
        "error": "An unexpected server error occurred. Please try again later.",
        "code": "INTERNAL_SERVER_ERROR",
        "request_id": request_id
    }), 500


# ════════════════════════════════════════════════════════
# CORE & AUTH ENDPOINTS
# ════════════════════════════════════════════════════════

@app.route("/api/health", methods=["GET"])
@limiter.limit(RATE_LIMIT_PUBLIC)
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "ok",
        "service": "repochat-ai",
        "version": "3.0.0",
        "features": [
            "semantic-search", "rag-chat", "code-review",
            "bug-detection", "security-analysis",
            "repo-comparison", "code-explanation", "summary-generation",
            "command-palette", "architecture-graph"
        ]
    })


@app.route("/api/ping", methods=["GET"])
@limiter.limit(RATE_LIMIT_PUBLIC)
def ping():
    """Ultra-lightweight liveness check."""
    return jsonify({"pong": True})


@app.route("/api/auth/login", methods=["POST"])
@limiter.limit(RATE_LIMIT_AUTH)
def login():
    """
    POST /api/auth/login
    Body: { "email": "...", "password": "..." }
    Authenticates user with strict schema validation and per-IP/account exponential backoff.
    """
    payload = request.get_json(silent=True) or {}
    is_valid, err = validate_auth_input(payload, is_signup=False)
    if not is_valid:
        return jsonify(err), 400

    email = payload.get("email").strip().lower()

    # Check exponential backoff lockout
    allowed, retry_after = check_auth_exponential_backoff(account_id=email)
    if not allowed:
        return jsonify({
            "error": "Too many failed login attempts.",
            "details": f"Account temporarily locked for security. Please try again in {retry_after} seconds.",
            "retry_after": retry_after
        }), 429

    # Demo Authentication logic
    password = payload.get("password")
    if password == "password123" or len(password) >= 8:
        record_successful_auth(account_id=email)
        return jsonify({
            "status": "success",
            "message": "Authenticated successfully.",
            "user": {"email": email, "role": "user"}
        })

    record_failed_auth_attempt(account_id=email)
    return jsonify({"error": "Invalid email or password."}), 401


@app.route("/api/auth/signup", methods=["POST"])
@limiter.limit(RATE_LIMIT_AUTH)
def signup():
    """
    POST /api/auth/signup
    Body: { "email": "...", "password": "...", "name": "..." }
    """
    payload = request.get_json(silent=True) or {}
    is_valid, err = validate_auth_input(payload, is_signup=True)
    if not is_valid:
        return jsonify(err), 400

    email = payload.get("email").strip().lower()
    return jsonify({
        "status": "created",
        "message": "Account created successfully.",
        "user": {"email": email, "name": payload.get("name", "").strip()}
    }), 201


@app.route("/api/auth/reset-password", methods=["POST"])
@limiter.limit(RATE_LIMIT_AUTH)
def reset_password():
    """POST /api/auth/reset-password — Request password reset."""
    payload = request.get_json(silent=True) or {}
    email = payload.get("email", "").strip().lower()
    if not email:
        return jsonify({"error": "Validation error", "details": {"email": "Email address is required."}}), 400

    return jsonify({"message": "If an account exists for this email, password reset instructions have been sent."})


# ════════════════════════════════════════════════════════
# FILE UPLOAD SAFETY ENDPOINT
# ════════════════════════════════════════════════════════

@app.route("/api/upload", methods=["POST"])
@limiter.limit(RATE_LIMIT_USER)
def upload_file():
    """
    POST /api/upload
    Handles file upload safety: checks extension, file size, binary magic bytes,
    and stores in isolated non-executable storage outside web root.
    """
    if "file" not in request.files:
        return jsonify({"error": "Validation error", "details": "No file field in form payload."}), 400

    file_obj = request.files["file"]
    success, result = validate_and_save_upload(file_obj)

    if not success:
        return jsonify(result), 400

    return jsonify(result), 201


# ════════════════════════════════════════════════════════
# INDEXING ENDPOINTS
# ════════════════════════════════════════════════════════

@app.route("/api/index", methods=["POST"])
@app.route("/api/ingest", methods=["POST"])
@limiter.limit(RATE_LIMIT_USER)
def index_repo():
    """
    POST /api/index
    Body: { "repo_url": "...", "github_token": "..." }
    Strict schema validation & async indexing pipeline.
    """
    payload = request.get_json(silent=True) or {}
    is_valid, err = validate_index_input(payload)
    if not is_valid:
        return jsonify(err), 400

    repo_url = payload.get("repo_url") or payload.get("url")
    github_token = payload.get("github_token") or payload.get("token")

    try:
        job_id, status = start_indexing_job(repo_url, github_token)
        return jsonify({
            "job_id": job_id,
            "slug": job_id,
            "status": status,
            "message": "Indexing started in the background."
        }), 202
    except Exception as e:
        app_logger.error(f"Failed to start indexing: {e}")
        return jsonify({"error": "Failed to initiate repository indexing job."}), 500


@app.route("/api/status/<job_id>", methods=["GET"])
@app.route("/api/ingest/status/<job_id>", methods=["GET"])
@limiter.exempt
def get_status(job_id):
    """GET /api/status/<job_id> — Returns indexing progress."""
    job_id = job_id.strip()

    if not validate_slug(job_id):
        return jsonify({"error": "Invalid job identifier."}), 400

    status_info = get_job_status(job_id)

    if status_info:
        if status_info["status"] == "completed":
            repo_meta = get_repo(job_id)
            if repo_meta:
                status_info["processed_files"] = repo_meta.get("file_count", 0)
                status_info["total_files"] = repo_meta.get("file_count", 0)
                status_info["files"] = repo_meta.get("processed_files", [])
        return jsonify(status_info)

    repo_meta = get_repo(job_id)
    if repo_meta:
        return jsonify({
            "percent": 100,
            "current_file": "done",
            "status": "completed",
            "processed_files": repo_meta.get("file_count", 0),
            "total_files": repo_meta.get("file_count", 0),
            "files": repo_meta.get("processed_files", [])
        })

    return jsonify({"error": "No active indexing job or cache found for specified repository."}), 404


@app.route("/api/ingest/cancel/<job_id>", methods=["POST"])
@limiter.limit(RATE_LIMIT_USER)
def cancel_indexing(job_id):
    """Cancel an active indexing task."""
    job_id = job_id.strip()
    if not validate_slug(job_id):
        return jsonify({"error": "Invalid job identifier."}), 400

    cancelled = request_job_cancel(job_id)
    if cancelled:
        return jsonify({"status": "cancelled", "message": "Cancellation requested."})
    return jsonify({"error": "Job is not in a cancellable state or not found."}), 400


@app.route("/api/repos/<slug>/reindex", methods=["POST"])
@limiter.limit(RATE_LIMIT_USER)
def reindex_repo(slug):
    """
    POST /api/repos/<slug>/reindex
    Force re-index an existing repository.
    """
    slug = slug.strip()
    if not validate_slug(slug):
        return jsonify({"error": "Invalid repository slug format."}), 400

    repo_meta = get_repo(slug)
    if not repo_meta:
        return jsonify({"error": "Repository not found in cache."}), 404

    repo_url = repo_meta.get("url", "")
    if not repo_url:
        return jsonify({"error": "Repository URL not stored in cache."}), 400

    try:
        job_id, status = start_indexing_job(repo_url, None)
        return jsonify({
            "job_id": job_id,
            "slug": job_id,
            "status": status,
            "message": "Re-indexing started in the background."
        }), 202
    except Exception as e:
        app_logger.error(f"Re-indexing failed for {slug}: {e}")
        return jsonify({"error": "Failed to start re-indexing task."}), 500


# ════════════════════════════════════════════════════════
# REPOSITORY ENDPOINTS
# ════════════════════════════════════════════════════════

@app.route("/api/repos", methods=["GET"])
@limiter.limit(RATE_LIMIT_USER)
def get_repos_list():
    """GET /api/repos — List all indexed repositories with details."""
    repos = list_repos()
    slugs = [r["slug"] for r in repos]
    return jsonify({"repos": slugs, "details": repos})


@app.route("/api/repos/<slug>", methods=["GET"])
@limiter.limit(RATE_LIMIT_USER)
def get_repo_details(slug):
    """GET /api/repos/<slug> — Returns repo metadata."""
    slug = slug.strip()
    if not validate_slug(slug):
        return jsonify({"error": "Invalid repository slug."}), 400

    repo = get_repo(slug)
    if not repo:
        return jsonify({"error": "Repository not found."}), 404
    return jsonify(repo)


@app.route("/api/repos/<slug>/files", methods=["GET"])
@limiter.limit(RATE_LIMIT_USER)
def get_repo_files(slug):
    """GET /api/repos/<slug>/files — Returns file tree structure."""
    slug = slug.strip()
    if not validate_slug(slug):
        return jsonify({"error": "Invalid repository slug."}), 400

    repo = get_repo(slug)
    if not repo:
        return jsonify({"error": "Repository not found."}), 404

    files = repo.get("processed_files", [])

    tree = {}
    for filepath in sorted(files):
        parts = filepath.split("/")
        current = tree
        for i, part in enumerate(parts):
            if i == len(parts) - 1:
                if "_files" not in current:
                    current["_files"] = []
                current["_files"].append(part)
            else:
                if part not in current:
                    current[part] = {}
                current = current[part]

    return jsonify({"files": files, "tree": tree, "count": len(files)})


@app.route("/api/repos/<slug>/file", methods=["GET"])
@limiter.limit(RATE_LIMIT_USER)
def get_repo_file_content(slug):
    """GET /api/repos/<slug>/file?path=... — Returns content of a specific indexed file."""
    slug = slug.strip()
    file_path = request.args.get("path", "").strip()

    if not validate_slug(slug):
        return jsonify({"error": "Invalid repository slug."}), 400
    if not file_path:
        return jsonify({"error": "File path parameter 'path' is required."}), 400

    try:
        chroma = get_chroma_client()
        collection_name = sanitize_collection_name(slug)
        collection = chroma.get_collection(collection_name)
        results = collection.get(where={"file": file_path})

        metadatas = results.get("metadatas", [])
        documents = results.get("documents", [])

        if not metadatas or not documents:
            return jsonify({"error": f"File '{file_path}' not found in index."}), 404

        chunks = []
        for meta, doc in zip(metadatas, documents):
            chunks.append((meta.get("start_line", 0), doc))
        chunks.sort(key=lambda x: x[0])

        full_content = "\n\n".join(doc for _, doc in chunks)
        return jsonify({"file": file_path, "content": full_content, "chunk_count": len(chunks)})
    except Exception as e:
        app_logger.error(f"Failed to fetch file content for {file_path}: {e}")
        return jsonify({"error": "Failed to retrieve file content."}), 500


@app.route("/api/repos/<slug>/enrich", methods=["GET"])
@limiter.limit(RATE_LIMIT_USER)
def get_repo_enriched(slug):
    """GET /api/repos/<slug>/enrich — Fetch GitHub metadata for indexed repo."""
    slug = slug.strip()
    if not validate_slug(slug):
        return jsonify({"error": "Invalid repository slug."}), 400

    repo = get_repo(slug)
    if not repo:
        return jsonify({"error": "Repository not found."}), 404

    url = repo.get("url", "")
    if not url:
        return jsonify({"error": "Repository URL not available."}), 400

    try:
        enriched = get_enriched_repo_data(url)
        return jsonify(enriched)
    except Exception as e:
        app_logger.warning(f"GitHub enrichment failed for {slug}: {e}")
        return jsonify({"error": "Unable to fetch enriched GitHub metadata."}), 500


@app.route("/api/repo/<repo_name>", methods=["DELETE"])
@app.route("/api/repos/<repo_name>", methods=["DELETE"])
@limiter.limit(RATE_LIMIT_USER)
def delete_repo(repo_name):
    """DELETE /api/repos/<repo_name> — Delete ChromaDB collection + cache."""
    repo_name = repo_name.strip()
    if not validate_slug(repo_name):
        return jsonify({"error": "Invalid repository slug."}), 400

    try:
        chroma = get_chroma_client()
        collection_name = sanitize_collection_name(repo_name)
        chroma.delete_collection(collection_name)
        app_logger.info(f"ChromaDB collection deleted: {collection_name}")
    except Exception as e:
        app_logger.warning(f"Could not delete ChromaDB collection {repo_name}: {e}")

    deleted = delete_repo_from_cache(repo_name)

    try:
        with jobs_lock:
            if repo_name in indexing_jobs:
                del indexing_jobs[repo_name]
    except Exception as e:
        app_logger.warning(f"Could not clean job status for {repo_name}: {e}")

    if deleted:
        return jsonify({"status": "deleted", "repo_name": repo_name, "message": "Repository removed successfully."})
    return jsonify({"error": "Repository not found in metadata cache."}), 404


# ════════════════════════════════════════════════════════
# CHAT ENDPOINT
# ════════════════════════════════════════════════════════

@app.route("/api/chat", methods=["POST"])
@app.route("/api/chat/stream", methods=["POST"])
@limiter.limit(RATE_LIMIT_USER)
def chat():
    """
    POST /api/chat
    Body: { "message": "...", "repo_name": "...", "conversation_history": [...] }
    Strict schema validation & streaming RAG-powered response as SSE.
    """
    payload = request.get_json(silent=True) or {}
    is_valid, err = validate_chat_input(payload)
    if not is_valid:
        return jsonify(err), 400

    query = (payload.get("query") or payload.get("question") or payload.get("message") or "").strip()
    repo_name = (payload.get("repo_name") or payload.get("slug") or payload.get("activeRepo") or "").strip()
    conversation_history = payload.get("history") or payload.get("conversation_history") or []

    if not repo_name:
        available = list_repos()
        if available:
            repo_name = available[0].get("slug", "")

    repo_meta = get_repo(repo_name)
    if not repo_meta:
        available = list_repos()
        if available:
            repo_name = available[0].get("slug", "")
            repo_meta = available[0]
        else:
            return jsonify({"error": f"Repository '{repo_name}' is not indexed yet. Please index a repository first."}), 404

    def sse_generator():
        try:
            for text_chunk in stream_chat_response(query, repo_name, conversation_history):
                yield text_chunk
        except Exception as e:
            app_logger.error(f"Error in SSE streaming: {e}", exc_info=True)
            yield f"data: {{\"error\": \"An error occurred during chat response generation.\"}}\n\n"

    response = Response(stream_with_context(sse_generator()), mimetype="text/event-stream")
    response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
    return response


# ════════════════════════════════════════════════════════
# CODE REVIEW & EXPLANATION ENDPOINTS
# ════════════════════════════════════════════════════════

@app.route("/api/review", methods=["POST"])
@limiter.limit(RATE_LIMIT_USER)
def review_code():
    """
    POST /api/review
    Body: { "code": "...git diff content...", "repo": "optional slug" }
    """
    payload = request.get_json(silent=True) or {}

    diff_content = payload.get("code") or payload.get("diff") or ""
    pr_url = payload.get("pr_url", "").strip()

    if pr_url and not diff_content:
        try:
            import re
            match = re.search(r'github\.com/([^/]+)/([^/]+)/pull/(\d+)', pr_url)
            if match:
                owner, repo, pr_num = match.group(1), match.group(2), int(match.group(3))
                repo_url = f"https://github.com/{owner}/{repo}"
                diff_content = get_pr_diff(repo_url, pr_num) or ""
        except Exception as e:
            app_logger.warning(f"Failed to fetch PR diff from URL: {e}")

    payload["code"] = diff_content
    is_valid, err = validate_review_input(payload)
    if not is_valid:
        return jsonify(err), 400

    context = payload.get("context", "").strip()
    repo_name = payload.get("repo") or payload.get("repo_name", "")

    try:
        review = review_code_diff(
            diff_content=diff_content,
            context=context or None,
            repo_name=repo_name or None
        )
        return jsonify(review)
    except Exception as e:
        app_logger.error(f"Review failed: {e}", exc_info=True)
        return jsonify({"error": "Failed to complete code review."}), 500


@app.route("/api/explain", methods=["POST"])
@limiter.limit(RATE_LIMIT_USER)
def explain_code():
    """
    POST /api/explain
    Body: { "code": "...", "language": "python", "repo": "..." }
    """
    payload = request.get_json(silent=True) or {}
    is_valid, err = validate_review_input(payload)
    if not is_valid:
        return jsonify(err), 400

    code = payload.get("code", "").strip()
    language = payload.get("language", "").strip()
    repo_name = payload.get("repo") or payload.get("repo_name", "")

    def sse_generator():
        try:
            yield f"data: {json.dumps({'status': 'generating'})}\n\n"
            for token in explain_code_snippet(code, language or None, repo_name or None):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            app_logger.error(f"Explain failed: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': 'Failed to generate code explanation.'})}\n\n"

    response = Response(stream_with_context(sse_generator()), mimetype="text/event-stream")
    response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
    return response


# ════════════════════════════════════════════════════════
# REPOSITORY SUMMARY & COMPARISON ENDPOINTS
# ════════════════════════════════════════════════════════

@app.route("/api/repos/<slug>/summary", methods=["GET"])
@limiter.limit(RATE_LIMIT_USER)
def get_repo_summary(slug):
    """GET /api/repos/<slug>/summary"""
    slug = slug.strip()
    if not validate_slug(slug):
        return jsonify({"error": "Invalid repository slug."}), 400

    repo = get_repo(slug)
    if not repo:
        return jsonify({"error": "Repository not found."}), 404

    sample_files = repo.get("processed_files", [])[:100]

    def sse_generator():
        try:
            yield f"data: {json.dumps({'status': 'generating'})}\n\n"
            for token in generate_repo_summary(repo, sample_files):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            app_logger.error(f"Summary generation failed: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': 'Failed to generate repository summary.'})}\n\n"

    response = Response(stream_with_context(sse_generator()), mimetype="text/event-stream")
    response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
    return response


@app.route("/api/compare", methods=["POST"])
@limiter.limit(RATE_LIMIT_USER)
def compare_repos():
    """
    POST /api/compare
    Body: { "repo1": "slug1", "repo2": "slug2" }
    """
    payload = request.get_json(silent=True) or {}
    is_valid, err = validate_compare_input(payload)
    if not is_valid:
        return jsonify(err), 400

    slug1 = payload.get("repo1", "").strip()
    slug2 = payload.get("repo2", "").strip()

    repo1 = get_repo(slug1)
    repo2 = get_repo(slug2)

    if not repo1:
        return jsonify({"error": f"Repository '{slug1}' not found."}), 404
    if not repo2:
        return jsonify({"error": f"Repository '{slug2}' not found."}), 404

    def make_summary(repo):
        return {
            "slug": repo.get("slug"),
            "url": repo.get("url"),
            "file_count": repo.get("file_count"),
            "chunk_count": repo.get("chunk_count"),
            "languages": repo.get("languages"),
            "total_size": repo.get("total_size"),
            "indexed_at": repo.get("indexed_at"),
            "github": repo.get("github", {})
        }

    def sse_generator():
        try:
            yield f"data: {json.dumps({'status': 'generating'})}\n\n"
            for token in compare_repositories(make_summary(repo1), make_summary(repo2)):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            app_logger.error(f"Comparison failed: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': 'Failed to compare repositories.'})}\n\n"

    response = Response(stream_with_context(sse_generator()), mimetype="text/event-stream")
    response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
    return response


# ════════════════════════════════════════════════════════
# SEARCH ENDPOINT
# ════════════════════════════════════════════════════════

@app.route("/api/search", methods=["POST"])
@limiter.limit(RATE_LIMIT_USER)
def search_repo():
    """POST /api/search"""
    payload = request.get_json(silent=True) or {}
    query = payload.get("query", "").strip()
    repo_name = payload.get("repo_name", "").strip()
    top_k = min(int(payload.get("top_k", 10)), 20)

    if not query or len(query) > 4000:
        return jsonify({"error": "Validation error", "details": "Query must be between 1 and 4000 characters."}), 400
    if not repo_name or not validate_slug(repo_name):
        return jsonify({"error": "Validation error", "details": "Invalid repository slug."}), 400

    repo = get_repo(repo_name)
    if not repo:
        return jsonify({"error": f"Repository '{repo_name}' not found."}), 404

    try:
        from chat import retrieve_top_chunks
        chunks = retrieve_top_chunks(query, repo_name, top_k=top_k)
        return jsonify({
            "query": query,
            "repo": repo_name,
            "count": len(chunks),
            "results": chunks
        })
    except Exception as e:
        app_logger.error(f"Search failed: {e}", exc_info=True)
        return jsonify({"error": "Semantic search query failed."}), 500


# ════════════════════════════════════════════════════════
# EXPORT ENDPOINT
# ════════════════════════════════════════════════════════

@app.route("/api/export", methods=["POST"])
@limiter.limit(RATE_LIMIT_USER)
def export_conversation():
    """POST /api/export"""
    payload = request.get_json(silent=True) or {}
    is_valid, err = validate_export_input(payload)
    if not is_valid:
        return jsonify(err), 400

    fmt = payload.get("format", "markdown").lower()
    messages = payload.get("messages", [])
    repo_name = payload.get("repo_name", "repository")
    title = payload.get("title", f"RepoChat — {repo_name}")

    if len(messages) > 500:
        return jsonify({"error": "Too many messages. Maximum 500 per export."}), 400

    if fmt == "json":
        export_data = {
            "title": title,
            "repository": repo_name,
            "exported_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "message_count": len(messages),
            "messages": messages
        }
        return jsonify(export_data)

    lines = [f"# {title}", f"", f"**Repository:** {repo_name}", f"**Exported:** {time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime())}", f"**Messages:** {len(messages)}", f"", "---", ""]

    for msg in messages:
        role = msg.get("role", "")
        content = msg.get("content", "")
        sources = msg.get("sources", [])
        ts = msg.get("timestamp", "")

        if role == "user":
            lines.append(f"## 👤 You{' — ' + ts if ts else ''}")
            lines.append(f"")
            lines.append(content)
            lines.append(f"")
        elif role == "assistant":
            lines.append(f"## 🤖 RepoChat AI{' — ' + ts if ts else ''}")
            lines.append(f"")
            lines.append(content)
            lines.append(f"")
            if sources:
                lines.append(f"**Sources:**")
                for src in sources:
                    line_range = f" (L{src.get('start_line')}-L{src.get('end_line')})" if src.get("start_line") else ""
                    lines.append(f"- `{src.get('file', '')}`{line_range}")
                lines.append(f"")
        lines.append("---")
        lines.append("")

    markdown_content = "\n".join(lines)
    return Response(
        markdown_content,
        mimetype="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=\"repochat-export.md\""}
    )


# ════════════════════════════════════════════════════════
# SHARE ENDPOINTS
# ════════════════════════════════════════════════════════

@app.route("/api/share/<slug>/<message_id>", methods=["GET"])
@limiter.limit(RATE_LIMIT_PUBLIC)
def get_share(slug, message_id):
    """GET /api/share/:slug/:message_id"""
    slug = slug.strip()
    message_id = message_id.strip()
    if not validate_slug(slug):
        return jsonify({"error": "Invalid repository slug."}), 400

    exchange = get_exchange(slug, message_id)
    if not exchange:
        return jsonify({"error": "Shared message not found."}), 404

    repo_meta = get_repo(slug) or {}
    exchange["repo_display"] = slug.replace("_", "/", 1)
    exchange["repo_url"] = exchange.get("repo_url") or repo_meta.get("url", "")
    return jsonify(exchange)


@app.route("/api/share/<slug>", methods=["GET"])
@limiter.limit(RATE_LIMIT_PUBLIC)
def list_shares(slug):
    """GET /api/share/:slug"""
    slug = slug.strip()
    if not validate_slug(slug):
        return jsonify({"error": "Invalid repository slug."}), 400

    exchanges = list_exchanges(slug)
    exchanges.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return jsonify({"slug": slug, "count": len(exchanges), "exchanges": exchanges})


# ════════════════════════════════════════════════════════
# CACHE MANAGEMENT
# ════════════════════════════════════════════════════════

@app.route("/api/cache", methods=["DELETE"])
@limiter.limit(RATE_LIMIT_USER)
def clear_cache():
    """DELETE /api/cache — Clears all repository caches."""
    try:
        repos = list_repos()
        deleted_count = 0

        for repo in repos:
            slug = repo.get("slug", "")
            try:
                chroma = get_chroma_client()
                chroma.delete_collection(sanitize_collection_name(slug))
            except Exception:
                pass
            if delete_repo_from_cache(slug):
                deleted_count += 1

        return jsonify({"status": "cleared", "deleted_count": deleted_count})
    except Exception as e:
        app_logger.error(f"Cache clear failed: {e}")
        return jsonify({"error": "Failed to clear repository cache."}), 500


# ── Run Server ─────────────────────────────────────────
if __name__ == "__main__":
    PORT = int(os.getenv("PORT", 5000))
    HOST = os.getenv("HOST", "0.0.0.0")
    DEBUG = os.getenv("DEBUG", "true").lower() == "true"
    app_logger.info(f"RepoChat AI v3.0 Enterprise starting on {HOST}:{PORT} (debug={DEBUG})")
    app.run(host=HOST, port=PORT, debug=DEBUG, use_reloader=False, threaded=True)
