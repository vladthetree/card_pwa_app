from __future__ import annotations

import importlib.util
import json
import re
import shutil
import sqlite3
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "card-sync-server" / "scripts" / "import_chapter_jsons.py"
SPEC = importlib.util.spec_from_file_location("chapter_importer", SCRIPT)
assert SPEC and SPEC.loader
importer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(importer)


def question(
  text: str = "Which control is correct?",
  correct: str = "B",
  explanation: str = "B is correct because the supplied source says so.",
  seconds: int = 12,
) -> dict:
  return {
    "id": "source-1",
    "question": text,
    "answers": [
      {"text": "A: Alpha", "correct": correct == "A"},
      {"text": "B: Bravo", "correct": correct == "B"},
      {"text": "C: Charlie", "correct": correct == "C"},
      {"text": "D: Delta", "correct": correct == "D"},
    ],
    "correct": f"{correct}: " + {"A": "Alpha", "B": "Bravo", "C": "Charlie", "D": "Delta"}[correct],
    "explanation": explanation,
    "responseSeconds": seconds,
  }


def metadata(chapter: int = 99) -> dict:
  return {
    "chapter": chapter,
    "domain": f"{chapter}.0",
    "title": "Test & Security Architecture",
    "deckName": f"Chapter {chapter}: Domain {chapter}.0: Test & Security Architecture",
  }


def test_find_repo_root_works_for_both_script_locations():
  assert importer.find_repo_root(SCRIPT) == ROOT
  assert importer.find_repo_root(ROOT / "NEW_INFO" / "import_chapter_jsons.py") == ROOT


@pytest.mark.parametrize(
  "parts",
  [
    ["/tmp/Chapter 3: Domain 3.0: Security Architecture"],
    ["/tmp/Chapter", "3:", "Domain", "3.0:", "Security", "Architecture"],
    ["'/tmp/Chapter 3: Domain 3.0: Security Architecture'"],
  ],
)
def test_path_accepts_plain_split_and_quoted_input(parts):
  assert str(importer.path_from_cli_parts(parts)).endswith("Chapter 3: Domain 3.0: Security Architecture")


def test_chapter_metadata_and_stable_ids():
  path = Path("Chapter 3: Domain 3.0: Security Architecture")
  value = importer.chapter_metadata(path)
  assert value == {
    "chapter": 3,
    "domain": "3.0",
    "title": "Security Architecture",
    "deckName": path.name,
  }
  assert importer.deck_id_for(value) == "newinfo-chapter-3-domain-3-security-architecture"
  assert importer.card_id_for(3, " Hello—world ") == importer.card_id_for(3, "hello-world")


def test_invalid_chapter_directory_name_is_rejected():
  with pytest.raises(RuntimeError, match="Chapter directory name"):
    importer.chapter_metadata(Path("Domain 3"))


def test_valid_record_preserves_solution_and_options(tmp_path):
  raw = question(correct="C")
  parsed = importer.validate_record(raw, tmp_path / "x.json", 1)
  assert parsed["correct"] == "C"
  assert parsed["options"] == {"A": "Alpha", "B": "Bravo", "C": "Charlie", "D": "Delta"}
  assert parsed["raw"] is raw


@pytest.mark.parametrize(
  ("mutate", "message"),
  [
    (lambda value: value.update(question=""), "question is empty"),
    (lambda value: value.update(answers=value["answers"][:3]), "exactly four"),
    (lambda value: value["answers"].__setitem__(1, {"text": "A: Again", "correct": True}), "duplicate option"),
    (lambda value: value.update(correct="A: Alpha"), "conflicts"),
    (lambda value: value.update(explanation=""), "explanation is empty"),
    (lambda value: value.update(responseSeconds=-1), "non-negative"),
  ],
)
def test_invalid_records_are_rejected(tmp_path, mutate, message):
  raw = question()
  mutate(raw)
  with pytest.raises(ValueError, match=message):
    importer.validate_record(raw, tmp_path / "x.json", 1)


def test_deduplication_counts_exact_copies_and_timing_variants(tmp_path):
  first = question(seconds=10)
  second = question(seconds=20)
  (tmp_path / "a.json").write_text(json.dumps([first]), encoding="utf-8")
  (tmp_path / "b.json").write_text(json.dumps([second]), encoding="utf-8")
  unique, feedback = importer.load_and_deduplicate(tmp_path)
  assert len(unique) == 1
  assert feedback["validRecords"] == 2
  assert feedback["duplicateCopiesRemoved"] == 1
  assert feedback["duplicateQuestionGroups"] == 1
  assert feedback["timingVariants"][0]["responseSeconds"] == [10, 20]


