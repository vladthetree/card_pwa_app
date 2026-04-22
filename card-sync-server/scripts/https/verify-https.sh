#!/usr/bin/env bash

# Test-Skript für HTTPS Setup Verifikation

echo "🧪 Card Sync Server - HTTPS Verifikation"
echo "═════════════════════════════════════════════"
echo ""

# Test 1: Zertifikat existiert
echo "✓ Test 1: Zertifikate vorhanden?"
if [ -f "certs/cert.pem" ] && [ -f "certs/key.pem" ]; then
  echo "  ✅ Zertifikate gefunden"
  echo "     - cert.pem: $(ls -lh certs/cert.pem | awk '{print $5}')"
  echo "     - key.pem:  $(ls -lh certs/key.pem | awk '{print $5}')"
else
  echo "  ❌ Zertifikate nicht gefunden - bitte run: bash scripts/https/setup-https.sh"
  exit 1
fi
echo ""

# Test 2: Zertifikat-Details
echo "✓ Test 2: Zertifikat-Gültigkeit"
EXPIRY=$(openssl x509 -in certs/cert.pem -noout -dates)
echo "  $EXPIRY"
echo ""

# Test 3: Konfiguration
echo "✓ Test 3: HTTPS Config vorhanden?"
if grep -q "SYNC_USE_HTTPS" .env.sync-server; then
  HTTPS_ENABLED=$(grep "SYNC_USE_HTTPS" .env.sync-server | grep -o "[01]$")
  if [ "$HTTPS_ENABLED" = "1" ]; then
    echo "  ✅ HTTPS ist aktiviert (.env.sync-server)"
  else
    echo "  ⚠️  HTTPS ist DEAKTIVIERT in .env.sync-server"
  fi
else
  echo "  ❌ .env.sync-server nicht konfiguriert"
  exit 1
fi
echo ""

# Test 4: Python-Skript
echo "✓ Test 4: Python-Server hat SSL-Support?"
if grep -q "import ssl" sync_server.py; then
  echo "  ✅ SSL-Modul importiert"
else
  echo "  ❌ SSL-Modul nicht importiert"
  exit 1
fi

if grep -q "context.wrap_socket" sync_server.py; then
  echo "  ✅ SSL-Context wird verwendet"
else
  echo "  ❌ SSL-Context nicht implementiert"
  exit 1
fi
echo ""

# Test 5: Skripte ausführbar
echo "✓ Test 5: Ausführbare Skripte?"
for script in scripts/https/setup-https.sh scripts/run/run-https.sh; do
  if [ -x "$script" ]; then
    echo "  ✅ $script ist ausführbar"
  else
    echo "  ⚠️  $script ist NICHT ausführbar - chmod +x $script"
  fi
done
echo ""

# Test 6: Dokumentation
echo "✓ Test 6: Dokumentation vorhanden?"
for doc in RUNBOOK.md; do
  if [ -f "$doc" ]; then
    SIZE=$(wc -l < "$doc")
    echo "  ✅ $doc ($SIZE Zeilen)"
  else
    echo "  ❌ $doc fehlt"
    exit 1
  fi
done
echo ""

# Test 7: Logs-Verzeichnis
echo "✓ Test 7: Logs-Verzeichnis?"
if [ -d "logs" ]; then
  echo "  ✅ logs/ existiert"
  COUNT=$(ls -1 logs/ 2>/dev/null | wc -l)
  echo "     Dateien: $COUNT"
else
  echo "  ⚠️  logs/ nicht vorhanden (wird automatisch erstellt)"
fi
echo ""

echo "═════════════════════════════════════════════"
echo "✅ Alle Tests bestanden!"
echo ""
echo "🚀 Nächste Schritte:"
echo "   1. bash scripts/run/run-https.sh   # Server starten"
echo "   2. https://pi.local:8787        # Im Browser öffnen"
echo "   3. Zertifikat akzeptieren       # SSL-Warnung"
echo "   4. PWA-Code mit HTTPS updaten   # API-URLs"
echo ""
echo "📖 Dokumentation:"
echo "   - RUNBOOK.md           → Betrieb, HTTPS, Watchdog, Troubleshooting"
echo ""
