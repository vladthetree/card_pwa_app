#!/usr/bin/env python3
"""Archive the 16 out-of-scope cards and correct three in-scope cards."""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import time
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
IMPROVE = ROOT / "sample_Transcripts" / "improve"
DB = ROOT / "card-sync-server" / "sync.db"
PLAN = IMPROVE / "work" / "optimization-plan.json"
RESOLUTION_PLAN = IMPROVE / "work" / "unmapped-resolution-plan.json"
FOLLOWUP_PLAN = IMPROVE / "work" / "archive-and-quality-fixes-plan.json"
AUDIT = IMPROVE / "reports" / "card-audit.json"
REPORT = IMPROVE / "reports" / "archive-and-quality-fixes.json"
MANIFEST = IMPROVE / "snapshots" / "manifest.json"
PHASE_BACKUP = IMPROVE / "snapshots" / "sync-before-archive-and-quality-fixes.db"

ARCHIVE_DECK_ID = "sy0-701-not-relevant-archive"
ARCHIVE_DECK_NAME = "99_SY0-701_Not_Relevant_Archiv"

SCHEDULING_FIELDS = {
    "type", "queue", "due", "due_at", "interval", "factor", "stability",
    "difficulty", "retrievability", "reps", "lapses", "algorithm",
    "learning_step", "last_reviewed_at",
}


FIXES: dict[str, dict[str, Any]] = {
    "1729542555582": {
        "requirementIds": [
            "req:sy0701:v7:4.5:web-filter:universal-resource-locator-url-scanning",
            "req:sy0701:v7:4.5:web-filter:content-categorization",
            "req:sy0701:v7:4.5:web-filter:block-rules",
            "req:sy0701:v7:4.5:web-filter:reputation",
        ],
        "reason": "Die bisherige Formulierung 'inbound and outbound data' war zu breit; die neue Karte prüft konkrete Web-Filter-Funktionen.",
        "content": {
            "front": "M4-017: A company wants to block web access based on URL categories and reputation and to enforce rules on requested or downloaded web content. Which capability best meets this requirement?\nA: Discretionary Access Control\nB: Active Directory\nC: Content Filtering\nD: DomainKeys Identified Mail",
            "back": ">> CORRECT: C |\n\nContent Filtering bewertet Webzugriffe und Webinhalte anhand von URLs, Kategorien, Reputation und festgelegten Blockregeln. Damit kann die Organisation unerwünschte Requests oder Downloads gezielt verhindern.\n\nNicht:\nA | Discretionary Access Control regelt, welche Benutzer auf Objekte wie Dateien zugreifen dürfen; es kategorisiert oder filtert keine Webinhalte.\nB | Active Directory verwaltet Identitäten, Gruppen, Geräte und Richtlinien, ist aber kein Web- oder URL-Filter.\nD | DKIM bestätigt über eine digitale Signatur die Herkunft und Integrität einer E-Mail; es kontrolliert keine aufgerufenen Websites oder heruntergeladenen Webinhalte.",
            "tags": ["Enterprise Security"],
            "extraJson": {"acronym": "", "examples": "", "port": "", "protocol": ""},
        },
    },
    "1729706866215": {
        "requirementIds": [],
        "reason": "Die Wendung 'without acting' vermischte Risk Appetite mit Risk Acceptance; die neue Definition entspricht dem veröffentlichten Appetite-Oberbegriff.",
        "content": {
            "front": "M5-008: Which term describes the amount and type of risk an organization is willing to pursue or retain while working toward its objectives?\nA: Recovery Point Objective\nB: Risk Appetite\nC: Risk Tolerance\nD: Annualized Loss Expectancy",
            "back": ">> CORRECT: B |\n\nRisk Appetite beschreibt auf übergeordneter Ebene, welche Arten und welches Ausmaß an Risiko eine Organisation beim Verfolgen ihrer Ziele eingehen oder beibehalten will. Daraus können konkretere Toleranzgrenzen und Entscheidungen abgeleitet werden.\n\nNicht:\nA | Das Recovery Point Objective legt fest, wie viel Datenverlust gemessen als Zeitspanne bei einer Wiederherstellung höchstens akzeptabel ist.\nC | Risk Tolerance beschreibt die zulässige Abweichung um ein konkretes Risiko- oder Leistungsziel; sie operationalisiert den breiteren Risk Appetite.\nD | Annualized Loss Expectancy ist der erwartete jährliche Verlust eines Risikos und wird typischerweise als Single Loss Expectancy multipliziert mit der Annualized Rate of Occurrence berechnet.",
            "tags": ["Risk Management"],
            "extraJson": {"acronym": "", "examples": "", "port": "", "protocol": ""},
        },
    },
    "1772922529731": {
        "requirementIds": ["req:sy0701:v7:5.4:consequences-of-non-compliance:reputational-damage"],
        "reason": "Die frühere Negativfrage setzte unbegründet voraus, dass ein Breach keine Availability-Auswirkung haben kann; das neue Szenario prüft eine eindeutige Compliance-Folge.",
        "content": {
            "front": "A company exposes the personal records of thousands of customers. The incident causes loss of customer trust, sustained negative media coverage, and customers leaving for competitors. Which consequence of non-compliance is most directly illustrated?\nA: Contractual impacts\nB: Sanctions\nC: Reputational damage\nD: Loss of license",
            "back": ">> CORRECT: C |\n\nReputational damage ist der Vertrauens- und Imageschaden, der durch negative Berichterstattung und die Abwanderung von Kunden nach einem Datenschutz- oder Compliance-Verstoß entsteht.\n\nNicht:\nA | Contractual impacts wären Folgen aus verletzten Vertragsklauseln, etwa Schadenersatz, Kündigungsrechte oder neu verhandelte Bedingungen; solche Folgen nennt das Szenario nicht.\nB | Sanctions sind formelle Straf- oder Zwangsmaßnahmen einer zuständigen Stelle. Das Szenario beschreibt stattdessen den Verlust von Vertrauen und Ansehen.\nD | Loss of license bedeutet den Entzug einer für den Geschäftsbetrieb notwendigen Zulassung. Ein solcher Entzug wird im Szenario nicht genannt.",
            "tags": ["Security Compliance"],
            "extraJson": {"acronym": "", "examples": "", "port": "", "protocol": ""},
        },
    },
}


