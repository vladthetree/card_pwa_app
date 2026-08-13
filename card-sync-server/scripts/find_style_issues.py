#!/usr/bin/env python3
"""find_style_issues.py — Detect floskel-style issues in SY0-701 domain cards.

Read-only. Identifies two known "floskel" (boilerplate) problems confirmed by
an independent second-opinion review of Vlad's SY0-701 domain card set:

  - template_suffix: cards using the "Which SY0-701 concept best matches this
    description?" template (produced by
    sample_Transcripts/improve/tools/optimize_domain_cards.py::render_card())
    always end every distractor line with the fixed
    "Das beschreibt „X" und nicht „Y"." suffix and close with
    "Prüfpunkt: Damit ist „X" gemeint." — identical wording on ~340 cards.

  - empty_distractor: distractor lines produced by the no-definition
    fallback branches of
    card-sync-server/scripts/audit_card_quality.py::human_incorrect_reason()
    inside the 03_Security_Architecture root deck — pure boilerplate with no
    fact about the wrong answer itself.

Output: card-sync-server/scripts/style_issues.json
    [{card_id, deck_id, deck_name, issue_type, front, back, bare_lines?}, ...]

Usage:
    python3 scripts/find_style_issues.py
"""
from __future__ import annotations

import json
import re
import sqlite3
from pathlib import Path

SERVER_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = SERVER_ROOT / "sync.db"
USER_ID = "fbe23414-9399-4a3b-9d89-19867a3b71da"  # Profil "Vlad"
OUT_PATH = Path(__file__).resolve().parent / "style_issues.json"

DOMAIN3_ROOT_DECK_ID = "1773512697128"  # 03_Security_Architecture (Root)


# ---------------------------------------------------------------------------
# Regex-Vorlagen, die exakt die no-definition-Fallback-Zweige von
# human_incorrect_reason() nachbilden — diese Zweige erzeugen Distraktor-
# Zeilen ohne jeden Fachbezug zur falschen Antwort, nur Verbindungsfloskel.
# Platzhalter ({option}, {correct_text}, {cue}) werden zu ".+?".
# ---------------------------------------------------------------------------
_P = r".+?"
BARE_FLOSKEL_PATTERNS = [
    # explicit_negative, ohne compact_definition
    rf"^„{_P}“ gehört zu den regulären Fällen; die gesuchte Ausnahme ist „{_P}“\.$",
    rf"^Nicht „{_P}“, sondern „{_P}“ weicht von den übrigen Antworten ab\.$",
    rf"^„{_P}“ erfüllt das gemeinsame Kriterium\. Ausgenommen ist „{_P}“\.$",
    rf"^Die Frage sucht den abweichenden Eintrag\. Das ist „{_P}“ und nicht „{_P}“\.$",
    rf"^„{_P}“ bleibt Teil der genannten Gruppe; „{_P}“ ist die Ausnahme\.$",
    rf"^Die Ausnahme lässt sich nicht mit „{_P}“ begründen\. Gemeint ist „{_P}“\.$",
    # "which term / describes"-Zweig
    rf"^Bei „{_P}“ fehlt die beschriebene Eigenschaft\. Sie kennzeichnet „{_P}“\.$",
    rf"^Der Begriff „{_P}“ steht nicht für diese Beschreibung\. Gemeint ist „{_P}“\.$",
    rf"^Die Definition beschreibt „{_P}“\. „{_P}“ hat eine andere Bedeutung\.$",
    rf"^Das ausschlaggebende Merkmal gehört zu „{_P}“ und nicht zu „{_P}“\.$",
    rf"^„{_P}“ lässt sich mit dieser Definition nicht vereinbaren; sie bezeichnet „{_P}“\.$",
    rf"^Die beschriebene Funktion ist die von „{_P}“\. „{_P}“ erfüllt sie nicht\.$",
    rf"^Hier wird nach „{_P}“ gefragt\. Der Begriff „{_P}“ bezeichnet diese Eigenschaft nicht\.$",
    rf"^Die Zuordnung lautet „{_P}“, weil „{_P}“ das genannte Kernmerkmal nicht besitzt\.$",
    # "wants / needs / organization"-Zweig
    rf"^Die Anforderung wird durch „{_P}“ erfüllt\. „{_P}“ löst die beschriebene Aufgabe nicht\.$",
    rf"^Für dieses Szenario wird „{_P}“ benötigt; „{_P}“ greift an einer anderen Stelle an\.$",
    rf"^Der Fall verlangt die Funktion von „{_P}“\. „{_P}“ bietet genau diese Funktion nicht\.$",
    rf"^Die Hinweise im Szenario führen zu „{_P}“\. Für „{_P}“ fehlt ein entsprechender Anhaltspunkt\.$",
    rf"^„{_P}“ passt nicht zum beschriebenen Einsatz\. Die geforderte Wirkung liefert „{_P}“\.$",
    rf"^Im gegebenen Ablauf übernimmt „{_P}“ die gesuchte Rolle, nicht „{_P}“\.$",
    rf"^Die Organisation braucht hier „{_P}“\. Mit „{_P}“ bliebe die genannte Anforderung offen\.$",
    rf"^„{_P}“ beantwortet den konkreten Bedarf des Szenarios; „{_P}“ dagegen nicht\.$",
    # generischer cue-basierter Fallback
    rf"^Der zentrale Hinweis lautet: {_P} Deshalb ist „{_P}“ richtig und nicht „{_P}“\.$",
    rf"^Aus der Beschreibung folgt „{_P}“\. „{_P}“ lässt sich daraus nicht ableiten\.$",
    rf"^„{_P}“ steht für einen anderen Sachverhalt\. Die vorliegenden Merkmale beschreiben „{_P}“\.$",
    rf"^Für „{_P}“ spricht: {_P} Das trifft auf „{_P}“ nicht zu\.$",
    rf"^Das genannte Merkmal führt zu „{_P}“\. Bei „{_P}“ wäre ein anderer Hinweis zu erwarten\.$",
    rf"^Die passende Zuordnung ist „{_P}“\. „{_P}“ besitzt die beschriebene Funktion nicht\.$",
    rf"^Hier geht es um „{_P}“: {_P} „{_P}“ beschreibt etwas anderes\.$",
    rf"^Der Unterschied liegt in der beschriebenen Funktion\. Sie gehört zu „{_P}“, nicht zu „{_P}“\.$",
]
BARE_FLOSKEL_RE = [re.compile(p, re.S) for p in BARE_FLOSKEL_PATTERNS]


