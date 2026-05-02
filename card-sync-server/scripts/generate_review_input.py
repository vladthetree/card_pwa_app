#!/usr/bin/env python3
"""
Erzeugt eine AI-Review-Input-Datei für Security+-MC-Karten aus sync.db.

Die Ausgabe enthält:
  1. Den System-Prompt (review_prompt.txt)
  2. Alle MC-Karten in kompaktem, KI-lesbarem Format
  3. Optional aufgeteilt in Batches (--batch-size N Fragen pro Datei)

Usage:
    python scripts/generate_review_input.py
    python scripts/generate_review_input.py --batch-size 70
    python scripts/generate_review_input.py --deck "General_Security"
    python scripts/generate_review_input.py --user-id ba458562-...
    python scripts/generate_review_input.py --out review_input.txt

Output je Karte (kompakt, keine Wiederholungen):
    ---
    ID: 1772576356263
    Deck: 01_General_Security_Concepts
    Frage: 64: Valerie's organization has deployed...
    A: A policy enforcement point
    B: A policy administrator
    C: The policy engine
    D: The trust manager
    Richtig: A
    Erklaerung: PEP ist die Komponente, die den Zugang kontrolliert...
"""

import argparse
import os
import re
import sqlite3
import sys
from pathlib import Path

_SERVER_ROOT = Path(__file__).resolve().parent.parent
if str(_SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(_SERVER_ROOT))

from sync_server import open_db  # noqa: E402

# ─── Parsing ──────────────────────────────────────────────────────────────────

_CHOICE_LINE_RE = re.compile(r'^([A-D])[:\.\)]\s*(.+)$', re.MULTILINE)
_CORRECT_RE     = re.compile(r'>>\s*CORRECT:\s*([A-D])\s*\|?\s*(.*?)(?:\n\n|\Z)', re.DOTALL)
_HINT_RE        = re.compile(r'Merkhilfe:\s*(.+)', re.DOTALL | re.IGNORECASE)
_HTML_TAG_RE    = re.compile(r'<[^>]+>')
_HTML_ENT_RE    = re.compile(r'&([a-zA-Z]+|#\d+);')
_HTML_ENTS      = {'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', 'nbsp': ' '}


def _strip_html(text: str) -> str:
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = _HTML_TAG_RE.sub('', text)

    def _ent(m):
        n = m.group(1)
        return chr(int(n[1:])) if n.startswith('#') else _HTML_ENTS.get(n.lower(), m.group(0))

    return _HTML_ENT_RE.sub(_ent, text).strip()


def parse_mc_card(card_id: str, deck_name: str, front: str, back: str) -> dict | None:
    """
    Parst eine MC-Karte. Gibt None zurück wenn keine A/B/C/D-Optionen gefunden.
    """
    front_clean = _strip_html(front)
    back_clean  = _strip_html(back)

    choices: dict[str, str] = {}
    question_lines: list[str] = []

    for line in front_clean.splitlines():
        m = _CHOICE_LINE_RE.match(line)
        if m:
            choices[m.group(1)] = m.group(2).strip()
        else:
            if line.strip():
                question_lines.append(line.strip())

    if len(choices) < 2:
        return None

    question = ' '.join(question_lines).strip()

    # Richtige Antwort + Erklärung aus Back
    correct_letter = ''
    explanation    = ''

    m_correct = _CORRECT_RE.search(back_clean)
    if m_correct:
        correct_letter = m_correct.group(1).strip()
        raw_expl       = m_correct.group(2).strip() if m_correct.group(2) else ''
        # Merkhilfe vom Erklärungstext trennen
        m_hint = _HINT_RE.search(raw_expl)
        explanation = raw_expl[:m_hint.start()].strip() if m_hint else raw_expl
    else:
        explanation = back_clean

    return {
        'id':          card_id,
        'deck':        deck_name or '?',
        'question':    question,
        'choices':     choices,
        'correct':     correct_letter,
        'explanation': explanation,
    }


def format_card_for_review(card: dict) -> str:
    """Kompaktes Format für KI-Input."""
    lines = [
        '---',
        f'ID: {card["id"]}',
        f'Deck: {card["deck"]}',
        f'Frage: {card["question"]}',
    ]
    for letter in ['A', 'B', 'C', 'D']:
        if letter in card['choices']:
            lines.append(f'{letter}: {card["choices"][letter]}')
    lines.append(f'Richtig: {card["correct"]}')
    if card['explanation']:
        lines.append(f'Erklaerung: {card["explanation"]}')
    return '\n'.join(lines)


