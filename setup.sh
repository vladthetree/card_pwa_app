#!/usr/bin/env bash
#
# Card PWA – One-shot Setup
# ============================================================================
# Initialisiert das Projekt nach einem frischen `git clone` (z. B. via SSH):
#   - Backend  (card-sync-server, Python)  -> HTTPS auf Port 8787, systemd --user
#   - Frontend (card_pwa, Vite/React PWA)  -> HTTPS auf Port 8443, systemd (system)
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
# Voraussetzungen: bash, node (>=18), npm, python3, openssl, systemctl, sudo, curl.
# sudo wird nur für den Frontend-System-Service (und optional Linger) verwendet.
# ============================================================================

set -euo pipefail

# Bei unerwartetem Fehler eine klare Meldung statt kryptischem Abbruch.
trap 'rc=$?; printf "\n\033[1;31m✗ Setup abgebrochen (Zeile %s, Exit %s). Fehlermeldung steht oben.\033[0m\n" "$LINENO" "$rc" >&2' ERR

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/card-sync-server"
FRONTEND_DIR="$ROOT_DIR/card_pwa"
SERVICE_USER="${USER:-$(id -un)}"

# ── Konfig (überschreibbar via Umgebung) ────────────────────────────────────
SYNC_PORT="${SYNC_PORT:-8787}"
PWA_PORT="${PWA_PORT:-8443}"

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

# ── Voraussetzungen prüfen ──────────────────────────────────────────────────
# Prüft alle benötigten Programme. Fehlt eines, bricht das Script ab.
check_prereqs() {
  step "Voraussetzungen prüfen"

  # Nicht als root/sudo laufen – die Dienste laufen im Benutzerkontext ($USER).
  if [ "$(id -u)" -eq 0 ]; then
    die "Bitte NICHT als root oder mit 'sudo' starten – einfach als normaler Benutzer: ./setup.sh
   (Wo root nötig ist, fragt das Script gezielt nach sudo.)"
  fi

  for cmd in bash node npm python3 openssl systemctl sudo curl; do
    if command -v "$cmd" >/dev/null 2>&1; then
      ok "$cmd"
    else
      die "Benötigtes Programm fehlt: $cmd  (bitte installieren)"
    fi
  done

  # Node muss neu genug für Vite 5 sein, sonst scheitert der Build kryptisch.
  local node_major
  node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  if [ "${node_major:-0}" -lt 18 ]; then
    die "Node $(node --version 2>/dev/null) ist zu alt – benötigt wird Node 18 oder neuer."
  fi
  ok "Node $(node --version) (>= 18)"
}

# ── Backend ─────────────────────────────────────────────────────────────────
setup_backend() {
  step "Backend (card-sync-server) einrichten"
  [ -d "$BACKEND_DIR" ] || die "Backend-Verzeichnis fehlt: $BACKEND_DIR"
  cd "$BACKEND_DIR"

  # 1) Python venv
  if [ "$FORCE_DEPS" -eq 1 ] || [ ! -x ".venv/bin/python3" ]; then
    if [ "$FORCE_DEPS" -eq 1 ]; then rm -rf .venv; fi
    python3 -m venv .venv
    ok "venv erstellt (.venv)"
  else
    skip "venv existiert"
  fi
  # Runtime nutzt nur die Python-Standardbibliothek -> kein pip nötig.

  # 2) HTTPS-Zertifikat
  if [ "$FORCE_CERTS" -eq 1 ] || [ ! -f "certs/cert.pem" ] || [ ! -f "certs/key.pem" ]; then
    bash scripts/https/setup-https.sh
    ok "Backend-Zertifikat erzeugt (certs/)"
  else
    skip "Backend-Zertifikat existiert"
  fi

  # 3) Laufzeitkonfiguration (.env.sync-server) – HTTPS aktivieren
  if [ ! -f ".env.sync-server" ]; then
    cat > ".env.sync-server" <<EOF
# Laufzeitkonfiguration für card-sync-server (lokal) – von setup.sh erzeugt.
# Wird von systemd (EnvironmentFile) und scripts/run/run-https.sh geladen.
SYNC_USE_HTTPS=1
SYNC_HOST=0.0.0.0
SYNC_PORT=$SYNC_PORT
SYNC_CERT_FILE=$BACKEND_DIR/certs/cert.pem
SYNC_KEY_FILE=$BACKEND_DIR/certs/key.pem
# Optional: API-Token für authentifizierte Sync-Requests (leer = offen im LAN)
# SYNC_API_TOKEN=
EOF
    ok ".env.sync-server angelegt (HTTPS aktiviert)"
  else
    skip ".env.sync-server existiert"
  fi

  mkdir -p logs

  # 4) systemd --user Service + Watchdog
  if [ "$SKIP_SYSTEMD" -eq 1 ]; then
    skip "systemd (--skip-systemd)"
    return
  fi

  if [ "$(basename "$ROOT_DIR")" != "card_pwa_app" ]; then
    warn "Repo liegt nicht unter ~/card_pwa_app – die mitgelieferten User-Units"
    warn "erwarten %h/card_pwa_app/card-sync-server. Ggf. ops/*.service anpassen."
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
  if [ "$FORCE_DEPS" -eq 1 ] || [ ! -d "node_modules" ]; then
    if [ -f "package-lock.json" ]; then npm ci; else npm install; fi
    ok "npm-Abhängigkeiten installiert"
  else
    skip "node_modules existiert"
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
    npm run prod:cert:setup
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
  [ -f "$template" ] || die "Unit-Vorlage fehlt: $template"

  # Unit aus Vorlage erzeugen, Pfade/User auf diese Umgebung anpassen.
  local tmp; tmp="$(mktemp)"
  sed -e "s#/home/_vb/card_pwa_app/card_pwa#$FRONTEND_DIR#g" \
      -e "s#^User=.*#User=$SERVICE_USER#" \
      -e "s#^Group=.*#Group=$SERVICE_USER#" \
      "$template" > "$tmp"

  if ! sudo -n true 2>/dev/null; then
    echo "  (sudo wird für die Installation des System-Service benötigt)"
  fi
  sudo cp "$tmp" "$unit"
  rm -f "$tmp"
  sudo systemctl daemon-reload
  sudo systemctl enable --now card-pwa-prod.service
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
  local ip; ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  echo -e "\n${c_green}━━━ Setup abgeschlossen ━━━${c_off}"
  echo    "App im Browser:   https://${ip:-<lan-ip>}:$PWA_PORT   (oder https://localhost:$PWA_PORT)"
  echo    "Backend-Health:   https://127.0.0.1:$SYNC_PORT/health"
  echo    "Root-CA fürs Handy: $FRONTEND_DIR/.cert/pwa-rootCA.cer  (installieren & vertrauen)"
  echo
  echo    "Status:"
  echo    "  systemctl --user status card-sync-server.service"
  echo    "  systemctl status card-pwa-prod.service"
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
