#!/usr/bin/env bash
#
# Card PWA – One-shot Setup
# ============================================================================
# Initialisiert das Projekt nach einem frischen `git clone` (z. B. via SSH):
#   - Backend  (card-sync-server, Python)  -> HTTPS auf Port 8787, systemd --user
#   - Frontend (card_pwa, Vite/React PWA)  -> HTTPS auf Port 8444, systemd (system)
#
# Das Script ist idempotent: bereits vorhandene Zertifikate, venv, node_modules
# und Konfig werden nicht überschrieben (außer mit --force-certs / --force-deps).
#
# Benutzung:
#   ./setup.sh                 # alles einrichten + Dienste starten
#   ./setup.sh backend         # nur das Backend
#   ./setup.sh frontend        # nur das Frontend
#   ./setup.sh --skip-systemd  # einrichten + bauen, aber keine Dienste installieren
#   ./setup.sh --force-certs   # Zertifikate neu erzeugen
#   ./setup.sh --force-deps    # Abhängigkeiten neu installieren
#   ./setup.sh --help
#
# Voraussetzungen je nach Ziel: Python 3 (Backend), Node 20.19+ oder 22.12+ + npm (Frontend),
# OpenSSL sowie für die Dienstinstallation systemctl/curl und beim Frontend sudo.
# ============================================================================

set -euo pipefail

# Bei unerwartetem Fehler eine klare Meldung statt kryptischem Abbruch.
trap 'rc=$?; printf "\n\033[1;31m✗ Setup abgebrochen (Zeile %s, Exit %s). Fehlermeldung steht oben.\033[0m\n" "$LINENO" "$rc" >&2' ERR

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/card-sync-server"
FRONTEND_DIR="$ROOT_DIR/card_pwa"
SERVICE_USER="${USER:-$(id -un)}"
SERVICE_GROUP="${SERVICE_GROUP:-$(id -gn)}"

# ── Konfig (überschreibbar via Umgebung) ────────────────────────────────────
SYNC_PORT="${SYNC_PORT:-8787}"
PWA_PORT="${PWA_PORT:-8444}"

# ── Flags ───────────────────────────────────────────────────────────────────
TARGET="all"
SKIP_SYSTEMD=0
FORCE_CERTS=0
FORCE_DEPS=0

for arg in "$@"; do
  case "$arg" in
    all|backend|frontend) TARGET="$arg" ;;
    --skip-systemd)       SKIP_SYSTEMD=1 ;;
    --force-certs)        FORCE_CERTS=1 ;;
    --force-deps)         FORCE_DEPS=1 ;;
    -h|--help)
      awk 'NR>=3 && /^#/ {sub(/^# ?/,""); print; next} NR>=3 {exit}' "${BASH_SOURCE[0]}"
      exit 0
      ;;
    *)
      echo "Unbekanntes Argument: $arg (siehe --help)" >&2
      exit 2
      ;;
  esac
done

# ── Ausgabe-Helfer ──────────────────────────────────────────────────────────
c_blue='\033[1;34m'; c_green='\033[1;32m'; c_yellow='\033[1;33m'; c_red='\033[1;31m'; c_off='\033[0m'
step() { echo -e "\n${c_blue}▶ $*${c_off}"; }
ok()   { echo -e "  ${c_green}✓${c_off} $*"; }
skip() { echo -e "  ${c_yellow}↷${c_off} $* (übersprungen)"; }
warn() { echo -e "  ${c_yellow}⚠${c_off}  $*" >&2; }
die()  { echo -e "${c_red}✗ $*${c_off}" >&2; trap - ERR; exit 1; }

needs_backend()  { [ "$TARGET" = "all" ] || [ "$TARGET" = "backend" ]; }
needs_frontend() { [ "$TARGET" = "all" ] || [ "$TARGET" = "frontend" ]; }

require_cmd() {
  local cmd="$1"
  if command -v "$cmd" >/dev/null 2>&1; then
    ok "$cmd"
  else
    die "Benötigtes Programm fehlt: $cmd  (bitte installieren)"
  fi
}

