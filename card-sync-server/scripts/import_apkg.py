#!/usr/bin/env python3
"""
Import one or more APKG files directly into sync.db.

Garantien
---------
- Keine Duplikate (card.id):  apply_operation() LWW – selbe APKG 2× = idempotent.
- Keine Inhaltsduplikate:     normalisierter Fragetext gegen bestehende DB-Karten
                               und zwischen den importierten APKGs gecheckt.
- Schema-Konformität:         apply_operation() aus sync_server – identischer Pfad
                               wie echter Client-Push.
- Validierungsbericht:        nach dem Import werden ALLE DB-Karten geprüft.

Usage
-----
    python scripts/import_apkg.py sample/MyDeck.apkg
    python scripts/import_apkg.py sample/*.apkg --dry-run
    python scripts/import_apkg.py sample/deck.apkg --user-id abc123
    python scripts/import_apkg.py sample/deck.apkg --note-types basic
    python scripts/import_apkg.py sample/deck.apkg --algorithm fsrs
    python scripts/import_apkg.py sample/deck.apkg --skip-validation
"""

import argparse
import json
import os
import re
import sqlite3
import sys
import tempfile
import unicodedata
import zipfile
from pathlib import Path

# ─── Server-Module laden ──────────────────────────────────────────────────────
_SERVER_ROOT = Path(__file__).resolve().parent.parent
if str(_SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(_SERVER_ROOT))

from sync_server import apply_operation, open_db, now_ms, get_default_profile_id  # noqa: E402

# ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

_HTML_TAG_RE   = re.compile(r'<[^>]+>')
_HTML_ENTITY_RE = re.compile(r'&([a-zA-Z]+|#\d+);')
_HTML_ENTITIES = {'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"',
                  'nbsp': ' ', 'apos': "'"}
_LEADING_NUM_RE = re.compile(r'^\s*\d+[\.:]\s*')
_CHOICE_RE      = re.compile(r'^\s*[A-D][:\.\)]\s*', re.MULTILINE)
_CLOZE_RE       = re.compile(r'\{\{c(\d+)::([^:}]+)(?:::([^}]*))?\}\}')


def strip_html(text: str) -> str:
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = _HTML_TAG_RE.sub('', text)

    def _ent(m):
        n = m.group(1)
        return chr(int(n[1:])) if n.startswith('#') else _HTML_ENTITIES.get(n.lower(), m.group(0))

    return _HTML_ENTITY_RE.sub(_ent, text).strip()


def normalize_front(text: str) -> str:
    """Vergleichskey: lowercase, kein HTML, kein Nummernpräfix, keine Leerzeichen."""
    t = strip_html(text)
    t = _LEADING_NUM_RE.sub('', t)   # "97: What is..." → "What is..."
    t = _CHOICE_RE.sub('', t)        # Antwortoptionen entfernen
    t = unicodedata.normalize('NFKC', t)
    return re.sub(r'\s+', ' ', t).strip().lower()


# ─── Cloze-Parsing ───────────────────────────────────────────────────────────

def cloze_to_front_back(raw_text: str, ord_1indexed: int) -> tuple[str, str]:
    """
    Wandelt Cloze-Text + Ordinal in (front, back) um.
    Front: gesuchte Lücke → '[...]' / '[Hint]', übrige Lücken → sichtbarer Text.
    Back:  der Text der gesuchten Lücke.
    """
    answer = ''
    parts: list[str] = []
    last = 0

    for m in _CLOZE_RE.finditer(raw_text):
        num  = int(m.group(1))
        text = m.group(2)
        hint = m.group(3)
        parts.append(raw_text[last:m.start()])
        if num == ord_1indexed:
            answer = text
            parts.append(f'[{hint}]' if hint else '[...]')
        else:
            parts.append(text)
        last = m.end()

    parts.append(raw_text[last:])
    front = strip_html(''.join(parts)).strip()
    back  = strip_html(answer).strip()
    return front, back


# ─── APKG-Leser ──────────────────────────────────────────────────────────────

_EXCLUDED_DECKS = {'Default', 'Standard', 'Standardmäßig'}


