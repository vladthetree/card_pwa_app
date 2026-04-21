#!/usr/bin/env python3
import argparse
import sqlite3


def main() -> int:
    parser = argparse.ArgumentParser(description="Print deck names from the sync SQLite database")
    parser.add_argument("--db", default="sync.db", help="Path to SQLite database (default: sync.db)")
    parser.add_argument(
        "--active-only",
        action="store_true",
        help="Only print non-deleted decks (deleted_at IS NULL)",
    )
    args = parser.parse_args()

    conn = sqlite3.connect(args.db)
    try:
        try:
            if args.active_only:
                rows = conn.execute(
                    "SELECT id, name FROM server_decks WHERE deleted_at IS NULL ORDER BY id ASC"
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT id, name, deleted_at FROM server_decks ORDER BY id ASC"
                ).fetchall()
        except sqlite3.OperationalError as exc:
            if "no such table" in str(exc).lower():
                print("Table 'server_decks' not found. Start sync_server once to initialize schema.")
                return 1
            raise
    finally:
        conn.close()

    if not rows:
        print("No decks found.")
        return 0

    for row in rows:
        if args.active_only:
            deck_id, name = row
            label = name if name else deck_id
            print(str(label))
        else:
            deck_id, name, deleted_at = row
            label = name if name else deck_id
            if deleted_at is not None:
                print(f"{label} [deleted]")
            else:
                print(str(label))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
