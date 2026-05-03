#!/usr/bin/env python3
"""
cloze_to_mc.py — Cloze/T-F-Karten via Claude API in MC-Format konvertieren

Strategie
---------
1. Lädt alle Karten mit tag source_messer / source_soc_analyst (außer Abkürzungen)
2. Spiegel-Paare werden dedupliziert:
   - Pro Note-GUID wird die Karte mit dem kürzesten Back behalten (Term-Karte)
   - Das Duplikat wird nach erfolgreicher Konvertierung soft-deleted
3. Konvertierung via Claude API → MC-Format mit A:/B:/C:/D: + >> CORRECT:
4. DB-Update über card.update (LWW-Pfad identisch zu echtem Client)
5. Checkpoint (.cloze_mc_progress.json) für Resume bei Unterbrechung
6. Nach Lauf: validate_all_cards() zeigt verbleibende Probleme

Usage
-----
    python scripts/cloze_to_mc.py --dry-run --limit 5   # Test
    python scripts/cloze_to_mc.py --limit 50            # Kleiner Batch
    python scripts/cloze_to_mc.py                       # Alles
    python scripts/cloze_to_mc.py --resume              # Fortsetzen
    python scripts/cloze_to_mc.py --report-only         # Nur Status
"""

import argparse
import json
import os
import re
import sqlite3
import sys
import time
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from sync_server import apply_operation, open_db, now_ms, get_default_profile_id  # noqa: E402

try:
    import anthropic
except ImportError:
    print("anthropic SDK fehlt: pip install anthropic", file=sys.stderr)
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────
CHECKPOINT   = _ROOT / ".cloze_mc_progress.json"
DEFAULT_MODEL = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")
SOURCE_CLIENT = "cloze_to_mc"

# Karten aus diesen Decks werden NICHT konvertiert (reine Abkürzungen)
SKIP_DECKS = {"decks::! 1 sec+ own"}

# Tags die auf zu konvertierende Karten hinweisen
TARGET_TAGS = {"source_messer", "source_soc_analyst"}

# ── System-Prompt (wird gecacht) ──────────────────────────────────────────────
SYSTEM_PROMPT = """\
You are a CompTIA Security+ SY0-701 certified exam question writer. \
Your task is to convert flashcards into 4-option multiple-choice questions.

STRICT RULES FOR DISTRACTORS:
1. Every answer option (A–D) MUST be a real, documented CompTIA Security+ SY0-701 concept, \
term, protocol, or process — no invented or hallucinated terms.
2. The three wrong options must be PLAUSIBLE in the Security+ domain but definitively \
INCORRECT for this specific question.
3. All options must be of the same category/type (all terms, all protocols, all processes, etc.).
4. The question must be a clear standalone sentence — NOT a fill-in-the-blank pattern.
5. Correct answer placement: randomise across A/B/C/D (do not always put it at A).
6. The German explanation (explanation_de) should be 1–2 sentences: \
why the answer is correct + a mnemonic if helpful.

OUTPUT: Respond with valid JSON only — no markdown, no extra text:
{
  "question": "...",
  "A": "...",
  "B": "...",
  "C": "...",
  "D": "...",
  "correct": "B",
  "explanation_de": "..."
}

If you cannot produce 3 validated, factually correct distractors for a question, respond:
{"error": "insufficient_distractors", "reason": "..."}
"""

# ── DB-Hilfsfunktionen ────────────────────────────────────────────────────────

