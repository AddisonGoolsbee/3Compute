import logging
import os
from datetime import datetime, timezone


def configure_logging():
    logname = f"logs/{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.log"
    os.makedirs("logs", exist_ok=True)

    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] (%(process)d %(name)s:%(lineno)d) %(message)s", datefmt="%Y-%m-%dT%H:%M:%S"
    )

    root_logger = logging.getLogger()

    # Set log level based on Flask environment
    flask_env = os.environ.get("FLASK_ENV", "development")
    if flask_env == "production":
        root_logger.setLevel(logging.INFO)
    else:
        root_logger.setLevel(logging.DEBUG)

    # Silence noisy OAuth and requests debug messages
    logging.getLogger("requests_oauthlib").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("oauthlib").setLevel(logging.WARNING)

    # Avoid duplicate handlers if already configured
    if not root_logger.handlers:
        file_handler = logging.FileHandler(logname, mode="a")
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)

        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(formatter)
        root_logger.addHandler(stream_handler)
