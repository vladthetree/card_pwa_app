#!/usr/bin/env bash

# Card Sync Server - HTTPS Setup & Start
# Komplettes Setup für Self-signed HTTPS mit pi.local

set -e

CARD_SYNC_DIR="/home/_vb/card_pwa_app/card-sync-server"
HOSTNAME="pi.local"
PORT=8787

echo "🚀 Card Sync Server - HTTPS Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Schritt 1: Zertifikat generieren (falls nicht vorhanden)
if [ ! -f "$CARD_SYNC_DIR/certs/cert.pem" ]; then
  echo "📝 Schritt 1: Self-signed Zertifikat generieren..."
  cd "$CARD_SYNC_DIR"
  bash scripts/https/setup-https.sh
  echo ""
else
  echo "✅ Schritt 1: Zertifikat existiert bereits"
  echo "   Datei: $CARD_SYNC_DIR/certs/cert.pem"
  echo ""
fi

# Schritt 2: Umgebungsvariablen prüfen
echo "📝 Schritt 2: Konfiguration prüfen..."
if [ ! -f "$CARD_SYNC_DIR/.env.sync-server" ]; then
  echo "❌ .env.sync-server nicht gefunden!"
  exit 1
fi
set -a
. "$CARD_SYNC_DIR/.env.sync-server"
set +a
echo "✅ Konfiguration vorhanden"
echo ""

# Schritt 2b: Falls systemd-Service aktiv ist, sauber darüber neu starten
if command -v systemctl >/dev/null 2>&1; then
  SERVICE_STATE=$(systemctl --user is-active card-sync-server.service 2>/dev/null || true)
  if [ "$SERVICE_STATE" = "active" ] || [ "$SERVICE_STATE" = "activating" ]; then
    echo "📝 Schritt 2b: systemd-Service erkannt ($SERVICE_STATE)"
    echo "   Starte Service neu statt zweiten Prozess zu starten..."
    systemctl --user restart card-sync-server.service
    echo "✅ Service neu gestartet: card-sync-server.service"
    exit 0
  fi
fi

# Schritt 3: Logs-Verzeichnis erstellen
if [ ! -d "$CARD_SYNC_DIR/logs" ]; then
  echo "📝 Schritt 3: Logs-Verzeichnis erstellen..."
  mkdir -p "$CARD_SYNC_DIR/logs"
else
  echo "✅ Schritt 3: Logs-Verzeichnis existiert"
fi
echo ""

# Schritt 4: Virtuelle Umgebung aktivieren
echo "📝 Schritt 4: Virtuelle Python-Umgebung aktivieren..."
if [ ! -f "$CARD_SYNC_DIR/.venv/bin/activate" ]; then
  echo "❌ Virtuelle Umgebung nicht gefunden!"
  echo "   Bitte führe zuerst aus:"
  echo "   cd $CARD_SYNC_DIR && python3 -m venv .venv"
  exit 1
fi
. "$CARD_SYNC_DIR/.venv/bin/activate"
echo "✅ Virtuelle Umgebung aktiviert"
echo ""

# Schritt 5: Bestehenden Prozess auf dem Port beenden
echo "📝 Schritt 5: Port $PORT prüfen..."
PIDS=$(fuser "$PORT"/tcp 2>/dev/null || true)

if [ -n "$PIDS" ]; then
  echo "⚠️  Port $PORT ist bereits belegt durch PID(s): $PIDS"
  echo "   Beende laufenden Prozess und starte neu..."
  kill $PIDS 2>/dev/null || true
  sleep 1

  if fuser "$PORT"/tcp >/dev/null 2>&1; then
    echo "   Prozess reagiert nicht auf SIGTERM, sende SIGKILL..."
    kill -9 $PIDS 2>/dev/null || true
    sleep 1
  fi

  if fuser "$PORT"/tcp >/dev/null 2>&1; then
    echo "❌ Port $PORT ist weiterhin belegt. Neustart abgebrochen."
    exit 1
  fi

  echo "✅ Port $PORT wurde freigegeben"
else
  echo "✅ Port $PORT ist frei"
fi
echo ""

# Schritt 6: Server starten
echo "📝 Schritt 6: Card Sync Server starten..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Server startet mit HTTPS"
echo "   URL: https://$HOSTNAME:$PORT"
echo "   Hostname: $HOSTNAME"
echo "   Port: $PORT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$CARD_SYNC_DIR"
exec python3 sync_server.py