def test_deduplication_blocks_conflicting_copies(tmp_path):
  first = question(correct="B")
  second = question(correct="C")
  (tmp_path / "a.json").write_text(json.dumps([first]), encoding="utf-8")
  (tmp_path / "b.json").write_text(json.dumps([second]), encoding="utf-8")
  unique, feedback = importer.load_and_deduplicate(tmp_path)
  assert unique == []
  assert feedback["conflictingQuestionGroups"] == 1
  assert feedback["conflicts"][0]["answerKeys"] == ["B", "C"]


def test_content_layout_keeps_exact_key_text_and_explanation(tmp_path):
  raw = question(correct="D", explanation="Exact source explanation.")
  card_id, content, parsed = importer.content_for_record(raw, metadata(), tmp_path / "x.json", 1)
  assert card_id.startswith("newinfo-domain99-")
  assert content["front"].splitlines() == [
    raw["question"], "A: Alpha", "B: Bravo", "C: Charlie", "D: Delta"
  ]
  assert content["back"].startswith(">> CORRECT: D |\n\nExact source explanation.")
  assert parsed["correct"] == "D"


@pytest.fixture
def database_copy(tmp_path, monkeypatch):
  target = tmp_path / "sync.db"
  shutil.copy2(ROOT / "card-sync-server" / "sync.db", target)
  monkeypatch.setattr(importer, "BACKUP_DIR", tmp_path / "backups")
  return target


def test_direct_publish_create_idempotence_update_and_schedule_preservation(database_copy, tmp_path):
  source = tmp_path / "deduplicated.json"
  initial = question(text="Importer integration test question 99?", correct="C", seconds=31)
  source.write_text(json.dumps([initial]), encoding="utf-8")
  meta = metadata()

  first = importer.direct_publish([initial], meta, database_copy, source)
  assert first["created"] == first["verified"] == 1
  assert first["updated"] == first["unchanged"] == 0
  assert Path(first["backup"]).is_file()

  second = importer.direct_publish([initial], meta, database_copy, source)
  assert second["unchanged"] == second["verified"] == 1
  assert second["created"] == second["updated"] == 0
  assert second["backup"] is None

  card_id = importer.card_id_for(99, initial["question"])
  conn = sqlite3.connect(database_copy)
  conn.execute(
    "UPDATE server_cards SET reps=8, interval=19, factor=2100 WHERE id=? AND user_id=?",
    (card_id, first["canonicalUserId"]),
  )
  conn.commit()
  changed = question(
    text=initial["question"], correct="C", seconds=31,
    explanation="Updated explanation while the exact answer remains Charlie.",
  )
  third = importer.direct_publish([changed], meta, database_copy, source)
  assert third["updated"] == third["verified"] == 1
  row = conn.execute(
    """SELECT r.reps,r.interval,r.factor,c.front,c.back
       FROM server_cards r JOIN shared_card_catalog c ON c.id=r.id
       WHERE r.id=? AND r.user_id=? AND c.canonical_user_id=?""",
    (card_id, first["canonicalUserId"], first["canonicalUserId"]),
  ).fetchone()
  conn.close()
  assert row[:3] == (8, 19, 2100)
  assert re.search(r">> CORRECT:\s*C\s*\|", row[4])
  assert "Updated explanation" in row[4]


def test_direct_publish_skips_cross_id_duplicate_without_writing(database_copy, tmp_path):
  conn = sqlite3.connect(database_copy)
  existing = conn.execute(
    """SELECT c.front FROM shared_card_catalog c
       JOIN server_cards r ON r.id=c.id AND r.user_id=c.canonical_user_id
       WHERE c.deleted_at IS NULL AND r.deleted_at IS NULL
         AND IFNULL(r.is_deleted,0)=0 LIMIT 1"""
  ).fetchone()[0].splitlines()[0]
  conn.close()
  raw = question(text=existing)
  result = importer.direct_publish([raw], metadata(98), database_copy, tmp_path / "x.json")
  assert result["created"] == result["updated"] == result["verified"] == 0
  assert result["skippedExistingQuestions"] == 1
  assert result["skippedExisting"][0]["question"] == existing
  assert result["backup"] is None
  conn = sqlite3.connect(database_copy)
  count = conn.execute(
    "SELECT COUNT(*) FROM server_decks WHERE id=?",
    (importer.deck_id_for(metadata(98)),),
  ).fetchone()[0]
  conn.close()
  assert count == 0
