#!/usr/bin/env python3
"""Manage sync.db backups without cluttering the server root."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = Path(os.environ.get("SYNC_DB_PATH", str(ROOT / "sync.db")))
DEFAULT_BACKUP_DIR = Path(os.environ.get("SYNC_BACKUP_DIR", str(ROOT / "backups" / "db")))
LEGACY_PATTERNS = ("sync.db.bak_*", "sync.db.pre_*")


def timestamp() -> str:
  return datetime.now().strftime("%Y%m%d_%H%M%S")


def safe_label(value: str | None) -> str:
  if not value:
    return ""
  cleaned = re.sub(r"[^A-Za-z0-9_.-]+", "_", value.strip())
  return cleaned.strip("._-")


def unique_path(path: Path) -> Path:
  if not path.exists():
    return path

  stem = path.name
  for index in range(1, 1000):
    candidate = path.with_name(f"{stem}.{index}")
    if not candidate.exists():
      return candidate
  raise RuntimeError(f"could not find unique path for {path}")


def iter_backup_files(backup_dir: Path) -> list[Path]:
  if not backup_dir.exists():
    return []
  return sorted(
    [path for path in backup_dir.rglob("sync.db*") if path.is_file()],
    key=lambda path: path.stat().st_mtime,
    reverse=True,
  )


def write_manifest(backup_dir: Path) -> None:
  backup_dir.mkdir(parents=True, exist_ok=True)
  files = []
  for path in iter_backup_files(backup_dir):
    stat = path.stat()
    files.append({
      "path": str(path.relative_to(backup_dir)),
      "sizeBytes": stat.st_size,
      "modifiedAt": datetime.fromtimestamp(stat.st_mtime).isoformat(timespec="seconds"),
    })

  manifest = {
    "generatedAt": datetime.now().isoformat(timespec="seconds"),
    "backupDir": str(backup_dir),
    "count": len(files),
    "totalSizeBytes": sum(item["sizeBytes"] for item in files),
    "files": files,
  }
  (backup_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def create_backup(db_path: Path, backup_dir: Path, label: str | None) -> Path:
  if not db_path.exists():
    raise FileNotFoundError(f"database not found: {db_path}")

  backup_dir.mkdir(parents=True, exist_ok=True)
  suffix = f".{safe_label(label)}" if safe_label(label) else ""
  target = unique_path(backup_dir / f"sync.db.{timestamp()}{suffix}.sqlite")

  source = sqlite3.connect(str(db_path))
  try:
    destination = sqlite3.connect(str(target))
    try:
      source.backup(destination)
    finally:
      destination.close()
  finally:
    source.close()

  return target


def collect_legacy(root: Path, backup_dir: Path, dry_run: bool) -> list[tuple[Path, Path]]:
  legacy_dir = backup_dir / "legacy"
  moves: list[tuple[Path, Path]] = []

  for pattern in LEGACY_PATTERNS:
    for source in sorted(root.glob(pattern)):
      if not source.is_file():
        continue
      target = unique_path(legacy_dir / source.name)
      moves.append((source, target))

  if dry_run:
    return moves

  legacy_dir.mkdir(parents=True, exist_ok=True)
  for source, target in moves:
    shutil.move(str(source), str(target))
  return moves


def prune(backup_dir: Path, keep: int, dry_run: bool) -> list[Path]:
  if keep <= 0:
    raise ValueError("--keep must be greater than 0")

  files = iter_backup_files(backup_dir)
  remove = files[keep:]
  if not dry_run:
    for path in remove:
      path.unlink()
  return remove


def print_paths(paths: list[Path]) -> None:
  for path in paths:
    print(path)


def main() -> int:
  parser = argparse.ArgumentParser(description="Manage card sync SQLite backups")
  parser.add_argument("--db", default=str(DEFAULT_DB_PATH), help="SQLite DB path")
  parser.add_argument("--backup-dir", default=str(DEFAULT_BACKUP_DIR), help="Backup directory")

  sub = parser.add_subparsers(dest="command", required=True)

  backup_parser = sub.add_parser("backup", help="Create a consistent SQLite backup")
  backup_parser.add_argument("--label", default="", help="Optional filename label")
  backup_parser.add_argument("--keep", type=int, default=0, help="Optionally keep only the newest N backup files")

  collect_parser = sub.add_parser("collect-legacy", help="Move sync.db.bak_* and sync.db.pre_* files into backups/db/legacy")
  collect_parser.add_argument("--dry-run", action="store_true", help="Only print moves")

  prune_parser = sub.add_parser("prune", help="Delete old backup files")
  prune_parser.add_argument("--keep", type=int, required=True, help="Keep newest N files")
  prune_parser.add_argument("--yes", action="store_true", help="Actually delete files")

  sub.add_parser("list", help="List known backup files and refresh manifest")

  args = parser.parse_args()
  db_path = Path(args.db).resolve()
  backup_dir = Path(args.backup_dir).resolve()

  if args.command == "backup":
    created = create_backup(db_path, backup_dir, args.label)
    print(f"created {created}")
    if args.keep:
      removed = prune(backup_dir, args.keep, dry_run=False)
      if removed:
        print("removed:")
        print_paths(removed)
    write_manifest(backup_dir)
    return 0

  if args.command == "collect-legacy":
    moves = collect_legacy(ROOT, backup_dir, dry_run=args.dry_run)
    for source, target in moves:
      print(f"{source} -> {target}")
    if not args.dry_run:
      write_manifest(backup_dir)
    return 0

  if args.command == "prune":
    removed = prune(backup_dir, args.keep, dry_run=not args.yes)
    if not args.yes:
      print("dry-run; pass --yes to delete")
    print_paths(removed)
    if args.yes:
      write_manifest(backup_dir)
    return 0

  if args.command == "list":
    write_manifest(backup_dir)
    print_paths(iter_backup_files(backup_dir))
    return 0

  return 2


if __name__ == "__main__":
  raise SystemExit(main())