def read_apkg(apkg_path: str) -> tuple[list[dict], list[dict]]:
    """
    Öffnet APKG, gibt (decks, cards) zurück.

    deck-dict:  { id, name }
    card-dict:  { id, note_id, deck_id, front, back, tags, note_type,
                  type, queue, due, interval, factor, reps, lapses }
    """
    with zipfile.ZipFile(apkg_path) as zf:
        db_name = next(
            (n for n in ('collection.anki21b', 'collection.anki21', 'collection.anki2')
             if n in zf.namelist()),
            None,
        )
        if not db_name:
            raise ValueError(f'Kein Anki-DB-Eintrag in {apkg_path}')

        with tempfile.TemporaryDirectory() as tmp:
            zf.extract(db_name, tmp)
            db_path = os.path.join(tmp, db_name)

            if db_name.endswith('.anki21b'):
                raw = Path(db_path).read_bytes()
                if raw[:4] == b'\x28\xb5\x2f\xfd':
                    try:
                        import zstandard as zstd
                        raw = zstd.ZstdDecompressor().decompress(raw)
                    except ImportError:
                        raise RuntimeError('pip install zstandard  (für .anki21b benötigt)')
                    db_path = db_path.replace('.anki21b', '.anki21')
                    Path(db_path).write_bytes(raw)

            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            return _parse_db(conn)


def _parse_db(conn: sqlite3.Connection) -> tuple[list[dict], list[dict]]:
    has_new = conn.execute(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='notetypes'"
    ).fetchone()[0] > 0

    # ── Decks ──────────────────────────────────────────────────────────────
    deck_map: dict[str, str] = {}
    if has_new:
        for row in conn.execute('SELECT id, name FROM decks'):
            if row['name'] not in _EXCLUDED_DECKS:
                deck_map[str(row['id'])] = row['name']
    else:
        col = conn.execute('SELECT decks FROM col LIMIT 1').fetchone()
        for d in json.loads(col['decks']).values():
            if d.get('name') not in _EXCLUDED_DECKS:
                deck_map[str(d['id'])] = d['name']

    # ── Models ─────────────────────────────────────────────────────────────
    model_map: dict[str, dict] = {}   # mid → {type, fields}
    if has_new:
        for row in conn.execute('SELECT id, config FROM notetypes'):
            cfg = json.loads(row['config']) if row['config'] else {}
            model_map[str(row['id'])] = {'type': cfg.get('kind', 0), 'fields': []}
        for row in conn.execute('SELECT ntid, ord, name FROM fields ORDER BY ntid, ord'):
            key = str(row['ntid'])
            if key in model_map:
                model_map[key]['fields'].append(row['name'])
    else:
        col2 = conn.execute('SELECT models FROM col LIMIT 1').fetchone()
        for mid, m in json.loads(col2['models']).items():
            flds = sorted(m.get('flds', []), key=lambda f: f['ord'])
            model_map[str(mid)] = {'type': m.get('type', 0), 'fields': [f['name'] for f in flds]}

    # ── Notes ──────────────────────────────────────────────────────────────
    note_map: dict[int, dict] = {}
    for row in conn.execute('SELECT id, guid, mid, flds, tags FROM notes'):
        note_map[row['id']] = {
            'guid': row['guid'],
            'mid':  str(row['mid']),
            'flds': row['flds'],
            'tags': (row['tags'] or '').strip().split(),
        }

    # ── Cards ──────────────────────────────────────────────────────────────
    cards_out: list[dict] = []
    for row in conn.execute(
        'SELECT id, nid, did, ord, type, queue, due, ivl, factor, reps, lapses FROM cards'
    ):
        deck_id = str(row['did'])
        if deck_id not in deck_map:
            continue

        note = note_map.get(row['nid'])
        if not note:
            continue

        model = model_map.get(note['mid'])
        if not model:
            continue

        flds       = note['flds'].split('\x1f')
        field_names = model['fields']
        fmap       = {field_names[i]: flds[i] for i in range(min(len(field_names), len(flds)))}
        note_type  = model['type']   # 0=Basic, 1=Cloze

        if note_type == 0:
            front_raw = (fmap.get('Front') or fmap.get('Vorderseite') or
                         fmap.get('Question') or flds[0] if flds else '')
            back_raw  = (fmap.get('Back') or fmap.get('Rückseite') or
                         fmap.get('Answer') or fmap.get('Back Extra') or
                         (flds[1] if len(flds) > 1 else ''))
            front   = strip_html(front_raw)
            back    = strip_html(back_raw)
            note_id = note['guid']
        else:
            text_raw   = fmap.get('Text') or fmap.get('Front') or (flds[0] if flds else '')
            back_extra = strip_html(fmap.get('Back Extra') or fmap.get('Extra') or '')
            ord_1      = row['ord'] + 1
            front, answer = cloze_to_front_back(text_raw, ord_1)
            back    = f'{answer}\n\n{back_extra}'.strip() if back_extra else answer
            note_id = f'{note["guid"]}_{ord_1}'

        if not front.strip():
            continue

        cards_out.append({
            'id':        str(row['id']),
            'note_id':   note_id,
            'deck_id':   deck_id,
            'front':     front,
            'back':      back,
            'tags':      note['tags'],
            'note_type': 'cloze' if note_type == 1 else 'basic',
            'type':      row['type'],
            'queue':     row['queue'],
            'due':       row['due'],
            'interval':  row['ivl'],
            'factor':    row['factor'] if row['factor'] > 0 else 2500,
            'reps':      row['reps'],
            'lapses':    row['lapses'],
        })

    conn.close()
    return [{'id': did, 'name': name} for did, name in deck_map.items()], cards_out


