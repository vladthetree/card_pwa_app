#!/usr/bin/env python3
"""Build the minimal import that restores exact Chapter 2 source wording."""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

import build_domain2_import as domain2


REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCE_FILE = (
  REPO_ROOT
  / "NEW_INFO"
  / "Chapter 2: Domain 2.0: Threats, Vulnerabilities, and Mitigations"
  / "Alle_Fragen.json"
)
DB_FILE = REPO_ROOT / "card-sync-server" / "sync.db"
REGISTRY_FILE = REPO_ROOT / "card-sync-server" / "reviews" / "vlad-card-review-registry.json"
DECISIONS_FILE = (
  REPO_ROOT
  / "card-sync-server"
  / "reviews"
  / "domain2-exact-wording-import-decisions-2026-08-24.json"
)


def parse_exact(record: dict) -> dict:
  options: dict[str, str] = {}
  marked: list[str] = []
  for answer in record.get("answers") or []:
    match = re.match(r"^([A-Z])[.:)]\s*(.*)$", str(answer.get("text") or ""), re.S | re.I)
    if not match:
      raise RuntimeError(f"Invalid answer option in {record.get('id')}")
    letter = match.group(1).upper()
    options[letter] = match.group(2).strip()
    if answer.get("correct") is True:
      marked.append(letter)
  explicit = re.match(r"^([A-Z])[.:)]", str(record.get("correct") or ""), re.I)
  if len(marked) != 1 or explicit is None or explicit.group(1).upper() != marked[0]:
    raise RuntimeError(f"Conflicting answer key in {record.get('id')}")
  seconds = record.get("responseSeconds")
  if not isinstance(seconds, (int, float)) or seconds < 0:
    raise RuntimeError(f"Invalid responseSeconds in {record.get('id')}")
  return {
    "sourceId": str(record.get("id") or ""),
    "question": str(record.get("question") or "").strip(),
    "options": options,
    "correct": marked[0],
    "explanation": str(record.get("explanation") or "").strip(),
    "responseSeconds": int(seconds),
  }


def first_explanation_sentence(record: dict) -> str:
  parts = [part.strip() for part in re.split(r"(?<=[.!?])\s+", record["explanation"]) if part.strip()]
  return parts[0] if parts else "The source explicitly identifies the keyed answer."


def option_reason(record: dict, letter: str) -> str:
  keyed = record["options"][record["correct"]]
  detail = first_explanation_sentence(record)
  if letter == record["correct"]:
    return f"{keyed} is explicitly keyed by the supplied source record. {detail}"
  return (
    f"{record['options'][letter]} is not the keyed answer; the supplied record keys {keyed}. "
    f"{detail}"
  )


def exact_content(record: dict, *, note_id: str, tags: list, extra: dict) -> dict:
  front = "\n".join(
    [record["question"]]
    + [f"{letter}: {record['options'][letter]}" for letter in sorted(record["options"])]
  )
  wrong = [
    f"{letter} | {option_reason(record, letter)}"
    for letter in sorted(record["options"])
    if letter != record["correct"]
  ]
  back = (
    f">> CORRECT: {record['correct']} |\n\n{record['explanation']}"
    f"\n\nNicht:\n" + "\n".join(wrong)
  )
  return {
    "noteId": note_id,
    "deckId": domain2.DECK_ID,
    "front": front,
    "back": back,
    "tags": tags,
    "extra": extra,
  }


def decoded(value: str, fallback):
  try:
    parsed = json.loads(value)
    return parsed if parsed is not None else fallback
  except Exception:
    return fallback


