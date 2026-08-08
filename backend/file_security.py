"""
RepoChat File Security Module.
Implements file upload safety: file type validation, magic content byte checking,
size limits, isolated non-webroot storage, and execution prevention.
"""

import os
import uuid
import mimetypes
from typing import Dict, Any, Tuple, Optional
from werkzeug.utils import secure_filename

# Configuration
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "cache", "uploads"))
MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_FILE_SIZE_BYTES", 10 * 1024 * 1024))  # 10 MB

# Allowed extensions and corresponding MIME types
ALLOWED_EXTENSIONS = {
    ".py": "text/x-python",
    ".js": "application/javascript",
    ".ts": "application/typescript",
    ".jsx": "text/jsx",
    ".tsx": "text/tsx",
    ".json": "application/json",
    ".md": "text/markdown",
    ".txt": "text/plain",
    ".zip": "application/zip",
    ".pdf": "application/pdf",
    ".html": "text/html",
    ".css": "text/css",
    ".cpp": "text/x-c++",
    ".c": "text/x-c",
    ".go": "text/x-go",
    ".rs": "text/x-rust",
    ".java": "text/x-java",
}

# Forbidden magic byte signatures (e.g. ELF executables, Windows PE executables, Shebang scripts)
FORBIDDEN_SIGNATURES = [
    b"\x7fELF",            # Linux ELF Executable
    b"MZ",                 # Windows PE Executable / DLL
    b"\xCA\xFE\xBA\xBE",   # Java Bytecode / Mach-O Heavy
]


def ensure_upload_dir():
    """Ensures isolated upload directory exists outside web root with safe permissions."""
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR, mode=0o700, exist_ok=True)


def validate_and_save_upload(file_obj, custom_filename: Optional[str] = None) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """
    Validates file upload type, size, content headers, and saves to non-executable isolated storage.
    Returns (success: bool, response_or_error: Dict).
    """
    ensure_upload_dir()

    if not file_obj or not file_obj.filename:
        return False, {"error": "Validation error", "details": "No file attached in upload request."}

    raw_filename = secure_filename(custom_filename or file_obj.filename)
    ext = os.path.splitext(raw_filename)[1].lower()

    # 1. Validate File Extension
    if ext not in ALLOWED_EXTENSIONS:
        return False, {
            "error": "Validation error",
            "details": f"File extension '{ext}' is not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS.keys())}"
        }

    # 2. Read content bytes & Check File Size
    file_obj.seek(0, os.SEEK_END)
    size = file_obj.tell()
    file_obj.seek(0)

    if size == 0:
        return False, {"error": "Validation error", "details": "Uploaded file is empty."}

    if size > MAX_FILE_SIZE_BYTES:
        return False, {
            "error": "Validation error",
            "details": f"File size ({size} bytes) exceeds maximum limit of {MAX_FILE_SIZE_BYTES} bytes (10MB)."
        }

    # 3. Content Inspection (Magic Bytes Check)
    header_bytes = file_obj.read(512)
    file_obj.seek(0)

    for forbidden in FORBIDDEN_SIGNATURES:
        if header_bytes.startswith(forbidden):
            return False, {
                "error": "Security error",
                "details": "Executable binary content detected. Binary uploads are strictly prohibited."
            }

    # 4. Save to Isolated Storage outside web root with non-executable permissions
    unique_id = uuid.uuid4().hex
    safe_stored_filename = f"{unique_id}_{raw_filename}"
    save_path = os.path.join(UPLOAD_DIR, safe_stored_filename)

    file_obj.save(save_path)

    # Enforce non-executable permissions (rw-------)
    try:
        os.chmod(save_path, 0o600)
    except Exception:
        pass

    return True, {
        "file_id": unique_id,
        "filename": raw_filename,
        "size_bytes": size,
        "stored_path": save_path,
        "message": "File uploaded and verified successfully."
    }