# ─── Deduplizierung ───────────────────────────────────────────────────────────

def load_existing_fronts(user_id: str | None) -> set[str]:
    """Normalisierte Fronttexte aller bestehenden DB-Karten."""
    uid = user_id or ''
    conn = open_db()
    rows = conn.execute(
        'SELECT front FROM server_cards WHERE is_deleted=0 AND user_id=?', (uid,)
    ).fetchall()
    conn.close()
    return {normalize_front(r[0]) for r in rows if r[0]}


def dedup_cards(
    cards: list[dict],
    existing_keys: set[str],
    batch_keys: set[str],
) -> tuple[list[dict], list[dict]]:
    """
    Gibt (keep, skipped) zurück.
    - keep:    keine Überschneidung mit existing_keys oder batch_keys
    - skipped: Duplikat (normalisierter Fragetext bereits gesehen)
    Aktualisiert batch_keys in-place.
    """
    keep, skipped = [], []
    for card in cards:
        key = normalize_front(card['front'])
        if key in existing_keys or key in batch_keys:
            skipped.append(card)
        else:
            batch_keys.add(key)
            keep.append(card)
    return keep, skipped


# ─── Import ───────────────────────────────────────────────────────────────────

def import_into_db(
    decks: list[dict],
    cards: list[dict],
    user_id: str | None,
    algorithm: str,
    dry_run: bool,
    source_label: str,
) -> dict:
    now     = now_ms()
    day_ms  = 86_400_000

    def make_payload(card: dict) -> dict:
        factor          = card['factor']
        ivl             = max(1, card['interval'])
        fsrs_difficulty = max(1.0, min(10.0, factor / 500))
        fsrs_stability  = float(ivl)
        due_at          = max(0, card['due']) * day_ms if card['due'] >= 0 else now

        return {
            'id':         card['id'],
            'noteId':     card['note_id'],
            'deckId':     card['deck_id'],
            'front':      card['front'],
            'back':       card['back'],
            'tags':       card['tags'],
            'extra':      {'acronym': '', 'examples': '', 'port': '', 'protocol': ''},
            'type':       card['type'],
            'queue':      card['queue'],
            'due':        max(0, card['due']),
            'dueAt':      due_at,
            'interval':   ivl,
            'factor':     round(fsrs_difficulty * 500) if algorithm == 'fsrs' else factor,
            'stability':  fsrs_stability if algorithm == 'fsrs' else None,
            'difficulty': fsrs_difficulty if algorithm == 'fsrs' else None,
            'reps':       card['reps'],
            'lapses':     card['lapses'],
            'algorithm':  algorithm,
            'createdAt':  now,
            'updatedAt':  now,
            'source':     'anki-import',
        }

    stats = {'decks_inserted': 0, 'cards_inserted': 0, 'cards_updated': 0}

    if dry_run:
        stats['decks_inserted'] = len(decks)
        stats['cards_inserted'] = len(cards)
        return stats

    conn = open_db()
    try:
        with conn:
            for deck in decks:
                apply_operation(
                    conn, 'deck.create',
                    {'id': deck['id'], 'name': deck['name'],
                     'createdAt': now, 'updatedAt': now, 'source': 'anki-import'},
                    client_timestamp=now, source_client=source_label, user_id=user_id,
                )
                stats['decks_inserted'] += 1

        chunk = 500
        for i in range(0, len(cards), chunk):
            with conn:
                for card in cards[i:i + chunk]:
                    exists = conn.execute(
                        'SELECT 1 FROM server_cards WHERE id=? AND user_id=?',
                        (card['id'], user_id or ''),
                    ).fetchone()
                    apply_operation(
                        conn, 'card.create', make_payload(card),
                        client_timestamp=now, source_client=source_label, user_id=user_id,
                    )
                    if exists:
                        stats['cards_updated'] += 1
                    else:
                        stats['cards_inserted'] += 1

            print(f'  … {min(i + chunk, len(cards))}/{len(cards)} Karten', end='\r', flush=True)

        print()
    finally:
        conn.close()

    return stats


