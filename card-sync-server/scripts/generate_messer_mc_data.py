#!/usr/bin/env python3
"""
Generate mc_data/section*_mc.json for Professor Messer SY0-701 cards.

The generator is deliberately conservative: it converts clear term/definition
cards to MC and marks abbreviations, trivial fills, lists, and ambiguous cards
as needs_review.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = _ROOT / "sync.db"
MC_DIR = _ROOT / "mc_data"

DECK_PREFIX = "Professor Messer CompTIA Security+ SY0-701 v1.1 Free Video Course"

GENERIC_WORDS = {
    "a", "an", "and", "any", "are", "as", "be", "been", "being", "both",
    "by", "can", "commonly", "could", "directly", "do", "does", "each",
    "easily", "every", "few", "first", "for", "from", "generally", "high",
    "how", "in", "indirectly", "is", "it", "its", "less", "low", "many",
    "may", "more", "most", "must", "not", "often", "on", "or", "other",
    "physically", "privately", "publicly", "regularly", "required", "same",
    "second", "should", "sometimes", "still", "strong", "the", "their",
    "them", "these", "they", "this", "those", "to", "true", "typically",
    "usually", "very", "was", "were", "what", "when", "where", "which",
    "who", "why", "will", "with", "without", "would",
}

GENERIC_PHRASES = {
    "changes in the operating environment",
    "data",
    "does not",
    "do not",
    "easier security configuration",
    "everyone in an organization",
    "far less",
    "financial",
    "flexibility",
    "generally good",
    "in the cloud",
    "many",
    "natural",
    "new vulnerabilities",
    "no",
    "occasionally",
    "often",
    "physical",
    "resources and people",
    "software",
    "technical",
    "true",
    "users",
    "yes",
}


@dataclass
class Card:
    id: str
    note_id: str
    front: str
    back: str
    deck_name: str


@dataclass
class Candidate:
    section: int
    card: Card
    duplicates: list[str]
    classification: str
    reason: str


def base_note_id(note_id: str) -> str:
    return re.sub(r"_\d+$", "", note_id or "")


def clean_ws(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").replace("\u2019", "'")).strip()


def objective_code(deck_name: str) -> str:
    match = re.search(r"::([1-5]\.\d{1,2})(?:\.|\s*:)", deck_name)
    return match.group(1) if match else ""


def section_from_deck(deck_name: str) -> int | None:
    match = re.search(r"::Section\s+([1-5])\s*:", deck_name)
    return int(match.group(1)) if match else None


def acronym_like(token: str) -> bool:
    token = token.strip(".,;:()[]{}")
    if not (2 <= len(token) <= 32):
        return False
    upper_or_digit = sum(1 for char in token if char.isupper() or char.isdigit())
    if token.upper() in {"IT", "OS", "IP"}:
        return False
    if any(char.isdigit() for char in token) and upper_or_digit >= 2:
        return True
    return upper_or_digit >= 2 and not token.istitle()


def has_acronym_marker(text: str) -> bool:
    for marker in re.findall(r"\(([A-Za-z0-9.+/-]{2,14})\)", text):
        if acronym_like(marker):
            return True
    for marker in re.findall(r"\bor\s+([A-Za-z0-9.+/-]{2,14})\b", text):
        if acronym_like(marker):
            return True
    return False


def has_acronym_token(text: str) -> bool:
    return any(acronym_like(token) for token in re.findall(r"[A-Za-z0-9.+/-]{2,32}", text))


def is_abbreviation(front: str, back: str) -> bool:
    front = clean_ws(front)
    back = clean_ws(back)
    if re.search(r"\b(?:stands for|abbreviated as|abbreviation)\b", front, re.I):
        return True
    if acronym_like(back):
        return True
    if has_acronym_marker(front) or has_acronym_marker(back):
        return True
    return False


def is_generic_answer(answer: str) -> bool:
    answer = clean_ws(answer)
    lowered = answer.lower()
    if not answer or lowered in GENERIC_PHRASES:
        return True
    words = re.findall(r"[A-Za-z]+", lowered)
    if not words:
        return True
    if len(answer) < 3:
        return True
    if len(words) <= 3 and all(word in GENERIC_WORDS for word in words):
        return True
    return False


def is_term_like(answer: str) -> bool:
    answer = clean_ws(answer)
    if is_generic_answer(answer):
        return False
    if len(answer) > 70:
        return False
    if re.search(r"\b(?:e\.g\.|for example|such as)\b", answer, re.I):
        return False
    if re.match(r"^(?:what|who|when|where|why|how|whether)\b", answer, re.I):
        return False
    if re.fullmatch(r"\d+(?:\.\d+)?", answer):
        return False
    words = re.findall(r"[A-Za-z0-9][A-Za-z0-9.+/-]*", answer)
    if not words:
        return False
    if len(words) > 7:
        return False
    if any(word[:1].isupper() for word in words):
        return True
    term_markers = {
        "attack", "baseline", "broker", "control", "encryption", "filtering",
        "firewall", "gateway", "hardening", "integrity", "management",
        "monitoring", "policy", "process", "protocol", "proxy", "risk",
        "segmentation", "service", "testing", "token", "vulnerability",
    }
    return any(word.lower() in term_markers for word in words)


def clear_definition_pattern(front: str) -> bool:
    front = clean_ws(front)
    if re.match(
        r"^\[\.\.\.\]\s+(?:is|are|refers to|means|describes|provides|identifies|allows|enables|uses|includes|requires)\b",
        front,
        re.I,
    ):
        return True
    if re.match(
        r"^(?:A|An|The)\s+\[\.\.\.\]\s+(?:is|are|refers to|means|provides|allows|enables|uses|includes|requires)\b",
        front,
        re.I,
    ):
        return True
    if re.search(
        r"\b(?:known as|called|called a|called an|referred to as|is known as)\s+(?:an?\s+)?\[\.\.\.\]",
        front,
        re.I,
    ):
        return True
    if re.search(r"\bis (?:an?|the)?\s*\[\.\.\.\]$", front, re.I):
        return True
    return False


def classify(card: Card) -> tuple[str, str]:
    if is_abbreviation(card.front, card.back):
        return "needs_review", "abbreviation"
    if not is_term_like(card.back):
        return "needs_review", "generic_or_nonterm"
    if clear_definition_pattern(card.front):
        return "mc", "definition"
    return "needs_review", "ambiguous"


def load_section_cards(section: int) -> list[Card]:
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        """
        SELECT c.id, c.note_id, c.front, c.back, d.name
        FROM server_cards c
        JOIN server_decks d ON d.id = c.deck_id AND d.user_id = c.user_id
        WHERE c.is_deleted = 0
          AND c.back NOT LIKE '>> CORRECT:%'
          AND d.name LIKE ?
        ORDER BY d.name, c.note_id, c.id
        """,
        (f"{DECK_PREFIX}::Section {section}:%",),
    ).fetchall()
    conn.close()
    return [Card(*(str(value) if value is not None else "" for value in row)) for row in rows]


def choose_winner(group: list[Card]) -> Card:
    ranked: list[tuple[int, int, str, Card]] = []
    for card in group:
        kind, _reason = classify(card)
        rank = 0 if kind == "mc" else 1
        ranked.append((rank, len(clean_ws(card.back)), card.id, card))
    return sorted(ranked, key=lambda item: item[:3])[0][3]


def candidates_for_section(section: int) -> list[Candidate]:
    groups: dict[str, list[Card]] = {}
    for card in load_section_cards(section):
        groups.setdefault(base_note_id(card.note_id), []).append(card)

    candidates: list[Candidate] = []
    for group in groups.values():
        winner = choose_winner(group)
        duplicates = [card.id for card in group if card.id != winner.id]
        classification, reason = classify(winner)
        candidates.append(Candidate(section, winner, duplicates, classification, reason))
    return sorted(candidates, key=lambda c: (c.card.deck_name, c.card.note_id, c.card.id))


def statement_question(front: str, answer: str) -> str:
    front = clean_ws(front)
    answer = clean_ws(answer)
    if re.match(r"^\[\.\.\.\]\s+", front):
        rest = re.sub(r"^\[\.\.\.\]\s+", "", front)
        return f"Which term {rest}?"
    match = re.match(r"^(?:A|An|The)\s+\[\.\.\.\]\s+(.+)$", front, re.I)
    if match:
        rest = match.group(1)
        return f"Which term {rest}?"
    match = re.match(r"^(.+?)\s+have what are called\s+(?:an?\s+)?\[\.\.\.\]\.?$", front, re.I)
    if match:
        statement = re.sub(r"[\s,;:.]+$", "", match.group(1))
        return f"Which term describes this concept: {statement}?"
    match = re.match(r"^(.+?)\s+(?:is\s+)?(?:known as|called|called a|called an|referred to as|is known as)\s+(?:an?\s+)?\[\.\.\.\]\.?$", front, re.I)
    if match:
        statement = re.sub(r"[\s,;:.]+$", "", match.group(1))
        return f"Which term describes this concept: {statement}?"
    match = re.match(r"^(.+?)\s+(?:is|are)\s+(?:an?\s+|the\s+)?\[\.\.\.\]\.?$", front, re.I)
    if match:
        subject = re.sub(r"[\s,;:.]+$", "", match.group(1))
        subject = re.sub(r"^(A|An|The)\s+", lambda m: m.group(1).lower() + " ", subject)
        return f"Which description matches {subject}?"
    filled = front.replace("[...]", answer)
    return f"Which term best matches this Security+ statement: {filled}?"


def normalized_question(candidate: Candidate, number: int) -> str:
    question = statement_question(candidate.card.front, candidate.card.back)
    question = re.sub(r"[\s,;:]+\?", "?", question)
    if not question.endswith("?"):
        question = question.rstrip(".") + "?"
    return f"M{candidate.section}-{number:03d}: {question}"


def option_pool(candidates: list[Candidate]) -> dict[str, list[str]]:
    pools: dict[str, list[str]] = {}
    for candidate in candidates:
        if candidate.classification != "mc":
            continue
        answer = clean_ws(candidate.card.back)
        if not answer:
            continue
        pools.setdefault("all", [])
        if answer not in pools["all"]:
            pools["all"].append(answer)
        sec_key = f"section:{candidate.section}"
        pools.setdefault(sec_key, [])
        if answer not in pools[sec_key]:
            pools[sec_key].append(answer)
        obj_key = f"objective:{objective_code(candidate.card.deck_name)}"
        pools.setdefault(obj_key, [])
        if answer not in pools[obj_key]:
            pools[obj_key].append(answer)
    return pools


def choose_distractors(candidate: Candidate, pools: dict[str, list[str]]) -> list[str]:
    correct = clean_ws(candidate.card.back)
    keys = [
        f"objective:{objective_code(candidate.card.deck_name)}",
        f"section:{candidate.section}",
        "all",
    ]
    selected: list[str] = []
    seen = {correct.lower()}
    seed = hashlib.sha256(candidate.card.id.encode("utf-8")).hexdigest()
    for key in keys:
        pool = sorted(pools.get(key, []), key=lambda value: hashlib.sha256((seed + value).encode("utf-8")).hexdigest())
        for option in pool:
            norm = option.lower()
            if norm in seen:
                continue
            selected.append(option)
            seen.add(norm)
            if len(selected) == 3:
                return selected
    return selected


def answer_letter(card_id: str) -> str:
    return "ABCD"[int(hashlib.sha256(card_id.encode("utf-8")).hexdigest(), 16) % 4]


def explanation(candidate: Candidate) -> str:
    answer = clean_ws(candidate.card.back)
    source = clean_ws(candidate.card.front.replace("[...]", answer))
    return (
        f"{answer} ist der passende Security+-Begriff für diese Beschreibung: {source}. "
        "Die anderen Optionen sind echte verwandte Begriffe, treffen diese Beschreibung aber nicht.\n\n \n\n "
        f"Merkhilfe: {answer} = dieser genaue Prüfbegriff."
    )


def build_entry(candidate: Candidate, number: int, pools: dict[str, list[str]]) -> dict:
    if candidate.classification != "mc":
        entry: dict = {"card_id": candidate.card.id, "needs_review": True}
        if candidate.duplicates:
            entry["delete_duplicates"] = candidate.duplicates
        return entry

    distractors = choose_distractors(candidate, pools)
    if len(distractors) < 3:
        entry = {"card_id": candidate.card.id, "needs_review": True}
        if candidate.duplicates:
            entry["delete_duplicates"] = candidate.duplicates
        return entry

    correct = clean_ws(candidate.card.back)
    letter = answer_letter(candidate.card.id)
    options = dict(zip("ABCD", distractors[:]))
    options[letter] = correct
    remaining = iter(distractors)
    for option_letter in "ABCD":
        if option_letter == letter:
            continue
        options[option_letter] = next(remaining)

    return {
        "card_id": candidate.card.id,
        "question": normalized_question(candidate, number),
        "A": options["A"],
        "B": options["B"],
        "C": options["C"],
        "D": options["D"],
        "correct": letter,
        "explanation_de": explanation(candidate),
        "delete_duplicates": candidate.duplicates,
    }


def generate_section(section: int) -> list[dict]:
    candidates = candidates_for_section(section)
    all_candidates = []
    for sec in (3, 4, 5):
        all_candidates.extend(candidates_for_section(sec))
    pools = option_pool(all_candidates)

    entries: list[dict] = []
    mc_number = 1
    for candidate in candidates:
        entry = build_entry(candidate, mc_number, pools)
        if not entry.get("needs_review"):
            mc_number += 1
        entries.append(entry)
    return entries


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("sections", nargs="*", type=int, default=[3, 4, 5])
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    MC_DIR.mkdir(exist_ok=True)
    for section in args.sections:
        entries = generate_section(section)
        mc = sum(1 for entry in entries if not entry.get("needs_review"))
        review = len(entries) - mc
        dups = sum(len(entry.get("delete_duplicates", [])) for entry in entries)
        out = MC_DIR / f"section{section}_mc.json"
        print(f"section {section}: total={len(entries)} mc={mc} needs_review={review} delete_duplicates={dups}")
        if not args.dry_run:
            out.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
