#!/usr/bin/env python3
"""
apply_mc_data.py — MC-JSON-Dateien auf die DB anwenden

Liest mc_data/section*.json und aktualisiert front/back der Karten via card.update.
Nur explizit fachlich freigegebene Einträge werden veröffentlicht. Entwürfe
oder unvollständige Einträge erhalten qa-blocked und bleiben in der DB.

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
from urllib.parse import urlparse

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from sync_server import apply_operation, open_db, now_ms, get_default_profile_id  # noqa: E402

MC_DIR        = _ROOT / "mc_data"
SOURCE_CLIENT = "apply_mc_data"
PRIMARY_SOURCE_HOSTS = {
    "cisa.gov",
    "csrc.nist.gov",
    "eur-lex.europa.eu",
    "ietf.org",
    "lecbyo.files.cmp.optimizely.com",
    "nist.gov",
    "nvlpubs.nist.gov",
    "owasp.org",
    "rfc-editor.org",
    "www.cisa.gov",
    "www.ietf.org",
    "www.nist.gov",
    "www.owasp.org",
    "www.rfc-editor.org",
}


def build_front(question: str, opts: dict) -> str:
    return f"{question}\nA: {opts['A']}\nB: {opts['B']}\nC: {opts['C']}\nD: {opts['D']}"


def build_back(correct: str, explanation: str, incorrect: dict) -> str:
    wrong_lines = [f"{letter} | {incorrect[letter]}" for letter in "ABCD" if letter != correct]
    return f">> CORRECT: {correct} |\n\n{explanation}\n\nNicht:\n" + "\n".join(wrong_lines)


def with_qa_blocked(tags: list[str], blocked: bool) -> list[str]:
    normalized = [tag for tag in tags if str(tag).strip().lower() != "qa-blocked"]
    if blocked:
        normalized.append("qa-blocked")
    return normalized


def has_primary_source(source_refs: object) -> bool:
    if not isinstance(source_refs, list) or not source_refs:
        return False
    for ref in source_refs:
        if not isinstance(ref, str) or not ref.strip():
            continue
        parsed = urlparse(ref.strip())
        if parsed.scheme == "https" and parsed.hostname in PRIMARY_SOURCE_HOSTS:
            return True
    return False


def block_duplicates(conn: sqlite3.Connection, entry: dict, ts: int, user_id: str) -> None:
    """Legacy manifests may identify duplicate IDs; quarantine instead of deleting them."""
    for dup_id in entry.get("delete_duplicates", []):
        row = conn.execute(
            "SELECT tags_json FROM server_cards WHERE id=? AND user_id=? AND IFNULL(is_deleted, 0)=0",
            (str(dup_id), user_id),
        ).fetchone()
        if not row:
            continue
        tags = with_qa_blocked(json.loads(row[0] or "[]"), True)
        apply_operation(
            conn, "card.update",
            {"cardId": str(dup_id),
             "updates": {"tags": tags}},
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
            "SELECT id, front, back, tags_json FROM server_cards WHERE id=? AND user_id=? AND is_deleted=0",
            (card_id, user_id),
        ).fetchone()
        if not row:
            stats["not_found"] += 1
            continue

        # Nur ein vollständig kuratierter, quellenbelegter Datensatz darf aktiv
        # werden. Generatoren liefern absichtlich qa_status=draft.
        if entry.get("needs_review") or entry.get("qa_status") != "approved":
            if not dry_run:
                existing_tags = json.loads(
                    conn.execute("SELECT tags_json FROM server_cards WHERE id=? AND user_id=?", (card_id, user_id))
                    .fetchone()[0] or "[]"
                )
                next_tags = with_qa_blocked(existing_tags, True)
                if next_tags != existing_tags:
                    with conn:
                        apply_operation(
                            conn, "card.update",
                            {"cardId": card_id, "updates": {"tags": next_tags}},
                            client_timestamp=ts, source_client=SOURCE_CLIENT, user_id=user_id,
                        )
                with conn:
                    block_duplicates(conn, entry, ts, user_id)
            stats["skipped"] += 1
            continue

        # MC-Daten validieren
        opts = {k: entry.get(k, "") for k in "ABCD"}
        correct = (entry.get("correct") or "").upper()
        question = entry.get("question", "")
        explanation = entry.get("explanation_de", "")
        incorrect = entry.get("incorrect_explanations_de") or {}
        source_refs = entry.get("source_refs") or []

        wrong_letters = {letter for letter in "ABCD" if letter != correct}
        valid_incorrect = isinstance(incorrect, dict) and set(incorrect) == wrong_letters and all(
            isinstance(incorrect[letter], str) and incorrect[letter].strip() for letter in wrong_letters
        )
        unique_options = len({value.strip().casefold() for value in opts.values()}) == 4
        if not all([
            question,
            correct in "ABCD",
            all(opts.values()),
            unique_options,
            explanation,
            valid_incorrect,
            isinstance(source_refs, list) and bool(source_refs)
            and all(isinstance(ref, str) and ref.strip() for ref in source_refs)
            and has_primary_source(source_refs),
        ]):
            stats["errors"].append({"id": card_id, "reason": "Unvollständiger MC-Eintrag"})
            continue

        front_mc = build_front(question, opts)
        back_mc  = build_back(correct, explanation, incorrect)

        if not dry_run:
            with conn:
                apply_operation(
                    conn, "card.update",
                    {"cardId": card_id, "updates": {
                        "front": front_mc,
                        "back": back_mc,
                        "tags": with_qa_blocked(json.loads(row[3] or "[]"), False),
                    }},
                    client_timestamp=ts, source_client=SOURCE_CLIENT, user_id=user_id,
                )
                # Duplikat-IDs bleiben verwaltbar und werden nur quarantänisiert.
                block_duplicates(conn, entry, ts, user_id)

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
