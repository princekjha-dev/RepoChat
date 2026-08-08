"""
Chunker registry — maps file extensions to the appropriate chunker function.
"""

from pathlib import Path
from typing import Dict, List

from config import BINARY_EXTENSIONS, TEXT_EXTENSIONS, MAX_FILE_SIZE, SKIP_DIRS
from chunkers.python_chunker import chunk_python_file
from chunkers.text_chunker import chunk_text_file


def is_binary_file(path: Path) -> bool:
    """Check if a file is binary based on its extension."""
    return path.suffix.lower() in BINARY_EXTENSIONS


def should_skip_dir(path: Path) -> bool:
    """Check if a directory should be skipped during traversal."""
    return path.name in SKIP_DIRS


def chunk_file(path: Path, repo_root: Path) -> List[Dict[str, object]]:
    """
    Route a file to the appropriate chunker based on extension.

    Priority:
    1. Skip binary files and oversized files
    2. Python files → AST chunker (falls back to text chunker on syntax error)
    3. Known text extensions → text chunker
    4. Unknown extensions → skip
    """
    # Skip oversized files
    try:
        if path.stat().st_size > MAX_FILE_SIZE:
            return []
    except OSError:
        return []

    # Skip binary files
    if is_binary_file(path):
        return []

    suffix = path.suffix.lower()

    # Python → AST chunker with fallback
    if suffix == ".py":
        chunks = chunk_python_file(path, repo_root)
        if chunks:
            return chunks
        # Fallback to text chunker if AST parsing failed
        return chunk_text_file(path, repo_root)

    # Known text files → text chunker
    if suffix in TEXT_EXTENSIONS:
        return chunk_text_file(path, repo_root)

    # Files with no extension but common names
    stem = path.name.lower()
    if stem in {"makefile", "dockerfile", "procfile", "gemfile", "rakefile",
                "readme", "license", "changelog", "contributing", "authors"}:
        return chunk_text_file(path, repo_root)

    return []
