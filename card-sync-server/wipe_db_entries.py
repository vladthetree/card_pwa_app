#!/usr/bin/env python3
"""Delete all rows from every table in the sync server SQLite database.

Usage:
  python wipe_db_entries.py --yes
  python wipe_db_entries.py --db /path/to/sync.db --yes
"""

from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from pathlib import Path

DEFAULT_DB_PATH = os.environ.get("SYNC_DB_PATH", "sync.db")


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description="Delete all entries from all SQLite tables.")
  parser.add_argument(
    "--db",
    default=DEFAULT_DB_PATH,
    help="Path to SQLite database (default: SYNC_DB_PATH or sync.db).",
  )
  parser.add_argument(
    "--yes",
    action="store_true",
    help="Skip interactive confirmation prompt.",
  )
  return parser.parse_args()


def list_user_tables(conn: sqlite3.Connection) -> list[str]:
  rows = conn.execute(
    """
    SELECT name
    FROM sqlite_master
    WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name
    """
  ).fetchall()
  return [row[0] for row in rows]


def wipe_all_entries(db_path: Path) -> tuple[int, list[tuple[str, int]]]:
  conn = sqlite3.connect(str(db_path))
  conn.row_factory = sqlite3.Row

  deleted_total = 0
  per_table: list[tuple[str, int]] = []

  try:
    tables = list_user_tables(conn)

    conn.execute("PRAGMA foreign_keys = OFF")
    conn.execute("BEGIN")

    for table in tables:
      before_count = conn.execute(f"SELECT COUNT(*) AS n FROM {table}").fetchone()["n"]
      conn.execute(f"DELETE FROM {table}")
      per_table.append((table, int(before_count)))
      deleted_total += int(before_count)

    conn.execute("DELETE FROM sqlite_sequence")
    conn.commit()

    # Reclaim disk space after deleting all rows.
    conn.execute("VACUUM")
  except Exception:
    conn.rollback()
    raise
  finally:
    conn.close()

  return deleted_total, per_table


def main() -> int:
  args = parse_args()
  db_path = Path(args.db).expanduser().resolve()

  if not db_path.exists():
    print(f"DB not found: {db_path}", file=sys.stderr)
    return 1

  if not args.yes:
    print(f"This will delete ALL rows from ALL tables in: {db_path}")
    answer = input("Type YES to continue: ").strip()
    if answer != "YES":
      print("Aborted.")
      return 0

  deleted_total, per_table = wipe_all_entries(db_path)

  print(f"Wiped database: {db_path}")
  for table, count in per_table:
    print(f"  - {table}: removed {count} rows")
  print(f"Total removed rows: {deleted_total}")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
