#!/usr/bin/env python3
"""Wendet die 'move'-Entscheidungen aus content/sy0-701/source/mapping-decisions.json
auf sync.db an (Phase 0: "31 Mappings fachlich entscheiden und korrigieren").

Kontrakt (siehe Repo-Memory "Serverseitige Karten-Fixes"): ein server_cards-Edit
allein reicht nie — pro user_id muss eine sync_operations-Op geschrieben werden,
weil der Client-Pull ops-log-basiert ist. Dieses Skript nutzt dafür die echte
`apply_operation` des Sync-Servers (kein Schema-Nachbau).

Stand 2026-07-15: Auf Nutzer-Anweisung NICHT angewendet (Bestand unverändert
lassen). Vor einer späteren Anwendung zwingend:

  1. `card-sync-watchdog.timer` stoppen (startet den Server sonst binnen
     ~20 s neu — hat am 2026-07-15 mitten im Wartungsfenster einen
     Rebuild-Wipe ausgelöst).
  2. SYNC_REBUILD_ON_START=0 in .env.sync-server sicherstellen: der Rebuild
     löscht alle server_*-Tabellen und kann bootstrap-basierte Profile
     (Vlad, 687 Summary-only-Ops) NICHT wiederherstellen.
  3. Backup ziehen.

    systemctl --user stop card-sync-watchdog.timer card-sync-server.service
    cp card-sync-server/sync.db card-sync-server/sync.db.bak-<datum>
    python3 card_pwa/scripts/sy0701/apply_mapping_decisions.py [--dry-run]
    systemctl --user start card-sync-server.service card-sync-watchdog.timer
"""

import json
import re
import sqlite3
import sys
import time
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = APP_ROOT.parent
DECISIONS = APP_ROOT / "content" / "sy0-701" / "source" / "mapping-decisions.json"
SYNC_DB = REPO_ROOT / "card-sync-server" / "sync.db"

sys.path.insert(0, str(REPO_ROOT / "card-sync-server"))
from server.sync.operations import apply_operation  # noqa: E402

SOURCE = "server-maintenance-sy0701-mapping-fix"
SOURCE_CLIENT = "sy0701-mapping-fix-maintenance"


def deck_id_for(objective: str) -> str:
    return "sy0-701-objective-" + objective.replace(".", "-")


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    decisions = json.loads(DECISIONS.read_text(encoding="utf-8"))
    moves = [d for d in decisions["decisions"] if d["decision"] == "move"]
    if not moves:
        print("Keine 'move'-Entscheidungen — nichts zu tun.")
        return 0

    conn = sqlite3.connect(SYNC_DB)
    conn.row_factory = sqlite3.Row
    users = list(conn.execute("SELECT user_id, profile_name FROM users"))
    now_ms = int(time.time() * 1000)
    applied = 0

    for user in users:
        user_id = user["user_id"]
        deck_ids = {
            r["id"] for r in conn.execute(
                "SELECT id FROM server_decks WHERE user_id = ? AND deleted_at IS NULL", (user_id,)
            )
        }
        for d in moves:
            qid = d["questionId"]
            target_deck = deck_id_for(d["targetObjective"])
            if target_deck not in deck_ids:
                print(f"FEHLER: Zieldeck {target_deck} existiert nicht für {user['profile_name']}")
                return 1
            rows = list(conn.execute(
                "SELECT id, deck_id FROM server_cards"
                " WHERE user_id = ? AND deleted_at IS NULL AND front LIKE ?",
                (user_id, qid + ":%"),
            ))
            if len(rows) != 1:
                print(f"FEHLER: {qid} für {user['profile_name']}: {len(rows)} Treffer statt 1")
                return 1
            card = rows[0]
            if card["deck_id"] == target_deck:
                print(f"  {qid} ({user['profile_name']}): bereits in {target_deck}")
                continue
            print(f"  {qid} ({user['profile_name']}): {card['deck_id']} -> {target_deck}")
            if dry_run:
                continue
            payload = {
                "cardId": str(card["id"]),
                "updates": {"deckId": target_deck, "updatedAt": now_ms},
                "timestamp": now_ms,
            }
            op_id = f"{SOURCE}:card.update:{card['id']}:{user_id[:8]}"
            conn.execute(
                """INSERT INTO sync_operations
                   (op_id, op_type, payload_json, client_timestamp, source, source_client, created_at, user_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (op_id, "card.update", json.dumps(payload, ensure_ascii=False),
                 now_ms, SOURCE, SOURCE_CLIENT, int(time.time()), user_id),
            )
            apply_operation(conn, "card.update", payload, now_ms, SOURCE_CLIENT, op_id=op_id, user_id=user_id)
            applied += 1

    if dry_run:
        conn.rollback()
        print("Dry-Run: keine Änderungen geschrieben.")
    else:
        conn.commit()
        print(f"OK: {applied} card.update-Operationen geschrieben (LWW-konform, pro user_id).")
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
