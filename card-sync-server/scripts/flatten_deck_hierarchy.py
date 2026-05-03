#!/usr/bin/env python3
"""
Flatten active deck hierarchies to one subdeck level.

Allowed shape:
  root deck -> direct subdeck

Normal SY0-701 leaf deck cards are moved into their objective subdeck, then the
leaf decks are deleted. Review decks are flattened directly below
99_Needs_Review and renamed with their review context.
"""

from __future__ import annotations

import argparse
import re
import sqlite3
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from sync_server import (  # noqa: E402
    SY0_701_OBJECTIVES,
    SY0_701_ROOT_DECKS,
    apply_operation,
    get_default_profile_id,
    now_ms,
    open_db,
    security_objective_deck_id,
    security_objective_deck_name,
)


SOURCE_CLIENT = "flatten_deck_hierarchy"
REVIEW_ROOT_ID = "needs-review-root"
REVIEW_OTHER_ID = "needs-review-other"
REVIEW_ROOT_NAME = "99_Needs_Review"
REVIEW_OTHER_NAME = "Other"

OBJECTIVE_TITLES = {code: title for code, title, _root_name in SY0_701_OBJECTIVES}
OBJECTIVE_IDS = {security_objective_deck_id(code) for code, _title, _root in SY0_701_OBJECTIVES}


class Timestamp:
    def __init__(self, conn: sqlite3.Connection, user_id: str) -> None:
        max_card = conn.execute(
            "SELECT MAX(updated_at) FROM server_cards WHERE user_id=?", (user_id,)
        ).fetchone()[0] or 0
        max_deck = conn.execute(
            "SELECT MAX(updated_at) FROM server_decks WHERE user_id=?", (user_id,)
        ).fetchone()[0] or 0
        self.value = max(now_ms(), max_card, max_deck) + 1

    def next(self) -> int:
        current = self.value
        self.value += 1
        return current


def active_deck(conn: sqlite3.Connection, user_id: str, deck_id: str) -> sqlite3.Row | None:
    return conn.execute(
        """
        SELECT id, name, parent_deck_id, created_at, source
        FROM server_decks
        WHERE user_id=? AND id=? AND deleted_at IS NULL
        """,
        (user_id, deck_id),
    ).fetchone()


def upsert_deck(
    conn: sqlite3.Connection,
    clock: Timestamp,
    user_id: str,
    deck_id: str,
    name: str,
    parent_id: str | None,
    dry_run: bool,
) -> bool:
    row = active_deck(conn, user_id, deck_id)
    if not row:
        return False
    if row["name"] == name and row["parent_deck_id"] == parent_id:
        return False
    if dry_run:
        return True

    ts = clock.next()
    apply_operation(
        conn,
        "deck.create",
        {
            "id": deck_id,
            "name": name,
            "parentDeckId": parent_id,
            "createdAt": row["created_at"] or ts,
            "updatedAt": ts,
            "source": row["source"] or "system",
        },
        client_timestamp=ts,
        source_client=SOURCE_CLIENT,
        user_id=user_id,
    )
    return True


def move_cards(
    conn: sqlite3.Connection,
    clock: Timestamp,
    user_id: str,
    source_deck_id: str,
    target_deck_id: str,
    dry_run: bool,
) -> int:
    rows = conn.execute(
        """
        SELECT id
        FROM server_cards
        WHERE user_id=? AND deck_id=? AND is_deleted=0
        ORDER BY id
        """,
        (user_id, source_deck_id),
    ).fetchall()
    if dry_run:
        return len(rows)

    moved = 0
    for row in rows:
        ts = clock.next()
        apply_operation(
            conn,
            "card.update",
            {"cardId": row["id"], "updates": {"deckId": target_deck_id, "updatedAt": ts}},
            client_timestamp=ts,
            source_client=SOURCE_CLIENT,
            user_id=user_id,
        )
        moved += 1
    return moved


def delete_deck(
    conn: sqlite3.Connection,
    clock: Timestamp,
    user_id: str,
    deck_id: str,
    dry_run: bool,
) -> bool:
    if not active_deck(conn, user_id, deck_id):
        return False
    if dry_run:
        return True
    ts = clock.next()
    apply_operation(
        conn,
        "deck.delete",
        {"deckId": deck_id, "deletedAt": ts},
        client_timestamp=ts,
        source_client=SOURCE_CLIENT,
        user_id=user_id,
    )
    return True


