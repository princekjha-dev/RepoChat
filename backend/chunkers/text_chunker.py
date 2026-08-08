"""
Line-based chunker for text files.
Splits files into overlapping chunks of N lines.
"""

from pathlib import Path
from typing import Dict, List

from config import CHUNK_SIZE, CHUNK_OVERLAP
from utils.logger import ingest_logger


def chunk_text_file(path: Path, repo_root: Path) -> List[Dict[str, object]]:
    """
    Split a text file into overlapping line-based chunks.
    Uses configurable chunk size and overlap from config.
    """
    try:
        with path.open("r", encoding="utf-8") as f:
            lines = f.read().splitlines()
    except (UnicodeDecodeError, OSError):
        return []

    if not lines:
        return []

    chunks = []
    step = CHUNK_SIZE - CHUNK_OVERLAP
    relative_path = str(path.relative_to(repo_root)).replace("\\", "/")

    for start in range(0, len(lines), step):
        end = min(start + CHUNK_SIZE, len(lines))
        chunk_lines = lines[start:end]

        if not chunk_lines:
            continue

        chunk_text = "\n".join(chunk_lines)
        start_line = start + 1
        end_line = end

        chunks.append({
            "chunk": chunk_text,
            "metadata": {
                "file": relative_path,
                "type": "lines",
                "name": f"lines_{start_line}-{end_line}",
                "start_line": start_line,
                "end_line": end_line,
            },
        })

    ingest_logger.debug(f"Text chunker: {relative_path} → {len(chunks)} chunks")
    return chunks
