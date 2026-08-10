#!/usr/bin/env python3
"""Resolve the 104 manually reviewed, formerly unmapped SY0-701 cards.

The resolution distinguishes direct requirement matches, broader objective
context, and material outside the published V7 objective bullets/acronyms.
Only objective-deck moves are applied to the database; card content, IDs,
scheduling state, and review history remain untouched.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sqlite3
import time
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
IMPROVE = ROOT / "sample_Transcripts" / "improve"
DB = ROOT / "card-sync-server" / "sync.db"
PHASE_BACKUP = IMPROVE / "snapshots" / "sync-before-unmapped-resolution.db"
PLAN = IMPROVE / "work" / "optimization-plan.json"
RESOLUTION_PLAN = IMPROVE / "work" / "unmapped-resolution-plan.json"
RESOLUTION_REPORT = IMPROVE / "reports" / "unmapped-resolution.json"
REQUIREMENTS = ROOT / "card_pwa" / "content" / "sy0-701" / "generated" / "sy0-701-requirements.json"
OBJECTIVES = ROOT / "card_pwa" / "content" / "sy0-701" / "source" / "objectives-v7-extract.json"


# cardId, objectiveId, scopeLevel, exact requirementIds, rationale, optional quality note
REVIEWED: list[tuple[str, str | None, str, list[str], str, str | None]] = [
    ("1728576145577", "1.1", "objective_context", [], "Die Negativfrage prüft die veröffentlichte Menge der Control Types; sie deckt jedoch keinen einzelnen Typ atomar ab.", None),
    ("1728677282633", "3.3", "exact_requirement", ["req:sy0701:v7:3.3:methods-to-secure-data:obfuscation"], "Die Karte definiert Obfuscation als Methode zum Schutz von Daten und gehört damit direkt zu Objective 3.3.", None),
    ("1728677405231", "3.3", "exact_requirement", ["req:sy0701:v7:3.3:methods-to-secure-data:obfuscation"], "Die Grenzen von Obfuscation gegenüber Reverse Engineering prüfen direkt das Obfuscation-Requirement in 3.3.", None),
    ("1728832318150", "1.4", "objective_context", [], "Web of Trust ist PKI-/Zertifikatskontext in Objective 1.4, aber kein eigener veröffentlichter Leaf.", None),
    ("1728832382513", "1.4", "objective_context", [], "X.509 ist der Zertifikatsstandard und damit fachlicher Kontext der PKI-/Zertifikatsinhalte von 1.4.", None),
    ("1728832486334", "1.4", "objective_context", [], "Das Issuer-Feld ist Zertifikatswissen innerhalb von 1.4, ohne einen eigenen V7-Leaf zu bilden.", None),
    ("1728833822183", "1.4", "objective_context", [], "Subject Alternative Name ist im offiziellen Akronymverzeichnis enthalten und gehört zum Zertifikatskontext von 1.4.", None),
    ("1728925347209", "2.1", "objective_context", [], "Threat Actor ist der ausdrücklich veröffentlichte Oberbegriff der Actor-Typen in Objective 2.1.", None),
    ("1728934123174", "2.2", "objective_context", [], "Threat Vector ist der Oberbegriff des gesamten Objective 2.2; die Karte legt keinen einzelnen Vektor fest.", None),
    ("1728936160805", "2.2", "objective_context", [], "Die Karte prüft Supply Chain als Angriffsvektor, nicht einen einzelnen MSP-, Vendor- oder Supplier-Leaf.", None),
    ("1729003938350", None, "not_relevant", [], "Defense in depth erscheint weder als V7-Objective-Bullet noch im offiziellen Akronymverzeichnis.", None),
    ("1729005007773", "2.3", "objective_context", [], "DLL steht im offiziellen Akronymverzeichnis und ist Kontext für anwendungs- und speicherbezogene Schwachstellen in 2.3.", None),
    ("1729005242071", "4.8", "objective_context", [], "Memory Forensics gehört zum veröffentlichten Oberpunkt Digital Forensics in Objective 4.8.", None),
    ("1729006621297", "2.3", "objective_context", [], "Die Karte prüft den veröffentlichten Oberpunkt Race Conditions, unterscheidet aber TOC und TOU nicht.", None),
    ("1729009525180", "4.1", "exact_requirement", ["req:sy0701:v7:4.1:application-security:input-validation"], "Input Sanitization ist eine direkte Anwendung von Input Validation in Objective 4.1.", None),
    ("1729017946321", "3.1", "exact_requirement", ["req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:virtualization"], "Ein Hypervisor ist die zentrale Architekturkomponente des Virtualization-Leafs in 3.1.", None),
    ("1729019659956", "2.3", "objective_context", [], "Die Karte prüft den veröffentlichten Vulnerability-Oberpunkt Supply Chain, ohne einen Provider-Typ festzulegen.", None),
    ("1729019963492", None, "not_relevant", [], "Die pauschale Übertragung von Zero Trust auf die Echtheitsprüfung neuer Hardware entspricht keinem veröffentlichten Zero-Trust- oder Supply-Chain-Leaf.", "Die Aussage vermischt Zugriffsentscheidungen mit Hardware-Provenienz."),
    ("1729020157178", "2.2", "objective_context", [], "Die Definition von Supply Chain liefert den Kontext für Supply Chain als Threat Vector in Objective 2.2.", None),
    ("1729093945243", None, "not_relevant", [], "Der Name des Linux-Administratorkontos ist weder Objective-Bullet noch offizielles Akronymwissen.", None),
    ("1729094001244", "4.6", "objective_context", [], "Superuser ist relevanter Grundlagenkontext für Privileged Access Management in Objective 4.6.", None),
    ("1729096807696", "2.4", "objective_context", [], "Malware Attacks ist der veröffentlichte Oberpunkt der Malware-Typen in Objective 2.4.", None),
    ("1729097429318", None, "not_relevant", [], "Drive-by Download ist im V7-Scope weder als Bullet noch als Akronym aufgeführt.", None),
    ("1729097907113", None, "not_relevant", [], "Fileless Malware gehört nicht zu den veröffentlichten Malware-Typen von Objective 2.4.", None),
    ("1729099804993", "4.1", "objective_context", [], "UEFI und DEP stehen im Akronymverzeichnis; Secure Boot ist sinnvoller Hardening-Kontext für Computing Resources in 4.1.", None),
    ("1729103461406", "4.6", "objective_context", [], "Multifactor Authentication ist der veröffentlichte Oberpunkt der MFA-Implementierungen und Faktoren in 4.6.", None),
    ("1729104062053", "2.4", "objective_context", [], "DoS steht im offiziellen Akronymverzeichnis und gehört zum Network-Attack-Kontext von 2.4.", None),
    ("1729104262170", "2.4", "objective_context", [], "DDoS ist der veröffentlichte Oberpunkt; die Karte unterscheidet Amplified und Reflected nicht.", None),
    ("1729104741764", None, "not_relevant", [], "Botnet ist weder eigener V7-Bullet noch offizielles Akronym.", None),
    ("1729104839747", None, "not_relevant", [], "Command and Control ist in den veröffentlichten V7-Bullets und Akronymen nicht enthalten.", None),
    ("1729106340713", "4.1", "objective_context", [], "Management Frames sind technischer Kontext der Wireless Security Settings in Objective 4.1.", None),
    ("1729107717300", "2.4", "objective_context", [], "ARP steht im offiziellen Akronymverzeichnis und ist Grundlagenkontext für On-path-Angriffe in 2.4.", None),
    ("1729175912541", "4.1", "objective_context", [], "DEP steht im offiziellen Akronymverzeichnis und ist ein OS-Hardening-Mechanismus für die Computing Resources aus 4.1.", None),
    ("1729176350133", None, "not_relevant", [], "Die reine Definition von clientseitigem Code prüft keinen veröffentlichten Security+-V7-Leaf.", None),
    ("1729176391515", None, "not_relevant", [], "Die reine Definition von serverseitigem Code prüft keinen veröffentlichten Security+-V7-Leaf.", None),
    ("1729179162672", "1.4", "objective_context", [], "In the clear ist Grundlagenkontext für die Verschlüsselungsinhalte von Objective 1.4.", None),
    ("1729180535847", "2.4", "exact_requirement", ["req:sy0701:v7:2.4:indicators:concurrent-session-usage", "req:sy0701:v7:2.4:indicators:impossible-travel"], "Die Frage nennt und prüft zwei veröffentlichte Indicators direkt.", None),
    ("1729183351572", "1.3", "exact_requirement", ["req:sy0701:v7:1.3:technical-implications:allow-lists-deny-lists"], "Die Funktionsweise einer Deny List deckt den gleichnamigen Leaf in Objective 1.3 direkt ab.", None),
    ("1729183952928", "2.5", "objective_context", [], "Mitigation ist der Oberbegriff und Zweck des gesamten Objective 2.5.", None),
    ("1729185940822", "2.5", "objective_context", [], "Hardening Techniques ist der veröffentlichte Oberpunkt in Objective 2.5.", None),
    ("1729186250125", None, "not_relevant", [], "Defense in depth erscheint weder als V7-Objective-Bullet noch im offiziellen Akronymverzeichnis.", None),
    ("1729187191969", "4.6", "objective_context", [], "Die Karte prüft MFA im IAM-Kontext von Objective 4.6, ohne einen bestimmten Faktor festzulegen.", None),
    ("1729192907745", None, "not_relevant", [], "Monolithic Architecture ist kein V7-Bullet; die Karte vergleicht es auch nicht mit dem veröffentlichten Microservices-Leaf.", None),
    ("1729266155183", "4.4", "exact_requirement", ["req:sy0701:v7:4.4:activities:log-aggregation"], "Ein zentraler Collector prüft die Log-Aggregation aus Objective 4.4 direkt.", None),
    ("1729267472724", "3.2", "objective_context", [], "Port Security ist der veröffentlichte Oberpunkt für 802.1X und EAP in Objective 3.2.", None),
    ("1729282747703", None, "not_relevant", [], "Die Karte meint parallele Rechenarbeit; der V7-Leaf Parallel Processing meint dagegen einen parallel laufenden Recovery-Test.", "Semantischer Konflikt mit dem offiziellen Objective 3.4."),
    ("1729283880472", "3.4", "objective_context", [], "Incremental Backup ist relevanter Kontext für Backup Frequency und Recovery in Objective 3.4, aber kein eigener Leaf.", None),
    ("1729437834722", "4.1", "objective_context", [], "Hardening Targets ist der veröffentlichte Oberpunkt in Objective 4.1.", None),
    ("1729540036900", None, "not_relevant", [], "Actionable Data ist weder veröffentlichter V7-Bullet noch offizielles Akronym.", None),
    ("1729542531766", "4.5", "exact_requirement", ["req:sy0701:v7:4.5:web-filter:content-categorization", "req:sy0701:v7:4.5:web-filter:universal-resource-locator-url-scanning"], "URL- und Website-Kategoriefilter decken zwei veröffentlichte Web-Filter-Leaves direkt ab.", None),
    ("1729542555582", "4.5", "objective_context", [], "Content Filtering ist Kontext des veröffentlichten Web-Filter-Oberpunkts in 4.5; die Formulierung legt keinen Leaf eindeutig fest.", "Die Formulierung 'inbound and outbound data' ist sehr breit."),
    ("1729545965530", "4.5", "objective_context", [], "Endpoint ist Grundlagenkontext des veröffentlichten EDR/XDR-Leafs in Objective 4.5.", None),
    ("1729606424320", "4.6", "objective_context", [], "Single Sign-on ist der veröffentlichte Oberpunkt der LDAP-, OAuth- und SAML-Leaves in 4.6.", None),
    ("1729609351815", "4.6", "objective_context", [], "Access Controls ist der veröffentlichte Oberpunkt der Zugriffsmodelle in Objective 4.6.", None),
    ("1729610407765", "4.6", "objective_context", [], "Authentication Factor ist der veröffentlichte Oberpunkt der MFA-Faktoren in Objective 4.6.", None),
    ("1729612110305", "4.7", "objective_context", [], "Scripting und Automation bilden den ausdrücklichen Gegenstand von Objective 4.7.", None),
    ("1729614808452", "4.8", "objective_context", [], "Digital Forensics ist der veröffentlichte Oberpunkt mehrerer Forensik-Leaves in Objective 4.8.", None),
    ("1729622224382", "5.1", "exact_requirement", ["req:sy0701:v7:5.1:policies:incident-response"], "Das zugehörige Destillat der Incident-Response-Policy nennt IR-Rollen ausdrücklich.", None),
    ("1729699356554", "5.1", "exact_requirement", ["req:sy0701:v7:5.1:standards:encryption"], "Das Beispiel eines verbindlichen zugelassenen Algorithmus prüft den Encryption-Standard-Leaf direkt.", None),
    ("1729705368991", "5.2", "objective_context", [], "Risk Management ist der Oberbegriff des gesamten Objective 5.2.", None),
    ("1729706866215", "5.2", "objective_context", [], "Die Karte gehört zum Risk-Appetite-/Acceptance-Kontext von Objective 5.2.", "Die Wendung 'without acting' ist zwischen Appetite und Acceptance missverständlich."),
    ("1729707523667", "5.2", "objective_context", [], "Risk Appetite ist der veröffentlichte Oberpunkt der drei Appetite-Ausprägungen in 5.2.", None),
    ("1729708046154", "5.2", "objective_context", [], "Accept ist eine veröffentlichte Risk-Management-Strategie; die Karte unterscheidet Exception und Exemption nicht.", None),
    ("1729783659515", "5.4", "objective_context", [], "Compliance ist der Oberbegriff des gesamten Objective 5.4.", None),
    ("1729783723324", None, "not_relevant", [], "CCO ist weder in den V7-Bullets noch im offiziellen Akronymverzeichnis aufgeführt.", None),
    ("1729783769844", "5.4", "objective_context", [], "Die Aufgaben eines Compliance Officers sind Kontext für Reporting und Monitoring in Objective 5.4, aber kein eigener Leaf.", None),
    ("1729784557847", "5.4", "exact_requirement", ["req:sy0701:v7:5.4:privacy:legal-implications:global"], "Die GDPR-Definition personenbezogener Daten prüft eine globale rechtliche Privacy-Implikation.", None),
    ("1729786475642", "5.6", "objective_context", [], "Anomalous Behavior Recognition ist der veröffentlichte Oberpunkt in Objective 5.6.", None),
    ("1729786793022", "5.6", "exact_requirement", ["req:sy0701:v7:5.6:development", "req:sy0701:v7:5.6:execution"], "Das Destillat ordnet Erstellung und Präsentation von Awareness-Material direkt Development und Execution zu.", None),
    ("1772576382622", None, "not_relevant", [], "OpenID Connect ist weder als V7-Bullet noch im offiziellen Akronymverzeichnis enthalten; OAuth ist ein anderes Protokoll.", None),
    ("1772576990007", "1.2", "exact_requirement", ["req:sy0701:v7:1.2:physical-security:access-badge"], "RFID ist die in der Karte abgefragte Technik eines veröffentlichten Access-Badge-Controls.", None),
    ("1772662005024", "2.4", "exact_requirement", ["req:sy0701:v7:2.4:application-attacks:forgery"], "Das Forgery-Destillat umfasst SSRF und passende Eingabe-/Allowlist-Schutzmaßnahmen ausdrücklich.", None),
    ("1772662005028", "5.3", "exact_requirement", ["req:sy0701:v7:5.3:vendor-selection:due-diligence"], "Betriebsdauer, Kundenbasis und Supportzusage sind konkrete Due-Diligence-Prüfpunkte bei der Vendor Selection.", None),
    ("1772662005029", "2.4", "objective_context", [], "Das Szenario prüft DDoS, legt aber weder Amplified noch Reflected fest.", None),
    ("1772662005066", "2.3", "objective_context", [], "Die Karte prüft den veröffentlichten Oberpunkt Race Conditions, ohne TOC und TOU zu unterscheiden.", None),
    ("1772662005101", "5.6", "exact_requirement", ["req:sy0701:v7:5.6:user-guidance-and-training:social-engineering"], "Die Definition wird ausdrücklich im Social-Engineering-Awareness-Leaf von 5.6 benötigt.", None),
    ("1772662005105", "2.4", "objective_context", [], "Das Szenario analysiert verdächtige Botnet-/C2-Netzaktivität und gehört damit zum Malicious-Activity-Kontext von 2.4.", None),
    ("1772662005128", "2.4", "objective_context", [], "Die Karte unterscheidet den Oberbegriff Malware von Delivery-Vektoren; sie legt keinen einzelnen Malware-Leaf fest.", None),
    ("1772922529731", "5.4", "objective_context", [], "Das Breach-Szenario prüft Folgen für Reputation und Finanzen im Compliance-/Privacy-Kontext von 5.4.", "Die Negativoption setzt voraus, dass der geschilderte Breach nur Vertraulichkeit betrifft."),
    ("1772922529741", "5.2", "objective_context", [], "Business Impact Analysis ist der veröffentlichte Oberpunkt der Recovery- und Failure-Metriken in 5.2.", None),
    ("1772922529751", "5.2", "objective_context", [], "Ein akzeptierter jährlicher Verlustbetrag gehört zum Risk-Appetite-/Tolerance-Kontext von Objective 5.2.", None),
    ("1772922529771", "5.2", "objective_context", [], "Accept ist eine veröffentlichte Risk-Management-Strategie; der Contingency Plan ändert die gewählte Strategie nicht.", None),
    ("1773101490290", "4.4", "exact_requirement", ["req:sy0701:v7:4.4:tools:benchmarks"], "Die Anwendung einer konkreten CIS-Benchmark-Empfehlung prüft den Benchmarks-Leaf in 4.4.", None),
    ("1773101490293", "4.6", "exact_requirement", ["req:sy0701:v7:4.6:multifactor-authentication:implementations:hard-soft-authentication-tokens"], "Statische MFA-Codes gehören fachlich zu Hard-/Soft-Authentication-Tokens in Objective 4.6.", None),
    ("1773101490308", "4.6", "objective_context", [], "Das Szenario prüft den veröffentlichten SSO-Oberpunkt in Objective 4.6.", None),
    ("1773101490318", "4.7", "exact_requirement", ["req:sy0701:v7:4.7:use-cases-of-automation-and-scripting:security-groups"], "Cloud Security Groups sind als Automation-/Scripting-Use-Case ausdrücklich in 4.7 aufgeführt.", None),
    ("1773101490323", None, "not_relevant", [], "Die konkrete grep-Befehlsoption ist weder Objective-Bullet noch offizielles Akronymwissen.", None),
    ("1773101490331", "4.9", "exact_requirement", ["req:sy0701:v7:4.9:log-data:metadata"], "Das Metadata-Destillat nennt Browserdaten ausdrücklich; die Karte bewertet ihren forensischen Aussagewert.", None),
    ("1773101490334", "4.4", "exact_requirement", ["req:sy0701:v7:4.4:tools:netflow"], "Die Abgrenzung von Flow-Telemetrie zu IPSec prüft die Einsatzgrenzen von NetFlow direkt.", None),
    ("1773101490340", "4.8", "objective_context", [], "Forensic Timelining ist sinnvoller Digital-Forensics-/Reporting-Kontext in Objective 4.8, aber kein eigener Leaf.", None),
    ("1773101490343", "4.4", "exact_requirement", ["req:sy0701:v7:4.4:tools:netflow"], "Die Auswahl eines Flow-Werkzeugs statt eines Log-Forwarders prüft NetFlow direkt.", None),
    ("1773536533015", "4.5", "exact_requirement", ["req:sy0701:v7:4.5:network-access-control-nac"], "Das Szenario ist eine direkte Anwendung von Network Access Control in Objective 4.5.", None),
    ("1773536533024", "3.3", "exact_requirement", ["req:sy0701:v7:3.3:data-classifications:sensitive", "req:sy0701:v7:3.3:data-classifications:confidential", "req:sy0701:v7:3.3:data-classifications:public"], "Die Negativfrage verlangt die Unterscheidung dreier ausdrücklich veröffentlichter Business-Klassifikationen.", None),
    ("1773536533027", "3.4", "objective_context", [], "Incremental Backup ist Kontext für Backup Frequency und Recovery in 3.4, aber kein eigener V7-Leaf.", None),
    ("1773794837304", "3.4", "exact_requirement", ["req:sy0701:v7:3.4:backups:recovery"], "Die Zahl der für einen Restore benötigten Backups prüft die praktische Recovery-Eigenschaft eines Differential-Backups.", None),
    ("1779095116170", "5.5", "objective_context", [], "Die Reihenfolge gehört zum Penetration-Testing-Oberpunkt von 5.5; nur Reconnaissance ist als einzelne Phase veröffentlicht.", None),
    ("1779669260165", "3.1", "objective_context", [], "CASB steht im offiziellen Akronymverzeichnis und gehört zum Cloud-Architekturkontext von Objective 3.1.", None),
    ("1779669260167", "4.2", "exact_requirement", ["req:sy0701:v7:4.2:monitoring-asset-tracking:inventory"], "Ein SBOM ist ein Komponenten- und Versionsinventar und deckt den Inventory-Leaf in Objective 4.2 direkt ab.", None),
    ("1779669260169", "1.2", "exact_requirement", ["req:sy0701:v7:1.2:zero-trust:control-plane:policy-driven-access-control"], "Identitäts- und kontextbasierter Zugriff auf einzelne Anwendungen ist eine direkte Anwendung von Policy-driven Access Control.", None),
    ("1779669260171", "4.4", "objective_context", [], "Managed Detection and Response gehört funktional zu Security Alerting and Monitoring in Objective 4.4, ist aber kein eigener Leaf oder offizielles Akronym.", None),
    ("1779669260172", "4.7", "exact_requirement", ["req:sy0701:v7:4.7:use-cases-of-automation-and-scripting:ticket-creation", "req:sy0701:v7:4.7:use-cases-of-automation-and-scripting:enabling-disabling-services-and-access"], "Das SOAR-Szenario nennt Ticket Creation und das automatisierte Sperren von Zugriff ausdrücklich.", None),
    ("1779669260185", "2.1", "objective_context", [], "TTP steht im offiziellen Akronymverzeichnis und beschreibt das Verhalten bzw. die Fähigkeiten von Threat Actors in Objective 2.1.", None),
    ("1779669260186", "2.4", "objective_context", [], "IoC steht im offiziellen Akronymverzeichnis und ist der Oberbegriff der Indicators in Objective 2.4.", None),
    ("1779669260194", "5.4", "exact_requirement", ["req:sy0701:v7:5.4:privacy:data-inventory-and-retention"], "PII steht im offiziellen Akronymverzeichnis und wird in einem Privacy Data Inventory identifiziert.", None),
]


def sha256_rows(rows: list[sqlite3.Row]) -> str:
    payload = [dict(row) for row in rows]
    return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str).encode()).hexdigest()


def load_decisions() -> list[dict[str, Any]]:
    rows = []
    for card_id, objective, scope, requirement_ids, rationale, quality_flag in REVIEWED:
        decision = "not_relevant" if scope == "not_relevant" else "objective_assigned"
        rows.append({
            "cardId": card_id,
            "decision": decision,
            "scopeLevel": scope,
            "objectiveId": objective,
            "requirementIds": requirement_ids,
            "rationale": rationale,
            "qualityFlag": quality_flag,
        })
    return rows


def prepare_plan() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    plan = json.loads(PLAN.read_text(encoding="utf-8"))
    decisions = load_decisions()
    if len(decisions) != 104 or len({row["cardId"] for row in decisions}) != 104:
        raise RuntimeError("The manual decision set must contain exactly 104 unique cards")
    requirements = {
        row["requirementId"]: row
        for row in json.loads(REQUIREMENTS.read_text(encoding="utf-8"))["requirements"]
    }
    official = json.loads(OBJECTIVES.read_text(encoding="utf-8"))
    objective_ids = {row["id"] for row in official["objectives"]}
    cards = {row["cardId"]: row for row in plan["cards"]}
    for decision in decisions:
        row = cards.get(decision["cardId"])
        if row is None:
            raise RuntimeError(f"Unknown reviewed card: {decision['cardId']}")
        followup = None
        if row.get("archiveDisposition") or row.get("qualityCorrection"):
            followup = {
                key: row.get(key)
                for key in (
                    "auditStatus", "finalRequirementIds", "targetDeckId", "action",
                    "rationale", "fsrsImpact", "newContent", "unmappedResolution",
                    "archiveDisposition", "qualityCorrection",
                )
            }
        original_status = row.get("originalAuditStatus", row["auditStatus"])
        if original_status != "unmapped":
            raise RuntimeError(f"Card was not originally unmapped: {decision['cardId']}")
        for requirement_id in decision["requirementIds"]:
            requirement = requirements.get(requirement_id)
            if requirement is None:
                raise RuntimeError(f"Unknown requirement: {requirement_id}")
            if requirement["objectiveId"] != decision["objectiveId"]:
                raise RuntimeError(f"Requirement/objective mismatch: {decision['cardId']}/{requirement_id}")
        if decision["decision"] == "objective_assigned":
            if decision["objectiveId"] not in objective_ids:
                raise RuntimeError(f"Unknown objective: {decision['objectiveId']}")
            target_deck = f"sy0-701-objective-{decision['objectiveId'].replace('.', '-')}"
            explicit = re.fullmatch(r"sy0-701-objective-(\d)-(\d)", row["originalDeckId"])
            original_objective = f"{explicit.group(1)}.{explicit.group(2)}" if explicit else None
            audit_status = "objective_mismatch" if original_objective and original_objective != decision["objectiveId"] else "keep"
            action = "move" if row["originalDeckId"] != target_deck else "keep"
        else:
            if decision["objectiveId"] is not None or decision["requirementIds"]:
                raise RuntimeError(f"Out-of-scope card has an assignment: {decision['cardId']}")
            target_deck = row["originalDeckId"]
            audit_status = "unmapped"
            action = "keep"
        row.update({
            "originalAuditStatus": original_status,
            "auditStatus": audit_status,
            "initialRequirementIds": [],
            "finalRequirementIds": decision["requirementIds"],
            "targetDeckId": target_deck,
            "action": action,
            "rationale": decision["rationale"],
            "fsrsImpact": "retain_content_and_schedule",
            "newContent": None,
            "unmappedResolution": decision,
        })
        if followup is not None:
            row.update(followup)
    decisions = [cards[row["cardId"]]["unmappedResolution"] for row in decisions]
    status_counts = Counter(row["auditStatus"] for row in plan["cards"])
    action_counts = Counter(row["action"] for row in plan["cards"])
    resolution_counts = Counter(row["decision"] for row in decisions)
    scope_counts = Counter(row["scopeLevel"] for row in decisions)
    archived_count = sum(bool(row.get("archiveDisposition")) for row in plan["cards"])
    plan["schemaVersion"] = "sy0701-domain-optimization-plan-4" if archived_count else "sy0701-domain-optimization-plan-3"
    plan["counts"]["status"] = dict(sorted(status_counts.items()))
    plan["counts"]["existingActions"] = dict(sorted(action_counts.items()))
    plan["counts"]["unmappedResolution"] = dict(sorted(resolution_counts.items()))
    plan["counts"]["unmappedScopeLevels"] = dict(sorted(scope_counts.items()))
    if archived_count:
        plan["counts"]["archivedNotRelevantCards"] = archived_count
        plan["counts"]["activeExistingDomainCards"] = len(plan["cards"]) - archived_count
        plan["counts"]["finalDomainCards"] = len(plan["cards"]) - archived_count + len(plan["addedCards"])
    RESOLUTION_PLAN.write_text(json.dumps({
        "schemaVersion": "sy0701-unmapped-resolution-plan-1",
        "source": "CompTIA Security+ SY0-701 V7 objectives and official acronym list",
        "reviewedCards": len(decisions),
        "decisionCounts": dict(sorted(resolution_counts.items())),
        "scopeLevelCounts": dict(sorted(scope_counts.items())),
        "cards": decisions,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    PLAN.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return plan, decisions


def command_plan(_: argparse.Namespace) -> None:
    plan, decisions = prepare_plan()
    print(json.dumps({
        "resolutionPlan": str(RESOLUTION_PLAN),
        "reviewed": len(decisions),
        "decisions": plan["counts"]["unmappedResolution"],
        "scopeLevels": plan["counts"]["unmappedScopeLevels"],
        "existingActions": plan["counts"]["existingActions"],
    }, indent=2))


def command_apply(_: argparse.Namespace) -> None:
    plan, decisions = prepare_plan()
    plan_by_id = {row["cardId"]: row for row in plan["cards"]}
    moved = [row for row in decisions if plan_by_id[row["cardId"]]["action"] == "move"]
    if not PHASE_BACKUP.exists():
        shutil.copy2(DB, PHASE_BACKUP)
    before = sqlite3.connect(PHASE_BACKUP)
    live = sqlite3.connect(DB)
    before.row_factory = live.row_factory = sqlite3.Row
    try:
        profiles = [dict(row) for row in live.execute("SELECT user_id, profile_name FROM users ORDER BY user_id")]
        if {row["profile_name"] for row in profiles} != {"Default", "Vlad"}:
            raise RuntimeError("Expected exactly the Default and Vlad profiles")
        review_before = sha256_rows(list(before.execute("SELECT * FROM server_reviews ORDER BY id")))
        review_live = sha256_rows(list(live.execute("SELECT * FROM server_reviews ORDER BY id")))
        if review_before != review_live:
            raise RuntimeError("Review history drift before unmapped resolution")
        now = int(time.time() * 1000)
        live.execute("BEGIN IMMEDIATE")
        for decision in moved:
            planned = plan_by_id[decision["cardId"]]
            for profile in profiles:
                target_exists = live.execute(
                    "SELECT 1 FROM server_decks WHERE user_id=? AND id=? AND deleted_at IS NULL",
                    (profile["user_id"], planned["targetDeckId"]),
                ).fetchone()
                if not target_exists:
                    raise RuntimeError(f"Missing target deck: {profile['profile_name']}/{planned['targetDeckId']}")
                current = live.execute(
                    "SELECT deck_id FROM server_cards WHERE user_id=? AND id=? AND is_deleted=0",
                    (profile["user_id"], decision["cardId"]),
                ).fetchone()
                if current is None:
                    raise RuntimeError(f"Missing card: {profile['profile_name']}/{decision['cardId']}")
                if current["deck_id"] not in {planned["originalDeckId"], planned["targetDeckId"]}:
                    raise RuntimeError(f"Unexpected deck drift: {profile['profile_name']}/{decision['cardId']}")
                if current["deck_id"] != planned["targetDeckId"]:
                    live.execute(
                        "UPDATE server_cards SET deck_id=?, updated_at=? WHERE user_id=? AND id=?",
                        (planned["targetDeckId"], now, profile["user_id"], decision["cardId"]),
                    )
        live.commit()
    except Exception:
        live.rollback()
        raise
    finally:
        before.close()
        live.close()
    print(json.dumps({
        "database": str(DB),
        "phaseBackup": str(PHASE_BACKUP),
        "objectiveAssignments": sum(row["decision"] == "objective_assigned" for row in decisions),
        "notRelevant": sum(row["decision"] == "not_relevant" for row in decisions),
        "cardsMovedToObjectiveDecks": len(moved),
        "profileRowsMoved": len(moved) * 2,
    }, indent=2))


def command_validate(_: argparse.Namespace) -> None:
    plan = json.loads(PLAN.read_text(encoding="utf-8"))
    plan_by_id = {row["cardId"]: row for row in plan["cards"]}
    decisions = [row["unmappedResolution"] for row in plan["cards"] if row.get("unmappedResolution")]
    before = sqlite3.connect(PHASE_BACKUP)
    live = sqlite3.connect(DB)
    before.row_factory = live.row_factory = sqlite3.Row
    errors: list[str] = []
    scheduling = {"type", "queue", "due", "due_at", "interval", "factor", "stability", "difficulty", "retrievability", "reps", "lapses", "algorithm", "learning_step", "last_reviewed_at"}
    try:
        live.execute("BEGIN")
        phase_reviews = {row["id"]: dict(row) for row in before.execute("SELECT * FROM server_reviews ORDER BY id")}
        live_reviews = {row["id"]: dict(row) for row in live.execute("SELECT * FROM server_reviews ORDER BY id")}
        for review_id, phase_row in phase_reviews.items():
            if live_reviews.get(review_id) != phase_row:
                errors.append(f"Review history row changed or disappeared: {review_id}")
        added_reviews = [row for review_id, row in live_reviews.items() if review_id not in phase_reviews]
        reviewed_during_phase = {(row["user_id"], row["card_id"]) for row in added_reviews}
        profiles = [dict(row) for row in live.execute("SELECT user_id, profile_name FROM users ORDER BY user_id")]
        for decision in decisions:
            planned = plan_by_id[decision["cardId"]]
            for profile in profiles:
                old = dict(before.execute("SELECT * FROM server_cards WHERE user_id=? AND id=?", (profile["user_id"], decision["cardId"])).fetchone())
                new = dict(live.execute("SELECT * FROM server_cards WHERE user_id=? AND id=?", (profile["user_id"], decision["cardId"])).fetchone())
                expected_deck = planned["targetDeckId"] if planned["action"] in {"move", "move_and_clarify"} else old["deck_id"]
                if new["deck_id"] != expected_deck:
                    errors.append(f"{profile['profile_name']}/{decision['cardId']}: target deck mismatch")
                allowed = {"deck_id", "updated_at"} if planned["action"] in {"move", "move_and_clarify"} else set()
                if planned.get("newContent"):
                    allowed.update({"front", "back", "tags_json", "extra_json", "updated_at"})
                    expected_content = planned["newContent"]
                    if (
                        new["front"] != expected_content["front"]
                        or new["back"] != expected_content["back"]
                        or json.loads(new["tags_json"] or "[]") != expected_content["tags"]
                        or json.loads(new["extra_json"] or "{}") != expected_content["extraJson"]
                    ):
                        errors.append(f"{profile['profile_name']}/{decision['cardId']}: quality-corrected content mismatch")
                if (profile["user_id"], decision["cardId"]) in reviewed_during_phase:
                    allowed.update(scheduling | {"updated_at", "last_source_client"})
                for key in old:
                    if key not in allowed and old[key] != new[key]:
                        errors.append(f"{profile['profile_name']}/{decision['cardId']}: unexpected field change {key}")
                if any(old[key] != new[key] for key in scheduling) and (profile["user_id"], decision["cardId"]) not in reviewed_during_phase:
                    errors.append(f"{profile['profile_name']}/{decision['cardId']}: FSRS state changed")
        if len(profiles) == 2:
            left, right = profiles
            for decision in decisions:
                rows = []
                for profile in (left, right):
                    rows.append(dict(live.execute(
                        "SELECT note_id,deck_id,front,back,tags_json,extra_json FROM server_cards WHERE user_id=? AND id=?",
                        (profile["user_id"], decision["cardId"]),
                    ).fetchone()))
                if rows[0] != rows[1]:
                    errors.append(f"Profile content/deck mismatch: {decision['cardId']}")
    finally:
        before.close()
        live.close()
    counts = Counter(row["decision"] for row in decisions)
    scopes = Counter(row["scopeLevel"] for row in decisions)
    moved_ids = [
        row["cardId"] for row in decisions
        if row["decision"] == "objective_assigned" and plan_by_id[row["cardId"]]["action"] in {"move", "move_and_clarify"}
    ]
    archived_ids = [
        row["cardId"] for row in decisions
        if row["decision"] == "not_relevant" and plan_by_id[row["cardId"]].get("archiveDisposition")
    ]
    quality_flags = [
        {"cardId": row["cardId"], "note": row["qualityFlag"]}
        for row in decisions if row["qualityFlag"]
    ]
    resolved_quality_flags = [
        {"cardId": row["cardId"], "disposition": row.get("qualityFlagDisposition")}
        for row in decisions if row.get("qualityFlagDisposition")
    ]
    report = {
        "schemaVersion": "sy0701-unmapped-resolution-report-2",
        "passed": not errors,
        "errors": errors,
        "reviewedPreviouslyUnmappedCards": len(decisions),
        "decisionCounts": dict(sorted(counts.items())),
        "scopeLevelCounts": dict(sorted(scopes.items())),
        "unresolvedCards": 0,
        "cardsMovedToObjectiveDecks": len(moved_ids),
        "movedCardIds": moved_ids,
        "archivedNotRelevantCards": len(archived_ids),
        "archivedCardIds": archived_ids,
        "contentChanged": sum(bool(plan_by_id[row["cardId"]].get("newContent")) for row in decisions),
        "fsrsSchedulesChanged": 0,
        "reviewHistoryRowsChanged": 0,
        "reviewHistoryRowsPreserved": len(phase_reviews),
        "normalReviewRowsAddedDuringPhase": len(added_reviews),
        "qualityFlags": quality_flags,
        "resolvedQualityFlags": resolved_quality_flags,
        "cards": decisions,
    }
    RESOLUTION_REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if errors:
        raise RuntimeError("Unmapped-resolution validation failed: " + "; ".join(errors[:10]))
    print(json.dumps({key: value for key, value in report.items() if key not in {"cards"}}, ensure_ascii=False, indent=2))


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("plan").set_defaults(func=command_plan)
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
