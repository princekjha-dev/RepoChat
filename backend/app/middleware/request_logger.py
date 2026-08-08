"""
app/middleware/request_logger.py
Before/after-request hooks for timing and logging every HTTP request.
"""

import time

from flask import Flask, g, request

from app.utils.logging import app_log


def register_middleware(app: Flask) -> None:
    @app.before_request
    def _start_timer():
        g.start_time = time.time()

    @app.after_request
    def _log_request(response):
        if hasattr(g, "start_time"):
            ms = (time.time() - g.start_time) * 1000
            app_log.info(f"{request.method} {request.path} → {response.status_code} ({ms:.0f}ms)")
        return response
