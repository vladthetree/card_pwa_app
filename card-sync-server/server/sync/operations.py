"""Sync operation engine: applies a single client operation to server state
using last-write-wins / card-reps conflict resolution.

Depends on the domain layer (deck hierarchy) but never on the DB-bootstrap or
HTTP layers, so it is reused by both request handling and full rebuild.
"""
import json
import sqlite3
import time

from server.config import LOGGER
from server.common.helpers import now_ms, to_int_or_default as _to_int_or_default
from server.db.profile_scope import scope_user_id
from server.domain.card_catalog import (
  CATALOG_GATEWAY_CLIENT,
  catalog_content_from_row,
  catalog_enabled,
  catalog_row,
  canonical_owner_id,
  is_canonical_owner,
  upsert_catalog_content,
)
from server.domain.decks import ensure_security_deck_hierarchy


def _push_detail(op_type, payload):
  """One-line summary of what a push operation touches."""
  p = payload or {}
  if op_type == "deck.create":
    return f"deck={p.get('id','')}  name={p.get('name','')!r}"
  if op_type == "deck.delete":
    return f"deck={p.get('deckId','')}"
  if op_type == "card.create":
    front = str(p.get('front') or '')[:50]
    return f"card={p.get('id','')}  deck={p.get('deckId','')}  front={front!r}"
  if op_type in ("card.update", "card.schedule.forceTomorrow"):
    upd = p.get('updates') or p.get('update') or {}
    fields = ','.join(k for k in upd if k != 'updatedAt') or '(none)'
    return f"card={p.get('cardId','')}  fields={fields}"
  if op_type == "card.delete":
    return f"card={p.get('cardId','')}"
  if op_type in ("review", "review.undo"):
    return f"card={p.get('cardId','')}"
  if op_type == "shuffleCollection.upsert":
    deck_ids = p.get("deckIds") or []
    return f"collection={p.get('id','')}  decks={len(deck_ids)}  name={p.get('name','')!r}"
  if op_type == "shuffleCollection.delete":
    return f"collection={p.get('id','')}"
  if op_type == "videoNote.upsert":
    return f"profile={p.get('profileId') or p.get('profile_id') or ''}  objective={p.get('objective','')}"
  if op_type == "videoNote.delete":
    return f"profile={p.get('profileId') or p.get('profile_id') or ''}  objective={p.get('objective','')}"
  if op_type == "examDate.upsert":
    return f"examDateIso={p.get('examDateIso')!r}"
  return ""

def _prepare_payload_for_storage(op_type, payload, client_timestamp):
  """Normalize payload before persisting to sync_operations."""
  p = dict(payload) if isinstance(payload, dict) else {}
  if op_type in ("deck.delete", "card.delete", "videoNote.delete") and p.get("deletedAt") is None:
    p["deletedAt"] = client_timestamp or now_ms()
  return p

def lww_should_apply(existing_ts, existing_source_client, candidate_ts, candidate_source_client):
  """Return True when candidate should overwrite existing under LWW + source tie-break."""
  if existing_ts is None:
    return True
  if existing_ts > candidate_ts:
    return False
  if existing_ts < candidate_ts:
    return True
  # Equal timestamps: lexicographically larger source_client wins.
  if (existing_source_client or "") >= (candidate_source_client or ""):
    return False
  return True

def card_should_apply(existing_ts, existing_source_client, existing_reps, candidate_ts, candidate_source_client, candidate_reps):
  """
  Card conflict policy: higher reps wins; when reps are equal, fall back to
  LWW timestamp + source-client tiebreak.
  """
  if existing_ts is None:
    return True

  local_reps = _to_int_or_default(existing_reps, 0)
  # If incoming reps is omitted, preserve old behavior for partial updates by
  # treating it as equal and using timestamp fallback.
  if candidate_reps is None:
    incoming_reps = local_reps
  else:
    incoming_reps = _to_int_or_default(candidate_reps, local_reps)

  if incoming_reps > local_reps:
    return True
  if incoming_reps < local_reps:
    return False

  return lww_should_apply(existing_ts, existing_source_client, candidate_ts, candidate_source_client)


