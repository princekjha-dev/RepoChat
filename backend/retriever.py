from typing import List, Dict

from chromadb import PersistentClient
from sentence_transformers import SentenceTransformer

from ingest import CHROMA_PATH

MODEL_NAME = "all-MiniLM-L6-v2"

model = None
client = None


def get_model():
    global model
    if model is None:
        model = SentenceTransformer(MODEL_NAME)
    return model


def get_client():
    global client
    if client is None:
        client = PersistentClient(path=str(CHROMA_PATH))
    return client


def retrieve_chunks(query: str, repo_slug: str, top_k: int = 5) -> List[Dict[str, str]]:
    if not query.strip():
        return []

    embeddings_model = get_model()
    chroma_client = get_client()
    collection = chroma_client.get_or_create_collection(name=repo_slug)

    if collection.count() == 0:
        return []

    query_embedding = embeddings_model.encode([query], normalize_embeddings=True)[0]
    results = collection.query(
        query_embeddings=[query_embedding.tolist()],
        n_results=min(top_k, collection.count()),
    )

    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]

    retrieved = []
    for chunk, meta in zip(docs, metas):
        retrieved.append({
            "chunk": chunk,
            "file": meta.get("file", "unknown"),
            "name": meta.get("name", "unknown"),
        })
    return retrieved
