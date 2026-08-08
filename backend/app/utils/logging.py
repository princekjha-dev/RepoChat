"""
app/utils/logging.py
Centralised logger factory. All modules obtain their logger from here.
"""

import logging
import sys


def get_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """Return a configured logger. Idempotent — calling twice is safe."""
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(level)
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s",
        datefmt="%H:%M:%S",
    ))
    logger.addHandler(handler)
    return logger


# Pre-built loggers used across the application
app_log     = get_logger("repochat.app")
ingest_log  = get_logger("repochat.ingest")
chat_log    = get_logger("repochat.chat")
vector_log  = get_logger("repochat.vector")
github_log  = get_logger("repochat.github")
