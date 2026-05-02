#!/usr/bin/env python3
"""
Export cards from sync.db into a clean format for AI review.

Usage:
    python scripts/export_for_ai_review.py                         # alle Karten → ai_review.jsonl
    python scripts/export_for_ai_review.py --format txt            # Klartext → ai_review.txt
    python scripts/export_for_ai_review.py --deck "Security_Arch"  # nur ein Deck (Substring-Match)
    python scripts/export_for_ai_review.py --user-id <uid>         # nur ein User
    python scripts/export_for_ai_review.py --db /pfad/sync.db      # anderer DB-Pfad
    python scripts/export_for_ai_review.py --out /pfad/out.jsonl   # anderer Output-Pfad

Ausgabe-Felder (JSONL):
    deck_name, card_id, note_id, question, choices (A/B/C/D), correct_letter,
    correct_text, explanation, hint, tags, has_mc
"""

import argparse
import json
import os
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path


# ─── Parsing ──────────────────────────────────────────────────────────────────

def strip_html(text: str) -> str:
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&amp;', '&', text)
    text = re.sub(r'&lt;', '<', text)
    text = re.sub(r'&gt;', '>', text)
    text = re.sub(r'&quot;', '"', text)
    return text.strip()


# Matches "A: text", "A. text", "A) text" at the start of a line (after optional number prefix)
_CHOICE_RE = re.compile(r'^\s*([A-D])[:\.\)]\s*(.+)$', re.MULTILINE)

def parse_front(raw_front: str) -> dict:
    """
    Parst den Front-Text einer Karte.
    Gibt zurück:
        question:  Fragetext (ohne Antwortoptionen)
        choices:   {"A": "...", "B": "...", ...} oder {}
        has_mc:    True wenn Multiple-Choice-Optionen gefunden
    """
    text = strip_html(raw_front)

    choices: dict[str, str] = {}
    question_lines: list[str] = []

    for line in text.splitlines():
        m = _CHOICE_RE.match(line)
        if m:
            choices[m.group(1)] = m.group(2).strip()
        else:
            question_lines.append(line)

    # Fallback: Wenn alle Zeilen als Antwortoptionen erkannt wurden, ist die erste Zeile die Frage
    question = '\n'.join(question_lines).strip()
    if not question and choices:
        # Frage steckt im ersten Choice-Block davor → kann bei kompaktem Format passieren
        question = raw_front.split('\n')[0].strip()

    return {
        'question': question,
        'choices': choices,
        'has_mc': len(choices) >= 2,
    }


# Matches ">> CORRECT: C | Explanation text"
_CORRECT_RE = re.compile(r'>>\s*CORRECT:\s*([A-D])\s*\|?\s*(.*?)(?:\n|$)', re.DOTALL)
# Matches "Merkhilfe: ..." hint block
_HINT_RE = re.compile(r'Merkhilfe:\s*(.+)', re.DOTALL | re.IGNORECASE)


def parse_back(raw_back: str, choices: dict[str, str]) -> dict:
    """
    Parst den Back-Text einer Karte.
    Gibt zurück:
        correct_letter:  "C"
        correct_text:    Antworttext aus choices
        explanation:     Erklärungstext
        hint:            Merkhilfe (optional)
    """
    text = strip_html(raw_back)

    correct_letter = ''
    explanation = ''
    hint = ''

    m = _CORRECT_RE.search(text)
    if m:
        correct_letter = m.group(1).strip()
        rest = m.group(2).strip() if m.group(2) else ''
        # Alles nach dem Pipe bis zur Merkhilfe = Erklärung
        hint_split = _HINT_RE.split(rest, maxsplit=1)
        explanation = hint_split[0].strip()
        if len(hint_split) > 1:
            hint = hint_split[1].strip()
    else:
        # Kein Standard-Format – ganzen Text als Erklärung nehmen
        explanation = text

    # Merkhilfe separat suchen falls nicht inline
    if not hint:
        hm = _HINT_RE.search(text)
        if hm:
            hint = hm.group(1).strip()
            # Merkhilfe aus Erklärung herausschneiden
            explanation = text[:hm.start()].strip()
            explanation = re.sub(r'^.*?CORRECT:[^\|]*\|\s*', '', explanation, flags=re.DOTALL).strip()

    correct_text = choices.get(correct_letter, '')

    return {
        'correct_letter': correct_letter,
        'correct_text': correct_text,
        'explanation': explanation,
        'hint': hint,
    }


# ─── DB-Abfrage ────────────────────────────────────────────────────────────────

