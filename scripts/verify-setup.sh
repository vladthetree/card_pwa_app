#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/card_pwa"
BACKEND_DIR="$ROOT_DIR/card-sync-server"

errors=0
warnings=0

ok() { printf 'OK   %s\n' "$*"; }
warn() { warnings=$((warnings + 1)); printf 'WARN %s\n' "$*" >&2; }
fail() { errors=$((errors + 1)); printf 'FAIL %s\n' "$*" >&2; }

need_cmd() {
  if command -v "$1" >/dev/null 2>&1; then
    ok "command available: $1"
  else
    fail "missing command: $1"
  fi
}

check_shell() {
  local file="$1"
  if [ ! -f "$file" ]; then
    warn "script missing: ${file#$ROOT_DIR/}"
    return
  fi
  if bash -n "$file"; then
    ok "bash syntax: ${file#$ROOT_DIR/}"
  else
    fail "bash syntax: ${file#$ROOT_DIR/}"
  fi
}

check_text() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if grep -q "$pattern" "$file"; then
    ok "$label"
  else
    fail "$label"
  fi
}

printf 'Card PWA setup verification\n'
printf 'Root: %s\n\n' "$ROOT_DIR"

for cmd in bash node npm python3 openssl curl; do
  need_cmd "$cmd"
done

if command -v systemctl >/dev/null 2>&1; then
  ok "command available: systemctl"
else
  warn "systemctl unavailable; systemd service install cannot be verified here"
fi

if command -v sudo >/dev/null 2>&1; then
  ok "command available: sudo"
else
  warn "sudo unavailable; frontend system service install needs sudo"
fi

printf '\nShell scripts\n'
check_shell "$ROOT_DIR/setup.sh"
check_shell "$ROOT_DIR/deploy_prod.sh"
check_shell "$ROOT_DIR/stop-server.sh"
check_shell "$BACKEND_DIR/ops/install_user_services.sh"
check_shell "$BACKEND_DIR/ops/check_server_running.sh"
check_shell "$BACKEND_DIR/ops/watchdog_healthcheck.sh"
check_shell "$FRONTEND_DIR/scripts/setup-prod-cert.sh"

printf '\nConfiguration checks\n'
check_text "$ROOT_DIR/setup.sh" 'PWA_PORT="${PWA_PORT:-8444}"' "setup.sh default frontend port is 8444"
check_text "$FRONTEND_DIR/deploy/systemd/card-pwa-prod.service" 'Environment=PWA_PORT=8444' "systemd template frontend port is 8444"
check_text "$FRONTEND_DIR/scripts/prod-server.mjs" "PWA_PORT ?? '8444'" "prod server default frontend port is 8444"
check_text "$ROOT_DIR/setup.sh" 'upsert_env_var ".env.sync-server"' "setup.sh updates .env.sync-server idempotently"
check_text "$BACKEND_DIR/ops/install_user_services.sh" 'render_unit' "backend user service installer renders clone path"

printf '\nPackage checks\n'
(cd "$FRONTEND_DIR" && node -e "const p=require('./package.json'); if(!p.scripts['verify:phase5'] || !p.scripts['validate:cards']) process.exit(1)") \
  && ok "package scripts verify:phase5 and validate:cards exist" \
  || fail "package scripts verify:phase5 and validate:cards exist"

if command -v ss >/dev/null 2>&1; then
  printf '\nListening ports snapshot\n'
  ss -ltn | awk 'NR == 1 || /:8787|:8444|:8443/'
else
  warn "ss unavailable; port snapshot skipped"
fi

printf '\nSummary: %s error(s), %s warning(s)\n' "$errors" "$warnings"
if [ "$errors" -gt 0 ]; then
  exit 1
fi
