#!/usr/bin/env bash

if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="${SERVICE_NAME:-card-sync-server.service}"
WATCHDOG_SERVICE="${WATCHDOG_SERVICE:-card-sync-watchdog.service}"
WATCHDOG_TIMER="${WATCHDOG_TIMER:-card-sync-watchdog.timer}"
UNIT_DIR="$HOME/.config/systemd/user"
HEALTH_WAIT_SECONDS="${HEALTH_WAIT_SECONDS:-30}"

log() {
  echo "[run-server] $*"
}

ensure_unit_files_installed() {
  mkdir -p "$UNIT_DIR"
  cp "$ROOT_DIR/ops/card-sync-server.service" "$UNIT_DIR/"
  cp "$ROOT_DIR/ops/card-sync-watchdog.service" "$UNIT_DIR/"
  cp "$ROOT_DIR/ops/card-sync-watchdog.timer" "$UNIT_DIR/"
  chmod +x "$ROOT_DIR/ops/watchdog_healthcheck.sh"
}

restart_systemd_stack() {
  if ! command -v systemctl >/dev/null 2>&1; then
    log "systemctl not found. Falling back to foreground start via run-https.sh"
    exec "$ROOT_DIR/run-https.sh"
  fi

  ensure_unit_files_installed

  log "Reloading systemd user daemon"
  systemctl --user daemon-reload

  # Ensure units are enabled so they come back after reboot.
  systemctl --user enable "$SERVICE_NAME" >/dev/null
  systemctl --user enable "$WATCHDOG_TIMER" >/dev/null

  # Restart full stack: server + watchdog timer/service chain.
  log "Restarting $SERVICE_NAME"
  systemctl --user restart "$SERVICE_NAME"

  log "Restarting $WATCHDOG_TIMER"
  systemctl --user restart "$WATCHDOG_TIMER"

  # Trigger watchdog once immediately (timer will continue afterwards).
  log "Starting one-shot $WATCHDOG_SERVICE"
  systemctl --user start "$WATCHDOG_SERVICE" || true
}

print_status() {
  if command -v systemctl >/dev/null 2>&1; then
    local s_state t_state w_state
    s_state="$(systemctl --user is-active "$SERVICE_NAME" 2>/dev/null || true)"
    t_state="$(systemctl --user is-active "$WATCHDOG_TIMER" 2>/dev/null || true)"
    w_state="$(systemctl --user is-active "$WATCHDOG_SERVICE" 2>/dev/null || true)"
    log "States: $SERVICE_NAME=$s_state, $WATCHDOG_TIMER=$t_state, $WATCHDOG_SERVICE=$w_state"
  fi

  if [[ -x "$ROOT_DIR/ops/check_server_running.sh" ]]; then
    "$ROOT_DIR/ops/check_server_running.sh" || true
  fi
}

wait_for_health() {
  if [[ ! -x "$ROOT_DIR/ops/check_server_running.sh" ]]; then
    return 0
  fi

  local elapsed=0
  while (( elapsed < HEALTH_WAIT_SECONDS )); do
    if "$ROOT_DIR/ops/check_server_running.sh" >/dev/null 2>&1; then
      log "Healthcheck is up"
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  log "Healthcheck did not become ready within ${HEALTH_WAIT_SECONDS}s"
  "$ROOT_DIR/ops/check_server_running.sh" || true
}

main() {
  restart_systemd_stack
  wait_for_health
  print_status
}

main "$@"