def apply_operation(conn, op_type, payload, client_timestamp, source_client, op_id=None, user_id=None):
  """
  Apply an operation to server state (server_cards, server_decks).
  LWW basis: payload.updatedAt > payload.createdAt > payload.timestamp > client_timestamp > now_ms().
  Tie-break: last_source_client lexicographically larger wins.
  user_id: when set, operations are scoped per user; None = legacy single-user mode.
  """
  now = now_ms()
  day_ms = 86_400_000
  state_user_id = scope_user_id(user_id)
  shared_catalog = catalog_enabled(conn)
  catalog_owner_id = canonical_owner_id(conn) if shared_catalog else None
  canonical_writer = bool(
    shared_catalog
    and is_canonical_owner(conn, state_user_id)
    and source_client == CATALOG_GATEWAY_CLIENT
  )

  def _to_int_or_none(value):
    try:
      if value is None:
        return None
      return int(float(value))
    except Exception:
      return None

  def _resolve_due_at(due_at_value, due_value):
    due_at = _to_int_or_none(due_at_value)
    if due_at is not None:
      return due_at
    due = _to_int_or_none(due_value)
    if due is None:
      return None
    return max(0, due) * day_ms

  def _deck_candidate_ts():
    # deck.create/delete: prefer updatedAt from payload, then createdAt, then timestamp, then client_ts
    return (
      payload.get("updatedAt")
      or payload.get("deletedAt")
      or payload.get("createdAt")
      or payload.get("timestamp")
      or client_timestamp
      or now
    )

  def _card_candidate_ts():
    # card.create: prefer updatedAt, then createdAt, then timestamp, then client_ts
    return (
      payload.get("updatedAt")
      or payload.get("deletedAt")
      or payload.get("createdAt")
      or payload.get("timestamp")
      or client_timestamp
      or now
    )

  def _update_candidate_ts(updates):
    # card.update: prefer updatedAt inside updates dict, then payload.timestamp, then client_ts
    return (
      updates.get("updatedAt")
      or payload.get("updatedAt")
      or payload.get("timestamp")
      or client_timestamp
      or now
    )

  def _review_candidate_ts(sub):
    # review / review.undo: prefer updatedAt inside the sub-object, then payload.timestamp, then client_ts
    return (
      sub.get("updatedAt")
      or payload.get("updatedAt")
      or payload.get("timestamp")
      or client_timestamp
      or now
    )

  def _shuffle_candidate_ts():
    return (
      payload.get("updatedAt")
      or payload.get("deletedAt")
      or payload.get("createdAt")
      or payload.get("timestamp")
      or client_timestamp
      or now
    )

  def _video_note_candidate_ts():
    return (
      payload.get("updatedAt")
      or payload.get("deletedAt")
      or payload.get("createdAt")
      or payload.get("timestamp")
      or client_timestamp
      or now
    )

  def _normalize_video_note_profile_id():
    raw_profile_id = payload.get("profileId", payload.get("profile_id"))
    if isinstance(raw_profile_id, str) and raw_profile_id.strip():
      return raw_profile_id.strip()
    return state_user_id or "local"

  def _normalize_video_note_tags():
    raw_tags = payload.get("tags")
    if raw_tags is None:
      raw_tags = payload.get("tags_json")
    if isinstance(raw_tags, str):
      try:
        raw_tags = json.loads(raw_tags)
      except Exception:
        raw_tags = []
    if not isinstance(raw_tags, list):
      return []
    result = []
    seen = set()
    for entry in raw_tags:
      tag = str(entry or "").strip()
      key = tag.lower()
      if not tag or key in seen:
        continue
      seen.add(key)
      result.append(tag)
    return result

  def _normalize_parent_deck_id(value):
    if isinstance(value, str):
      stripped = value.strip()
      return stripped or None
    return None

  def _collect_deck_delete_scope(initial_ids):
    rows = conn.execute(
      "SELECT id, parent_deck_id FROM server_decks WHERE user_id=? AND deleted_at IS NULL",
      (state_user_id,),
    ).fetchall()
    children_by_parent = {}
    for row_id, parent_id in rows:
      if not parent_id:
        continue
      children_by_parent.setdefault(parent_id, []).append(row_id)
    result = []
    seen = set()
    stack = [deck_id for deck_id in initial_ids if deck_id]
    while stack:
      current = stack.pop()
      if current in seen:
        continue
      seen.add(current)
      result.append(current)
      stack.extend(children_by_parent.get(current, []))
    return result

  if op_type == "deck.create":
    if shared_catalog and state_user_id != catalog_owner_id:
      return
    deck_id = payload.get("id")
    name = payload.get("name")
    if not deck_id or not name:
      return
    candidate_ts = _deck_candidate_ts()

    existing = conn.execute(
      "SELECT updated_at, last_source_client FROM server_decks WHERE id=? AND user_id=?",
      (deck_id, state_user_id)
    ).fetchone()
    if existing and not lww_should_apply(existing[0], existing[1], candidate_ts, source_client):
      return

    deleted_at = payload.get("deletedAt")
    if deleted_at is None and payload.get("isDeleted"):
      deleted_at = candidate_ts

    parent_deck_id = _normalize_parent_deck_id(payload.get("parentDeckId", payload.get("parent_deck_id")))

    conn.execute("""
      INSERT OR REPLACE INTO server_decks (id, name, parent_deck_id, created_at, source, updated_at, deleted_at, last_source_client, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (deck_id, name, parent_deck_id, payload.get("createdAt") or now, payload.get("source"), candidate_ts, deleted_at, source_client, state_user_id))
    ensure_security_deck_hierarchy(conn, state_user_id)

  elif op_type == "deck.delete":
    if shared_catalog and state_user_id != catalog_owner_id:
      return
    raw_deck_ids = payload.get("deckIds")
    if isinstance(raw_deck_ids, list):
      initial_deck_ids = [str(deck_id).strip() for deck_id in raw_deck_ids if str(deck_id or "").strip()]
    else:
      deck_id = str(payload.get("deckId") or "").strip()
      initial_deck_ids = [deck_id] if deck_id else []
    if not initial_deck_ids:
      return
    candidate_ts = _deck_candidate_ts()
    deleted_at = payload.get("deletedAt") or candidate_ts
    deck_ids = _collect_deck_delete_scope(initial_deck_ids)

    for deck_id in deck_ids:
      existing = conn.execute(
        "SELECT updated_at, last_source_client FROM server_decks WHERE id=? AND user_id=?",
        (deck_id, state_user_id)
      ).fetchone()
      if existing and not lww_should_apply(existing[0], existing[1], candidate_ts, source_client):
        continue

      if existing:
        conn.execute("UPDATE server_decks SET deleted_at=?, updated_at=?, last_source_client=? WHERE id=? AND user_id=?",
                     (deleted_at, candidate_ts, source_client, deck_id, state_user_id))
      else:
        conn.execute(
          """
          INSERT INTO server_decks
          (id, name, parent_deck_id, created_at, source, updated_at, deleted_at, last_source_client, user_id)
          VALUES (?, NULL, NULL, ?, 'delete', ?, ?, ?, ?)
          """,
          (deck_id, candidate_ts, candidate_ts, deleted_at, source_client, state_user_id),
        )
      conn.execute("UPDATE server_cards SET deleted_at=?, is_deleted=1, updated_at=?, last_source_client=? WHERE deck_id=? AND user_id=?",
                   (deleted_at, candidate_ts, source_client, deck_id, state_user_id))

  elif op_type == "card.create":
    card_id = payload.get("id")
    if not card_id:
      return
    candidate_ts = _card_candidate_ts()
    canonical = catalog_row(conn, card_id) if shared_catalog else None
    if shared_catalog and not canonical:
      return

    if canonical_writer:
      upsert_catalog_content(
        conn,
        card_id=card_id,
        canonical_user_id=state_user_id,
        content={
          "noteId": payload.get("noteId"),
          "deckId": payload.get("deckId"),
          "front": payload.get("front"),
          "back": payload.get("back"),
          "tags": payload.get("tags", []),
          "extra": payload.get("extra", {}),
        },
        created_at=payload.get("createdAt") or candidate_ts,
        updated_at=candidate_ts,
        deleted_at=payload.get("deletedAt"),
        source_client=source_client,
      )
      canonical = catalog_row(conn, card_id)

    existing = conn.execute(
      "SELECT updated_at, last_source_client, reps FROM server_cards WHERE id=? AND user_id=?",
      (card_id, state_user_id)
    ).fetchone()
    if existing and not card_should_apply(existing[0], existing[1], existing[2], candidate_ts, source_client, payload.get("reps")):
      return

    tags_json  = None if shared_catalog else (json.dumps(payload.get("tags", []), ensure_ascii=False) if payload.get("tags") is not None else None)
    extra_json = None if shared_catalog else (json.dumps(payload.get("extra", {}), ensure_ascii=False) if payload.get("extra") is not None else None)
    metadata_json = json.dumps(payload.get("metadata"), ensure_ascii=False) if payload.get("metadata") is not None else None
    deleted_at = payload.get("deletedAt")
    is_deleted = 1 if payload.get("isDeleted") or deleted_at is not None else 0
    normalized_due_at = _resolve_due_at(payload.get("dueAt"), payload.get("due"))

    conn.execute("""
      INSERT OR REPLACE INTO server_cards
      (id, note_id, deck_id, front, back, tags_json, extra_json, type, queue, due, due_at, learning_step, last_reviewed_at, interval, factor,
       stability, difficulty, retrievability, reps, lapses, algorithm, metadata_json, is_deleted, created_at, updated_at, deleted_at, last_source_client, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
      card_id,
      None if shared_catalog else payload.get("noteId"),
      canonical["deck_id"] if shared_catalog else payload.get("deckId"),
      None if shared_catalog else payload.get("front"),
      None if shared_catalog else payload.get("back"),
      tags_json, extra_json,
      payload.get("type"), payload.get("queue"), payload.get("due"), normalized_due_at,
      payload.get("learningStep"), payload.get("lastReviewedAt"),
      payload.get("interval"), payload.get("factor"), payload.get("stability"), payload.get("difficulty"), payload.get("retrievability"),
      payload.get("reps"), payload.get("lapses"), payload.get("algorithm"),
      metadata_json, is_deleted,
      payload.get("createdAt") or now, candidate_ts, deleted_at, source_client, state_user_id,
    ))

  elif op_type in ("card.update", "card.schedule.forceTomorrow"):
    card_id = payload.get("cardId")
    updates  = payload.get("updates")
    if not isinstance(updates, dict):
      updates = payload.get("update", {})
    if not card_id or not updates:
      return
    candidate_ts = _update_candidate_ts(updates)
    canonical = catalog_row(conn, card_id) if shared_catalog else None
    if shared_catalog and not canonical:
      return

    if canonical_writer:
      current_content = catalog_content_from_row(canonical) or {}
      next_content = dict(current_content)
      for key in ("noteId", "deckId", "front", "back", "tags", "extra"):
        if key in updates:
          next_content[key] = updates[key]
      upsert_catalog_content(
        conn,
        card_id=card_id,
        canonical_user_id=state_user_id,
        content=next_content,
        created_at=canonical["created_at"],
        updated_at=candidate_ts,
        deleted_at=canonical["deleted_at"],
        source_client=source_client,
      )
      canonical = catalog_row(conn, card_id)

    existing = conn.execute(
      "SELECT updated_at, last_source_client, reps FROM server_cards WHERE id=? AND user_id=?",
      (card_id, state_user_id)
    ).fetchone()
    if existing and not card_should_apply(existing[0], existing[1], existing[2], candidate_ts, source_client, updates.get("reps")):
      return

    fields, params = [], []
    _MAP = {
      "noteId": "note_id", "deckId": "deck_id", "front": "front", "back": "back",
      "type": "type", "queue": "queue", "due": "due", "dueAt": "due_at",
      "learningStep": "learning_step", "lastReviewedAt": "last_reviewed_at",
      "interval": "interval", "factor": "factor", "stability": "stability",
      "difficulty": "difficulty", "retrievability": "retrievability", "reps": "reps", "lapses": "lapses", "algorithm": "algorithm",
    }
    for key, col in _MAP.items():
      if shared_catalog and key in ("noteId", "deckId", "front", "back"):
        continue
      if key in updates:
        fields.append(f"{col}=?")
        params.append(updates[key])
    if "tags" in updates and not shared_catalog:
      fields.append("tags_json=?")
      params.append(json.dumps(updates["tags"], ensure_ascii=False) if updates["tags"] is not None else None)
    if "extra" in updates and not shared_catalog:
      fields.append("extra_json=?")
      params.append(json.dumps(updates["extra"], ensure_ascii=False) if updates["extra"] is not None else None)
    if "metadata" in updates:
      fields.append("metadata_json=?")
      params.append(json.dumps(updates["metadata"], ensure_ascii=False) if updates["metadata"] is not None else None)
    if "isDeleted" in updates:
      is_deleted = 1 if updates.get("isDeleted") else 0
      fields.append("is_deleted=?")
      params.append(is_deleted)
      if "deletedAt" not in updates:
        fields.append("deleted_at=?")
        params.append(candidate_ts if is_deleted else None)
    if "deletedAt" in updates:
      deleted_at = updates.get("deletedAt")
      fields.append("deleted_at=?")
      params.append(deleted_at)
      if "isDeleted" not in updates:
        fields.append("is_deleted=?")
        params.append(1 if deleted_at is not None else 0)

    if fields:
      fields += ["updated_at=?", "last_source_client=?"]
      params  += [candidate_ts, source_client, card_id, state_user_id]
      conn.execute(f"UPDATE server_cards SET {','.join(fields)} WHERE id=? AND user_id=?", params)

      # Backfill due_at when updates omitted it but due is present.
      conn.execute(
        """
        UPDATE server_cards
        SET due_at = CASE
          WHEN due IS NOT NULL THEN max(0, CAST(due AS INTEGER)) * ?
          ELSE due_at
        END
        WHERE id=? AND user_id=? AND due_at IS NULL
        """,
        (day_ms, card_id, state_user_id),
      )

  elif op_type == "card.delete":
    card_id = payload.get("cardId")
    if not card_id:
      return
    candidate_ts = _card_candidate_ts()

    existing = conn.execute(
      "SELECT updated_at, last_source_client, reps FROM server_cards WHERE id=? AND user_id=?",
      (card_id, state_user_id)
    ).fetchone()
    if existing and not card_should_apply(existing[0], existing[1], existing[2], candidate_ts, source_client, payload.get("reps")):
      return

    deleted_at = payload.get("deletedAt") or candidate_ts

    if canonical_writer:
      conn.execute(
        """UPDATE shared_card_catalog
           SET deleted_at=?, updated_at=?, last_source_client=?
           WHERE id=? AND canonical_user_id=?""",
        (deleted_at, candidate_ts, source_client, card_id, catalog_owner_id),
      )
      # A canonical deletion intentionally disables every user's reference,
      # but only after the target is proven to be Vlad's canonical card.
      conn.execute(
        """UPDATE server_cards
           SET deleted_at=?, is_deleted=1, updated_at=?, last_source_client=?
           WHERE id=? AND EXISTS (
             SELECT 1 FROM shared_card_catalog c
             WHERE c.id=server_cards.id AND c.canonical_user_id=?
           )""",
        (deleted_at, candidate_ts, source_client, card_id, catalog_owner_id),
      )
      return

    conn.execute("UPDATE server_cards SET deleted_at=?, is_deleted=1, updated_at=?, last_source_client=? WHERE id=? AND user_id=?",
           (deleted_at, candidate_ts, source_client, card_id, state_user_id))

  elif op_type == "review":
    card_id = payload.get("cardId")
    updated = payload.get("updated", {})
    if not card_id or not updated:
      return
    candidate_ts = _review_candidate_ts(updated)

    existing = conn.execute(
      "SELECT updated_at, last_source_client, reps FROM server_cards WHERE id=? AND user_id=?",
      (card_id, state_user_id)
    ).fetchone()
    if existing and not card_should_apply(existing[0], existing[1], existing[2], candidate_ts, source_client, updated.get("reps")):
      return

    conn.execute("""
      UPDATE server_cards SET
        type=?, queue=?, due=?, due_at=?, learning_step=?, last_reviewed_at=?, interval=?, factor=?, stability=?, difficulty=?, retrievability=?,
        reps=?, lapses=?, algorithm=?, updated_at=?, last_source_client=?
      WHERE id=? AND user_id=?
    """, (
      updated.get("type"), updated.get("queue"), updated.get("due"), updated.get("dueAt"),
      updated.get("learningStep"), updated.get("lastReviewedAt") or payload.get("timestamp"),
      updated.get("interval"), updated.get("factor"), updated.get("stability"), updated.get("difficulty"), updated.get("retrievability"),
      updated.get("reps"), updated.get("lapses"), updated.get("algorithm"),
      candidate_ts, source_client, card_id, state_user_id,
    ))

    rating = _to_int_or_none(payload.get("rating"))
    if rating in (1, 2, 3, 4):
      reviewed_at = _to_int_or_none(payload.get("timestamp")) or candidate_ts
      review_op_id = op_id or f"{source_client or ''}:{card_id}:{reviewed_at}:{rating}"
      # Antwortdetails interaktiver Karten (optional, seit Client-Payload
      # `answer`): gewählte + korrekte Antwort und Richtig/Falsch-Flag.
      answer = payload.get("answer") or {}
      if not isinstance(answer, dict):
        answer = {}
      selected_answer = answer.get("selected") if isinstance(answer.get("selected"), str) else None
      correct_answer = answer.get("correct") if isinstance(answer.get("correct"), str) else None
      was_correct = answer.get("wasCorrect")
      answer_correct = (1 if was_correct else 0) if isinstance(was_correct, bool) else None
      session_run_id = payload.get("sessionRunId")
      if not isinstance(session_run_id, str) or not session_run_id.strip():
        session_run_id = None
      conn.execute(
        """
        INSERT OR IGNORE INTO server_reviews
        (review_op_id, card_id, rating, time_ms, reviewed_at, source_client, created_at, undone_at, user_id,
         selected_answer, correct_answer, answer_correct, session_run_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)
        """,
        (
          review_op_id,
          card_id,
          rating,
          _to_int_or_none(payload.get("timeMs")),
          reviewed_at,
          source_client,
          int(time.time()),
          state_user_id,
          selected_answer,
          correct_answer,
          answer_correct,
          session_run_id,
        )
      )

  elif op_type == "review.undo":
    card_id  = payload.get("cardId")
    restored = payload.get("restored", {})
    if not card_id or not restored:
      return
    candidate_ts = _review_candidate_ts(restored)

    existing = conn.execute(
      "SELECT updated_at, last_source_client FROM server_cards WHERE id=? AND user_id=?",
      (card_id, state_user_id)
    ).fetchone()
    if existing and not lww_should_apply(existing[0], existing[1], candidate_ts, source_client):
      return

    conn.execute("""
      UPDATE server_cards SET
        type=?, queue=?, due=?, due_at=?, learning_step=?, last_reviewed_at=?, interval=?, factor=?, stability=?, difficulty=?, retrievability=?,
        reps=?, lapses=?, algorithm=?, updated_at=?, last_source_client=?
      WHERE id=? AND user_id=?
    """, (
      restored.get("type"), restored.get("queue"), restored.get("due"), restored.get("dueAt"),
      restored.get("learningStep"), restored.get("lastReviewedAt"),
      restored.get("interval"), restored.get("factor"), restored.get("stability"), restored.get("difficulty"), restored.get("retrievability"),
      restored.get("reps"), restored.get("lapses"), restored.get("algorithm"),
      candidate_ts, source_client, card_id, state_user_id,
    ))

    conn.execute(
      """
      UPDATE server_reviews
      SET undone_at=?
      WHERE id = (
        SELECT id FROM server_reviews
        WHERE card_id=? AND user_id=? AND undone_at IS NULL
          AND (source_client=? OR ? IS NULL)
        ORDER BY reviewed_at DESC, id DESC
        LIMIT 1
      )
      """,
      (candidate_ts, card_id, state_user_id, source_client, source_client)
    )

  elif op_type == "progress.reset":
    # Globaler Lernfortschritt-Reset: alle Karten des Users auf "neu", Review-
    # Historie geloescht. Bewusst OHNE die "hoehere reps gewinnen"-Regel
    # (card_should_apply) — die wuerde reps=0 immer verwerfen. Stattdessen LWW
    # pro Karte gegen den Reset-Zeitpunkt: nach dem Reset geschriebene
    # Kartenstaende (spaetere updated_at) bleiben erhalten.
    candidate_ts = payload.get("timestamp") or client_timestamp or now
    ts = _to_int_or_none(candidate_ts) or now
    due_days = _to_int_or_none(payload.get("due"))
    if due_days is None:
      due_days = ts // day_ms
    due_at = _to_int_or_none(payload.get("dueAt"))
    if due_at is None:
      due_at = due_days * day_ms

    conn.execute(
      """
      UPDATE server_cards SET
        type=0, queue=0, due=?, due_at=?, learning_step=0, last_reviewed_at=NULL, interval=0, factor=2500,
        stability=NULL, difficulty=NULL, retrievability=NULL,
        reps=0, lapses=0, updated_at=?, last_source_client=?
      WHERE user_id=? AND is_deleted=0
        AND (updated_at IS NULL OR updated_at <= ?)
      """,
      (due_days, due_at, ts, source_client, state_user_id, ts)
    )
    conn.execute(
      "DELETE FROM server_reviews WHERE user_id=? AND reviewed_at <= ?",
      (state_user_id, ts)
    )

  elif op_type == "shuffleCollection.upsert":
    collection_id = payload.get("id")
    name = payload.get("name")
    deck_ids = payload.get("deckIds")
    if not collection_id or not name or not isinstance(deck_ids, list):
      LOGGER.warning(
        "SHUFFLE_COLLECTION_REJECTED op_id=%s reason=invalid_payload collection_id=%s has_name=%s deck_ids_type=%s",
        op_id,
        collection_id,
        bool(name),
        type(deck_ids).__name__,
      )
      return
    candidate_ts = _shuffle_candidate_ts()

    existing = conn.execute(
      "SELECT updated_at, last_source_client FROM server_shuffle_collections WHERE id=? AND user_id=?",
      (collection_id, state_user_id)
    ).fetchone()
    if existing and not lww_should_apply(existing[0], existing[1], candidate_ts, source_client):
      return

    deleted_at = payload.get("deletedAt")
    if deleted_at is None and payload.get("isDeleted"):
      deleted_at = candidate_ts

    conn.execute("""
      INSERT OR REPLACE INTO server_shuffle_collections
      (id, name, deck_ids_json, created_at, updated_at, deleted_at, last_source_client, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
      collection_id,
      name,
      json.dumps(deck_ids, ensure_ascii=False),
      payload.get("createdAt") or now,
      candidate_ts,
      deleted_at,
      source_client,
      state_user_id,
    ))

  elif op_type == "shuffleCollection.delete":
    collection_id = payload.get("id")
    if not collection_id:
      return
    candidate_ts = _shuffle_candidate_ts()

    existing = conn.execute(
      "SELECT updated_at, last_source_client, name, deck_ids_json, created_at FROM server_shuffle_collections WHERE id=? AND user_id=?",
      (collection_id, state_user_id)
    ).fetchone()
    if existing and not lww_should_apply(existing[0], existing[1], candidate_ts, source_client):
      return

    deleted_at = payload.get("deletedAt") or candidate_ts
    existing_name = existing[2] if existing else payload.get("name")
    existing_deck_ids = existing[3] if existing else json.dumps(payload.get("deckIds") or [], ensure_ascii=False)
    existing_created_at = existing[4] if existing else (payload.get("createdAt") or now)

    conn.execute("""
      INSERT OR REPLACE INTO server_shuffle_collections
      (id, name, deck_ids_json, created_at, updated_at, deleted_at, last_source_client, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
      collection_id,
      existing_name,
      existing_deck_ids,
      existing_created_at,
      candidate_ts,
      deleted_at,
      source_client,
      state_user_id,
    ))

  elif op_type == "examDate.upsert":
    candidate_ts = (
      payload.get("updatedAt")
      or payload.get("createdAt")
      or payload.get("timestamp")
      or client_timestamp
      or now
    )
    existing = conn.execute(
      "SELECT updated_at, last_source_client FROM server_profile_settings WHERE user_id=?",
      (state_user_id,)
    ).fetchone()
    if existing and not lww_should_apply(existing[0], existing[1], candidate_ts, source_client):
      return

    raw_exam_date = payload.get("examDateIso")
    exam_date_iso = raw_exam_date.strip() if isinstance(raw_exam_date, str) and raw_exam_date.strip() else None

    # Default ist das geteilte Auto-Join-Fallback-Profil (useAutoJoinDefaultProfile
    # im Client) für jedes Gerät ohne dediziertes Profil — ein persönlicher
    # Prüfungstermin dort würde zwischen den Geräten verschiedener
    # Familienmitglieder durchsickern, die zufällig darauf landen. Clearing
    # (exam_date_iso is None) bleibt erlaubt, nur das Setzen wird abgelehnt.
    if exam_date_iso is not None:
      owner_profile_name = conn.execute(
        "SELECT profile_name FROM users WHERE user_id=?",
        (state_user_id,)
      ).fetchone()
      if owner_profile_name and (owner_profile_name[0] or "").strip() == "Default":
        LOGGER.warning("EXAM_DATE_UPSERT_BLOCKED user_id=%s reason=shared_default_profile", state_user_id)
        return

    conn.execute("""
      INSERT OR REPLACE INTO server_profile_settings
      (user_id, exam_date_iso, updated_at, last_source_client)
      VALUES (?, ?, ?, ?)
    """, (
      state_user_id,
      exam_date_iso,
      candidate_ts,
      source_client,
    ))

  elif op_type == "videoNote.upsert":
    profile_id = _normalize_video_note_profile_id()
    objective = str(payload.get("objective") or "").strip()
    if not profile_id or not objective:
      LOGGER.warning(
        "VIDEO_NOTE_REJECTED op_id=%s reason=invalid_payload profile_id=%s objective=%s",
        op_id,
        profile_id,
        objective,
      )
      return

    candidate_ts = _video_note_candidate_ts()
    existing = conn.execute(
      "SELECT updated_at, last_source_client FROM server_video_notes WHERE profile_id=? AND objective=? AND user_id=?",
      (profile_id, objective, state_user_id)
    ).fetchone()
    if existing and not lww_should_apply(existing[0], existing[1], candidate_ts, source_client):
      return

    deleted_at = payload.get("deletedAt")
    if deleted_at is None and payload.get("isDeleted"):
      deleted_at = candidate_ts

    conn.execute("""
      INSERT OR REPLACE INTO server_video_notes
      (profile_id, objective, video_id, content, tags_json, created_at, updated_at, deleted_at, last_source_client, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
      profile_id,
      objective,
      str(payload.get("videoId", payload.get("video_id")) or ""),
      payload.get("content") if isinstance(payload.get("content"), str) else "",
      json.dumps(_normalize_video_note_tags(), ensure_ascii=False),
      payload.get("createdAt") or payload.get("created_at") or candidate_ts,
      candidate_ts,
      deleted_at,
      source_client,
      state_user_id,
    ))

  elif op_type == "videoNote.delete":
    profile_id = _normalize_video_note_profile_id()
    objective = str(payload.get("objective") or "").strip()
    if not profile_id or not objective:
      return

    candidate_ts = _video_note_candidate_ts()
    existing = conn.execute(
      """SELECT updated_at, last_source_client, video_id, content, tags_json, created_at
         FROM server_video_notes WHERE profile_id=? AND objective=? AND user_id=?""",
      (profile_id, objective, state_user_id)
    ).fetchone()
    if existing and not lww_should_apply(existing[0], existing[1], candidate_ts, source_client):
      return

    deleted_at = payload.get("deletedAt") or payload.get("deleted_at") or candidate_ts
    existing_video_id = existing[2] if existing else str(payload.get("videoId", payload.get("video_id")) or "")
    existing_content = existing[3] if existing else ""
    existing_tags = existing[4] if existing else json.dumps([], ensure_ascii=False)
    existing_created_at = existing[5] if existing else (payload.get("createdAt") or payload.get("created_at") or candidate_ts)

    conn.execute("""
      INSERT OR REPLACE INTO server_video_notes
      (profile_id, objective, video_id, content, tags_json, created_at, updated_at, deleted_at, last_source_client, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
      profile_id,
      objective,
      existing_video_id,
      existing_content,
      existing_tags,
      existing_created_at,
      candidate_ts,
      deleted_at,
      source_client,
      state_user_id,
    ))
