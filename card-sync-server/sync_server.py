from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
import json
import sqlite3
import sys
import time
import os
import logging
import ssl
import hmac
from logging.handlers import TimedRotatingFileHandler
from server.common.helpers import (
  client_short as _client_short,
  now_ms,
  env_truthy,
  env_int,
  parse_int,
  to_int_or_default as _to_int_or_default,
)
from server.auth.tokens import (
  generate_device_token,
  generate_recovery_code,
  generate_pairing_code,
  hash_token,
  resolve_device_token,
  issue_device_token,
)
from server.db.profile_scope import (
  scope_user_id,
  profile_auth_required,
  has_profile_scoped_primary_key,
  ensure_profile_scoped_state_tables,
)

DB_PATH = os.environ.get("SYNC_DB_PATH", "sync.db")
HOST = os.environ.get("SYNC_HOST", "0.0.0.0")
PORT = int(os.environ.get("SYNC_PORT", "8787"))
API_TOKEN = os.environ.get("SYNC_API_TOKEN", "")
USE_HTTPS = os.environ.get("SYNC_USE_HTTPS", "0")
CERT_FILE = os.environ.get("SYNC_CERT_FILE", "certs/cert.pem")
KEY_FILE = os.environ.get("SYNC_KEY_FILE", "certs/key.pem")
REBUILD_ON_START = os.environ.get("SYNC_REBUILD_ON_START", "1")
GC_ON_START = os.environ.get("SYNC_GC_ON_START", "0")
GC_RETENTION_DAYS = os.environ.get("SYNC_GC_RETENTION_DAYS", "30")
GC_MIN_REMAINING = os.environ.get("SYNC_GC_MIN_REMAINING", "10000")
GC_SAFETY_WINDOW = os.environ.get("SYNC_GC_SAFETY_WINDOW", "100")
SERVER_LOG_DIR = os.environ.get("SYNC_LOG_DIR", "logs")
SERVER_LOG_FILE = os.environ.get("SYNC_LOG_FILE", "sync-server.log")
SERVER_LOG_LEVEL = os.environ.get("SYNC_LOG_LEVEL", "INFO")
SERVER_LOG_KEEP_DAYS = os.environ.get("SYNC_LOG_KEEP_DAYS", "30")
DB_BUSY_TIMEOUT_MS = os.environ.get("SYNC_DB_BUSY_TIMEOUT_MS", "10000")
MAX_BODY_BYTES = os.environ.get("SYNC_MAX_BODY_BYTES", "10000000")
CORS_ALLOWED_ORIGINS = os.environ.get("SYNC_CORS_ALLOWED_ORIGINS", "*")

LOGGER = logging.getLogger("card-sync-server")
HEALTH_LOG_EVERY_MS = os.environ.get("SYNC_HEALTH_LOG_EVERY_MS", "60000")
_LAST_HEALTH_LOG_BY_IP = {}

def setup_logging():
  os.makedirs(SERVER_LOG_DIR, exist_ok=True)
  log_path = os.path.join(SERVER_LOG_DIR, SERVER_LOG_FILE)

  level_name = str(SERVER_LOG_LEVEL).upper()
  level = getattr(logging, level_name, logging.INFO)
  keep_days = env_int(SERVER_LOG_KEEP_DAYS, 30)

  LOGGER.setLevel(level)
  LOGGER.propagate = False

  if LOGGER.handlers:
    return

  formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s", "%Y-%m-%d %H:%M:%S")

  file_handler = TimedRotatingFileHandler(
    log_path,
    when="midnight",
    interval=1,
    backupCount=max(1, keep_days),
    encoding="utf-8",
  )
  file_handler.setFormatter(formatter)
  file_handler.setLevel(level)
  LOGGER.addHandler(file_handler)

  stderr_handler = logging.StreamHandler(sys.stderr)
  stderr_handler.setFormatter(formatter)
  stderr_handler.setLevel(level)
  LOGGER.addHandler(stderr_handler)

def log(msg):
  LOGGER.info(msg)

def open_db(row_factory=None):
  conn = sqlite3.connect(DB_PATH, timeout=max(1, env_int(DB_BUSY_TIMEOUT_MS, 10000) / 1000))
  conn.execute(f"PRAGMA busy_timeout={max(1, env_int(DB_BUSY_TIMEOUT_MS, 10000))}")
  conn.execute("PRAGMA foreign_keys=ON")
  if row_factory is not None:
    conn.row_factory = row_factory
  return conn

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
  return ""

def _prepare_payload_for_storage(op_type, payload, client_timestamp):
  """Normalize payload before persisting to sync_operations."""
  p = dict(payload) if isinstance(payload, dict) else {}
  if op_type in ("deck.delete", "card.delete") and p.get("deletedAt") is None:
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

