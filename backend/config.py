"""
Centralized configuration for RepoChat backend.
Single source of truth for all settings.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Paths ──────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
CHROMA_PATH = PROJECT_ROOT / "chroma_db"
REPO_CACHE_PATH = BASE_DIR / "cache" / "repo_data.json"

# ── Model Settings ─────────────────────────────────────
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
LLM_MODEL = os.getenv("LLM_MODEL", "mistralai/mistral-7b-instruct")

# ── OpenRouter ─────────────────────────────────────────
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# ── Chunking ───────────────────────────────────────────
CHUNK_SIZE = 50          # lines per chunk
CHUNK_OVERLAP = 10       # overlapping lines between chunks
MAX_FILE_SIZE = 1024 * 1024   # 1MB max file size

# ── Safety Limits ──────────────────────────────────────
MAX_REPO_SIZE_MB = 50    # Maximum repository size: 50MB
MAX_INDEX_FILES = 1000   # Maximum number of files to index
GIT_CLONE_TIMEOUT = 60   # Git clone timeout in seconds (60s)

# ── Supported Extensions ───────────────────────────────
BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp",
    ".pdf", ".zip", ".tar", ".gz", ".rar", ".7z",
    ".exe", ".dll", ".so", ".dylib",
    ".mp3", ".mp4", ".wav", ".avi", ".mov", ".mkv",
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    ".pyc", ".pyo", ".class", ".o", ".obj",
}

TEXT_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx",
    ".vue", ".svelte",
    ".go", ".java", ".rb", ".rs", ".c", ".cpp", ".h", ".hpp",
    ".sh", ".bash", ".zsh", ".fish",
    ".md", ".txt", ".rst", ".adoc",
    ".json", ".yaml", ".yml", ".toml", ".xml",
    ".html", ".css", ".scss", ".less",
    ".sql", ".graphql", ".prisma",
    ".env", ".cfg", ".ini", ".conf",
    ".dockerfile", ".makefile",
    ".r", ".R", ".jl", ".lua", ".php", ".swift", ".kt",
}

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", ".nuxt", ".output",
    ".cache", ".tox", ".mypy_cache", ".pytest_cache",
    "vendor", "target", "bin", "obj",
    ".idea", ".vscode", ".vs",
    "coverage", ".nyc_output",
}

# ── Server ─────────────────────────────────────────────
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 5000))
DEBUG = os.getenv("DEBUG", "true").lower() == "true"
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

# ── Retrieval ──────────────────────────────────────────
DEFAULT_TOP_K = 5
