#!/usr/bin/env python3
"""Inventory, deduplicate, and import NEW_INFO chapter JSON files.

The accepted source schema is the array-of-question-objects format used by
NEW_INFO Chapter 5. Running without --publish is read-only. Publication writes
the supplied questions and solutions directly to the PWA database.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shlex
import sqlite3
import sys
import time
import unicodedata
from datetime import date, datetime, timezone
from pathlib import Path


def find_repo_root(script_file: Path) -> Path:
  """Find the checkout whether this script lives in scripts/ or NEW_INFO/."""
  start = script_file.resolve().parent
  for candidate in (start, *start.parents):
    if (candidate / "card-sync-server").is_dir() and (candidate / "NEW_INFO").is_dir():
      return candidate
  raise RuntimeError(f"Could not locate card_pwa_app above {script_file}")


REPO_ROOT = find_repo_root(Path(__file__))
SERVER_ROOT = REPO_ROOT / "card-sync-server"
SCRIPTS_DIR = SERVER_ROOT / "scripts"
DEFAULT_DB = SERVER_ROOT / "sync.db"
BACKUP_DIR = SERVER_ROOT / "backups" / "chapter-json-import"
CHAPTER_RE = re.compile(
  r"^Chapter\s+(?P<chapter>\d+)\s*:\s*Domain\s+(?P<domain>\d+(?:\.\d+)?)\s*:\s*(?P<title>.+)$",
  re.I,
)

IMPORT_SOURCE = "chapter-json-direct-import"
IMPORT_SOURCE_CLIENT = "chapter-json-import-v1"


def normalize_text(value: str) -> str:
  value = unicodedata.normalize("NFKC", value or "")
  value = value.replace("‐", "-").replace("‑", "-").replace("–", "-").replace("—", "-")
  return re.sub(r"\s+", " ", value).strip()


def question_key(value: str) -> str:
  value = normalize_text(value).casefold()
  return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", value)).strip()


def parse_option(value: str) -> tuple[str, str]:
  match = re.match(r"^([A-Z])[.:)]\s*(.*)$", str(value or ""), re.I | re.S)
  if not match:
    raise ValueError(f"answer text has no A-D prefix: {value!r}")
  return match.group(1).upper(), match.group(2).strip()


def validate_record(record: object, source: Path, index: int) -> dict:
  where = f"{source}:{index}"
  if not isinstance(record, dict):
    raise ValueError(f"{where}: record is not an object")
  question = str(record.get("question") or "").strip()
  if not question:
    raise ValueError(f"{where}: question is empty")
  answers = record.get("answers")
  if not isinstance(answers, list) or len(answers) != 4:
    raise ValueError(f"{where}: answers must contain exactly four entries")
  options = {}
  marked = []
  for answer_index, answer in enumerate(answers, start=1):
    if not isinstance(answer, dict):
      raise ValueError(f"{where}: answer {answer_index} is not an object")
    letter, text = parse_option(str(answer.get("text") or ""))
    if letter in options:
      raise ValueError(f"{where}: duplicate option letter {letter}")
    options[letter] = text
    if answer.get("correct") is True:
      marked.append(letter)
  if set(options) != {"A", "B", "C", "D"}:
    raise ValueError(f"{where}: answer letters must be exactly A, B, C, D")
  explicit = re.match(r"^([A-Z])[.:)]", str(record.get("correct") or ""), re.I)
  if len(marked) != 1 or explicit is None or explicit.group(1).upper() != marked[0]:
    raise ValueError(f"{where}: answers[].correct conflicts with correct")
  explanation = str(record.get("explanation") or "").strip()
  if not explanation:
    raise ValueError(f"{where}: explanation is empty")
  seconds = record.get("responseSeconds")
  if not isinstance(seconds, (int, float)) or seconds < 0:
    raise ValueError(f"{where}: responseSeconds must be a non-negative number")
  return {
    "raw": record,
    "question": question,
    "key": question_key(question),
    "options": options,
    "correct": marked[0],
    "explanation": normalize_text(explanation),
    "responseSeconds": int(seconds),
    "source": str(source),
  }


def content_signature(record: dict) -> str:
  payload = {
    "options": record["options"],
    "correct": record["correct"],
    "explanation": record["explanation"],
  }
  return hashlib.sha256(
    json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
  ).hexdigest()


def slugify(value: str) -> str:
  ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
  return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", ascii_value.casefold())).strip("-")


def deck_id_for(metadata: dict) -> str:
  domain = str(metadata["domain"]).split(".", 1)[0]
  return f"newinfo-chapter-{metadata['chapter']}-domain-{domain}-{slugify(metadata['title'])}"


def card_id_for(chapter: int, question: str) -> str:
  digest = hashlib.sha256(question_key(question).encode("utf-8")).hexdigest()[:20]
  return f"newinfo-domain{chapter}-{digest}"


def content_for_record(raw: dict, metadata: dict, source: Path, index: int) -> tuple[str, dict, dict]:
  record = validate_record(raw, source, index)
  chapter = int(metadata["chapter"])
  card_id = card_id_for(chapter, record["question"])
  correct_text = record["options"][record["correct"]]
  front = "\n".join(
    [record["question"]]
    + [f"{letter}: {record['options'][letter]}" for letter in "ABCD"]
  )
  wrong = [
    (
      f"{letter} | {record['options'][letter]} erfüllt die im Fragetext geprüfte "
      f"Eigenschaft nicht; maßgeblich ist {correct_text}. {record['explanation']}"
    )
    for letter in "ABCD"
    if letter != record["correct"]
  ]
  content = {
    "noteId": f"newinfo-domain{chapter}-note-{card_id.rsplit('-', 1)[-1]}",
    "deckId": deck_id_for(metadata),
    "front": front,
    "back": f">> CORRECT: {record['correct']} |\n\n{record['explanation']}\n\nNicht:\n" + "\n".join(wrong),
    "tags": [f"Domain {metadata['domain']}", metadata["title"]],
    "extra": {"acronym": "", "examples": "", "port": "", "protocol": ""},
  }
  return card_id, content, record


def load_and_deduplicate(chapter_dir: Path) -> tuple[list[dict], dict]:
  files = sorted(path for path in chapter_dir.rglob("*.json") if path.is_file())
  if not files:
    raise RuntimeError(f"No JSON files found below {chapter_dir}")
  parsed = []
  errors = []
  file_counts = {}
  for path in files:
    try:
      value = json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception as exc:
      errors.append(f"{path}: invalid JSON: {exc}")
      continue
    if not isinstance(value, list):
      errors.append(f"{path}: top-level value must be an array")
      continue
    file_counts[str(path)] = len(value)
    for index, record in enumerate(value, start=1):
      try:
        parsed.append(validate_record(record, path, index))
      except ValueError as exc:
        errors.append(str(exc))

  grouped: dict[str, list[dict]] = {}
  order = []
  for record in parsed:
    if record["key"] not in grouped:
      grouped[record["key"]] = []
      order.append(record["key"])
    grouped[record["key"]].append(record)

  conflicts = []
  duplicate_groups = []
  timing_variants = []
  unique = []
  for key in order:
    records = grouped[key]
    signatures = {content_signature(record) for record in records}
    if len(signatures) > 1:
      conflicts.append({
        "question": records[0]["question"],
        "copies": len(records),
        "sources": sorted({record["source"] for record in records}),
        "answerKeys": sorted({record["correct"] for record in records}),
      })
      continue
    unique.append(records[0]["raw"])
    if len(records) > 1:
      duplicate_groups.append({
        "question": records[0]["question"],
        "copies": len(records),
        "sources": sorted({record["source"] for record in records}),
      })
    times = sorted({record["responseSeconds"] for record in records})
    if len(times) > 1:
      timing_variants.append({"question": records[0]["question"], "responseSeconds": times})

  feedback = {
    "chapterDirectory": str(chapter_dir),
    "jsonFiles": len(files),
    "recordsByFile": file_counts,
    "validRecords": len(parsed),
    "uniqueQuestions": len(unique),
    "duplicateCopiesRemoved": len(parsed) - len(grouped),
    "duplicateQuestionGroups": len(duplicate_groups),
    "conflictingQuestionGroups": len(conflicts),
    "invalidRecords": len(errors),
    "duplicateGroups": duplicate_groups,
    "timingVariants": timing_variants,
    "conflicts": conflicts,
    "errors": errors,
  }
  return unique, feedback


def chapter_metadata(chapter_dir: Path) -> dict:
  match = CHAPTER_RE.fullmatch(chapter_dir.name)
  if not match:
    raise RuntimeError(
      "Chapter directory name must follow "
      "'Chapter N: Domain N.0: Title' so the target deck can be resolved"
    )
  return {
    "chapter": int(match.group("chapter")),
    "domain": match.group("domain"),
    "title": match.group("title"),
    "deckName": chapter_dir.name,
  }


def resolve_vlad(conn: sqlite3.Connection) -> str:
  rows = conn.execute(
    "SELECT user_id FROM users WHERE LOWER(TRIM(COALESCE(profile_name,'')))=LOWER('Vlad')"
  ).fetchall()
  if len(rows) != 1:
    raise RuntimeError(f"Expected exactly one Vlad profile, found {len(rows)}")
  return str(rows[0][0])


def database_backup(db_path: Path) -> Path:
  BACKUP_DIR.mkdir(parents=True, exist_ok=True)
  stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
  backup_path = BACKUP_DIR / f"{db_path.stem}.before-chapter-import-{stamp}.sqlite"
  source = sqlite3.connect(db_path)
  target = sqlite3.connect(backup_path)
  try:
    source.backup(target)
  finally:
    target.close()
    source.close()
  return backup_path


def _json_equal(left: object, right: object) -> bool:
  return json.dumps(left, ensure_ascii=False, sort_keys=True, separators=(",", ":")) == json.dumps(
    right, ensure_ascii=False, sort_keys=True, separators=(",", ":")
  )


def direct_publish(unique: list[dict], metadata: dict, db_path: Path, source_file: Path) -> dict:
  """Atomically write one deduplicated chapter while preserving study state."""
  if not db_path.is_file():
    raise RuntimeError(f"Database does not exist: {db_path}")
  if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))
  from server.domain.card_catalog import (  # noqa: E402
    catalog_content_from_row,
    catalog_enabled,
    catalog_row,
    upsert_catalog_content,
  )
  from server.sync.operations import apply_operation  # noqa: E402

  prepared = [content_for_record(raw, metadata, source_file, index) for index, raw in enumerate(unique, 1)]
  card_ids = [item[0] for item in prepared]
  if len(set(card_ids)) != len(card_ids):
    raise RuntimeError("Deterministic card ID collision")

  conn = sqlite3.connect(db_path)
  conn.row_factory = sqlite3.Row
  user_id = resolve_vlad(conn)
  shared_catalog = catalog_enabled(conn)
  active_rows = conn.execute(
    """SELECT x.id, x.front, x.deck_id
       FROM shared_card_catalog x
       JOIN server_cards r ON r.id=x.id AND r.user_id=?
       WHERE x.canonical_user_id=? AND x.deleted_at IS NULL
         AND r.deleted_at IS NULL AND IFNULL(r.is_deleted,0)=0""",
    (user_id, user_id),
  ).fetchall() if shared_catalog else conn.execute(
    """SELECT id, front, deck_id FROM server_cards
       WHERE user_id=? AND deleted_at IS NULL AND IFNULL(is_deleted,0)=0""",
    (user_id,),
  ).fetchall()
  active_stems = {
    question_key(str(row["front"] or "").splitlines()[0]): {
      "cardId": str(row["id"]),
      "deckId": str(row["deck_id"] or ""),
    }
    for row in active_rows
  }
  importable = []
  skipped_existing = []
  for card_id, content, record in prepared:
    existing = active_stems.get(question_key(record["question"]))
    if existing and existing["cardId"] != card_id:
      skipped_existing.append({
        "question": record["question"],
        "existingCardId": existing["cardId"],
        "existingDeckId": existing["deckId"],
        "skippedCardId": card_id,
        "reason": "Identical question stem already exists as an active card",
      })
      continue
    importable.append((card_id, content, record))

  actions = []
  for card_id, content, record in importable:
    if shared_catalog:
      existing = catalog_row(conn, card_id, user_id)
      existing_content = catalog_content_from_row(existing)
    else:
      existing = conn.execute(
        """SELECT id, note_id, deck_id, front, back, tags_json, extra_json
           FROM server_cards WHERE id=? AND user_id=? AND deleted_at IS NULL
             AND IFNULL(is_deleted,0)=0""",
        (card_id, user_id),
      ).fetchone()
      existing_content = None if not existing else {
        "noteId": existing["note_id"], "deckId": existing["deck_id"],
        "front": existing["front"], "back": existing["back"],
        "tags": json.loads(existing["tags_json"] or "[]"),
        "extra": json.loads(existing["extra_json"] or "{}"),
      }
    operation = "create" if not existing else ("unchanged" if _json_equal(existing_content, content) else "update")
    actions.append((operation, card_id, content, record))

  now = int(time.time() * 1000)
  maximum = conn.execute(
    "SELECT MAX(value) FROM (SELECT MAX(updated_at) value FROM server_cards UNION ALL SELECT MAX(updated_at) FROM server_decks)"
  ).fetchone()[0] or 0
  base_ts = max(now, int(maximum) + 1)
  deck_id = deck_id_for(metadata)
  deck_payload = {
    "id": deck_id,
    "name": metadata["deckName"],
    "parentDeckId": None,
    "source": IMPORT_SOURCE,
    "createdAt": base_ts,
    "updatedAt": base_ts,
    "timestamp": base_ts,
  }
  existing_deck = conn.execute(
    """SELECT name, parent_deck_id, deleted_at FROM server_decks
       WHERE id=? AND user_id=?""",
    (deck_id, user_id),
  ).fetchone()
  deck_needs_write = bool(
    importable
    and (
      not existing_deck
      or existing_deck[0] != metadata["deckName"]
      or existing_deck[1] is not None
      or existing_deck[2] is not None
    )
  )
  has_writes = deck_needs_write or any(operation != "unchanged" for operation, *_ in actions)
  backup_path = database_backup(db_path) if has_writes else None

  def record_operation(op_id: str, op_type: str, payload: dict, timestamp: int) -> None:
    conn.execute(
      """INSERT INTO sync_operations
         (op_id, op_type, payload_json, client_timestamp, source,
          source_client, created_at, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
      (
        op_id, op_type, json.dumps(payload, ensure_ascii=False), timestamp,
        IMPORT_SOURCE, IMPORT_SOURCE_CLIENT, int(time.time()), user_id,
      ),
    )
    apply_operation(
      conn, op_type, payload, timestamp, IMPORT_SOURCE_CLIENT,
      op_id=op_id, user_id=user_id,
    )

  try:
    conn.execute("BEGIN IMMEDIATE")
    if deck_needs_write:
      deck_digest = hashlib.sha256(json.dumps(deck_payload, sort_keys=True).encode()).hexdigest()[:16]
      record_operation(
        f"{IMPORT_SOURCE_CLIENT}:deck.create:{user_id}:{deck_id}:{deck_digest}",
        "deck.create", deck_payload, base_ts,
      )
    created = updated = unchanged = 0
    for offset, (operation, card_id, content, record) in enumerate(actions, 1):
      if operation == "unchanged":
        unchanged += 1
        continue
      timestamp = base_ts + offset
      if shared_catalog:
        prior = catalog_row(conn, card_id, user_id)
        upsert_catalog_content(
          conn,
          card_id=card_id,
          canonical_user_id=user_id,
          content=content,
          created_at=prior["created_at"] if prior else timestamp,
          updated_at=timestamp,
          source_client=IMPORT_SOURCE_CLIENT,
        )
      if operation == "create":
        payload = {
          "id": card_id, **content,
          "type": 0, "queue": 0, "due": 0, "dueAt": 0,
          "learningStep": 0, "lastReviewedAt": None, "interval": 0,
          "factor": 2500, "stability": None, "difficulty": None,
          "retrievability": None, "reps": 0, "lapses": 0, "algorithm": "fsrs",
          "metadata": {
            "answerTiming": {
              "averageAnswerTimeSeconds": record["responseSeconds"],
              "totalAnswerTimeSeconds": record["responseSeconds"],
              "answerTimeSampleCount": 1,
              "studySessionCount": 1,
            }
          },
          "createdAt": timestamp, "updatedAt": timestamp, "timestamp": timestamp,
        }
        op_type = "card.create"
        created += 1
      else:
        payload = {"cardId": card_id, "updates": {**content, "updatedAt": timestamp}, "timestamp": timestamp}
        op_type = "card.update"
        updated += 1
      payload_digest = hashlib.sha256(
        json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
      ).hexdigest()[:16]
      record_operation(
        f"{IMPORT_SOURCE_CLIENT}:{op_type}:{user_id}:{card_id}:{payload_digest}",
        op_type, payload, timestamp,
      )

    verified = 0
    for _, card_id, expected, record in actions:
      if shared_catalog:
        actual = catalog_content_from_row(catalog_row(conn, card_id, user_id))
      else:
        row = conn.execute(
          "SELECT note_id,deck_id,front,back,tags_json,extra_json FROM server_cards WHERE id=? AND user_id=?",
          (card_id, user_id),
        ).fetchone()
        actual = None if not row else {
          "noteId": row[0], "deckId": row[1], "front": row[2], "back": row[3],
          "tags": json.loads(row[4] or "[]"), "extra": json.loads(row[5] or "{}"),
        }
      reference = conn.execute(
        "SELECT is_deleted,deleted_at FROM server_cards WHERE id=? AND user_id=?",
        (card_id, user_id),
      ).fetchone()
      if not _json_equal(actual, expected) or not reference or reference[0] or reference[1] is not None:
        raise RuntimeError(f"Post-import content verification failed for {card_id}")
      answer_match = re.search(r">> CORRECT:\s*([A-D])\s*\|", str(actual["back"]))
      if not answer_match or answer_match.group(1) != record["correct"]:
        raise RuntimeError(f"Post-import answer-key verification failed for {card_id}")
      verified += 1
    conn.commit()
  except Exception:
    conn.rollback()
    conn.close()
    raise
  conn.close()
  return {
    "canonicalUserId": user_id,
    "identityKey": ["userId", "cardId"],
    "deckId": deck_id,
    "created": created,
    "updated": updated,
    "unchanged": unchanged,
    "verified": verified,
    "skippedExistingQuestions": len(skipped_existing),
    "skippedExisting": skipped_existing,
    "backup": str(backup_path) if backup_path else None,
  }


