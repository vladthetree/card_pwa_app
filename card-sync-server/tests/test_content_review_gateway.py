import json
import importlib.util
import sqlite3
import sys
from pathlib import Path

import pytest


SERVER_ROOT = Path(__file__).resolve().parents[1]
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from server import config as server_config
from server.content_review import gate_bootstrap_card, gate_sync_card_operation
from server.db.connection import open_db
from server.db.schema import init_db
from server.domain.card_catalog import normalize_reference_rows, upsert_catalog_content
from server.sync.operations import apply_operation


GATEWAY_PATH = SERVER_ROOT / "scripts" / "security_card_review_gateway.py"
GATEWAY_SPEC = importlib.util.spec_from_file_location("security_card_review_gateway", GATEWAY_PATH)
assert GATEWAY_SPEC and GATEWAY_SPEC.loader
security_card_review_gateway = importlib.util.module_from_spec(GATEWAY_SPEC)
GATEWAY_SPEC.loader.exec_module(security_card_review_gateway)


@pytest.fixture
def review_db(tmp_path, monkeypatch):
    db_path = tmp_path / "review-gateway.db"
    monkeypatch.setattr(server_config, "DB_PATH", str(db_path))
    init_db()
    conn = open_db(sqlite3.Row)
    conn.execute(
        """INSERT INTO users
           (user_id, display_name, profile_name, recovery_code_hash, created_at)
           VALUES ('vlad-user', 'Vlad', 'Vlad', 'test-hash', 1)"""
    )
    conn.execute(
        """INSERT INTO server_cards
           (id, note_id, deck_id, front, back, tags_json, extra_json,
            metadata_json, reps, due, due_at, is_deleted, created_at,
            updated_at, last_source_client, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)""",
        (
            "card-1",
            "note-1",
            "deck-1",
            "Which concept?\nA: Salt\nB: Blockchain",
            ">> CORRECT: B |\n\nReviewed blockchain explanation.",
            json.dumps(["Cryptographic Solutions"]),
            json.dumps({"acronym": ""}),
            json.dumps({"answerTiming": {"samples": 1}}),
            2,
            4,
            345_600_000,
            100,
            100,
            "review-gateway",
            "vlad-user",
        ),
    )
    conn.commit()
    yield conn
    conn.close()


def test_unreviewed_content_update_is_queued_but_schedule_still_applies(review_db):
    payload = {
        "cardId": "card-1",
        "updates": {
            "front": "Which concept?\nA: Salt\nB: Blockchain",
            "back": ">> CORRECT: A |\n\nUnreviewed salt explanation.",
            "reps": 3,
            "due": 8,
            "dueAt": 691_200_000,
            "metadata": {"answerTiming": {"samples": 2}},
            "updatedAt": 200,
        },
    }

    op_type, safe_payload, queued = gate_sync_card_operation(
        review_db,
        user_id="vlad-user",
        op_type="card.update",
        payload=payload,
        op_id="client-op-1",
        source_client="learner-device",
    )

    assert queued is True
    assert op_type == "card.update"
    assert "front" not in safe_payload["updates"]
    assert "back" not in safe_payload["updates"]
    assert safe_payload["updates"]["reps"] == 3
    assert safe_payload["updates"]["metadata"]["answerTiming"]["samples"] == 2

    apply_operation(
        review_db,
        op_type,
        safe_payload,
        200,
        "learner-device",
        op_id="client-op-1",
        user_id="vlad-user",
    )
    review_db.commit()
    row = review_db.execute(
        "SELECT front, back, reps, due, metadata_json FROM server_cards WHERE user_id='vlad-user' AND id='card-1'"
    ).fetchone()
    assert row["front"].endswith("B: Blockchain")
    assert "CORRECT: B" in row["back"]
    assert row["reps"] == 3
    assert row["due"] == 8
    assert json.loads(row["metadata_json"])["answerTiming"]["samples"] == 2
    proposal = review_db.execute(
        "SELECT status, proposal_json FROM content_review_queue WHERE user_id='vlad-user' AND card_id='card-1'"
    ).fetchone()
    assert proposal["status"] == "pending"
    assert "CORRECT: A" in json.loads(proposal["proposal_json"])["content"]["back"]