def dump(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def archive_ids() -> list[str]:
    source = json.loads(RESOLUTION_PLAN.read_text(encoding="utf-8"))
    ids = sorted(
        (row["cardId"] for row in source["cards"] if row["decision"] == "not_relevant"),
        key=int,
    )
    if len(ids) != 16:
        raise RuntimeError(f"Expected 16 not-relevant cards, found {len(ids)}")
    return ids


def create_snapshot() -> None:
    if PHASE_BACKUP.exists():
        return
    source = sqlite3.connect(DB)
    target = sqlite3.connect(PHASE_BACKUP)
    try:
        source.backup(target)
    finally:
        target.close()
        source.close()


def update_plan() -> dict[str, Any]:
    plan = json.loads(PLAN.read_text(encoding="utf-8"))
    by_id = {row["cardId"]: row for row in plan["cards"]}
    audit_by_id = {row["cardId"]: row for row in json.loads(AUDIT.read_text(encoding="utf-8"))["cards"]}
    archived = archive_ids()
    for card_id in archived:
        row = by_id[card_id]
        row.update({
            "targetDeckId": ARCHIVE_DECK_ID,
            "action": "move",
            "newContent": None,
            "fsrsImpact": "retain_content_schedule_and_review_history",
            "archiveDisposition": {
                "deckId": ARCHIVE_DECK_ID,
                "deckName": ARCHIVE_DECK_NAME,
                "reason": "Außerhalb der veröffentlichten SY0-701-V7-Bullets bzw. des belastbaren Objective-Wissens; reversibel archiviert, nicht gelöscht.",
            },
        })
        if row.get("unmappedResolution") and row["unmappedResolution"].get("qualityFlag"):
            row["unmappedResolution"]["qualityFlagDisposition"] = "archived_not_relevant"
            row["unmappedResolution"]["qualityFlag"] = None
    fix_plan = []
    for card_id, fix in FIXES.items():
        row = by_id[card_id]
        prior = audit_by_id[card_id]
        row.update({
            "auditStatus": "improve",
            "finalRequirementIds": fix["requirementIds"],
            "action": "move_and_clarify" if row["originalDeckId"] != row["targetDeckId"] else "clarify",
            "rationale": fix["reason"],
            "fsrsImpact": "retain_same_objective_clarity_fix",
            "newContent": fix["content"],
            "qualityCorrection": {
                "implemented": True,
                "reason": fix["reason"],
                "previousContent": prior["currentContent"],
            },
        })
        if row.get("unmappedResolution"):
            row["unmappedResolution"]["qualityFlagDisposition"] = "corrected"
            row["unmappedResolution"]["qualityFlag"] = None
        fix_plan.append({
            "cardId": card_id,
            "targetDeckId": row["targetDeckId"],
            "requirementIds": fix["requirementIds"],
            "reason": fix["reason"],
            "previousContent": prior["currentContent"],
            "newContent": fix["content"],
            "fsrsImpact": row["fsrsImpact"],
        })
    status_counts = Counter(row["auditStatus"] for row in plan["cards"])
    action_counts = Counter(row["action"] for row in plan["cards"])
    plan["schemaVersion"] = "sy0701-domain-optimization-plan-4"
    plan["counts"]["status"] = dict(sorted(status_counts.items()))
    plan["counts"]["existingActions"] = dict(sorted(action_counts.items()))
    plan["counts"]["archivedNotRelevantCards"] = len(archived)
    plan["counts"]["activeExistingDomainCards"] = len(plan["cards"]) - len(archived)
    plan["counts"]["finalDomainCards"] = len(plan["cards"]) - len(archived) + len(plan["addedCards"])
    dump(PLAN, plan)
    followup = {
        "schemaVersion": "sy0701-archive-and-quality-fixes-plan-1",
        "archiveDeck": {"id": ARCHIVE_DECK_ID, "name": ARCHIVE_DECK_NAME, "parentDeckId": None},
        "archivedCards": archived,
        "qualityFixes": fix_plan,
        "policy": {
            "deleteCards": False,
            "preserveCardIds": True,
            "preserveReviewHistory": True,
            "preserveFsrsSchedules": True,
        },
    }
    dump(FOLLOWUP_PLAN, followup)
    return followup


def update_manifest() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    digest = hashlib.sha256(PHASE_BACKUP.read_bytes()).hexdigest()
    manifest["schemaVersion"] = "sy0701-domain-card-snapshot-manifest-3"
    manifest["archiveAndQualityFixesPhase"] = {
        "backup": str(PHASE_BACKUP.relative_to(ROOT)),
        "backupSha256": digest,
    }
    dump(MANIFEST, manifest)


def command_apply(_: argparse.Namespace) -> None:
    create_snapshot()
    archived = archive_ids()
    audit_by_id = {row["cardId"]: row for row in json.loads(AUDIT.read_text(encoding="utf-8"))["cards"]}
    live = sqlite3.connect(DB)
    live.row_factory = sqlite3.Row
    try:
        profiles = [dict(row) for row in live.execute("SELECT user_id, profile_name FROM users ORDER BY user_id")]
        if {row["profile_name"] for row in profiles} != {"Default", "Vlad"}:
            raise RuntimeError("Expected the Default and Vlad profiles")
        now = int(time.time() * 1000)
        live.execute("BEGIN IMMEDIATE")
        for profile in profiles:
            deck = live.execute(
                "SELECT name,parent_deck_id,deleted_at FROM server_decks WHERE user_id=? AND id=?",
                (profile["user_id"], ARCHIVE_DECK_ID),
            ).fetchone()
            if deck is None:
                live.execute(
                    "INSERT INTO server_decks (id,name,created_at,source,updated_at,deleted_at,last_source_client,user_id,parent_deck_id) VALUES (?,?,?,?,?,?,?,?,?)",
                    (ARCHIVE_DECK_ID, ARCHIVE_DECK_NAME, now, "card-qa-audit", now, None, "card-qa-audit-v1", profile["user_id"], None),
                )
            elif deck["name"] != ARCHIVE_DECK_NAME or deck["parent_deck_id"] is not None or deck["deleted_at"] is not None:
                raise RuntimeError(f"Archive deck drift: {profile['profile_name']}")
        schedules_before: dict[tuple[str, str], dict[str, Any]] = {}
        for profile in profiles:
            for card_id in archived + list(FIXES):
                current = live.execute(
                    "SELECT * FROM server_cards WHERE user_id=? AND id=? AND is_deleted=0",
                    (profile["user_id"], card_id),
                ).fetchone()
                if current is None:
                    raise RuntimeError(f"Missing card: {profile['profile_name']}/{card_id}")
                schedules_before[(profile["user_id"], card_id)] = {key: current[key] for key in SCHEDULING_FIELDS}
        for profile in profiles:
            for card_id in archived:
                live.execute(
                    "UPDATE server_cards SET deck_id=?,updated_at=? WHERE user_id=? AND id=? AND deck_id<>?",
                    (ARCHIVE_DECK_ID, now, profile["user_id"], card_id, ARCHIVE_DECK_ID),
                )
            for card_id, fix in FIXES.items():
                current = dict(live.execute(
                    "SELECT * FROM server_cards WHERE user_id=? AND id=?",
                    (profile["user_id"], card_id),
                ).fetchone())
                expected_old = audit_by_id[card_id]["currentContent"]
                old_matches = (
                    current["front"] == expected_old["front"]
                    and current["back"] == expected_old["back"]
                    and json.loads(current["tags_json"] or "[]") == expected_old["tags"]
                    and json.loads(current["extra_json"] or "{}") == expected_old["extraJson"]
                )
                new_matches = (
                    current["front"] == fix["content"]["front"]
                    and current["back"] == fix["content"]["back"]
                )
                if not old_matches and not new_matches:
                    raise RuntimeError(f"Content drift before quality fix: {profile['profile_name']}/{card_id}")
                live.execute(
                    "UPDATE server_cards SET front=?,back=?,tags_json=?,extra_json=?,updated_at=? WHERE user_id=? AND id=?",
                    (
                        fix["content"]["front"],
                        fix["content"]["back"],
                        json.dumps(fix["content"]["tags"], ensure_ascii=False, separators=(",", ":")),
                        json.dumps(fix["content"]["extraJson"], ensure_ascii=False, separators=(",", ":")),
                        now,
                        profile["user_id"],
                        card_id,
                    ),
                )
        for profile in profiles:
            for card_id in archived + list(FIXES):
                current = live.execute(
                    "SELECT * FROM server_cards WHERE user_id=? AND id=?",
                    (profile["user_id"], card_id),
                ).fetchone()
                if any(current[key] != schedules_before[(profile["user_id"], card_id)][key] for key in SCHEDULING_FIELDS):
                    raise RuntimeError(f"Schedule changed inside transaction: {profile['profile_name']}/{card_id}")
        live.commit()
    except Exception:
        live.rollback()
        raise
    finally:
        live.close()
    followup = update_plan()
    update_manifest()
    print(json.dumps({
        "database": str(DB),
        "snapshot": str(PHASE_BACKUP),
        "archiveDeck": followup["archiveDeck"],
        "archivedCards": len(followup["archivedCards"]),
        "qualityFixes": len(followup["qualityFixes"]),
    }, ensure_ascii=False, indent=2))


def command_validate(_: argparse.Namespace) -> None:
    followup = json.loads(FOLLOWUP_PLAN.read_text(encoding="utf-8"))
    archived = followup["archivedCards"]
    snapshot = sqlite3.connect(PHASE_BACKUP)
    live = sqlite3.connect(DB)
    snapshot.row_factory = live.row_factory = sqlite3.Row
    errors: list[str] = []
    try:
        live.execute("BEGIN")
        old_reviews = {row["id"]: dict(row) for row in snapshot.execute("SELECT * FROM server_reviews ORDER BY id")}
        new_reviews = {row["id"]: dict(row) for row in live.execute("SELECT * FROM server_reviews ORDER BY id")}
        for review_id, old in old_reviews.items():
            if new_reviews.get(review_id) != old:
                errors.append(f"Review row changed or disappeared: {review_id}")
        added_reviews = [row for review_id, row in new_reviews.items() if review_id not in old_reviews]
        reviewed = {(row["user_id"], row["card_id"]) for row in added_reviews}
        profiles = [dict(row) for row in live.execute("SELECT user_id,profile_name FROM users ORDER BY user_id")]
        for profile in profiles:
            deck = live.execute(
                "SELECT name,parent_deck_id,deleted_at FROM server_decks WHERE user_id=? AND id=?",
                (profile["user_id"], ARCHIVE_DECK_ID),
            ).fetchone()
            if deck is None or deck["name"] != ARCHIVE_DECK_NAME or deck["parent_deck_id"] is not None or deck["deleted_at"] is not None:
                errors.append(f"{profile['profile_name']}: archive deck invalid")
            for card_id in archived:
                old = dict(snapshot.execute("SELECT * FROM server_cards WHERE user_id=? AND id=?", (profile["user_id"], card_id)).fetchone())
                new = dict(live.execute("SELECT * FROM server_cards WHERE user_id=? AND id=?", (profile["user_id"], card_id)).fetchone())
                if new["deck_id"] != ARCHIVE_DECK_ID:
                    errors.append(f"{profile['profile_name']}/{card_id}: not archived")
                allowed = {"deck_id", "updated_at"}
                if (profile["user_id"], card_id) in reviewed:
                    allowed.update(SCHEDULING_FIELDS | {"last_source_client"})
                if any(old[key] != new[key] for key in old if key not in allowed):
                    errors.append(f"{profile['profile_name']}/{card_id}: content or identity changed during archive move")
            for card_id, fix in FIXES.items():
                old = dict(snapshot.execute("SELECT * FROM server_cards WHERE user_id=? AND id=?", (profile["user_id"], card_id)).fetchone())
                new = dict(live.execute("SELECT * FROM server_cards WHERE user_id=? AND id=?", (profile["user_id"], card_id)).fetchone())
                if new["front"] != fix["content"]["front"] or new["back"] != fix["content"]["back"]:
                    errors.append(f"{profile['profile_name']}/{card_id}: corrected content mismatch")
                if json.loads(new["tags_json"] or "[]") != fix["content"]["tags"] or json.loads(new["extra_json"] or "{}") != fix["content"]["extraJson"]:
                    errors.append(f"{profile['profile_name']}/{card_id}: corrected metadata mismatch")
                if any(old[key] != new[key] for key in SCHEDULING_FIELDS) and (profile["user_id"], card_id) not in reviewed:
                    errors.append(f"{profile['profile_name']}/{card_id}: FSRS state changed without a normal review")
        if len(profiles) == 2:
            for card_id in archived + list(FIXES):
                rows = [dict(live.execute(
                    "SELECT note_id,deck_id,front,back,tags_json,extra_json FROM server_cards WHERE user_id=? AND id=?",
                    (profile["user_id"], card_id),
                ).fetchone()) for profile in profiles]
                if rows[0] != rows[1]:
                    errors.append(f"Profile content/deck mismatch: {card_id}")
        integrity = live.execute("PRAGMA integrity_check").fetchone()[0]
        if integrity != "ok":
            errors.append(f"SQLite integrity check failed: {integrity}")
    finally:
        snapshot.close()
        live.close()
    report = {
        "schemaVersion": "sy0701-archive-and-quality-fixes-report-1",
        "passed": not errors,
        "errors": errors,
        "archiveDeck": followup["archiveDeck"],
        "archivedCards": len(archived),
        "archivedCardIds": archived,
        "qualityFixes": len(FIXES),
        "qualityFixCardIds": list(FIXES),
        "contentChangedCards": len(FIXES),
        "deletedCards": 0,
        "fsrsResets": 0,
        "reviewHistoryRowsPreserved": len(old_reviews),
        "normalReviewRowsAddedDuringPhase": len(added_reviews),
        "openQualityFlagsFromUnmappedReview": 0,
    }
    dump(REPORT, report)
    if errors:
        raise RuntimeError("Archive/quality validation failed: " + "; ".join(errors[:10]))
    print(json.dumps(report, ensure_ascii=False, indent=2))


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("apply").set_defaults(func=command_apply)
    sub.add_parser("validate").set_defaults(func=command_validate)
    args = parser.parse_args()
    try:
        args.func(args)
    except (RuntimeError, OSError, sqlite3.Error, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