def path_from_cli_parts(parts: list[str]) -> Path:
  """Accept quoted, escaped, or plain paths split by the calling shell."""
  value = " ".join(parts).strip()
  if not value:
    raise RuntimeError("No chapter path was entered")
  try:
    parsed = shlex.split(value)
  except ValueError as exc:
    raise RuntimeError(f"Invalid chapter path: {exc}") from exc
  return Path(" ".join(parsed)).expanduser().resolve()


def print_inventory_summary(summary: dict) -> None:
  print("\nAnalyse abgeschlossen")
  print(f"  Zieldeck:              {summary['deckName']}")
  print(f"  JSON-Dateien:          {summary['jsonFiles']}")
  print(f"  Gültige Datensätze:    {summary['validRecords']}")
  print(f"  Einzigartige Fragen:   {summary['uniqueQuestions']}")
  print(f"  Entfernte Duplikate:   {summary['duplicateCopiesRemoved']}")
  print(f"  Duplikatgruppen:       {summary['duplicateQuestionGroups']}")
  print(f"  Inhaltliche Konflikte: {summary['conflictingQuestionGroups']}")
  print(f"  Ungültige Datensätze:  {summary['invalidRecords']}")
  print("  DB-Import vorbereitet: ja")


def interactive_action(summary: dict, feedback: dict, default_feedback_path: Path) -> bool:
  """Return True when the user selects publication."""
  while True:
    print("\nWas möchtest du jetzt tun?")
    print("  1) Nur Analyse anzeigen und beenden")
    print("  2) Vollständiges Feedback als JSON speichern")
    print(
      "  3) PUBLISH – die Unique-Fragen direkt in die PWA-Datenbank einspeisen "
      "(Lösungen unverändert, mit DB-Backup und Abschlussprüfung)"
    )
    try:
      choice = input("Auswahl [1-3]: ").strip().casefold()
    except EOFError as exc:
      raise RuntimeError("No menu selection received") from exc
    if choice in {"1", "a", "analyse", "cancel", "abbrechen"}:
      print("Analyse beendet. Die Datenbank wurde nicht verändert.")
      return False
    if choice in {"2", "f", "feedback"}:
      default_feedback_path.parent.mkdir(parents=True, exist_ok=True)
      default_feedback_path.write_text(
        json.dumps(feedback, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
      )
      print(f"Feedback gespeichert: {default_feedback_path}")
      continue
    if choice in {"3", "p", "publish", "publizieren"}:
      try:
        confirmation = input(
          "Wirklich in die PWA-Datenbank publizieren? "
          "Vor tatsächlichen DB-Änderungen erstellt der Importer ein Backup. [j/N]: "
        ).strip().casefold()
      except EOFError as exc:
        raise RuntimeError("No publication confirmation received") from exc
      if confirmation in {"j", "ja", "y", "yes"}:
        return True
      print("Publizieren abgebrochen. Die Datenbank wurde nicht verändert.")
      continue
    print("Ungültige Auswahl. Bitte 1, 2 oder 3 eingeben.")


def main() -> int:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument(
    "chapter_path",
    nargs="*",
    help="Optional full path; without it the script asks interactively",
  )
  parser.add_argument("--publish", action="store_true", help="Build reviewed decisions and publish through the gateway")
  parser.add_argument("--db", type=Path, default=DEFAULT_DB)
  parser.add_argument("--feedback-json", type=Path, help="Optional path for the complete inventory report")
  args = parser.parse_args()

  interactive = not args.chapter_path
  if interactive:
    print("NEW_INFO Chapter-Importer")
    print("Der Ordner wird zuerst vollständig eingelesen, geprüft und dedupliziert.")
    try:
      entered_path = input("Vollständigen Pfad zum Chapter-Ordner eingeben: ")
    except EOFError as exc:
      raise RuntimeError("No chapter path received") from exc
    chapter_dir = path_from_cli_parts([entered_path])
  else:
    chapter_dir = path_from_cli_parts(args.chapter_path)
  if not chapter_dir.is_dir():
    raise RuntimeError(f"Chapter directory does not exist: {chapter_dir}")
  metadata = chapter_metadata(chapter_dir)
  unique, feedback = load_and_deduplicate(chapter_dir)
  feedback.update(metadata)
  feedback["publishRequested"] = args.publish
  feedback["reviewBuilderAvailable"] = True
  if args.feedback_json:
    feedback_path = args.feedback_json.resolve()
    feedback_path.parent.mkdir(parents=True, exist_ok=True)
    feedback_path.write_text(
      json.dumps(feedback, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

  summary = {
    key: feedback[key]
    for key in (
      "chapterDirectory", "deckName", "jsonFiles", "validRecords", "uniqueQuestions",
      "duplicateCopiesRemoved", "duplicateQuestionGroups", "conflictingQuestionGroups",
      "invalidRecords", "publishRequested", "reviewBuilderAvailable",
    )
  }
  print(json.dumps({"inventory": summary}, ensure_ascii=False, indent=2))
  if interactive:
    print_inventory_summary(summary)
  if feedback["errors"] or feedback["conflicts"]:
    print(json.dumps({"details": feedback}, ensure_ascii=False, indent=2))
    raise RuntimeError("Invalid records or conflicting duplicate questions must be resolved before publication")
  if interactive and not args.publish:
    default_feedback_path = (
      SERVER_ROOT / "reviews"
      / f"domain{metadata['chapter']}-inventory-{date.today().isoformat()}.json"
    )
    args.publish = interactive_action(summary, feedback, default_feedback_path)
    feedback["publishRequested"] = args.publish
    summary["publishRequested"] = args.publish
  if not args.publish:
    return 0

  stamp = date.today().isoformat()
  review_dir = SERVER_ROOT / "reviews"
  report_path = chapter_dir / "IMPORT_PRUEFBERICHT.md"
  canonical_path = review_dir / f"domain{metadata['chapter']}-deduplicated-source-{stamp}.json"
  review_dir.mkdir(parents=True, exist_ok=True)
  canonical_path.write_text(json.dumps(unique, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
  publication = direct_publish(unique, metadata, args.db.resolve(), canonical_path)
  lines = [
    "# Import-Prüfbericht", "", f"Deck: `{metadata['deckName']}`", "",
    f"- JSON-Dateien: {feedback['jsonFiles']}",
    f"- Gültige Quelldatensätze: {feedback['validRecords']}",
    f"- Eindeutige Fragen: {feedback['uniqueQuestions']}",
    f"- Entfernte Duplikatkopien: {feedback['duplicateCopiesRemoved']}",
    f"- Neu erstellt: {publication['created']}",
    f"- Aktualisiert: {publication['updated']}",
    f"- Bereits identisch: {publication['unchanged']}",
    f"- Wegen bereits aktiver identischer Frage übersprungen: {publication['skippedExistingQuestions']}",
    f"- Nach Import exakt verifiziert: {publication['verified']}",
    "- Antwortoptionen und Lösungsschlüssel: unverändert aus der deduplizierten JSON-Quelle übernommen",
    "", "## Karten", "",
  ]
  skipped_by_question = {
    question_key(item["question"]): item for item in publication["skippedExisting"]
  }
  for index, raw in enumerate(unique, 1):
    parsed = validate_record(raw, canonical_path, index)
    skipped = skipped_by_question.get(question_key(parsed["question"]))
    status = (
      f" — **ÜBERSPRUNGEN**, bereits vorhanden als `{skipped['existingCardId']}`"
      if skipped else ""
    )
    lines.append(
      f"{index}. {parsed['question']} — **{parsed['correct']}: "
      f"{parsed['options'][parsed['correct']]}**{status}"
    )
  report_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
  result = {
    "inventory": summary,
    "published": publication["created"] + publication["updated"],
    **publication,
    "canonicalDeduplicatedSource": str(canonical_path),
    "report": str(report_path),
    "solutionsChanged": 0,
  }
  print(json.dumps(result, ensure_ascii=False, indent=2))
  return 0


if __name__ == "__main__":
  try:
    raise SystemExit(main())
  except (RuntimeError, ValueError) as exc:
    print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False, indent=2), file=sys.stderr)
    raise SystemExit(1)
