#!/usr/bin/env python3
"""Repair missing due_at values in sync server DB.

Default scope: learning/relearning cards (type 1/3) with NULL due_at.
"""

from __future__ import annotations

import argparse
import os
import sqlite3
from pathlib import Path

DAY_MS = 86_400_000
DEFAULT_DB_PATH = os.environ.get("SYNC_DB_PATH", "sync.db")


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description="Backfill missing due_at values.")
  parser.add_argument("--db", default=DEFAULT_DB_PATH, help="Path to sqlite DB (default: SYNC_DB_PATH or sync.db)")
  parser.add_argument("--all-types", action="store_true", help="Repair all card types, not only learning/relearning")
  parser.add_argument("--yes", action="store_true", help="Skip interactive confirmation")
  return parser.parse_args()


def main() -> int:
  args = parse_args()
  db_path = Path(args.db).expanduser().resolve()

  if not db_path.exists():
    print(f"DB not found: {db_path}")
    return 1

  scope_sql = "" if args.all_types else "AND type IN (1,3)"

  conn = sqlite3.connect(str(db_path))
  try:
    before = conn.execute(
      f"SELECT COUNT(*) FROM server_cards WHERE due_at IS NULL {scope_sql}"
    ).fetchone()[0]

    if before == 0:
      print("No rows need repair.")
      return 0

    if not args.yes:
      scope = "all card types" if args.all_types else "learning/relearning (type 1/3)"
      answer = input(f"Repair {before} rows in {scope} at {db_path}? Type YES: ").strip()
      if answer != "YES":
        print("Aborted.")
        return 0

    conn.execute("BEGIN")
    conn.execute(
      f"""
      UPDATE server_cards
      SET due_at = max(0, CAST(due AS INTEGER)) * ?
      WHERE due_at IS NULL
        AND due IS NOT NULL
        {scope_sql}
      """,
      (DAY_MS,),
    )
    conn.commit()

    after = conn.execute(
      f"SELECT COUNT(*) FROM server_cards WHERE due_at IS NULL {scope_sql}"
    ).fetchone()[0]

    repaired = before - after
    print(f"DB: {db_path}")
    print(f"Rows before: {before}")
    print(f"Rows repaired: {repaired}")
    print(f"Rows remaining: {after}")
    return 0
  except Exception:
    conn.rollback()
    raise
  finally:
    conn.close()


if __name__ == "__main__":
  raise SystemExit(main())
