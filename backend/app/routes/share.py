"""app/routes/share.py — Public share and export endpoints."""

import time

from flask import Blueprint, Response, jsonify, request

from app.repositories.repo_store import get_repo
from app.repositories.share_store import get_exchange, list_exchanges

share_bp = Blueprint("share", __name__)


@share_bp.route("/api/share/<slug>/<message_id>", methods=["GET"])
def get_share(slug, message_id):
    exchange = get_exchange(slug, message_id)
    if not exchange:
        return jsonify({"error": "Shared message not found."}), 404
    repo_meta = get_repo(slug) or {}
    exchange["repo_display"] = slug.replace("_", "/", 1)
    exchange["repo_url"] = exchange.get("repo_url") or repo_meta.get("url", "")
    return jsonify(exchange)


@share_bp.route("/api/share/<slug>", methods=["GET"])
def list_shares(slug):
    exchanges = sorted(list_exchanges(slug),
                       key=lambda x: x.get("timestamp", ""), reverse=True)
    return jsonify({"slug": slug, "count": len(exchanges), "exchanges": exchanges})


@share_bp.route("/api/export", methods=["POST"])
def export_conversation():
    payload = request.get_json(silent=True) or {}
    fmt = payload.get("format", "markdown").lower()
    messages = payload.get("messages", [])
    repo_name = payload.get("repo_name", "repository")
    title = payload.get("title", f"RepoChat — {repo_name}")

    if fmt == "json":
        return jsonify({
            "title": title, "repository": repo_name,
            "exported_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "message_count": len(messages), "messages": messages,
        })

    lines = [
        f"# {title}", "",
        f"**Repository:** {repo_name}",
        f"**Exported:** {time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime())}",
        f"**Messages:** {len(messages)}", "", "---", "",
    ]
    for msg in messages:
        role = msg.get("role", "")
        content = msg.get("content", "")
        sources = msg.get("sources", [])
        ts = msg.get("timestamp", "")
        ts_suffix = f" — {ts}" if ts else ""
        if role == "user":
            lines += [f"## 👤 You{ts_suffix}", "", content, ""]
        elif role == "assistant":
            lines += [f"## 🤖 RepoChat AI{ts_suffix}", "", content, ""]
            if sources:
                lines.append("**Sources:**")
                for src in sources:
                    rng = (f" (L{src.get('start_line')}-L{src.get('end_line')})"
                           if src.get("start_line") else "")
                    lines.append(f"- `{src.get('file', '')}`{rng}")
                lines.append("")
        lines += ["---", ""]

    return Response(
        "\n".join(lines),
        mimetype="text/markdown",
        headers={"Content-Disposition": 'attachment; filename="repochat-export.md"'},
    )