# ─── DB-Abfrage ───────────────────────────────────────────────────────────────

def load_mc_cards(user_id: str | None, deck_filter: str | None) -> list[dict]:
    uid  = user_id or ''
    conn = open_db(sqlite3.Row)

    sql = """
        SELECT c.id, c.front, c.back, d.name AS deck_name
        FROM server_cards c
        LEFT JOIN server_decks d ON d.id = c.deck_id AND d.user_id = c.user_id
        WHERE c.is_deleted = 0 AND c.user_id = ?
          AND c.front LIKE '%A:%' AND c.front LIKE '%B:%'
    """
    params: list = [uid]

    if deck_filter:
        sql += ' AND d.name LIKE ?'
        params.append(f'%{deck_filter}%')

    sql += ' ORDER BY d.name, CAST(c.id AS INTEGER)'

    rows = conn.execute(sql, params).fetchall()
    conn.close()

    cards = []
    for row in rows:
        parsed = parse_mc_card(row['id'], row['deck_name'], row['front'], row['back'])
        if parsed:
            cards.append(parsed)
    return cards


# ─── Ausgabe ─────────────────────────────────────────────────────────────────

def load_prompt(prompt_file: str) -> str:
    path = Path(prompt_file)
    if not path.exists():
        sys.exit(f'[FEHLER] Prompt-Datei nicht gefunden: {prompt_file}')
    return path.read_text(encoding='utf-8')


def write_batch(
    cards: list[dict],
    prompt: str,
    out_path: str,
    batch_num: int | None = None,
    total_batches: int | None = None,
) -> None:
    label = ''
    if batch_num is not None:
        label = f' (Batch {batch_num}/{total_batches})'

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(prompt)
        f.write(f'\n# {len(cards)} Fragen{label}\n\n')
        for card in cards:
            f.write(format_card_for_review(card))
            f.write('\n')

    size_kb = Path(out_path).stat().st_size // 1024
    print(f'  → {out_path}  ({len(cards)} Fragen, {size_kb} KB)')


# ─── CLI ─────────────────────────────────────────────────────────────────────

def main() -> None:
    script_dir   = Path(__file__).parent
    default_prompt = str(script_dir / 'review_prompt.txt')

    p = argparse.ArgumentParser(
        description='Review-Input-Datei für Security+-MC-Karten erzeugen'
    )
    p.add_argument('--db',         default=None,
                   help='DB-Pfad (default: SYNC_DB_PATH env oder sync.db)')
    p.add_argument('--user-id',    default=None, dest='user_id')
    p.add_argument('--deck',       default=None,
                   help='Nur Karten mit Deck-Name enthält <DECK>')
    p.add_argument('--prompt',     default=default_prompt,
                   help=f'Prompt-Datei (default: {default_prompt})')
    p.add_argument('--out',        default='review_input.txt',
                   help='Ausgabedatei (default: review_input.txt)')
    p.add_argument('--batch-size', default=0, type=int, dest='batch_size',
                   help='Karten pro Batch-Datei (0 = alle in einer Datei)')
    args = p.parse_args()

    if args.db:
        os.environ['SYNC_DB_PATH'] = args.db

    prompt = load_prompt(args.prompt)
    cards  = load_mc_cards(args.user_id, args.deck)

    if not cards:
        print('Keine MC-Karten gefunden.')
        sys.exit(0)

    print(f'  {len(cards)} MC-Karten geladen.')

    if args.batch_size > 0 and len(cards) > args.batch_size:
        # Mehrere Batch-Dateien
        batches = [cards[i:i + args.batch_size] for i in range(0, len(cards), args.batch_size)]
        stem = Path(args.out).stem
        suffix = Path(args.out).suffix or '.txt'
        total = len(batches)
        print(f'  Aufgeteilt in {total} Batches à max. {args.batch_size} Fragen:')
        for idx, batch in enumerate(batches, 1):
            out_path = str(Path(args.out).parent / f'{stem}_batch{idx:02d}{suffix}')
            write_batch(batch, prompt, out_path, batch_num=idx, total_batches=total)
    else:
        write_batch(cards, prompt, args.out)

    print('\nFertig. Datei(en) direkt in Claude / ChatGPT einfügen.')
    print('Erwartete Ausgabe: eine JSONL-Zeile pro Frage + eine Summary-Zeile.')


if __name__ == '__main__':
    main()