# ─── Validierung ─────────────────────────────────────────────────────────────

_CORRECT_RE  = re.compile(r'>>\s*CORRECT:\s*([A-D])', re.IGNORECASE)
_MC_FRONT_RE = re.compile(r'[A-D][:\.\)]\s*.+', re.MULTILINE)


def _mc_choices_in_front(front: str) -> set[str]:
    return {m.group(0)[0] for m in _MC_FRONT_RE.finditer(front)}


def validate_all_cards(user_id: str | None) -> dict:
    """
    Prüft ALLE nicht-gelöschten Karten in der DB.

    MC-Karten (bestehen aus A:/B:/C:/D: im Front):
      - Mindestens 2 Antwortoptionen
      - Back enthält '>> CORRECT: X'
      - X ist eine der vorhandenen Optionen

    Basic-Karten (kein MC-Format):
      - Front nicht leer
      - Back nicht leer

    Cloze-Karten (Front enthält '[...]'):
      - Front enthält '[...]'
      - Back nicht leer

    Gibt zurück:
      { total, mc, basic, cloze,
        errors: [ {card_id, deck_name, front_preview, issue} ] }
    """
    uid  = user_id or ''
    conn = open_db(sqlite3.Row)
    rows = conn.execute(
        """SELECT c.id, c.front, c.back, c.tags_json, d.name AS deck_name
           FROM server_cards c
           LEFT JOIN server_decks d ON d.id = c.deck_id AND d.user_id = c.user_id
           WHERE c.is_deleted = 0 AND c.user_id = ?
           ORDER BY d.name, c.id""",
        (uid,),
    ).fetchall()
    conn.close()

    result = {'total': len(rows), 'mc': 0, 'basic': 0, 'cloze': 0, 'errors': []}

    def err(card_id, deck_name, front, issue):
        result['errors'].append({
            'card_id':      card_id,
            'deck_name':    deck_name or '?',
            'front_preview': front[:80].replace('\n', ' '),
            'issue':        issue,
        })

    for row in rows:
        cid   = row['id']
        front = row['front'] or ''
        back  = row['back']  or ''
        deck  = row['deck_name'] or '?'

        choices = _mc_choices_in_front(front)
        is_mc   = len(choices) >= 2
        is_cloze = '[...]' in front or re.search(r'\[.+?\]', front) is not None and '?' not in front

        if is_mc:
            result['mc'] += 1
            m = _CORRECT_RE.search(back)
            if not m:
                err(cid, deck, front, 'MC: Kein ">> CORRECT: X" im Back')
            else:
                letter = m.group(1).upper()
                if letter not in choices:
                    err(cid, deck, front, f'MC: Antwort "{letter}" ist keine gültige Option {choices}')
        elif is_cloze:
            result['cloze'] += 1
            if not back.strip():
                err(cid, deck, front, 'Cloze: Back leer')
        else:
            result['basic'] += 1
            if not front.strip():
                err(cid, deck, front, 'Basic: Front leer')
            if not back.strip():
                err(cid, deck, front, 'Basic: Back leer')

    return result


def print_validation(v: dict) -> None:
    print(f'\n{"═"*60}')
    print(f'  VALIDIERUNGSBERICHT  –  {v["total"]} Karten total')
    print(f'  MC: {v["mc"]}  |  Basic: {v["basic"]}  |  Cloze: {v["cloze"]}')
    print(f'  Fehler: {len(v["errors"])}')
    print(f'{"═"*60}')

    if not v['errors']:
        print('  Alle Karten valide.')
        return

    # Fehler nach Deck gruppieren
    by_deck: dict[str, list[dict]] = {}
    for e in v['errors']:
        by_deck.setdefault(e['deck_name'], []).append(e)

    for deck_name, errs in sorted(by_deck.items()):
        print(f'\n  ▸ {deck_name}  ({len(errs)} Fehler)')
        for e in errs:
            print(f'    [{e["card_id"]}]  {e["issue"]}')
            print(f'     Front: {e["front_preview"]}')

    print(f'\n  → {len(v["errors"])} Probleme gefunden.')


# ─── CLI ─────────────────────────────────────────────────────────────────────

