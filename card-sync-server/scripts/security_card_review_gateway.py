#!/usr/bin/env python3
"""Review and publish Vlad's card content without exposing unreviewed edits.

The HTTP sync boundary stores authoring changes in content_review_queue.  This
tool is the only supported publisher: it validates evidence, writes an exact
content-hash review record, preserves study state, emits an authoritative sync
operation, and keeps a recoverable database backup.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import sqlite3
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse


SERVER_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = SERVER_ROOT.parent
DEFAULT_DB = SERVER_ROOT / "sync.db"
DEFAULT_REGISTRY = SERVER_ROOT / "reviews" / "vlad-card-review-registry.json"
BACKUP_DIR = SERVER_ROOT / "backups" / "content-review-gateway"

if str(SERVER_ROOT) not in sys.path:
  sys.path.insert(0, str(SERVER_ROOT))

from server import config as server_config  # noqa: E402
from server.content_review import (  # noqa: E402
  AUTHORING_FIELDS,
  GATEWAY_SOURCE,
  GATEWAY_SOURCE_CLIENT,
  canonical_content,
  content_hash,
)
from server.db.connection import open_db  # noqa: E402
from server.db.schema import init_db  # noqa: E402
from server.domain.card_catalog import catalog_enabled  # noqa: E402
from server.sync.operations import apply_operation  # noqa: E402
from server.common.helpers import now_ms  # noqa: E402


SCHEMA_VERSION = "security-card-content-review-1"
ALLOWED_VERDICTS = {"approved", "corrected", "not_relevant"}
PUBLICATION_SEMANTIC_CHECKS = (
  "stemUnambiguous",
  "frontBackConsistent",
  "sourceConflictChecked",
)
OFFICIAL_HOSTS = (
  "comptia.org",
  "optimizely.com",  # Official CompTIA objective PDF CDN.
  "nist.gov",
  "doi.org",
  "cisa.gov",
  "rfc-editor.org",
  "ietf.org",
  "owasp.org",
  "cisecurity.org",
  "iso.org",
  "europa.eu",
  "mitre.org",
  "iana.org",
  "lockheedmartin.com",
)
CORRECT_RE = re.compile(r"(?:>>\s*)?(?:CORRECT|RICHTIG)\s*:\s*([A-Z])", re.I)
OPTION_RE = re.compile(r"^\s*([A-Z])\s*[:.)|]\s*(.+?)\s*$")


def utc_iso() -> str:
  return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path):
  return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def decode_json(value, fallback):
  try:
    parsed = json.loads(value) if isinstance(value, str) else value
    return parsed if parsed is not None else fallback
  except Exception:
    return fallback


def profile_id(conn: sqlite3.Connection, name: str = "Vlad") -> str:
  rows = conn.execute(
    "SELECT user_id FROM users WHERE LOWER(TRIM(COALESCE(profile_name, '')))=LOWER(?)",
    (name.strip(),),
  ).fetchall()
  if len(rows) != 1:
    raise RuntimeError(f"Expected exactly one profile named {name!r}, found {len(rows)}")
  return rows[0][0]


def row_content(row: sqlite3.Row) -> dict:
  return canonical_content({
    "noteId": row["note_id"],
    "deckId": row["deck_id"],
    "front": row["front"],
    "back": row["back"],
    "tags": decode_json(row["tags_json"], []),
    "extra": decode_json(row["extra_json"], {}),
  })


def active_cards(conn: sqlite3.Connection, user_id: str) -> list[dict]:
  if catalog_enabled(conn):
    rows = conn.execute(
      """SELECT c.id, c.note_id, c.deck_id, c.front, c.back, c.tags_json,
                c.extra_json, r.metadata_json, d.name AS deck_name
         FROM shared_card_catalog c
         JOIN server_cards r ON r.user_id=? AND r.id=c.id
         LEFT JOIN server_decks d ON d.user_id=c.canonical_user_id AND d.id=c.deck_id
         WHERE c.deleted_at IS NULL
           AND r.deleted_at IS NULL AND IFNULL(r.is_deleted, 0)=0
         ORDER BY c.id""",
      (user_id,),
    ).fetchall()
  else:
    rows = conn.execute(
      """SELECT c.id, c.note_id, c.deck_id, c.front, c.back, c.tags_json,
                c.extra_json, c.metadata_json, d.name AS deck_name
         FROM server_cards c
         LEFT JOIN server_decks d ON d.user_id=c.user_id AND d.id=c.deck_id
         WHERE c.user_id=? AND c.deleted_at IS NULL AND IFNULL(c.is_deleted, 0)=0
         ORDER BY c.id""",
      (user_id,),
    ).fetchall()
  return [
    {
      "cardId": str(row["id"]),
      "deckName": row["deck_name"] or "",
      "content": row_content(row),
      "contentHash": content_hash(row_content(row)),
    }
    for row in rows
  ]


def source_url(source) -> str:
  if isinstance(source, str):
    return source.strip()
  if isinstance(source, dict):
    return str(source.get("url") or "").strip()
  return ""


def is_official_url(url: str) -> bool:
  try:
    host = (urlparse(url).hostname or "").casefold()
  except Exception:
    return False
  return any(host == suffix or host.endswith(f".{suffix}") for suffix in OFFICIAL_HOSTS)


def parse_options(front: str) -> dict[str, str]:
  options = {}
  for line in (front or "").splitlines():
    match = OPTION_RE.match(line)
    if match:
      options[match.group(1).upper()] = match.group(2).strip()
  return options


def keyed_answer(content: dict) -> dict | None:
  match = CORRECT_RE.search(str(content.get("back") or ""))
  if not match:
    return None
  letter = match.group(1).upper()
  options = parse_options(str(content.get("front") or ""))
  return {"letter": letter, "text": options.get(letter)}


def validate_publication_assessment(review: dict, card: dict | None) -> list[str]:
  """Require auditable semantic work for every newly published decision.

  A URL and a plausible evidence paragraph are not proof that the source
  entails the selected answer. Publication decisions therefore bind each
  source to an exact locator and supported claim, explicitly adjudicate every
  option/item, and record checks that catch stale mixed revisions.
  """
  errors = []
  card_id = str(review.get("cardId") or "")
  prefix = f"card {card_id or '?'}"

  sources = review.get("sources") if isinstance(review.get("sources"), list) else []
  for index, source in enumerate(sources, start=1):
    if not isinstance(source, dict):
      continue
    if len(str(source.get("locator") or "").strip()) < 3:
      errors.append(f"{prefix}: source {index} requires an exact locator")
    if len(str(source.get("supports") or "").strip()) < 20:
      errors.append(f"{prefix}: source {index} requires the exact supported claim")

  semantic_checks = review.get("semanticChecks")
  if not isinstance(semantic_checks, dict):
    errors.append(f"{prefix}: semanticChecks missing")
  else:
    for name in PUBLICATION_SEMANTIC_CHECKS:
      if semantic_checks.get(name) is not True:
        errors.append(f"{prefix}: semanticChecks.{name} must be true")

  if not isinstance(review.get("sourceConflicts"), list):
    errors.append(f"{prefix}: sourceConflicts must be an explicit list (empty when none)")

  cross_card = review.get("crossCardCheck")
  if not isinstance(cross_card, dict) or cross_card.get("performed") is not True:
    errors.append(f"{prefix}: crossCardCheck.performed must be true")
  elif len(str(cross_card.get("result") or "").strip()) < 20:
    errors.append(f"{prefix}: crossCardCheck.result is missing or too short")

  revision = review.get("revisionConsistency")
  if not isinstance(revision, dict):
    errors.append(f"{prefix}: revisionConsistency missing")
  else:
    if revision.get("frontBackSameRevision") is not True:
      errors.append(f"{prefix}: front/back must be confirmed as one coherent revision")
    if revision.get("historyChecked") is not True:
      errors.append(f"{prefix}: revision history must be checked before publication")

  if not card:
    return errors
  content = card.get("content") if isinstance(card, dict) else None
  if not isinstance(content, dict):
    return errors
  actual_answer = keyed_answer(content)
  if actual_answer:
    if not isinstance(semantic_checks, dict) or semantic_checks.get("answerEntailedBySources") is not True:
      errors.append(f"{prefix}: semanticChecks.answerEntailedBySources must be true")
    options = parse_options(str(content.get("front") or ""))
    assessments = review.get("optionAssessments")
    if not isinstance(assessments, dict):
      errors.append(f"{prefix}: optionAssessments missing for multiple-choice card")
    else:
      missing = sorted(set(options) - set(assessments))
      extra = sorted(set(assessments) - set(options))
      if missing:
        errors.append(f"{prefix}: optionAssessments missing {', '.join(missing)}")
      if extra:
        errors.append(f"{prefix}: optionAssessments has unknown option(s) {', '.join(extra)}")
      for letter, option_text in options.items():
        assessment = assessments.get(letter)
        expected = "correct" if letter == actual_answer["letter"] else "incorrect"
        if not isinstance(assessment, dict):
          continue
        if assessment.get("verdict") != expected:
          errors.append(
            f"{prefix}: option {letter} ({option_text}) must be adjudicated as {expected}"
          )
        if len(str(assessment.get("reason") or "").strip()) < 20:
          errors.append(f"{prefix}: option {letter} assessment reason is missing or too short")
  else:
    if not isinstance(semantic_checks, dict) or semantic_checks.get("allPairsOrStepsVerified") is not True:
      errors.append(f"{prefix}: semanticChecks.allPairsOrStepsVerified must be true")
    items = review.get("itemAssessments")
    if not isinstance(items, list) or not items:
      errors.append(f"{prefix}: itemAssessments missing for matching/ordering card")
    else:
      for index, item in enumerate(items, start=1):
        if not isinstance(item, dict):
          errors.append(f"{prefix}: itemAssessment {index} must be structured")
          continue
        if not str(item.get("item") or "").strip():
          errors.append(f"{prefix}: itemAssessment {index} item missing")
        if len(str(item.get("reason") or "").strip()) < 20:
          errors.append(f"{prefix}: itemAssessment {index} reason is missing or too short")
  return errors


def validate_review(
  review: dict,
  card: dict | None = None,
  *,
  publication: bool = False,
) -> list[str]:
  errors = []
  card_id = str(review.get("cardId") or "")
  prefix = f"card {card_id or '?'}"
  if not card_id:
    errors.append("review without cardId")
  if review.get("verdict") not in ALLOWED_VERDICTS:
    errors.append(f"{prefix}: invalid verdict")
  if not str(review.get("cardType") or "").strip():
    errors.append(f"{prefix}: cardType missing")
  if not isinstance(review.get("requirements"), list) or not review.get("requirements"):
    errors.append(f"{prefix}: at least one requirement or objective mapping is required")
  evidence = str(review.get("evidence") or "").strip()
  if len(evidence) < 40:
    errors.append(f"{prefix}: evidence is missing or too short")
  reviewer = str(review.get("reviewer") or "").strip()
  if not reviewer:
    errors.append(f"{prefix}: reviewer missing")
  if reviewer in {"card-qa-audit-v1", "systematic-primary-source-review-2026-08-08"}:
    errors.append(f"{prefix}: legacy self-approval reviewer is forbidden")
  if not str(review.get("reviewedAt") or "").strip():
    errors.append(f"{prefix}: reviewedAt missing")
  if not isinstance(review.get("reviewBasis"), list) or not review.get("reviewBasis"):
    errors.append(f"{prefix}: reviewBasis missing")

  sources = review.get("sources")
  structured_sources = sources if isinstance(sources, list) else []
  urls = [source_url(source) for source in structured_sources]
  official = [url for url in urls if is_official_url(url)]
  minimum_sources = 1 if review.get("verdict") == "not_relevant" else 2
  if len(set(official)) < minimum_sources:
    errors.append(f"{prefix}: requires at least {minimum_sources} distinct official source URL(s)")
  if any(url and not is_official_url(url) for url in urls):
    errors.append(f"{prefix}: non-official URL present in sources")
  if any(not isinstance(source, dict) for source in structured_sources):
    errors.append(f"{prefix}: sources must be structured with title, URL, and evidence roles")
  roles = {
    role
    for source in structured_sources
    if isinstance(source, dict)
    for role in (source.get("roles") or [])
    if isinstance(role, str)
  }
  if "scope" not in roles:
    errors.append(f"{prefix}: official scope source role missing")
  if review.get("verdict") != "not_relevant" and "fact" not in roles:
    errors.append(f"{prefix}: official fact source role missing")
  for source in structured_sources:
    if not isinstance(source, dict):
      continue
    if not str(source.get("title") or "").strip():
      errors.append(f"{prefix}: source title missing")
    if not isinstance(source.get("roles"), list) or not source.get("roles"):
      errors.append(f"{prefix}: source roles missing")

  if card:
    actual_hash = card["contentHash"]
    if review.get("contentHash") != actual_hash:
      errors.append(f"{prefix}: stale contentHash")
    actual_answer = keyed_answer(card["content"])
    declared_answer = review.get("correctAnswer")
    if actual_answer:
      if declared_answer != actual_answer:
        errors.append(f"{prefix}: correctAnswer does not match exact front/back")
      if not actual_answer.get("text"):
        errors.append(f"{prefix}: keyed answer letter is absent from options")
      elif actual_answer["text"].casefold() not in evidence.casefold():
        errors.append(f"{prefix}: evidence does not identify the exact keyed answer text")
    elif declared_answer not in (None, {}):
      errors.append(f"{prefix}: declares a keyed answer for a non-MC card")
  if publication:
    errors.extend(validate_publication_assessment(review, card))
  return errors


def load_registry(path: Path) -> dict:
  if not path.exists():
    return {"schemaVersion": SCHEMA_VERSION, "profile": "Vlad", "reviews": []}
  data = read_json(path)
  if not isinstance(data, dict) or not isinstance(data.get("reviews"), list):
    raise RuntimeError(f"Invalid review registry: {path}")
  return data


def check(conn: sqlite3.Connection, registry_path: Path, *, allow_pending: bool = False) -> dict:
  user_id = profile_id(conn)
  cards = active_cards(conn, user_id)
  cards_by_id = {card["cardId"]: card for card in cards}
  registry = load_registry(registry_path)
  reviews = registry.get("reviews", [])
  reviews_by_id: dict[str, dict] = {}
  duplicates = []
  for review in reviews:
    card_id = str(review.get("cardId") or "")
    if card_id in reviews_by_id:
      duplicates.append(card_id)
    else:
      reviews_by_id[card_id] = review

  errors = []
  for card_id in sorted(set(duplicates)):
    errors.append(f"card {card_id}: duplicate current review records")
  missing = sorted(set(cards_by_id) - set(reviews_by_id))
  extra = sorted(set(reviews_by_id) - set(cards_by_id))
  errors.extend(f"card {card_id}: missing current review" for card_id in missing)
  errors.extend(f"card {card_id}: registry entry is not an active card" for card_id in extra)
  for card_id in sorted(set(cards_by_id) & set(reviews_by_id)):
    errors.extend(validate_review(reviews_by_id[card_id], cards_by_id[card_id]))

  pending_rows = conn.execute(
    """SELECT id, card_id, content_hash, created_at
       FROM content_review_queue WHERE user_id=? AND status='pending' ORDER BY id""",
    (user_id,),
  ).fetchall()
  if pending_rows and not allow_pending:
    errors.append(f"{len(pending_rows)} content proposal(s) still require review")

  verdict_counts = {verdict: 0 for verdict in sorted(ALLOWED_VERDICTS)}
  for review in reviews_by_id.values():
    verdict = review.get("verdict")
    if verdict in verdict_counts:
      verdict_counts[verdict] += 1
  result = {
    "ok": not errors,
    "assurance": "exact-hash and structural review coverage",
    "semanticPublicationGate": "strict evidence locators and per-option/item adjudication are required for every new publish/register decision",
    "profile": "Vlad",
    "activeCards": len(cards),
    "currentReviews": len(set(cards_by_id) & set(reviews_by_id)),
    "missingReviews": len(missing),
    "duplicateReviews": len(set(duplicates)),
    "staleOrInvalidReviews": len(errors) - len(missing) - len(extra) - len(set(duplicates)) - (1 if pending_rows and not allow_pending else 0),
    "pendingProposals": len(pending_rows),
    "verdicts": verdict_counts,
    "errors": errors,
  }
  return result


def queue_report(conn: sqlite3.Connection) -> dict:
  user_id = profile_id(conn)
  rows = conn.execute(
    """SELECT id, card_id, op_id, operation_type, content_hash, proposal_json,
              status, created_at, reviewed_at, decision_json
       FROM content_review_queue WHERE user_id=? ORDER BY id""",
    (user_id,),
  ).fetchall()
  proposals = []
  for row in rows:
    proposals.append({
      "queueId": row["id"],
      "cardId": row["card_id"],
      "opId": row["op_id"],
      "operationType": row["operation_type"],
      "contentHash": row["content_hash"],
      "proposal": decode_json(row["proposal_json"], {}),
      "status": row["status"],
      "createdAt": row["created_at"],
      "reviewedAt": row["reviewed_at"],
      "decision": decode_json(row["decision_json"], None),
    })
  return {"profile": "Vlad", "proposals": proposals}


def backup_database(db_path: Path) -> Path:
  BACKUP_DIR.mkdir(parents=True, exist_ok=True)
  stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
  target = BACKUP_DIR / f"sync.db.before-content-review-{stamp}.sqlite"
  source = sqlite3.connect(str(db_path))
  destination = sqlite3.connect(str(target))
  try:
    source.backup(destination)
  finally:
    destination.close()
    source.close()
  return target


def decision_content(decision: dict) -> dict:
  content = decision.get("content")
  if not isinstance(content, dict):
    raise RuntimeError(f"card {decision.get('cardId')}: publish decision lacks content")
  missing = [field for field in AUTHORING_FIELDS if field not in content]
  if missing:
    raise RuntimeError(f"card {decision.get('cardId')}: content missing {', '.join(missing)}")
  return canonical_content(content)


def publish(
  conn: sqlite3.Connection,
  db_path: Path,
  registry_path: Path,
  decisions_path: Path,
) -> dict:
  raw = read_json(decisions_path)
  decisions = raw.get("decisions") if isinstance(raw, dict) else raw
  if not isinstance(decisions, list) or not decisions:
    raise RuntimeError("Decision file must contain a non-empty decisions list")

  user_id = profile_id(conn)
  current_cards = {card["cardId"]: card for card in active_cards(conn, user_id)}
  seen = set()
  prepared = []
  errors = []
  for decision in decisions:
    card_id = str(decision.get("cardId") or "").strip()
    if not card_id or card_id in seen:
      errors.append(f"invalid or duplicate decision cardId {card_id!r}")
      continue
    seen.add(card_id)
    content = decision_content(decision)
    review = {
      **{key: value for key, value in decision.items() if key != "content"},
      "cardId": card_id,
      "contentHash": content_hash(content),
      "correctAnswer": keyed_answer(content),
    }
    prospective = {"content": content, "contentHash": review["contentHash"]}
    errors.extend(validate_review(review, prospective, publication=True))
    prepared.append((decision, review, content, current_cards.get(card_id)))
  if errors:
    raise RuntimeError("Decision validation failed:\n- " + "\n- ".join(errors))

  backup_path = backup_database(db_path)
  registry = load_registry(registry_path)
  reviews_by_id = {str(item.get("cardId")): item for item in registry.get("reviews", [])}
  published = []
  timestamp = now_ms()
  try:
    conn.execute("BEGIN IMMEDIATE")
    for offset, (decision, review, content, current) in enumerate(prepared):
      card_id = review["cardId"]
      if not current:
        raise RuntimeError(f"card {card_id}: new cards require an explicit reviewed create workflow")
      operation_ts = timestamp + offset
      payload = {
        "cardId": card_id,
        "updates": {**content, "updatedAt": operation_ts},
        "timestamp": operation_ts,
      }
      op_id = f"{GATEWAY_SOURCE_CLIENT}:card.update:{card_id}:{review['contentHash'][:16]}"
      existing_op = conn.execute(
        "SELECT source, source_client, user_id FROM sync_operations WHERE op_id=?",
        (op_id,),
      ).fetchone()
      if existing_op:
        if (
          existing_op["source"] != GATEWAY_SOURCE
          or existing_op["source_client"] != GATEWAY_SOURCE_CLIENT
          or existing_op["user_id"] != user_id
        ):
          raise RuntimeError(f"card {card_id}: operation ID collision")
      else:
        conn.execute(
          """INSERT INTO sync_operations
             (op_id, op_type, payload_json, client_timestamp, source,
              source_client, created_at, user_id)
             VALUES (?, 'card.update', ?, ?, ?, ?, ?, ?)""",
          (
            op_id,
            json.dumps(payload, ensure_ascii=False),
            operation_ts,
            GATEWAY_SOURCE,
            GATEWAY_SOURCE_CLIENT,
            int(time.time()),
            user_id,
          ),
        )
        apply_operation(
          conn,
          "card.update",
          payload,
          operation_ts,
          GATEWAY_SOURCE_CLIENT,
          op_id=op_id,
          user_id=user_id,
        )
      queue_id = decision.get("queueId")
      if queue_id is not None:
        updated = conn.execute(
          """UPDATE content_review_queue
             SET status='approved', reviewed_at=?, decision_json=?
             WHERE id=? AND user_id=? AND status='pending'""",
          (int(time.time()), json.dumps(review, ensure_ascii=False), int(queue_id), user_id),
        ).rowcount
        if updated != 1:
          raise RuntimeError(f"card {card_id}: pending queueId {queue_id} not found")
      reviews_by_id[card_id] = review
      published.append(card_id)
    conn.commit()
  except Exception:
    conn.rollback()
    raise

  registry = {
    "schemaVersion": SCHEMA_VERSION,
    "profile": "Vlad",
    "generatedAt": utc_iso(),
    "reviews": [reviews_by_id[card_id] for card_id in sorted(reviews_by_id)],
  }
  write_json(registry_path, registry)
  return {
    "ok": True,
    "published": len(published),
    "cardIds": published,
    "backup": str(backup_path),
    "registry": str(registry_path),
  }


def register(conn: sqlite3.Connection, registry_path: Path, decisions_path: Path) -> dict:
  """Create the initial exact registry from completed, explicit review decisions."""
  raw = read_json(decisions_path)
  decisions = raw.get("decisions") if isinstance(raw, dict) else raw
  if not isinstance(decisions, list):
    raise RuntimeError("Decision file must contain a decisions list")
  user_id = profile_id(conn)
  cards = {card["cardId"]: card for card in active_cards(conn, user_id)}
  reviews = []
  errors = []
  seen = set()
  for decision in decisions:
    card_id = str(decision.get("cardId") or "")
    if card_id in seen:
      errors.append(f"card {card_id}: duplicate decision")
      continue
    seen.add(card_id)
    card = cards.get(card_id)
    if not card:
      errors.append(f"card {card_id}: not active")
      continue
    review = {
      **{key: value for key, value in decision.items() if key != "content"},
      "contentHash": card["contentHash"],
      "correctAnswer": keyed_answer(card["content"]),
    }
    errors.extend(validate_review(review, card, publication=True))
    reviews.append(review)
  missing = sorted(set(cards) - seen)
  errors.extend(f"card {card_id}: missing registration decision" for card_id in missing)
  if errors:
    raise RuntimeError("Registration validation failed:\n- " + "\n- ".join(errors))
  registry = {
    "schemaVersion": SCHEMA_VERSION,
    "profile": "Vlad",
    "generatedAt": utc_iso(),
    "reviews": sorted(reviews, key=lambda item: item["cardId"]),
  }
  write_json(registry_path, registry)
  return {"ok": True, "registered": len(reviews), "registry": str(registry_path)}


def main() -> int:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument("--db", type=Path, default=DEFAULT_DB)
  parser.add_argument("--registry", type=Path, default=DEFAULT_REGISTRY)
  sub = parser.add_subparsers(dest="command", required=True)
  check_parser = sub.add_parser("check", help="Require exact review coverage for every active Vlad card")
  check_parser.add_argument("--allow-pending", action="store_true")
  sub.add_parser("queue", help="Print every content review proposal and decision")
  publish_parser = sub.add_parser("publish", help="Publish explicit reviewed decisions")
  publish_parser.add_argument("decisions", type=Path)
  register_parser = sub.add_parser("register", help="Initialize registry from completed review decisions")
  register_parser.add_argument("decisions", type=Path)
  args = parser.parse_args()

  server_config.DB_PATH = str(args.db.resolve())
  init_db()
  conn = open_db(sqlite3.Row)
  try:
    if args.command == "check":
      result = check(conn, args.registry.resolve(), allow_pending=args.allow_pending)
    elif args.command == "queue":
      result = queue_report(conn)
    elif args.command == "publish":
      result = publish(conn, args.db.resolve(), args.registry.resolve(), args.decisions.resolve())
    else:
      result = register(conn, args.registry.resolve(), args.decisions.resolve())
  finally:
    conn.close()
  print(json.dumps(result, ensure_ascii=False, indent=2))
  return 0 if result.get("ok", True) else 1


if __name__ == "__main__":
  raise SystemExit(main())
