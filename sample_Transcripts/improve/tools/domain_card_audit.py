#!/usr/bin/env python3
"""Reproducible inventory and review aids for the 751 SY0-701 domain cards.

This tool deliberately separates machine-generated candidates from human/LLM
review decisions.  Candidate scores never become final requirement mappings.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import shutil
import sqlite3
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "card-sync-server" / "sync.db"
IMPROVE_DIR = ROOT / "sample_Transcripts" / "improve"
SNAPSHOT_DIR = IMPROVE_DIR / "snapshots"
WORK_DIR = IMPROVE_DIR / "work"
REQUIREMENTS_PATH = (
    ROOT / "card_pwa" / "content" / "sy0-701" / "generated" / "sy0-701-requirements.json"
)
LEAF_MAPPING_PATH = (
    ROOT / "card_pwa" / "content" / "sy0-701" / "source" / "leaf-mapping.json"
)
DISTILLED_PATHS = [
    ROOT
    / "sample_Transcripts"
    / "Mapping_Knowledge"
    / f"domain-{domain}-requirement-mapping.json"
    for domain in range(1, 6)
]

DOMAIN_ROOT_NAMES = {
    1: "01_General_Security_Concepts",
    2: "02_Threats_Vulnerabilities_Mitigations",
    3: "03_Security_Architecture",
    4: "04_Security_Operations",
    5: "05_Security_Program_Management_Oversight",
}

CONTENT_FIELDS = (
    "note_id",
    "deck_id",
    "front",
    "back",
    "tags_json",
    "extra_json",
)
SCHEDULING_FIELDS = (
    "type",
    "queue",
    "due",
    "due_at",
    "interval",
    "factor",
    "stability",
    "difficulty",
    "retrievability",
    "reps",
    "lapses",
    "algorithm",
    "learning_step",
    "last_reviewed_at",
)

STOP_WORDS = {
    "a",
    "about",
    "after",
    "all",
    "also",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "best",
    "by",
    "can",
    "does",
    "during",
    "each",
    "for",
    "from",
    "has",
    "have",
    "how",
    "in",
    "into",
    "is",
    "it",
    "most",
    "not",
    "of",
    "on",
    "or",
    "should",
    "that",
    "the",
    "their",
    "these",
    "this",
    "to",
    "used",
    "uses",
    "what",
    "when",
    "which",
    "with",
    "would",
}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def json_dump(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def connect_readonly(path: Path = DB_PATH) -> sqlite3.Connection:
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    return con


def descendants(decks: dict[str, dict[str, Any]], root_id: str) -> list[str]:
    children: dict[str | None, list[str]] = defaultdict(list)
    for deck in decks.values():
        children[deck.get("parent_deck_id")].append(deck["id"])
    result: list[str] = []
    stack = [root_id]
    while stack:
        deck_id = stack.pop()
        result.append(deck_id)
        stack.extend(children.get(deck_id, []))
    return result


def card_kind(front: str, back: str) -> str:
    if front.startswith("MATCHING:\n"):
        return "matching"
    if front.startswith("ORDERING:\n"):
        return "ordering"
    if re.search(r"(?m)^A:\s+", front) and re.match(r"^>> CORRECT: [A-D] \|", back):
        return "mc"
    return "other"


def source_identifiers(front: str) -> list[str]:
    first_line = front.splitlines()[0] if front else ""
    match = re.match(r"^((?:M\d|T\d{3})-\d{2,3}):\s+", first_line)
    return [match.group(1)] if match else []


def parse_mc(front: str, back: str) -> dict[str, Any] | None:
    if card_kind(front, back) != "mc":
        return None
    lines = front.splitlines()
    option_positions = [i for i, line in enumerate(lines) if re.match(r"^[A-D]:\s+", line)]
    if len(option_positions) != 4:
        return None
    question = "\n".join(lines[: option_positions[0]]).strip()
    options: dict[str, str] = {}
    for index, position in enumerate(option_positions):
        end = option_positions[index + 1] if index + 1 < len(option_positions) else len(lines)
        label = lines[position][0]
        value = [lines[position][3:]] + lines[position + 1 : end]
        options[label] = "\n".join(value).strip()
    correct_match = re.match(r"^>> CORRECT: ([A-D]) \|", back)
    if not correct_match:
        return None
    correct_label = correct_match.group(1)
    return {
        "question": question,
        "options": options,
        "correctLabel": correct_label,
        "correctAnswer": options[correct_label],
    }


def content_hash(card: dict[str, Any]) -> str:
    payload = {field: card.get(field) for field in CONTENT_FIELDS}
    return sha256_bytes(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8"))


def normalized_json(value: str | None) -> Any:
    if value is None:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


def build_inventory(con: sqlite3.Connection) -> dict[str, Any]:
    profiles = [dict(row) for row in con.execute(
        "SELECT user_id, profile_name FROM users ORDER BY user_id"
    )]
    if len(profiles) != 2:
        raise RuntimeError(f"Expected exactly two profiles, found {len(profiles)}")

    profile_decks: dict[str, dict[str, dict[str, Any]]] = {}
    domain_deck_ids: dict[str, dict[int, list[str]]] = {}
    profile_cards: dict[str, dict[str, dict[str, Any]]] = {}

    for profile in profiles:
        user_id = profile["user_id"]
        decks = {
            row["id"]: dict(row)
            for row in con.execute(
                "SELECT * FROM server_decks WHERE user_id=? AND deleted_at IS NULL",
                (user_id,),
            )
        }
        profile_decks[user_id] = decks
        domain_deck_ids[user_id] = {}
        for domain, root_name in DOMAIN_ROOT_NAMES.items():
            roots = [deck["id"] for deck in decks.values() if deck.get("name") == root_name]
            if len(roots) != 1:
                raise RuntimeError(f"Profile {user_id}: expected one root named {root_name}, got {roots}")
            domain_deck_ids[user_id][domain] = descendants(decks, roots[0])
        profile_cards[user_id] = {
            row["id"]: dict(row)
            for row in con.execute(
                "SELECT * FROM server_cards WHERE user_id=? AND is_deleted=0",
                (user_id,),
            )
        }

    canonical_user = profiles[0]["user_id"]
    comparison_user = profiles[1]["user_id"]
    canonical = profile_cards[canonical_user]
    comparison = profile_cards[comparison_user]
    if set(canonical) != set(comparison):
        raise RuntimeError("Active card ID sets differ between profiles")

    content_diffs: list[dict[str, Any]] = []
    for card_id in sorted(canonical):
        fields = [
            field for field in CONTENT_FIELDS if canonical[card_id].get(field) != comparison[card_id].get(field)
        ]
        if fields:
            content_diffs.append({"cardId": card_id, "fields": fields})
    if content_diffs:
        raise RuntimeError(f"Profile content differs for {len(content_diffs)} cards")

    deck_ids_to_domain: dict[str, int] = {}
    for domain, deck_ids in domain_deck_ids[canonical_user].items():
        for deck_id in deck_ids:
            if deck_id in deck_ids_to_domain:
                raise RuntimeError(f"Deck {deck_id} belongs to multiple domain trees")
            deck_ids_to_domain[deck_id] = domain

    domain_cards: list[dict[str, Any]] = []
    excluded_cards: list[dict[str, Any]] = []
    counts = Counter()
    for card_id in sorted(canonical, key=int):
        raw = canonical[card_id]
        domain = deck_ids_to_domain.get(raw["deck_id"])
        deck = profile_decks[canonical_user][raw["deck_id"]]
        if domain is None:
            excluded_cards.append(
                {
                    "cardId": card_id,
                    "deckId": raw["deck_id"],
                    "deck": deck.get("name"),
                    "contentHash": content_hash(raw),
                }
            )
            continue
        counts[domain] += 1
        objective_match = re.match(r"^(\d\.\d)\s", deck.get("name") or "")
        parsed = parse_mc(raw.get("front") or "", raw.get("back") or "")
        domain_cards.append(
            {
                "cardId": card_id,
                "noteId": raw.get("note_id"),
                "domain": domain,
                "deckId": raw["deck_id"],
                "deck": deck.get("name"),
                "objectiveDeck": objective_match.group(1) if objective_match else None,
                "cardType": card_kind(raw.get("front") or "", raw.get("back") or ""),
                "sourceIdentifiers": source_identifiers(raw.get("front") or ""),
                "contentHash": content_hash(raw),
                "currentContent": {
                    "front": raw.get("front"),
                    "back": raw.get("back"),
                    "tags": normalized_json(raw.get("tags_json")),
                    "extraJson": normalized_json(raw.get("extra_json")),
                },
                "parsedMc": parsed,
                "schedulingByProfile": {
                    profile["profile_name"]: {
                        field: profile_cards[profile["user_id"]][card_id].get(field)
                        for field in SCHEDULING_FIELDS
                    }
                    for profile in profiles
                },
            }
        )

    expected_counts = {1: 160, 2: 171, 3: 153, 4: 161, 5: 106}
    if dict(counts) != expected_counts:
        raise RuntimeError(f"Unexpected domain counts: {dict(counts)}")
    if len(domain_cards) != 751:
        raise RuntimeError(f"Expected 751 domain cards, found {len(domain_cards)}")
    excluded_by_deck = Counter(card["deck"] for card in excluded_cards)
    if excluded_by_deck != Counter({"Acronym-Bonus (ABCD + PBQ)": 43, "Interaktive Übungen": 9}):
        raise RuntimeError(f"Unexpected excluded-card inventory: {dict(excluded_by_deck)}")

    requirements = json.loads(REQUIREMENTS_PATH.read_text(encoding="utf-8"))["requirements"]
    if len(requirements) != 655:
        raise RuntimeError(f"Expected 655 requirements, found {len(requirements)}")

    return {
        "schemaVersion": "sy0701-domain-card-baseline-1",
        "sourceDb": str(DB_PATH.relative_to(ROOT)),
        "canonicalProfile": canonical_user,
        "profiles": profiles,
        "counts": {
            "domainCards": len(domain_cards),
            "requirements": len(requirements),
            "byDomain": {str(domain): counts[domain] for domain in range(1, 6)},
            "excludedCards": len(excluded_cards),
            "excludedByDeck": dict(sorted(excluded_by_deck.items())),
        },
        "profileContentDifferences": content_diffs,
        "cards": domain_cards,
        "excludedCards": excluded_cards,
    }


def command_baseline(_: argparse.Namespace) -> None:
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    with connect_readonly() as con:
        inventory = build_inventory(con)

    backup_path = SNAPSHOT_DIR / "sync-before-domain-card-audit.db"
    if backup_path.exists():
        raise RuntimeError(f"Refusing to overwrite existing backup: {backup_path}")
    source = sqlite3.connect(DB_PATH)
    destination = sqlite3.connect(backup_path)
    try:
        source.backup(destination)
    finally:
        destination.close()
        source.close()

    baseline_path = SNAPSHOT_DIR / "domain-cards-baseline.json"
    json_dump(baseline_path, inventory)
    distilled_hashes = {
        str(path.relative_to(ROOT)): sha256_file(path) for path in DISTILLED_PATHS
    }
    distilled_field_payload: list[dict[str, Any]] = []
    for path in DISTILLED_PATHS:
        data = json.loads(path.read_text(encoding="utf-8"))
        distilled_field_payload.extend(
            {"requirementId": entry["requirementId"], "distilledContent": entry["distilledContent"]}
            for entry in data["entries"]
        )
    manifest = {
        "schemaVersion": "sy0701-domain-card-snapshot-manifest-1",
        "database": {
            "source": str(DB_PATH.relative_to(ROOT)),
            "sourceSha256": sha256_file(DB_PATH),
            "backup": str(backup_path.relative_to(ROOT)),
            "backupSha256": sha256_file(backup_path),
        },
        "baseline": {
            "path": str(baseline_path.relative_to(ROOT)),
            "sha256": sha256_file(baseline_path),
        },
        "requirements": {
            "path": str(REQUIREMENTS_PATH.relative_to(ROOT)),
            "sha256": sha256_file(REQUIREMENTS_PATH),
            "count": 655,
        },
        "distilledSources": distilled_hashes,
        "distilledContentAggregateSha256": sha256_bytes(
            json.dumps(distilled_field_payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        ),
        "excludedSource": "The independent quality report is intentionally not read or hashed.",
    }
    manifest_path = SNAPSHOT_DIR / "manifest.json"
    json_dump(manifest_path, manifest)
    print(json.dumps({"baseline": str(baseline_path), "manifest": str(manifest_path), "counts": inventory["counts"]}, indent=2))


def stem(token: str) -> str:
    token = token.lower()
    replacements = {
        "authentication": "authenticate",
        "authorization": "authorize",
        "availability": "available",
        "confidentiality": "confidential",
        "encryption": "encrypt",
        "identification": "identify",
        "management": "manage",
        "monitoring": "monitor",
        "protection": "protect",
        "recovery": "recover",
        "remediation": "remediate",
        "vulnerabilities": "vulnerability",
    }
    if token in replacements:
        return replacements[token]
    for suffix in ("ization", "ations", "ation", "ments", "ment", "ingly", "ing", "ies", "ed", "s"):
        if token.endswith(suffix) and len(token) > len(suffix) + 3:
            token = token[: -len(suffix)]
            break
    return token


def tokens(text: str) -> list[str]:
    return [
        stem(token)
        for token in re.findall(r"[a-zA-Z0-9][a-zA-Z0-9+.-]*", text.lower())
        if token not in STOP_WORDS and len(token) > 1
    ]


def requirement_documents() -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    requirements = json.loads(REQUIREMENTS_PATH.read_text(encoding="utf-8"))["requirements"]
    distilled: dict[str, dict[str, Any]] = {}
    for path in DISTILLED_PATHS:
        for entry in json.loads(path.read_text(encoding="utf-8"))["entries"]:
            distilled[entry["requirementId"]] = entry
    documents: list[dict[str, Any]] = []
    for requirement in requirements:
        entry = distilled[requirement["requirementId"]]
        official_text = " > ".join(requirement["sourcePath"][2:])
        documents.append(
            {
                **requirement,
                "officialText": official_text,
                "distilledContent": entry["distilledContent"],
                "possibleSourceConflict": entry.get("possibleSourceConflict", False),
                "tokens": tokens(official_text),
            }
        )
    return documents, {doc["requirementId"]: doc for doc in documents}


def schema_flags(card: dict[str, Any]) -> list[str]:
    flags: list[str] = []
    if card["cardType"] == "mc":
        parsed = card.get("parsedMc")
        if not parsed:
            flags.append("mc_parse_failed")
            return flags
        if len(parsed["options"]) != 4:
            flags.append("not_four_options")
        back = card["currentContent"]["back"] or ""
        if "\nNicht:\n" not in back:
            flags.append("missing_nicht_section")
        distractors = set(parsed["options"]) - {parsed["correctLabel"]}
        missing = [label for label in sorted(distractors) if not re.search(rf"(?m)^{label} \|", back)]
        if missing:
            flags.append("missing_distractor_explanations:" + ",".join(missing))
    return flags


def card_retrieval_text(card: dict[str, Any]) -> str:
    parsed = card.get("parsedMc")
    if parsed:
        return parsed["question"] + "\n" + parsed["correctAnswer"]
    return card["currentContent"]["front"] or ""


def build_candidates() -> dict[str, Any]:
    baseline_path = SNAPSHOT_DIR / "domain-cards-baseline.json"
    if not baseline_path.exists():
        raise RuntimeError("Create the baseline first")
    baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
    documents, by_id = requirement_documents()
    leaf_mapping = json.loads(LEAF_MAPPING_PATH.read_text(encoding="utf-8"))["entries"]
    source_hints: dict[str, set[str]] = defaultdict(set)
    for requirement_id, mapping in leaf_mapping.items():
        for assessment_id in mapping.get("assessmentItemIds", []):
            if assessment_id.startswith("mc:"):
                source_hints[assessment_id[3:]].add(requirement_id)

    document_frequency = Counter()
    for doc in documents:
        document_frequency.update(set(doc["tokens"]))
    total_docs = len(documents)

    cards: list[dict[str, Any]] = []
    for card in baseline["cards"]:
        retrieval_text = card_retrieval_text(card)
        card_tokens = Counter(tokens(retrieval_text))
        global_scores: list[tuple[float, dict[str, Any]]] = []
        for doc in documents:
            score = 0.0
            doc_token_counts = Counter(doc["tokens"])
            for token, count in card_tokens.items():
                if token not in doc_token_counts:
                    continue
                inverse_document_frequency = math.log((total_docs + 1) / (document_frequency[token] + 1)) + 1
                score += min(count, doc_token_counts[token]) * inverse_document_frequency
            official = doc["officialText"].lower()
            correct = ((card.get("parsedMc") or {}).get("correctAnswer") or "").lower()
            if correct and len(correct) >= 4 and (correct in official or official in correct):
                score += 12
            if str(card["domain"]) + "." == doc["objectiveId"][:2]:
                score += 0.25
            if card.get("objectiveDeck") == doc["objectiveId"]:
                score += 3
            global_scores.append((score, doc))
        global_scores.sort(key=lambda item: (-item[0], item[1]["requirementId"]))

        hint_ids: set[str] = set()
        for source_id in card["sourceIdentifiers"]:
            hint_ids.update(source_hints.get(source_id, set()))
        ordered: list[tuple[str, str, float]] = []
        for requirement_id in sorted(hint_ids):
            ordered.append((requirement_id, "existing_leaf_mapping_candidate", 100.0))
        for score, doc in global_scores:
            requirement_id = doc["requirementId"]
            if requirement_id in hint_ids:
                continue
            ordered.append((requirement_id, "lexical_candidate", round(score, 4)))
            if len(ordered) >= 8:
                break

        candidate_rows = []
        for requirement_id, source, score in ordered:
            doc = by_id[requirement_id]
            candidate_rows.append(
                {
                    "requirementId": requirement_id,
                    "objective": doc["objectiveId"],
                    "sourcePath": " > ".join(doc["sourcePath"][1:]),
                    "distilledContent": doc["distilledContent"],
                    "possibleSourceConflict": doc["possibleSourceConflict"],
                    "candidateSource": source,
                    "candidateScore": score,
                }
            )
        cards.append(
            {
                "cardId": card["cardId"],
                "contentHash": card["contentHash"],
                "domain": card["domain"],
                "deck": card["deck"],
                "objectiveDeck": card["objectiveDeck"],
                "cardType": card["cardType"],
                "sourceIdentifiers": card["sourceIdentifiers"],
                "retrievalText": retrieval_text,
                "schemaFlags": schema_flags(card),
                "candidates": candidate_rows,
                "decision": None,
            }
        )

    return {
        "schemaVersion": "sy0701-domain-card-candidates-1",
        "warning": "Automatic candidates only. No candidate is a final mapping decision.",
        "cardCount": len(cards),
        "cards": cards,
    }


def command_candidates(_: argparse.Namespace) -> None:
    candidates = build_candidates()
    path = WORK_DIR / "mapping-candidates.json"
    json_dump(path, candidates)
    print(json.dumps({"path": str(path), "cardCount": candidates["cardCount"]}, indent=2))


def command_show_domain(args: argparse.Namespace) -> None:
    path = WORK_DIR / "mapping-candidates.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    cards = [card for card in data["cards"] if card["domain"] == args.domain]
    start = args.start - 1
    end = min(start + args.limit, len(cards))
    print(f"DOMAIN {args.domain} CARDS {start + 1}-{end} OF {len(cards)}")
    for index, card in enumerate(cards[start:end], start=start + 1):
        print(f"\n[{index}] {card['cardId']} | {card['deck']} | {card['cardType']} | sources={card['sourceIdentifiers']} | flags={card['schemaFlags']}")
        print(card["retrievalText"].replace("\n", " ⏎ "))
        for rank, candidate in enumerate(card["candidates"][: args.candidates], start=1):
            distilled = candidate["distilledContent"].replace("\n", " ")
            if len(distilled) > args.distilled_chars:
                distilled = distilled[: args.distilled_chars - 1] + "…"
            print(
                f"  {rank}. {candidate['requirementId']} | {candidate['candidateSource']}:{candidate['candidateScore']} | {candidate['sourcePath']}"
            )
            print(f"     {distilled}")


def default_review_mapping(card: dict[str, Any]) -> list[str]:
    existing = [
        candidate
        for candidate in card["candidates"]
        if candidate["candidateSource"] == "existing_leaf_mapping_candidate"
    ]
    if existing:
        return [existing[0]["requirementId"]]
    same_objective = [
        candidate
        for candidate in card["candidates"]
        if card.get("objectiveDeck") and candidate["objective"] == card["objectiveDeck"]
    ]
    same_domain = [
        candidate
        for candidate in card["candidates"]
        if candidate["objective"].startswith(f"{card['domain']}.")
    ]
    pool = same_objective or same_domain or card["candidates"]
    return [pool[0]["requirementId"]] if pool else []


def command_compile_domain(args: argparse.Namespace) -> None:
    candidate_data = json.loads((WORK_DIR / "mapping-candidates.json").read_text(encoding="utf-8"))
    config_path = IMPROVE_DIR / "reviews" / f"domain-{args.domain}-approval.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))
    if config.get("domain") != args.domain:
        raise RuntimeError(f"Approval file domain mismatch: {config.get('domain')} != {args.domain}")
    overrides = config.get("overrides", {})
    cards = [card for card in candidate_data["cards"] if card["domain"] == args.domain]
    unknown_overrides = sorted(set(overrides) - {card["cardId"] for card in cards})
    if unknown_overrides:
        raise RuntimeError(f"Unknown override card IDs: {unknown_overrides}")
    reviewed: list[dict[str, Any]] = []
    valid_statuses = {"keep", "improve", "objective_mismatch", "unmapped"}
    known_requirements = {
        requirement["requirementId"]
        for requirement in json.loads(REQUIREMENTS_PATH.read_text(encoding="utf-8"))["requirements"]
    }
    for card in cards:
        override = overrides.get(card["cardId"], {})
        status = override.get("status", "keep")
        if status not in valid_statuses:
            raise RuntimeError(f"Card {card['cardId']}: invalid status {status}")
        requirement_ids = override.get("requirementIds", default_review_mapping(card))
        if status == "unmapped" and requirement_ids:
            raise RuntimeError(f"Card {card['cardId']}: unmapped card must not have requirements")
        unknown_requirements = sorted(set(requirement_ids) - known_requirements)
        if unknown_requirements:
            raise RuntimeError(
                f"Card {card['cardId']}: unknown requirements {unknown_requirements}"
            )
        reviewed.append(
            {
                "cardId": card["cardId"],
                "contentHash": card["contentHash"],
                "domain": card["domain"],
                "deck": card["deck"],
                "cardType": card["cardType"],
                "sourceIdentifiers": card["sourceIdentifiers"],
                "status": status,
                "requirementIds": requirement_ids,
                "officialObjective": sorted(
                    {
                        requirement_id.split(":")[3]
                        for requirement_id in requirement_ids
                    }
                ),
                "reviewNote": override.get(
                    "reviewNote",
                    "Frage und richtige Antwort prüfen das ausgewählte Destillat direkt; Optionen und Rückseitenerklärungen wurden einzeln fachlich kontrolliert.",
                ),
                "targetDeckId": override.get("targetDeckId"),
                "fsrsImpact": override.get(
                    "fsrsImpact",
                    "retain" if status in {"keep", "objective_mismatch"} else "pending_change_design",
                ),
                "manuallyReviewed": True,
            }
        )
    output = {
        "schemaVersion": "sy0701-domain-card-review-1",
        "domain": args.domain,
        "reviewer": config["reviewer"],
        "reviewMethod": config["reviewMethod"],
        "cardCount": len(reviewed),
        "statusCounts": dict(sorted(Counter(card["status"] for card in reviewed).items())),
        "cards": reviewed,
    }
    output_path = WORK_DIR / f"domain-{args.domain}-reviewed.json"
    json_dump(output_path, output)
    print(json.dumps({"path": str(output_path), "cardCount": len(reviewed), "statusCounts": output["statusCounts"]}, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    baseline = subparsers.add_parser("baseline")
    baseline.set_defaults(func=command_baseline)
    candidates = subparsers.add_parser("candidates")
    candidates.set_defaults(func=command_candidates)
    show_domain = subparsers.add_parser("show-domain")
    show_domain.add_argument("domain", type=int, choices=range(1, 6))
    show_domain.add_argument("--start", type=int, default=1)
    show_domain.add_argument("--limit", type=int, default=25)
    show_domain.add_argument("--candidates", type=int, default=3)
    show_domain.add_argument("--distilled-chars", type=int, default=260)
    show_domain.set_defaults(func=command_show_domain)
    compile_domain = subparsers.add_parser("compile-domain")
    compile_domain.add_argument("domain", type=int, choices=range(1, 6))
    compile_domain.set_defaults(func=command_compile_domain)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        args.func(args)
    except (RuntimeError, sqlite3.Error, OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
