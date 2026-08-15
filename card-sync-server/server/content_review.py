"""Review-before-publish boundary for shared Security+ card content.

Client scheduling data may keep syncing normally.  Authoring changes for the
Vlad profile are stored as review proposals and cannot replace the last
reviewed card until the review gateway publishes a decision.
"""
from __future__ import annotations

import hashlib
import json
import time
from typing import Any

from server.domain.card_catalog import (
  catalog_content_from_row,
  catalog_enabled,
  catalog_row,
  is_canonical_owner,
)


REVIEWED_PROFILE_NAME = "Vlad"
GATEWAY_SOURCE = "server-maintenance-publish"
GATEWAY_SOURCE_CLIENT = "security-card-review-gateway-v1"

# These fields can change what a learner is asked, what is considered correct,
# how the answer is explained, or where the card appears.
AUTHORING_FIELDS = (
  "noteId",
  "deckId",
  "front",
  "back",
  "tags",
  "extra",
)

_DB_FIELD_BY_API_FIELD = {
  "noteId": "note_id",
  "deckId": "deck_id",
  "front": "front",
  "back": "back",
  "tags": "tags_json",
  "extra": "extra_json",
}


def canonical_content(content: dict[str, Any]) -> dict[str, Any]:
  """Return stable authoring content suitable for hashing and decisions."""
  result: dict[str, Any] = {}
  for field in AUTHORING_FIELDS:
    value = content.get(field)
    if field in ("tags", "extra") and isinstance(value, str):
      try:
        value = json.loads(value)
      except Exception:
        pass
    result[field] = value
  return result


def content_hash(content: dict[str, Any]) -> str:
  encoded = json.dumps(
    canonical_content(content),
    ensure_ascii=False,
    sort_keys=True,
    separators=(",", ":"),
  ).encode("utf-8")
  return hashlib.sha256(encoded).hexdigest()


def is_reviewed_profile(conn, user_id: str) -> bool:
  row = conn.execute(
    "SELECT profile_name FROM users WHERE user_id=?",
    (user_id,),
  ).fetchone()
  if not row:
    return False
  name = row[0] if not hasattr(row, "keys") else row["profile_name"]
  return str(name or "").strip().casefold() == REVIEWED_PROFILE_NAME.casefold()


def _decode_json(value: Any, fallback: Any) -> Any:
  if value is None:
    return fallback
  if not isinstance(value, str):
    return value
  try:
    return json.loads(value)
  except Exception:
    return fallback


def reviewed_content_from_row(row) -> dict[str, Any]:
  """Map a server_cards sqlite row/tuple-like mapping to API field names."""
  return {
    "noteId": row["note_id"],
    "deckId": row["deck_id"],
    "front": row["front"],
    "back": row["back"],
    "tags": _decode_json(row["tags_json"], []),
    "extra": _decode_json(row["extra_json"], {}),
  }


def _load_card_content(conn, user_id: str, card_id: str):
  if catalog_enabled(conn):
    return catalog_row(conn, card_id)
  return conn.execute(
    """SELECT note_id, deck_id, front, back, tags_json, extra_json
       FROM server_cards
       WHERE user_id=? AND id=? AND deleted_at IS NULL AND IFNULL(is_deleted, 0)=0""",
    (user_id, card_id),
  ).fetchone()


def _queue_proposal(
  conn,
  *,
  user_id: str,
  card_id: str,
  op_id: str | None,
  operation_type: str,
  proposed_content: dict[str, Any],
  source_client: str | None,
  deleted: bool = False,
) -> tuple[bool, str]:
  proposal = {
    "cardId": card_id,
    "operationType": operation_type,
    "content": canonical_content(proposed_content),
    "deleted": bool(deleted),
    "sourceClient": source_client,
  }
  proposal_hash = content_hash(proposal["content"])
  if proposal["deleted"]:
    proposal_hash = hashlib.sha256(f"delete:{proposal_hash}".encode("ascii")).hexdigest()
  before = conn.total_changes
  conn.execute(
    """INSERT OR IGNORE INTO content_review_queue
       (user_id, card_id, op_id, operation_type, content_hash,
        proposal_json, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)""",
    (
      user_id,
      card_id,
      op_id,
      operation_type,
      proposal_hash,
      json.dumps(proposal, ensure_ascii=False, sort_keys=True),
      int(time.time()),
    ),
  )
  return conn.total_changes > before, proposal_hash