def clean_review_name(name: str) -> str:
    cleaned = re.sub(r"\s+", " ", name).strip()
    return cleaned if cleaned.startswith("Review ") else f"Review {cleaned}"


def review_objective_name(deck_id: str, fallback: str) -> str:
    match = re.match(r"needs-review-objective-([1-5])-([0-9]+)$", deck_id)
    if not match:
        return clean_review_name(fallback)
    code = f"{match.group(1)}.{int(match.group(2))}"
    title = OBJECTIVE_TITLES.get(code)
    if not title:
        return clean_review_name(fallback)
    return f"Review {security_objective_deck_name(code, title)}"


def get_tree_rows(conn: sqlite3.Connection, user_id: str) -> list[sqlite3.Row]:
    return conn.execute(
        """
        WITH RECURSIVE tree(id, name, parent_deck_id, root_id, depth, path) AS (
          SELECT id, name, parent_deck_id, id, 0, name
          FROM server_decks
          WHERE user_id=? AND deleted_at IS NULL
            AND (parent_deck_id IS NULL OR parent_deck_id='')
          UNION ALL
          SELECT d.id, d.name, d.parent_deck_id, tree.root_id, tree.depth + 1,
                 tree.path || ' > ' || d.name
          FROM server_decks d
          JOIN tree ON d.parent_deck_id = tree.id
          WHERE d.user_id=? AND d.deleted_at IS NULL
        )
        SELECT id, name, parent_deck_id, root_id, depth, path
        FROM tree
        ORDER BY depth DESC, path DESC
        """,
        (user_id, user_id),
    ).fetchall()


def delete_empty_decks(
    conn: sqlite3.Connection,
    clock: Timestamp,
    user_id: str,
    deck_ids: set[str],
    dry_run: bool,
) -> int:
    deleted = 0
    for deck_id in deck_ids:
        row = conn.execute(
            """
            SELECT 1
            FROM server_decks d
            WHERE d.user_id=? AND d.id=? AND d.deleted_at IS NULL
              AND NOT EXISTS (
                SELECT 1 FROM server_cards c
                WHERE c.user_id=d.user_id AND c.deck_id=d.id AND c.is_deleted=0
              )
              AND NOT EXISTS (
                SELECT 1 FROM server_decks child
                WHERE child.user_id=d.user_id
                  AND child.parent_deck_id=d.id
                  AND child.deleted_at IS NULL
              )
            """,
            (user_id, deck_id),
        ).fetchone()
        if row and delete_deck(conn, clock, user_id, deck_id, dry_run):
            deleted += 1
    return deleted


def flatten_normal_tree(
    conn: sqlite3.Connection,
    clock: Timestamp,
    user_id: str,
    dry_run: bool,
) -> dict[str, int]:
    root_names = {root_name for root_name, _domain in SY0_701_ROOT_DECKS.values()}
    root_rows = conn.execute(
        """
        SELECT id
        FROM server_decks
        WHERE user_id=? AND deleted_at IS NULL
        """,
        (user_id,),
    ).fetchall()
    active_ids = {row["id"] for row in root_rows}

    moved_cards = 0
    deleted_decks = 0
    renamed_decks = 0
    rows = get_tree_rows(conn, user_id)
    normal_nested = [
        row for row in rows
        if row["depth"] >= 2
        and not str(row["id"]).startswith("needs-review")
        and row["id"] in active_ids
    ]

    for row in normal_nested:
        parent_id = row["parent_deck_id"]
        if parent_id:
            moved_cards += move_cards(conn, clock, user_id, row["id"], parent_id, dry_run)

    for row in normal_nested:
        if delete_deck(conn, clock, user_id, row["id"], dry_run):
            deleted_decks += 1

    # Any imported SY0-701 deck that remains active should hang directly under
    # its section root, never under an objective subdeck.
    for row in get_tree_rows(conn, user_id):
        if row["depth"] < 1 or str(row["id"]).startswith("needs-review"):
            continue
        if row["id"] in OBJECTIVE_IDS:
            continue
        root = active_deck(conn, user_id, row["root_id"])
        if root and root["name"] in root_names and row["parent_deck_id"] != row["root_id"]:
            if upsert_deck(conn, clock, user_id, row["id"], row["name"], row["root_id"], dry_run):
                renamed_decks += 1

    return {
        "normal_cards_moved": moved_cards,
        "normal_decks_deleted": deleted_decks,
        "normal_decks_reparented": renamed_decks,
    }