def is_bare_floskel(line: str) -> bool:
    return any(rx.match(line.strip()) for rx in BARE_FLOSKEL_RE)


def find_template_suffix_cards(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """
        SELECT c.id, c.deck_id, d.name AS deck_name, c.front, c.back
        FROM server_cards c
        LEFT JOIN server_decks d ON d.id = c.deck_id AND d.user_id = c.user_id
        WHERE c.user_id = ? AND c.is_deleted = 0
          AND c.back LIKE '%Prüfpunkt: Damit ist%'
        ORDER BY c.deck_id, c.id
        """,
        (USER_ID,),
    ).fetchall()
    return [
        {
            "card_id": r["id"],
            "deck_id": r["deck_id"],
            "deck_name": r["deck_name"],
            "issue_type": "template_suffix",
            "front": r["front"],
            "back": r["back"],
        }
        for r in rows
    ]


def find_empty_distractor_cards(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """
        SELECT c.id, c.deck_id, d.name AS deck_name, c.front, c.back
        FROM server_cards c
        LEFT JOIN server_decks d ON d.id = c.deck_id AND d.user_id = c.user_id
        WHERE c.user_id = ? AND c.is_deleted = 0 AND c.deck_id = ?
        ORDER BY c.id
        """,
        (USER_ID, DOMAIN3_ROOT_DECK_ID),
    ).fetchall()
    out = []
    for r in rows:
        back = r["back"] or ""
        if "Nicht:" not in back:
            continue
        nicht_section = back.split("Nicht:", 1)[1]
        bare_lines = []
        for line in nicht_section.split("\n"):
            line = line.strip()
            if not line or "|" not in line:
                continue
            _, _, content = line.partition("|")
            content = content.strip()
            if is_bare_floskel(content):
                bare_lines.append(line)
        if bare_lines:
            out.append(
                {
                    "card_id": r["id"],
                    "deck_id": r["deck_id"],
                    "deck_name": r["deck_name"],
                    "issue_type": "empty_distractor",
                    "front": r["front"],
                    "back": r["back"],
                    "bare_lines": bare_lines,
                }
            )
    return out


def main() -> None:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        template_suffix = find_template_suffix_cards(conn)
        empty_distractor = find_empty_distractor_cards(conn)
    finally:
        conn.close()

    issues = template_suffix + empty_distractor
    OUT_PATH.write_text(json.dumps(issues, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"template_suffix:   {len(template_suffix)} Karten")
    print(
        f"empty_distractor:  {len(empty_distractor)} Karten "
        f"({sum(len(c['bare_lines']) for c in empty_distractor)} Distraktor-Zeilen)"
    )
    print(f"Gesamt: {len(issues)} Treffer -> {OUT_PATH}")


if __name__ == "__main__":
    main()
