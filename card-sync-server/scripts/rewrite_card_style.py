#!/usr/bin/env python3
"""rewrite_card_style.py — Anwenden handgeschriebener Kartentext-Umformulierungen.

Liest scripts/style_issues.json (erzeugt von find_style_issues.py) sowie
scripts/style_rewrites_authored.json (card_id -> neuer back-Text, von Claude
Code direkt in dieser Session verfasst — KEIN separater Anthropic-API-Call,
auf Nutzerwunsch). Validiert jede Umformulierung strukturell und schreibt sie
im Apply-Modus sicher in sync.db (server_cards + sync_operations).

Selbst auferlegte Stilregeln beim Verfassen der Umformulierungen (siehe
BANNED_PHRASES unten): keine der ursprünglichen Floskeln, faktentreu zum
Kartenkontext bzw. den Domain-Destillaten, 1-2 Sätze pro Distraktor,
unterschiedlicher Satzbau innerhalb derselben Karte.

Modi:
  --dry-run (Default)  Nur Vorschau erzeugen (style_rewrite_preview.md +
                        style_rewrite_preview.json), keine DB-Schreibvorgänge.
  --apply               Schreibt server_cards.back + passenden
                        sync_operations-Eintrag je Karte für user_id Vlad.
                        Nur nach expliziter Freigabe des Vorschau-Berichts.

Usage:
    python3 scripts/rewrite_card_style.py --dry-run
    python3 scripts/rewrite_card_style.py --apply
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
import time
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from sync_server import apply_operation, open_db, now_ms  # noqa: E402

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))
from find_style_issues import is_bare_floskel  # noqa: E402

ISSUES_PATH = SCRIPT_DIR / "style_issues.json"
AUTHORED_PATH = SCRIPT_DIR / "style_rewrites_authored.json"
PREVIEW_JSON = SCRIPT_DIR / "style_rewrite_preview.json"
PREVIEW_MD = SCRIPT_DIR / "style_rewrite_preview.md"

USER_ID = "fbe23414-9399-4a3b-9d89-19867a3b71da"  # Profil "Vlad"
SOURCE = "style-rewrite"
SOURCE_CLIENT = "rewrite_card_style"

# Referenz: diese Floskeln (aus audit_card_quality.py::human_incorrect_reason()
# und optimize_domain_cards.py::render_card()) dürfen in den Umformulierungen
# nicht mehr auftauchen.
BANNED_PHRASES = [
    "Der Fall verlangt die Funktion von … . … bietet genau diese Funktion nicht.",
    "Die Organisation braucht hier … . Mit … bliebe die genannte Anforderung offen.",
    "Im gegebenen Ablauf übernimmt … die gesuchte Rolle, nicht … .",
    "Aus der Beschreibung folgt … . … lässt sich daraus nicht ableiten.",
    "Der zentrale Hinweis lautet: … Deshalb ist … richtig und nicht … .",
    "Die Hinweise im Szenario führen zu … . Für … fehlt ein entsprechender Anhaltspunkt.",
    "Die Anforderung wird durch … erfüllt. … löst die beschriebene Aufgabe nicht.",
    "Für dieses Szenario wird … benötigt; … greift an einer anderen Stelle an.",
    "Bei … fehlt die beschriebene Eigenschaft. Sie kennzeichnet … .",
    "Der Begriff … steht nicht für diese Beschreibung. Gemeint ist … .",
    "Die Definition beschreibt … . … hat eine andere Bedeutung.",
    "Das ausschlaggebende Merkmal gehört zu … und nicht zu … .",
    "Die beschriebene Funktion ist die von … . … erfüllt sie nicht.",
    "Die Zuordnung lautet … , weil … das genannte Kernmerkmal nicht besitzt.",
    "Der Unterschied liegt in der beschriebenen Funktion. Sie gehört zu … , nicht zu … .",
    "Das genannte Merkmal führt zu … . Bei … wäre ein anderer Hinweis zu erwarten.",
    "Die passende Zuordnung ist … . … besitzt die beschriebene Funktion nicht.",
    "Das beschreibt „X“ und nicht „Y“.",
    "Prüfpunkt: Damit ist „X“ gemeint.",
]


# ---------------------------------------------------------------------------
# Strukturvalidierung
# ---------------------------------------------------------------------------

_CORRECT_RE = re.compile(r"^>>\s*CORRECT:\s*([A-D])\s*\|", re.M)
_FIXED_SUFFIX_RE = re.compile(r"Das beschreibt „.+?“ und nicht „.+?“\.")
_PRUEFPUNKT_RE = re.compile(r"Prüfpunkt: Damit ist „.+?“ gemeint\.")


def parse_back(back: str) -> dict | None:
    m = _CORRECT_RE.search(back or "")
    if not m or "Nicht:" not in back:
        return None
    correct = m.group(1)
    nicht_section = back.split("Nicht:", 1)[1]
    letters, contents = [], {}
    for line in nicht_section.split("\n"):
        line = line.strip()
        if not line or "|" not in line:
            continue
        letter, _, content = line.partition("|")
        letter = letter.strip()
        if letter in "ABCD":
            letters.append(letter)
            contents[letter] = content.strip()
    return {"correct": correct, "letters": letters, "contents": contents}


def validate_rewrite(old_back: str, new_back: str, issue_type: str) -> str | None:
    old = parse_back(old_back)
    new = parse_back(new_back)
    if not new:
        return "Neuer Back-Text hat kein gültiges >> CORRECT:/Nicht:-Format"
    if old and new["correct"] != old["correct"]:
        return f"Korrekt-Buchstabe geändert: {old['correct']} -> {new['correct']}"
    if old and sorted(new["letters"]) != sorted(old["letters"]):
        return f"Distraktor-Buchstaben geändert: {old['letters']} -> {new['letters']}"
    for letter, content in new["contents"].items():
        if len(content) < 15:
            return f"Distraktor {letter} zu kurz/leer: {content!r}"
        if is_bare_floskel(content):
            return f"Distraktor {letter} enthält weiterhin eine reine Floskel"
    if issue_type == "template_suffix":
        if _FIXED_SUFFIX_RE.search(new_back):
            return "Fixer Schlusshalbsatz 'Das beschreibt X und nicht Y' noch vorhanden"
        if _PRUEFPUNKT_RE.search(new_back):
            return "Fixe 'Prüfpunkt'-Zeile noch vorhanden"
    return None


# ---------------------------------------------------------------------------
# DB-Schreibvorgang (Apply-Modus)
# ---------------------------------------------------------------------------

def write_rewrite(conn: sqlite3.Connection, card_id: str, new_back: str) -> None:
    ts = now_ms()
    op_id = f"{SOURCE}:{USER_ID}:card.update:{card_id}:{ts}"
    payload = {"cardId": card_id, "updates": {"back": new_back, "updatedAt": ts}, "timestamp": ts}
    with conn:
        apply_operation(
            conn, "card.update", payload,
            client_timestamp=ts, source_client=SOURCE_CLIENT, op_id=op_id, user_id=USER_ID,
        )
        conn.execute(
            """
            INSERT OR IGNORE INTO sync_operations
              (op_id, op_type, payload_json, client_timestamp, source, source_client, created_at, user_id)
            VALUES (?, 'card.update', ?, ?, ?, ?, ?, ?)
            """,
            (op_id, json.dumps(payload, ensure_ascii=False), ts, SOURCE, SOURCE_CLIENT,
             int(time.time()), USER_ID),
        )


# ---------------------------------------------------------------------------
# Vorschau-Bericht
# ---------------------------------------------------------------------------

def write_preview(results: list[dict]) -> None:
    PREVIEW_JSON.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

    ok = [r for r in results if r["status"] == "ok"]
    failed = [r for r in results if r["status"] == "failed"]

    by_type: dict[str, list[dict]] = {}
    for r in ok:
        by_type.setdefault(r["issue_type"], []).append(r)

    sample: list[dict] = []
    for issue_type, items in by_type.items():
        step = max(1, len(items) // 10)
        sample.extend(items[::step][:10])

    lines = [
        "# Vorschau: Floskel-Rewrite SY0-701-Karten",
        "",
        f"Gesamt bearbeitet: {len(results)}  |  Erfolgreich: {len(ok)}  |  "
        f"Fehlgeschlagen/übersprungen: {len(failed)}",
        "",
    ]
    for issue_type, items in by_type.items():
        lines.append(f"- `{issue_type}`: {len(items)} Karten erfolgreich umgeschrieben")
    lines.append("")
    lines.append(f"## Stichprobe ({len(sample)} Karten, vorher/nachher)")
    lines.append("")
    for r in sample:
        lines.append(f"### Karte `{r['card_id']}` — {r['deck_name']} ({r['issue_type']})")
        lines.append("")
        lines.append("**Front:**")
        lines.append("```")
        lines.append(r["front"])
        lines.append("```")
        lines.append("**Vorher:**")
        lines.append("```")
        lines.append(r["old_back"])
        lines.append("```")
        lines.append("**Nachher:**")
        lines.append("```")
        lines.append(r["new_back"])
        lines.append("```")
        lines.append("")
    if failed:
        lines.append(f"## Fehlgeschlagen/übersprungen ({len(failed)})")
        lines.append("")
        for r in failed[:30]:
            lines.append(f"- `{r['card_id']}` ({r['issue_type']}): {r['reason']}")
        lines.append("")
    PREVIEW_MD.write_text("\n".join(lines), encoding="utf-8")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    p = argparse.ArgumentParser(description="Handgeschriebene Kartentext-Umformulierungen anwenden")
    p.add_argument("--apply", action="store_true", help="In sync.db schreiben (statt Vorschau)")
    args = p.parse_args()

    if not ISSUES_PATH.exists():
        print(f"Fehler: {ISSUES_PATH} fehlt. Zuerst find_style_issues.py ausführen.", file=sys.stderr)
        sys.exit(1)
    if not AUTHORED_PATH.exists():
        print(f"Fehler: {AUTHORED_PATH} fehlt. Umformulierungen zuerst verfassen.", file=sys.stderr)
        sys.exit(1)

    issues = {i["card_id"]: i for i in json.loads(ISSUES_PATH.read_text(encoding="utf-8"))}
    authored: dict[str, str] = json.loads(AUTHORED_PATH.read_text(encoding="utf-8"))

    print(f"style_issues.json: {len(issues)} Karten insgesamt")
    print(f"style_rewrites_authored.json: {len(authored)} verfasste Umformulierungen\n")

    results: list[dict] = []
    conn = open_db() if args.apply else None

    for card_id, new_back in authored.items():
        issue = issues.get(card_id)
        if not issue:
            results.append({"card_id": card_id, "issue_type": "?", "deck_name": "?",
                             "front": "", "old_back": "", "new_back": new_back,
                             "status": "failed", "reason": "card_id nicht in style_issues.json"})
            continue

        error = validate_rewrite(issue["back"], new_back, issue["issue_type"])
        if error:
            print(f"{card_id}  Validierung fehlgeschlagen: {error}")
            results.append({"card_id": card_id, "issue_type": issue["issue_type"],
                             "deck_name": issue["deck_name"], "front": issue["front"],
                             "old_back": issue["back"], "new_back": new_back,
                             "status": "failed", "reason": error})
            continue

        results.append({
            "card_id": card_id,
            "deck_name": issue["deck_name"],
            "issue_type": issue["issue_type"],
            "front": issue["front"],
            "old_back": issue["back"],
            "new_back": new_back,
            "status": "ok",
        })
        print(f"{card_id}  OK")

        if args.apply:
            write_rewrite(conn, card_id, new_back)

    if conn:
        conn.close()

    missing = [cid for cid in issues if cid not in authored]
    if missing:
        print(f"\n{len(missing)} Karten aus style_issues.json noch ohne Umformulierung "
              f"(nicht in style_rewrites_authored.json) — werden übersprungen.")

    write_preview(results)
    ok_count = sum(1 for r in results if r["status"] == "ok")
    print(f"\n{'Angewendet' if args.apply else 'Vorschau'}: {ok_count} Karten "
          f"{'geschrieben' if args.apply else 'validiert'}.")
    print(f"Bericht: {PREVIEW_MD}")
    print(f"Details: {PREVIEW_JSON}")


if __name__ == "__main__":
    main()