def load_cards(user_id: str) -> list[dict]:
    """
    Alle zu konvertierenden Karten laden.
    - tag source_messer oder source_soc_analyst
    - Deck nicht in SKIP_DECKS
    - noch nicht als MC markiert (kein '>> CORRECT:' im Back)
    """
    conn = open_db(sqlite3.Row)
    rows = conn.execute(
        """
        SELECT c.id, c.note_id, c.front, c.back, c.tags_json, c.deck_id,
               d.name AS deck_name
        FROM server_cards c
        LEFT JOIN server_decks d ON d.id = c.deck_id AND d.user_id = c.user_id
        WHERE c.is_deleted = 0
          AND c.user_id    = ?
          AND d.name NOT IN ({})
          AND (c.tags_json LIKE '%source_messer%'
               OR c.tags_json LIKE '%source_soc_analyst%')
          AND c.back NOT LIKE '%>> CORRECT:%'
        ORDER BY c.note_id, length(c.back)
        """.format(",".join("?" * len(SKIP_DECKS))),
        (user_id, *SKIP_DECKS),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def deduplicate(cards: list[dict]) -> tuple[list[dict], dict[str, list[str]]]:
    """
    Pro Note-GUID wird die Karte mit dem kürzesten Back behalten (Term-Karte).
    Gibt (keep_list, {card_id: [duplicate_ids]}) zurück.
    """
    def guid(note_id: str) -> str:
        # note_id = "GUID_1" oder "GUID_2" → strip letztes _N
        return re.sub(r'_\d+$', '', note_id)

    groups: dict[str, list[dict]] = {}
    for card in cards:
        g = guid(card["note_id"])
        groups.setdefault(g, []).append(card)

    keep: list[dict] = []
    duplicates: dict[str, list[str]] = {}  # winner_id → [loser_ids]

    for g, group in groups.items():
        # Kürzestes Back = bevorzugte Karte
        group.sort(key=lambda c: len(c["back"]))
        winner   = group[0]
        losers   = [c["id"] for c in group[1:]]
        keep.append(winner)
        if losers:
            duplicates[winner["id"]] = losers

    return keep, duplicates


def soft_delete_cards(ids: list[str], user_id: str, dry_run: bool) -> int:
    if not ids or dry_run:
        return 0
    ts   = now_ms()
    conn = open_db()
    with conn:
        for cid in ids:
            apply_operation(
                conn, "card.update",
                {"cardId": cid, "updates": {"isDeleted": True, "deletedAt": ts}},
                client_timestamp=ts, source_client=SOURCE_CLIENT, user_id=user_id,
            )
    conn.close()
    return len(ids)


def update_card_mc(card_id: str, front_mc: str, back_mc: str,
                   user_id: str, dry_run: bool) -> None:
    if dry_run:
        return
    ts   = now_ms()
    conn = open_db()
    with conn:
        apply_operation(
            conn, "card.update",
            {"cardId": card_id, "updates": {"front": front_mc, "back": back_mc}},
            client_timestamp=ts, source_client=SOURCE_CLIENT, user_id=user_id,
        )
    conn.close()


# ── Checkpoint ────────────────────────────────────────────────────────────────

def load_checkpoint() -> dict:
    if CHECKPOINT.exists():
        return json.loads(CHECKPOINT.read_text(encoding="utf-8"))
    return {"done": [], "failed": [], "deleted_duplicates": []}


def save_checkpoint(cp: dict) -> None:
    CHECKPOINT.write_text(json.dumps(cp, ensure_ascii=False, indent=2), encoding="utf-8")


# ── MC-Formatierung ───────────────────────────────────────────────────────────

def build_mc_front(question: str, options: dict) -> str:
    lines = [question]
    for letter in ("A", "B", "C", "D"):
        lines.append(f"{letter}: {options[letter]}")
    return "\n".join(lines)


def build_mc_back(correct: str, options: dict, explanation_de: str) -> str:
    answer_text = options[correct]
    return f">> CORRECT: {correct} | {answer_text}\n\n{explanation_de}"


# ── Validierung des API-Outputs ───────────────────────────────────────────────

_VALID_LETTERS = {"A", "B", "C", "D"}

def validate_mc(data: dict) -> str | None:
    """Gibt None zurück wenn OK, sonst Fehlermeldung."""
    if "error" in data:
        return f"API-Fehler: {data.get('reason', data['error'])}"
    for key in ("question", "A", "B", "C", "D", "correct", "explanation_de"):
        if not data.get(key, "").strip():
            return f"Feld fehlt oder leer: {key}"
    if data["correct"].upper() not in _VALID_LETTERS:
        return f"Ungültige Antwort: {data['correct']}"
    options = {k: data[k] for k in "ABCD"}
    unique = set(v.strip().lower() for v in options.values())
    if len(unique) < 4:
        return "Doppelte Antwortoptionen"
    return None


# ── Claude API-Aufruf ─────────────────────────────────────────────────────────

def call_claude(client: anthropic.Anthropic, card: dict, model: str) -> dict:
    """
    Konvertiert eine Karte zu MC. Gibt das geparste JSON-Dict zurück.
    Bei Parse-Fehler → {"error": "parse_error", "raw": ...}
    """
    topic = card["deck_name"] or ""
    # Thema aus dem Deck-Namen extrahieren (letztes Segment nach ::)
    if "::" in topic:
        topic = topic.split("::")[-1].strip()

    user_msg = (
        f"Topic: {topic}\n\n"
        f"Cloze front: {card['front']}\n"
        f"Correct answer: {card['back']}"
    )

    resp = client.messages.create(
        model=model,
        max_tokens=512,
        system=[
            {
                "type":       "text",
                "text":       SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_msg}],
    )

    raw = resp.content[0].text.strip()
    # JSON aus möglichen Markdown-Fences befreien
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"error": "parse_error", "raw": raw[:200]}


# ── Report ────────────────────────────────────────────────────────────────────

