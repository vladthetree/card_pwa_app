"""Web Push subscription and delivery routes."""
import sqlite3

from server.config import API_TOKEN
from server.db.connection import open_db
from server.logging_setup import log
from server.push.delivery import (
  normalize_subscription_payload,
  send_due_motivation_pushes,
  upsert_push_subscription,
)


class PushRoutesMixin:
  # ---------------------------------------------------------------------------
  # POST /push/subscribe
  # ---------------------------------------------------------------------------

  def _route_push_subscribe(self):
    auth_header = self.headers.get("Authorization", "")
    if auth_header:
      if not self._resolve_auth():
        self._send_json(401, {"ok": False, "error": "unauthorized"})
        return
    elif API_TOKEN:
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    data, error_status, error_code = self._read_json_body()
    if error_code:
      self._send_json(error_status, {"ok": False, "error": error_code})
      return

    record, error = normalize_subscription_payload(data, user_id=self._current_user_id)
    if error or record is None:
      self._send_json(400, {"ok": False, "error": error or "invalid_subscription"})
      return

    conn = open_db(sqlite3.Row)
    try:
      upsert_push_subscription(conn, record)
      conn.commit()
      log(
        "PUSH_SUBSCRIBE  endpoint=%s  client=%s  lang=%s  time=%s  tz=%s  user=%s" % (
          record["endpoint"][:80],
          record["client_id"][:16],
          record["language"],
          record["daily_time"],
          record["timezone"],
          (record["user_id"] or "")[:16],
        )
      )
      self._send_json(200, {
        "ok": True,
        "stored": True,
        "dailyTime": record["daily_time"],
        "timezone": record["timezone"],
      })
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # POST /push/send-due  — manual trigger for cron/admin diagnostics
  # ---------------------------------------------------------------------------

  def _route_push_send_due(self):
    if API_TOKEN and not self._check_auth():
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    result = send_due_motivation_pushes()
    self._send_json(200, result)
