"""
GitHub repository service.
Handles URL validation, cloning, and metadata extraction.
"""

import os
import re
import tempfile
from collections import Counter
from pathlib import Path
from typing import Dict, List, Tuple

from git import Repo

try:
    from config import BINARY_EXTENSIONS, SKIP_DIRS, TEXT_EXTENSIONS
except ImportError:
    from config import BINARY_EXTENSIONS, TEXT_EXTENSIONS
    SKIP_DIRS = {
        ".git", "node_modules", "__pycache__", ".venv", "venv",
        "dist", "build", ".next", ".nuxt", ".output",
        ".cache", ".tox", ".mypy_cache", ".pytest_cache",
        "vendor", "target", "bin", "obj",
        ".idea", ".vscode", ".vs",
        "coverage", ".nyc_output",
    }

from utils.logger import ingest_logger


def slugify_repo_url(repo_url: str) -> str:
    """
    Extract owner/repo from a GitHub URL and create a safe slug.
    Example: https://github.com/user/repo → user_repo
    """
    match = re.search(r"github\.com[:/]([^/]+/[^/]+?)(?:\.git)?(?:/|$)", repo_url)
    if not match:
        raise ValueError(
            "Could not extract owner/repo from URL. "
            "Expected: https://github.com/owner/repository"
        )
    slug = match.group(1).replace("/", "_")
    return re.sub(r"[^a-zA-Z0-9_\-]", "", slug)


def clone_repo(repo_url: str) -> Path:
    """
    Clone a GitHub repository to a temporary directory.
    Uses shallow clone (depth=1) for speed.
    """
    temp_dir = Path(tempfile.mkdtemp(prefix="repochat_"))
    ingest_logger.info(f"Cloning {repo_url} → {temp_dir}")

    try:
        Repo.clone_from(repo_url, temp_dir, depth=1)
    except Exception as e:
        # Clean up temp dir on failure
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise ValueError(f"Failed to clone repository: {e}")

    ingest_logger.info("Clone complete.")
    return temp_dir


def extract_repo_metadata(repo_dir: Path) -> Dict[str, object]:
    """
    Walk a cloned repository and extract metadata:
    - Total file count
    - File list
    - Language breakdown (by extension)
    - Total size in bytes
    - Directory structure
    """
    files: List[str] = []
    language_counter: Counter = Counter()
    total_size = 0

    for root, dirs, filenames in os.walk(repo_dir):
        root_path = Path(root)
        # Skip ignored directories
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

        for fname in filenames:
            fpath = root_path / fname

            # Skip binary files
            if fpath.suffix.lower() in BINARY_EXTENSIONS:
                continue

            try:
                fsize = fpath.stat().st_size
            except OSError:
                continue

            relative = str(fpath.relative_to(repo_dir)).replace("\\", "/")
            files.append(relative)
            total_size += fsize

            # Track language by extension
            ext = fpath.suffix.lower()
            if ext:
                language_counter[ext] += 1

    # Map extensions to readable language names
    ext_to_lang = {
        ".py": "Python", ".js": "JavaScript", ".jsx": "React JSX",
        ".ts": "TypeScript", ".tsx": "React TSX", ".vue": "Vue",
        ".go": "Go", ".java": "Java", ".rb": "Ruby", ".rs": "Rust",
        ".c": "C", ".cpp": "C++", ".h": "C Header", ".hpp": "C++ Header",
        ".cs": "C#", ".swift": "Swift", ".kt": "Kotlin", ".php": "PHP",
        ".html": "HTML", ".css": "CSS", ".scss": "SCSS", ".less": "LESS",
        ".md": "Markdown", ".txt": "Text", ".json": "JSON",
        ".yaml": "YAML", ".yml": "YAML", ".toml": "TOML", ".xml": "XML",
        ".sql": "SQL", ".sh": "Shell", ".bash": "Bash",
        ".r": "R", ".R": "R", ".jl": "Julia", ".lua": "Lua",
        ".dockerfile": "Dockerfile", ".graphql": "GraphQL",
    }

    languages = {}
    for ext, count in language_counter.most_common():
        lang_name = ext_to_lang.get(ext, ext.lstrip(".").upper())
        languages[lang_name] = count

    ingest_logger.info(
        f"Metadata: {len(files)} files, "
        f"{len(languages)} languages, "
        f"{total_size / 1024:.1f} KB"
    )

    return {
        "file_count": len(files),
        "files": files,
        "languages": languages,
        "total_size": total_size,
    }


def build_file_tree(files: List[str]) -> Dict:
    """
    Build a nested directory tree structure from a flat list of file paths.
    Used by the file explorer feature.
    """
    tree: Dict = {}
    for filepath in sorted(files):
        parts = filepath.split("/")
        current = tree
        for i, part in enumerate(parts):
            if i == len(parts) - 1:
                # It's a file
                if "_files" not in current:
                    current["_files"] = []
                current["_files"].append(part)
            else:
                # It's a directory
                if part not in current:
                    current[part] = {}
                current = current[part]
    return tree
