#!/usr/bin/env bash

if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi

set -Eeuo pipefail

playlist_id="PLG49S3nxzAnl4QDVqK-hOnoqcSKEIDDuv"
playlist_url="https://www.youtube.com/playlist?list=${playlist_id}"
playlist_watch_url="https://www.youtube.com/watch?v=KiEptGbnEBc&list=${playlist_id}"
playlist_dir_name="CompTIA SY0-701 Security+ Training Course [${playlist_id}]"

usage() {
  cat <<'EOF'
Usage:
  ./download-youtube-playlist.sh [ZIEL_ORDNER]
  ./download-youtube-playlist.sh --rename-only [ZIEL_ORDNER]
  ./download-youtube-playlist.sh --dry-run [ZIEL_ORDNER]

Laedt immer diese Playlist:
  CompTIA SY0-701 Security+ Training Course

Dateiname:
  003 - The CIA Triad - CompTIA Security+ SY0-701 - 1.2 [SBcDGb9l6yo].mp4
  -> 003 - 1.2 - The CIA Triad - CompTIA Security+ SY0-701.mp4

Optional:
  MAX_HEIGHT=720 ./download-youtube-playlist.sh
  COOKIES_FILE=/pfad/zu/cookies.txt ./download-youtube-playlist.sh
EOF
}

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
mode="download"
target_dir="$script_dir/youtube-playlists"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --rename-only)
      mode="rename-only"
      shift
      ;;
    --dry-run)
      mode="dry-run"
      shift
      ;;
    *)
      target_dir="$1"
      shift
      ;;
  esac
done

max_height="${MAX_HEIGHT:-1080}"
playlist_dir="$target_dir/$playlist_dir_name"
manifest_file="$playlist_dir/.downloaded-videos.tsv"
entries_cache_file="$playlist_dir/.playlist-entries.tsv"
failure_log_current="$playlist_dir/failed-downloads.txt"
failure_log_history="$playlist_dir/failed-downloads-history.txt"
format_selector="bv*[height<=${max_height}][vcodec^=avc1][ext=mp4]+ba[acodec^=mp4a][ext=m4a]/bv*[height<=${max_height}][ext=mp4]+ba[ext=m4a]/b[height<=${max_height}][ext=mp4]/b[height<=${max_height}]"

if ! [[ "$max_height" =~ ^[0-9]+$ ]]; then
  echo "MAX_HEIGHT muss eine Zahl sein, z.B. 1080 oder 720." >&2
  exit 1
fi

yt_dlp_bin="${YT_DLP_BIN:-}"
if [[ -z "$yt_dlp_bin" ]]; then
  if [[ -x "$HOME/.local/bin/yt-dlp" ]]; then
    yt_dlp_bin="$HOME/.local/bin/yt-dlp"
  else
    yt_dlp_bin="$(command -v yt-dlp || true)"
  fi
fi

missing=()
if [[ -z "$yt_dlp_bin" || ! -x "$yt_dlp_bin" ]]; then
  missing+=("yt-dlp")
fi
for cmd in ffmpeg ffprobe awk sed grep tail tee du df find wc mktemp mv date cp; do
  command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd")
done

