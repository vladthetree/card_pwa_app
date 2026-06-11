#!/usr/bin/env python3
"""
Import a card-pwa TXT backup (#card-pwa:backup-v1) directly into sync.db.

Maintenance tool for disaster recovery (Project_Restore Phase 3): reads the
`card-pwa-meta:<base64 JSON>` block of every card in the backup file and
replays it through apply_operation() — the identical write path a real client
push uses. LWW makes the import idempotent; running it twice is safe.

The backup meta is canonical (exported by the PWA itself), so all FSRS state
(type, queue, due, dueAt, interval, factor, stability, difficulty, reps,
lapses, algorithm) survives unchanged. Deck hierarchy is seeded server-side
by ensure_security_deck_hierarchy() during deck.create.

Usage
-----
    python scripts/import_card_pwa_backup.py /path/to/card-pwa-backup-*.txt --dry-run
    python scripts/import_card_pwa_backup.py /path/to/card-pwa-backup-*.txt
    python scripts/import_card_pwa_backup.py backup.txt --user-id <uuid>
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from sync_server import apply_operation, get_default_profile_id, now_ms, open_db  # noqa: E402

SOURCE_CLIENT = "card-pwa-backup-import"
META_RE = re.compile(r"card-pwa-meta:([A-Za-z0-9+/=]+)")

REQUIRED_CARD_KEYS = ("id", "deckId", "front", "back")


def read_backup(path: Path) -> list[dict]:
    raw = path.read_text(encoding="utf-8")
    if "#card-pwa:backup-v1" not in raw.splitlines()[3]:
        if "#card-pwa:backup-v1" not in raw[:600]:
            raise SystemExit(f"Abbruch: {path} hat keinen '#card-pwa:backup-v1'-Header.")
    entries = []
    for token in META_RE.findall(raw):
        data = json.loads(base64.b64decode(token))
        if not isinstance(data, dict) or "card" not in data:
            raise SystemExit("Abbruch: card-pwa-meta-Eintrag ohne 'card'-Objekt.")
        entries.append(data)
    if not entries:
        raise SystemExit("Abbruch: keine card-pwa-meta-Einträge gefunden.")
    return entries


def validate_entries(entries: list[dict]) -> tuple[list[dict], dict[str, str]]:
    cards = []
    deck_names: dict[str, str] = {}
    seen_ids: set[str] = set()
    for entry in entries:
        card = entry["card"]
        for key in REQUIRED_CARD_KEYS:
            if not card.get(key):
                raise SystemExit(f"Abbruch: Karte ohne '{key}': {json.dumps(card)[:120]}")
        card_id = str(card["id"])
        if card_id in seen_ids:
            raise SystemExit(f"Abbruch: doppelte card_id {card_id} im Backup.")
        seen_ids.add(card_id)
        deck_id = str(card["deckId"])
        deck_name = entry.get("deckName")
        if deck_name:
            existing = deck_names.get(deck_id)
            if existing and existing != deck_name:
                raise SystemExit(f"Abbruch: Deck {deck_id} mit zwei Namen: {existing!r} / {deck_name!r}")
            deck_names[deck_id] = deck_name
        cards.append(card)
    missing_names = {c["deckId"] for c in cards} - set(deck_names)
    if missing_names:
        raise SystemExit(f"Abbruch: Decks ohne Namen im Backup: {sorted(missing_names)}")
    return cards, deck_names


def state_counts(conn, user_id: str) -> dict[str, int]:
    return {
        "decks_active": conn.execute(
            "SELECT COUNT(*) FROM server_decks WHERE user_id=? AND deleted_at IS NULL", (user_id,)
        ).fetchone()[0],
        "cards_active": conn.execute(
            "SELECT COUNT(*) FROM server_cards WHERE user_id=? AND IFNULL(is_deleted,0)=0", (user_id,)
        ).fetchone()[0],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="card-pwa TXT-Backup in sync.db importieren")
    parser.add_argument("backup", help="Pfad zur card-pwa-backup-*.txt")
    parser.add_argument("--user-id", default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    backup_path = Path(args.backup).resolve()
    if not backup_path.exists():
        raise SystemExit(f"Datei nicht gefunden: {backup_path}")

    entries = read_backup(backup_path)
    cards, deck_names = validate_entries(entries)
    algorithms = sorted({str(c.get("algorithm") or "?") for c in cards})

    print(f"Backup:  {backup_path.name}")
    print(f"Karten:  {len(cards)}  |  Decks: {len(deck_names)}  |  Algorithmen: {algorithms}")

    conn = open_db()
    try:
        user_id = args.user_id or get_default_profile_id(conn)
        if not user_id:
            raise SystemExit("Abbruch: kein Default-Profil in der DB (Server einmal starten).")
        print(f"Profil:  {user_id}")

        before = state_counts(conn, user_id)
        print(f"Vorher:  decks={before['decks_active']}  cards={before['cards_active']}")

        if args.dry_run:
            print("[dry-run] Keine Änderungen geschrieben.")
            return

        now = now_ms()
        with conn:
            for deck_id, name in sorted(deck_names.items()):
                apply_operation(
                    conn, "deck.create",
                    {"id": deck_id, "name": name, "createdAt": now, "updatedAt": now,
                     "source": SOURCE_CLIENT},
                    client_timestamp=now, source_client=SOURCE_CLIENT, user_id=user_id,
                )

        chunk = 200
        for i in range(0, len(cards), chunk):
            with conn:
                for card in cards[i:i + chunk]:
                    ts = int(card.get("updatedAt") or card.get("createdAt") or now)
                    apply_operation(
                        conn, "card.create", dict(card),
                        client_timestamp=ts, source_client=SOURCE_CLIENT, user_id=user_id,
                    )
            print(f"  … {min(i + chunk, len(cards))}/{len(cards)} Karten", end="\r", flush=True)
        print()

        after = state_counts(conn, user_id)
        print(f"Nachher: decks={after['decks_active']}  cards={after['cards_active']}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