def test_authoring_only_update_becomes_review_proposal_noop(review_db):
    op_type, safe_payload, queued = gate_sync_card_operation(
        review_db,
        user_id="vlad-user",
        op_type="card.update",
        payload={
            "cardId": "card-1",
            "updates": {"back": ">> CORRECT: A |\n\nWrong", "updatedAt": 201},
        },
        op_id="client-op-2",
        source_client="learner-device",
    )
    assert queued is True
    assert op_type == "content.review.proposed"
    assert safe_payload == {"cardId": "card-1"}


def test_bootstrap_preserves_reviewed_content_and_deletion_but_not_study_state(review_db):
    incoming = {
        "id": "card-1",
        "noteId": "note-1",
        "deckId": "deck-1",
        "front": "Stale question",
        "back": ">> CORRECT: A |\n\nStale answer",
        "tags": ["stale"],
        "extra": {},
        "metadata": {"answerTiming": {"samples": 9}},
        "reps": 12,
        "due": 20,
        "isDeleted": True,
        "deletedAt": 300,
        "updatedAt": 300,
    }
    safe, queued = gate_bootstrap_card(
        review_db,
        user_id="vlad-user",
        card=incoming,
        batch_id="batch-1",
        source_client="old-device",
    )
    assert queued is True
    assert safe is not None
    assert safe["front"].endswith("B: Blockchain")
    assert "CORRECT: B" in safe["back"]
    assert safe["tags"] == ["Cryptographic Solutions"]
    assert safe["isDeleted"] is False
    assert safe["deletedAt"] is None
    assert safe["reps"] == 12
    assert safe["metadata"]["answerTiming"]["samples"] == 9


def test_new_vlad_card_waits_for_review(review_db):
    payload = {
        "id": "new-card",
        "deckId": "deck-1",
        "front": "Unreviewed question",
        "back": "Unreviewed answer",
        "tags": [],
        "extra": {},
    }
    op_type, safe_payload, queued = gate_sync_card_operation(
        review_db,
        user_id="vlad-user",
        op_type="card.create",
        payload=payload,
        op_id="new-card-op",
        source_client="learner-device",
    )
    assert queued is True
    assert op_type == "content.review.proposed"
    assert safe_payload == {"cardId": "new-card"}
    assert review_db.execute(
        "SELECT 1 FROM server_cards WHERE user_id='vlad-user' AND id='new-card'"
    ).fetchone() is None


def _publication_review(card):
    return {
        "cardId": card["cardId"],
        "verdict": "approved",
        "cardType": "mc",
        "requirements": ["req:sy0701:v7:1.4:blockchain"],
        "evidence": (
            "NIST beschreibt Blockchain als kryptografisch verkettetes, "
            "verteiltes Ledger; damit ist exakt B: Blockchain belegt."
        ),
        "sources": [
            {
                "url": "https://www.comptia.org/training/resources/exam-objectives",
                "title": "CompTIA Security+ exam objectives",
                "roles": ["scope"],
                "locator": "SY0-701 objective 1.4, Blockchain",
                "supports": "Blockchain is explicitly in the SY0-701 cryptographic-solutions scope.",
            },
            {
                "url": "https://doi.org/10.6028/NIST.IR.8202",
                "title": "NIST IR 8202: Blockchain Technology Overview",
                "roles": ["fact"],
                "locator": "Abstract and section 2.1",
                "supports": "Blockchain uses cryptographically linked blocks in a distributed ledger.",
            },
        ],
        "reviewer": "test semantic reviewer",
        "reviewedAt": "2026-08-16T00:00:00+00:00",
        "reviewBasis": ["exact front/back inspection"],
        "contentHash": card["contentHash"],
        "correctAnswer": {"letter": "B", "text": "Blockchain"},
        "semanticChecks": {
            "stemUnambiguous": True,
            "frontBackConsistent": True,
            "sourceConflictChecked": True,
            "answerEntailedBySources": True,
        },
        "sourceConflicts": [],
        "crossCardCheck": {
            "performed": True,
            "result": "No conflicting current Vlad card uses this exact stem or tested claim.",
        },
        "revisionConsistency": {
            "frontBackSameRevision": True,
            "historyChecked": True,
        },
        "optionAssessments": {
            "A": {
                "verdict": "incorrect",
                "reason": "Salt is an additional hash input and is not a distributed ledger.",
            },
            "B": {
                "verdict": "correct",
                "reason": "The NIST definition entails the hash-linked distributed-ledger description.",
            },
        },
    }


