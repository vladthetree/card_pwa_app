#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT_DIR="$HOME/.config/systemd/user"

mkdir -p "$UNIT_DIR"
mkdir -p "$ROOT_DIR/logs"

cp "$ROOT_DIR/ops/card-sync-server.service" "$UNIT_DIR/"
cp "$ROOT_DIR/ops/card-sync-watchdog.service" "$UNIT_DIR/"
cp "$ROOT_DIR/ops/card-sync-watchdog.timer" "$UNIT_DIR/"
chmod +x "$ROOT_DIR/ops/watchdog_healthcheck.sh"

systemctl --user daemon-reload
systemctl --user enable --now card-sync-server.service
systemctl --user enable --now card-sync-watchdog.timer

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
