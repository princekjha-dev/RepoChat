import ast
import os
from pathlib import Path
from typing import Dict, List

BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp", ".pdf", ".zip",
    ".tar", ".gz", ".rar", ".exe", ".dll", ".so", ".mp3", ".mp4", ".wav", ".avi"
}

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build"
}


def is_binary_file(path: Path) -> bool:
    return path.suffix.lower() in BINARY_EXTENSIONS


def should_skip_dir(path: Path) -> bool:
    return path.name in SKIP_DIRS


def chunk_python_file(path: Path, repo_root: Path) -> List[Dict[str, str]]:
    try:
        source = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return []

    try:
        tree = ast.parse(source)
    except SyntaxError:
        return chunk_lines_file(path, repo_root)

    chunks = []
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            start = node.lineno - 1
            end = node.end_lineno if getattr(node, "end_lineno", None) else start + 1
            chunk = "\n".join(source.splitlines()[start:end])
            if chunk.strip():
                chunks.append({
                    "chunk": chunk,
                    "metadata": {
                        "file": str(path.relative_to(repo_root)).replace("\\", "/"),
                        "type": "function" if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) else "class",
                        "name": node.name,
                    },
                })
    return chunks


def chunk_lines_file(path: Path, repo_root: Path) -> List[Dict[str, str]]:
    try:
        with path.open("r", encoding="utf-8") as f:
            lines = f.read().splitlines()
    except (UnicodeDecodeError, OSError):
        return []

    if not lines:
        return []

    chunks = []
    chunk_size = 50
    overlap = 10
    step = chunk_size - overlap
    relative_path = str(path.relative_to(repo_root)).replace("\\", "/")

    for start in range(0, len(lines), step):
        end = min(start + chunk_size, len(lines))
        chunk_lines = lines[start:end]
        if not chunk_lines:
            continue
        chunk_text = "\n".join(chunk_lines)
        start_line = start + 1
        end_line = end
        name = f"lines_{start_line}-{end_line}"
        chunks.append({
            "chunk": chunk_text,
            "metadata": {
                "file": relative_path,
                "type": "lines",
                "name": name,
            },
        })

    return chunks


def chunk_file(path: Path, repo_root: Path) -> List[Dict[str, str]]:
    if path.stat().st_size > 500 * 1024:
        return []

    if is_binary_file(path):
        return []

    if path.suffix == ".py":
        return chunk_python_file(path, repo_root)

    if path.suffix.lower() in {".js", ".ts", ".md", ".txt", ".json", ".yaml", ".html", ".css"}:
        return chunk_lines_file(path, repo_root)

    return []