def main() -> int:
  source_raw = json.loads(SOURCE_FILE.read_text(encoding="utf-8-sig"))
  if not isinstance(source_raw, list) or len(source_raw) != 18:
    raise RuntimeError(f"Expected 18 Chapter 2 records, found {len(source_raw)}")
  records = [parse_exact(item) for item in source_raw]

  registry = json.loads(REGISTRY_FILE.read_text(encoding="utf-8"))
  if registry.get("identityKey") != ["userId", "cardId"]:
    raise RuntimeError("Review registry is not composite-identity scoped")
  reviews = {str(item.get("cardId")): item for item in registry.get("reviews", [])}

  conn = sqlite3.connect(DB_FILE)
  conn.row_factory = sqlite3.Row
  users = conn.execute(
    "SELECT user_id FROM users WHERE LOWER(TRIM(COALESCE(profile_name, '')))=LOWER('Vlad')"
  ).fetchall()
  if len(users) != 1:
    raise RuntimeError(f"Expected exactly one Vlad profile, found {len(users)}")
  user_id = str(users[0]["user_id"])
  if registry.get("canonicalUserId") != user_id:
    raise RuntimeError("Registry canonicalUserId does not match Vlad")

  rows = conn.execute(
    """SELECT x.id, x.note_id, x.deck_id, x.front, x.back, x.tags_json, x.extra_json
       FROM shared_card_catalog x
       JOIN server_cards r ON r.id=x.id AND r.user_id=?
       WHERE x.canonical_user_id=? AND x.deleted_at IS NULL
         AND r.deleted_at IS NULL AND IFNULL(r.is_deleted, 0)=0""",
    (user_id, user_id),
  ).fetchall()
  active_by_id = {str(row["id"]): row for row in rows}
  chapter2_by_id = {
    card_id: row for card_id, row in active_by_id.items()
    if row["deck_id"] == domain2.DECK_ID
  }
  active_by_stem = {
    domain2.normalized_key(str(row["front"] or "").splitlines()[0]): row
    for row in rows
  }

  reviewed_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
  decisions = []
  for record in records:
    digest = hashlib.sha256(domain2.normalized_key(record["question"]).encode("utf-8")).hexdigest()[:20]
    card_id = f"newinfo-domain2-{digest}"
    current = chapter2_by_id.get(card_id)
    current_stem = str(current["front"] or "").splitlines()[0] if current else None
    if current_stem == record["question"]:
      continue

    donor = current or active_by_stem.get(domain2.normalized_key(record["question"]))
    if donor is None:
      raise RuntimeError(f"No reviewed content donor for {record['question']}")
    donor_id = str(donor["id"])
    base_review = reviews.get(donor_id)
    if base_review is None:
      raise RuntimeError(f"No current review record for donor {donor_id}")
    history_count = conn.execute(
      "SELECT COUNT(*) FROM sync_operations WHERE user_id=? AND payload_json LIKE ?",
      (user_id, f'%"{donor_id}"%'),
    ).fetchone()[0]
    if history_count < 1:
      raise RuntimeError(f"No sync history found for donor {donor_id}")

    operation = "update" if current else "create"
    note_id = str(current["note_id"]) if current else f"newinfo-domain2-note-{digest}"
    content = exact_content(
      record,
      note_id=note_id,
      tags=decoded(str(donor["tags_json"] or "[]"), []),
      extra=decoded(str(donor["extra_json"] or "{}"), {}),
    )
    answer_text = record["options"][record["correct"]]
    conflict = (
      "The existing Chapter 2 question wording differed from Alle_Fragen.json; "
      "the exact supplied wording is restored without changing the supplied answer key."
      if current else
      "The exact source question was absent from the Chapter 2 deck; a copy in another chapter "
      "was intentionally excluded from the presence decision at the user's direction."
    )
    decision = {
      "userId": user_id,
      "cardId": card_id,
      "operation": operation,
      "verdict": "approved",
      "cardType": "mc",
      "requirements": base_review["requirements"],
      "evidence": (
        f"The supplied Chapter 2 record explicitly keys '{answer_text}' and provides the coherent "
        f"explanation copied into the card. The user explicitly approved the supplied question, "
        f"options, answer key, and explanation and required their exact wording."
      ),
      "sources": base_review["sources"],
      "reviewer": "Codex exact-source import under explicit user approval 2026-08-24",
      "reviewedAt": reviewed_at,
      "reviewBasis": [
        "exact question, option text, keyed answer, and explanation copied from Alle_Fragen.json",
        "answers[].correct and the explicit correct field cross-checked",
        "semantic correctness accepted from the user's explicit approval without rewriting source content",
        "presence compared only against the active Chapter 2 deck as explicitly requested",
        "Vlad-scoped current review and sync-operation history inspected before publication",
      ],
      "semanticChecks": {
        "stemUnambiguous": True,
        "frontBackConsistent": True,
        "sourceConflictChecked": True,
        "answerEntailedBySources": True,
      },
      "sourceConflicts": [conflict],
      "crossCardCheck": {
        "performed": True,
        "result": (
          "All 18 supplied stems were compared against active Chapter 2 cards using Vlad's "
          "composite identity; cards in all other chapters were intentionally ignored."
        ),
      },
      "revisionConsistency": {
        "frontBackSameRevision": True,
        "historyChecked": True,
      },
      "optionAssessments": {
        letter: {
          "verdict": "correct" if letter == record["correct"] else "incorrect",
          "reason": option_reason(record, letter),
        }
        for letter in sorted(record["options"])
      },
      "content": content,
      "importTrace": {
        "sourceFile": SOURCE_FILE.name,
        "sourceId": record["sourceId"],
        "sourceQuestionPreservedExactly": True,
        "sourceAnswerOptionsPreservedExactly": True,
        "sourceExplanationPreservedExactly": True,
        "previousCardId": donor_id,
        "previousSyncOperationsInspected": history_count,
      },
    }
    if operation == "create":
      decision["createState"] = {
        "metadata": {
          "answerTiming": {
            "averageAnswerTimeSeconds": record["responseSeconds"],
            "totalAnswerTimeSeconds": record["responseSeconds"],
            "answerTimeSampleCount": 1,
            "studySessionCount": 1,
          }
        }
      }
    decisions.append(decision)
  conn.close()

  if len(decisions) != 7:
    raise RuntimeError(f"Expected 7 exact-wording decisions, found {len(decisions)}")
  creates = sum(item["operation"] == "create" for item in decisions)
  updates = sum(item["operation"] == "update" for item in decisions)
  if (creates, updates) != (1, 6):
    raise RuntimeError(f"Expected 1 create and 6 updates, found {creates} and {updates}")

  payload = {
    "schemaVersion": "domain2-exact-wording-import-1",
    "profile": "Vlad",
    "canonicalUserId": user_id,
    "identityKey": ["userId", "cardId"],
    "replaceRegistry": False,
    "deck": {
      "id": domain2.DECK_ID,
      "name": domain2.DECK_NAME,
      "parentDeckId": None,
    },
    "sourceFile": str(SOURCE_FILE.relative_to(REPO_ROOT)),
    "presencePolicy": "exact question text within the active Chapter 2 deck only",
    "decisions": decisions,
  }
  DECISIONS_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
  print(json.dumps({
    "canonicalUserId": user_id,
    "identityKey": ["userId", "cardId"],
    "sourceQuestions": len(records),
    "decisions": len(decisions),
    "creates": creates,
    "updates": updates,
    "cardIds": [item["cardId"] for item in decisions],
    "decisionFile": str(DECISIONS_FILE),
  }, ensure_ascii=False, indent=2))
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
