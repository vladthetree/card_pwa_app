#!/usr/bin/env bash
set -e

CERT_DIR="certs"
HOSTNAME="pi.local"
PRIMARY_IP="192.168.178.250"
DAYS_VALID=365  # 1 Jahr
ROOT_CA_DAYS_VALID=3650

USE_ROOT_CA="auto"
SERVE_CERT=0

for arg in "$@"; do
    case "$arg" in
        --hostname=*)
            HOSTNAME="${arg#*=}"
            ;;
        --ip=*)
            PRIMARY_IP="${arg#*=}"
            ;;
        --root-ca)
            USE_ROOT_CA="yes"
            ;;
        --self-signed)
            USE_ROOT_CA="no"
            ;;
        --serve)
            SERVE_CERT=1
            ;;
        *)
            ;;
    esac
done

ROOT_CA_KEY="$CERT_DIR/rootCA-key.pem"
ROOT_CA_CERT="$CERT_DIR/rootCA.pem"
ROOT_CA_CER="$CERT_DIR/pwa-rootCA.cer"
ROOT_CA_CRT="$CERT_DIR/pwa-rootCA.crt"

if [ -n "${SYNC_CERT_HOSTNAME:-}" ]; then
    HOSTNAME="$SYNC_CERT_HOSTNAME"
fi

if [ -n "${SYNC_CERT_IP:-}" ]; then
    PRIMARY_IP="$SYNC_CERT_IP"
fi

build_san_csv() {
    local san
    san="DNS:$HOSTNAME,DNS:localhost,IP:127.0.0.1"

    if [ -n "$PRIMARY_IP" ] && [ "$PRIMARY_IP" != "127.0.0.1" ]; then
        san="$san,IP:$PRIMARY_IP"
    fi

    printf '%s' "$san"
}

if [ "$USE_ROOT_CA" = "auto" ] && [ -f "$ROOT_CA_KEY" ] && [ -f "$ROOT_CA_CERT" ]; then
    USE_ROOT_CA="yes"
fi

gen_self_signed() {
    echo "🔐 Generiere Self-signed Zertifikat für HTTPS..."
    local san_csv
    san_csv="$(build_san_csv)"

    EXT_FILE=$(mktemp /tmp/cert_ext.XXXXXX.cnf)
    cat > "$EXT_FILE" << EOF
[req]
distinguished_name = req_dn
x509_extensions = v3_leaf
prompt = no

[req_dn]
CN = $HOSTNAME
O  = CardApp
OU = card-sync-server
C  = DE

[v3_leaf]
subjectAltName         = $san_csv
basicConstraints       = critical,CA:FALSE
keyUsage               = critical,digitalSignature,keyEncipherment
extendedKeyUsage       = serverAuth
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid:always
EOF

    openssl req -x509 \
        -newkey rsa:4096 \
        -nodes \
        -out "$CERT_DIR/cert.pem" \
        -keyout "$CERT_DIR/key.pem" \
        -days "$DAYS_VALID" \
        -config "$EXT_FILE" \
        -extensions v3_leaf

    rm -f "$EXT_FILE"
}

ensure_root_ca() {
    if [ -f "$ROOT_CA_KEY" ] && [ -f "$ROOT_CA_CERT" ]; then
        echo "✅ Root-CA bereits vorhanden: $ROOT_CA_CERT"
        return
    fi

    echo "🔐 Erstelle Root-CA..."
    CA_EXT_FILE=$(mktemp /tmp/root_ca_ext.XXXXXX.cnf)
    cat > "$CA_EXT_FILE" << EOF
[req]
distinguished_name = req_dn
x509_extensions = v3_ca
prompt = no

[req_dn]
CN = CardApp Root CA
O  = CardApp
OU = card-sync-server
C  = DE

[v3_ca]
basicConstraints       = critical,CA:TRUE,pathlen:0
keyUsage               = critical,keyCertSign,cRLSign
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid:always
EOF

    openssl req -x509 \
        -newkey rsa:4096 \
        -nodes \
        -keyout "$ROOT_CA_KEY" \
        -out "$ROOT_CA_CERT" \
        -days "$ROOT_CA_DAYS_VALID" \
        -config "$CA_EXT_FILE" \
        -extensions v3_ca

    cp "$ROOT_CA_CERT" "$ROOT_CA_CER"
    cp "$ROOT_CA_CERT" "$ROOT_CA_CRT"
    rm -f "$CA_EXT_FILE"
}

gen_server_cert_from_root_ca() {
    echo "🔐 Generiere Server-Zertifikat, signiert von Root-CA..."
    local san_csv
    san_csv="$(build_san_csv)"

    SERVER_CSR="$CERT_DIR/server.csr"
    SERVER_EXT_FILE=$(mktemp /tmp/server_ext.XXXXXX.cnf)
    cat > "$SERVER_EXT_FILE" << EOF
[req]
distinguished_name = req_dn
req_extensions = req_ext
prompt = no

[req_dn]
CN = $HOSTNAME
O  = CardApp
OU = card-sync-server
C  = DE

[req_ext]
subjectAltName         = $san_csv
basicConstraints       = critical,CA:FALSE
keyUsage               = critical,digitalSignature,keyEncipherment
extendedKeyUsage       = serverAuth

[v3_leaf]
subjectAltName         = $san_csv
basicConstraints       = critical,CA:FALSE
keyUsage               = critical,digitalSignature,keyEncipherment
extendedKeyUsage       = serverAuth
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid,issuer
EOF

    openssl genrsa -out "$CERT_DIR/key.pem" 4096
    openssl req -new -key "$CERT_DIR/key.pem" -out "$SERVER_CSR" -config "$SERVER_EXT_FILE"
    openssl x509 -req \
        -in "$SERVER_CSR" \
        -CA "$ROOT_CA_CERT" \
        -CAkey "$ROOT_CA_KEY" \
        -CAcreateserial \
        -out "$CERT_DIR/cert.pem" \
        -days "$DAYS_VALID" \
        -sha256 \
        -extfile "$SERVER_EXT_FILE" \
        -extensions v3_leaf

    rm -f "$SERVER_CSR" "$SERVER_EXT_FILE"
}

