from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
import os
import ssl
import sys

# now_ms is re-exported for the maintenance scripts (scripts/*.py) that import it
# from sync_server; env_truthy/env_int are used by the startup block below.
from server.common.helpers import now_ms, env_truthy, env_int

# Runtime configuration and SY0-701 reference tables now live in server/config.py.
# Re-exported here so existing bare references and tests that monkeypatch
# sync_server.DB_PATH continue to resolve unchanged.
from server.config import (
  DB_PATH,
  HOST,
  PORT,
  API_TOKEN,
  USE_HTTPS,
  CERT_FILE,
  KEY_FILE,
  REBUILD_ON_START,
  GC_ON_START,
  GC_RETENTION_DAYS,
  GC_MIN_REMAINING,
  GC_SAFETY_WINDOW,
  SERVER_LOG_DIR,
  SERVER_LOG_FILE,
  SERVER_LOG_LEVEL,
  SERVER_LOG_KEEP_DAYS,
  DB_BUSY_TIMEOUT_MS,
  MAX_BODY_BYTES,
  CORS_ALLOWED_ORIGINS,
  LOGGER,
  HEALTH_LOG_EVERY_MS,
  DEFAULT_PROFILE_NAME,
  SY0_701_ROOT_DECKS,
  SY0_701_OBJECTIVES,
)


# --- Engine layers extracted to server/ subpackages -------------------------
# Re-exported here so the Handler methods below and the test-suite (which
# imports several of these from sync_server) keep resolving them as bare names.
from server.logging_setup import setup_logging, log, _LAST_HEALTH_LOG_BY_IP
from server.db.connection import open_db
from server.domain.decks import (
  security_objective_deck_id,
  security_objective_deck_name,
  infer_security_root_deck_name,
  infer_security_objective_code,
  is_legacy_messer_deck_name,
  legacy_messer_deck_delete_payload,
  get_default_profile_id,
  ensure_default_profile,
  ensure_security_deck_hierarchy,
  active_deck_ids_with_cards_or_descendants,
  active_deck_ids_from_bootstrap_payload,
)
from server.sync.operations import (
  apply_operation,
  _push_detail,
  _prepare_payload_for_storage,
  lww_should_apply,
  card_should_apply,
)
from server.db.schema import (
  init_db,
  rebuild_server_state,
  update_client_cursor,
  gc_sync_operations,
)


# --- Route groups extracted to server/routes/ -------------------------------
# Handler composes them; each mixin owns one slice of the endpoint surface.
from server.routes.base import BaseRoutesMixin
from server.routes.auth import AuthRoutesMixin
from server.routes.sync import SyncRoutesMixin


class Handler(AuthRoutesMixin, SyncRoutesMixin, BaseRoutesMixin, BaseHTTPRequestHandler):

  # Auth context populated by _resolve_auth().
  _current_user_id = None
  _current_device_id = None
  _legacy_auth = False

  # ---------------------------------------------------------------------------
  # Routing
  # ---------------------------------------------------------------------------

  def do_OPTIONS(self):                          # OPTIONS  *
    self._send_no_content()

  def do_GET(self):
    try:
      path = urlparse(self.path).path
      if path == "/health":                        # GET  /health
        self._route_health()
      elif path == "/auth/default-profile":       # GET  /auth/default-profile
        self._route_auth_default_profile()
      elif path == "/auth/public-profiles":       # GET  /auth/public-profiles
        self._route_auth_public_profiles()
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
      elif path == "/auth/profile/join":        # POST /auth/profile/join
        self._route_auth_profile_join()
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
    ensure_security_deck_hierarchy(conn)
    conn.commit()
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
