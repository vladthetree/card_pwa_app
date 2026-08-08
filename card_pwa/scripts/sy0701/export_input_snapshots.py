#!/usr/bin/env python3
"""Exportiert die veränderlichen Eingangsdaten der Phase-0-Validierung als
versionierte Snapshots nach content/sy0-701/source/ (Plan §23.1).

Snapshots statt Live-Zugriff, damit `npm run content:sy0701:validate`
reproduzierbar läuft, auch ohne sync.db/Videoverzeichnis. Neu ausführen,
wenn sich Kartenbestand oder Videobestand ändern:

    python3 scripts/sy0701/export_input_snapshots.py
"""

import json
import argparse
import re
import sqlite3
import subprocess
import sys
import time
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = APP_ROOT.parent
SOURCE_DIR = APP_ROOT / "content" / "sy0-701" / "source"
SYNC_DB = REPO_ROOT / "card-sync-server" / "sync.db"
VIDEO_GLOB = "youtube-playlists/*SY0-701*"

# Muss dem Parser in src/utils/localVideoManifest.ts entsprechen.
FILENAME_PATTERN = re.compile(r"^(\d+)\s*-\s*([1-5]\.\d{1,2})\s*-\s*(.+?)\s*\.mp4$", re.I)
COURSE_SUFFIX = re.compile(r"\s*-\s*CompTIA.*$", re.I)


def probe_duration_sec(path: Path) -> int | None:
    """Videodauer in Sekunden via ffprobe; None, wenn nicht ermittelbar."""
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
            capture_output=True, text=True, timeout=30, check=True,
        ).stdout.strip()
        return round(float(out))
    except Exception:
        return None


def export_videos() -> dict:
    candidates = sorted(Path.home().glob(VIDEO_GLOB))
    if not candidates:
        print(f"FEHLER: kein Videoverzeichnis unter ~/{VIDEO_GLOB}", file=sys.stderr)
        raise SystemExit(1)
    video_dir = candidates[0]
    videos = []
    skipped = []
    for f in sorted(video_dir.iterdir()):
        if f.suffix.lower() != ".mp4":
            continue
        m = FILENAME_PATTERN.match(f.name)
        if not m:
            skipped.append(f.name)
            continue
        title = COURSE_SUFFIX.sub("", m.group(3)).strip()
        videos.append({
            "index": int(m.group(1)),
            "objective": m.group(2),
            "title": title,
            "file": f.name,
            "durationSec": probe_duration_sec(f),
        })
    return {
        "schemaVersion": "sy0701-videos-1",
        "exportedAt": int(time.time() * 1000),
        "sourceDir": str(video_dir),
        "videos": sorted(videos, key=lambda v: v["index"]),
        "skippedFiles": skipped,
    }


def export_cards() -> dict:
    db = sqlite3.connect(SYNC_DB)
    db.row_factory = sqlite3.Row
    users = {
        r["user_id"]: r["profile_name"]
        for r in db.execute("SELECT user_id, profile_name FROM users")
    }
    profiles = []
    for user_id, profile_name in sorted(users.items(), key=lambda u: u[1]):
        decks = {
            r["id"]: r["name"]
            for r in db.execute(
                "SELECT id, name FROM server_decks WHERE user_id = ? AND deleted_at IS NULL",
                (user_id,),
            )
        }
        cards = [
            {
                "id": str(r["id"]),
                "deckId": r["deck_id"],
                "front": r["front"],
                "qaBlocked": any(
                    str(tag).strip().lower() == "qa-blocked"
                    for tag in json.loads(r["tags_json"] or "[]")
                ),
                "type": r["type"],
            }
            for r in db.execute(
                "SELECT id, deck_id, front, tags_json, type FROM server_cards"
                " WHERE user_id = ? AND deleted_at IS NULL AND IFNULL(is_deleted, 0)=0 ORDER BY id",
                (user_id,),
            )
        ]
        profiles.append({
            "userId": user_id,
            "profileName": profile_name,
            "decks": decks,
            "cards": cards,
        })
    return {
        "schemaVersion": "sy0701-cards-1",
        "exportedAt": int(time.time() * 1000),
        "sourceDb": str(SYNC_DB.relative_to(REPO_ROOT)),
        "profiles": profiles,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--cards-only",
        action="store_true",
        help="Nur den Karten-Snapshot aktualisieren, wenn die unveränderten lokalen Videos nicht verfügbar sind.",
    )
    args = parser.parse_args()
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)

    if not args.cards_only:
        videos = export_videos()
        (SOURCE_DIR / "videos-manifest.json").write_text(
            json.dumps(videos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        course = [v for v in videos["videos"] if v["index"] >= 2]
        print(f"videos-manifest.json: {len(videos['videos'])} Videos mit Objective-Code, {len(course)} Kurs-Einheiten (002+)")

    cards = export_cards()
    (SOURCE_DIR / "cards-snapshot.json").write_text(
        json.dumps(cards, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    for p in cards["profiles"]:
        print(f"cards-snapshot.json: Profil {p['profileName']}: {len(p['cards'])} aktive Karten, {len(p['decks'])} Decks")
    return 0


if __name__ == "__main__":
    sys.exit(main())