def init_db():
  conn = open_db()
  conn.execute("PRAGMA journal_mode=WAL")

  # ─────────────────────────────────────────────────────────────
  # Auth: Users, Devices, Tokens, Pairing Codes
  # ─────────────────────────────────────────────────────────────
  conn.execute("""
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      display_name TEXT,
      profile_name TEXT,
      recovery_code_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER
    )
  """)
  conn.commit()

  user_cols = [r[1] for r in conn.execute("PRAGMA table_info(users)").fetchall()]
  if "profile_name" not in user_cols:
    conn.execute("ALTER TABLE users ADD COLUMN profile_name TEXT")
    conn.commit()

  conn.execute("""
    CREATE TABLE IF NOT EXISTS devices (
      device_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(user_id),
      label TEXT,
      linked_at INTEGER NOT NULL,
      last_seen_at INTEGER
    )
  """)
  conn.execute("CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id)")
  conn.commit()

  conn.execute("""
    CREATE TABLE IF NOT EXISTS device_tokens (
      token_id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(device_id),
      token_hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER,
      revoked_at INTEGER
    )
  """)
  conn.execute("CREATE INDEX IF NOT EXISTS idx_device_tokens_token_hash ON device_tokens(token_hash)")
  conn.commit()

  conn.execute("""
    CREATE TABLE IF NOT EXISTS link_codes (
      code TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(user_id),
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      consumed_at INTEGER
    )
  """)
  conn.commit()

  # ─────────────────────────────────────────────────────────────
  # Sync Operations (Event Log)
  # ─────────────────────────────────────────────────────────────
  conn.execute("""
    CREATE TABLE IF NOT EXISTS sync_operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      op_id TEXT NOT NULL UNIQUE,
      op_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      client_timestamp INTEGER,
      source TEXT,
      source_client TEXT,
      created_at INTEGER NOT NULL
    )
  """)
  conn.execute("CREATE INDEX IF NOT EXISTS idx_sync_created_at ON sync_operations(created_at)")
  conn.commit()

  cols = [r[1] for r in conn.execute("PRAGMA table_info(sync_operations)").fetchall()]
  if "source_client" not in cols:
    conn.execute("ALTER TABLE sync_operations ADD COLUMN source_client TEXT")
    conn.commit()
  if "user_id" not in cols:
    conn.execute("ALTER TABLE sync_operations ADD COLUMN user_id TEXT")
    conn.commit()
  conn.execute("CREATE INDEX IF NOT EXISTS idx_sync_source_client ON sync_operations(source_client)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_sync_user_id ON sync_operations(user_id)")
  conn.commit()

  # Track acknowledged pull cursors per client for conservative event GC.
  conn.execute("""
    CREATE TABLE IF NOT EXISTS sync_client_cursors (
      client_id TEXT PRIMARY KEY,
      last_seen_cursor INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  """)
  conn.execute("CREATE INDEX IF NOT EXISTS idx_client_cursor_updated_at ON sync_client_cursors(updated_at)")
  conn.commit()

  # ─────────────────────────────────────────────────────────────
  # Server State: Decks
  # ─────────────────────────────────────────────────────────────
  conn.execute("""
    CREATE TABLE IF NOT EXISTS server_decks (
      id TEXT NOT NULL,
      name TEXT,
      created_at INTEGER,
      source TEXT,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER NULL,
      last_source_client TEXT,
      user_id TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (user_id, id)
    )
  """)
  conn.execute("CREATE INDEX IF NOT EXISTS idx_deck_updated_at ON server_decks(updated_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_deck_deleted_at ON server_decks(deleted_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_deck_snapshot_active ON server_decks(id) WHERE deleted_at IS NULL")
  conn.commit()

  # ─────────────────────────────────────────────────────────────
  # Server State: Cards
  # ─────────────────────────────────────────────────────────────
  conn.execute("""
    CREATE TABLE IF NOT EXISTS server_cards (
      id TEXT NOT NULL,
      note_id TEXT,
      deck_id TEXT,
      front TEXT,
      back TEXT,
      tags_json TEXT,
      extra_json TEXT,
      type INTEGER,
      queue INTEGER,
      due INTEGER,
      due_at INTEGER,
      interval INTEGER,
      factor INTEGER,
      stability REAL,
      difficulty REAL,
      retrievability REAL,
      reps INTEGER,
      lapses INTEGER,
      algorithm TEXT,
      metadata_json TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER NULL,
      last_source_client TEXT,
      user_id TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (user_id, id)
    )
  """)
  conn.execute("CREATE INDEX IF NOT EXISTS idx_card_updated_at ON server_cards(updated_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_card_deleted_at ON server_cards(deleted_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_card_deck_id ON server_cards(deck_id)")
  conn.commit()

  # ─────────────────────────────────────────────────────────────
  # Server State: Review History
  # ─────────────────────────────────────────────────────────────
  conn.execute("""
    CREATE TABLE IF NOT EXISTS server_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_op_id TEXT NOT NULL UNIQUE,
      card_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      time_ms INTEGER,
      reviewed_at INTEGER NOT NULL,
      source_client TEXT,
      created_at INTEGER NOT NULL,
      undone_at INTEGER NULL,
      user_id TEXT NOT NULL DEFAULT ''
    )
  """)
  conn.execute("CREATE INDEX IF NOT EXISTS idx_review_card_id ON server_reviews(card_id)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_review_reviewed_at ON server_reviews(reviewed_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_review_active_snapshot ON server_reviews(reviewed_at) WHERE undone_at IS NULL")
  conn.commit()

  # ─────────────────────────────────────────────────────────────
  # Server State: Shuffle Collections
  # ─────────────────────────────────────────────────────────────
  conn.execute("""
    CREATE TABLE IF NOT EXISTS server_shuffle_collections (
      id TEXT NOT NULL,
      name TEXT,
      deck_ids_json TEXT,
      created_at INTEGER,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER NULL,
      last_source_client TEXT,
      user_id TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (user_id, id)
    )
  """)
  conn.execute("CREATE INDEX IF NOT EXISTS idx_shuffle_updated_at ON server_shuffle_collections(updated_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_shuffle_deleted_at ON server_shuffle_collections(deleted_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_shuffle_user_id ON server_shuffle_collections(user_id)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_shuffle_snapshot_active ON server_shuffle_collections(id) WHERE deleted_at IS NULL")
  conn.commit()

  card_cols = [r[1] for r in conn.execute("PRAGMA table_info(server_cards)").fetchall()]
  if "metadata_json" not in card_cols:
    conn.execute("ALTER TABLE server_cards ADD COLUMN metadata_json TEXT")
    conn.commit()
  if "is_deleted" not in card_cols:
    conn.execute("ALTER TABLE server_cards ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0")
    conn.commit()
  if "retrievability" not in card_cols:
    conn.execute("ALTER TABLE server_cards ADD COLUMN retrievability REAL")
    conn.commit()
  conn.execute("CREATE INDEX IF NOT EXISTS idx_card_snapshot_active ON server_cards(id) WHERE deleted_at IS NULL AND is_deleted = 0")
  conn.commit()

  # Add user_id columns to state tables (additive migration).
  deck_cols = [r[1] for r in conn.execute("PRAGMA table_info(server_decks)").fetchall()]
  if "user_id" not in deck_cols:
    conn.execute("ALTER TABLE server_decks ADD COLUMN user_id TEXT")
    conn.commit()
  conn.execute("UPDATE server_decks SET user_id='' WHERE user_id IS NULL")
  conn.commit()
  conn.execute("CREATE INDEX IF NOT EXISTS idx_deck_user_id ON server_decks(user_id)")
  conn.commit()

  card_cols2 = [r[1] for r in conn.execute("PRAGMA table_info(server_cards)").fetchall()]
  if "user_id" not in card_cols2:
    conn.execute("ALTER TABLE server_cards ADD COLUMN user_id TEXT")
    conn.commit()
  conn.execute("UPDATE server_cards SET user_id='' WHERE user_id IS NULL")
  conn.commit()
  conn.execute("CREATE INDEX IF NOT EXISTS idx_card_user_id ON server_cards(user_id)")
  conn.commit()

  review_cols = [r[1] for r in conn.execute("PRAGMA table_info(server_reviews)").fetchall()]
  if "user_id" not in review_cols:
    conn.execute("ALTER TABLE server_reviews ADD COLUMN user_id TEXT")
    conn.commit()
  conn.execute("UPDATE server_reviews SET user_id='' WHERE user_id IS NULL")
  conn.commit()
  conn.execute("CREATE INDEX IF NOT EXISTS idx_review_user_id ON server_reviews(user_id)")
  conn.commit()

  shuffle_cols = [r[1] for r in conn.execute("PRAGMA table_info(server_shuffle_collections)").fetchall()]
  if "user_id" not in shuffle_cols:
    conn.execute("ALTER TABLE server_shuffle_collections ADD COLUMN user_id TEXT")
    conn.commit()
  conn.execute("UPDATE server_shuffle_collections SET user_id='' WHERE user_id IS NULL")
  conn.commit()
  conn.execute("CREATE INDEX IF NOT EXISTS idx_shuffle_user_id ON server_shuffle_collections(user_id)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_shuffle_updated_at ON server_shuffle_collections(updated_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_shuffle_deleted_at ON server_shuffle_collections(deleted_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_shuffle_snapshot_active ON server_shuffle_collections(id) WHERE deleted_at IS NULL")
  conn.commit()

  ensure_profile_scoped_state_tables(conn)
  conn.execute("CREATE INDEX IF NOT EXISTS idx_deck_updated_at ON server_decks(updated_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_deck_deleted_at ON server_decks(deleted_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_deck_snapshot_active ON server_decks(id) WHERE deleted_at IS NULL")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_deck_user_id ON server_decks(user_id)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_card_updated_at ON server_cards(updated_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_card_deleted_at ON server_cards(deleted_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_card_deck_id ON server_cards(deck_id)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_card_snapshot_active ON server_cards(id) WHERE deleted_at IS NULL AND is_deleted = 0")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_card_user_id ON server_cards(user_id)")
  conn.commit()

  # ─────────────────────────────────────────────────────────────
  # Bootstrap Upload Idempotency
  # ─────────────────────────────────────────────────────────────
  conn.execute("""
    CREATE TABLE IF NOT EXISTS sync_bootstrap_batches (
      batch_id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      summary_json TEXT NOT NULL,
      server_cursor INTEGER NOT NULL
    )
  """)
  conn.execute("CREATE INDEX IF NOT EXISTS idx_bootstrap_client ON sync_bootstrap_batches(client_id)")
  conn.commit()

  conn.close()

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

  if op_type == "deck.create":
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

    conn.execute("""
      INSERT OR REPLACE INTO server_decks (id, name, created_at, source, updated_at, deleted_at, last_source_client, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (deck_id, name, payload.get("createdAt") or now, payload.get("source"), candidate_ts, deleted_at, source_client, state_user_id))

  elif op_type == "deck.delete":
    deck_id = payload.get("deckId")
    if not deck_id:
      return
    candidate_ts = _deck_candidate_ts()

    existing = conn.execute(
      "SELECT updated_at, last_source_client FROM server_decks WHERE id=? AND user_id=?",
      (deck_id, state_user_id)
    ).fetchone()
    if existing and not lww_should_apply(existing[0], existing[1], candidate_ts, source_client):
      return

    deleted_at = payload.get("deletedAt") or candidate_ts

    conn.execute("UPDATE server_decks SET deleted_at=?, updated_at=?, last_source_client=? WHERE id=? AND user_id=?",
                 (deleted_at, candidate_ts, source_client, deck_id, state_user_id))
    conn.execute("UPDATE server_cards SET deleted_at=?, is_deleted=1, updated_at=?, last_source_client=? WHERE deck_id=? AND user_id=?",
                 (deleted_at, candidate_ts, source_client, deck_id, state_user_id))

  elif op_type == "card.create":
    card_id = payload.get("id")
    if not card_id:
      return
    candidate_ts = _card_candidate_ts()

    existing = conn.execute(
      "SELECT updated_at, last_source_client, reps FROM server_cards WHERE id=? AND user_id=?",
      (card_id, state_user_id)
    ).fetchone()
    if existing and not card_should_apply(existing[0], existing[1], existing[2], candidate_ts, source_client, payload.get("reps")):
      return

    tags_json  = json.dumps(payload.get("tags", []), ensure_ascii=False) if payload.get("tags") is not None else None
    extra_json = json.dumps(payload.get("extra", {}), ensure_ascii=False) if payload.get("extra") is not None else None
    metadata_json = json.dumps(payload.get("metadata"), ensure_ascii=False) if payload.get("metadata") is not None else None
    deleted_at = payload.get("deletedAt")
    is_deleted = 1 if payload.get("isDeleted") or deleted_at is not None else 0
    normalized_due_at = _resolve_due_at(payload.get("dueAt"), payload.get("due"))

    conn.execute("""
      INSERT OR REPLACE INTO server_cards
      (id, note_id, deck_id, front, back, tags_json, extra_json, type, queue, due, due_at, interval, factor,
       stability, difficulty, retrievability, reps, lapses, algorithm, metadata_json, is_deleted, created_at, updated_at, deleted_at, last_source_client, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
      card_id, payload.get("noteId"), payload.get("deckId"), payload.get("front"), payload.get("back"),
      tags_json, extra_json,
      payload.get("type"), payload.get("queue"), payload.get("due"), normalized_due_at,
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
      "interval": "interval", "factor": "factor", "stability": "stability",
      "difficulty": "difficulty", "retrievability": "retrievability", "reps": "reps", "lapses": "lapses", "algorithm": "algorithm",
    }
    for key, col in _MAP.items():
      if key in updates:
        fields.append(f"{col}=?")
        params.append(updates[key])
    if "tags" in updates:
      fields.append("tags_json=?")
      params.append(json.dumps(updates["tags"], ensure_ascii=False) if updates["tags"] is not None else None)
    if "extra" in updates:
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
        type=?, queue=?, due=?, due_at=?, interval=?, factor=?, stability=?, difficulty=?, retrievability=?,
        reps=?, lapses=?, algorithm=?, updated_at=?, last_source_client=?
      WHERE id=? AND user_id=?
    """, (
      updated.get("type"), updated.get("queue"), updated.get("due"), updated.get("dueAt"),
      updated.get("interval"), updated.get("factor"), updated.get("stability"), updated.get("difficulty"), updated.get("retrievability"),
      updated.get("reps"), updated.get("lapses"), updated.get("algorithm"),
      candidate_ts, source_client, card_id, state_user_id,
    ))

    rating = _to_int_or_none(payload.get("rating"))
    if rating in (1, 2, 3, 4):
      reviewed_at = _to_int_or_none(payload.get("timestamp")) or candidate_ts
      review_op_id = op_id or f"{source_client or ''}:{card_id}:{reviewed_at}:{rating}"
      conn.execute(
        """
        INSERT OR IGNORE INTO server_reviews
        (review_op_id, card_id, rating, time_ms, reviewed_at, source_client, created_at, undone_at, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)
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
        type=?, queue=?, due=?, due_at=?, interval=?, factor=?, stability=?, difficulty=?, retrievability=?,
        reps=?, lapses=?, algorithm=?, updated_at=?, last_source_client=?
      WHERE id=? AND user_id=?
    """, (
      restored.get("type"), restored.get("queue"), restored.get("due"), restored.get("dueAt"),
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

def rebuild_server_state(conn):
  """
  Rebuild server_cards and server_decks by replaying all events from sync_operations.
  Used on startup or manual trigger to ensure state consistency.
  """
  # Clear state tables
  conn.execute("DELETE FROM server_cards")
  conn.execute("DELETE FROM server_decks")
  conn.execute("DELETE FROM server_reviews")
  conn.execute("DELETE FROM server_shuffle_collections")
  conn.commit()

  # Fetch all operations in order
  rows = conn.execute("""
    SELECT op_id, op_type, payload_json, client_timestamp, source_client, COALESCE(user_id, '') AS user_id
    FROM sync_operations
    ORDER BY id ASC
  """).fetchall()

  # Replay each operation
  for op_id, op_type, payload_json, client_ts, src_client, user_id in rows:
    try:
      payload = json.loads(payload_json)
    except Exception:
      continue  # Skip unparseable payloads

    try:
      apply_operation(conn, op_type, payload, client_ts, src_client, op_id=op_id, user_id=user_id)
    except Exception:
      LOGGER.exception("REBUILD_APPLY_FAILED op_id=%s op_type=%s", op_id, op_type)

  conn.commit()

def update_client_cursor(conn, client_id, cursor):
  """Store monotonic pull cursor acknowledgements from clients."""
  if not client_id or cursor is None:
    return
  safe_cursor = int(cursor)
  if safe_cursor < 0:
    return
  conn.execute(
    """
    INSERT INTO sync_client_cursors (client_id, last_seen_cursor, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(client_id) DO UPDATE SET
      last_seen_cursor = CASE
        WHEN excluded.last_seen_cursor > sync_client_cursors.last_seen_cursor
        THEN excluded.last_seen_cursor
        ELSE sync_client_cursors.last_seen_cursor
      END,
      updated_at = excluded.updated_at
    """,
    (client_id, safe_cursor, int(time.time()))
  )

def gc_sync_operations(conn, retention_days=30, min_remaining=10000, safety_window=100):
  """Conservatively trim old sync operations without invalidating active client cursors."""
  max_id = conn.execute("SELECT MAX(id) FROM sync_operations").fetchone()[0] or 0
  if max_id <= 0:
    return {"deleted": 0, "deleteUpto": 0, "reason": "empty-log"}

  cutoff = int(time.time()) - max(0, int(retention_days)) * 86400
  age_max_id = conn.execute(
    "SELECT MAX(id) FROM sync_operations WHERE created_at < ?",
    (cutoff,)
  ).fetchone()[0]
  if not age_max_id:
    return {"deleted": 0, "deleteUpto": 0, "reason": "no-ops-older-than-retention"}

  min_cursor = conn.execute(
    "SELECT MIN(last_seen_cursor) FROM sync_client_cursors WHERE last_seen_cursor > 0"
  ).fetchone()[0]
  if not min_cursor:
    return {"deleted": 0, "deleteUpto": 0, "reason": "no-client-cursors"}

  delete_upto = min(int(age_max_id), int(min_cursor))
  delete_upto = max(0, delete_upto - max(0, int(safety_window)))

  max_allowed_delete = max(0, int(max_id) - max(0, int(min_remaining)))
  delete_upto = min(delete_upto, max_allowed_delete)
  if delete_upto <= 0:
    return {"deleted": 0, "deleteUpto": 0, "reason": "protected-by-safety-or-min-remaining"}

  deleted = conn.execute("DELETE FROM sync_operations WHERE id <= ?", (delete_upto,)).rowcount or 0
  conn.commit()
  return {
    "deleted": int(deleted),
    "deleteUpto": int(delete_upto),
    "reason": "ok",
  }

class Handler(BaseHTTPRequestHandler):

  # Auth context populated by _resolve_auth().
  _current_user_id = None
  _current_device_id = None
  _legacy_auth = False

  # ---------------------------------------------------------------------------
  # Routing
  # ---------------------------------------------------------------------------

  def do_OPTIONS(self):                          # OPTIONS  *
    self._send_no_content()

  def log_message(self, format, *args):
    """Route default BaseHTTPRequestHandler access logs through structured logger."""
    method = ""
    try:
      method = self.requestline.split(" ")[0]
    except Exception:
      method = ""
    path = urlparse(self.path).path
    if method == "OPTIONS" or path == "/health":
      return
    client_ip = self.client_address[0] if self.client_address else "?"
    msg = format % args
    log(f"HTTP  ip={client_ip}  {msg}")

  def do_GET(self):
    try:
      path = urlparse(self.path).path
      if path == "/health":                        # GET  /health
        self._route_health()
      elif path == "/auth/profiles":              # GET  /auth/profiles
        self._route_auth_profiles()
      elif path == "/sync/pull":                   # GET  /sync/pull
        self._route_sync_pull()
      elif path == "/sync/decks":                  # GET  /sync/decks
        self._route_sync_decks()
      elif path == "/sync/snapshot":               # GET  /sync/snapshot
        self._route_sync_snapshot()
      else:
        self._send_json(404, {"ok": False, "error": "not_found"})
    except Exception:
      LOGGER.exception("REQUEST_FAILED method=GET path=%s", self.path)
      self._send_json(500, {"ok": False, "error": "internal_error"})

  def do_POST(self):
    try:
      path = urlparse(self.path).path
      if path == "/auth/profile":               # POST /auth/profile
        self._route_auth_create_profile()
      elif path == "/auth/pair/issue":          # POST /auth/pair/issue
        self._route_auth_pair_issue()
      elif path == "/auth/pair/redeem":         # POST /auth/pair/redeem
        self._route_auth_pair_redeem()
      elif path == "/auth/recover":             # POST /auth/recover
        self._route_auth_recover()
      elif path == "/auth/revoke":              # POST /auth/revoke
        self._route_auth_revoke()
      elif path == "/auth/device/remove":       # POST /auth/device/remove
        self._route_auth_device_remove()
      elif path == "/auth/profile/switch":      # POST /auth/profile/switch
        self._route_auth_profile_switch()
      elif path == "/sync":                          # POST /sync
        self._route_sync_push()
      elif path == "/sync/bootstrap/upload":       # POST /sync/bootstrap/upload
        self._route_sync_bootstrap_upload()
      elif path == "/sync/handshake":              # POST /sync/handshake
        self._route_sync_handshake()
      else:
        self._send_json(404, {"ok": False, "error": "not_found"})
    except Exception:
      LOGGER.exception("REQUEST_FAILED method=POST path=%s", self.path)
      self._send_json(500, {"ok": False, "error": "internal_error"})

  # ---------------------------------------------------------------------------
  # POST /auth/profile  — create new profile (no auth required)
  # ---------------------------------------------------------------------------

  def _route_auth_create_profile(self):
    data, error_status, error_code = self._read_json_body()
    if error_code:
      self._send_json(error_status, {"ok": False, "error": error_code})
      return
    if not isinstance(data, dict):
      self._send_json(400, {"ok": False, "error": "invalid_json_object"})
      return

    device_id = str(data.get("deviceId") or "").strip()
    device_label = str(data.get("deviceLabel") or "Device").strip()[:80]
    requested_profile_name = str(data.get("profileName") or "").strip()
    client_ip = self.client_address[0] if self.client_address else "?"

    if not device_id:
      self._send_json(400, {"ok": False, "error": "missing_device_id"})
      return

    import uuid as _uuid
    user_id = str(_uuid.uuid4())
    profile_name = requested_profile_name[:80] if requested_profile_name else f"Profil {user_id[:8]}"
    now = int(time.time() * 1000)

    recovery_code = generate_recovery_code()
    recovery_hash = hash_token(recovery_code)

    conn = open_db(sqlite3.Row)
    try:
      existing_device = conn.execute(
        """
        SELECT d.user_id,
               COALESCE(NULLIF(TRIM(u.profile_name), ''), NULLIF(TRIM(u.display_name), ''), 'Profil ' || SUBSTR(u.user_id, 1, 8)) AS profile_name
        FROM devices d
        JOIN users u ON u.user_id = d.user_id
        WHERE d.device_id=?
        """,
        (device_id,)
      ).fetchone()
      if existing_device:
        profile_token = issue_device_token(conn, existing_device["user_id"], device_id, device_label, now)
        conn.commit()
        log(
          f"AUTH_PROFILE_RECONNECT  ip={client_ip}  user={_client_short(existing_device['user_id'])}  "
          f"device={_client_short(device_id)}"
        )
        self._send_json(200, {
          "ok": True,
          "existingProfile": True,
          "userId": existing_device["user_id"],
          "profileName": existing_device["profile_name"],
          "deviceId": device_id,
          "profileToken": profile_token,
        })
        return

      conn.execute(
        """INSERT INTO users (user_id, profile_name, recovery_code_hash, created_at, last_seen_at)
          VALUES (?, ?, ?, ?, ?)""",
        (user_id, profile_name, recovery_hash, now, now)
      )
      profile_token = issue_device_token(conn, user_id, device_id, device_label, now)
      conn.commit()
      log(f"AUTH_CREATE_PROFILE  ip={client_ip}  user={_client_short(user_id)}  device={_client_short(device_id)}")
      self._send_json(201, {
        "ok": True,
        "existingProfile": False,
        "userId": user_id,
        "profileName": profile_name,
        "deviceId": device_id,
        "profileToken": profile_token,
        "recoveryCode": recovery_code,
      })
    except sqlite3.IntegrityError:
      conn.rollback()
      self._send_json(409, {"ok": False, "error": "profile_conflict"})
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # GET /auth/profiles  — list known profiles
  # ---------------------------------------------------------------------------

  def _route_auth_profiles(self):
    if not self._resolve_auth() or not self._current_user_id:
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    qs = parse_qs(urlparse(self.path).query)
    limit = parse_int(qs.get("limit", ["20"])[0] or "20", 20, min_value=1, max_value=100)

    conn = open_db(sqlite3.Row)
    try:
      rows = conn.execute(
        """
        SELECT
          u.user_id,
          COALESCE(NULLIF(TRIM(u.profile_name), ''), NULLIF(TRIM(u.display_name), ''), 'Profil ' || SUBSTR(u.user_id, 1, 8)) AS profile_name,
          u.last_seen_at,
          u.created_at,
          COUNT(d.device_id) AS linked_devices_count
        FROM users u
        LEFT JOIN devices d ON d.user_id = u.user_id
        WHERE u.user_id = ?
        GROUP BY u.user_id
        ORDER BY COALESCE(u.last_seen_at, u.created_at) DESC
        LIMIT ?
        """,
        (self._current_user_id, limit)
      ).fetchall()

      profiles = [{
        "userId": row["user_id"],
        "profileName": row["profile_name"],
        "lastSeenAt": row["last_seen_at"],
        "linkedDevicesCount": int(row["linked_devices_count"] or 0),
      } for row in rows]
      self._send_json(200, {"ok": True, "profiles": profiles})
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # POST /auth/pair/issue  — generate pairing code (requires auth)
  # ---------------------------------------------------------------------------

  def _route_auth_pair_issue(self):
    if not self._resolve_auth() or not self._current_user_id:
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    client_ip = self.client_address[0] if self.client_address else "?"
    now = int(time.time() * 1000)
    code = generate_pairing_code()
    expires_at = now + 2 * 60 * 1000  # 2 minutes

    conn = open_db()
    try:
      conn.execute(
        """INSERT INTO link_codes (code, user_id, created_at, expires_at)
           VALUES (?, ?, ?, ?)""",
        (code, self._current_user_id, now, expires_at)
      )
      conn.commit()
      log(f"AUTH_PAIR_ISSUE  ip={client_ip}  user={_client_short(self._current_user_id)}  code={code}")
      self._send_json(200, {"ok": True, "code": code, "expiresAt": expires_at})
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # POST /auth/pair/redeem  — redeem pairing code (no auth required)
  # ---------------------------------------------------------------------------

  def _route_auth_pair_redeem(self):
    data, error_status, error_code = self._read_json_body()
    if error_code:
      self._send_json(error_status, {"ok": False, "error": error_code})
      return
    if not isinstance(data, dict):
      self._send_json(400, {"ok": False, "error": "invalid_json_object"})
      return

    code = str(data.get("code") or "").strip().upper()
    device_id = str(data.get("deviceId") or "").strip()
    device_label = str(data.get("deviceLabel") or "Device").strip()[:80]
    client_ip = self.client_address[0] if self.client_address else "?"

    if not code or not device_id:
      self._send_json(400, {"ok": False, "error": "missing_fields"})
      return

    now = int(time.time() * 1000)

    conn = open_db(sqlite3.Row)
    try:
      link = conn.execute(
        "SELECT user_id, expires_at, consumed_at FROM link_codes WHERE code=?",
        (code,)
      ).fetchone()

      if not link:
        self._send_json(404, {"ok": False, "error": "code_not_found"})
        return
      if link["consumed_at"] is not None:
        self._send_json(409, {"ok": False, "error": "code_already_used"})
        return
      if link["expires_at"] < now:
        self._send_json(410, {"ok": False, "error": "code_expired"})
        return

      user_id = link["user_id"]

      profile_token = issue_device_token(conn, user_id, device_id, device_label, now)
      conn.execute(
        "UPDATE link_codes SET consumed_at=? WHERE code=?",
        (now, code)
      )
      conn.commit()
      log(f"AUTH_PAIR_REDEEM  ip={client_ip}  user={_client_short(user_id)}  device={_client_short(device_id)}")
      self._send_json(200, {"ok": True, "userId": user_id, "deviceId": device_id, "profileToken": profile_token})
    except sqlite3.IntegrityError:
      conn.rollback()
      self._send_json(409, {"ok": False, "error": "token_conflict"})
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # POST /auth/recover  — redeem recovery code, issue new device token
  # ---------------------------------------------------------------------------

  def _route_auth_recover(self):
    data, error_status, error_code = self._read_json_body()
    if error_code:
      self._send_json(error_status, {"ok": False, "error": error_code})
      return
    if not isinstance(data, dict):
      self._send_json(400, {"ok": False, "error": "invalid_json_object"})
      return

    recovery_code = str(data.get("recoveryCode") or "").strip()
    device_id = str(data.get("deviceId") or "").strip()
    device_label = str(data.get("deviceLabel") or "Device").strip()[:80]
    client_ip = self.client_address[0] if self.client_address else "?"

    if not recovery_code or not device_id:
      self._send_json(400, {"ok": False, "error": "missing_fields"})
      return

    recovery_hash = hash_token(recovery_code)
    now = int(time.time() * 1000)

    conn = open_db(sqlite3.Row)
    try:
      user = conn.execute(
        "SELECT user_id FROM users WHERE recovery_code_hash=?",
        (recovery_hash,)
      ).fetchone()

      if not user:
        self._send_json(401, {"ok": False, "error": "invalid_recovery_code"})
        return

      user_id = user["user_id"]
      profile_token = issue_device_token(conn, user_id, device_id, device_label, now)
      conn.commit()
      log(f"AUTH_RECOVER  ip={client_ip}  user={_client_short(user_id)}  device={_client_short(device_id)}")
      self._send_json(200, {"ok": True, "userId": user_id, "deviceId": device_id, "profileToken": profile_token})
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # POST /auth/revoke  — revoke all tokens for this device (requires auth)
  # ---------------------------------------------------------------------------

  def _route_auth_revoke(self):
    if not self._resolve_auth() or not self._current_device_id:
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    client_ip = self.client_address[0] if self.client_address else "?"
    now = int(time.time() * 1000)

    conn = open_db()
    try:
      conn.execute(
        "UPDATE device_tokens SET revoked_at=? WHERE device_id=? AND revoked_at IS NULL",
        (now, self._current_device_id)
      )
      conn.commit()
      log(f"AUTH_REVOKE  ip={client_ip}  device={_client_short(self._current_device_id)}")
      self._send_json(200, {"ok": True})
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # POST /auth/device/remove  — hard-remove this device from its profile (requires auth)
  # ---------------------------------------------------------------------------

  def _route_auth_device_remove(self):
    if not self._resolve_auth() or not self._current_device_id:
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    client_ip = self.client_address[0] if self.client_address else "?"
    now = int(time.time() * 1000)
    device_id = self._current_device_id

    conn = open_db()
    try:
      conn.execute(
        "UPDATE device_tokens SET revoked_at=? WHERE device_id=? AND revoked_at IS NULL",
        (now, device_id)
      )
      conn.execute("DELETE FROM devices WHERE device_id=?", (device_id,))
      conn.commit()
      log(f"AUTH_DEVICE_REMOVE  ip={client_ip}  device={_client_short(device_id)}")
      self._send_json(200, {"ok": True})
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # POST /auth/profile/switch  — switch this device to a target profile
  # ---------------------------------------------------------------------------

  def _route_auth_profile_switch(self):
    if not self._resolve_auth() or not self._current_user_id:
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    from_user_id = self._current_user_id

    data, error_status, error_code = self._read_json_body()
    if error_code:
      self._send_json(error_status, {"ok": False, "error": error_code})
      return
    if not isinstance(data, dict):
      self._send_json(400, {"ok": False, "error": "invalid_json_object"})
      return

    user_id = str(data.get("userId") or "").strip()
    device_id = str(data.get("deviceId") or "").strip()
    device_label = str(data.get("deviceLabel") or "Device").strip()[:80]
    client_ip = self.client_address[0] if self.client_address else "?"

    if not user_id or not device_id:
      self._send_json(400, {"ok": False, "error": "missing_fields"})
      return
    if user_id != self._current_user_id:
      self._send_json(403, {"ok": False, "error": "forbidden_profile_switch"})
      return

    now = int(time.time() * 1000)

    conn = open_db(sqlite3.Row)
    try:
      user = conn.execute(
        "SELECT user_id, profile_name, display_name FROM users WHERE user_id=?",
        (user_id,)
      ).fetchone()
      if not user:
        self._send_json(404, {"ok": False, "error": "profile_not_found"})
        return
      profile_token = issue_device_token(conn, user_id, device_id, device_label, now)
      conn.commit()

      to_short = _client_short(user_id)
      from_short = _client_short(from_user_id) if from_user_id else "anon"
      profile_name = user["profile_name"] or user["display_name"] or f"Profil {user_id[:8]}"
      log(
        f"AUTH_PROFILE_SWITCH  ip={client_ip}  from_user={from_short}  to_user={to_short}  "
        f"device={_client_short(device_id)}"
      )
      self._send_json(200, {
        "ok": True,
        "userId": user_id,
        "profileName": profile_name,
        "deviceId": device_id,
        "profileToken": profile_token,
      })
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # GET /health
  # ---------------------------------------------------------------------------

  def _route_health(self):
    client_ip = self.client_address[0] if self.client_address else "?"
    now = now_ms()
    last = _LAST_HEALTH_LOG_BY_IP.get(client_ip, 0)
    interval_ms = env_int(HEALTH_LOG_EVERY_MS, 60000)
    if interval_ms <= 0 or (now - last) >= interval_ms:
      _LAST_HEALTH_LOG_BY_IP[client_ip] = now
      log(f"HEALTH  ip={client_ip}  status=ok")
    self._send_json(200, {"ok": True, "service": "card-pwa-sync"})

  # ---------------------------------------------------------------------------
  # GET /sync/pull  ?since=0 &limit=200 &clientId=…
  # ---------------------------------------------------------------------------

  def _route_sync_pull(self):
    if not self._resolve_auth():
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    qs = parse_qs(urlparse(self.path).query)
    since     = parse_int(qs.get("since", ["0"])[0] or "0", 0, min_value=0)
    limit     = parse_int(qs.get("limit", ["200"])[0] or "200", 200, min_value=1, max_value=1000)
    client_id = (qs.get("clientId", [""])[0] or "").strip()
    client_ip = self.client_address[0] if self.client_address else "?"

    conn = open_db(sqlite3.Row)
    try:
      if client_id and since > 0:
        update_client_cursor(conn, client_id, since)
        conn.commit()

      user_filter, user_params = self._user_filter_sql()

      if client_id:
        rows = conn.execute(
          f"""
          SELECT id, op_id, op_type, payload_json, client_timestamp, source, source_client, created_at
          FROM sync_operations
          WHERE id > ? AND (source_client IS NULL OR source_client != ?) {user_filter}
          ORDER BY id ASC LIMIT ?
          """,
          (since, client_id) + user_params + (limit,)
        ).fetchall()
      else:
        rows = conn.execute(
          f"""
          SELECT id, op_id, op_type, payload_json, client_timestamp, source, source_client, created_at
          FROM sync_operations
          WHERE id > ? {user_filter}
          ORDER BY id ASC LIMIT ?
          """,
          (since,) + user_params + (limit,)
        ).fetchall()

      operations  = []
      next_cursor = since
      for r in rows:
        try:
          payload = json.loads(r["payload_json"])
        except Exception:
          payload = None
        operations.append({
          "id":            r["id"],
          "opId":          r["op_id"],
          "type":          r["op_type"],
          "payload":       payload,
          "clientTimestamp": r["client_timestamp"],
          "source":        r["source"],
          "sourceClient":  r["source_client"],
          "createdAt":     r["created_at"],
        })
        next_cursor = max(next_cursor, r["id"])

      self._send_json(200, {
        "ok":         True,
        "operations": operations,
        "nextCursor": next_cursor,
        "hasMore":    len(rows) == limit,
      })
      log(
        f"PULL   ip={client_ip}  client={_client_short(client_id)}  "
        f"since={since}  limit={limit}  returned={len(operations)}  "
        f"next={next_cursor}  hasMore={len(rows) == limit}"
      )
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # POST /sync
  # ---------------------------------------------------------------------------

  def _route_sync_push(self):
    if not self._resolve_auth():
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    idem   = self.headers.get("X-Idempotency-Key", "")

    data, error_status, error_code = self._read_json_body()
    if error_code:
      self._send_json(error_status, {"ok": False, "error": error_code})
      return
    if not isinstance(data, dict):
      self._send_json(400, {"ok": False, "error": "invalid_json_object"})
      return

    op_id         = str(data.get("opId")            or idem).strip()
    op_type       = str(data.get("type")            or "").strip()
    payload       = data.get("payload")
    client_ts     = data.get("clientTimestamp")
    source        = str(data.get("source")          or "").strip() or None
    source_client = str(data.get("clientId")        or "").strip() or None
    client_ip     = self.client_address[0] if self.client_address else "?"

    if not op_id or not op_type:
      self._send_json(400, {"ok": False, "error": "missing_op_fields"})
      return

    payload = _prepare_payload_for_storage(op_type, payload, client_ts)

    conn = open_db()
    try:
      conn.execute(
        """INSERT INTO sync_operations
           (op_id, op_type, payload_json, client_timestamp, source, source_client, created_at, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (op_id, op_type, json.dumps(payload, ensure_ascii=False),
         client_ts, source, source_client, int(time.time()), self._current_user_id)
      )
      try:
        apply_operation(conn, op_type, payload or {}, client_ts, source_client, op_id=op_id, user_id=self._current_user_id)
        conn.commit()
      except Exception:
        LOGGER.exception("APPLY_FAILED op_id=%s op_type=%s", op_id, op_type)
        conn.rollback()
        self._send_json(500, {"ok": False, "error": "apply_failed"})
        return
      
      detail = _push_detail(op_type, payload)
      log(
        f"PUSH   ip={client_ip}  client={_client_short(source_client)}  "
        f"op={op_type}  stored=1  {detail}"
      )
      self._send_json(200, {"ok": True, "stored": True, "duplicate": False})
    except sqlite3.IntegrityError:
      log(
        f"PUSH   ip={client_ip}  client={_client_short(source_client)}  "
        f"op={op_type}  stored=0  duplicate=1  op_id={op_id}"
      )
      self._send_json(200, {"ok": True, "stored": False, "duplicate": True})
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # POST /sync/bootstrap/upload
  # ---------------------------------------------------------------------------

  def _route_sync_bootstrap_upload(self):
    if not self._resolve_auth():
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    data, error_status, error_code = self._read_json_body()
    if error_code:
      self._send_json(error_status, {"ok": False, "error": error_code})
      return
    if not isinstance(data, dict):
      self._send_json(400, {"ok": False, "error": "invalid_json_object"})
      return

    client_id = str(data.get("clientId") or "").strip()
    batch_id = str(data.get("batchId") or "").strip()
    sent_at = parse_int(data.get("sentAt") or now_ms(), now_ms(), min_value=0)
    decks = data.get("decks") or []
    cards = data.get("cards") or []
    shuffle_collections = data.get("shuffleCollections") or []
    client_ip = self.client_address[0] if self.client_address else "?"

    if not client_id or not batch_id:
      self._send_json(400, {"ok": False, "error": "missing_bootstrap_fields"})
      return
    if not isinstance(decks, list) or not isinstance(cards, list) or not isinstance(shuffle_collections, list):
      self._send_json(400, {"ok": False, "error": "invalid_bootstrap_payload"})
      return

    conn = open_db(sqlite3.Row)
    try:
      state_user_id = scope_user_id(self._current_user_id)
      existing_batch = conn.execute(
        "SELECT summary_json, server_cursor FROM sync_bootstrap_batches WHERE batch_id=?",
        (batch_id,)
      ).fetchone()
      if existing_batch:
        try:
          summary = json.loads(existing_batch["summary_json"])
        except Exception:
          summary = {
            "decksInserted": 0,
            "decksUpdated": 0,
            "decksSkippedOlder": 0,
            "cardsInserted": 0,
            "cardsUpdated": 0,
            "cardsSkippedOlder": 0,
            "shuffleCollectionsInserted": 0,
            "shuffleCollectionsUpdated": 0,
            "shuffleCollectionsSkippedOlder": 0,
            "shuffleCollectionsRejected": 0,
          }
        log(
          f"BOOTSTRAP  ip={client_ip}  client={_client_short(client_id)}  "
          f"batch={batch_id}  duplicate=1"
        )
        self._send_json(200, {
          "ok": True,
          "batchId": batch_id,
          "summary": summary,
          "serverCursor": existing_batch["server_cursor"],
        })
        return

      summary = {
        "decksInserted": 0,
        "decksUpdated": 0,
        "decksSkippedOlder": 0,
        "cardsInserted": 0,
        "cardsUpdated": 0,
        "cardsSkippedOlder": 0,
        "shuffleCollectionsInserted": 0,
        "shuffleCollectionsUpdated": 0,
        "shuffleCollectionsSkippedOlder": 0,
        "shuffleCollectionsRejected": 0,
      }

      # Upsert decks with LWW + tombstone support.
      for deck in decks:
        if not isinstance(deck, dict):
          continue
        deck_id = str(deck.get("id") or "").strip()
        if not deck_id:
          continue

        candidate_ts = parse_int(deck.get("updatedAt") or deck.get("createdAt") or sent_at, sent_at, min_value=0)
        existing = conn.execute(
          "SELECT updated_at, last_source_client FROM server_decks WHERE id=? AND user_id=?",
          (deck_id, state_user_id)
        ).fetchone()
        if existing and not lww_should_apply(existing["updated_at"], existing["last_source_client"], candidate_ts, client_id):
          summary["decksSkippedOlder"] += 1
          continue

        created_at = parse_int(deck.get("createdAt") or candidate_ts, candidate_ts, min_value=0)
        deck_deleted_at = deck.get("deletedAt")
        if deck_deleted_at is None and deck.get("isDeleted"):
          deck_deleted_at = candidate_ts
        conn.execute(
          """
          INSERT OR REPLACE INTO server_decks
          (id, name, created_at, source, updated_at, deleted_at, last_source_client, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          """,
          (
            deck_id,
            deck.get("name"),
            created_at,
            deck.get("source"),
            candidate_ts,
            deck_deleted_at,
            client_id,
            state_user_id,
          )
        )
        if existing:
          summary["decksUpdated"] += 1
        else:
          summary["decksInserted"] += 1

      # Upsert cards with LWW + tombstone support.
      for card in cards:
        if not isinstance(card, dict):
          continue
        card_id = str(card.get("id") or "").strip()
        if not card_id:
          continue

        candidate_ts = parse_int(card.get("updatedAt") or card.get("createdAt") or sent_at, sent_at, min_value=0)
        existing = conn.execute(
          "SELECT updated_at, last_source_client, reps FROM server_cards WHERE id=? AND user_id=?",
          (card_id, state_user_id)
        ).fetchone()
        if existing and not card_should_apply(existing["updated_at"], existing["last_source_client"], existing["reps"], candidate_ts, client_id, card.get("reps")):
          summary["cardsSkippedOlder"] += 1
          continue

        created_at = parse_int(card.get("createdAt") or candidate_ts, candidate_ts, min_value=0)
        tags_json = json.dumps(card.get("tags", []), ensure_ascii=False) if card.get("tags") is not None else None
        extra_json = json.dumps(card.get("extra", {}), ensure_ascii=False) if card.get("extra") is not None else None
        metadata_json = json.dumps(card.get("metadata"), ensure_ascii=False) if card.get("metadata") is not None else None
        deleted_at = card.get("deletedAt")
        is_deleted = 1 if card.get("isDeleted") or deleted_at is not None else 0

        conn.execute(
          """
          INSERT OR REPLACE INTO server_cards
          (id, note_id, deck_id, front, back, tags_json, extra_json, type, queue, due, due_at, interval, factor, stability, difficulty, retrievability, reps, lapses, algorithm, metadata_json, is_deleted, created_at, updated_at, deleted_at, last_source_client, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """,
          (
            card_id,
            card.get("noteId"),
            card.get("deckId"),
            card.get("front"),
            card.get("back"),
            tags_json,
            extra_json,
            card.get("type"),
            card.get("queue"),
            card.get("due"),
            card.get("dueAt"),
            card.get("interval"),
            card.get("factor"),
            card.get("stability"),
            card.get("difficulty"),
            card.get("retrievability"),
            card.get("reps"),
            card.get("lapses"),
            card.get("algorithm"),
            metadata_json,
            is_deleted,
            created_at,
            candidate_ts,
            deleted_at,
            client_id,
            state_user_id,
          )
        )
        if existing:
          summary["cardsUpdated"] += 1
        else:
          summary["cardsInserted"] += 1

      for collection in shuffle_collections:
        if not isinstance(collection, dict):
          summary["shuffleCollectionsRejected"] += 1
          LOGGER.warning(
            "BOOTSTRAP_SHUFFLE_COLLECTION_REJECTED batch=%s reason=invalid_entry_type entry_type=%s",
            batch_id,
            type(collection).__name__,
          )
          continue
        collection_id = str(collection.get("id") or "").strip()
        name = collection.get("name")
        deck_ids = collection.get("deckIds") or []
        normalized_name = name.strip() if isinstance(name, str) else ""
        if not collection_id or not normalized_name or not isinstance(deck_ids, list):
          summary["shuffleCollectionsRejected"] += 1
          LOGGER.warning(
            "BOOTSTRAP_SHUFFLE_COLLECTION_REJECTED batch=%s reason=invalid_payload collection_id=%s has_name=%s deck_ids_type=%s",
            batch_id,
            collection_id,
            bool(normalized_name),
            type(deck_ids).__name__,
          )
          continue

        candidate_ts = parse_int(collection.get("updatedAt") or collection.get("createdAt") or sent_at, sent_at, min_value=0)
        existing = conn.execute(
          "SELECT updated_at, last_source_client FROM server_shuffle_collections WHERE id=? AND user_id=?",
          (collection_id, state_user_id)
        ).fetchone()
        if existing and not lww_should_apply(existing["updated_at"], existing["last_source_client"], candidate_ts, client_id):
          summary["shuffleCollectionsSkippedOlder"] += 1
          continue

        created_at = parse_int(collection.get("createdAt") or candidate_ts, candidate_ts, min_value=0)
        deleted_at = collection.get("deletedAt")
        if deleted_at is None and collection.get("isDeleted"):
          deleted_at = candidate_ts

        conn.execute(
          """
          INSERT OR REPLACE INTO server_shuffle_collections
          (id, name, deck_ids_json, created_at, updated_at, deleted_at, last_source_client, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          """,
          (
            collection_id,
            normalized_name,
            json.dumps(deck_ids, ensure_ascii=False),
            created_at,
            candidate_ts,
            deleted_at,
            client_id,
            state_user_id,
          )
        )
        if existing:
          summary["shuffleCollectionsUpdated"] += 1
        else:
          summary["shuffleCollectionsInserted"] += 1

      # Log a single operation marker to advance server cursor for post-bootstrap pull.
      marker_payload = {
        "batchId": batch_id,
        "decks": len(decks),
        "cards": len(cards),
        "shuffleCollections": len(shuffle_collections),
      }
      conn.execute(
        """INSERT INTO sync_operations
           (op_id, op_type, payload_json, client_timestamp, source, source_client, created_at, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
          f"bootstrap:{batch_id}",
          "bootstrap.upload",
          json.dumps(marker_payload, ensure_ascii=False),
          sent_at,
          "card-pwa",
          client_id,
          int(time.time()),
          state_user_id,
        )
      )

      user_filter, user_params = self._user_filter_sql()
      server_cursor = conn.execute(
        f"SELECT MAX(id) FROM sync_operations WHERE 1=1 {user_filter}",
        user_params
      ).fetchone()[0] or 0
      conn.execute(
        """INSERT INTO sync_bootstrap_batches (batch_id, client_id, created_at, summary_json, server_cursor)
           VALUES (?, ?, ?, ?, ?)""",
        (batch_id, client_id, int(time.time()), json.dumps(summary, ensure_ascii=False), server_cursor)
      )
      conn.commit()

      log(
        f"BOOTSTRAP  ip={client_ip}  client={_client_short(client_id)}  batch={batch_id}  "
        f"decks=+{summary['decksInserted']}/={summary['decksUpdated']}/skip={summary['decksSkippedOlder']}  "
        f"cards=+{summary['cardsInserted']}/={summary['cardsUpdated']}/skip={summary['cardsSkippedOlder']}  "
        f"shuffle=+{summary['shuffleCollectionsInserted']}/={summary['shuffleCollectionsUpdated']}/skip={summary['shuffleCollectionsSkippedOlder']}/rej={summary['shuffleCollectionsRejected']}"
      )
      self._send_json(200, {
        "ok": True,
        "batchId": batch_id,
        "summary": summary,
        "serverCursor": server_cursor,
      })
    except Exception:
      LOGGER.exception("BOOTSTRAP_FAILED client=%s batch=%s", _client_short(client_id), batch_id)
      conn.rollback()
      self._send_json(500, {"ok": False, "error": "bootstrap_failed"})
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # POST /sync/handshake  { clientId, lastCursor?, wantsSnapshot?, localCounts? }
  # ---------------------------------------------------------------------------

  def _route_sync_handshake(self):
    if not self._resolve_auth():
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    data, error_status, error_code = self._read_json_body()
    if error_code:
      self._send_json(error_status, {"ok": False, "error": error_code})
      return
    if not isinstance(data, dict):
      self._send_json(400, {"ok": False, "error": "invalid_json_object"})
      return

    client_id = str(data.get("clientId") or "").strip()
    last_cursor = parse_int(data.get("lastCursor") or 0, 0, min_value=0)
    wants_snapshot = bool(data.get("wantsSnapshot", False))
    local_counts = data.get("localCounts", {})
    if not isinstance(local_counts, dict):
      local_counts = {}
    local_cards = parse_int(local_counts.get("cards", 0) or 0, 0, min_value=0)
    local_decks = parse_int(local_counts.get("decks", 0) or 0, 0, min_value=0)
    client_ip = self.client_address[0] if self.client_address else "?"

    if not client_id:
      self._send_json(400, {"ok": False, "error": "missing_client_id"})
      return

    conn = open_db()
    try:
      user_filter, user_params = self._user_filter_sql()
      server_cursor = conn.execute(
        f"SELECT MAX(id) FROM sync_operations WHERE 1=1 {user_filter}",
        user_params
      ).fetchone()[0] or 0
      active_cards = conn.execute(
        f"SELECT COUNT(*) FROM server_cards WHERE deleted_at IS NULL AND IFNULL(is_deleted, 0) = 0 {user_filter}",
        user_params
      ).fetchone()[0] or 0
      active_decks = conn.execute(
        f"SELECT COUNT(*) FROM server_decks WHERE deleted_at IS NULL {user_filter}",
        user_params
      ).fetchone()[0] or 0
      needs_snapshot = False
      needs_client_bootstrap_upload = False
      reason = "ok"

      if active_cards == 0 and active_decks == 0 and (local_cards > 0 or local_decks > 0):
        needs_client_bootstrap_upload = True
        reason = "server-empty-client-has-data"
      elif active_cards > local_cards or active_decks > local_decks:
        needs_snapshot = True
        reason = "client-missing-server-data"
      elif wants_snapshot and active_cards > 0:
        needs_snapshot = True
        reason = "explicit-request"

      # Contract guard: both flags must never be true simultaneously.
      if needs_snapshot and needs_client_bootstrap_upload:
        needs_snapshot = False
      
      self._send_json(200, {
        "ok": True,
        "serverCursor": server_cursor,
        "needsSnapshot": needs_snapshot,
        "needsClientBootstrapUpload": needs_client_bootstrap_upload,
        "reason": reason,
        "serverCounts": {
          "decks": active_decks,
          "cards": active_cards,
        }
      })
      log(
        f"HANDSHAKE  ip={client_ip}  client={_client_short(client_id)}  "
        f"lastCursor={last_cursor}  localCards={local_cards}  localDecks={local_decks}  "
        f"serverCards={active_cards}  serverDecks={active_decks}  "
        f"needsSnapshot={needs_snapshot}  needsUpload={needs_client_bootstrap_upload}  reason={reason}"
      )
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # GET /sync/decks
  # ---------------------------------------------------------------------------

  def _route_sync_decks(self):
    if not self._resolve_auth():
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    qs = parse_qs(urlparse(self.path).query)
    include_deleted = qs.get("includeDeleted", ["false"])[0].lower() in ("true", "1", "yes")
    client_ip = self.client_address[0] if self.client_address else "?"

    conn = open_db(sqlite3.Row)
    try:
      user_filter, user_params = self._user_filter_sql("d")
      if include_deleted:
        where_clause = f"WHERE 1=1 {user_filter}"
      else:
        where_clause = f"WHERE d.deleted_at IS NULL {user_filter}"

      rows = conn.execute(
        f"""
        SELECT d.id, d.name, d.source, d.created_at, d.updated_at, d.deleted_at,
               COALESCE(NULLIF(TRIM(u.profile_name), ''), NULLIF(TRIM(u.display_name), ''), 'Profil ' || SUBSTR(d.user_id, 1, 8)) AS owner_profile_name
        FROM server_decks d
        LEFT JOIN users u ON u.user_id = d.user_id
        {where_clause}
        ORDER BY LOWER(COALESCE(d.name, '')), d.id ASC
        """,
        user_params,
      ).fetchall()

      decks = [{
        "id": row["id"],
        "name": row["name"],
        "source": row["source"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "isDeleted": row["deleted_at"] is not None,
        "ownerProfileName": row["owner_profile_name"],
      } for row in rows]

      log(f"SYNC_DECKS  ip={client_ip}  count={len(decks)}")
      self._send_json(200, {"ok": True, "decks": decks})
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # GET /sync/snapshot  ?clientId=… &includeDeleted=…
  # ---------------------------------------------------------------------------

  def _route_sync_snapshot(self):
    if not self._resolve_auth():
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    qs = parse_qs(urlparse(self.path).query)
    client_id = (qs.get("clientId", [""])[0] or "").strip()
    include_deleted = qs.get("includeDeleted", ["false"])[0].lower() in ("true", "1", "yes")
    client_ip = self.client_address[0] if self.client_address else "?"

    if not client_id:
      self._send_json(400, {"ok": False, "error": "missing_client_id"})
      return

    conn = open_db(sqlite3.Row)
    try:
      user_filter, user_params = self._user_filter_sql()
      cursor = conn.execute(
        f"SELECT MAX(id) FROM sync_operations WHERE 1=1 {user_filter}",
        user_params
      ).fetchone()[0] or 0
      
      # Fetch decks
      if include_deleted:
        where_deck = f"WHERE 1=1 {user_filter}"
      else:
        where_deck = f"WHERE deleted_at IS NULL {user_filter}"
      decks_rows = conn.execute(
        f"""SELECT id, name, created_at, source, updated_at, deleted_at, last_source_client
            FROM server_decks {where_deck} ORDER BY id ASC""",
        user_params
      ).fetchall()
      
      decks = []
      for r in decks_rows:
        decks.append({
          "id": r["id"],
          "name": r["name"],
          "createdAt": r["created_at"],
          "source": r["source"],
          "updatedAt": r["updated_at"],
          "isDeleted": r["deleted_at"] is not None,
          "deletedAt": r["deleted_at"],
          "lastSourceClient": r["last_source_client"]
        })
      
      # Fetch cards
      if include_deleted:
        where_card = f"WHERE 1=1 {user_filter}"
      else:
        where_card = f"WHERE deleted_at IS NULL AND IFNULL(is_deleted, 0) = 0 {user_filter}"
      cards_rows = conn.execute(
        f"""SELECT id, note_id, deck_id, front, back, tags_json, extra_json, type, queue, due, due_at, interval, factor, stability, difficulty, retrievability, reps, lapses, algorithm, metadata_json, is_deleted, created_at, updated_at, deleted_at, last_source_client
            FROM server_cards {where_card} ORDER BY id ASC""",
        user_params
      ).fetchall()
      
      cards = []
      for r in cards_rows:
        try:
          tags = json.loads(r["tags_json"]) if r["tags_json"] else []
        except:
          tags = []
        try:
          extra = json.loads(r["extra_json"]) if r["extra_json"] else {}
        except:
          extra = {}
        try:
          metadata = json.loads(r["metadata_json"]) if r["metadata_json"] else None
        except:
          metadata = None

        raw_due = r["due"]
        raw_due_at = r["due_at"]
        try:
          normalized_due = int(raw_due) if raw_due is not None else int(time.time() // 86400)
        except Exception:
          normalized_due = int(time.time() // 86400)
        try:
          normalized_due_at = int(raw_due_at) if raw_due_at is not None else int(max(0, normalized_due) * 86400000)
        except Exception:
          normalized_due_at = int(max(0, normalized_due) * 86400000)

        raw_type = r["type"] if r["type"] is not None else 0
        raw_queue = r["queue"] if r["queue"] is not None else raw_type
        try:
          normalized_type = max(0, min(3, int(raw_type)))
        except Exception:
          normalized_type = 0
        try:
          normalized_queue = max(-1, min(2, int(raw_queue)))
        except Exception:
          normalized_queue = normalized_type

        stability = r["stability"]
        difficulty = r["difficulty"]
        retrievability = r["retrievability"]
        algorithm = r["algorithm"] if r["algorithm"] in ("sm2", "fsrs") else "sm2"
        normalized_deleted = bool(r["is_deleted"]) or r["deleted_at"] is not None
        
        cards.append({
          "id": r["id"],
          "noteId": r["note_id"],
          "deckId": r["deck_id"],
          "front": r["front"],
          "back": r["back"],
          "tags": tags,
          "extra": extra,
          "type": normalized_type,
          "queue": normalized_queue,
          "due": normalized_due,
          "dueAt": normalized_due_at,
          "interval": r["interval"],
          "factor": r["factor"],
          "stability": stability,
          "difficulty": difficulty,
          "retrievability": retrievability,
          "reps": r["reps"],
          "lapses": r["lapses"],
          "algorithm": algorithm,
          "metadata": metadata,
          "isDeleted": normalized_deleted,
          "createdAt": r["created_at"],
          "updatedAt": r["updated_at"],
          "deletedAt": r["deleted_at"],
          "lastSourceClient": r["last_source_client"]
        })

      if include_deleted:
        where_shuffle = f"WHERE 1=1 {user_filter}"
      else:
        where_shuffle = f"WHERE deleted_at IS NULL {user_filter}"
      shuffle_rows = conn.execute(
        f"""SELECT id, name, deck_ids_json, created_at, updated_at, deleted_at, last_source_client
            FROM server_shuffle_collections {where_shuffle} ORDER BY id ASC""",
        user_params
      ).fetchall()
      shuffle_collections = []
      for r in shuffle_rows:
        try:
          deck_ids = json.loads(r["deck_ids_json"]) if r["deck_ids_json"] else []
        except Exception:
          deck_ids = []

        shuffle_collections.append({
          "id": r["id"],
          "name": r["name"],
          "deckIds": deck_ids,
          "createdAt": r["created_at"],
          "updatedAt": r["updated_at"],
          "isDeleted": r["deleted_at"] is not None,
          "deletedAt": r["deleted_at"],
          "lastSourceClient": r["last_source_client"],
        })

      where_review = f"WHERE undone_at IS NULL {user_filter}"
      if not include_deleted:
        where_review += """
          AND EXISTS (
            SELECT 1 FROM server_cards c
            WHERE c.id = server_reviews.card_id
              AND c.user_id = server_reviews.user_id
              AND c.deleted_at IS NULL
              AND IFNULL(c.is_deleted, 0) = 0
          )
        """
      review_rows = conn.execute(
        f"""SELECT review_op_id, card_id, rating, time_ms, reviewed_at, source_client, created_at
            FROM server_reviews {where_review}
            ORDER BY reviewed_at ASC, id ASC""",
        user_params
      ).fetchall()
      reviews = []
      for r in review_rows:
        reviews.append({
          "opId": r["review_op_id"],
          "cardId": r["card_id"],
          "rating": r["rating"],
          "timeMs": r["time_ms"],
          "timestamp": r["reviewed_at"],
          "sourceClient": r["source_client"],
          "createdAt": r["created_at"],
        })
      
      self._send_json(200, {
        "ok": True,
        "cursor": cursor,
        "decks": decks,
        "cards": cards,
        "shuffleCollections": shuffle_collections,
        "reviews": reviews
      })
      log(
        f"SNAPSHOT  ip={client_ip}  client={_client_short(client_id)}  "
        f"includeDeleted={include_deleted}  decks={len(decks)}  cards={len(cards)}  shuffle={len(shuffle_collections)}  reviews={len(reviews)}  cursor={cursor}"
      )
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

  def _read_json_body(self):
    raw_length = self.headers.get("Content-Length", "0")
    try:
      length = int(raw_length or "0")
    except Exception:
      return None, 400, "invalid_content_length"

    if length < 0:
      return None, 400, "invalid_content_length"
    if length > env_int(MAX_BODY_BYTES, 10000000):
      return None, 413, "payload_too_large"

    raw = self.rfile.read(length) if length > 0 else b""
    try:
      return json.loads(raw.decode("utf-8")), None, None
    except Exception:
      return None, 400, "invalid_json"

  def _cors_origin(self):
    allowed = [o.strip() for o in str(CORS_ALLOWED_ORIGINS).split(",") if o.strip()]
    if not allowed or "*" in allowed:
      return "*"
    origin = self.headers.get("Origin", "")
    if origin in allowed:
      return origin
    return allowed[0]

  def _send_cors_headers(self):
    self.send_header("Access-Control-Allow-Origin", self._cors_origin())
    self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Idempotency-Key, Authorization")
    self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    self.send_header("Access-Control-Allow-Private-Network", "true")
    if self._cors_origin() != "*":
      self.send_header("Vary", "Origin")

  def _send_json(self, status, data):
    body = json.dumps(data).encode("utf-8")
    self.send_response(status)
    self.send_header("Content-Type",   "application/json; charset=utf-8")
    self.send_header("Content-Length", str(len(body)))
    self._send_cors_headers()
    self.end_headers()
    self.wfile.write(body)

  def _send_no_content(self):
    self.send_response(204)
    self._send_cors_headers()
    self.send_header("Content-Length", "0")
    self.end_headers()

  def _check_auth(self):
    if not API_TOKEN:
      return True
    return hmac.compare_digest(self.headers.get("Authorization", ""), f"Bearer {API_TOKEN}")

  def _resolve_auth(self) -> bool:
    """
    Resolve the Authorization header. Returns True if authenticated.
    Sets self._current_user_id / self._current_device_id for device-token auth.
    Sets self._legacy_auth = True for SYNC_API_TOKEN auth.
    """
    self._current_user_id = None
    self._current_device_id = None
    self._legacy_auth = False

    auth_header = self.headers.get("Authorization", "")
    if not auth_header:
      if API_TOKEN:
        return False
      # Keep legacy no-token sync simple, but do not expose profile-scoped data
      # once any server profile exists.
      conn = open_db()
      try:
        return not profile_auth_required(conn)
      finally:
        conn.close()

    if auth_header.startswith("Bearer dt_"):
      token = auth_header[len("Bearer "):]
      conn = open_db(sqlite3.Row)
      try:
        result = resolve_device_token(conn, token)
        # Update last_seen on device.
        if result:
          conn.execute(
            "UPDATE devices SET last_seen_at=? WHERE device_id=?",
            (int(time.time() * 1000), result[1])
          )
          conn.execute(
            "UPDATE users SET last_seen_at=? WHERE user_id=?",
            (int(time.time() * 1000), result[0])
          )
          conn.commit()
        return result is not None and self._set_device_auth(result)
      finally:
        conn.close()

    if API_TOKEN and hmac.compare_digest(auth_header, f"Bearer {API_TOKEN}"):
      self._legacy_auth = True
      return True

    return False

  def _set_device_auth(self, result) -> bool:
    if not result:
      return False
    self._current_user_id = result[0]
    self._current_device_id = result[1]
    return True

  def _user_filter_sql(self, alias="") -> tuple:
    """
    Return (WHERE clause fragment, params) for scoping queries by user_id.
    In legacy mode returns empty filter.
    """
    col = f"{alias}." if alias else ""
    if self._current_user_id:
      return (f"AND {col}user_id = ?", (self._current_user_id,))
    return ("", ())

if __name__ == "__main__":
  setup_logging()
  log(
    f"STARTUP  host={HOST}  port={PORT}  db={DB_PATH}  "
    f"rebuildOnStart={env_truthy(REBUILD_ON_START)}  gcOnStart={env_truthy(GC_ON_START)}"
  )
  if not API_TOKEN:
    LOGGER.warning("SECURITY  SYNC_API_TOKEN is empty; sync API accepts unauthenticated requests")
  init_db()

  if env_truthy(REBUILD_ON_START):
    # Rebuild server state from event log when enabled.
    conn = open_db()
    rebuild_server_state(conn)
    conn.close()
  else:
    log("STARTUP  rebuild skipped (SYNC_REBUILD_ON_START disabled)")

  if env_truthy(GC_ON_START):
    conn = open_db()
    gc_stats = gc_sync_operations(
      conn,
      retention_days=env_int(GC_RETENTION_DAYS, 30),
      min_remaining=env_int(GC_MIN_REMAINING, 10000),
      safety_window=env_int(GC_SAFETY_WINDOW, 100),
    )
    conn.close()
    log(
      f"GC  deleted={gc_stats['deleted']}  upto={gc_stats['deleteUpto']}  reason={gc_stats['reason']}  "
      f"retentionDays={env_int(GC_RETENTION_DAYS, 30)}  minRemaining={env_int(GC_MIN_REMAINING, 10000)}  "
      f"safetyWindow={env_int(GC_SAFETY_WINDOW, 100)}"
    )
  
  server = ThreadingHTTPServer((HOST, PORT), Handler)
  
  # SSL/TLS Kontext einrichten
  if env_truthy(USE_HTTPS):
    if not os.path.exists(CERT_FILE) or not os.path.exists(KEY_FILE):
      log(f"ERROR  HTTPS aktiviert aber Zertifikat nicht gefunden:")
      log(f"       CERT_FILE: {CERT_FILE}")
      log(f"       KEY_FILE: {KEY_FILE}")
      log(f"       Bitte führe 'bash scripts/https/setup-https.sh' aus")
      sys.exit(1)
    
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(CERT_FILE, KEY_FILE)
    server.socket = context.wrap_socket(server.socket, server_side=True)
    protocol = "HTTPS"
  else:
    protocol = "HTTP"
  
  log(f"LISTEN  url={protocol.lower()}://{HOST}:{PORT}")
  server.serve_forever()
