"""
Ingestion Queue Manager.
Manages asynchronous execution of repository ingestion tasks using a ThreadPoolExecutor.
"""

import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, Optional

from utils.logger import ingest_logger

# Thread-safe storage for task states
# Structure:
# {
#   "slug": {
#     "status": "pending" | "cloning" | "chunking" | "embedding" | "completed" | "failed" | "cancelled",
#     "progress": int (0-100),
#     "processed_files": int,
#     "total_files": int,
#     "error": Optional[str],
#     "result": Optional[dict]
#   }
# }
_status_lock = threading.Lock()
_ingestion_status: Dict[str, Dict[str, Any]] = {}
_cancellation_tokens = set()
_cancellation_lock = threading.Lock()

# ThreadPoolExecutor to run ingestion tasks in background
_executor = ThreadPoolExecutor(max_workers=3)


def get_task_status(slug: str) -> Optional[Dict[str, Any]]:
    """Retrieve status of an ingestion task (thread-safe)."""
    with _status_lock:
        return _ingestion_status.get(slug)


def update_task_status(
    slug: str,
    status: str,
    progress: int,
    processed_files: int = 0,
    total_files: int = 0,
    error: Optional[str] = None,
    result: Optional[dict] = None
):
    """Update task status in the shared state (thread-safe)."""
    with _status_lock:
        if slug not in _ingestion_status:
            _ingestion_status[slug] = {}
        
        _ingestion_status[slug].update({
            "status": status,
            "progress": progress,
            "processed_files": processed_files,
            "total_files": total_files,
            "error": error,
            "result": result
        })
        ingest_logger.info(f"Task [{slug}] status update: status={status}, progress={progress}%, error={error}")


def is_cancelled(slug: str) -> bool:
    """Check if a cancellation request exists for the slug (thread-safe)."""
    with _cancellation_lock:
        return slug in _cancellation_tokens


def cancel_task(slug: str) -> bool:
    """Request cancellation for a task (thread-safe)."""
    with _cancellation_lock:
        with _status_lock:
            status_info = _ingestion_status.get(slug)
            if not status_info:
                return False
            
            current_status = status_info.get("status")
            if current_status in ["completed", "failed", "cancelled"]:
                return False
            
            # Add slug to cancellation set
            _cancellation_tokens.add(slug)
            
            # Immediately mark status as cancelled
            _ingestion_status[slug]["status"] = "cancelled"
            _ingestion_status[slug]["error"] = "Cancelled by user"
            ingest_logger.info(f"Task [{slug}] marked for cancellation.")
            return True


def clear_cancellation(slug: str):
    """Clear cancellation token for a slug (thread-safe)."""
    with _cancellation_lock:
        _cancellation_tokens.discard(slug)


def run_background_ingestion(repo_url: str, force: bool, slug: str):
    """
    Worker function executed in the ThreadPoolExecutor.
    Imports ingest_repo inside to avoid circular imports.
    """
    from services.ingest_service import ingest_repo
    
    # Clear cancellation token from previous runs
    clear_cancellation(slug)
    
    update_task_status(slug, "cloning", 10)
    ingest_logger.info(f"Starting ingestion for {slug} from {repo_url}")
    
    try:
        def status_callback(status: str, progress: int, processed: int = 0, total: int = 0):
            if is_cancelled(slug):
                raise InterruptedError("Cancellation requested by user.")
            update_task_status(slug, status, progress, processed_files=processed, total_files=total)
            ingest_logger.debug(f"Ingestion progress for {slug}: {status} {progress}% ({processed}/{total})")
        
        result = ingest_repo(
            repo_url=repo_url,
            force=force,
            status_callback=status_callback
        )
        
        if is_cancelled(slug):
            raise InterruptedError("Cancellation requested by user.")
        
        ingest_logger.info(f"Ingestion completed successfully for {slug}: {result}")
        update_task_status(slug, "completed", 100, result=result)
        
    except InterruptedError:
        ingest_logger.warning(f"Ingestion task {slug} was cancelled.")
        # Ensure ChromaDB cleanup if cancelled
        from vectorstore.client import delete_collection
        delete_collection(slug)
        update_task_status(slug, "cancelled", 100, error="Cancelled by user")
        
    except Exception as e:
        ingest_logger.error(f"Error in background ingestion for {slug}: {type(e).__name__}: {e}", exc_info=True)
        # Clean up ChromaDB collection on error to prevent corrupted state
        from vectorstore.client import delete_collection
        try:
            delete_collection(slug)
        except Exception as cleanup_error:
            ingest_logger.error(f"Failed to clean up collection {slug}: {cleanup_error}")
        update_task_status(slug, "failed", 100, error=str(e))
    finally:
        clear_cancellation(slug)


def queue_ingestion(repo_url: str, force: bool, slug: str) -> dict:
    """Queue a repository ingestion task if not already running."""
    with _status_lock:
        existing = _ingestion_status.get(slug)
        if existing and existing.get("status") in ["pending", "cloning", "chunking", "embedding"]:
            return {"status": existing["status"], "slug": slug, "already_running": True}
        
        # Initialize/reset status
        _ingestion_status[slug] = {
            "status": "pending",
            "progress": 0,
            "processed_files": 0,
            "total_files": 0,
            "error": None,
            "result": None
        }
        
    # Submit task to ThreadPool
    _executor.submit(run_background_ingestion, repo_url, force, slug)
    return {"status": "pending", "slug": slug, "already_running": False}
