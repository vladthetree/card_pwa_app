#!/bin/sh
# Root wrapper → delegates to the real deploy script in card_pwa/.
# POSIX sh (no bashisms) so it also runs fine via `sh deploy_prod.sh`.
set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
TARGET="$SCRIPT_DIR/card_pwa/deploy_prod.sh"

if [ ! -x "$TARGET" ]; then
  echo "[root deploy_prod] target script missing or not executable: $TARGET" >&2
  exit 1
fi

exec "$TARGET" "$@"
