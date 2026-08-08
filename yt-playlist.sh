#!/usr/bin/env bash
set -euo pipefail

# YouTube-Playlist herunterladen mit kurzem Progress pro Video.
# Bricht ab, sobald auf der Zielplatte weniger als MIN_FREE_PCT % frei sind.
#
# Aufruf:  ./yt-playlist.sh <playlist-url> [zielordner]
# Beispiel: ./yt-playlist.sh "https://www.youtube.com/playlist?list=..." ./downloads

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
URL="${1:-}"
OUTDIR="${2:-$script_dir/downloads}"

# Pause zwischen den Videos (Sekunden) -> zufaellig zwischen MIN und MAX.
SLEEP_MIN="${SLEEP_MIN:-10}"
SLEEP_MAX="${SLEEP_MAX:-30}"

# Abbrechen, wenn weniger als so viel Prozent frei sind.
MIN_FREE_PCT="${MIN_FREE_PCT:-10}"

if [[ -z "$URL" ]]; then
  read -rp "Playlist-URL: " URL
fi

mkdir -p "$OUTDIR"

# Freier Platz in Prozent fuer das Dateisystem von $1.
free_pct() {
  df -P "$1" | awk 'NR==2 { printf "%d", $4 * 100 / $2 }'
}

echo "Lese Playlist ein..."
PL_TITLE="$(yt-dlp --flat-playlist --playlist-items 1 --print playlist_title "$URL" 2>/dev/null || true)"
PL_TITLE="${PL_TITLE:-playlist}"
PL_TITLE="${PL_TITLE//\//_}"     # Slashes raus, sonst kaputter Pfad

mapfile -t IDS < <(yt-dlp --flat-playlist --print id "$URL")
TOTAL="${#IDS[@]}"

if [[ "$TOTAL" -eq 0 ]]; then
  echo "Keine Videos gefunden." >&2
  exit 1
fi
echo "Playlist: $PL_TITLE  ($TOTAL Videos)"
echo

i=0
for id in "${IDS[@]}"; do
  i=$((i + 1))

  # --- Speicher-Check VOR dem Download ---
  FREE="$(free_pct "$OUTDIR")"
  if [[ "$FREE" -lt "$MIN_FREE_PCT" ]]; then
    echo
    echo "ABBRUCH: nur noch ${FREE}% frei (Limit ${MIN_FREE_PCT}%). Gestoppt bei Video $i/$TOTAL."
    exit 1
  fi

  tmpl="download:[$i/$TOTAL] %(info.title).55s  %(progress._percent_str)s  %(progress._speed_str)s  ETA %(progress._eta_str)s"

  yt-dlp \
    --ignore-errors \
    --no-warnings \
    -q --progress \
    --concurrent-fragments 4 \
    --sleep-interval "$SLEEP_MIN" \
    --max-sleep-interval "$SLEEP_MAX" \
    --sleep-requests 1 \
    -f "bv*+ba/b" \
    --merge-output-format mp4 \
    --output "$OUTDIR/$PL_TITLE/$(printf '%02d' "$i") - %(title)s.%(ext)s" \
    --progress-template "$tmpl" \
    "https://www.youtube.com/watch?v=$id" \
    || echo "  -> Video $i uebersprungen (Fehler)."
done

echo
echo "Fertig. Gespeichert in: $OUTDIR/$PL_TITLE"
