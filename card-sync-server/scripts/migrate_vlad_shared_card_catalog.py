#!/usr/bin/env python3
"""Move Vlad's cards into one canonical catalog and preserve user study state."""
from __future__ import annotations

import argparse
import json
import shutil
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path


SERVER_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = SERVER_ROOT.parent
DEFAULT_DB = SERVER_ROOT / "sync.db"
DEFAULT_REPORT = SERVER_ROOT / "reviews" / "vlad-shared-card-catalog-migration.json"
BACKUP_DIR = SERVER_ROOT / "backups" / "shared-card-catalog"

if str(SERVER_ROOT) not in sys.path:
  sys.path.insert(0, str(SERVER_ROOT))

from server import config as server_config  # noqa: E402
from server.db.connection import open_db  # noqa: E402
from server.db.schema import init_db  # noqa: E402
from server.domain.card_catalog import (  # noqa: E402
  CANONICAL_PROFILE_NAME,
  canonical_owner_id,
  ensure_user_card_references,
  normalize_reference_rows,
  upsert_catalog_content,
)


def utc_iso() -> str:
  return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def backup_database(db_path: Path) -> Path:
  BACKUP_DIR.mkdir(parents=True, exist_ok=True)
  stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
  target = BACKUP_DIR / f"sync.db.before-shared-card-catalog-{stamp}.sqlite"
  source = sqlite3.connect(str(db_path))
  destination = sqlite3.connect(str(target))
  try:
    source.backup(destination)
  finally:
    destination.close()
    source.close()
  return target


def decode_json(value, fallback):
  try:
    parsed = json.loads(value) if isinstance(value, str) else value
  except Exception:
    return fallback
  return parsed if parsed is not None else fallback


