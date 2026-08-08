"""
Singleton manager for SentenceTransformer and ChromaDB clients.
Eliminates the duplication that existed across ingest.py and retriever.py.
"""

import threading
from typing import Optional

from chromadb import PersistentClient
from sentence_transformers import SentenceTransformer

from config import CHROMA_PATH, EMBEDDING_MODEL
from utils.logger import vector_logger

db_lock = threading.Lock()
_lock = threading.Lock()
_model: Optional[SentenceTransformer] = None
_client: Optional[PersistentClient] = None


def get_model() -> SentenceTransformer:
    """Get or create the shared SentenceTransformer model (thread-safe)."""
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                vector_logger.info(f"Loading embedding model: {EMBEDDING_MODEL}")
                _model = SentenceTransformer(EMBEDDING_MODEL)
                vector_logger.info("Embedding model loaded.")
    return _model


def get_client() -> PersistentClient:
    """Get or create the shared ChromaDB client (thread-safe)."""
    global _client
    if _client is None:
        with _lock:
            if _client is None:
                CHROMA_PATH.mkdir(parents=True, exist_ok=True)
                vector_logger.info(f"Initializing ChromaDB at: {CHROMA_PATH}")
                _client = PersistentClient(path=str(CHROMA_PATH))
                vector_logger.info("ChromaDB client ready.")
    return _client


def get_collection(slug: str):
    """Get or create a ChromaDB collection for a repository."""
    with db_lock:
        client = get_client()
        return client.get_or_create_collection(name=slug)


def delete_collection(slug: str) -> bool:
    """Delete a ChromaDB collection for a repository."""
    try:
        with db_lock:
            client = get_client()
            client.delete_collection(name=slug)
            vector_logger.info(f"Deleted collection: {slug}")
            return True
    except Exception as e:
        vector_logger.error(f"Failed to delete collection {slug}: {e}")
        return False


def health_check() -> bool:
    """Check if ChromaDB is accessible."""
    try:
        client = get_client()
        client.heartbeat()
        return True
    except Exception:
        return False
