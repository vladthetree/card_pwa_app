#!/usr/bin/env python3
"""
Move review-needed cards into a dedicated review deck hierarchy.

Normal SY0-701 decks should contain only usable cards. Cards tagged
needs_review, plus legacy manual/temporary decks, are moved below
99_Needs_Review while preserving their section/objective context.
"""

from __future__ import annotations

import argparse
import json
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
    security_objective_deck_name,
)

SOURCE_CLIENT = "organize_needs_review"
REVIEW_ROOT_ID = "needs-review-root"
REVIEW_ROOT_NAME = "99_Needs_Review"
REVIEW_OTHER_ID = "needs-review-other"
REVIEW_OTHER_NAME = "Other"
MESSER_PREFIX = "Professor Messer CompTIA Security+ SY0-701 v1.1 Free Video Course"
LEGACY_REVIEW_DECK_NAMES = {
    "! 0 MANUALLY STUDY": "Manual Study",
    "decks::! 1 sec+ own": "Sec+ Own",
    "decks::! 3 BABAPRO": "BABAPRO",
}

OBJECTIVE_TITLES = {code: title for code, title, _root_name in SY0_701_OBJECTIVES}
SECTION_DISPLAY_NAMES = {
    section: f"Review Section {section} - {domain}"
    for section, (_root_name, domain) in SY0_701_ROOT_DECKS.items()
}


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


def parse_tags(raw: str | None) -> list[str]:
    try:
        parsed = json.loads(raw or "[]")
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return []


def active_deck_exists(conn: sqlite3.Connection, deck_id: str, user_id: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM server_decks WHERE id=? AND user_id=? AND deleted_at IS NULL",
        (deck_id, user_id),
    ).fetchone()
    return row is not None


def review_objective_name(objective: str) -> str:
    return f"Review {security_objective_deck_name(objective, OBJECTIVE_TITLES[objective])}"


def review_leaf_name(leaf_segment: str) -> str:
    return leaf_segment if leaf_segment.startswith("Review ") else f"Review {leaf_segment}"


def create_deck(
    conn: sqlite3.Connection,
    clock: Timestamp,
    user_id: str,
    deck_id: str,
    name: str,
    parent_id: str | None,
    dry_run: bool,
) -> bool:
    existing = conn.execute(
        """
        SELECT name, parent_deck_id, created_at
        FROM server_decks
        WHERE id=? AND user_id=? AND deleted_at IS NULL
        """,
        (deck_id, user_id),
    ).fetchone()
    if existing:
        if existing["name"] == name and existing["parent_deck_id"] == parent_id:
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
                "createdAt": existing["created_at"] or ts,
                "updatedAt": ts,
                "source": "system",
            },
            client_timestamp=ts,
            source_client=SOURCE_CLIENT,
            user_id=user_id,
        )
        return True
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
            "createdAt": ts,
            "updatedAt": ts,
            "source": "system",
        },
        client_timestamp=ts,
        source_client=SOURCE_CLIENT,
        user_id=user_id,
    )
    return True


def clean_segment(segment: str) -> str:
    segment = segment.strip()
    segment = re.sub(r"^Section\s+[1-5]\s*:\s*", "", segment, flags=re.I)
    segment = re.sub(r"^([1-5]\.\d{1,2}(?:\.\d{1,2})?)\s*:\s*", r"\1 ", segment)
    return re.sub(r"\s+", " ", segment).strip()


def infer_section(deck_name: str) -> str | None:
    match = re.search(r"::Section\s+([1-5])\s*:", deck_name)
    return match.group(1) if match else None


def infer_objective(deck_name: str) -> str | None:
    match = re.search(r"::\s*([1-5])\.(\d{1,2})(?:\.\d{1,2})?\s*:", deck_name)
    if not match:
        return None
    code = f"{match.group(1)}.{int(match.group(2))}"
    return code if code in OBJECTIVE_TITLES else None


def review_deck_for_messer(
    conn: sqlite3.Connection,
    clock: Timestamp,
    user_id: str,
    original_deck_id: str,
    original_deck_name: str,
    dry_run: bool,
) -> str:
    create_deck(conn, clock, user_id, REVIEW_ROOT_ID, REVIEW_ROOT_NAME, None, dry_run)

    section = infer_section(original_deck_name) or "misc"
    objective = infer_objective(original_deck_name)
    if not objective:
        section_id = f"needs-review-section-{section}"
        section_name = SECTION_DISPLAY_NAMES.get(section, "Other")
        create_deck(conn, clock, user_id, section_id, section_name, REVIEW_ROOT_ID, dry_run)
        return section_id

    objective_id = f"needs-review-objective-{objective.replace('.', '-')}"

    parts = original_deck_name.split("::")
    leaf_segment = clean_segment(parts[-1]) if parts else ""
    canonical_objective_name = security_objective_deck_name(objective, OBJECTIVE_TITLES[objective])
    if not leaf_segment or leaf_segment == canonical_objective_name:
        create_deck(
            conn,
            clock,
            user_id,
            objective_id,
            review_objective_name(objective),
            REVIEW_ROOT_ID,
            dry_run,
        )
        return objective_id

    leaf_id = f"needs-review-leaf-{original_deck_id}"
    create_deck(conn, clock, user_id, leaf_id, review_leaf_name(leaf_segment), REVIEW_ROOT_ID, dry_run)
    return leaf_id


