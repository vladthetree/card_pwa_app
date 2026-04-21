#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.sync-server}"
SERVICE_NAME="${SERVICE_NAME:-card-sync-server.service}"
WATCHDOG_SERVICE="${WATCHDOG_SERVICE:-card-sync-watchdog.service}"
WATCHDOG_TIMER="${WATCHDOG_TIMER:-card-sync-watchdog.timer}"

log() {
  echo "[stop-server] $*"
}

load_env() {
  if [ -f "$ENV_FILE" ]; then
    set -a
    . "$ENV_FILE"
    set +a
    log "Loaded env: $ENV_FILE"
  fi
}

stop_systemd_units() {
  if ! command -v systemctl >/dev/null 2>&1; then
    log "systemctl not found, skipping systemd unit stop"
    return 0
  fi

  for unit in "$WATCHDOG_TIMER" "$WATCHDOG_SERVICE" "$SERVICE_NAME"; do
    state="$(systemctl --user is-active "$unit" 2>/dev/null || true)"
    case "$state" in
      active|activating|deactivating)
      log "Stopping $unit (state=$state)"
      systemctl --user stop "$unit" || true
      ;;
      *)
      log "$unit already stopped (state=${state:-unknown})"
      ;;
    esac
  done
}

kill_manual_processes() {
  pids="$(pgrep -f "python3 .*sync_server.py|python .*sync_server.py|sync_server.py" || true)"
  if [ -n "$pids" ]; then
    log "Stopping manual sync_server.py process(es): $pids"
    kill $pids 2>/dev/null || true
    sleep 1

    still="$(pgrep -f "python3 .*sync_server.py|python .*sync_server.py|sync_server.py" || true)"
    if [ -n "$still" ]; then
      log "Force killing remaining process(es): $still"
      kill -9 $still 2>/dev/null || true
    fi
  else
    log "No manual sync_server.py process found"
  fi
}

free_server_port_if_needed() {
  port="${SYNC_PORT:-8787}"
  if command -v fuser >/dev/null 2>&1; then
    port_pids="$(fuser "${port}"/tcp 2>/dev/null || true)"
    if [ -n "$port_pids" ]; then
      log "Port $port still occupied by PID(s): $port_pids. Sending SIGTERM."
      kill $port_pids 2>/dev/null || true
      sleep 1

      remain="$(fuser "${port}"/tcp 2>/dev/null || true)"
      if [ -n "$remain" ]; then
        log "Port $port still busy. Sending SIGKILL to: $remain"
        kill -9 $remain 2>/dev/null || true
      fi
    else
      log "Port $port is free"
    fi
  else
    log "fuser not found, skipping direct port cleanup"
  fi
}

print_status() {
  port="${SYNC_PORT:-8787}"

  if command -v systemctl >/dev/null 2>&1; then
    s_state="$(systemctl --user is-active "$SERVICE_NAME" 2>/dev/null || true)"
    w_state="$(systemctl --user is-active "$WATCHDOG_SERVICE" 2>/dev/null || true)"
    t_state="$(systemctl --user is-active "$WATCHDOG_TIMER" 2>/dev/null || true)"
    log "Service states: $SERVICE_NAME=$s_state, $WATCHDOG_SERVICE=$w_state, $WATCHDOG_TIMER=$t_state"
  fi

  process_state="stopped"
  if pgrep -f "python3 .*sync_server.py|python .*sync_server.py|sync_server.py" >/dev/null 2>&1; then
    process_state="running"
  fi

  port_state="free"
  if command -v fuser >/dev/null 2>&1 && fuser "${port}"/tcp >/dev/null 2>&1; then
    port_state="in-use"
  fi

  log "Process state: $process_state"
  log "Port $port: $port_state"
}

main() {
  load_env
  stop_systemd_units
  kill_manual_processes
  free_server_port_if_needed
  print_status
}

main "$@"
