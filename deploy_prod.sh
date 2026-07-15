#!/bin/sh
# Root wrapper → delegates to the real deploy script in card_pwa/.
# POSIX sh (no bashisms) so it also runs fine via `sh deploy_prod.sh`.
set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
TARGET="$SCRIPT_DIR/card_pwa/deploy_prod.sh"
PWA_DIR="$SCRIPT_DIR/card_pwa"

if [ ! -x "$TARGET" ]; then
  echo "[root deploy_prod] target script missing or not executable: $TARGET" >&2
  exit 1
fi

# Do not trust the node_modules directory alone: npm may leave an empty shell
# behind. TypeScript and Vite are devDependencies required for the production
# build. The optimizer WASM package declares cpu=wasm32, hence the install-only
# --force flag.
if [ ! -x "$PWA_DIR/node_modules/.bin/tsc" ] || [ ! -x "$PWA_DIR/node_modules/.bin/vite" ]; then
  echo "[root deploy_prod] build dependencies missing/incomplete → npm ci --include=dev --force"
  (cd "$PWA_DIR" && npm ci --include=dev --force)
fi

exec "$TARGET" "$@"