def main() -> None:
    p = argparse.ArgumentParser(description='APKG in sync.db importieren + Validierung')
    p.add_argument('files', nargs='*', metavar='FILE.apkg',
                   help='APKG-Datei(en) – kann leer sein (nur Validierung)')
    p.add_argument('--db',        default=None,
                   help='DB-Pfad (default: SYNC_DB_PATH env oder sync.db)')
    p.add_argument('--user-id',   default=None, dest='user_id',
                   help='User-ID (default: legacy single-user "")')
    p.add_argument('--algorithm', choices=['sm2', 'fsrs'], default='fsrs')
    p.add_argument('--note-types', choices=['all', 'basic', 'cloze'], default='all',
                   dest='note_types')
    p.add_argument('--dry-run',   action='store_true',
                   help='Analysieren ohne zu schreiben')
    p.add_argument('--skip-validation', action='store_true', dest='skip_validation',
                   help='Validierungsbericht überspringen')
    args = p.parse_args()

    if args.db:
        os.environ['SYNC_DB_PATH'] = args.db

    if args.user_id is None:
        conn = open_db()
        args.user_id = get_default_profile_id(conn)
        conn.close()
        if args.user_id:
            print(f'Default-Profil: {args.user_id[:8]}...')
        else:
            print('Kein Default-Profil gefunden – Legacy-Modus (user_id="").')

    if args.files:
        # ── Bestehende Fronttexte laden ──────────────────────────────────
        existing_keys: set[str] = load_existing_fronts(args.user_id)
        print(f'DB: {len(existing_keys)} bestehende Karten als Deduplizierungsbasis geladen.')

        # Batch-Keys: verhindert Duplikate zwischen den APKGs untereinander
        batch_keys: set[str] = set()

        total_inserted = total_updated = total_skipped = 0

        for apkg_path in args.files:
            apkg_path = str(Path(apkg_path).resolve())
            if not Path(apkg_path).exists():
                print(f'[FEHLER] Datei nicht gefunden: {apkg_path}', file=sys.stderr)
                continue

            print(f'\n▶ {Path(apkg_path).name}')
            try:
                decks, cards = read_apkg(apkg_path)
            except Exception as exc:
                print(f'  [FEHLER] {exc}', file=sys.stderr)
                continue

            # Typenfilter
            if args.note_types == 'basic':
                cards = [c for c in cards if c['note_type'] == 'basic']
            elif args.note_types == 'cloze':
                cards = [c for c in cards if c['note_type'] == 'cloze']

            basic_n = sum(1 for c in cards if c['note_type'] == 'basic')
            cloze_n = sum(1 for c in cards if c['note_type'] == 'cloze')
            print(f'  Gelesen:  {len(decks)} Decks, {len(cards)} Karten '
                  f'(Basic {basic_n}, Cloze {cloze_n})')

            # Deduplizierung
            keep, skipped = dedup_cards(cards, existing_keys, batch_keys)
            print(f'  Behalten: {len(keep)}  |  Duplikate übersprungen: {len(skipped)}')
            if skipped and len(skipped) <= 10:
                for s in skipped:
                    print(f'    skip: {s["front"][:70]}')
            elif skipped:
                print(f'    (erste 10 von {len(skipped)}):')
                for s in skipped[:10]:
                    print(f'    skip: {s["front"][:70]}')

            # Decks auf tatsächlich verwendete reduzieren
            used_deck_ids = {c['deck_id'] for c in keep}
            used_decks    = [d for d in decks if d['id'] in used_deck_ids]

            source_label = f'import:{Path(apkg_path).stem}'[:64]
            stats = import_into_db(
                used_decks, keep,
                user_id=args.user_id,
                algorithm=args.algorithm,
                dry_run=args.dry_run,
                source_label=source_label,
            )

            print(f'  Decks → neu: {stats["decks_inserted"]}')
            print(f'  Karten → neu: {stats["cards_inserted"]}  '
                  f'aktualisiert: {stats["cards_updated"]}')

            total_inserted += stats['cards_inserted']
            total_updated  += stats['cards_updated']
            total_skipped  += len(skipped)

        if len(args.files) > 1:
            print(f'\n{"─"*50}')
            print(f'GESAMT  neu: {total_inserted}  '
                  f'aktualisiert: {total_updated}  '
                  f'duplikate: {total_skipped}')

        if args.dry_run:
            print('\n[dry-run] Keine Änderungen gespeichert.')

    # ── Validierung ──────────────────────────────────────────────────────────
    if not args.skip_validation:
        print('\nValidiere alle Karten in der DB …')
        v = validate_all_cards(args.user_id)
        print_validation(v)

        # Bericht als Datei speichern wenn Fehler vorhanden
        if v['errors']:
            report_path = 'validation_errors.json'
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(v['errors'], f, ensure_ascii=False, indent=2)
            print(f'\n  Fehlerbericht gespeichert: {report_path}')


if __name__ == '__main__':
    main()
