#!/usr/bin/env python3
import argparse
import atexit
import logging
import os
import signal
import sys
from .config.logging_config import configure_logging

configure_logging()

from dotenv import load_dotenv

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"  # Only for localhost/dev
load_dotenv()

logging.getLogger("werkzeug").setLevel(logging.ERROR)
logger = logging.getLogger("app")


from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_login import LoginManager

from .auth import auth_bp, load_user
from .files import files_bp
from .webhook import webhook_bp
from .terminal import init_terminal, user_containers
from .docker import setup_isolated_network


app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET")

if os.getenv("FLASK_ENV") == "production":
    logger.debug("Running in production mode")
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN_PROD")
else:
    # Default to development settings
    if not os.getenv("FRONTEND_ORIGIN_DEV"):
        raise ValueError("FRONTEND_ORIGIN_DEV environment variable is not set.")
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN_DEV")

CORS(app, origins=[FRONTEND_ORIGIN], supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins=[FRONTEND_ORIGIN], manage_session=False)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.user_loader(load_user)

app.register_blueprint(auth_bp)
app.register_blueprint(files_bp)
app.register_blueprint(webhook_bp)
init_terminal(socketio)


def setup_uploads_directory():
    """Create /tmp/uploads directory with proper ownership for container access"""
    uploads_dir = "/tmp/uploads"
    os.makedirs(uploads_dir, exist_ok=True)
    
    # Set ownership to match container user (UID 1000)
    try:
        os.chown(uploads_dir, 1000, 1000)
        os.chmod(uploads_dir, 0o755)
        logger.debug("Set ownership of /tmp/uploads to UID 1000")
    except OSError as e:
        # This might fail in development environments, which is OK
        logger.warning(f"Failed to set ownership for /tmp/uploads: {e}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-p", "--port", default=5555, type=int)
    parser.add_argument("--host", default=os.getenv("HOST_IP"))
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args()

    # Determine debug mode based on environment and command line args
    flask_env = os.getenv("FLASK_ENV", "development")
    debug_mode = args.debug and flask_env != "production"

    if debug_mode:
        logging.getLogger().setLevel(logging.DEBUG)

    logger.info(f"Serving on http://{args.host}:{args.port}")

    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    signal.signal(signal.SIGINT, lambda *_: sys.exit(0))

    setup_isolated_network()
    setup_uploads_directory()
    socketio.run(app, debug=debug_mode, port=args.port, host=args.host)


if __name__ == "__main__":
    main()
