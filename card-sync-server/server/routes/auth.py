"""Auth + profile routes: profile creation, pairing, recovery, revoke, device
removal, profile switch/join, and the public/default profile lookups.
"""
import sqlite3
import time
from urllib.parse import urlparse, parse_qs

from server.config import DEFAULT_PROFILE_NAME
from server.common.helpers import client_short as _client_short, parse_int
from server.auth.tokens import (
  generate_pairing_code,
  generate_recovery_code,
  hash_token,
  issue_device_token,
)
from server.logging_setup import log
from server.db.connection import open_db
from server.domain.decks import (
  active_deck_ids_with_cards_or_descendants,
  get_default_profile_id,
)
from server.domain.card_catalog import catalog_enabled, ensure_user_card_references


class AuthRoutesMixin:
  def _route_auth_default_profile(self):
    conn = open_db(sqlite3.Row)
    try:
      default_id = get_default_profile_id(conn)
      if not default_id:
        self._send_json(404, {"ok": False, "error": "no_default_profile"})
        return
      row = conn.execute(
        "SELECT user_id, profile_name FROM users WHERE user_id=?", (default_id,)
      ).fetchone()
      self._send_json(200, {
        "ok": True,
        "userId": row["user_id"],
        "profileName": row["profile_name"] or DEFAULT_PROFILE_NAME,
      })
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # GET /auth/public-profiles  — list all profiles with deck counts
  # (requires auth: die globale Profilliste inkl. userIds ist der Schlüssel
  # zum Join-Flow und gehört nicht unauthentifiziert ins WLAN)
  # ---------------------------------------------------------------------------

  def _route_auth_public_profiles(self):
    if not self._resolve_auth():
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    conn = open_db(sqlite3.Row)
    try:
      rows = conn.execute("""
        SELECT
          u.user_id,
          COALESCE(NULLIF(TRIM(u.profile_name), ''), NULLIF(TRIM(u.display_name), ''), 'Profil ' || SUBSTR(u.user_id, 1, 8)) AS profile_name,
          (SELECT COUNT(*) FROM server_decks WHERE user_id = u.user_id AND deleted_at IS NULL) AS deck_count
        FROM users u
        ORDER BY
          CASE WHEN TRIM(COALESCE(u.profile_name, '')) = ? THEN 0 ELSE 1 END,
          COALESCE(u.last_seen_at, u.created_at) DESC
      """, (DEFAULT_PROFILE_NAME,)).fetchall()
      profiles = [{
        "userId": row["user_id"],
        "profileName": row["profile_name"],
        "deckCount": len(active_deck_ids_with_cards_or_descendants(conn, row["user_id"])),
        "isDefault": row["profile_name"] == DEFAULT_PROFILE_NAME,
      } for row in rows]
      self._send_json(200, {"ok": True, "profiles": profiles})
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # POST /auth/profile/join  — join a profile. Alle Profile (Default wie
  # persönliche) sind ohne Nachweis beitretbar (Zero-Touch-Onboarding).
  # ---------------------------------------------------------------------------

  def _route_auth_profile_join(self):
    data, error_status, error_code = self._read_json_body()
    if error_code:
      self._send_json(error_status, {"ok": False, "error": error_code})
      return
    if not isinstance(data, dict):
      self._send_json(400, {"ok": False, "error": "invalid_json_object"})
      return

    user_id = str(data.get("userId") or "").strip()
    device_id = str(data.get("deviceId") or "").strip()
    device_label = str(data.get("deviceLabel") or "Browser").strip()[:80]
    client_ip = self.client_address[0] if self.client_address else "?"

    if not user_id or not device_id:
      self._send_json(400, {"ok": False, "error": "missing_fields"})
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

      # Revoke existing tokens for this device before issuing the new binding.
      # issue_device_token upserts the devices row; deleting it here would break
      # the device_tokens -> devices foreign key for devices that already synced.
      conn.execute(
        "UPDATE device_tokens SET revoked_at=? WHERE device_id=? AND revoked_at IS NULL",
        (now, device_id)
      )

      profile_token = issue_device_token(conn, user_id, device_id, device_label, now)
      conn.commit()

      profile_name = user["profile_name"] or user["display_name"] or f"Profil {user_id[:8]}"
      log(f"AUTH_PROFILE_JOIN  ip={client_ip}  user={_client_short(user_id)}  device={_client_short(device_id)}")
      self._send_json(200, {
        "ok": True,
        "userId": user_id,
        "profileName": profile_name,
        "deviceId": device_id,
        "profileToken": profile_token,
      })
    except sqlite3.IntegrityError:
      conn.rollback()
      self._send_json(409, {"ok": False, "error": "join_conflict"})
    finally:
      conn.close()

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

    if requested_profile_name.strip() == DEFAULT_PROFILE_NAME:
      self._send_json(409, {"ok": False, "error": "profile_name_reserved"})
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
        log(
          f"AUTH_PROFILE_CREATE_REJECTED  ip={client_ip}  reason=device_already_linked  "
          f"user={_client_short(existing_device['user_id'])}  device={_client_short(device_id)}"
        )
        self._send_json(409, {
          "ok": False,
          "error": "device_already_linked",
          "userId": existing_device["user_id"],
          "profileName": existing_device["profile_name"],
          "deviceId": device_id,
        })
        return

      conn.execute(
        """INSERT INTO users (user_id, profile_name, recovery_code_hash, created_at, last_seen_at)
          VALUES (?, ?, ?, ?, ?)""",
        (user_id, profile_name, recovery_hash, now, now)
      )
      if catalog_enabled(conn):
        ensure_user_card_references(conn, user_id)
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
