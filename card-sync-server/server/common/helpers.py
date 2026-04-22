import time


def client_short(client_id):
  if not client_id:
    return "?"
  txt = str(client_id)
  if len(txt) <= 12:
    return txt
  return f"{txt[:8]}...{txt[-4:]}"


def now_ms():
  return int(time.time() * 1000)


def env_truthy(value):
  return str(value).strip().lower() in ("1", "true", "yes", "on")


def env_int(value, default):
  try:
    return int(value)
  except Exception:
    return default


def parse_int(value, default=0, min_value=None, max_value=None):
  try:
    parsed = int(value)
  except Exception:
    parsed = default
  if min_value is not None:
    parsed = max(min_value, parsed)
  if max_value is not None:
    parsed = min(max_value, parsed)
  return parsed


def to_int_or_default(value, default=0):
  try:
    if value is None:
      return default
    return int(float(value))
  except Exception:
    return default
