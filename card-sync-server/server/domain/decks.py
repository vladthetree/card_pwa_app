"""Domain helpers: SY0-701 security deck hierarchy, legacy Messer handling,
default-profile bootstrap, and active-deck computation.

Pure data/SQL helpers operating on a passed-in connection. Lowest engine layer
above config; must never import the sync-operations or HTTP layers.
"""
import time

from server.config import (
  DEFAULT_PROFILE_NAME,
  SY0_701_OBJECTIVES,
  SY0_701_ROOT_DECKS,
  LOGGER,
)
from server.common.helpers import now_ms, parse_int
from server.auth.tokens import generate_recovery_code, hash_token
from server.db.profile_scope import scope_user_id
from server.domain.card_catalog import catalog_enabled, canonical_owner_id


def security_objective_deck_id(code: str) -> str:
  return f"sy0-701-objective-{code.replace('.', '-')}"


def security_objective_deck_name(code: str, title: str) -> str:
  return f"{code} {title}"


def infer_security_root_deck_name(deck_name: str | None) -> str | None:
  if not deck_name:
    return None
  for root_name, _domain in SY0_701_ROOT_DECKS.values():
    if deck_name == root_name:
      return root_name
  import re as _re
  m = _re.search(r"::Section\s+([1-5])\s*:", deck_name, _re.IGNORECASE)
  if not m:
    return None
  root = SY0_701_ROOT_DECKS.get(m.group(1))
  return root[0] if root else None


def infer_security_objective_code(deck_name: str | None) -> str | None:
  if not deck_name:
    return None
  import re as _re
  m = _re.search(r"::\s*([1-5])\.(\d{1,2})(?:\.\d{1,2})?\s*:", deck_name)
  if not m:
    return None
  code = f"{m.group(1)}.{int(m.group(2))}"
  valid = {entry[0] for entry in SY0_701_OBJECTIVES}
  return code if code in valid else None


def is_legacy_messer_deck_name(deck_name: str | None) -> bool:
  if not deck_name:
    return False
  lowered = deck_name.lower()
  return "professor messer" in lowered and "::section" in lowered


def legacy_messer_deck_delete_payload(payload: dict, client_timestamp=None) -> dict | None:
  """Return a tombstone payload when a stale client tries to recreate an old Messer deck."""
  deck_id = str(payload.get("id") or "").strip()
  deck_name = str(payload.get("name") or "")
  if not deck_id or not is_legacy_messer_deck_name(deck_name):
    return None

  candidate_ts = parse_int(
    payload.get("updatedAt")
    or payload.get("deletedAt")
    or payload.get("createdAt")
    or payload.get("timestamp")
    or client_timestamp
    or now_ms(),
    now_ms(),
    min_value=0,
  )
  delete_ts = max(now_ms(), candidate_ts + 1)
  return {"deckId": deck_id, "deletedAt": delete_ts, "timestamp": delete_ts}


def get_default_profile_id(conn) -> str | None:
  """Return user_id of the Default profile, or None if it doesn't exist."""
  row = conn.execute(
    "SELECT user_id FROM users WHERE TRIM(profile_name)=? LIMIT 1",
    (DEFAULT_PROFILE_NAME,),
  ).fetchone()
  return row[0] if row else None


def ensure_default_profile(conn) -> str:
  """Ensure a Default profile exists. Returns its user_id. Creates one if missing."""
  import uuid as _uuid
  existing = get_default_profile_id(conn)
  if existing:
    return existing
  user_id = str(_uuid.uuid4())
  now = int(time.time() * 1000)
  recovery_hash = hash_token(generate_recovery_code())
  conn.execute(
    "INSERT INTO users (user_id, profile_name, recovery_code_hash, created_at) VALUES (?, ?, ?, ?)",
    (user_id, DEFAULT_PROFILE_NAME, recovery_hash, now),
  )
  conn.commit()
  LOGGER.info("DEFAULT_PROFILE_CREATED  user_id=%s", user_id[:8])
  return user_id


