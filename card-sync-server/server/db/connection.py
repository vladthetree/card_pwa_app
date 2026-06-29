"""Single SQLite connection factory.

Reads DB_PATH from server.config at call time so that both the env-driven
production path and tests overriding server.config.DB_PATH take effect.
"""
import sqlite3

from server import config
from server.common.helpers import env_int


def open_db(row_factory=None):
  conn = sqlite3.connect(config.DB_PATH, timeout=max(1, env_int(config.DB_BUSY_TIMEOUT_MS, 10000) / 1000))
  conn.execute(f"PRAGMA busy_timeout={max(1, env_int(config.DB_BUSY_TIMEOUT_MS, 10000))}")
  conn.execute("PRAGMA foreign_keys=ON")
  if row_factory is not None:
    conn.row_factory = row_factory
  return conn
