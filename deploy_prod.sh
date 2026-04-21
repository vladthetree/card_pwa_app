#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$ROOT_DIR/card_pwa/deploy_prod.sh"

if [[ ! -x "$TARGET" ]]; then
  echo "[root deploy_prod] target script missing or not executable: $TARGET" >&2
  exit 1
fi

exec "$TARGET" "$@"