def flatten_review_tree(
    conn: sqlite3.Connection,
    clock: Timestamp,
    user_id: str,
    dry_run: bool,
) -> dict[str, int]:
    rows = get_tree_rows(conn, user_id)
    changed_decks = 0
    deleted_decks = 0

    for row in rows:
        deck_id = row["id"]
        if deck_id == REVIEW_ROOT_ID or not str(deck_id).startswith("needs-review"):
            continue
        name = row["name"]
        parent_id = row["parent_deck_id"]

        if deck_id.startswith("needs-review-objective-"):
            target_name = review_objective_name(deck_id, name)
        elif deck_id.startswith("needs-review-leaf-"):
            target_name = clean_review_name(name)
        elif deck_id.startswith("needs-review-other-"):
            target_name = name if str(name).startswith("Other - ") else f"Other - {name}"
        elif deck_id == REVIEW_OTHER_ID:
            target_name = REVIEW_OTHER_NAME
        else:
            target_name = name

        if parent_id != REVIEW_ROOT_ID or target_name != name:
            if upsert_deck(conn, clock, user_id, deck_id, target_name, REVIEW_ROOT_ID, dry_run):
                changed_decks += 1

    removable = {
        row["id"]
        for row in get_tree_rows(conn, user_id)
        if row["id"] == REVIEW_OTHER_ID or str(row["id"]).startswith("needs-review-section-")
    }
    deleted_decks += delete_empty_decks(conn, clock, user_id, removable, dry_run)

    return {
        "review_decks_flattened": changed_decks,
        "review_empty_containers_deleted": deleted_decks,
    }


def max_depth(conn: sqlite3.Connection, user_id: str) -> int:
    row = conn.execute(
        """
        WITH RECURSIVE tree(id, parent_deck_id, depth) AS (
          SELECT id, parent_deck_id, 0
          FROM server_decks
          WHERE user_id=? AND deleted_at IS NULL
            AND (parent_deck_id IS NULL OR parent_deck_id='')
          UNION ALL
          SELECT d.id, d.parent_deck_id, tree.depth + 1
          FROM server_decks d
          JOIN tree ON d.parent_deck_id = tree.id
          WHERE d.user_id=? AND d.deleted_at IS NULL
        )
        SELECT MAX(depth) FROM tree
        """,
        (user_id, user_id),
    ).fetchone()
    return int(row[0] or 0)


def subdecks_with_children(conn: sqlite3.Connection, user_id: str) -> int:
    return int(
        conn.execute(
            """
            SELECT COUNT(*)
            FROM server_decks parent
            JOIN server_decks child
              ON child.parent_deck_id=parent.id AND child.user_id=parent.user_id
            WHERE parent.user_id=?
              AND parent.deleted_at IS NULL
              AND child.deleted_at IS NULL
              AND parent.parent_deck_id IS NOT NULL
              AND parent.parent_deck_id <> ''
            """,
            (user_id,),
        ).fetchone()[0]
        or 0
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--user-id", default=None)
    args = parser.parse_args()

    conn = open_db(sqlite3.Row)
    user_id = args.user_id or get_default_profile_id(conn) or ""
    if not user_id:
        raise SystemExit("Kein User/Profile gefunden.")

    clock = Timestamp(conn, user_id)
    stats = {
        "normal_cards_moved": 0,
        "normal_decks_deleted": 0,
        "normal_decks_reparented": 0,
        "review_decks_flattened": 0,
        "review_empty_containers_deleted": 0,
    }

    for _ in range(5):
        current = {
            **flatten_normal_tree(conn, clock, user_id, args.dry_run),
            **flatten_review_tree(conn, clock, user_id, args.dry_run),
        }
        for key, value in current.items():
            stats[key] += value
        if args.dry_run:
            break
        if max_depth(conn, user_id) <= 1 and subdecks_with_children(conn, user_id) == 0:
            break

    if not args.dry_run:
        conn.commit()

    stats["max_depth"] = max_depth(conn, user_id)
    stats["subdecks_with_children"] = subdecks_with_children(conn, user_id)
    conn.close()

    for key, value in stats.items():
        print(f"{key}={value}")
    if args.dry_run:
        print("[dry-run] Keine Änderungen gespeichert.")


if __name__ == "__main__":
    main()
