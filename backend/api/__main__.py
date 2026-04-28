"""Entry point for running the FastAPI backend: python -m backend.api"""

import argparse
import logging
import os
import signal
import sys

import uvicorn
from dotenv import load_dotenv

from backend.config.logging_config import configure_logging

configure_logging()

load_dotenv("backend/.env")

if os.getenv("FLASK_ENV") != "production":
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"


def main():
    parser = argparse.ArgumentParser(description="CS Room API server")
    parser.add_argument("-p", "--port", default=5555, type=int)
    parser.add_argument("--host", default=os.getenv("HOST_IP", "127.0.0.1"))
    parser.add_argument("--reload", action="store_true")
    args = parser.parse_args()

    logger = logging.getLogger("csroom")
    logger.info(f"Starting CS Room API on http://{args.host}:{args.port}")

    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    signal.signal(signal.SIGINT, lambda *_: sys.exit(0))

    uvicorn.run(
        "backend.api.app:create_app",
        factory=True,
        host=args.host,
        port=args.port,
        reload=args.reload,
        reload_dirs=["backend"] if args.reload else None,
        log_level="info",
    )


if __name__ == "__main__":
    main()