# Verzeichnis erstellen
mkdir -p "$CERT_DIR"

if [ "$USE_ROOT_CA" = "yes" ]; then
    ensure_root_ca
    gen_server_cert_from_root_ca
else
    gen_self_signed
fi

echo "✅ Zertifikat erstellt:"
echo "   - Zertifikat: $CERT_DIR/cert.pem"
echo "   - Private Key: $CERT_DIR/key.pem"
echo "   - Hostname: $HOSTNAME"
echo "   - Primäre IP SAN: $PRIMARY_IP"
echo "   - Gültig bis: $(date -d "+$DAYS_VALID days" +'%Y-%m-%d')"
if [ "$USE_ROOT_CA" = "yes" ]; then
    echo "   - Aussteller: Root-CA ($ROOT_CA_CERT)"
    echo "   - Für iPhone/macOS importieren: $ROOT_CA_CER"
fi

# Berechtigungen setzen
chmod 600 "$CERT_DIR/key.pem"
chmod 644 "$CERT_DIR/cert.pem"

echo ""
echo "📝 Hinweise:"
echo "   1. Beim ersten Besuch: Browser-Warnung erscheint"
echo "   2. Zertifikat akzeptieren (https://$HOSTNAME:${SYNC_PORT:-8787})"
echo "   3. PWA neu installieren -> Vertrauen bleibt erhalten"
echo ""
echo "✨ Setup abgeschlossen!"
echo ""
echo "📲 Zertifikat auf iPhone/iPad installieren:"
echo "   bash scripts/https/setup-https.sh --serve"
echo "   → Öffne http://$HOSTNAME/cert.pem auf deinem Gerät"
if [ "$USE_ROOT_CA" = "yes" ]; then
    echo "   Root-CA für Gerätetrust:"
    echo "   → Öffne http://$HOSTNAME/rootCA.cer auf deinem Gerät"
fi
echo ""

# --serve: liefert cert.pem einmalig aus, key.pem bleibt unerreichbar
if [ "$SERVE_CERT" -eq 1 ]; then
  SERVE_PORT=80   # Port 80 ist via UFW für LAN bereits freigegeben
  echo "🌐 Starte einmaligen Cert-Download-Server auf Port $SERVE_PORT..."
  echo "   Öffne auf iPhone/iPad in Safari:"
  echo "   http://$HOSTNAME/cert.pem"
    if [ "$USE_ROOT_CA" = "yes" ]; then
        echo "   oder für Root-CA Trust:"
        echo "   http://$HOSTNAME/rootCA.cer"
    fi
  echo "   (Server beendet sich automatisch nach dem Download)"
  echo ""
    python3 - "$CERT_DIR/cert.pem" "$ROOT_CA_CER" "$SERVE_PORT" << 'PYEOF'
import sys, http.server

CERT_PATH = sys.argv[1]
ROOT_CA_PATH = sys.argv[2]
SERVE_PORT = int(sys.argv[3])
cert_data = open(CERT_PATH, 'rb').read()
root_ca_data = None
try:
        root_ca_data = open(ROOT_CA_PATH, 'rb').read()
except FileNotFoundError:
        pass

class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/cert.pem':
            self.send_response(200)
            self.send_header('Content-Type', 'application/x-pem-file')
            self.send_header('Content-Disposition', 'attachment; filename="cert.pem"')
            self.send_header('Content-Length', str(len(cert_data)))
            self.end_headers()
            self.wfile.write(cert_data)
            print(f"✅ cert.pem an {self.client_address[0]} ausgeliefert. Server beendet.")
        elif self.path == '/rootCA.cer' and root_ca_data is not None:
            self.send_response(200)
            self.send_header('Content-Type', 'application/x-x509-ca-cert')
            self.send_header('Content-Disposition', 'attachment; filename="rootCA.cer"')
            self.send_header('Content-Length', str(len(root_ca_data)))
            self.end_headers()
            self.wfile.write(root_ca_data)
            print(f"✅ rootCA.cer an {self.client_address[0]} ausgeliefert. Server beendet.")
        else:
            self.send_response(403)
            self.end_headers()
    def log_message(self, *a):
        pass

try:
    server = http.server.HTTPServer(('', SERVE_PORT), H)
    server.handle_request()   # genau eine Anfrage, dann Ende
except PermissionError:
    print(f"❌ Port {SERVE_PORT} benötigt sudo. Versuche: sudo bash scripts/https/setup-https.sh --serve")
PYEOF
fi