def review_deck_for_legacy(
    conn: sqlite3.Connection,
    clock: Timestamp,
    user_id: str,
    original_deck_id: str,
    original_deck_name: str,
    dry_run: bool,
) -> str:
    create_deck(conn, clock, user_id, REVIEW_ROOT_ID, REVIEW_ROOT_NAME, None, dry_run)
    leaf_id = f"needs-review-other-{original_deck_id}"
    leaf_name = LEGACY_REVIEW_DECK_NAMES.get(original_deck_name, original_deck_name)
    create_deck(conn, clock, user_id, leaf_id, f"Other - {leaf_name}", REVIEW_ROOT_ID, dry_run)
    return leaf_id


def repair_review_hierarchy(
    conn: sqlite3.Connection,
    clock: Timestamp,
    user_id: str,
    dry_run: bool,
) -> int:
    has_review_tree = conn.execute(
        """
        SELECT 1
        FROM server_decks
        WHERE user_id=? AND deleted_at IS NULL AND id LIKE 'needs-review%'
        LIMIT 1
        """,
        (user_id,),
    ).fetchone()
    if not has_review_tree:
        return 0

    repaired = 0
    repaired += int(create_deck(conn, clock, user_id, REVIEW_ROOT_ID, REVIEW_ROOT_NAME, None, dry_run))

    section_rows = conn.execute(
        """
        SELECT id, name
        FROM server_decks
        WHERE user_id=? AND deleted_at IS NULL AND id LIKE 'needs-review-section-%'
        ORDER BY id
        """,
        (user_id,),
    ).fetchall()
    for row in section_rows:
        section = str(row["id"]).rsplit("-", 1)[-1]
        section_name = SECTION_DISPLAY_NAMES.get(section, f"Review Section {section}")
        repaired += int(create_deck(conn, clock, user_id, row["id"], section_name, REVIEW_ROOT_ID, dry_run))

    objective_rows = conn.execute(
        """
        SELECT id
        FROM server_decks
        WHERE user_id=? AND deleted_at IS NULL AND id LIKE 'needs-review-objective-%'
        ORDER BY id
        """,
        (user_id,),
    ).fetchall()
    for row in objective_rows:
        match = re.match(r"needs-review-objective-([1-5])-([0-9]+)$", row["id"])
        if not match:
            continue
        objective = f"{match.group(1)}.{int(match.group(2))}"
        if objective not in OBJECTIVE_TITLES:
            continue
        repaired += int(create_deck(conn, clock, user_id, row["id"], review_objective_name(objective), REVIEW_ROOT_ID, dry_run))

    leaf_rows = conn.execute(
        """
        SELECT id, name
        FROM server_decks
        WHERE user_id=? AND deleted_at IS NULL AND id LIKE 'needs-review-leaf-%'
        ORDER BY id
        """,
        (user_id,),
    ).fetchall()
    for row in leaf_rows:
        repaired += int(create_deck(conn, clock, user_id, row["id"], review_leaf_name(row["name"]), REVIEW_ROOT_ID, dry_run))

    other_leaf_rows = conn.execute(
        """
        SELECT id, name
        FROM server_decks
        WHERE user_id=? AND deleted_at IS NULL AND id LIKE 'needs-review-other-%'
        ORDER BY id
        """,
        (user_id,),
    ).fetchall()
    for row in other_leaf_rows:
        name = row["name"] if str(row["name"]).startswith("Other - ") else f"Other - {row['name']}"
        repaired += int(create_deck(conn, clock, user_id, row["id"], name, REVIEW_ROOT_ID, dry_run))

    if active_deck_exists(conn, REVIEW_OTHER_ID, user_id):
        repaired += int(create_deck(conn, clock, user_id, REVIEW_OTHER_ID, REVIEW_OTHER_NAME, REVIEW_ROOT_ID, dry_run))

    return repaired


def move_card(
    conn: sqlite3.Connection,
    clock: Timestamp,
    user_id: str,
    card_id: str,
    target_deck_id: str,
    tags: list[str],
    dry_run: bool,
) -> None:
    if "needs_review" not in tags:
        tags.append("needs_review")
    if dry_run:
        return
    ts = clock.next()
    apply_operation(
        conn,
        "card.update",
        {"cardId": card_id, "updates": {"deckId": target_deck_id, "tags": tags}},
        client_timestamp=ts,
        source_client=SOURCE_CLIENT,
        user_id=user_id,
    )


def delete_deck(
    conn: sqlite3.Connection,
    clock: Timestamp,
    user_id: str,
    deck_id: str,
    dry_run: bool,
) -> bool:
    if not active_deck_exists(conn, deck_id, user_id):
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


