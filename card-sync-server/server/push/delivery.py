"""Storage and delivery helpers for Card_PWA Web Push notifications."""
from __future__ import annotations

import json
import sqlite3
import time
from datetime import timezone

try:
  from pywebpush import WebPushException, webpush
except Exception:  # pragma: no cover - exercised in environments without pywebpush
  WebPushException = Exception
  webpush = None

from server.config import LOGGER, WEB_PUSH_VAPID_PRIVATE_KEY, WEB_PUSH_VAPID_SUBJECT
from server.db.connection import open_db
from server.push.motivation import (
  build_daily_motivation_payload,
  has_passed_daily_time,
  local_date_key,
  normalize_daily_time,
  normalize_language,
  utc_now,
)


def _now_ms() -> int:
  return int(time.time() * 1000)


def normalize_subscription_payload(data: dict, user_id: str | None = None) -> tuple[dict | None, str | None]:
  if not isinstance(data, dict):
    return None, "invalid_json_object"

  subscription = data.get("subscription")
  if not isinstance(subscription, dict):
    return None, "missing_subscription"

  endpoint = str(subscription.get("endpoint") or "").strip()
  keys = subscription.get("keys")
  if not endpoint or not isinstance(keys, dict):
    return None, "invalid_subscription"
  if not str(keys.get("p256dh") or "").strip() or not str(keys.get("auth") or "").strip():
    return None, "invalid_subscription_keys"

  reminders = data.get("reminders")
  if not isinstance(reminders, dict):
    reminders = {}

  timezone_name = str(data.get("timezone") or "UTC").strip()[:80] or "UTC"
  user_agent = str(data.get("userAgent") or "").strip()[:500]
  client_id = str(data.get("clientId") or "").strip()[:120]
  daily_time = normalize_daily_time(reminders.get("time"))

  return {
    "endpoint": endpoint,
    "subscription_json": json.dumps(subscription, ensure_ascii=False, sort_keys=True),
    "user_id": user_id,
    "client_id": client_id,
    "language": normalize_language(data.get("language")),
    "timezone": timezone_name,
    "daily_time": daily_time,
    "daily_enabled": 1 if reminders.get("enabled") is not False else 0,
    "user_agent": user_agent,
  }, None


def upsert_push_subscription(conn: sqlite3.Connection, record: dict) -> None:
  now = _now_ms()
  conn.execute(
    """
    INSERT INTO push_subscriptions (
      endpoint, subscription_json, user_id, client_id, language, timezone,
      daily_time, daily_enabled, user_agent, created_at, updated_at,
      last_error, disabled_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
    ON CONFLICT(endpoint) DO UPDATE SET
      subscription_json=excluded.subscription_json,
      user_id=COALESCE(excluded.user_id, push_subscriptions.user_id),
      client_id=excluded.client_id,
      language=excluded.language,
      timezone=excluded.timezone,
      daily_time=excluded.daily_time,
      daily_enabled=excluded.daily_enabled,
      user_agent=excluded.user_agent,
      updated_at=excluded.updated_at,
      last_error=NULL,
      disabled_at=NULL
    """,
    (
      record["endpoint"],
      record["subscription_json"],
      record["user_id"],
      record["client_id"],
      record["language"],
      record["timezone"],
      record["daily_time"],
      record["daily_enabled"],
      record["user_agent"],
      now,
      now,
    )
  )


def _send_web_push(subscription_json: str, payload: dict) -> None:
  if webpush is None:
    raise RuntimeError("web_push_dependency_missing")
  if not WEB_PUSH_VAPID_PRIVATE_KEY:
    raise RuntimeError("web_push_vapid_private_key_missing")

  webpush(
    subscription_info=json.loads(subscription_json),
    data=json.dumps(payload, ensure_ascii=False),
    vapid_private_key=WEB_PUSH_VAPID_PRIVATE_KEY,
    vapid_claims={"sub": WEB_PUSH_VAPID_SUBJECT},
    ttl=60 * 60 * 12,
  )


def _is_expired_push_error(err: Exception) -> bool:
  response = getattr(err, "response", None)
  status_code = getattr(response, "status_code", None)
  return int(status_code or 0) in (404, 410)


def send_due_motivation_pushes(limit: int = 100, now=None) -> dict:
  now_utc = now or utc_now()
  if now_utc.tzinfo is None:
    now_utc = now_utc.replace(tzinfo=timezone.utc)
  else:
    now_utc = now_utc.astimezone(timezone.utc)

  conn = open_db(sqlite3.Row)
  stats = {
    "checked": 0,
    "sent": 0,
    "skipped": 0,
    "failed": 0,
    "disabled": 0,
  }

  try:
    rows = conn.execute(
      """
      SELECT endpoint, subscription_json, language, timezone, daily_time, last_sent_date
      FROM push_subscriptions
      WHERE daily_enabled=1 AND disabled_at IS NULL
      ORDER BY updated_at ASC
      LIMIT ?
      """,
      (max(1, int(limit)),)
    ).fetchall()

    for row in rows:
      stats["checked"] += 1
      date_key = local_date_key(now_utc, row["timezone"])
      if row["last_sent_date"] == date_key:
        stats["skipped"] += 1
        continue
      if not has_passed_daily_time(now_utc, row["timezone"], row["daily_time"]):
        stats["skipped"] += 1
        continue

      payload = build_daily_motivation_payload(row["language"], date_key, row["endpoint"])
      try:
        _send_web_push(row["subscription_json"], payload)
        conn.execute(
          """
          UPDATE push_subscriptions
          SET last_sent_date=?, last_sent_at=?, last_error=NULL
          WHERE endpoint=?
          """,
          (date_key, _now_ms(), row["endpoint"])
        )
        stats["sent"] += 1
      except Exception as err:
        error_text = str(err)[:300] or err.__class__.__name__
        if _is_expired_push_error(err):
          conn.execute(
            "UPDATE push_subscriptions SET disabled_at=?, last_error=? WHERE endpoint=?",
            (_now_ms(), error_text, row["endpoint"])
          )
          stats["disabled"] += 1
        else:
          conn.execute(
            "UPDATE push_subscriptions SET last_error=? WHERE endpoint=?",
            (error_text, row["endpoint"])
          )
          stats["failed"] += 1
          LOGGER.warning("PUSH_SEND_FAILED endpoint=%s error=%s", row["endpoint"][:80], error_text)

    conn.commit()
    return {"ok": True, **stats}
  finally:
    conn.close()
