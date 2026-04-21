#!/bin/sh
set -eu

SERVICE_NAME="${SERVICE_NAME:-card-sync-server.service}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-3}"
ROOT_DIR="${ROOT_DIR:-$HOME/card_pwa_app/card-sync-server}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.sync-server}"

env_truthy() {
  case "${1:-}" in
    1|true|TRUE|yes|YES|on|ON) return 0 ;;
    *) return 1 ;;
  esac
}

if [ -f "$ENV_FILE" ]; then
  set -a
  . "$ENV_FILE"
  set +a
fi

HEALTH_SCHEME="http"
CURL_INSECURE=""
if env_truthy "${SYNC_USE_HTTPS:-0}"; then
  HEALTH_SCHEME="https"
  CURL_INSECURE="-k"
fi

HEALTH_URL="${HEALTH_URL:-${HEALTH_SCHEME}://127.0.0.1:${SYNC_PORT:-8787}/health}"

service_state="$(systemctl --user is-active "$SERVICE_NAME" 2>/dev/null || true)"

if curl -fsS $CURL_INSECURE --max-time "$HEALTH_TIMEOUT" "$HEALTH_URL" >/dev/null 2>&1; then
  health_ok="yes"
else
  health_ok="no"
fi

if { [ "$service_state" = "active" ] || [ "$service_state" = "activating" ]; } && [ "$health_ok" = "yes" ]; then
  echo "RUNNING: service=$SERVICE_NAME state=$service_state health=ok url=$HEALTH_URL"
  exit 0
fi

echo "NOT_RUNNING: service=$SERVICE_NAME state=${service_state:-unknown} health=$health_ok url=$HEALTH_URL"
exit 1
