#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$ROOT_DIR/card-sync-server/run-https.sh"

if [[ ! -x "$TARGET" ]]; then
  echo "[root run-https] target script missing or not executable: $TARGET" >&2
  exit 1
fi

exec "$TARGET" "$@"
