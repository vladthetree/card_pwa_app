# Card Sync Server Runbook

## Struktur

Wichtige Dateien im Projektroot:
- `sync_server.py`: Server
- `.env.sync-server`: Laufzeitkonfiguration
- `run-https.sh`: HTTPS-Start mit Port-Neustartlogik
- `setup-https.sh`: Self-signed Zertifikat erzeugen
- `verify-https.sh`: Setup prüfen
- `ops/`: systemd-Units und Watchdog-Skripte
- `logs/`: Server- und Watchdog-Logs

## Lokal starten

```bash
cd ~/card-sync-server
bash run-https.sh
```

Das Skript:
- lädt `.env.sync-server`
- prüft Zertifikate
- beendet ggf. einen laufenden Prozess auf dem konfigurierten Port
- startet den Server neu

## HTTPS

Der Server läuft lokal mit Self-signed HTTPS.

Standardwerte:

```bash
SYNC_USE_HTTPS=1
SYNC_PORT=8787
SYNC_CERT_FILE=/home/_vb/card-sync-server/certs/cert.pem
SYNC_KEY_FILE=/home/_vb/card-sync-server/certs/key.pem
```

Zertifikat neu erzeugen:

```bash
cd ~/card-sync-server
bash setup-https.sh
```

Healthcheck lokal:

```bash
curl -k https://127.0.0.1:8787/health
```

Browser/PWA auf dem Mac:
- URL: `https://pi.local:8787`
- Beim ersten Aufruf Zertifikat akzeptieren
- PWA/Frontend muss `https://` statt `http://` verwenden

## Systemd User Service

Installation bzw. Re-Installation:

```bash
cd ~/card-sync-server
bash ops/install_user_services.sh
```

Wichtige Befehle:

```bash
systemctl --user status card-sync-server.service
systemctl --user restart card-sync-server.service
systemctl --user status card-sync-watchdog.timer
systemctl --user restart card-sync-watchdog.timer
systemctl --user daemon-reload
```

## Watchdog

Der Watchdog prüft den Health-Endpoint alle 20 Sekunden.

Aktuelles Verhalten:
- lädt `.env.sync-server`
- erkennt `SYNC_USE_HTTPS=1`
- prüft `https://127.0.0.1:8787/health`
- nutzt `curl -k`, damit das lokale Self-signed Zertifikat akzeptiert wird
- startet `card-sync-server.service` neu, wenn der Healthcheck fehlschlägt

Relevante Dateien:
- `ops/card-sync-watchdog.service`
- `ops/card-sync-watchdog.timer`
- `ops/watchdog_healthcheck.sh`
- `ops/check_server_running.sh`

## Logs

```bash
tail -f ~/card-sync-server/logs/sync-server.log
tail -f ~/card-sync-server/logs/watchdog.log
tail -f ~/card-sync-server/logs/systemd-sync-server.out.log
tail -f ~/card-sync-server/logs/systemd-sync-server.err.log
```

## Prüfung

```bash
cd ~/card-sync-server
bash verify-https.sh
sh ops/check_server_running.sh
```

## Troubleshooting

Port ist belegt:
```bash
bash run-https.sh
```
Das Skript beendet den alten Prozess und startet sauber neu.

Service-Dateien wurden geändert:
```bash
systemctl --user daemon-reload
systemctl --user restart card-sync-server.service
systemctl --user restart card-sync-watchdog.timer
```

`pi.local` geht nicht:
- prüfen, ob Mac und Pi im gleichen Netz sind
- testweise direkt `https://<pi-ip>:8787` verwenden

## API-Hinweis

Typische Endpunkte:
- `GET /health`
- `POST /sync`
- `GET /sync/pull`
- `POST /sync/handshake`
- `GET /sync/snapshot`

Für Details ist der Servercode die Quelle: `sync_server.py`.
