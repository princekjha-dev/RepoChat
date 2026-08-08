import os
import re
import tempfile
from pathlib import Path
from typing import Dict, List

from git import Repo
from sentence_transformers import SentenceTransformer
from chromadb import PersistentClient

from chunker import chunk_file, should_skip_dir

CHROMA_PATH = Path(__file__).resolve().parent.parent / "chroma_db"
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


def slugify_repo_url(repo_url: str) -> str:
    match = re.search(r"github\.com[:/]([^/]+/[^/]+?)(?:/|$)", repo_url)
    if not match:
        raise ValueError("Invalid GitHub repository URL")
    slug = match.group(1).replace("/", "_")
    return re.sub(r"[^a-zA-Z0-9_-]", "", slug)


def clone_repo(repo_url: str) -> Path:
    temp_dir = Path(tempfile.mkdtemp(prefix="repochat_"))
    Repo.clone_from(repo_url, temp_dir)
    return temp_dir


def ingest_repo(repo_url: str) -> Dict[str, object]:
    slug = slugify_repo_url(repo_url)
    repo_dir = clone_repo(repo_url)
    try:
        processed_files: List[str] = []
        all_chunks = []

        embeddings_model = get_model()
        chroma_client = get_client()
        collection = chroma_client.get_or_create_collection(name=slug)

        for root, dirs, files in os.walk(repo_dir):
            root_path = Path(root)
            dirs[:] = [d for d in dirs if not should_skip_dir(root_path / d)]
            for file_name in files:
                file_path = root_path / file_name
                if should_skip_dir(file_path):
                    continue
                if file_path.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp", ".pdf", ".zip", ".tar", ".gz", ".rar", ".exe", ".dll", ".so", ".mp3", ".mp4", ".wav", ".avi"}:
                    continue
                if file_path.stat().st_size > 500 * 1024:
                    continue
                chunks = chunk_file(file_path, repo_dir)
                if not chunks:
                    continue
                processed_files.append(str(file_path.relative_to(repo_dir)).replace("\\", "/"))
                for index, item in enumerate(chunks):
                    chunk_text = item["chunk"]
                    metadata = item["metadata"]
                    all_chunks.append((chunk_text, metadata))

        if all_chunks:
            documents = [chunk for chunk, _ in all_chunks]
            metadatas = [metadata for _, metadata in all_chunks]
            ids = [f"{metadata['file']}-{index}" for index, metadata in enumerate(metadatas)]
            embeddings = embeddings_model.encode(documents, normalize_embeddings=True)
            collection.add(
                ids=ids,
                documents=documents,
                embeddings=embeddings.tolist(),
                metadatas=metadatas,
            )

        return {
            "chunks": len(all_chunks),
            "files": len(processed_files),
            "slug": slug,
            "processed_files": processed_files,
        }
    finally:
        import shutil
        shutil.rmtree(repo_dir, ignore_errors=True)