def ensure_security_deck_hierarchy(conn, user_id=None) -> None:
  """Keep the SY0-701 root decks as roots and seed objective subdecks."""
  user_ids = [scope_user_id(user_id)] if user_id is not None else [
    row[0] for row in conn.execute("SELECT DISTINCT user_id FROM server_decks").fetchall()
  ]
  now = now_ms()

  for state_user_id in user_ids:
    rows = conn.execute(
      "SELECT id, name, parent_deck_id, deleted_at FROM server_decks WHERE user_id=?",
      (state_user_id,),
    ).fetchall()
    active_by_name = {row[1]: row for row in rows if row[3] is None and row[1]}
    active_ids = {row[0] for row in rows if row[3] is None}

    for root_name, _domain in SY0_701_ROOT_DECKS.values():
      root = active_by_name.get(root_name)
      if not root:
        continue
      if root[2] is not None:
        conn.execute(
          "UPDATE server_decks SET parent_deck_id=NULL, updated_at=? WHERE user_id=? AND id=?",
          (now, state_user_id, root[0]),
        )

    for code, title, root_name in SY0_701_OBJECTIVES:
      root = active_by_name.get(root_name)
      if not root:
        continue
      root_id = root[0]
      objective_id = security_objective_deck_id(code)
      objective_name = security_objective_deck_name(code, title)
      existing = conn.execute(
        "SELECT id, name, parent_deck_id, deleted_at FROM server_decks WHERE user_id=? AND id=?",
        (state_user_id, objective_id),
      ).fetchone()
      if existing:
        if existing[1] != objective_name or existing[2] != root_id or existing[3] is not None:
          conn.execute(
            """
            UPDATE server_decks
            SET name=?, parent_deck_id=?, source='system', deleted_at=NULL, updated_at=?
            WHERE user_id=? AND id=?
            """,
            (objective_name, root_id, now, state_user_id, objective_id),
          )
      else:
        conn.execute(
          """
          INSERT INTO server_decks
          (id, name, parent_deck_id, created_at, source, updated_at, deleted_at, last_source_client, user_id)
          VALUES (?, ?, ?, ?, 'system', ?, NULL, 'server-hierarchy', ?)
          """,
          (objective_id, objective_name, root_id, now, now, state_user_id),
        )
        active_ids.add(objective_id)

    rows = conn.execute(
      "SELECT id, name, parent_deck_id, deleted_at FROM server_decks WHERE user_id=?",
      (state_user_id,),
    ).fetchall()
    active_by_name = {row[1]: row for row in rows if row[3] is None and row[1]}
    active_ids = {row[0] for row in rows if row[3] is None}
    root_ids = {active_by_name[root_name][0] for root_name, _ in SY0_701_ROOT_DECKS.values() if root_name in active_by_name}
    objective_ids = {security_objective_deck_id(code) for code, _title, _root_name in SY0_701_OBJECTIVES}

    for deck_id, deck_name, parent_deck_id, deleted_at in rows:
      if deleted_at is not None or deck_id in root_ids or deck_id in objective_ids:
        continue
      if parent_deck_id and parent_deck_id in active_ids:
        continue
      root_name = infer_security_root_deck_name(deck_name)
      root = active_by_name.get(root_name) if root_name else None
      expected_parent_id = root[0] if root else None
      if expected_parent_id and parent_deck_id != expected_parent_id:
        conn.execute(
          "UPDATE server_decks SET parent_deck_id=?, updated_at=? WHERE user_id=? AND id=?",
          (expected_parent_id, now, state_user_id, deck_id),
        )



def active_deck_ids_with_cards_or_descendants(conn, user_id=None):
  """Active decks that either contain active cards or are ancestors of such decks."""
  if user_id and catalog_enabled(conn):
    owner_id = canonical_owner_id(conn)
    if not owner_id:
      return set()
    deck_rows = conn.execute(
      """SELECT id, parent_deck_id FROM server_decks
         WHERE deleted_at IS NULL AND user_id=?""",
      (owner_id,),
    ).fetchall()
    card_rows = conn.execute(
      """SELECT DISTINCT c.deck_id
         FROM server_cards r
         JOIN shared_card_catalog c ON c.id=r.id AND c.deleted_at IS NULL
         WHERE r.user_id=? AND r.deleted_at IS NULL
           AND IFNULL(r.is_deleted, 0)=0 AND c.deck_id IS NOT NULL""",
      (user_id,),
    ).fetchall()
    active_ids = {row[0] for row in deck_rows}
    parent_by_id = {
      row[0]: row[1] if row[1] in active_ids else None
      for row in deck_rows
    }
    keep = set()
    for row in card_rows:
      current = row[0]
      while current and current in active_ids and current not in keep:
        keep.add(current)
        current = parent_by_id.get(current)
    return keep

  params = (user_id,) if user_id else ()
  user_clause = "AND user_id=?" if user_id else ""
  deck_rows = conn.execute(
    f"SELECT id, parent_deck_id FROM server_decks WHERE deleted_at IS NULL {user_clause}",
    params,
  ).fetchall()
  card_rows = conn.execute(
    f"""
    SELECT DISTINCT deck_id
    FROM server_cards
    WHERE deleted_at IS NULL
      AND IFNULL(is_deleted, 0) = 0
      AND deck_id IS NOT NULL
      {user_clause}
    """,
    params,
  ).fetchall()

  active_ids = {row[0] for row in deck_rows}
  parent_by_id = {
    row[0]: row[1] if row[1] in active_ids else None
    for row in deck_rows
  }
  keep = set()

  for row in card_rows:
    current = row[0]
    while current and current in active_ids and current not in keep:
      keep.add(current)
      current = parent_by_id.get(current)

  return keep

def active_deck_ids_from_bootstrap_payload(decks, cards):
  active_decks = [
    deck for deck in decks
    if isinstance(deck, dict) and not deck.get("isDeleted") and deck.get("deletedAt") is None
  ]
  active_ids = {
    str(deck.get("id") or "").strip()
    for deck in active_decks
    if str(deck.get("id") or "").strip()
  }
  parent_by_id = {}
  for deck in active_decks:
    deck_id = str(deck.get("id") or "").strip()
    raw_parent = deck.get("parentDeckId", deck.get("parent_deck_id"))
    parent_id = raw_parent.strip() if isinstance(raw_parent, str) else None
    parent_by_id[deck_id] = parent_id if parent_id in active_ids else None

  keep = set()
  for card in cards:
    if not isinstance(card, dict) or card.get("isDeleted") or card.get("deletedAt") is not None:
      continue
    current = str(card.get("deckId") or "").strip()
    while current and current in active_ids and current not in keep:
      keep.add(current)
      current = parent_by_id.get(current)

  return keep