def load_cards_to_move(conn: sqlite3.Connection, user_id: str) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT c.id AS card_id, c.tags_json, d.id AS deck_id, d.name AS deck_name
        FROM server_cards c
        JOIN server_decks d ON d.id = c.deck_id AND d.user_id = c.user_id
        WHERE c.is_deleted = 0
          AND c.user_id = ?
          AND d.deleted_at IS NULL
          AND d.id NOT LIKE 'needs-review%'
          AND (
            c.tags_json LIKE '%needs_review%'
            OR d.name IN ({legacy_placeholders})
          )
        ORDER BY d.name, c.id
        """.format(legacy_placeholders=",".join("?" for _ in LEGACY_REVIEW_DECK_NAMES)),
        (user_id, *LEGACY_REVIEW_DECK_NAMES.keys()),
    ).fetchall()


def delete_empty_source_decks(conn: sqlite3.Connection, clock: Timestamp, user_id: str, dry_run: bool) -> int:
    rows = conn.execute(
        """
        SELECT d.id
        FROM server_decks d
        WHERE d.user_id = ?
          AND d.deleted_at IS NULL
          AND d.name LIKE ?
          AND NOT EXISTS (
            SELECT 1 FROM server_cards c
            WHERE c.user_id = d.user_id AND c.deck_id = d.id AND c.is_deleted = 0
          )
          AND NOT EXISTS (
            SELECT 1 FROM server_decks child
            WHERE child.user_id = d.user_id
              AND child.parent_deck_id = d.id
              AND child.deleted_at IS NULL
          )
        ORDER BY d.name
        """,
        (user_id, f"{MESSER_PREFIX}::%"),
    ).fetchall()
    deleted = 0
    for row in rows:
        if delete_deck(conn, clock, user_id, row[0], dry_run):
            deleted += 1
    return deleted


def summarize(conn: sqlite3.Connection, user_id: str) -> dict:
    needs_outside = conn.execute(
        """
        SELECT COUNT(*)
        FROM server_cards c
        JOIN server_decks d ON d.id = c.deck_id AND d.user_id = c.user_id
        WHERE c.is_deleted = 0
          AND c.user_id = ?
          AND c.tags_json LIKE '%needs_review%'
          AND d.id NOT IN (
            SELECT id FROM server_decks
            WHERE user_id = ? AND (id = ? OR parent_deck_id LIKE 'needs-review%')
          )
          AND d.id != ?
        """,
        (user_id, user_id, REVIEW_ROOT_ID, REVIEW_ROOT_ID),
    ).fetchone()[0]
    legacy_active = conn.execute(
        """
        SELECT COUNT(*)
        FROM server_decks
        WHERE user_id = ? AND deleted_at IS NULL
          AND (name LIKE '!%' OR name LIKE 'decks::!%')
        """,
        (user_id,),
    ).fetchone()[0]
    return {"needs_review_outside_review_tree": needs_outside, "legacy_active_decks": legacy_active}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--user-id", default=None)
    args = parser.parse_args()

    conn = open_db(sqlite3.Row)
    user_id = args.user_id or get_default_profile_id(conn) or ""
    clock = Timestamp(conn, user_id)

    repaired_review_decks = repair_review_hierarchy(conn, clock, user_id, args.dry_run)

    rows = load_cards_to_move(conn, user_id)
    target_cache: dict[str, str] = {}
    moved = 0
    for row in rows:
        deck_id = row["deck_id"]
        deck_name = row["deck_name"]
        if deck_id not in target_cache:
            if deck_name.startswith(f"{MESSER_PREFIX}::"):
                target_cache[deck_id] = review_deck_for_messer(
                    conn, clock, user_id, deck_id, deck_name, args.dry_run
                )
            else:
                target_cache[deck_id] = review_deck_for_legacy(
                    conn, clock, user_id, deck_id, deck_name, args.dry_run
                )

        move_card(
            conn,
            clock,
            user_id,
            row["card_id"],
            target_cache[deck_id],
            parse_tags(row["tags_json"]),
            args.dry_run,
        )
        moved += 1

    deleted_legacy = 0
    for deck_name in LEGACY_REVIEW_DECK_NAMES:
        row = conn.execute(
            "SELECT id FROM server_decks WHERE user_id=? AND name=? AND deleted_at IS NULL",
            (user_id, deck_name),
        ).fetchone()
        if row and delete_deck(conn, clock, user_id, row["id"], args.dry_run):
            deleted_legacy += 1

    deleted_empty = delete_empty_source_decks(conn, clock, user_id, args.dry_run)
    if not args.dry_run:
        conn.commit()

    summary = summarize(conn, user_id)
    conn.close()

    print(f"cards_moved={moved}")
    print(f"review_decks_repaired={repaired_review_decks}")
    print(f"legacy_decks_deleted={deleted_legacy}")
    print(f"empty_source_decks_deleted={deleted_empty}")
    print(f"needs_review_outside_review_tree={summary['needs_review_outside_review_tree']}")
    print(f"legacy_active_decks={summary['legacy_active_decks']}")
    if args.dry_run:
        print("[dry-run] Keine Änderungen gespeichert.")


if __name__ == "__main__":
    main()
