#!/usr/bin/env bash
set -e

CERT_DIR=".cert"
HOSTNAME="${CERT_HOSTNAME:-pi.local}"
DAYS_VALID=365
ROOT_CA_DAYS_VALID=3650

ROOT_CA_KEY="$CERT_DIR/rootCA-key.pem"
ROOT_CA_CERT="$CERT_DIR/rootCA.pem"
ROOT_CA_CER="$CERT_DIR/pwa-rootCA.cer"
CERT_FILE="$CERT_DIR/prod-cert.pem"
KEY_FILE="$CERT_DIR/prod-key.pem"

mkdir -p "$CERT_DIR"

detect_primary_ip() {
    hostname -I 2>/dev/null | awk '{print $1}'
}

PRIMARY_IP="${CERT_IP:-$(detect_primary_ip)}"

build_san_csv() {
    local san="DNS:$HOSTNAME,DNS:localhost,IP:127.0.0.1"
    if [ -n "$PRIMARY_IP" ] && [ "$PRIMARY_IP" != "127.0.0.1" ]; then
        san="$san,IP:$PRIMARY_IP"
    fi
    printf '%s' "$san"
}

ensure_root_ca() {
    if [ -f "$ROOT_CA_KEY" ] && [ -f "$ROOT_CA_CERT" ]; then
        echo "Root-CA already present: $ROOT_CA_CERT"
        return
    fi
    echo "Creating Root CA..."
    CA_CNF=$(mktemp /tmp/root_ca.XXXXXX.cnf)
    cat > "$CA_CNF" << EOF
[req]
distinguished_name = req_dn
x509_extensions = v3_ca
prompt = no

[req_dn]
CN = CardApp Root CA
O  = CardApp
OU = card-pwa
C  = DE

[v3_ca]
basicConstraints       = critical,CA:TRUE,pathlen:0
keyUsage               = critical,keyCertSign,cRLSign
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid:always
EOF
    openssl req -x509 -newkey rsa:4096 -nodes \
        -keyout "$ROOT_CA_KEY" -out "$ROOT_CA_CERT" \
        -days "$ROOT_CA_DAYS_VALID" -config "$CA_CNF" -extensions v3_ca
    cp "$ROOT_CA_CERT" "$ROOT_CA_CER"
    rm -f "$CA_CNF"
}

gen_server_cert() {
    local san_csv
    san_csv="$(build_san_csv)"
    echo "Creating server certificate (signed by Root CA)..."
    SERVER_CNF=$(mktemp /tmp/server_cert.XXXXXX.cnf)
    cat > "$SERVER_CNF" << EOF
[req]
distinguished_name = req_dn
req_extensions = req_ext
prompt = no

[req_dn]
CN = $HOSTNAME
O  = CardApp
OU = card-pwa
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
    openssl genrsa -out "$KEY_FILE" 4096
    CSR=$(mktemp /tmp/server.XXXXXX.csr)
    openssl req -new -key "$KEY_FILE" -out "$CSR" -config "$SERVER_CNF"
    openssl x509 -req -in "$CSR" -CA "$ROOT_CA_CERT" -CAkey "$ROOT_CA_KEY" \
        -CAcreateserial -out "$CERT_FILE" -days "$DAYS_VALID" -sha256 \
        -extfile "$SERVER_CNF" -extensions v3_leaf
    rm -f "$CSR" "$SERVER_CNF"
}

ensure_server_cert() {
    if [ "${CERT_FORCE:-0}" != "1" ] && [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
        echo "Server certificate already present: $CERT_FILE"
        return
    fi
    gen_server_cert
}

ensure_root_ca
ensure_server_cert

chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

echo ""
echo "Certificates created:"
echo "  Cert:    $CERT_FILE"
echo "  Key:     $KEY_FILE"
echo "  Root CA: $ROOT_CA_CERT"
echo "  .cer:    $ROOT_CA_CER  (install on iPhone/iPad)"
echo "  Valid:   $(date -d "+${DAYS_VALID} days" +'%Y-%m-%d')"
echo ""
echo "To serve the Root CA for device trust:"
echo "  python3 -m http.server 8080 --directory $CERT_DIR"
echo "  → open http://$HOSTNAME:8080/pwa-rootCA.cer on your device"