if (( ${#missing[@]} > 0 )); then
  echo "Fehlende Programme: ${missing[*]}" >&2
  echo "Installiere mindestens yt-dlp und ffmpeg, dann erneut starten." >&2
  exit 1
fi

yt_dlp_version="$("$yt_dlp_bin" --version 2>/dev/null | sed -n '1p' || true)"
if [[ -z "$yt_dlp_version" ]]; then
  yt_dlp_version="Version unbekannt"
fi

extra_args=()
if [[ -n "${COOKIES_FILE:-}" ]]; then
  if [[ ! -f "$COOKIES_FILE" ]]; then
    echo "COOKIES_FILE existiert nicht: $COOKIES_FILE" >&2
    exit 1
  fi
  extra_args+=(--cookies "$COOKIES_FILE")
fi

mkdir -p "$playlist_dir"

init_failure_logs() {
  {
    printf 'Fehlgeschlagene Downloads - aktueller Lauf\n'
    printf 'Start: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')"
    printf 'Playlist: %s\n' "$playlist_url"
    printf 'Zielordner: %s\n' "$playlist_dir"
    printf '\n'
  } > "$failure_log_current"
}

video_url_for() {
  local id="$1"
  printf 'https://www.youtube.com/watch?v=%s&list=%s' "$id" "$playlist_id"
}

log_failure() {
  local index="$1"
  local id="$2"
  local title="$3"
  local target_name="$4"
  local reason="$5"
  local timestamp url

  timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
  url="$(video_url_for "$id")"

  {
    printf '[%s]\n' "$timestamp"
    printf 'Index: %s\n' "$index"
    printf 'Titel: %s\n' "$title"
    printf 'Datei: %s\n' "$target_name"
    printf 'URL: %s\n' "$url"
    printf 'Grund: %s\n' "$reason"
    printf '\n'
  } >> "$failure_log_current"

  {
    printf '[%s]\n' "$timestamp"
    printf 'Index: %s\n' "$index"
    printf 'Titel: %s\n' "$title"
    printf 'Datei: %s\n' "$target_name"
    printf 'URL: %s\n' "$url"
    printf 'Grund: %s\n' "$reason"
    printf '\n'
  } >> "$failure_log_history"
}

log_general_failure() {
  local reason="$1"
  local timestamp

  timestamp="$(date '+%Y-%m-%d %H:%M:%S')"

  {
    printf '[%s]\n' "$timestamp"
    printf 'Grund: %s\n' "$reason"
    printf 'Playlist: %s\n' "$playlist_url"
    printf '\n'
  } >> "$failure_log_current"

  {
    printf '[%s]\n' "$timestamp"
    printf 'Grund: %s\n' "$reason"
    printf 'Playlist: %s\n' "$playlist_url"
    printf '\n'
  } >> "$failure_log_history"
}

trim() {
  printf '%s' "$1" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//'
}

sanitize_filename() {
  local value
  value="$(printf '%s' "$1" | sed -E 's#[/\\:*?"<>|]+#-#g; s/[[:cntrl:]]//g; s/[[:space:]]+/ /g; s/^[[:space:]]+//; s/[[:space:].]+$//')"
  if [[ -z "$value" ]]; then
    value="untitled"
  fi
  printf '%s' "${value:0:220}"
}

format_title() {
  local title topic objective
  title="$(trim "$1")"

  if [[ "$title" =~ ^(.+)[[:space:]]*-[[:space:]]*([0-9]+(\.[0-9]+)+)$ ]]; then
    topic="$(trim "${BASH_REMATCH[1]}")"
    objective="${BASH_REMATCH[2]}"
    sanitize_filename "$objective - $topic"
  else
    sanitize_filename "$title"
  fi
}

target_name_for() {
  local index="$1"
  local title="$2"
  printf '%s - %s.mp4' "$index" "$(format_title "$title")"
}

bytes_to_gb() {
  awk -v bytes="${1:-0}" 'BEGIN { printf "%.2f GB", bytes / 1073741824 }'
}

folder_bytes() {
  du -sb "$playlist_dir" 2>/dev/null | awk '{print $1}'
}

free_bytes() {
  df -B1 --output=avail "$playlist_dir" | awk 'NR == 2 {print $1}'
}

print_storage() {
  local used free
  used="$(bytes_to_gb "$(folder_bytes)")"
  free="$(bytes_to_gb "$(free_bytes)")"
  printf '  Speicher: Ordner %s | frei %s\n' "$used" "$free"
}

has_audio() {
  local file="$1"
  ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$file" | grep -q .
}

move_without_audio_aside() {
  local file="$1"
  local stamp base candidate n

  stamp="$(date +%Y%m%d-%H%M%S)"
  base="${file%.mp4}.no-audio-${stamp}.mp4"
  candidate="$base"
  n=1

  while [[ -e "$candidate" ]]; do
    candidate="${base%.mp4}-$n.mp4"
    (( n += 1 ))
  done

  mv -- "$file" "$candidate"
  printf '%s' "${candidate##*/}"
}

progress_bar() {
  local current="$1"
  local total="$2"
  local width=30
  local filled percent empty

  if (( total <= 0 )); then
    printf '[%s]   0%%' "------------------------------"
    return
  fi

  filled=$(( current * width / total ))
  percent=$(( current * 100 / total ))
  empty=$(( width - filled ))

  printf '['
  printf '%*s' "$filled" '' | tr ' ' '#'
  printf '%*s' "$empty" '' | tr ' ' '-'
  printf '] %3d%% (%d/%d)' "$percent" "$current" "$total"
}

manifest_filename_for_id() {
  local id="$1"
  [[ -f "$manifest_file" ]] || return 0
  awk -F '\t' -v id="$id" '$1 == id { print $2; exit }' "$manifest_file"
}

record_manifest() {
  local id="$1"
  local filename="$2"
  local tmp

  tmp="$(mktemp)"
  if [[ -f "$manifest_file" ]]; then
    awk -F '\t' -v id="$id" '$1 != id' "$manifest_file" > "$tmp"
  fi
  printf '%s\t%s\n' "$id" "$filename" >> "$tmp"
  mv "$tmp" "$manifest_file"
}

find_old_file_for_id() {
  local index="$1"
  local id="$2"
  local candidate name suffix

  shopt -s nullglob
  suffix="[$id].mp4"
  for candidate in "$playlist_dir/$index - "*.mp4; do
    name="${candidate##*/}"
    if [[ "$name" == *"$suffix" ]]; then
      printf '%s' "$candidate"
      shopt -u nullglob
      return 0
    fi
  done
  shopt -u nullglob
}

existing_note=""
normalize_existing_file() {
  local index="$1"
  local id="$2"
  local target_file="$3"
  local target_name="$4"
  local manifest_name old_file old_name

  if [[ -f "$target_file" ]]; then
    if has_audio "$target_file"; then
      record_manifest "$id" "$target_name"
      existing_note="SKIP vorhanden mit Audio: $target_name"
      return 0
    fi

    if [[ "$mode" == "download" ]]; then
      existing_note="WARN ohne Audiospur, verschoben: $(move_without_audio_aside "$target_file")"
    else
      existing_note="WARN ohne Audiospur: $target_name"
    fi
    return 1
  fi

  old_file="$(find_old_file_for_id "$index" "$id")"
  if [[ -n "$old_file" && -f "$old_file" ]]; then
    old_name="${old_file##*/}"
    if [[ -e "$target_file" ]]; then
      existing_note="WARN Konflikt, Ziel existiert schon: $target_name"
      return 1
    fi

    mv -- "$old_file" "$target_file"

    if has_audio "$target_file"; then
      record_manifest "$id" "$target_name"
      existing_note="UMBENANNT mit Audio: $old_name -> $target_name"
      return 0
    fi

    if [[ "$mode" == "download" ]]; then
      existing_note="UMBENANNT, aber ohne Audiospur; verschoben: $(move_without_audio_aside "$target_file")"
    else
      existing_note="UMBENANNT, aber ohne Audiospur: $old_name -> $target_name"
    fi
    return 1
  fi

  manifest_name="$(manifest_filename_for_id "$id")"
  if [[ -n "$manifest_name" && -f "$playlist_dir/$manifest_name" ]]; then
    if has_audio "$playlist_dir/$manifest_name"; then
      existing_note="SKIP vorhanden laut Manifest mit Audio: $manifest_name"
      return 0
    fi

    if [[ "$mode" == "download" ]]; then
      existing_note="WARN Manifest-Datei ohne Audiospur, verschoben: $(move_without_audio_aside "$playlist_dir/$manifest_name")"
    else
      existing_note="WARN Manifest-Datei ohne Audiospur: $manifest_name"
    fi
    return 1
  fi

  existing_note=""
  return 1
}

partial_note=""
normalize_partial_file() {
  local index="$1"
  local id="$2"
  local target_file="$3"
  local candidate marker name rest new_file

  partial_note=""
  marker="[$id]."

  shopt -s nullglob
  for candidate in "$playlist_dir/$index - "*.part; do
    name="${candidate##*/}"
    if [[ "$name" == *"$marker"* ]]; then
      rest="${name#*"$marker"}"
      new_file="${target_file%.mp4}.${rest}"

      if [[ "$candidate" == "$new_file" ]]; then
        shopt -u nullglob
        return 0
      fi

      if [[ -e "$new_file" ]]; then
        partial_note="WARN Partial-Ziel existiert schon: ${new_file##*/}"
        shopt -u nullglob
        return 1
      fi

      mv -- "$candidate" "$new_file"
      partial_note="PARTIAL umbenannt: $name -> ${new_file##*/}"
      shopt -u nullglob
      return 0
    fi
  done
  shopt -u nullglob
  return 1
}

download_video() {
  local id="$1"
  local target_file="$2"
  local base

  base="${target_file%.mp4}"

  "$yt_dlp_bin" \
    --no-playlist \
    --continue \
    --no-overwrites \
    --ignore-errors \
    --quiet \
    --progress \
    --newline \
    --no-warnings \
    --format "$format_selector" \
    --merge-output-format mp4 \
    --output "${base}.%(ext)s" \
    "${extra_args[@]}" \
    "https://www.youtube.com/watch?v=$id"
}

try_load_playlist_entries() {
  local source_url="$1"
  local output_file="$2"
  shift 2
  local tmp_file

  tmp_file="$(mktemp)"
  : > "$output_file"

  if "$yt_dlp_bin" \
    --flat-playlist \
    --no-warnings \
    "$@" \
    --print "%(playlist_index)03d"$'\t'"%(id)s"$'\t'"%(title)s" \
    "$source_url" > "$tmp_file"; then
    grep -E '^[0-9]{3}[[:space:]]+[^[:space:]]+[[:space:]]+' "$tmp_file" > "$output_file" || true
  fi

  rm -f "$tmp_file"
  [[ -s "$output_file" ]]
}

load_playlist_entries() {
  local output_file="$1"

  echo "Lese Playlist..."
  if try_load_playlist_entries "$playlist_url" "$output_file" --extractor-args "youtubetab:skip=webpage"; then
    cp "$output_file" "$entries_cache_file"
    return 0
  fi

  echo "  API-Lesen leer, probiere normale Playlist-Seite..."
  if try_load_playlist_entries "$playlist_url" "$output_file"; then
    cp "$output_file" "$entries_cache_file"
    return 0
  fi

  echo "  Playlist-Seite leer, probiere Watch-URL..."
  if try_load_playlist_entries "$playlist_watch_url" "$output_file"; then
    cp "$output_file" "$entries_cache_file"
    return 0
  fi

  if [[ -s "$entries_cache_file" ]]; then
    echo "  Live-Lesen leer, nutze lokalen Playlist-Cache: $entries_cache_file"
    cp "$entries_cache_file" "$output_file"
    return 0
  fi

  return 1
}

entries_file="$(mktemp)"
trap 'rm -f "$entries_file"' EXIT

echo "Playlist: CompTIA SY0-701 Security+ Training Course"
echo "URL: $playlist_url"
echo "Zielordner: $playlist_dir"
echo "Maximale Hoehe: ${max_height}p"
echo "Modus: $mode"
echo "yt-dlp: $yt_dlp_bin ($yt_dlp_version)"
echo
init_failure_logs

if ! load_playlist_entries "$entries_file"; then
  log_general_failure "Keine Playlist-Eintraege gefunden"
  echo "Keine Playlist-Eintraege gefunden." >&2
  echo "Bitte pruefe mit: $yt_dlp_bin --flat-playlist \"$playlist_url\"" >&2
  echo "Fehlerliste: $failure_log_current" >&2
  exit 1
fi

total="$(wc -l < "$entries_file" | tr -d ' ')"
if (( total == 0 )); then
  echo "Keine Playlist-Eintraege gefunden." >&2
  exit 1
fi

part_count="$(find "$playlist_dir" -maxdepth 1 -type f -name '*.part' | wc -l | tr -d ' ')"
if (( part_count > 0 )); then
  echo "Hinweis: $part_count angefangene .part-Datei(en) im Ordner. Sie werden nicht als fertige Videos gewertet."
fi

echo "Gefundene Videos: $total"
print_storage
echo

current=0
skipped=0
renamed=0
downloaded=0
would_download=0
failed=0
missing_in_rename_only=0
logged_failures=0

while IFS=$'\t' read -r index video_id title; do
  (( current += 1 ))

  target_name="$(target_name_for "$index" "$title")"
  target_file="$playlist_dir/$target_name"

  printf '\n'
  progress_bar "$current" "$total"
  printf '\n'
  printf '[%s] %s\n' "$index" "$title"

  if normalize_existing_file "$index" "$video_id" "$target_file" "$target_name"; then
    if [[ "$existing_note" == UMBENANNT:* ]]; then
      (( renamed += 1 ))
    else
      (( skipped += 1 ))
    fi
    printf '  %s\n' "$existing_note"
    print_storage
    continue
  fi
  if [[ -n "$existing_note" ]]; then
    printf '  %s\n' "$existing_note"
  fi

  if normalize_partial_file "$index" "$video_id" "$target_file"; then
    if [[ -n "$partial_note" ]]; then
      printf '  %s\n' "$partial_note"
    fi
  elif [[ -n "$partial_note" ]]; then
    printf '  %s\n' "$partial_note"
  fi

  if [[ "$mode" == "rename-only" ]]; then
    (( missing_in_rename_only += 1 ))
    printf '  FEHLT: %s\n' "$target_name"
    print_storage
    continue
  fi

  if [[ "$mode" == "dry-run" ]]; then
    (( would_download += 1 ))
    printf '  WUERDE LADEN: %s\n' "$target_name"
    print_storage
    continue
  fi

  printf '  Download: %s\n' "$target_name"
  download_log="$(mktemp)"
  if download_video "$video_id" "$target_file" 2>&1 | tee "$download_log"; then
    if [[ -f "$target_file" ]]; then
      if has_audio "$target_file"; then
        record_manifest "$video_id" "$target_name"
        (( downloaded += 1 ))
        printf '  OK mit Audio: %s\n' "$target_name"
      else
        (( failed += 1 ))
        (( logged_failures += 1 ))
        moved_name="$(move_without_audio_aside "$target_file")"
        log_failure "$index" "$video_id" "$title" "$target_name" "Fertige MP4 hat keine Audiospur; verschoben nach: $moved_name"
        printf '  FEHLER: fertige MP4 hat keine Audiospur, verschoben: %s\n' "$moved_name" >&2
      fi
    else
      (( failed += 1 ))
      (( logged_failures += 1 ))
      log_failure "$index" "$video_id" "$title" "$target_name" "Download beendet, aber Zieldatei fehlt"
      printf '  FEHLER: Download beendet, aber Zieldatei fehlt: %s\n' "$target_name" >&2
    fi
  else
    (( failed += 1 ))
    (( logged_failures += 1 ))
    failure_reason="$(grep -E 'ERROR:|HTTP Error|Forbidden|failed|Unable|unable' "$download_log" | tail -n 1 || true)"
    if [[ -z "$failure_reason" ]]; then
      failure_reason="Download fehlgeschlagen"
    fi
    log_failure "$index" "$video_id" "$title" "$target_name" "$failure_reason"
    printf '  FEHLER: Download fehlgeschlagen: %s\n' "$target_name" >&2
  fi
  rm -f "$download_log"

  print_storage
done < "$entries_file"

echo
echo "Fertig."
echo "  Umbenannt: $renamed"
echo "  Uebersprungen: $skipped"
echo "  Neu geladen: $downloaded"
if [[ "$mode" == "dry-run" ]]; then
  echo "  Wuerde laden: $would_download"
fi
if [[ "$mode" == "rename-only" ]]; then
  echo "  Nicht vorhanden: $missing_in_rename_only"
fi
echo "  Fehler: $failed"
print_storage

{
  printf 'Ende: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')"
  printf 'Fehler in diesem Lauf: %s\n' "$logged_failures"
} >> "$failure_log_current"

if (( logged_failures == 0 )); then
  printf 'Keine fehlgeschlagenen Downloads in diesem Lauf.\n' >> "$failure_log_current"
else
  echo "  Fehlerliste: $failure_log_current"
  echo "  Fehlerverlauf: $failure_log_history"
fi

if (( failed > 0 )); then
  exit 1
fi
