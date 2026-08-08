"""
Structured logging setup for RepoChat.
Provides consistent, timestamped log output.
"""

import logging
import sys
from datetime import datetime


def setup_logger(name: str = "repochat", level: int = logging.INFO) -> logging.Logger:
    """Create and configure a logger with console output."""
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger

    logger.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)

    formatter = logging.Formatter(
        fmt="%(asctime)s │ %(levelname)-8s │ %(name)-12s │ %(message)s",
        datefmt="%H:%M:%S",
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    return logger


# Pre-configured loggers for each module
app_logger = setup_logger("repochat.app")
ingest_logger = setup_logger("repochat.ingest")
chat_logger = setup_logger("repochat.chat")
vector_logger = setup_logger("repochat.vector")


def log_request(method: str, path: str, status: int, duration_ms: float) -> None:
    """Log an HTTP request with timing info."""
    app_logger.info(f"{method} {path} → {status} ({duration_ms:.0f}ms)")
