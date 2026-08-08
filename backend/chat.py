"""
Chat module for RepoChat.
Handles semantic chunk retrieval, prompt/context preparation,
conversation history tracking, and streaming LLM integration.
Powered exclusively by OpenRouter API with local RAG fallback.

Citation support:
  - LLM is required to cite as [file_path:start_line-end_line]
  - Post-processing validates each citation against the retrieved context
  - Validated citations are emitted as a separate SSE event
  - Each exchange is persisted so it can be shared via /api/share/:slug/:id
"""

import os
import re
import json
import requests
from typing import Dict, List, Any, Generator, Optional

from utils import chat_logger, count_tokens
from indexer import get_chroma_client, get_embedding_model, sanitize_collection_name

# ── API Configuration ──────────────────────────────────
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL   = os.getenv("LLM_MODEL", "meta-llama/llama-3.3-70b-instruct:free")

def _is_real_key(key: str) -> bool:
    """Return True only if the key looks like a valid, non-placeholder secret."""
    if not key or not isinstance(key, str):
        return False
    k = key.strip()
    if not k or k.startswith("your_") or len(k) < 15:
        return False
    placeholders = {"your_groq_api_key_here", "your_anthropic_api_key_here",
                   "your_openrouter_api_key_here", "your_api_key_here", "your_openrouter_key"}
    return k not in placeholders

SYSTEM_PROMPT = """\
You are an expert code assistant for RepoChat. Answer questions about the \
repository using ONLY the provided context chunks.

CITATION RULES (mandatory):
- After EVERY claim that depends on retrieved code, you MUST add an inline citation.
- Citation format: [file_path:start_line-end_line]  (example: [src/auth.py:42-67])
- Use the exact file path and line numbers from the context header above each chunk.
- Do NOT invent file paths or line numbers — only cite what is in the context.
- If a fact spans multiple chunks, cite each relevant chunk separately.
- Non-code general statements do not need citations.

FORMATTING RULES:
- Use markdown for all responses.
- Use fenced code blocks with language identifiers (```python, ```js, etc.).
- Structure longer answers with headings and bullet points.
- Be concise but thorough.
- If the context lacks enough information, say so clearly and do not hallucinate.
"""

# Regex that matches the citation format the LLM is asked to produce.
# Captures: file_path, start_line, end_line
_CITATION_RE = re.compile(
    r"\[([^\[\]:]+):(\d+)-(\d+)\]"
)


# ── Citation helpers ───────────────────────────────────

def _build_chunk_key(chunk: Dict[str, Any]) -> str:
    """Build a lookup key from a chunk's metadata."""
    return f"{chunk.get('file', '')}:{chunk.get('start_line', '')}:{chunk.get('end_line', '')}"


def extract_and_validate_citations(
    answer: str,
    chunks: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    1. Extract all [file:start-end] tags from the LLM answer.
    2. Validate each against the chunks that were actually in context.
       A citation is valid if its file matches and the line range overlaps
       (not strictly equal — LLM may cite a sub-range) with a known chunk.
    3. Return deduplicated list of valid citation dicts.
    """
    raw_matches = _CITATION_RE.findall(answer)  # [(file, start, end), ...]

    valid_citations: List[Dict[str, Any]] = []
    seen = set()

    for file_path, start_str, end_str in raw_matches:
        try:
            cite_start = int(start_str)
            cite_end   = int(end_str)
        except ValueError:
            continue

        dedup_key = f"{file_path}:{cite_start}:{cite_end}"
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        # Validate: the cited file+range must overlap with a retrieved chunk
        is_valid = False
        for chunk in chunks:
            if chunk.get("file", "") != file_path:
                continue
            chunk_start = chunk.get("start_line") or 0
            chunk_end   = chunk.get("end_line") or 0
            # Overlap check: ranges [a,b] and [c,d] overlap iff a<=d and c<=b
            if chunk_start <= cite_end and cite_start <= chunk_end:
                is_valid = True
                break

        if is_valid:
            valid_citations.append({
                "file":  file_path,
                "start": cite_start,
                "end":   cite_end,
            })
        else:
            chat_logger.warning(
                f"Hallucinated citation rejected: [{file_path}:{cite_start}-{cite_end}]"
            )

    return valid_citations


# ── Semantic Search Retriever ─────────────────────────

def retrieve_top_chunks(query: str, repo_name: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Retrieve the top-K most relevant chunks from ChromaDB for a query."""
    if not query.strip():
        return []

    try:
        model = get_embedding_model()
        chroma = get_chroma_client()
        collection_name = sanitize_collection_name(repo_name)

        try:
            collection = chroma.get_collection(collection_name)
            count = collection.count()
        except Exception:
            # Fallback: search ChromaDB collections for matching collection name
            try:
                colls = chroma.list_collections()
                found_coll = None
                for c in colls:
                    c_name = c.name if hasattr(c, "name") else str(c)
                    if c_name.lower() == collection_name.lower():
                        found_coll = chroma.get_collection(c_name)
                        break
                if found_coll:
                    collection = found_coll
                    count = collection.count()
                elif colls:
                    first = colls[0]
                    first_name = first.name if hasattr(first, "name") else str(first)
                    collection = chroma.get_collection(first_name)
                    count = collection.count()
                else:
                    return []
            except Exception:
                chat_logger.warning(f"ChromaDB collection {collection_name} does not exist.")
                return []

        if count == 0:
            chat_logger.warning(f"ChromaDB collection {collection_name} is empty.")
            return []

        query_vector = model.encode([query], normalize_embeddings=True)[0].tolist()

        results = collection.query(
            query_embeddings=[query_vector],
            n_results=min(top_k, count)
        )

        docs  = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]

        retrieved = []
        for doc, meta in zip(docs, metas):
            retrieved.append({
                "chunk":      doc,
                "file":       meta.get("file", "unknown"),
                "name":       meta.get("name", "unknown"),
                "type":       meta.get("type", "unknown"),
                "start_line": meta.get("start_line"),
                "end_line":   meta.get("end_line"),
            })
        return retrieved

    except Exception as e:
        chat_logger.error(f"Failed to retrieve chunks for '{query}' in {repo_name}: {e}", exc_info=True)
        return []


