"""
app/config/settings.py
Centralised configuration — single source of truth loaded once at startup.
All modules import from here; no module reads os.getenv directly.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (two levels up from this file)
_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(_ROOT / ".env")

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR: Path = Path(__file__).resolve().parents[2]   # backend/
PROJECT_ROOT: Path = BASE_DIR.parent                   # repo root
CHROMA_PATH: Path = PROJECT_ROOT / "chroma_db"
CACHE_DIR: Path = BASE_DIR / "cache"
REPO_CACHE_FILE: Path = CACHE_DIR / "repo_data.json"
SHARE_CACHE_FILE: Path = CACHE_DIR / "share_data.json"

# ── Server ─────────────────────────────────────────────────────────────────
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "5000"))
DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

# ── LLM Providers ──────────────────────────────────────────────────────────
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")

GROQ_API_URL: str = "https://api.groq.com/openai/v1/chat/completions"
OPENROUTER_API_URL: str = "https://openrouter.ai/api/v1/chat/completions"

GROQ_MODEL: str = "llama-3.3-70b-versatile"
OPENROUTER_MODEL: str = os.getenv("LLM_MODEL", "meta-llama/llama-3.3-70b-instruct")
ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"

# ── Embeddings ─────────────────────────────────────────────────────────────
EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

# ── Indexing limits ────────────────────────────────────────────────────────
MAX_FILE_SIZE: int = 1024 * 1024       # 1 MB per file
MAX_REPO_SIZE_MB: int = 100
MAX_INDEX_FILES: int = 2000
CHUNK_BATCH_SIZE: int = 100
DEFAULT_TOP_K: int = 5
MAX_SEARCH_TOP_K: int = 20

# ── Rate limits ────────────────────────────────────────────────────────────
RATE_LIMIT_DEFAULT: list[str] = ["2000 per day", "500 per hour"]

# ── File classification ────────────────────────────────────────────────────
BINARY_EXTENSIONS: frozenset[str] = frozenset({
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp",
    ".pdf", ".zip", ".tar", ".gz", ".rar", ".7z",
    ".exe", ".dll", ".so", ".dylib",
    ".mp3", ".mp4", ".wav", ".avi", ".mov", ".mkv",
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    ".pyc", ".pyo", ".class", ".o", ".obj",
})

SUPPORTED_EXTENSIONS: frozenset[str] = frozenset({
    ".py", ".js", ".ts", ".jsx", ".tsx",
    ".java", ".cpp", ".go", ".rs", ".c", ".h", ".hpp",
    ".rb", ".php", ".swift", ".kt", ".r", ".jl", ".lua",
    ".sh", ".bash", ".zsh",
    ".md", ".txt", ".rst",
    ".json", ".yaml", ".yml", ".toml", ".xml",
    ".html", ".css", ".scss", ".less",
    ".sql", ".graphql", ".prisma",
    ".env.example", ".cfg", ".ini", ".conf",
})

SKIP_DIRS: frozenset[str] = frozenset({
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", ".nuxt", ".output",
    ".cache", ".tox", ".mypy_cache", ".pytest_cache",
    "vendor", "target", "bin", "obj",
    ".idea", ".vscode", ".vs",
    "coverage", ".nyc_output",
})

# ── Share cache ────────────────────────────────────────────────────────────
MAX_SHARES_PER_REPO: int = 100