def gate_sync_card_operation(
  conn,
  *,
  user_id: str,
  op_type: str,
  payload: dict[str, Any],
  op_id: str | None,
  source_client: str | None,
) -> tuple[str, dict[str, Any], bool]:
  """Gate an untrusted HTTP sync operation.

  The returned operation is safe to put in sync_operations and apply.  When a
  proposal is queued, authoring fields are removed/replaced but scheduling
  fields remain eligible for the normal conflict-resolution path.
  """
  if not op_type.startswith("card."):
    return op_type, payload, False

  if op_type not in ("card.create", "card.update", "card.delete"):
    return op_type, payload, False

  card_id = str(payload.get("id") or payload.get("cardId") or "").strip()
  if not card_id:
    return op_type, payload, False

  # Once the shared catalog exists, non-canonical profiles may only create,
  # update, or delete their reference/study state for an existing Vlad card.
  # Learner-provided authoring content never becomes a second card body.
  if catalog_enabled(conn) and not is_canonical_owner(conn, user_id):
    canonical = catalog_row(conn, card_id)
    if not canonical or canonical["deleted_at"] is not None:
      return "card.reference.rejected", {"cardId": card_id}, False
    if op_type == "card.create":
      safe_payload = {
        key: value
        for key, value in payload.items()
        if key not in AUTHORING_FIELDS
      }
      safe_payload["id"] = card_id
      safe_payload["deckId"] = canonical["deck_id"]
      return op_type, safe_payload, False
    if op_type == "card.update":
      updates_key = "updates" if isinstance(payload.get("updates"), dict) else "update"
      updates = {
        key: value
        for key, value in dict(payload.get(updates_key) or {}).items()
        if key not in AUTHORING_FIELDS
      }
      if not [key for key in updates if key != "updatedAt"]:
        return "card.reference.noop", {"cardId": card_id}, False
      safe_payload = dict(payload)
      safe_payload[updates_key] = updates
      return op_type, safe_payload, False
    return op_type, payload, False

  if not is_reviewed_profile(conn, user_id):
    return op_type, payload, False

  existing_row = _load_card_content(conn, user_id, card_id)
  existing = (
    catalog_content_from_row(existing_row)
    if catalog_enabled(conn)
    else reviewed_content_from_row(existing_row)
  ) if existing_row else None

  if op_type == "card.delete":
    if not existing:
      return op_type, payload, False
    _queue_proposal(
      conn,
      user_id=user_id,
      card_id=card_id,
      op_id=op_id,
      operation_type=op_type,
      proposed_content=existing,
      source_client=source_client,
      deleted=True,
    )
    return "content.review.proposed", {"cardId": card_id}, True

  if op_type == "card.create":
    proposed = canonical_content(payload)
    if not existing:
      _queue_proposal(
        conn,
        user_id=user_id,
        card_id=card_id,
        op_id=op_id,
        operation_type=op_type,
        proposed_content=proposed,
        source_client=source_client,
      )
      return "content.review.proposed", {"cardId": card_id}, True
    if content_hash(proposed) == content_hash(existing):
      return op_type, payload, False
    _queue_proposal(
      conn,
      user_id=user_id,
      card_id=card_id,
      op_id=op_id,
      operation_type=op_type,
      proposed_content=proposed,
      source_client=source_client,
    )
    safe_payload = dict(payload)
    safe_payload.update(existing)
    return op_type, safe_payload, True

  # card.update: only queue when an authoring field would actually differ.
  updates_key = "updates" if isinstance(payload.get("updates"), dict) else "update"
  updates = dict(payload.get(updates_key) or {})
  proposed = dict(existing or {})
  changed_fields = []
  for field in AUTHORING_FIELDS:
    if field not in updates:
      continue
    proposed[field] = updates[field]
    if not existing or canonical_content(proposed)[field] != canonical_content(existing)[field]:
      changed_fields.append(field)
  if not changed_fields:
    return op_type, payload, False

  _queue_proposal(
    conn,
    user_id=user_id,
    card_id=card_id,
    op_id=op_id,
    operation_type=op_type,
    proposed_content=proposed,
    source_client=source_client,
  )
  for field in AUTHORING_FIELDS:
    updates.pop(field, None)
  safe_payload = dict(payload)
  safe_payload[updates_key] = updates
  meaningful_updates = [key for key in updates if key != "updatedAt"]
  if not meaningful_updates:
    return "content.review.proposed", {"cardId": card_id}, True
  return op_type, safe_payload, True


def gate_bootstrap_card(
  conn,
  *,
  user_id: str,
  card: dict[str, Any],
  batch_id: str,
  source_client: str,
) -> tuple[dict[str, Any] | None, bool]:
  """Protect reviewed content during bootstrap while retaining study state."""
  card_id = str(card.get("id") or "").strip()
  if not card_id:
    return card, False

  if catalog_enabled(conn) and not is_canonical_owner(conn, user_id):
    canonical = catalog_row(conn, card_id)
    if not canonical or canonical["deleted_at"] is not None:
      return None, False
    safe_card = {
      key: value
      for key, value in card.items()
      if key not in AUTHORING_FIELDS
    }
    safe_card["id"] = card_id
    safe_card["deckId"] = canonical["deck_id"]
    return safe_card, False

  if not is_reviewed_profile(conn, user_id):
    return card, False

  existing_row = _load_card_content(conn, user_id, card_id)
  existing = (
    catalog_content_from_row(existing_row)
    if catalog_enabled(conn)
    else reviewed_content_from_row(existing_row)
  ) if existing_row else None
  proposed = canonical_content(card)
  deleted = bool(card.get("isDeleted") or card.get("deletedAt") is not None)

  if existing and not deleted and content_hash(proposed) == content_hash(existing):
    return card, False

  _queue_proposal(
    conn,
    user_id=user_id,
    card_id=card_id,
    op_id=f"bootstrap:{batch_id}:{card_id}",
    operation_type="bootstrap.card",
    proposed_content=proposed if not deleted else (existing or proposed),
    source_client=source_client,
    deleted=deleted,
  )
  if not existing:
    # A new shared learning card is not published until it has been reviewed.
    return None, True

  safe_card = dict(card)
  safe_card.update(existing)
  safe_card["isDeleted"] = False
  safe_card["deletedAt"] = None
  return safe_card, True
