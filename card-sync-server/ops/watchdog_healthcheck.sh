#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$HOME/card_pwa_app/card-sync-server}"
LOG_DIR="${LOG_DIR:-$ROOT_DIR/logs}"
WATCHDOG_LOG="${WATCHDOG_LOG:-$LOG_DIR/watchdog.log}"
SERVICE_NAME="${SERVICE_NAME:-card-sync-server.service}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.sync-server}"

env_truthy() {
  case "${1:-}" in
    1|true|TRUE|yes|YES|on|ON) return 0 ;;
    *) return 1 ;;
  esac
}

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

HEALTH_SCHEME="http"
CURL_INSECURE=""
if env_truthy "${SYNC_USE_HTTPS:-0}"; then
  HEALTH_SCHEME="https"
  CURL_INSECURE="-k"
fi

HEALTH_URL="${HEALTH_URL:-${HEALTH_SCHEME}://127.0.0.1:${SYNC_PORT:-8787}/health}"

mkdir -p "$LOG_DIR"

ts() {
  date '+%Y-%m-%d %H:%M:%S'
}

log_line() {
  printf '%s %s\n' "$(ts)" "$1" >> "$WATCHDOG_LOG"
}

if curl -fsS $CURL_INSECURE --max-time 5 "$HEALTH_URL" >/dev/null; then
  exit 0
fi

log_line "HEALTHCHECK_FAILED url=$HEALTH_URL action=restart"
if systemctl --user restart "$SERVICE_NAME"; then
  log_line "RESTART_OK service=$SERVICE_NAME"
else
  log_line "RESTART_FAILED service=$SERVICE_NAME"
fi
