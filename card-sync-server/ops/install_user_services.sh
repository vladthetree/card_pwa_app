#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT_DIR="$HOME/.config/systemd/user"
UNIT_SOURCE_ROOT="%h/card_pwa_app/card-sync-server"

mkdir -p "$UNIT_DIR"
mkdir -p "$ROOT_DIR/logs"

render_unit() {
  local source="$1"
  local target="$2"
  local tmp
  local escaped_root

  tmp="$(mktemp)"
  escaped_root="$(printf '%s' "$ROOT_DIR" | sed 's/[&|]/\\&/g')"
  sed "s|$UNIT_SOURCE_ROOT|$escaped_root|g" "$source" > "$tmp"

  if [ -f "$target" ] && cmp -s "$tmp" "$target"; then
    rm -f "$tmp"
    return
  fi

  mv "$tmp" "$target"
}

render_unit "$ROOT_DIR/ops/card-sync-server.service" "$UNIT_DIR/card-sync-server.service"
render_unit "$ROOT_DIR/ops/card-sync-watchdog.service" "$UNIT_DIR/card-sync-watchdog.service"
render_unit "$ROOT_DIR/ops/card-sync-watchdog.timer" "$UNIT_DIR/card-sync-watchdog.timer"
chmod +x "$ROOT_DIR/ops/watchdog_healthcheck.sh"

systemctl --user daemon-reload
systemctl --user enable card-sync-server.service >/dev/null
systemctl --user restart card-sync-server.service
systemctl --user enable --now card-sync-watchdog.timer >/dev/null

echo "Installed and started:"
echo "  - card-sync-server.service"
echo "  - card-sync-watchdog.timer"
echo
echo "Status checks:"
echo "  systemctl --user status card-sync-server.service"
echo "  systemctl --user status card-sync-watchdog.timer"
echo
echo "Logs:"
echo "  tail -f $ROOT_DIR/logs/systemd-sync-server.out.log"
echo "  tail -f $ROOT_DIR/logs/systemd-sync-server.err.log"
echo "  tail -f $ROOT_DIR/logs/watchdog.log"
