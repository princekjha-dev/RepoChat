"""
Vector search retriever.
Uses shared vectorstore client to search for relevant chunks.
"""

from typing import Dict, List

from vectorstore.client import get_model, get_collection, db_lock
from utils.logger import chat_logger
from config import DEFAULT_TOP_K


def retrieve_chunks(
    query: str,
    repo_slug: str,
    top_k: int = DEFAULT_TOP_K,
) -> List[Dict[str, object]]:
    """
    Retrieve the most relevant chunks for a query from a repository's collection.

    Returns a list of dicts with keys: chunk, file, name, type, start_line, end_line
    """
    if not query.strip():
        chat_logger.warning("Empty query provided to retrieve_chunks")
        return []

    try:
        model = get_model()
        collection = get_collection(repo_slug)

        with db_lock:
            count = collection.count()
            if count == 0:
                chat_logger.warning(f"Empty collection for slug: {repo_slug} - repository may not be indexed yet")
                return []

            try:
                query_embedding = model.encode([query], normalize_embeddings=True)[0]
            except Exception as e:
                chat_logger.error(f"Failed to encode query '{query}': {e}", exc_info=True)
                raise

            try:
                results = collection.query(
                    query_embeddings=[query_embedding.tolist()],
                    n_results=min(top_k, count),
                )
            except Exception as e:
                chat_logger.error(f"ChromaDB query failed for slug {repo_slug}: {e}", exc_info=True)
                raise

        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]

        if not docs:
            chat_logger.info(f"Query returned no results for '{query}' in {repo_slug}")
            return []

        retrieved = []
        for chunk, meta in zip(docs, metas):
            retrieved.append({
                "chunk": chunk,
                "file": meta.get("file", "unknown"),
                "name": meta.get("name", "unknown"),
                "type": meta.get("type", "unknown"),
                "start_line": meta.get("start_line"),
                "end_line": meta.get("end_line"),
            })

        chat_logger.info(
            f"Retrieved {len(retrieved)} chunks for query "
            f"(slug={repo_slug}, top_k={top_k})"
        )
        return retrieved
    
    except Exception as e:
        chat_logger.error(f"Error retrieving chunks for query '{query}' in {repo_slug}: {e}", exc_info=True)
        return []


def search_chunks(
    query: str,
    repo_slug: str,
    top_k: int = 10,
) -> List[Dict[str, object]]:
    """
    Search indexed chunks by keyword (uses embedding similarity).
    Returns results with relevance info for the search feature.
    """
    return retrieve_chunks(query, repo_slug, top_k=top_k)
