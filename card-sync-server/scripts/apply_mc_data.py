#!/usr/bin/env python3
"""
apply_mc_data.py — MC-JSON-Dateien auf die DB anwenden

Liest mc_data/section*.json und aktualisiert front/back der Karten via card.update.
Karten die als needs_review markiert sind, werden nur getaggt, nicht konvertiert.

Usage:
    python scripts/apply_mc_data.py                    # alle mc_data/*.json
    python scripts/apply_mc_data.py mc_data/sec1.json  # einzelne Datei
    python scripts/apply_mc_data.py --dry-run
    python scripts/apply_mc_data.py --validate-only
"""

import argparse
import json
import sqlite3
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from sync_server import apply_operation, open_db, now_ms, get_default_profile_id  # noqa: E402

MC_DIR        = _ROOT / "mc_data"
SOURCE_CLIENT = "apply_mc_data"


def build_front(question: str, opts: dict) -> str:
    return f"{question}\nA: {opts['A']}\nB: {opts['B']}\nC: {opts['C']}\nD: {opts['D']}"


def build_back(correct: str, opts: dict, explanation: str) -> str:
    return f">> CORRECT: {correct} | {opts[correct]}\n\n{explanation}"


def delete_duplicates(conn: sqlite3.Connection, entry: dict, ts: int, user_id: str) -> None:
    for dup_id in entry.get("delete_duplicates", []):
        apply_operation(
            conn, "card.update",
            {"cardId": str(dup_id),
             "updates": {"isDeleted": True, "deletedAt": ts}},
            client_timestamp=ts, source_client=SOURCE_CLIENT, user_id=user_id,
        )


def apply_file(path: Path, user_id: str, dry_run: bool) -> dict:
    data   = json.loads(path.read_text(encoding="utf-8"))
    # Use max(now, max_updated_at + 1) to win LWW against any previously set future timestamps
    conn_ts = open_db()
    max_updated = conn_ts.execute(
        "SELECT MAX(updated_at) FROM server_cards WHERE user_id=?", (user_id,)
    ).fetchone()[0] or 0
    conn_ts.close()
    ts = max(now_ms(), max_updated + 1)
    conn   = open_db()
    stats  = {"converted": 0, "skipped": 0, "not_found": 0, "errors": []}

    for entry in data:
        card_id = str(entry["card_id"])

        # Karte existiert?
        row = conn.execute(
            "SELECT id, front, back FROM server_cards WHERE id=? AND user_id=? AND is_deleted=0",
            (card_id, user_id),
        ).fetchone()
        if not row:
            stats["not_found"] += 1
            continue

        # needs_review → nur Tag setzen, nicht konvertieren
        if entry.get("needs_review"):
            if not dry_run:
                existing_tags = json.loads(
                    conn.execute("SELECT tags_json FROM server_cards WHERE id=?", (card_id,))
                    .fetchone()[0] or "[]"
                )
                if "needs_review" not in existing_tags:
                    existing_tags.append("needs_review")
                    with conn:
                        apply_operation(
                            conn, "card.update",
                            {"cardId": card_id, "updates": {"tags": existing_tags}},
                            client_timestamp=ts, source_client=SOURCE_CLIENT, user_id=user_id,
                        )
                with conn:
                    delete_duplicates(conn, entry, ts, user_id)
            stats["skipped"] += 1
            continue

        # MC-Daten validieren
        opts = {k: entry.get(k, "") for k in "ABCD"}
        correct = (entry.get("correct") or "").upper()
        question = entry.get("question", "")
        explanation = entry.get("explanation_de", "")

        if not all([question, correct in "ABCD", all(opts.values()), explanation]):
            stats["errors"].append({"id": card_id, "reason": "Unvollständiger MC-Eintrag"})
            continue

        front_mc = build_front(question, opts)
        back_mc  = build_back(correct, opts, explanation)

        if not dry_run:
            with conn:
                apply_operation(
                    conn, "card.update",
                    {"cardId": card_id, "updates": {"front": front_mc, "back": back_mc}},
                    client_timestamp=ts, source_client=SOURCE_CLIENT, user_id=user_id,
                )
                # Duplikat-IDs soft-deleten wenn angegeben
                delete_duplicates(conn, entry, ts, user_id)

        stats["converted"] += 1

    conn.close()
    return stats


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("files",         nargs="*", help="JSON-Dateien (default: mc_data/*.json)")
    p.add_argument("--dry-run",     action="store_true")
    p.add_argument("--validate-only", action="store_true", dest="validate_only")
    p.add_argument("--user-id",     default=None, dest="user_id")
    args = p.parse_args()

    conn    = open_db()
    user_id = args.user_id or get_default_profile_id(conn) or ""
    conn.close()

    if args.validate_only:
        from scripts.import_apkg import validate_all_cards, print_validation  # type: ignore
        v = validate_all_cards(user_id)
        print_validation(v)
        return

    files = [Path(f) for f in args.files] if args.files else sorted(MC_DIR.glob("*.json"))
    if not files:
        print(f"Keine JSON-Dateien in {MC_DIR}")
        sys.exit(1)

    total = {"converted": 0, "skipped": 0, "not_found": 0, "errors": []}

    for fpath in files:
        print(f"▶ {fpath.name} …", end=" ", flush=True)
        s = apply_file(fpath, user_id, args.dry_run)
        print(f"konvertiert: {s['converted']}  skipped: {s['skipped']}  "
              f"not_found: {s['not_found']}  fehler: {len(s['errors'])}")
        total["converted"] += s["converted"]
        total["skipped"]   += s["skipped"]
        total["not_found"] += s["not_found"]
        total["errors"].extend(s["errors"])

    print(f"\n{'─'*50}")
    print(f"GESAMT  konvertiert: {total['converted']}  "
          f"needs_review: {total['skipped']}  "
          f"not_found: {total['not_found']}  "
          f"fehler: {len(total['errors'])}")
    if total["errors"]:
        for e in total["errors"][:5]:
            print(f"  [{e['id']}] {e['reason']}")

    if args.dry_run:
        print("\n[dry-run] Keine Änderungen gespeichert.")


if __name__ == "__main__":
    main()
