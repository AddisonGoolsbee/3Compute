# logging_config.py
import logging
import os
from datetime import datetime, timezone

def configure_logging():
    logname = f"logs/{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.log"
    os.makedirs("logs", exist_ok=True)

    formatter = logging.Formatter(
        fmt='%(asctime)s [%(levelname)s] (%(process)d %(name)s:%(lineno)d) %(message)s',
        datefmt='%Y-%m-%dT%H:%M:%S'
    )

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)

    # Avoid duplicate handlers if already configured
    if not root_logger.handlers:
        file_handler = logging.FileHandler(logname, mode='a')
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)

        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(formatter)
        root_logger.addHandler(stream_handler)
