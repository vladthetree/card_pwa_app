#!/usr/bin/env python3
"""
Publish the current server deck/card state as sync deltas.

Some maintenance scripts update server_decks/server_cards directly through
apply_operation(). That keeps the server state correct, but already-synced PWA
clients only see changes that also appear in sync_operations. This script emits
idempotent deck/card operations for the current canonical server state.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
import time
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from sync_server import get_default_profile_id, now_ms, open_db  # noqa: E402


SOURCE = "server-maintenance-publish"
SOURCE_CLIENT = "server-maintenance-publisher"


def parse_json_object(raw: str | None) -> dict:
    try:
        parsed = json.loads(raw or "{}")
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def parse_json_list(raw: str | None) -> list:
    try:
        parsed = json.loads(raw or "[]")
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return []


def insert_operation(
    conn: sqlite3.Connection,
    user_id: str,
    op_type: str,
    payload: dict,
    op_id: str,
    client_timestamp: int,
    dry_run: bool,
) -> bool:
    exists = conn.execute("SELECT 1 FROM sync_operations WHERE op_id=?", (op_id,)).fetchone()
    if exists:
        return False
    if dry_run:
        return True
    conn.execute(
        """
        INSERT INTO sync_operations
        (op_id, op_type, payload_json, client_timestamp, source, source_client, created_at, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            op_id,
            op_type,
            json.dumps(payload, ensure_ascii=False),
            client_timestamp,
            SOURCE,
            SOURCE_CLIENT,
            int(time.time()),
            user_id,
        ),
    )
    return True


def publish_decks(conn: sqlite3.Connection, user_id: str, dry_run: bool) -> int:
    active_rows = conn.execute(
        """
        SELECT id, name, parent_deck_id, created_at, source, updated_at
        FROM server_decks
        WHERE user_id=? AND deleted_at IS NULL
        ORDER BY id
        """,
        (user_id,),
    ).fetchall()

    created = 0
    for row in active_rows:
        ts = int(row["updated_at"] or row["created_at"] or now_ms())
        payload = {
            "id": row["id"],
            "name": row["name"],
            "parentDeckId": row["parent_deck_id"],
            "createdAt": row["created_at"] or ts,
            "updatedAt": ts,
            "source": row["source"] or "system",
            "timestamp": ts,
        }
        op_id = f"{SOURCE}:deck.create:{row['id']}:{ts}"
        created += int(insert_operation(conn, user_id, "deck.create", payload, op_id, ts, dry_run))

    return created


def publish_deleted_decks(conn: sqlite3.Connection, user_id: str, dry_run: bool) -> int:
    deleted_rows = conn.execute(
        """
        SELECT id, deleted_at, updated_at
        FROM server_decks
        WHERE user_id=? AND deleted_at IS NOT NULL
        ORDER BY id
        """,
        (user_id,),
    ).fetchall()

    deleted = 0
    for row in deleted_rows:
        ts = int(row["deleted_at"] or row["updated_at"] or now_ms())
        payload = {
            "deckId": row["id"],
            "deletedAt": ts,
            "timestamp": ts,
        }
        op_id = f"{SOURCE}:deck.delete:{row['id']}:{ts}"
        deleted += int(insert_operation(conn, user_id, "deck.delete", payload, op_id, ts, dry_run))

    return deleted


def build_card_create_payload(row: sqlite3.Row) -> dict:
    ts = int(row["updated_at"] or row["created_at"] or now_ms())
    due = row["due"] if row["due"] is not None else 0
    due_at = row["due_at"] if row["due_at"] is not None else int(due) * 86_400_000
    return {
        "id": row["id"],
        "noteId": row["note_id"] or row["id"],
        "deckId": row["deck_id"],
        "front": row["front"] or "",
        "back": row["back"] or "",
        "tags": parse_json_list(row["tags_json"]),
        "extra": parse_json_object(row["extra_json"]),
        "type": row["type"] if row["type"] is not None else 0,
        "queue": row["queue"] if row["queue"] is not None else 0,
        "due": due,
        "dueAt": due_at,
        "interval": row["interval"] if row["interval"] is not None else 0,
        "factor": row["factor"] if row["factor"] is not None else 2500,
        "stability": row["stability"],
        "difficulty": row["difficulty"],
        "reps": row["reps"] if row["reps"] is not None else 0,
        "lapses": row["lapses"] if row["lapses"] is not None else 0,
        "algorithm": row["algorithm"] or "sm2",
        "metadata": parse_json_object(row["metadata_json"]),
        "isDeleted": False,
        "createdAt": row["created_at"] or ts,
        "updatedAt": ts,
        "timestamp": ts,
    }


def publish_active_card_creates(conn: sqlite3.Connection, user_id: str, dry_run: bool) -> int:
    rows = conn.execute(
        """
        SELECT id, note_id, deck_id, front, back, tags_json, extra_json, type, queue, due,
               due_at, interval, factor, stability, difficulty, reps, lapses, algorithm,
               metadata_json, created_at, updated_at
        FROM server_cards
        WHERE user_id=? AND IFNULL(is_deleted, 0)=0 AND deleted_at IS NULL
        ORDER BY id
        """,
        (user_id,),
    ).fetchall()

    published = 0
    for row in rows:
        payload = build_card_create_payload(row)
        ts = int(payload["updatedAt"])
        op_id = f"{SOURCE}:card.create:{row['id']}:{ts}"
        published += int(insert_operation(conn, user_id, "card.create", payload, op_id, ts, dry_run))

    return published


def publish_cards(conn: sqlite3.Connection, user_id: str, dry_run: bool) -> int:
    rows = conn.execute(
        """
        SELECT id, deck_id, front, back, tags_json, extra_json, is_deleted, deleted_at, updated_at
        FROM server_cards
        WHERE user_id=?
        ORDER BY id
        """,
        (user_id,),
    ).fetchall()

    published = 0
    for row in rows:
        ts = int(row["updated_at"] or row["deleted_at"] or now_ms())
        updates = {
            "deckId": row["deck_id"],
            "front": row["front"] or "",
            "back": row["back"] or "",
            "tags": parse_json_list(row["tags_json"]),
            "extra": parse_json_object(row["extra_json"]),
            "isDeleted": bool(row["is_deleted"]),
            "updatedAt": ts,
        }
        if row["deleted_at"] is not None:
            updates["deletedAt"] = int(row["deleted_at"])

        payload = {
            "cardId": row["id"],
            "updates": updates,
            "timestamp": ts,
        }
        op_id = f"{SOURCE}:card.update:{row['id']}:{ts}"
        published += int(insert_operation(conn, user_id, "card.update", payload, op_id, ts, dry_run))

    return published


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--user-id", default=None)
    args = parser.parse_args()

    conn = open_db(sqlite3.Row)
    user_id = args.user_id or get_default_profile_id(conn) or ""
    if not user_id:
        raise SystemExit("Kein User/Profile gefunden.")

    deck_create = publish_decks(conn, user_id, args.dry_run)
    card_update = publish_cards(conn, user_id, args.dry_run)
    card_create = publish_active_card_creates(conn, user_id, args.dry_run)
    deck_delete = publish_deleted_decks(conn, user_id, args.dry_run)
    if not args.dry_run:
        conn.commit()
    conn.close()

    print(f"deck_create_ops={deck_create}")
    print(f"deck_delete_ops={deck_delete}")
    print(f"card_update_ops={card_update}")
    print(f"card_create_ops={card_create}")
    if args.dry_run:
        print("[dry-run] Keine Änderungen gespeichert.")


if __name__ == "__main__":
    main()
