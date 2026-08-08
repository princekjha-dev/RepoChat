"""
AST-based chunker for Python files.
Extracts functions, classes, and their docstrings as individual chunks.
"""

import ast
from pathlib import Path
from typing import Dict, List

from utils.logger import ingest_logger


def chunk_python_file(path: Path, repo_root: Path) -> List[Dict[str, object]]:
    """
    Parse a Python file using AST and extract functions/classes as chunks.
    Falls back to line-based chunking on syntax errors.
    """
    try:
        source = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return []

    try:
        tree = ast.parse(source)
    except SyntaxError:
        # Will be handled by the registry falling back to text_chunker
        return []

    chunks = []
    lines = source.splitlines()
    relative_path = str(path.relative_to(repo_root)).replace("\\", "/")

    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            start = node.lineno - 1
            end = node.end_lineno if getattr(node, "end_lineno", None) else start + 1
            chunk_text = "\n".join(lines[start:end])

            if not chunk_text.strip():
                continue

            node_type = (
                "function"
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                else "class"
            )

            chunks.append({
                "chunk": chunk_text,
                "metadata": {
                    "file": relative_path,
                    "type": node_type,
                    "name": node.name,
                    "start_line": start + 1,
                    "end_line": end,
                },
            })

    ingest_logger.debug(f"Python chunker: {relative_path} → {len(chunks)} chunks")
    return chunks
