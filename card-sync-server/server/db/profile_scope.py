def scope_user_id(user_id):
  """Normalize nullable legacy user ids for profile-scoped state tables."""
  return str(user_id or "")


def profile_auth_required(conn):
  """Return True once the server contains any profile data."""
  try:
    return (conn.execute("SELECT 1 FROM users LIMIT 1").fetchone() is not None)
  except Exception:
    return False


def has_profile_scoped_primary_key(conn, table_name):
  rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
  pk_cols = [row[1] for row in sorted((row for row in rows if row[5] > 0), key=lambda row: row[5])]
  return pk_cols == ["user_id", "id"]


def ensure_profile_scoped_state_tables(conn):
  """Migrate state tables from global id PKs to (user_id, id) PKs."""
  if not has_profile_scoped_primary_key(conn, "server_decks"):
    conn.execute("""
      CREATE TABLE server_decks_profile_scoped (
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
    conn.execute("""
      INSERT OR REPLACE INTO server_decks_profile_scoped
      (id, name, created_at, source, updated_at, deleted_at, last_source_client, user_id)
      SELECT id, name, created_at, source, updated_at, deleted_at, last_source_client, COALESCE(user_id, '')
      FROM server_decks
    """)
    conn.execute("DROP TABLE server_decks")
    conn.execute("ALTER TABLE server_decks_profile_scoped RENAME TO server_decks")
    conn.commit()

  if not has_profile_scoped_primary_key(conn, "server_cards"):
    conn.execute("""
      CREATE TABLE server_cards_profile_scoped (
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
    conn.execute("""
      INSERT OR REPLACE INTO server_cards_profile_scoped
      (id, note_id, deck_id, front, back, tags_json, extra_json, type, queue, due, due_at, interval, factor,
       stability, difficulty, retrievability, reps, lapses, algorithm, metadata_json, is_deleted, created_at,
       updated_at, deleted_at, last_source_client, user_id)
      SELECT id, note_id, deck_id, front, back, tags_json, extra_json, type, queue, due, due_at, interval, factor,
       stability, difficulty, retrievability, reps, lapses, algorithm, metadata_json, IFNULL(is_deleted, 0),
       created_at, updated_at, deleted_at, last_source_client, COALESCE(user_id, '')
      FROM server_cards
    """)
    conn.execute("DROP TABLE server_cards")
    conn.execute("ALTER TABLE server_cards_profile_scoped RENAME TO server_cards")
    conn.commit()
