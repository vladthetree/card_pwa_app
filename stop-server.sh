#!/bin/sh
# Stop EVERYTHING for the Card PWA:
#   1) the app    — frontend prod server (card-pwa-prod.service, system unit, :8444)
#   2) the server — sync backend          (card-sync-server.service + watchdog, :8787)
#
# Both are attempted even if one fails. POSIX sh (no bashisms) so it also runs
# via `sh stop-server.sh`.
set -u

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)

APP_SERVICE="${APP_SERVICE:-card-pwa-prod.service}"
SYNC_STOP="$ROOT_DIR/card-sync-server/stop-server.sh"

log() { echo "[stop-server] $*"; }

# 1) App / Frontend — system service on :8444. Needs root; `systemctl stop`
#    overrides Restart=always, so it stays down.
stop_app() {
  if ! command -v systemctl >/dev/null 2>&1; then
    log "systemctl not found, skipping app stop"
    return 0
  fi

  state=$(systemctl is-active "$APP_SERVICE" 2>/dev/null || true)
  case "$state" in
    active|activating|reloading)
      log "Stopping app: $APP_SERVICE (state=$state)"
      if [ "$(id -u)" -eq 0 ]; then
        systemctl stop "$APP_SERVICE"
      else
        sudo systemctl stop "$APP_SERVICE"
      fi
      ;;
    *)
      log "App $APP_SERVICE already stopped (state=${state:-unknown})"
      ;;
  esac
}

# 2) Server / Backend — delegate to the sync-server stop script
#    (handles user units, watchdog, manual python procs and port 8787).
stop_sync() {
  if [ ! -x "$SYNC_STOP" ]; then
    log "sync stop script missing or not executable: $SYNC_STOP" >&2
    return 1
  fi
  log "Stopping sync server via $SYNC_STOP"
  "$SYNC_STOP" "$@"
}

rc=0
stop_app || { log "app stop reported an error"; rc=1; }
stop_sync "$@" || { log "sync stop reported an error"; rc=1; }

if [ "$rc" -eq 0 ]; then
  log "done — app and sync server stopped."
else
  log "done with errors (rc=$rc) — check messages above."
fi
exit "$rc"