def test_publication_validation_rejects_url_only_evidence(review_db):
    card = security_card_review_gateway.active_cards(review_db, "vlad-user")[0]
    review = _publication_review(card)
    for source in review["sources"]:
        source.pop("locator")
        source.pop("supports")
    review.pop("optionAssessments")

    errors = security_card_review_gateway.validate_review(
        review,
        card,
        publication=True,
    )

    assert any("exact locator" in error for error in errors)
    assert any("exact supported claim" in error for error in errors)
    assert any("optionAssessments missing" in error for error in errors)


def test_publication_validation_accepts_explicit_semantic_adjudication(review_db):
    card = security_card_review_gateway.active_cards(review_db, "vlad-user")[0]
    review = _publication_review(card)

    assert security_card_review_gateway.validate_review(
        review,
        card,
        publication=True,
    ) == []


def test_vlad_catalog_replaces_conflicting_user_content_but_preserves_state(review_db):
    review_db.execute(
        """INSERT INTO users
           (user_id, display_name, profile_name, recovery_code_hash, created_at)
           VALUES ('learner-user', 'Learner', 'Learner', 'test-hash', 1)"""
    )
    review_db.execute(
        """INSERT INTO server_cards
           (id, note_id, deck_id, front, back, tags_json, extra_json,
            metadata_json, reps, due, due_at, is_deleted, created_at,
            updated_at, last_source_client, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)""",
        (
            "card-1",
            "foreign-note",
            "foreign-deck",
            "Which concept?\nA: Salt\nB: Blockchain",
            ">> CORRECT: A |\n\nConflicting salt explanation.",
            json.dumps(["wrong"]),
            json.dumps({"wrong": True}),
            json.dumps({"answerTiming": {"samples": 7}}),
            9,
            12,
            1_036_800_000,
            50,
            300,
            "learner-device",
            "learner-user",
        ),
    )
    upsert_catalog_content(
        review_db,
        card_id="card-1",
        canonical_user_id="vlad-user",
        content={
            "noteId": "note-1",
            "deckId": "deck-1",
            "front": "Which concept?\nA: Salt\nB: Blockchain",
            "back": ">> CORRECT: B |\n\nReviewed blockchain explanation.",
            "tags": ["Cryptographic Solutions"],
            "extra": {"acronym": ""},
        },
        created_at=100,
        updated_at=400,
        source_client="security-card-review-gateway-v1",
    )

    result = normalize_reference_rows(review_db)
    learner = review_db.execute(
        """SELECT note_id, deck_id, front, back, tags_json, extra_json,
                  reps, due, metadata_json
           FROM server_cards WHERE user_id='learner-user' AND id='card-1'"""
    ).fetchone()
    catalog = review_db.execute(
        "SELECT front, back FROM shared_card_catalog WHERE id='card-1'"
    ).fetchone()

    assert result["referencesNormalized"] == 2
    assert learner["note_id"] is None
    assert learner["deck_id"] == "deck-1"
    assert learner["front"] is None
    assert learner["back"] is None
    assert learner["tags_json"] is None
    assert learner["extra_json"] is None
    assert learner["reps"] == 9
    assert learner["due"] == 12
    assert json.loads(learner["metadata_json"])["answerTiming"]["samples"] == 7
    assert catalog["front"].endswith("B: Blockchain")
    assert "CORRECT: B" in catalog["back"]