# ── Conversation History Formatter ────────────────────

def format_history(history: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Formats and slices history to the last 5 turns (10 messages)."""
    formatted = []
    recent = history[-10:] if history else []
    for msg in recent:
        role    = msg.get("role", "")
        content = msg.get("content", "")
        if role in ("user", "human"):
            formatted.append({"role": "user",      "content": content})
        elif role in ("assistant", "ai", "bot"):
            formatted.append({"role": "assistant", "content": content})
    return formatted


# ── Stream Generators ─────────────────────────────────

def _stream_openai_compat(
    api_url: str,
    api_key: str,
    model: str,
    system_prompt: str,
    messages: List[Dict[str, str]],
    extra_headers: Optional[Dict[str, str]] = None,
) -> Generator[str, None, None]:
    """
    Generic OpenAI-compatible streaming endpoint.
    Works with Groq, OpenRouter, and any OpenAI-compatible API.
    """
    full_messages = [{"role": "system", "content": system_prompt}] + messages

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type":  "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)

    payload = {
        "model":      model,
        "messages":   full_messages,
        "stream":     True,
        "max_tokens": 1500,
        "temperature": 0.2,
    }

    response = requests.post(
        api_url,
        headers=headers,
        json=payload,
        stream=True,
        timeout=60,
    )
    response.raise_for_status()

    for line in response.iter_lines():
        if not line:
            continue
        line_str = line.decode("utf-8").strip()
        if not line_str.startswith("data: "):
            continue
        data_payload = line_str[6:]
        if data_payload == "[DONE]":
            break
        try:
            data  = json.loads(data_payload)
            token = data["choices"][0]["delta"].get("content", "")
            if token:
                yield token
        except Exception:
            pass


def _stream_anthropic(system_prompt: str, messages: List[Dict[str, str]]) -> Generator[str, None, None]:
    """Streams tokens directly from Anthropic SDK."""
    import anthropic
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    with client.messages.stream(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1500,
        system=system_prompt,
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            yield text


# ── Main Chat Stream Handler ──────────────────────────

# ── Fallback RAG Synthesizer ──────────────────────────

def _stream_local_rag_fallback(
    query: str,
    repo_name: str,
    chunks: List[Dict[str, Any]],
) -> Generator[str, None, None]:
    """
    Fallback RAG synthesizer that generates a clear, cited response directly
    from semantic vector search context when no external LLM API key is available or reachable.
    """
    intro = f"### Codebase Context for `{repo_name.replace('_', '/')}`\n\n"
    intro += f"Based on semantic search over the indexed repository for **\"{query}\"**, here are the relevant code sections retrieved from context:\n\n"
    
    for word in intro.split(" "):
        yield word + " "
    
    for i, c in enumerate(chunks, 1):
        file_path = c.get("file", "unknown")
        start = c.get("start_line", 1)
        end = c.get("end_line", 1)
        code = c.get("chunk", "").strip()
        name = c.get("name")
        chunk_type = c.get("type", "code")

        header = f"#### {i}. `{file_path}`\n"
        if name and name != "unknown":
            header += f"**{chunk_type.capitalize()}**: `{name}` (lines {start}–{end})\n\n"
        else:
            header += f"*(lines {start}–{end})*\n\n"

        ext = file_path.split(".")[-1] if "." in file_path else "text"
        snippet = f"```{ext}\n{code[:800]}\n```\n\n"
        citation = f"Citation: [{file_path}:{start}-{end}]\n\n---\n\n"

        full_block = header + snippet + citation
        for word in full_block.split(" "):
            yield word + " "


# ── Main Chat Stream Handler ──────────────────────────

def stream_chat_response(
    query: str,
    repo_name: str,
    conversation_history: List[Dict[str, str]],
) -> Generator[str, None, None]:
    """
    RAG Chat stream pipeline with citation validation and share persistence.

    Yields SSE data lines in this order:
      data: {"sources": [...]}           — retrieved source list (immediately)
      data: {"token": "..."}             — LLM tokens as they stream
      data: {"citations": [...]}         — validated citations post-stream
      data: {"message_id": "..."}        — share ID for the persisted exchange
      data: [DONE]
    """
    try:
        # 1. Semantic Search
        chunks = retrieve_top_chunks(query, repo_name, top_k=5)

        # 2. Emit sources immediately (for the sidebar)
        sources = [
            {
                "file":       c["file"],
                "name":       c["name"],
                "type":       c["type"],
                "start_line": c["start_line"],
                "end_line":   c["end_line"],
            }
            for c in chunks
        ]
        yield f"data: {json.dumps({'sources': sources})}\n\n"

        if not chunks:
            yield f"data: {json.dumps({'token': 'I could not find relevant code for this question in the indexed repository.'})}\n\n"
            yield "data: [DONE]\n\n"
            return

        # 3. Build citation-annotated context string
        context_parts = []
        for c in chunks:
            start, end = c.get("start_line"), c.get("end_line")
            if start and end:
                header = f"File: {c['file']} (lines {start}-{end})"
                cite_hint = f"[{c['file']}:{start}-{end}]"
            else:
                header = f"File: {c['file']}"
                cite_hint = f"[{c['file']}]"
            context_parts.append(
                f"{header}\n"
                f"Citation tag for this chunk: {cite_hint}\n"
                f"Code:\n{c['chunk']}"
            )
        context_str = "\n\n---\n\n".join(context_parts)

        # 4. Construct messages
        user_prompt = (
            f"Context from codebase:\n{context_str}\n\n"
            f"Question: {query}\n\n"
            f"Remember: cite every code-backed claim using the exact citation tags "
            f"shown in the context headers above, e.g. [src/foo.py:10-30]."
        )
        messages = format_history(conversation_history)
        messages.append({"role": "user", "content": user_prompt})

        # 5. OpenRouter API Key Retrieval & Streaming Setup
        openrouter_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        openrouter_model = os.getenv("LLM_MODEL", "meta-llama/llama-3.3-70b-instruct:free").strip()

        stream_gen = None
        if _is_real_key(openrouter_key):
            try:
                chat_logger.info(f"Attempting OpenRouter ({openrouter_model}) for query in {repo_name}")
                stream_gen = _stream_openai_compat(
                    api_url=OPENROUTER_API_URL,
                    api_key=openrouter_key,
                    model=openrouter_model,
                    system_prompt=SYSTEM_PROMPT,
                    messages=messages,
                    extra_headers={
                        "HTTP-Referer": "https://github.com/princekjha-dev/RepoChat",
                        "X-Title":      "RepoChat AI",
                    },
                )
            except Exception as oe:
                chat_logger.warning(f"OpenRouter stream init failed: {oe}")

        # Fallback to Local RAG Synthesizer if OpenRouter API key is unconfigured or fails
        if not stream_gen:
            chat_logger.info(f"Using Local RAG Synthesizer for query in {repo_name}")
            stream_gen = _stream_local_rag_fallback(query, repo_name, chunks)

        # 6. Stream tokens, accumulating the full answer for post-processing
        accumulated = []
        try:
            for token in stream_gen:
                accumulated.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as se:
            chat_logger.warning(f"Stream interrupted ({se}), switching to RAG synthesis fallback...")
            fallback_gen = _stream_local_rag_fallback(query, repo_name, chunks)
            for token in fallback_gen:
                accumulated.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"

        full_answer = "".join(accumulated)

        # 7. Post-process: extract and validate citations
        validated_citations = extract_and_validate_citations(full_answer, chunks)
        yield f"data: {json.dumps({'citations': validated_citations})}\n\n"

        # 8. Persist exchange for sharing
        try:
            from share_cache import save_exchange
            from indexer import get_repo
            repo_meta = get_repo(repo_name) or {}
            message_id = save_exchange(
                slug=repo_name,
                question=query,
                answer=full_answer,
                citations=validated_citations,
                repo_url=repo_meta.get("url", ""),
            )
            yield f"data: {json.dumps({'message_id': message_id})}\n\n"
        except Exception as persist_err:
            chat_logger.warning(f"Could not persist exchange for sharing: {persist_err}")

        yield "data: [DONE]\n\n"

    except Exception as e:
        chat_logger.error(f"Error in chat stream for {repo_name}: {e}", exc_info=True)
        yield f"data: {json.dumps({'error': f'An error occurred: {str(e)}'})}\n\n"
