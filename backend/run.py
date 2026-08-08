"""
run.py — Application entry point.
Usage:
  python run.py              # development
  gunicorn "run:create_app()" --bind 0.0.0.0:5000   # production
"""

from app import create_app
from app.config.settings import DEBUG, HOST, PORT
from app.utils.logging import app_log


def main() -> None:
    application = create_app()
    app_log.info(f"RepoChat AI v3.0 Enterprise — {HOST}:{PORT} (debug={DEBUG})")
    application.run(host=HOST, port=PORT, debug=DEBUG)


# Expose for gunicorn: gunicorn "run:create_app()"
application = create_app()

if __name__ == "__main__":
    main()
