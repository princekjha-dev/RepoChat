"""
RepoChat Rate Limiter & Exponential Backoff Module.
Implements configurable thresholds per endpoint type (Auth, Public, User)
and per-IP + per-account exponential backoff protection against brute-force attacks.
"""

import os
import time
import threading
from typing import Dict, Tuple, Optional
from flask import request, jsonify

# Configurable Rate Limits from Environment Variables
RATE_LIMIT_AUTH = os.getenv("RATE_LIMIT_AUTH", "5 per minute")
RATE_LIMIT_PUBLIC = os.getenv("RATE_LIMIT_PUBLIC", "60 per minute")
RATE_LIMIT_USER = os.getenv("RATE_LIMIT_USER", "200 per minute")

MAX_AUTH_ATTEMPTS = int(os.getenv("MAX_AUTH_ATTEMPTS", "5"))
BASE_BACKOFF_SECONDS = int(os.getenv("BASE_BACKOFF_SECONDS", "5"))

# In-Memory Exponential Backoff Tracker
# Structure: key -> {"failed_attempts": int, "blocked_until": float}
_auth_tracker: Dict[str, Dict[str, float]] = {}
_tracker_lock = threading.Lock()


def get_client_ip() -> str:
    """Extracts client IP, supporting reverse proxy X-Forwarded-For headers securely."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "127.0.0.1"


def check_auth_exponential_backoff(account_id: Optional[str] = None) -> Tuple[bool, Optional[int]]:
    """
    Checks if current IP or account is temporarily locked out due to exponential backoff.
    Returns (is_allowed: bool, retry_after_seconds: Optional[int]).
    """
    ip = get_client_ip()
    keys_to_check = [f"ip:{ip}"]
    if account_id:
        keys_to_check.append(f"acct:{account_id.lower().strip()}")

    now = time.time()
    with _tracker_lock:
        for k in keys_to_check:
            record = _auth_tracker.get(k)
            if record and record.get("blocked_until", 0) > now:
                retry_after = int(record["blocked_until"] - now) + 1
                return False, retry_after

    return True, None


def record_failed_auth_attempt(account_id: Optional[str] = None):
    """
    Records a failed auth attempt and applies exponential backoff if attempts exceed MAX_AUTH_ATTEMPTS.
    Backoff formula: delay = BASE_BACKOFF_SECONDS * (2 ** (attempts - MAX_AUTH_ATTEMPTS))
    """
    ip = get_client_ip()
    keys_to_update = [f"ip:{ip}"]
    if account_id:
        keys_to_update.append(f"acct:{account_id.lower().strip()}")

    now = time.time()
    with _tracker_lock:
        for k in keys_to_update:
            record = _auth_tracker.get(k, {"failed_attempts": 0, "blocked_until": 0})
            attempts = record["failed_attempts"] + 1
            record["failed_attempts"] = attempts

            if attempts >= MAX_AUTH_ATTEMPTS:
                multiplier = 2 ** (attempts - MAX_AUTH_ATTEMPTS)
                backoff_delay = min(BASE_BACKOFF_SECONDS * multiplier, 3600)  # Max 1 hour lock
                record["blocked_until"] = now + backoff_delay

            _auth_tracker[k] = record


def record_successful_auth(account_id: Optional[str] = None):
    """Resets failed attempt counters on successful authentication."""
    ip = get_client_ip()
    keys_to_clear = [f"ip:{ip}"]
    if account_id:
        keys_to_clear.append(f"acct:{account_id.lower().strip()}")

    with _tracker_lock:
        for k in keys_to_clear:
            _auth_tracker.pop(k, None)
