"""Canonical Vlad card catalog with per-user study references.

The catalog owns learner-visible authoring content exactly once per card ID.
Rows in ``server_cards`` remain per-user scheduling/reference records; when the
catalog is enabled their legacy authoring columns are deliberately unused.
"""
from __future__ import annotations

import json
import time
from typing import Any


CANONICAL_PROFILE_NAME = "Vlad"
CATALOG_GATEWAY_CLIENT = "security-card-review-gateway-v1"

CATALOG_AUTHORING_FIELDS = (
  "noteId",
  "deckId",
  "front",
  "back",
  "tags",
  "extra",
)


def canonical_owner_id(conn) -> str | None:
  rows = conn.execute(
    "SELECT user_id FROM users WHERE LOWER(TRIM(COALESCE(profile_name, '')))=LOWER(?)",
    (CANONICAL_PROFILE_NAME,),
  ).fetchall()
  return str(rows[0][0]) if len(rows) == 1 else None


def catalog_enabled(conn) -> bool:
  row = conn.execute(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='shared_card_catalog'"
  ).fetchone()
  if not row:
    return False
  return conn.execute("SELECT 1 FROM shared_card_catalog LIMIT 1").fetchone() is not None


def is_canonical_owner(conn, user_id: str | None) -> bool:
  owner_id = canonical_owner_id(conn)
  return bool(owner_id and str(user_id or "") == owner_id)


def decode_json(value: Any, fallback: Any) -> Any:
  if value is None:
    return fallback
  if not isinstance(value, str):
    return value
  try:
    parsed = json.loads(value)
  except Exception:
    return fallback
  return parsed if parsed is not None else fallback


def catalog_row(conn, card_id: str):
  return conn.execute(
    """SELECT id, canonical_user_id, note_id, deck_id, front, back,
              tags_json, extra_json, created_at, updated_at, deleted_at,
              last_source_client
       FROM shared_card_catalog WHERE id=?""",
    (str(card_id),),
  ).fetchone()


def catalog_content_from_row(row) -> dict[str, Any] | None:
  if not row:
    return None
  return {
    "noteId": row["note_id"],
    "deckId": row["deck_id"],
    "front": row["front"],
    "back": row["back"],
    "tags": decode_json(row["tags_json"], []),
    "extra": decode_json(row["extra_json"], {}),
  }


def catalog_content(conn, card_id: str) -> dict[str, Any] | None:
  return catalog_content_from_row(catalog_row(conn, card_id))


def upsert_catalog_content(
  conn,
  *,
  card_id: str,
  canonical_user_id: str,
  content: dict[str, Any],
  updated_at: int,
  source_client: str | None,
  created_at: int | None = None,
  deleted_at: int | None = None,
) -> None:
  tags_json = json.dumps(content.get("tags", []), ensure_ascii=False)
  extra_json = json.dumps(content.get("extra", {}), ensure_ascii=False)
  conn.execute(
    """INSERT INTO shared_card_catalog
       (id, canonical_user_id, note_id, deck_id, front, back, tags_json,
        extra_json, created_at, updated_at, deleted_at, last_source_client)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         canonical_user_id=excluded.canonical_user_id,
         note_id=excluded.note_id,
         deck_id=excluded.deck_id,
         front=excluded.front,
         back=excluded.back,
         tags_json=excluded.tags_json,
         extra_json=excluded.extra_json,
         updated_at=excluded.updated_at,
         deleted_at=excluded.deleted_at,
         last_source_client=excluded.last_source_client""",
    (
      str(card_id),
      str(canonical_user_id),
      content.get("noteId"),
      content.get("deckId"),
      content.get("front"),
      content.get("back"),
      tags_json,
      extra_json,
      int(created_at or updated_at),
      int(updated_at),
      deleted_at,
      source_client,
    ),
  )


def ensure_user_card_references(conn, user_id: str) -> int:
  """Default a user to every active canonical card without copying content."""
  if not user_id or not catalog_enabled(conn):
    return 0
  now_ms = int(time.time() * 1000)
  due_day = int(now_ms // 86_400_000)
  before = conn.total_changes
  conn.execute(
    """INSERT INTO server_cards
       (id, note_id, deck_id, front, back, tags_json, extra_json,
        type, queue, due, due_at, learning_step, last_reviewed_at,
        interval, factor, stability, difficulty, retrievability, reps,
        lapses, algorithm, metadata_json, is_deleted, created_at,
        updated_at, deleted_at, last_source_client, user_id)
       SELECT c.id, NULL, c.deck_id, NULL, NULL, NULL, NULL,
              0, 0, ?, ?, NULL, NULL,
              0, 2500, NULL, NULL, NULL, 0,
              0, 'sm2', NULL, 0, ?, ?, NULL,
              'shared-card-catalog-default', ?
       FROM shared_card_catalog c
       WHERE c.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM server_cards r
           WHERE r.user_id=? AND r.id=c.id
         )""",
    (due_day, due_day * 86_400_000, now_ms, now_ms, user_id, user_id),
  )
  return conn.total_changes - before


def normalize_reference_rows(conn) -> dict[str, int]:
  """Remove copied authoring content while preserving all per-user state."""
  if not catalog_enabled(conn):
    return {"referencesNormalized": 0, "unknownReferencesDisabled": 0}

  before = conn.total_changes
  conn.execute(
    """UPDATE server_cards
       SET note_id=NULL,
           deck_id=(SELECT c.deck_id FROM shared_card_catalog c WHERE c.id=server_cards.id),
           front=NULL,
           back=NULL,
           tags_json=NULL,
           extra_json=NULL
       WHERE EXISTS (SELECT 1 FROM shared_card_catalog c WHERE c.id=server_cards.id)
         AND (note_id IS NOT NULL OR front IS NOT NULL OR back IS NOT NULL
              OR tags_json IS NOT NULL OR extra_json IS NOT NULL
              OR deck_id IS NOT (SELECT c.deck_id FROM shared_card_catalog c WHERE c.id=server_cards.id))"""
  )
  normalized = conn.total_changes - before

  before_unknown = conn.total_changes
  conn.execute(
    """UPDATE server_cards
       SET is_deleted=1,
           deleted_at=COALESCE(deleted_at, updated_at)
       WHERE NOT EXISTS (SELECT 1 FROM shared_card_catalog c WHERE c.id=server_cards.id)
         AND (deleted_at IS NULL OR IFNULL(is_deleted, 0)=0)"""
  )
  return {
    "referencesNormalized": normalized,
    "unknownReferencesDisabled": conn.total_changes - before_unknown,
  }


def active_reference_count(conn, user_id: str) -> int:
  if not catalog_enabled(conn):
    return int(conn.execute(
      """SELECT COUNT(*) FROM server_cards
         WHERE user_id=? AND deleted_at IS NULL AND IFNULL(is_deleted, 0)=0""",
      (user_id,),
    ).fetchone()[0])
  return int(conn.execute(
    """SELECT COUNT(*)
       FROM server_cards r
       JOIN shared_card_catalog c ON c.id=r.id AND c.deleted_at IS NULL
       WHERE r.user_id=? AND r.deleted_at IS NULL AND IFNULL(r.is_deleted, 0)=0""",
    (user_id,),
  ).fetchone()[0])
