"""Background scheduler for daily Web Push motivation delivery."""
import threading
import time

from server.common.helpers import env_int, env_truthy
from server.config import LOGGER, PUSH_DAILY_POLL_SECONDS, PUSH_DAILY_SCHEDULER_ENABLED
from server.push.delivery import send_due_motivation_pushes


def start_push_scheduler() -> None:
  if not env_truthy(PUSH_DAILY_SCHEDULER_ENABLED):
    LOGGER.info("PUSH_SCHEDULER  disabled")
    return

  poll_seconds = max(30, env_int(PUSH_DAILY_POLL_SECONDS, 60))

  def run_loop():
    LOGGER.info("PUSH_SCHEDULER  started  pollSeconds=%s", poll_seconds)
    while True:
      try:
        result = send_due_motivation_pushes()
        if result.get("sent") or result.get("failed") or result.get("disabled"):
          LOGGER.info("PUSH_SCHEDULER  result=%s", result)
      except Exception:
        LOGGER.exception("PUSH_SCHEDULER_FAILED")
      time.sleep(poll_seconds)

  thread = threading.Thread(target=run_loop, name="daily-push-scheduler", daemon=True)
  thread.start()
