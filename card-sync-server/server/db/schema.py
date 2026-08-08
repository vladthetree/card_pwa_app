"""Database bootstrap and maintenance: schema creation/migration (init_db),
full state rebuild from the operation log, client-cursor updates, and
operation-log garbage collection.

Sits above the operation engine because rebuild/init replay operations.
"""
import json
import sqlite3
import time

from server.config import DEFAULT_PROFILE_NAME, LOGGER
from server.db.connection import open_db
from server.db.profile_scope import ensure_profile_scoped_state_tables
from server.domain.decks import (
  ensure_default_profile,
  ensure_security_deck_hierarchy,
  get_default_profile_id,
)
from server.sync.operations import apply_operation


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
      parent_deck_id TEXT,
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
      learning_step INTEGER,
      last_reviewed_at INTEGER,
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
      session_run_id TEXT,
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

  # ─────────────────────────────────────────────────────────────
  # Server State: Video Notes
  # ─────────────────────────────────────────────────────────────
  conn.execute("""
    CREATE TABLE IF NOT EXISTS server_video_notes (
      profile_id TEXT NOT NULL,
      objective TEXT NOT NULL,
      video_id TEXT,
      content TEXT,
      tags_json TEXT,
      created_at INTEGER,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER NULL,
      last_source_client TEXT,
      user_id TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (user_id, profile_id, objective)
    )
  """)
  conn.execute("CREATE INDEX IF NOT EXISTS idx_video_notes_user_id ON server_video_notes(user_id)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_video_notes_updated_at ON server_video_notes(updated_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_video_notes_deleted_at ON server_video_notes(deleted_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_video_notes_snapshot_active ON server_video_notes(user_id, profile_id, objective) WHERE deleted_at IS NULL")
  conn.commit()

  # ─────────────────────────────────────────────────────────────
  # Server State: Profile Settings (bisher nur examDateIso — 2026-07-21)
  # ─────────────────────────────────────────────────────────────
  conn.execute("""
    CREATE TABLE IF NOT EXISTS server_profile_settings (
      user_id TEXT NOT NULL,
      exam_date_iso TEXT,
      updated_at INTEGER NOT NULL,
      last_source_client TEXT,
      PRIMARY KEY (user_id)
    )
  """)
  conn.execute("CREATE INDEX IF NOT EXISTS idx_profile_settings_updated_at ON server_profile_settings(updated_at)")
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
  if "learning_step" not in card_cols:
    conn.execute("ALTER TABLE server_cards ADD COLUMN learning_step INTEGER")
    conn.commit()
  if "last_reviewed_at" not in card_cols:
    conn.execute("ALTER TABLE server_cards ADD COLUMN last_reviewed_at INTEGER")
    conn.commit()
  conn.execute("CREATE INDEX IF NOT EXISTS idx_card_snapshot_active ON server_cards(id) WHERE deleted_at IS NULL AND is_deleted = 0")
  conn.commit()

  # Add user_id columns to state tables (additive migration).
  deck_cols = [r[1] for r in conn.execute("PRAGMA table_info(server_decks)").fetchall()]
  if "user_id" not in deck_cols:
    conn.execute("ALTER TABLE server_decks ADD COLUMN user_id TEXT")
    conn.commit()
  if "parent_deck_id" not in deck_cols:
    conn.execute("ALTER TABLE server_decks ADD COLUMN parent_deck_id TEXT")
    conn.commit()
  conn.execute("UPDATE server_decks SET user_id='' WHERE user_id IS NULL")
  conn.commit()
  conn.execute("CREATE INDEX IF NOT EXISTS idx_deck_user_id ON server_decks(user_id)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_deck_parent_id ON server_decks(user_id, parent_deck_id)")
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

  # Antwortdetails interaktiver Karten (additive Migration): gewählte und
  # korrekte Antwort plus Richtig/Falsch-Flag — NULL für alte Reviews und
  # Karten ohne Auswahl (klassisches Umdrehen, Free Recall).
  if "selected_answer" not in review_cols:
    conn.execute("ALTER TABLE server_reviews ADD COLUMN selected_answer TEXT")
    conn.commit()
  if "correct_answer" not in review_cols:
    conn.execute("ALTER TABLE server_reviews ADD COLUMN correct_answer TEXT")
    conn.commit()
  if "answer_correct" not in review_cols:
    conn.execute("ALTER TABLE server_reviews ADD COLUMN answer_correct INTEGER")
    conn.commit()
  if "session_run_id" not in review_cols:
    conn.execute("ALTER TABLE server_reviews ADD COLUMN session_run_id TEXT")
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

  video_note_cols = [r[1] for r in conn.execute("PRAGMA table_info(server_video_notes)").fetchall()]
  if "user_id" not in video_note_cols:
    conn.execute("ALTER TABLE server_video_notes ADD COLUMN user_id TEXT")
    conn.commit()
  conn.execute("UPDATE server_video_notes SET user_id='' WHERE user_id IS NULL")
  conn.commit()
  conn.execute("CREATE INDEX IF NOT EXISTS idx_video_notes_user_id ON server_video_notes(user_id)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_video_notes_updated_at ON server_video_notes(updated_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_video_notes_deleted_at ON server_video_notes(deleted_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_video_notes_snapshot_active ON server_video_notes(user_id, profile_id, objective) WHERE deleted_at IS NULL")
  conn.commit()

  ensure_profile_scoped_state_tables(conn)
  conn.execute("CREATE INDEX IF NOT EXISTS idx_deck_updated_at ON server_decks(updated_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_deck_deleted_at ON server_decks(deleted_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_deck_snapshot_active ON server_decks(id) WHERE deleted_at IS NULL")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_deck_user_id ON server_decks(user_id)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_deck_parent_id ON server_decks(user_id, parent_deck_id)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_card_updated_at ON server_cards(updated_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_card_deleted_at ON server_cards(deleted_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_card_deck_id ON server_cards(deck_id)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_card_snapshot_active ON server_cards(id) WHERE deleted_at IS NULL AND is_deleted = 0")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_card_user_id ON server_cards(user_id)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_video_notes_user_id ON server_video_notes(user_id)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_video_notes_updated_at ON server_video_notes(updated_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_video_notes_deleted_at ON server_video_notes(deleted_at)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_video_notes_snapshot_active ON server_video_notes(user_id, profile_id, objective) WHERE deleted_at IS NULL")
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

  # ─────────────────────────────────────────────────────────────
  # Default Profile
  # ─────────────────────────────────────────────────────────────
  # One-time: designate the unnamed profile with the most deck content as Default.
  if not get_default_profile_id(conn):
    row = conn.execute("""
      SELECT u.user_id
      FROM users u
      WHERE (u.profile_name IS NULL OR TRIM(u.profile_name) = '')
        AND EXISTS (SELECT 1 FROM server_decks WHERE user_id = u.user_id)
      ORDER BY (SELECT COUNT(*) FROM server_decks WHERE user_id = u.user_id) DESC
      LIMIT 1
    """).fetchone()
    if row:
      conn.execute("UPDATE users SET profile_name=? WHERE user_id=?", (DEFAULT_PROFILE_NAME, row[0]))
      conn.commit()
      LOGGER.info("DEFAULT_PROFILE_ASSIGNED  user_id=%s", row[0][:8])

  default_id = ensure_default_profile(conn)

  # Move any legacy user_id='' content to the Default profile.
  empty_decks = conn.execute("SELECT COUNT(*) FROM server_decks WHERE user_id=''").fetchone()[0]
  empty_cards = conn.execute("SELECT COUNT(*) FROM server_cards WHERE user_id=''").fetchone()[0]
  if empty_decks or empty_cards:
    conn.execute("UPDATE server_decks SET user_id=? WHERE user_id=''", (default_id,))
    conn.execute("UPDATE server_cards SET user_id=? WHERE user_id=''", (default_id,))
    conn.commit()
    LOGGER.info("UNMAPPED_MIGRATED  decks=%d  cards=%d  to=%s", empty_decks, empty_cards, default_id[:8])

  # ─────────────────────────────────────────────────────────────
  # Web Push subscriptions for daily motivation reminders
  # ─────────────────────────────────────────────────────────────
  conn.execute("""
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      subscription_json TEXT NOT NULL,
      user_id TEXT,
      client_id TEXT,
      language TEXT NOT NULL DEFAULT 'de',
      timezone TEXT NOT NULL DEFAULT 'UTC',
      daily_time TEXT NOT NULL DEFAULT '20:00',
      daily_enabled INTEGER NOT NULL DEFAULT 1,
      user_agent TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_sent_date TEXT,
      last_sent_at INTEGER,
      last_error TEXT,
      disabled_at INTEGER
    )
  """)
  conn.execute("CREATE INDEX IF NOT EXISTS idx_push_due ON push_subscriptions(daily_enabled, disabled_at, daily_time)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_push_user_id ON push_subscriptions(user_id)")
  conn.execute("CREATE INDEX IF NOT EXISTS idx_push_client_id ON push_subscriptions(client_id)")
  conn.commit()

  ensure_security_deck_hierarchy(conn)
  conn.commit()

  conn.close()


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
  conn.execute("DELETE FROM server_video_notes")
  conn.execute("DELETE FROM server_profile_settings")
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