def migrate(conn: sqlite3.Connection, backup_path: Path) -> dict:
  owner_id = canonical_owner_id(conn)
  if not owner_id:
    raise RuntimeError(f"Expected exactly one profile named {CANONICAL_PROFILE_NAME!r}")

  owner_rows = conn.execute(
    """SELECT id, note_id, deck_id, front, back, tags_json, extra_json,
              created_at, updated_at, deleted_at, last_source_client,
              IFNULL(is_deleted, 0) AS is_deleted
       FROM server_cards WHERE user_id=? ORDER BY id""",
    (owner_id,),
  ).fetchall()
  active_owner_ids = {
    str(row["id"])
    for row in owner_rows
    if row["deleted_at"] is None and not row["is_deleted"]
  }
  if not active_owner_ids:
    raise RuntimeError("Vlad has no active cards to make canonical")

  catalog_before = int(conn.execute("SELECT COUNT(*) FROM shared_card_catalog").fetchone()[0])
  source_rows = [
    row for row in owner_rows
    if row["front"] is not None and row["back"] is not None
  ]
  if catalog_before == 0 and len(source_rows) != len(owner_rows):
    raise RuntimeError("Initial migration requires intact Vlad authoring content on every card")

  duplicate_stats = conn.execute(
    """SELECT COUNT(*) AS rows,
              COUNT(DISTINCT id) AS ids,
              SUM(CASE WHEN front IS NOT NULL OR back IS NOT NULL THEN 1 ELSE 0 END) AS authoring_rows
       FROM server_cards"""
  ).fetchone()

  seeded = 0
  refs_added = 0
  try:
    conn.execute("BEGIN IMMEDIATE")
    for row in source_rows:
      upsert_catalog_content(
        conn,
        card_id=str(row["id"]),
        canonical_user_id=owner_id,
        content={
          "noteId": row["note_id"],
          "deckId": row["deck_id"],
          "front": row["front"],
          "back": row["back"],
          "tags": decode_json(row["tags_json"], []),
          "extra": decode_json(row["extra_json"], {}),
        },
        created_at=int(row["created_at"] or row["updated_at"] or 0),
        updated_at=int(row["updated_at"] or row["created_at"] or 0),
        deleted_at=row["deleted_at"] if row["is_deleted"] else row["deleted_at"],
        source_client=row["last_source_client"] or "vlad-shared-card-catalog-migration",
      )
      seeded += 1

    catalog_active_ids = {
      str(row[0])
      for row in conn.execute(
        "SELECT id FROM shared_card_catalog WHERE deleted_at IS NULL"
      ).fetchall()
    }
    if catalog_active_ids != active_owner_ids:
      missing = sorted(active_owner_ids - catalog_active_ids)
      extra = sorted(catalog_active_ids - active_owner_ids)
      raise RuntimeError(
        f"Catalog/Vlad active ID mismatch: missing={missing[:10]} extra={extra[:10]}"
      )

    users = [str(row[0]) for row in conn.execute("SELECT user_id FROM users").fetchall()]
    for user_id in users:
      refs_added += ensure_user_card_references(conn, user_id)
    normalization = normalize_reference_rows(conn)

    remaining_authoring = int(conn.execute(
      """SELECT COUNT(*) FROM server_cards
         WHERE note_id IS NOT NULL OR front IS NOT NULL OR back IS NOT NULL
            OR tags_json IS NOT NULL OR extra_json IS NOT NULL"""
    ).fetchone()[0])
    if remaining_authoring != 0:
      raise RuntimeError(f"Legacy authoring content remains in {remaining_authoring} reference rows")

    reference_counts = {
      str(row[0]): int(row[1])
      for row in conn.execute(
        """SELECT user_id, COUNT(*) FROM server_cards r
           JOIN shared_card_catalog c ON c.id=r.id AND c.deleted_at IS NULL
           WHERE r.deleted_at IS NULL AND IFNULL(r.is_deleted, 0)=0
           GROUP BY user_id ORDER BY user_id"""
      ).fetchall()
    }
    conn.commit()
  except Exception:
    conn.rollback()
    raise

  return {
    "ok": True,
    "schemaVersion": "vlad-shared-card-catalog-migration-1",
    "migratedAt": utc_iso(),
    "canonicalProfile": CANONICAL_PROFILE_NAME,
    "canonicalUserId": owner_id,
    "backup": str(backup_path),
    "before": {
      "serverCardRows": int(duplicate_stats["rows"] or 0),
      "distinctCardIds": int(duplicate_stats["ids"] or 0),
      "rowsContainingAuthoringContent": int(duplicate_stats["authoring_rows"] or 0),
      "catalogRows": catalog_before,
    },
    "after": {
      "canonicalCatalogRows": int(conn.execute("SELECT COUNT(*) FROM shared_card_catalog").fetchone()[0]),
      "activeCanonicalCards": int(conn.execute(
        "SELECT COUNT(*) FROM shared_card_catalog WHERE deleted_at IS NULL"
      ).fetchone()[0]),
      "referenceRowsContainingAuthoringContent": 0,
      "referenceCountsByUserId": reference_counts,
    },
    "operations": {
      "catalogRowsSeededOrRefreshed": seeded,
      "defaultReferencesAdded": refs_added,
      **normalization,
    },
    "policy": {
      "contentAuthority": CANONICAL_PROFILE_NAME,
      "oneContentRowPerCardId": True,
      "userRowsContainOnlyReferenceAndStudyState": True,
      "unknownUserCardIdsDisabled": True,
    },
  }


def main() -> int:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument("--db", type=Path, default=DEFAULT_DB)
  parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
  args = parser.parse_args()

  db_path = args.db.resolve()
  backup_path = backup_database(db_path)
  server_config.DB_PATH = str(db_path)
  init_db()
  conn = open_db(sqlite3.Row)
  try:
    result = migrate(conn, backup_path)
  finally:
    conn.close()

  report_path = args.report.resolve()
  report_path.parent.mkdir(parents=True, exist_ok=True)
  report_path.write_text(
    json.dumps(result, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
  )
  print(json.dumps({**result, "report": str(report_path)}, ensure_ascii=False, indent=2))
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
