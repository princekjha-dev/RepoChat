"""
app/core/vector_store.py
Thread-safe singletons for the ChromaDB client and SentenceTransformer model.
"""

import threading
from typing import Optional

import chromadb
from sentence_transformers import SentenceTransformer

from app.config.settings import CHROMA_PATH, EMBEDDING_MODEL
from app.utils.logging import vector_log

_lock = threading.Lock()
_model: Optional[SentenceTransformer] = None
_chroma: Optional[chromadb.PersistentClient] = None


def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                vector_log.info(f"Loading embedding model: {EMBEDDING_MODEL}")
                _model = SentenceTransformer(EMBEDDING_MODEL)
                vector_log.info("Embedding model ready.")
    return _model


def get_chroma_client() -> chromadb.PersistentClient:
    global _chroma
    if _chroma is None:
        with _lock:
            if _chroma is None:
                CHROMA_PATH.mkdir(parents=True, exist_ok=True)
                vector_log.info(f"Initialising ChromaDB at: {CHROMA_PATH}")
                _chroma = chromadb.PersistentClient(path=str(CHROMA_PATH))
    return _chroma