def print_report(cp: dict, total: int) -> None:
    done    = len(cp["done"])
    failed  = len(cp["failed"])
    deleted = len(cp["deleted_duplicates"])
    pending = total - done - failed
    print(f"\n{'═'*55}")
    print(f"  CLOZE → MC  Status")
    print(f"{'═'*55}")
    print(f"  Gesamt zu konvertieren : {total}")
    print(f"  Konvertiert (MC)       : {done}")
    print(f"  Fehlgeschlagen         : {failed}")
    print(f"  Duplikate gelöscht     : {deleted}")
    print(f"  Noch ausstehend        : {pending}")
    if cp["failed"]:
        print(f"\n  Erste 5 Fehler:")
        for f in cp["failed"][:5]:
            print(f"    [{f['id']}] {f['reason'][:80]}")
            print(f"     Front: {f['front'][:60]}")
    print(f"{'═'*55}\n")


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    p = argparse.ArgumentParser(description="Cloze → MC Konvertierung via Claude API")
    p.add_argument("--dry-run",     action="store_true", help="Keine DB-Schreibvorgänge")
    p.add_argument("--limit",       type=int, default=0, help="Maximale Anzahl Konvertierungen")
    p.add_argument("--resume",      action="store_true", help="Checkpoint weiterlaufen lassen")
    p.add_argument("--report-only", action="store_true", dest="report_only", help="Nur Status anzeigen")
    p.add_argument("--model",       default=DEFAULT_MODEL, help="Claude-Modell")
    p.add_argument("--user-id",     default=None, dest="user_id")
    args = p.parse_args()

    # User-ID ermitteln
    conn = open_db()
    user_id = args.user_id or get_default_profile_id(conn) or ""
    conn.close()
    if user_id:
        print(f"User: {user_id[:8]}…")

    # Alle Kandidaten laden
    print("Lade Karten aus DB…")
    all_cards = load_cards(user_id)
    print(f"  {len(all_cards)} Karten gefunden (vor Dedup)")

    # Deduplizieren
    candidates, dup_map = deduplicate(all_cards)
    total_dups = sum(len(v) for v in dup_map.values())
    print(f"  {len(candidates)} einzigartige Konzepte ({total_dups} Spiegel-Duplikate werden nach Konvertierung gelöscht)")

    cp = load_checkpoint()

    if args.report_only:
        print_report(cp, len(candidates))
        return

    already_done = set(cp["done"])
    already_failed = {f["id"] for f in cp["failed"]}
    skip_ids = already_done | already_failed

    todo = [c for c in candidates if c["id"] not in skip_ids]
    if args.resume:
        print(f"  Resume: {len(skip_ids)} bereits verarbeitet, {len(todo)} verbleibend")
    else:
        todo = candidates  # Alles, inklusive bereits geschaffter (idempotent)
        todo = [c for c in todo if c["id"] not in already_done]  # Bereits fertige überspringen

    if args.limit:
        todo = todo[:args.limit]

    if not todo:
        print("Nichts zu tun – alle Karten bereits verarbeitet.")
        print_report(cp, len(candidates))
        return

    if args.dry_run:
        print(f"\n[DRY-RUN] Würde {len(todo)} Karten konvertieren mit Modell {args.model}\n")
        for card in todo[:3]:
            print(f"  ID: {card['id']}")
            print(f"  Deck: {card['deck_name'].split('::')[-1][:60]}")
            print(f"  Front: {card['front'][:80]}")
            print(f"  Back:  {card['back'][:60]}")
            print()
        return

    # API-Client
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("Fehler: ANTHROPIC_API_KEY nicht gesetzt.", file=sys.stderr)
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    print(f"\nStarte Konvertierung: {len(todo)} Karten mit {args.model}\n")

    converted = 0
    failed    = 0

    for i, card in enumerate(todo, 1):
        prefix = f"[{i:4d}/{len(todo)}]"
        front_preview = card["front"][:55].replace("\n", " ")

        try:
            data = call_claude(client, card, args.model)
        except anthropic.RateLimitError:
            print(f"{prefix} Rate-Limit – 60s warten…")
            time.sleep(60)
            data = call_claude(client, card, args.model)
        except Exception as exc:
            reason = f"API-Ausnahme: {exc}"
            print(f"{prefix} ✗  {reason[:60]}")
            cp["failed"].append({"id": card["id"], "front": card["front"][:80], "reason": reason})
            save_checkpoint(cp)
            failed += 1
            continue

        err = validate_mc(data)
        if err:
            print(f"{prefix} ✗  {err[:60]}  |  {front_preview}")
            cp["failed"].append({"id": card["id"], "front": card["front"][:80], "reason": err})
            save_checkpoint(cp)
            failed += 1
            continue

        # MC-Karte aufbauen
        correct  = data["correct"].upper()
        options  = {k: data[k] for k in "ABCD"}
        front_mc = build_mc_front(data["question"], options)
        back_mc  = build_mc_back(correct, options, data["explanation_de"])

        update_card_mc(card["id"], front_mc, back_mc, user_id, dry_run=False)

        # Duplikate dieser Note soft-deleten
        dup_ids = dup_map.get(card["id"], [])
        deleted_n = soft_delete_cards(dup_ids, user_id, dry_run=False)
        cp["deleted_duplicates"].extend(dup_ids)

        cp["done"].append(card["id"])
        save_checkpoint(cp)

        converted += 1
        dup_info = f"  (+{deleted_n} dup gelöscht)" if deleted_n else ""
        print(f"{prefix} ✓  {front_preview}{dup_info}")

        # Kurze Pause um Rate-Limits zu vermeiden
        time.sleep(0.3)

    print(f"\nFertig: {converted} konvertiert, {failed} Fehler")
    print_report(cp, len(candidates))


if __name__ == "__main__":
    main()
