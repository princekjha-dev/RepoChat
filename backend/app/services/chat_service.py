"""
app/services/chat_service.py
RAG chat pipeline: semantic retrieval → context building → LLM streaming →
citation validation → share persistence.
"""

import json
import re
from typing import Any, Dict, Generator, List

from app.ai.llm_client import stream_chat
from app.core.vector_store import get_chroma_client, get_embedding_model
from app.repositories.repo_store import get_repo
from app.repositories.share_store import save_exchange
from app.utils.logging import chat_log
from app.utils.text import sanitize_collection_name

# ── System prompt ──────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are an expert code assistant for RepoChat. Answer questions about the \
repository using ONLY the provided context chunks.

CITATION RULES (mandatory):
- After EVERY claim that depends on retrieved code, add an inline citation.
- Citation format: [file_path:start_line-end_line]  (e.g. [src/auth.py:42-67])
- Use the exact file path and line numbers from the context header above each chunk.
- Do NOT invent file paths or line numbers.
- Non-code general statements do not need citations.

FORMATTING RULES:
- Use markdown for all responses.
- Use fenced code blocks with language identifiers.
- Be concise but thorough.
- If the context lacks information, say so — do not hallucinate.
"""

_CITATION_RE = re.compile(r"\[([^\[\]:]+):(\d+)-(\d+)\]")


# ── Retrieval ──────────────────────────────────────────────────────────────

def retrieve_top_chunks(query: str, repo_name: str, top_k: int = 5) -> List[Dict[str, Any]]:
    if not query.strip():
        return []
    try:
        model = get_embedding_model()
        chroma = get_chroma_client()
        col_name = sanitize_collection_name(repo_name)
        try:
            collection = chroma.get_collection(col_name)
            if collection.count() == 0:
                return []
        except Exception:
            return []
        vec = model.encode([query], normalize_embeddings=True)[0].tolist()
        results = collection.query(query_embeddings=[vec], n_results=min(top_k, collection.count()))
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        return [
            {"chunk": d, "file": m.get("file", ""), "name": m.get("name", ""),
             "type": m.get("type", ""), "start_line": m.get("start_line"),
             "end_line": m.get("end_line")}
            for d, m in zip(docs, metas)
        ]
    except Exception as exc:
        chat_log.error(f"Retrieval failed for '{query}' in {repo_name}: {exc}", exc_info=True)
        return []


# ── Citation validation ────────────────────────────────────────────────────

def validate_citations(answer: str, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    valid, seen = [], set()
    for file_path, s, e in _CITATION_RE.findall(answer):
        try:
            cs, ce = int(s), int(e)
        except ValueError:
            continue
        key = f"{file_path}:{cs}:{ce}"
        if key in seen:
            continue
        seen.add(key)
        for chunk in chunks:
            if chunk.get("file") == file_path:
                if (chunk.get("start_line") or 0) <= ce and cs <= (chunk.get("end_line") or 0):
                    valid.append({"file": file_path, "start": cs, "end": ce})
                    break
        else:
            chat_log.warning(f"Hallucinated citation rejected: [{file_path}:{cs}-{ce}]")
    return valid


# ── History formatting ─────────────────────────────────────────────────────

def format_history(history: List[Dict[str, str]]) -> List[Dict[str, str]]:
    out = []
    for msg in history[-10:]:
        role = msg.get("role", "")
        if role in {"user", "human"}:
            out.append({"role": "user", "content": msg.get("content", "")})
        elif role in {"assistant", "ai", "bot"}:
            out.append({"role": "assistant", "content": msg.get("content", "")})
    return out


# ── Main streaming pipeline ────────────────────────────────────────────────

def stream_chat_response(
    query: str,
    repo_name: str,
    conversation_history: List[Dict[str, str]],
) -> Generator[str, None, None]:
    """
    Yields SSE lines:
      data: {"sources": [...]}
      data: {"token": "..."}
      data: {"citations": [...]}
      data: {"message_id": "..."}
      data: [DONE]
    """
    try:
        chunks = retrieve_top_chunks(query, repo_name, top_k=5)
        sources = [{"file": c["file"], "name": c["name"], "type": c["type"],
                    "start_line": c["start_line"], "end_line": c["end_line"]}
                   for c in chunks]
        yield f"data: {json.dumps({'sources': sources})}\n\n"

        if not chunks:
            yield f"data: {json.dumps({'token': 'No relevant code found for this question.'})}\n\n"
            yield "data: [DONE]\n\n"
            return

        # Build context with citation hints
        context_parts = []
        for c in chunks:
            sl, el = c.get("start_line"), c.get("end_line")
            if sl and el:
                header = f"File: {c['file']} (lines {sl}-{el})"
                hint = f"[{c['file']}:{sl}-{el}]"
            else:
                header = f"File: {c['file']}"
                hint = f"[{c['file']}]"
            context_parts.append(f"{header}\nCitation tag: {hint}\nCode:\n{c['chunk']}")

        user_prompt = (
            f"Context from codebase:\n"
            + "\n\n---\n\n".join(context_parts)
            + f"\n\nQuestion: {query}\n\n"
            "Remember: cite every code-backed claim using the exact citation tags shown above."
        )
        messages = format_history(conversation_history)
        messages.append({"role": "user", "content": user_prompt})

        accumulated: List[str] = []
        for token in stream_chat(SYSTEM_PROMPT, messages):
            accumulated.append(token)
            yield f"data: {json.dumps({'token': token})}\n\n"

        full_answer = "".join(accumulated)
        validated = validate_citations(full_answer, chunks)
        yield f"data: {json.dumps({'citations': validated})}\n\n"

        try:
            repo_meta = get_repo(repo_name) or {}
            mid = save_exchange(
                slug=repo_name, question=query, answer=full_answer,
                citations=validated, repo_url=repo_meta.get("url", ""),
            )
            yield f"data: {json.dumps({'message_id': mid})}\n\n"
        except Exception as exc:
            chat_log.warning(f"Could not persist exchange: {exc}")

        yield "data: [DONE]\n\n"

    except Exception as exc:
        chat_log.error(f"Chat stream error for {repo_name}: {exc}", exc_info=True)
        yield f"data: {json.dumps({'error': str(exc)})}\n\n"