def load_cards(db_path: str, deck_filter: str | None, user_id: str | None) -> list[dict]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    sql = """
        SELECT
            c.id,
            c.note_id,
            c.front,
            c.back,
            c.tags_json,
            c.reps,
            c.lapses,
            c.algorithm,
            d.name AS deck_name
        FROM server_cards c
        LEFT JOIN server_decks d ON d.id = c.deck_id AND d.user_id = c.user_id
        WHERE c.is_deleted = 0
    """
    params: list = []

    if user_id:
        sql += " AND c.user_id = ?"
        params.append(user_id)

    if deck_filter:
        sql += " AND d.name LIKE ?"
        params.append(f'%{deck_filter}%')

    sql += " ORDER BY d.name, c.id"

    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ─── Karten aufbereiten ────────────────────────────────────────────────────────

def build_card(row: dict) -> dict:
    front = parse_front(row['front'] or '')
    back = parse_back(row['back'] or '', front['choices'])

    tags: list[str] = []
    if row['tags_json']:
        try:
            tags = json.loads(row['tags_json'])
        except Exception:
            pass

    return {
        'deck_name': row['deck_name'] or '(kein Deck)',
        'card_id': row['id'],
        'note_id': row['note_id'],
        'question': front['question'],
        'choices': front['choices'],
        'has_mc': front['has_mc'],
        'correct_letter': back['correct_letter'],
        'correct_text': back['correct_text'],
        'explanation': back['explanation'],
        'hint': back['hint'],
        'tags': tags,
        'reps': row['reps'],
        'lapses': row['lapses'],
        'algorithm': row['algorithm'],
    }


# ─── Ausgabeformate ────────────────────────────────────────────────────────────

def write_jsonl(cards: list[dict], out_path: str) -> None:
    with open(out_path, 'w', encoding='utf-8') as f:
        for card in cards:
            f.write(json.dumps(card, ensure_ascii=False) + '\n')


def write_txt(cards: list[dict], out_path: str) -> None:
    current_deck = None
    deck_idx = 0
    card_idx_in_deck = 0

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(f"# AI-Review Export  –  {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}\n")
        f.write(f"# {len(cards)} Karten total\n\n")

        for card in cards:
            if card['deck_name'] != current_deck:
                current_deck = card['deck_name']
                deck_idx += 1
                card_idx_in_deck = 0
                f.write(f"\n{'='*70}\n")
                f.write(f"DECK {deck_idx}: {current_deck}\n")
                f.write(f"{'='*70}\n\n")

            card_idx_in_deck += 1

            f.write(f"[{card_idx_in_deck:03d}] {card['question']}\n")

            if card['has_mc']:
                for letter in ['A', 'B', 'C', 'D']:
                    if letter in card['choices']:
                        marker = '→' if letter == card['correct_letter'] else ' '
                        f.write(f"      {marker} {letter}) {card['choices'][letter]}\n")
                f.write(f"      Antwort: {card['correct_letter']}")
                if card['correct_text']:
                    f.write(f" – {card['correct_text']}")
                f.write('\n')
            else:
                if card['correct_letter']:
                    f.write(f"      Antwort: {card['correct_letter']}\n")

            if card['explanation']:
                f.write(f"      Erklärung: {card['explanation']}\n")
            if card['hint']:
                f.write(f"      Merkhilfe: {card['hint']}\n")
            if card['tags']:
                f.write(f"      Tags: {', '.join(card['tags'])}\n")

            f.write('\n')


# ─── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    default_db = os.environ.get('SYNC_DB_PATH', 'sync.db')

    p = argparse.ArgumentParser(description='Export cards from sync.db for AI review')
    p.add_argument('--db', default=default_db, help=f'Pfad zur SQLite-DB (default: {default_db})')
    p.add_argument('--format', choices=['jsonl', 'txt'], default='jsonl',
                   help='Ausgabeformat: jsonl (default) oder txt')
    p.add_argument('--out', default=None, help='Ausgabedatei (default: ai_review.<format>)')
    p.add_argument('--deck', default=None, help='Nur Karten mit Deck-Name enthält <DECK>')
    p.add_argument('--user-id', default=None, dest='user_id', help='Nur Karten dieses Users')
    args = p.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"Fehler: DB nicht gefunden: {db_path}", file=sys.stderr)
        sys.exit(1)

    out_path = args.out or f'ai_review.{args.format}'

    print(f"  DB:     {db_path}")
    print(f"  Filter: deck={args.deck or 'alle'}, user={args.user_id or 'alle'}")

    rows = load_cards(str(db_path), args.deck, args.user_id)
    print(f"  Zeilen: {len(rows)} Karten geladen")

    cards = [build_card(r) for r in rows]

    if args.format == 'jsonl':
        write_jsonl(cards, out_path)
    else:
        write_txt(cards, out_path)

    print(f"  → {out_path}  ({Path(out_path).stat().st_size // 1024} KB)")


if __name__ == '__main__':
    main()
