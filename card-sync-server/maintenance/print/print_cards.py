#!/usr/bin/env python3
import argparse
import sqlite3


def main() -> int:
    parser = argparse.ArgumentParser(description="Print cards as strings from the sync SQLite database")
    parser.add_argument("--db", default="sync.db", help="Path to SQLite database (default: sync.db)")
    parser.add_argument(
        "--active-only",
        action="store_true",
        help="Only print non-deleted cards (deleted_at IS NULL)",
    )
    args = parser.parse_args()

    conn = sqlite3.connect(args.db)
    try:
        try:
            if args.active_only:
                rows = conn.execute(
                    """
                    SELECT c.id, c.deck_id, d.name, c.front, c.back
                    FROM server_cards c
                    LEFT JOIN server_decks d ON d.id = c.deck_id
                    WHERE c.deleted_at IS NULL
                    ORDER BY c.id ASC
                    """
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT c.id, c.deck_id, d.name, c.front, c.back, c.deleted_at
                    FROM server_cards c
                    LEFT JOIN server_decks d ON d.id = c.deck_id
                    ORDER BY c.id ASC
                    """
                ).fetchall()
        except sqlite3.OperationalError as exc:
            if "no such table" in str(exc).lower():
                print("Table 'server_cards' or 'server_decks' not found. Start sync_server once to initialize schema.")
                return 1
            raise
    finally:
        conn.close()

    if not rows:
        print("No cards found.")
        return 0

    for row in rows:
        if args.active_only:
            card_id, deck_id, deck_name, front, back = row
            deck_label = deck_name if deck_name else (deck_id if deck_id else "(no-deck)")
            print(f"{card_id} | deck: {deck_label} | {front} -> {back}")
        else:
            card_id, deck_id, deck_name, front, back, deleted_at = row
            deck_label = deck_name if deck_name else (deck_id if deck_id else "(no-deck)")
            text = f"{card_id} | deck: {deck_label} | {front} -> {back}"
            if deleted_at is not None:
                print(f"{text} [deleted]")
            else:
                print(text)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
