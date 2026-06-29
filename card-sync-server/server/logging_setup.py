"""Structured logging setup for the sync server."""
import logging
import os
import sys
from logging.handlers import TimedRotatingFileHandler

from server.config import (
  LOGGER,
  SERVER_LOG_DIR,
  SERVER_LOG_FILE,
  SERVER_LOG_KEEP_DAYS,
  SERVER_LOG_LEVEL,
)
from server.common.helpers import env_int


_LAST_HEALTH_LOG_BY_IP = {}

def setup_logging():
  os.makedirs(SERVER_LOG_DIR, exist_ok=True)
  log_path = os.path.join(SERVER_LOG_DIR, SERVER_LOG_FILE)

  level_name = str(SERVER_LOG_LEVEL).upper()
  level = getattr(logging, level_name, logging.INFO)
  keep_days = env_int(SERVER_LOG_KEEP_DAYS, 30)

  LOGGER.setLevel(level)
  LOGGER.propagate = False

  if LOGGER.handlers:
    return

  formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s", "%Y-%m-%d %H:%M:%S")

  file_handler = TimedRotatingFileHandler(
    log_path,
    when="midnight",
    interval=1,
    backupCount=max(1, keep_days),
    encoding="utf-8",
  )
  file_handler.setFormatter(formatter)
  file_handler.setLevel(level)
  LOGGER.addHandler(file_handler)

  stderr_handler = logging.StreamHandler(sys.stderr)
  stderr_handler.setFormatter(formatter)
  stderr_handler.setLevel(level)
  LOGGER.addHandler(stderr_handler)

def log(msg):
  LOGGER.info(msg)