def test_non_vlad_can_update_reference_state_but_not_catalog_content(review_db):
    review_db.execute(
        """INSERT INTO users
           (user_id, display_name, profile_name, recovery_code_hash, created_at)
           VALUES ('learner-user', 'Learner', 'Learner', 'test-hash', 1)"""
    )
    upsert_catalog_content(
        review_db,
        card_id="card-1",
        canonical_user_id="vlad-user",
        content={
            "noteId": "note-1",
            "deckId": "deck-1",
            "front": "Which concept?\nA: Salt\nB: Blockchain",
            "back": ">> CORRECT: B |\n\nReviewed blockchain explanation.",
            "tags": [],
            "extra": {},
        },
        created_at=100,
        updated_at=100,
        source_client="security-card-review-gateway-v1",
    )
    review_db.execute(
        """INSERT INTO server_cards
           (id, deck_id, reps, due, due_at, is_deleted, created_at,
            updated_at, last_source_client, user_id)
           VALUES ('card-1', 'deck-1', 0, 0, 0, 0, 100, 100,
                   'shared-card-catalog-default', 'learner-user')"""
    )

    op_type, payload, queued = gate_sync_card_operation(
        review_db,
        user_id="learner-user",
        op_type="card.update",
        payload={
            "cardId": "card-1",
            "updates": {
                "back": ">> CORRECT: A |\n\nWrong salt explanation.",
                "reps": 3,
                "due": 8,
                "updatedAt": 200,
            },
        },
        op_id="learner-update",
        source_client="learner-device",
    )
    apply_operation(
        review_db,
        op_type,
        payload,
        200,
        "learner-device",
        op_id="learner-update",
        user_id="learner-user",
    )

    catalog = review_db.execute(
        "SELECT back FROM shared_card_catalog WHERE id='card-1'"
    ).fetchone()
    learner = review_db.execute(
        "SELECT back, reps, due FROM server_cards WHERE user_id='learner-user' AND id='card-1'"
    ).fetchone()
    assert queued is False
    assert op_type == "card.update"
    assert "back" not in payload["updates"]
    assert "CORRECT: B" in catalog["back"]
    assert learner["back"] is None
    assert learner["reps"] == 3
    assert learner["due"] == 8


def test_only_vlad_gateway_publication_changes_catalog(review_db):
    upsert_catalog_content(
        review_db,
        card_id="card-1",
        canonical_user_id="vlad-user",
        content={
            "noteId": "note-1",
            "deckId": "deck-1",
            "front": "Question v1\nA: Salt\nB: Blockchain",
            "back": ">> CORRECT: B |\n\nExplanation v1.",
            "tags": [],
            "extra": {},
        },
        created_at=100,
        updated_at=100,
        source_client="security-card-review-gateway-v1",
    )
    normalize_reference_rows(review_db)

    apply_operation(
        review_db,
        "card.update",
        {
            "cardId": "card-1",
            "updates": {
                "front": "Question v2\nA: Salt\nB: Blockchain",
                "back": ">> CORRECT: B |\n\nExplanation v2.",
                "updatedAt": 500,
            },
        },
        500,
        "security-card-review-gateway-v1",
        op_id="gateway-publication",
        user_id="vlad-user",
    )

    catalog = review_db.execute(
        "SELECT front, back FROM shared_card_catalog WHERE id='card-1'"
    ).fetchone()
    vlad_ref = review_db.execute(
        "SELECT front, back, reps FROM server_cards WHERE user_id='vlad-user' AND id='card-1'"
    ).fetchone()
    assert catalog["front"].startswith("Question v2")
    assert "Explanation v2" in catalog["back"]
    assert vlad_ref["front"] is None
    assert vlad_ref["back"] is None
    assert vlad_ref["reps"] == 2
