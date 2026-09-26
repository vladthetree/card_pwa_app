#!/bin/sh
# Erstellt einen lokalen Fortschritts-Commit. Kein Push und keine Remote-Befehle.
set -eu

repo_dir=$(CDPATH= cd "$(dirname "$0")" && pwd)
cd "$repo_dir"

if [ "${1:-}" = "--dry-run" ]; then
  if [ "$#" -gt 1 ]; then
    echo "Verwendung: ./local-commit.sh [--dry-run | Commit-Nachricht]" >&2
    exit 2
  fi
  echo "Diese nicht ignorierten Änderungen würden lokal committet werden:"
  git status --short
  exit 0
fi

if [ "$#" -gt 1 ]; then
  echo "Verwendung: ./local-commit.sh [--dry-run | Commit-Nachricht]" >&2
  exit 2
fi

message=${1-"Lokaler Fortschritt $(date '+%Y-%m-%d %H:%M:%S')"}
if [ -z "$(printf '%s' "$message" | tr -d '[:space:]')" ]; then
  echo "Die Commit-Nachricht darf nicht leer sein." >&2
  exit 2
fi

git add -A -- .
if git diff --cached --quiet; then
  echo "Keine Änderungen für einen Commit vorhanden."
  exit 0
fi

# Hooks sind für diesen lokalen Sicherungs-Commit deaktiviert, damit kein
# projekt- oder nutzerseitiger Hook einen Push oder andere Aktionen auslöst.
git -c core.hooksPath=/dev/null commit -m "$message"
echo "Lokal gespeichert. Es wurde nichts zu GitHub gepusht."
