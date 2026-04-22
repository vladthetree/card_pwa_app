import hashlib
import secrets
import time
import uuid


def generate_device_token() -> str:
  """Return a new opaque device token prefixed with 'dt_'."""
  return "dt_" + secrets.token_urlsafe(32)


def generate_recovery_code() -> str:
  """Return a human-readable 24-char recovery code in groups of 4."""
  raw = secrets.token_urlsafe(18)[:24]
  groups = [raw[i:i+4].upper() for i in range(0, 24, 4)]
  return "-".join(groups)


def generate_pairing_code() -> str:
  """Return an 8-char uppercase pairing code."""
  alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return "".join(secrets.choice(alphabet) for _ in range(8))


def hash_token(token: str) -> str:
  """Return a SHA-256 hex digest of the token."""
  return hashlib.sha256(token.encode("utf-8")).hexdigest()


def resolve_device_token(conn, token: str):
  """Resolve a 'dt_...' bearer token to (user_id, device_id) or None."""
  if not token or not token.startswith("dt_"):
    return None
  token_hash = hash_token(token)
  row = conn.execute(
    """SELECT dt.device_id, d.user_id FROM device_tokens dt
       JOIN devices d ON d.device_id = dt.device_id
       WHERE dt.token_hash = ? AND dt.revoked_at IS NULL
         AND (dt.expires_at IS NULL OR dt.expires_at > ?)""",
    (token_hash, int(time.time() * 1000))
  ).fetchone()
  if not row:
    return None
  return (row[1], row[0])  # (user_id, device_id)


def issue_device_token(conn, user_id, device_id, device_label, now):
  """Bind device to user, revoke old device tokens, and return a new token."""
  profile_token = generate_device_token()
  token_hash = hash_token(profile_token)
  token_id = str(uuid.uuid4())

  conn.execute(
    """
    INSERT INTO devices (device_id, user_id, label, linked_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(device_id) DO UPDATE SET
      user_id=excluded.user_id,
      label=excluded.label,
      last_seen_at=excluded.last_seen_at
    """,
    (device_id, user_id, device_label, now, now)
  )
  conn.execute(
    "UPDATE device_tokens SET revoked_at=? WHERE device_id=? AND revoked_at IS NULL",
    (now, device_id)
  )
  conn.execute(
    """INSERT INTO device_tokens (token_id, device_id, token_hash, created_at)
       VALUES (?, ?, ?, ?)""",
    (token_id, device_id, token_hash, now)
  )
  conn.execute("UPDATE users SET last_seen_at=? WHERE user_id=?", (now, user_id))
  return profile_token