upsert_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp
  tmp="$(mktemp)"

  if [ -f "$file" ]; then
    awk -v key="$key" -v value="$value" '
      BEGIN { replaced = 0 }
      index($0, key "=") == 1 {
        if (!replaced) {
          print key "=" value
          replaced = 1
        }
        next
      }
      { print }
      END {
        if (!replaced) print key "=" value
      }
    ' "$file" > "$tmp"
  else
    printf '%s=%s\n' "$key" "$value" > "$tmp"
  fi

  mv "$tmp" "$file"
}

# ── Voraussetzungen prüfen ──────────────────────────────────────────────────
# Prüft alle benötigten Programme. Fehlt eines, bricht das Script ab.
check_prereqs() {
  step "Voraussetzungen prüfen"

  # Nicht als root/sudo laufen – die Dienste laufen im Benutzerkontext ($USER).
  if [ "$(id -u)" -eq 0 ]; then
    die "Bitte NICHT als root oder mit 'sudo' starten – einfach als normaler Benutzer: ./setup.sh
   (Wo root nötig ist, fragt das Script gezielt nach sudo.)"
  fi

  require_cmd openssl

  if needs_backend; then
    require_cmd python3
  fi

  if needs_frontend; then
    require_cmd node
    require_cmd npm
  fi

  if [ "$SKIP_SYSTEMD" -eq 0 ]; then
    require_cmd systemctl
    require_cmd curl
    if needs_frontend; then
      require_cmd sudo
    fi
  fi

  # Vite 8 unterstützt Node 20 ab 20.19 sowie Node 22 ab 22.12.
  if needs_frontend; then
    if ! node -e '
      const [major, minor] = process.versions.node.split(".").map(Number)
      const supported = (major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22
      process.exit(supported ? 0 : 1)
    '; then
      die "Node $(node --version 2>/dev/null) wird nicht unterstützt – benötigt wird Node 20.19+ oder 22.12+."
    fi
    ok "Node $(node --version) (Vite-8-kompatibel)"
  fi
}

# ── Backend ─────────────────────────────────────────────────────────────────
setup_backend() {
  step "Backend (card-sync-server) einrichten"
  [ -d "$BACKEND_DIR" ] || die "Backend-Verzeichnis fehlt: $BACKEND_DIR"
  cd "$BACKEND_DIR"

  # 1) Python venv + Runtime-Abhängigkeiten
  local venv_created=0
  if [ "$FORCE_DEPS" -eq 1 ] || [ ! -x ".venv/bin/python3" ]; then
    if [ "$FORCE_DEPS" -eq 1 ]; then rm -rf .venv; fi
    python3 -m venv .venv
    venv_created=1
    ok "venv erstellt (.venv)"
  else
    skip "venv existiert"
  fi

  [ -f "requirements.txt" ] || die "Backend-Abhängigkeiten fehlen: $BACKEND_DIR/requirements.txt"
  local requirements_hash requirements_stamp
  requirements_stamp=".venv/.requirements.sha256"
  requirements_hash="$(.venv/bin/python3 -c 'import hashlib, pathlib; print(hashlib.sha256(pathlib.Path("requirements.txt").read_bytes()).hexdigest())')"
  if [ "$venv_created" -eq 1 ] || [ ! -f "$requirements_stamp" ] || [ "$(cat "$requirements_stamp")" != "$requirements_hash" ]; then
    .venv/bin/python3 -m pip install --disable-pip-version-check -r requirements.txt
    printf '%s\n' "$requirements_hash" > "$requirements_stamp"
    ok "Backend-Abhängigkeiten installiert"
  else
    skip "Backend-Abhängigkeiten unverändert"
  fi

  # 2) HTTPS-Zertifikat
  if [ "$FORCE_CERTS" -eq 1 ] || [ ! -f "certs/cert.pem" ] || [ ! -f "certs/key.pem" ]; then
    bash scripts/https/setup-https.sh
    ok "Backend-Zertifikat erzeugt (certs/)"
  else
    skip "Backend-Zertifikat existiert"
  fi

  # 3) Laufzeitkonfiguration (.env.sync-server) – wiederholbar synchronisieren
  if [ ! -f ".env.sync-server" ]; then
    cat > ".env.sync-server" <<EOF
# Laufzeitkonfiguration für card-sync-server (lokal) – von setup.sh erzeugt.
# Wird von systemd (EnvironmentFile) und scripts/run/run-https.sh geladen.
# Optional: API-Token für authentifizierte Sync-Requests (leer = offen im LAN)
# SYNC_API_TOKEN=
EOF
    ok ".env.sync-server angelegt"
  else
    skip ".env.sync-server existiert"
  fi
  upsert_env_var ".env.sync-server" "SYNC_USE_HTTPS" "1"
  upsert_env_var ".env.sync-server" "SYNC_HOST" "0.0.0.0"
  upsert_env_var ".env.sync-server" "SYNC_PORT" "$SYNC_PORT"
  upsert_env_var ".env.sync-server" "SYNC_CERT_FILE" "$BACKEND_DIR/certs/cert.pem"
  upsert_env_var ".env.sync-server" "SYNC_KEY_FILE" "$BACKEND_DIR/certs/key.pem"
  ok ".env.sync-server synchronisiert (HTTPS/Port/Pfade)"

  mkdir -p logs

  # 4) systemd --user Service + Watchdog
  if [ "$SKIP_SYSTEMD" -eq 1 ]; then
    skip "systemd (--skip-systemd)"
    return
  fi

  if ! systemctl --user show-environment >/dev/null 2>&1; then
    warn "Kein 'systemd --user'-Bus erreichbar (typisch bei 'sudo su' oder Login ohne Session)."
    warn "Lösung: normal per SSH als '$SERVICE_USER' einloggen und erneut ausführen."
    die "Backend-User-Service kann so nicht installiert werden."
  fi

  bash ops/install_user_services.sh >/dev/null
  ok "systemd --user Service + Watchdog installiert und gestartet"

  # Damit der --user Service nach dem SSH-Logout weiterläuft:
  if command -v loginctl >/dev/null 2>&1; then
    if [ "$(loginctl show-user "$SERVICE_USER" -p Linger --value 2>/dev/null)" != "yes" ]; then
      if sudo -n true 2>/dev/null || sudo -v; then
        sudo loginctl enable-linger "$SERVICE_USER" && ok "Linger aktiviert (Service überlebt Logout)"
      else
        warn "Linger nicht aktiviert. Für Dauerbetrieb ohne SSH-Session:"
        warn "  sudo loginctl enable-linger $SERVICE_USER"
      fi
    else
      ok "Linger bereits aktiv"
    fi
  fi
}

# ── Frontend ────────────────────────────────────────────────────────────────
setup_frontend() {
  step "Frontend (card_pwa) einrichten"
  [ -d "$FRONTEND_DIR" ] || die "Frontend-Verzeichnis fehlt: $FRONTEND_DIR"
  cd "$FRONTEND_DIR"

  # 1) Abhängigkeiten
  if [ "$FORCE_DEPS" -eq 1 ] || [ ! -x "node_modules/.bin/tsc" ] || [ ! -x "node_modules/.bin/vite" ]; then
    if [ "$FORCE_DEPS" -eq 1 ]; then rm -rf node_modules; fi
    # Das FSRS-Optimizer-Paket deklariert absichtlich cpu=wasm32. npm benötigt
    # deshalb auf dem Host denselben --force-Modus wie CI und deploy_prod.sh.
    if [ -f "package-lock.json" ]; then
      npm ci --include=dev --force
    else
      npm install --include=dev --force
    fi
    ok "npm-Abhängigkeiten installiert"
  else
    skip "npm-Abhängigkeiten vorhanden"
  fi

  # 2) .env.production
  if [ ! -f ".env.production" ] && [ -f ".env.example" ]; then
    cp ".env.example" ".env.production"
    ok ".env.production aus .env.example erstellt"
  else
    skip ".env.production vorhanden (oder kein .env.example)"
  fi

  # 3) Prod-Zertifikat
  if [ "$FORCE_CERTS" -eq 1 ] || [ ! -f ".cert/prod-cert.pem" ] || [ ! -f ".cert/prod-key.pem" ]; then
    CERT_FORCE="$FORCE_CERTS" npm run prod:cert:setup
    ok "Frontend-Zertifikat erzeugt (.cert/)"
  else
    skip "Frontend-Zertifikat existiert"
  fi

  # 4) Production-Build
  npm run build
  ok "Build erstellt (dist/)"

  mkdir -p logs

  # 5) systemd System-Service (benötigt sudo)
  if [ "$SKIP_SYSTEMD" -eq 1 ]; then
    skip "systemd (--skip-systemd)"
    return
  fi
  install_frontend_service
}

install_frontend_service() {
  local template="$FRONTEND_DIR/deploy/systemd/card-pwa-prod.service"
  local unit="/etc/systemd/system/card-pwa-prod.service"
  local node_bin
  [ -f "$template" ] || die "Unit-Vorlage fehlt: $template"
  node_bin="$(command -v node)"

  # Unit aus Vorlage erzeugen, Projektpfad, Node-Binary und User anpassen.
  local tmp; tmp="$(mktemp)"
  sed -e "s#/home/_vb/card_pwa_app#$ROOT_DIR#g" \
      -e "s#^User=.*#User=$SERVICE_USER#" \
      -e "s#^Group=.*#Group=$SERVICE_GROUP#" \
      -e "s#^Environment=PWA_PORT=.*#Environment=PWA_PORT=$PWA_PORT#" \
      -e "s#^Environment=PWA_SYNC_PROXY_TARGET=.*#Environment=PWA_SYNC_PROXY_TARGET=https://127.0.0.1:$SYNC_PORT#" \
      -e "s#^ExecStart=/usr/bin/node #ExecStart=$node_bin #" \
      "$template" > "$tmp"

  if ! sudo -n true 2>/dev/null; then
    echo "  (sudo wird für die Installation des System-Service benötigt)"
  fi
  if sudo test -f "$unit" && sudo cmp -s "$tmp" "$unit"; then
    skip "System-Service unverändert"
  else
    sudo cp "$tmp" "$unit"
    ok "System-Service Unit aktualisiert ($unit)"
  fi
  rm -f "$tmp"
  sudo systemctl daemon-reload
  sudo systemctl enable card-pwa-prod.service >/dev/null
  sudo systemctl restart card-pwa-prod.service
  ok "System-Service card-pwa-prod.service installiert und gestartet"
}

# ── Verifikation ────────────────────────────────────────────────────────────
verify() {
  [ "$SKIP_SYSTEMD" -eq 1 ] && return 0
  step "Verifikation"
  sleep 2
  if [ "$TARGET" != "frontend" ]; then
    if curl -sk --max-time 5 "https://127.0.0.1:$SYNC_PORT/health" | grep -q '"ok": true'; then
      ok "Backend  https://127.0.0.1:$SYNC_PORT/health  → ok"
    else
      warn "Backend-Health fehlgeschlagen (Logs: $BACKEND_DIR/logs/)"
    fi
  fi
  if [ "$TARGET" != "backend" ]; then
    if curl -sk --max-time 5 "https://127.0.0.1:$PWA_PORT/health" | grep -q '"ok":true'; then
      ok "Frontend https://127.0.0.1:$PWA_PORT/health  → ok"
    else
      warn "Frontend-Health fehlgeschlagen (Logs: $FRONTEND_DIR/logs/)"
    fi
  fi
}

# ── Abschlussinfo ───────────────────────────────────────────────────────────
summary() {
  local ip
  ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  echo -e "\n${c_green}━━━ Setup abgeschlossen ━━━${c_off}"
  if needs_frontend; then
    echo "App im Browser:   https://${ip:-<lan-ip>}:$PWA_PORT   (oder https://localhost:$PWA_PORT)"
    echo "Root-CA fürs Handy: $FRONTEND_DIR/.cert/pwa-rootCA.cer  (installieren & vertrauen)"
  fi
  if needs_backend; then
    echo "Backend-Health:   https://127.0.0.1:$SYNC_PORT/health"
  fi
  echo
  if [ "$SKIP_SYSTEMD" -eq 1 ]; then
    echo "Dienste: nicht installiert/gestartet (--skip-systemd)"
  else
    echo "Status:"
    if needs_backend; then
      echo "  systemctl --user status card-sync-server.service"
    fi
    if needs_frontend; then
      echo "  systemctl status card-pwa-prod.service"
    fi
  fi
}

# ── Ablauf ──────────────────────────────────────────────────────────────────
main() {
  check_prereqs
  case "$TARGET" in
    all)      setup_backend; setup_frontend ;;
    backend)  setup_backend ;;
    frontend) setup_frontend ;;
  esac
  verify
  summary
}

main
