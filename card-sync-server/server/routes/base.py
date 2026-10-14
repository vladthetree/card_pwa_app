"""HTTP infrastructure shared by every route group: CORS, JSON/no-content
responses, request-body reading, and the auth resolution (legacy API token or
device token). Mixed into Handler alongside the route mixins.
"""
import hmac
import json
import sqlite3
import time
from urllib.parse import urlparse

from server.config import API_TOKEN, CORS_ALLOWED_ORIGINS, MAX_BODY_BYTES
from server.common.helpers import env_int
from server.logging_setup import log
from server.db.connection import open_db
from server.db.profile_scope import profile_auth_required
from server.auth.tokens import resolve_device_token


class BaseRoutesMixin:
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
    """
    Resolve the Access-Control-Allow-Origin value, or None to send no CORS
    headers at all (browser then blocks the cross-origin request).

    The app's normal flow (Node prod-server.mjs proxying /sync, /auth, /push
    same-origin) never needs CORS — the browser only consults these headers
    for genuine cross-origin calls, e.g. the documented direct-LAN-endpoint
    fallback in .env.example. Without an explicit SYNC_CORS_ALLOWED_ORIGINS,
    default to deny rather than "*": this server binds 0.0.0.0 by default,
    so an unconfigured wildcard would let *any* website's script call the
    auth/sync/push API of every device on the LAN.
    """
    allowed = [o.strip() for o in str(CORS_ALLOWED_ORIGINS).split(",") if o.strip()]
    if "*" in allowed:
      return "*"
    if not allowed:
      return None
    origin = self.headers.get("Origin", "")
    if origin in allowed:
      return origin
    return allowed[0]

  def _send_cors_headers(self):
    origin = self._cors_origin()
    if origin is None:
      return
    self.send_header("Access-Control-Allow-Origin", origin)
    self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Idempotency-Key, Authorization")
    self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    # Private Network Access: only grant it alongside an actual allow-listed
    # origin (never as a blanket grant to unmatched/default requests).
    self.send_header("Access-Control-Allow-Private-Network", "true")
    if origin != "*":
      self.send_header("Vary", "Origin")

  def _send_security_headers(self):
    """
    Defense-in-depth for direct access: SYNC_HOST defaults to 0.0.0.0, so this
    API can be reached without going through the Node proxy in front of the
    PWA (scripts/prod-server.mjs), which already sets the app's security
    headers. Keep both layers in sync rather than relying solely on the proxy.
    """
    self.send_header("X-Content-Type-Options", "nosniff")
    self.send_header("X-Frame-Options", "DENY")
    self.send_header("Referrer-Policy", "no-referrer")
    self.send_header("Cache-Control", "no-store")
    self.send_header("Strict-Transport-Security", "max-age=15552000; includeSubDomains")

  def _send_json(self, status, data):
    body = json.dumps(data).encode("utf-8")
    self.send_response(status)
    self.send_header("Content-Type",   "application/json; charset=utf-8")
    self.send_header("Content-Length", str(len(body)))
    self._send_security_headers()
    self._send_cors_headers()
    self.end_headers()
    self.wfile.write(body)

  def _send_no_content(self):
    self.send_response(204)
    self._send_security_headers()
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
