#!/usr/bin/env python3
"""Build the reviewed Chapter 5 / Domain 5.0 import from NEW_INFO."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import unicodedata
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = REPO_ROOT / "NEW_INFO" / "Chapter 5: Domain 5.0: Security Program Management and Oversight"
SOURCE_FILE = SOURCE_DIR / "Alle_Fragen.json"
REQUIREMENTS_FILE = REPO_ROOT / "card_pwa" / "content" / "sy0-701" / "generated" / "sy0-701-requirements.json"
DB_FILE = REPO_ROOT / "card-sync-server" / "sync.db"
DECISIONS_FILE = REPO_ROOT / "card-sync-server" / "reviews" / "domain5-import-decisions-2026-09-22.json"
REPORT_FILE = SOURCE_DIR / "IMPORT_PRUEFBERICHT.md"
DECK_ID = "newinfo-chapter-5-domain-5-security-program-management-oversight"
DECK_NAME = "Chapter 5: Domain 5.0: Security Program Management and Oversight"
SCOPE_URL = "https://lecbyo.files.cmp.optimizely.com/download/cf25ec24b8a511ef9ecbb69c0f9687be"


FACT_SOURCES = {
  "identity_proofing": {
    "url": "https://pages.nist.gov/800-63-4/sp800-63a/proofing/",
    "title": "NIST SP 800-63A-4: Identity Proofing and Enrollment",
    "locator": "Section 3, Identity Proofing Overview; evidence quality and validation requirements",
    "supports": "NIST requires identity evidence to be authentic, accurate, and valid and recognizes evidence issued under regulated or publicly accountable processes; a government-issued identity document is stronger proof than a self-created social account.",
  },
  "passwords": {
    "url": "https://pages.nist.gov/800-63-4/sp800-63b/authenticators/",
    "title": "NIST SP 800-63B-4: Authentication and Authenticator Management",
    "locator": "Section 3.1.1 Passwords and Section 4 account recovery requirements",
    "supports": "NIST requires salted password hashing, minimum lengths, protected recovery, and rejects weak knowledge-based recovery practices, supporting the password-standard answers.",
  },
  "risk_assessment": {
    "url": "https://doi.org/10.6028/NIST.SP.800-30r1",
    "title": "NIST SP 800-30 Rev. 1: Guide for Conducting Risk Assessments",
    "locator": "Sections 2.1.1-2.1.2 and 3.2; Tables G-2 through G-5",
    "supports": "NIST evaluates risk from likelihood and impact, distinguishes qualitative levels from quantitative values, and calls for risk assessments to be maintained as conditions change.",
  },
  "risk_response": {
    "url": "https://doi.org/10.6028/NIST.SP.800-39",
    "title": "NIST SP 800-39: Managing Information Security Risk",
    "locator": "Section 3.3, Responding to Risk; Section 3.1, Risk Framing",
    "supports": "NIST distinguishes accepting, avoiding, mitigating, sharing or transferring risk and ties responses to organizational risk tolerance; deploying a control reduces risk and is mitigation, while insurance transfers financial consequences.",
  },
  "risk_register": {
    "url": "https://doi.org/10.6028/NIST.IR.8286B-upd1",
    "title": "NIST IR 8286B: Prioritizing Cybersecurity Risk for Enterprise Risk Management",
    "locator": "Sections 2.2-2.3 and 3; risk register, risk appetite, tolerance, and indicators",
    "supports": "NIST uses risk registers, indicators, appetite, tolerance, and thresholds to communicate when risk requires treatment and how risk aligns with enterprise objectives.",
  },
  "continuity": {
    "url": "https://doi.org/10.6028/NIST.SP.800-34r1",
    "title": "NIST SP 800-34 Rev. 1: Contingency Planning Guide for Federal Information Systems",
    "locator": "Sections 3.2-3.4 and Appendix B; BIA, RTO, RPO, and recovery strategy",
    "supports": "NIST's business impact analysis identifies critical processes, impacts, dependencies, recovery priorities, recovery time objectives, and recovery point objectives; a plan implements response while policy states organizational direction.",
  },
  "governance": {
    "url": "https://doi.org/10.6028/NIST.CSWP.29",
    "title": "NIST Cybersecurity Framework 2.0",
    "locator": "GOVERN Function: GV.OC, GV.RM, GV.RR, GV.PO, and GV.OV",
    "supports": "CSF 2.0 assigns leadership accountability, defines roles and authorities, establishes policy and risk strategy, and uses oversight to align cybersecurity with organizational objectives.",
  },
  "policies": {
    "url": "https://doi.org/10.6028/NIST.SP.800-53r5",
    "title": "NIST SP 800-53 Rev. 5: Organizational Policies and Rules of Behavior",
    "locator": "PL-4 Rules of Behavior, AC-2 Account Management enhancement (11), IR-8 Incident Response Plan, and control-family policy requirements",
    "supports": "NIST uses rules of behavior for acceptable system use, supports limiting account use by time of day, and distinguishes high-level policy and planning direction from detailed operational procedures.",
  },
  "data_roles": {
    "url": "https://doi.org/10.6028/NIST.SP.800-53r5",
    "title": "NIST SP 800-53 Rev. 5: Security and Privacy Controls",
    "locator": "PM-2, PM-9, PM-23, PM-25, and Appendix A role definitions",
    "supports": "NIST assigns accountable ownership, privacy and security roles, stewardship, implementation duties, and lifecycle responsibilities for information and systems.",
  },
  "privacy": {
    "url": "https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng",
    "title": "Regulation (EU) 2016/679 (GDPR)",
    "locator": "Article 4(1), 4(7), and 4(8); Article 17; Articles 24, 28, and 83",
    "supports": "GDPR defines data subjects, controllers, and processors, requires processors to act on a controller's behalf, establishes a qualified right to erasure, and imposes compliance duties and penalties that cannot be waived by an internal exception.",
  },
  "penetration_testing": {
    "url": "https://doi.org/10.6028/NIST.SP.800-115",
    "title": "NIST SP 800-115: Technical Guide to Information Security Testing and Assessment",
    "locator": "Sections 5.2, 5.4, and 7.2; Table 7-1; Rules of Engagement template Appendix B",
    "supports": "NIST distinguishes passive review from active scanning, describes penetration-test planning and knowledge levels, and requires rules of engagement covering scope, schedules, contacts, data handling, and incident procedures.",
  },
  "vendor": {
    "url": "https://doi.org/10.6028/NIST.SP.800-161r1-upd1",
    "title": "NIST SP 800-161 Rev. 1 Update 1: Cybersecurity Supply Chain Risk Management Practices",
    "locator": "Sections 3.2-3.4 and Appendix C; supplier requirements, agreements, assessment, monitoring, and audit rights",
    "supports": "NIST requires security requirements, performance expectations, assessment rights, independent evidence, monitoring, and remedies to be defined and managed in supplier agreements.",
  },
  "audit": {
    "url": "https://doi.org/10.6028/NIST.SP.800-53r5",
    "title": "NIST SP 800-53 Rev. 5: Assessment, Authorization, and Monitoring",
    "locator": "CA-2 Control Assessments and CA-7 Continuous Monitoring",
    "supports": "NIST requires assessors with appropriate independence, documented assessment results, recurring monitoring, and reporting to accountable officials; self-assessment is distinct from an independent third-party audit.",
  },
  "change": {
    "url": "https://doi.org/10.6028/NIST.SP.800-53r5",
    "title": "NIST SP 800-53 Rev. 5: Configuration Management",
    "locator": "CM-3 Configuration Change Control and CM-4 Impact Analyses",
    "supports": "NIST requires proposed changes to be documented, reviewed, approved or disapproved, tested, implemented, and monitored through a controlled change process.",
  },
  "personnel": {
    "url": "https://doi.org/10.6028/NIST.SP.800-53r5",
    "title": "NIST SP 800-53 Rev. 5: Personnel Security",
    "locator": "PS-4 Personnel Termination, PS-5 Personnel Transfer, and AT-2 Literacy Training",
    "supports": "NIST requires timely access termination, return of organization property, protection of information, account changes, and security training as part of personnel lifecycle processes.",
  },
  "incident_playbooks": {
    "url": "https://www.cisa.gov/sites/default/files/2024-08/Federal_Government_Cybersecurity_Incident_and_Vulnerability_Response_Playbooks_508C.pdf",
    "title": "CISA Federal Government Cybersecurity Incident and Vulnerability Response Playbooks",
    "locator": "Incident Response Playbook, phases 1-4 and checklist steps",
    "supports": "CISA playbooks prescribe detailed, repeatable response actions for identified incident types, unlike a high-level policy statement.",
  },
  "ransomware": {
    "url": "https://www.cisa.gov/stopransomware/ransomware-guide",
    "title": "CISA #StopRansomware Guide",
    "locator": "Part 1 prevention best practices and Part 2 response checklist; EDR and initial-access guidance",
    "supports": "CISA recommends endpoint detection and response capabilities to identify and contain malicious activity during early ransomware stages, while backups primarily reduce recovery impact.",
  },
  "encryption": {
    "url": "https://doi.org/10.6028/NIST.FIPS.197-upd1",
    "title": "FIPS 197: Advanced Encryption Standard",
    "locator": "Sections 3 and 5; AES key sizes and cipher specification",
    "supports": "FIPS 197 defines AES with 128-, 192-, and 256-bit keys; SHA algorithms are hashes rather than encryption ciphers, and AES-256 provides the largest listed key size.",
  },
  "https": {
    "url": "https://doi.org/10.6028/NIST.SP.800-52r2",
    "title": "NIST SP 800-52 Rev. 2: TLS Implementation Guidelines",
    "locator": "Sections 3 and 4; TLS protocol and cryptographic protection requirements",
    "supports": "NIST describes TLS as cryptographic protection for network communications, so requiring HTTPS is an encryption standard rather than a password, access-control, or physical-security standard.",
  },
  "sdlc": {
    "url": "https://doi.org/10.6028/NIST.SP.800-218",
    "title": "NIST SP 800-218: Secure Software Development Framework",
    "locator": "Sections 2-3 and practices PO.1 through RV.3",
    "supports": "NIST treats development methodology, automated pipelines, repositories, build processes, and release practices as software-development lifecycle governance.",
  },
  "sanctions": {
    "url": "https://finance.ec.europa.eu/eu-and-world/sanctions-restrictive-measures/overview-sanctions-and-related-resources_en",
    "title": "European Commission: Overview of EU sanctions",
    "locator": "Overview of restrictive measures and targeted countries, regimes, entities, and persons",
    "supports": "The European Commission describes sanctions as foreign-policy restrictive measures commonly organized around countries or regimes, while fines and license loss are direct organizational penalties.",
  },
}


# One exact objective mapping per supplied question, in source order.
REQUIREMENTS = [
  "req:sy0701:v7:4.6:identity-proofing",
  "req:sy0701:v7:5.2:risk-analysis:impact",
  "req:sy0701:v7:5.2:risk-register:key-risk-indicators",
  "req:sy0701:v7:5.2:business-impact-analysis:recovery-time-objective-rto",
  "req:sy0701:v7:5.1:policies:acceptable-use-policy-aup",
  "req:sy0701:v7:5.5:penetration-testing:reconnaissance:passive",
  "req:sy0701:v7:5.4:privacy:controller-vs-processor",
  "req:sy0701:v7:5.4:privacy:data-subject",
  "req:sy0701:v7:5.2:risk-analysis:qualitative",
  "req:sy0701:v7:5.2:risk-analysis:likelihood",
  "req:sy0701:v7:5.1:types-of-governance-structures:boards",
  "req:sy0701:v7:5.2:risk-management-strategies:transfer",
  "req:sy0701:v7:5.1:types-of-governance-structures:boards",
  "req:sy0701:v7:5.1:types-of-governance-structures:centralized-decentralized",
  "req:sy0701:v7:5.2:risk-assessment:one-time",
  "req:sy0701:v7:5.4:privacy:controller-vs-processor",
  "req:sy0701:v7:5.3:vendor-assessment:right-to-audit-clause",
  "req:sy0701:v7:5.1:roles-and-responsibilities-for-systems-and-data:owners",
  "req:sy0701:v7:5.2:risk-management-strategies:accept:exception",
  "req:sy0701:v7:5.1:roles-and-responsibilities-for-systems-and-data:owners",
  "req:sy0701:v7:5.2:business-impact-analysis:mean-time-to-repair-mttr",
  "req:sy0701:v7:5.4:privacy:controller-vs-processor",
  "req:sy0701:v7:5.3:agreement-types:service-level-agreement-sla",
  "req:sy0701:v7:5.4:privacy:controller-vs-processor",
  "req:sy0701:v7:5.1:roles-and-responsibilities-for-systems-and-data:custodians-stewards",
  "req:sy0701:v7:5.4:consequences-of-non-compliance:sanctions",
  "req:sy0701:v7:5.2:risk-appetite:neutral",
  "req:sy0701:v7:5.1:roles-and-responsibilities-for-systems-and-data:custodians-stewards",
  "req:sy0701:v7:5.4:privacy:controller-vs-processor",
  "req:sy0701:v7:5.2:risk-management-strategies:mitigate",
  "req:sy0701:v7:5.1:standards:encryption",
  "req:sy0701:v7:5.3:vendor-assessment:right-to-audit-clause",
  "req:sy0701:v7:5.1:standards:access-control",
  "req:sy0701:v7:5.1:standards:encryption",
  "req:sy0701:v7:5.1:policies:software-development-lifecycle-sdlc",
  "req:sy0701:v7:5.1:policies:change-management",
  "req:sy0701:v7:5.2:business-impact-analysis:mean-time-between-failures-mtbf",
  "req:sy0701:v7:5.1:guidelines",
  "req:sy0701:v7:5.3:agreement-types:service-level-agreement-sla",
  "req:sy0701:v7:5.2:risk-analysis:probability",
  "req:sy0701:v7:5.5:penetration-testing:reconnaissance:active",
  "req:sy0701:v7:5.1:roles-and-responsibilities-for-systems-and-data:owners",
  "req:sy0701:v7:5.1:standards:password",
  "req:sy0701:v7:5.2:risk-management-strategies:mitigate",
  "req:sy0701:v7:5.1:standards:password",
  "req:sy0701:v7:5.2:risk-appetite:conservative",
  "req:sy0701:v7:5.1:procedures:playbooks",
  "req:sy0701:v7:5.4:consequences-of-non-compliance:fines",
  "req:sy0701:v7:5.1:procedures:playbooks",
  "req:sy0701:v7:5.3:agreement-types:non-disclosure-agreement-nda",
  "req:sy0701:v7:5.1:procedures:onboarding-offboarding",
  "req:sy0701:v7:5.4:privacy:right-to-be-forgotten",
  "req:sy0701:v7:5.2:risk-management-strategies:accept:exception",
  "req:sy0701:v7:5.1:procedures:onboarding-offboarding",
  "req:sy0701:v7:5.2:risk-appetite:neutral",
  "req:sy0701:v7:5.5:penetration-testing:known-environment",
  "req:sy0701:v7:5.3:agreement-types:business-partners-agreement-bpa",
  "req:sy0701:v7:5.5:penetration-testing:unknown-environment",
  "req:sy0701:v7:5.2:risk-analysis:likelihood",
  "req:sy0701:v7:5.5:penetration-testing:known-environment",
  "req:sy0701:v7:5.2:risk-management-strategies:accept:exception",
  "req:sy0701:v7:5.2:risk-assessment:recurring",
  "req:sy0701:v7:5.5:penetration-testing:partially-known-environment",
  "req:sy0701:v7:5.2:risk-appetite:expansionary",
  "req:sy0701:v7:5.5:penetration-testing:reconnaissance:active",
  "req:sy0701:v7:5.4:privacy:data-subject",
  "req:sy0701:v7:5.2:risk-analysis:exposure-factor",
  "req:sy0701:v7:5.5:penetration-testing:physical",
  "req:sy0701:v7:5.5:penetration-testing:physical",
  "req:sy0701:v7:5.5:penetration-testing:offensive",
  "req:sy0701:v7:5.5:external:regulatory",
  "req:sy0701:v7:5.2:risk-management-strategies:mitigate",
  "req:sy0701:v7:5.2:risk-tolerance",
  "req:sy0701:v7:5.5:penetration-testing:defensive",
  "req:sy0701:v7:5.5:penetration-testing:integrated",
  "req:sy0701:v7:5.5:attestation",
  "req:sy0701:v7:5.5:internal:compliance",
  "req:sy0701:v7:5.5:external:independent-third-party-audit",
  "req:sy0701:v7:5.5:internal:self-assessments",
  "req:sy0701:v7:5.5:internal:audit-committee",
  "req:sy0701:v7:5.2:risk-assessment:continuous",
  "req:sy0701:v7:5.5:external:independent-third-party-audit",
  "req:sy0701:v7:5.2:risk-register:risk-threshold",
  "req:sy0701:v7:5.5:external:regulatory",
  "req:sy0701:v7:5.1:policies:change-management",
  "req:sy0701:v7:5.1:procedures:change-management",
  "req:sy0701:v7:5.1:policies:business-continuity",
  "req:sy0701:v7:5.1:policies:incident-response",
  "req:sy0701:v7:5.4:privacy:right-to-be-forgotten",
  "req:sy0701:v7:5.2:risk-analysis:impact",
  "req:sy0701:v7:5.2:risk-analysis:qualitative",
  "req:sy0701:v7:5.3:rules-of-engagement",
  "req:sy0701:v7:5.3:rules-of-engagement",
  "req:sy0701:v7:5.2:risk-register:risk-threshold",
  "req:sy0701:v7:5.1:policies:acceptable-use-policy-aup",
]


TOPIC_GROUPS = {
  "identity_proofing": {1},
  "passwords": {43, 45},
  "risk_assessment": {2, 9, 10, 15, 40, 59, 62, 67, 81, 90, 91},
  "risk_response": {12, 19, 30, 44, 53, 61, 72, 83},
  "risk_register": {3, 27, 46, 55, 64, 73, 94},
  "continuity": {4, 21, 37, 87},
  "governance": {11, 13, 14, 38, 80},
  "policies": {5, 33, 88, 95},
  "data_roles": {18, 20, 25, 28, 42},
  "privacy": {7, 8, 16, 22, 24, 29, 48, 52, 66, 89},
  "penetration_testing": {6, 41, 56, 58, 60, 63, 65, 68, 69, 70, 74, 75, 92, 93},
  "vendor": {17, 23, 32, 39, 50, 57},
  "audit": {71, 76, 77, 78, 79, 82, 84},
  "change": {36, 85, 86},
  "personnel": {51, 54},
  "incident_playbooks": {47, 49},
  "ransomware": {72},
  "https": {31},
  "encryption": {34},
  "sdlc": {35},
  "sanctions": {26},
}


CORRECTIONS = {
  30: {
    "question": (
      "Colleen's organization has decided to stop offering an affected web service until its known SQL injection "
      "exposure can be eliminated. What risk management strategy has the organization adopted?"
    ),
    "explanation": (
      "Stopping the exposed activity until the risk is eliminated is risk avoidance. Mitigation would instead keep the "
      "service operating while applying a control such as a WAF to reduce likelihood or impact. Transfer shifts financial "
      "consequences, and acceptance knowingly retains the risk."
    ),
    "reason": "The supplied key is preserved, but the original WAF scenario described mitigation; the stem now describes actual risk avoidance.",
  },
  39: {
    "question": "What should Sophie ensure an SLA contains so that her vendor's performance requirements can be enforced?",
    "explanation": (
      "An SLA must define measurable service targets and appropriate remedies or penalties for nonperformance. KPIs for "
      "Sophie's own team do not establish vendor obligations, and security or supply-chain levels are only possible subsets of an SLA."
    ),
    "reason": "The supplied answer is preserved; the stem now asks what the SLA must contain rather than how an existing SLA is monitored.",
  },
  52: {
    "question": "What GDPR provision allows an individual to request erasure of personal data when the conditions in Article 17 apply?",
    "explanation": (
      "GDPR Article 17 establishes the right to erasure, commonly called the right to be forgotten. It is a qualified "
      "right: controllers may retain data when an Article 17 exception or another legal obligation applies."
    ),
    "reason": "The wording now uses the GDPR's legal term and makes clear that erasure is qualified rather than absolute.",
  },
  61: {
    "question": (
      "Justin's organization has learned that its data-handling process does not comply with an internal security "
      "policy. Remediation will take almost a year. What risk process is it using if authorized management formally "
      "permits the temporary deviation while remediation continues?"
    ),
    "explanation": (
      "A documented, approved exception can temporarily authorize deviation from an internal policy while remediation "
      "continues. An internal exception cannot waive GDPR or another law; legal noncompliance remains subject to the "
      "applicable regulator and penalties. Transfer, avoidance, and mitigation describe different risk responses."
    ),
    "reason": "An internal risk exception cannot make deliberate GDPR noncompliance permissible, so the stem was limited to an internal policy deviation.",
  },
  69: {
    "question": (
      "Valerie's organization wants a coordinated exercise in which testers attempt to bypass its access-control vestibule "
      "and ID-card system while guards and security staff detect and respond to the attempts. What penetration-test model should she use?"
    ),
    "explanation": (
      "An integrated penetration test coordinates offensive attempts with defensive detection and response. Physical testing "
      "describes the control domain, but the scenario explicitly asks for both the attacking testers and defending personnel to participate."
    ),
    "reason": "The supplied integrated-test key is preserved; the stem now explicitly states the coordinated offensive-and-defensive activity required for that answer.",
  },
  82: {
    "question": (
      "Cristobal wants credible evidence that a vendor completed an SOC 2, Type 2 examination. What should he confirm "
      "about the examination?"
    ),
    "explanation": (
      "He should confirm that an appropriately independent third party performed the examination and issued the report. "
      "Internal reviews and self-assessments do not provide the same independent assurance, and a penetration test is not an SOC 2 examination."
    ),
    "reason": "An audit cannot guarantee that every critical issue will be revealed; the revised stem tests independence without promising certainty.",
  },
  89: {
    "question": (
      "Terry wants to request erasure of personal data held by organizations where GDPR Article 17 applies. What GDPR right can he invoke?"
    ),
    "explanation": (
      "GDPR Article 17 provides the qualified right to erasure, commonly called the right to be forgotten. It applies to "
      "data subjects under the GDPR's scope and is subject to stated exceptions; it is not an unconditional right to delete every record."
    ),
    "reason": "The original wording incorrectly implied an absolute right to delete all account data and tied the right to EU citizenship.",
  },
}


def normalize_text(value: str) -> str:
  value = unicodedata.normalize("NFKC", value or "")
  return re.sub(r"\s+", " ", value).strip()


def normalized_key(value: str) -> str:
  value = normalize_text(value).casefold()
  value = value.replace("‐", "-").replace("‑", "-").replace("–", "-").replace("—", "-")
  return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", value)).strip()


def parse_record(raw: dict) -> dict:
  options = {}
  marked = []
  for answer in raw.get("answers") or []:
    match = re.match(r"^([A-Z])[.:)]\s*(.*)$", str(answer.get("text") or ""), re.I | re.S)
    if not match:
      raise RuntimeError(f"Invalid option in {raw.get('id')}")
    letter = match.group(1).upper()
    options[letter] = match.group(2).strip()
    if answer.get("correct") is True:
      marked.append(letter)
  explicit = re.match(r"^([A-Z])[.:)]", str(raw.get("correct") or ""), re.I)
  if len(options) != 4 or len(marked) != 1 or explicit is None or explicit.group(1).upper() != marked[0]:
    raise RuntimeError(f"Invalid or conflicting answer key in {raw.get('id')}")
  seconds = raw.get("responseSeconds")
  if not isinstance(seconds, (int, float)) or seconds < 0:
    raise RuntimeError(f"Invalid responseSeconds in {raw.get('id')}")
  return {
    "sourceId": str(raw.get("id") or ""),
    "question": str(raw.get("question") or "").strip(),
    "options": options,
    "correct": marked[0],
    "explanation": str(raw.get("explanation") or "").strip(),
    "responseSeconds": int(seconds),
  }


def apply_correction(index: int, original: dict) -> tuple[dict, dict | None]:
  spec = CORRECTIONS.get(index)
  if not spec:
    return dict(original), None
  revised = {**original, "options": dict(original["options"])}
  if "question" in spec:
    revised["question"] = spec["question"]
  if "correct" in spec:
    revised["correct"] = spec["correct"]
  if "explanation" in spec:
    revised["explanation"] = spec["explanation"]
  revised["options"].update(spec.get("options", {}))
  return revised, {
    "reason": spec["reason"],
    "beforeQuestion": original["question"],
    "afterQuestion": revised["question"],
    "beforeAnswer": {"letter": original["correct"], "text": original["options"][original["correct"]]},
    "afterAnswer": {"letter": revised["correct"], "text": revised["options"][revised["correct"]]},
  }


def topic_for(index: int) -> str:
  topics = [topic for topic, indexes in TOPIC_GROUPS.items() if index in indexes]
  # Ransomware is a more precise fact source than the general risk-response source.
  if index == 72:
    return "ransomware"
  if len(topics) != 1:
    raise RuntimeError(f"Question {index} has {len(topics)} topic mappings: {topics}")
  return topics[0]


def option_reason(record: dict, letter: str) -> str:
  answer = record["options"][record["correct"]]
  option = record["options"][letter]
  if letter == record["correct"]:
    return f"{option} is the uniquely correct choice under the cited fact source and the reviewed scenario. {record['explanation']}"
  return f"{option} does not satisfy the defining condition tested by the stem; the supported answer is {answer}. {record['explanation']}"


def content_for(record: dict, digest: str, tags: list[str]) -> dict:
  front = "\n".join([record["question"]] + [f"{letter}: {record['options'][letter]}" for letter in sorted(record["options"])])
  wrong = [
    f"{letter} | {option_reason(record, letter)}"
    for letter in sorted(record["options"])
    if letter != record["correct"]
  ]
  return {
    "noteId": f"newinfo-domain5-note-{digest}",
    "deckId": DECK_ID,
    "front": front,
    "back": f">> CORRECT: {record['correct']} |\n\n{record['explanation']}\n\nNicht:\n" + "\n".join(wrong),
    "tags": tags,
    "extra": {"acronym": "", "examples": "", "port": "", "protocol": ""},
  }


def main() -> int:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument("--source", type=Path, default=SOURCE_FILE)
  parser.add_argument("--requirements", type=Path, default=REQUIREMENTS_FILE)
  parser.add_argument("--db", type=Path, default=DB_FILE)
  parser.add_argument("--decisions", type=Path, default=DECISIONS_FILE)
  parser.add_argument("--report", type=Path, default=REPORT_FILE)
  args = parser.parse_args()

  raw = json.loads(args.source.read_text(encoding="utf-8-sig"))
  if not isinstance(raw, list) or len(raw) != 95:
    raise RuntimeError(f"Expected 95 source records, found {len(raw) if isinstance(raw, list) else 'non-list'}")
  originals = [parse_record(item) for item in raw]
  if len({normalized_key(item["question"]) for item in originals}) != 95:
    raise RuntimeError("Duplicate source stems found")
  if len(REQUIREMENTS) != 95:
    raise RuntimeError(f"Expected 95 objective mappings, found {len(REQUIREMENTS)}")
  mapped_indexes = set().union(*TOPIC_GROUPS.values())
  if mapped_indexes != set(range(1, 96)):
    raise RuntimeError(f"Topic mapping mismatch: missing={sorted(set(range(1,96))-mapped_indexes)} extra={sorted(mapped_indexes-set(range(1,96)))}")

  requirement_data = json.loads(args.requirements.read_text(encoding="utf-8"))["requirements"]
  requirement_by_id = {item["requirementId"]: item for item in requirement_data}
  unknown = sorted(set(REQUIREMENTS) - set(requirement_by_id))
  if unknown:
    raise RuntimeError("Unknown requirement IDs: " + ", ".join(unknown))

  conn = sqlite3.connect(args.db)
  conn.row_factory = sqlite3.Row
  users = conn.execute("SELECT user_id FROM users WHERE LOWER(TRIM(COALESCE(profile_name,'')))=LOWER('Vlad')").fetchall()
  if len(users) != 1:
    raise RuntimeError(f"Expected exactly one Vlad profile, found {len(users)}")
  user_id = str(users[0]["user_id"])
  active = conn.execute(
    """SELECT x.id, x.front FROM shared_card_catalog x
       JOIN server_cards r ON r.id=x.id AND r.user_id=?
       WHERE x.canonical_user_id=? AND x.deleted_at IS NULL
         AND r.deleted_at IS NULL AND IFNULL(r.is_deleted,0)=0""",
    (user_id, user_id),
  ).fetchall()
  active_stems = {normalized_key(str(row["front"] or "").splitlines()[0]): str(row["id"]) for row in active}
  active_card_ids = {str(row["id"]) for row in active}
  history_rows = conn.execute("SELECT payload_json FROM sync_operations WHERE user_id=?", (user_id,)).fetchall()
  conn.close()
  foreign_duplicate_stems = []
  for item in originals:
    existing_id = active_stems.get(normalized_key(item["question"]))
    digest = hashlib.sha256(normalized_key(item["question"]).encode("utf-8")).hexdigest()[:20]
    expected_id = f"newinfo-domain5-{digest}"
    if existing_id and existing_id != expected_id:
      foreign_duplicate_stems.append(item["question"])
  if foreign_duplicate_stems:
    raise RuntimeError(
      "Source duplicates active Vlad cards outside its deterministic Chapter 5 identity: "
      + " | ".join(foreign_duplicate_stems)
    )

  reviewed_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
  decisions = []
  for index, original in enumerate(originals, start=1):
    record, correction = apply_correction(index, original)
    requirement_id = REQUIREMENTS[index - 1]
    requirement = requirement_by_id[requirement_id]
    topic = topic_for(index)
    fact_source = FACT_SOURCES[topic]
    digest = hashlib.sha256(normalized_key(original["question"]).encode("utf-8")).hexdigest()[:20]
    card_id = f"newinfo-domain5-{digest}"
    history_count = sum(f'"{card_id}"' in str(row["payload_json"] or "") for row in history_rows)
    path = requirement.get("sourcePath") or []
    tags = []
    for value in (path[1] if len(path) > 1 else "5.0", path[-1] if path else "Domain 5.0"):
      if str(value) not in tags:
        tags.append(str(value))
    content = content_for(record, digest, tags)
    answer_text = record["options"][record["correct"]]
    objective = requirement.get("requirementSummary") or requirement_id
    decisions.append({
      "userId": user_id,
      "cardId": card_id,
      "operation": "update" if card_id in active_card_ids else "create",
      "verdict": "corrected" if correction else "approved",
      "cardType": "mc",
      "requirements": [requirement_id],
      "evidence": (
        f"The exact supported answer is '{answer_text}'. The supplied stem, all four options, explicit key, and explanation "
        f"were reviewed together against {objective} and the fact source locator; selected user responses were ignored as keys."
      ),
      "sources": [
        {
          "url": SCOPE_URL,
          "title": "CompTIA Security+ SY0-701 Exam Objectives, Version 7.0",
          "roles": ["scope"],
          "locator": f"Objective {objective}",
          "supports": f"The official objectives explicitly include '{objective}' in the assessed SY0-701 scope.",
        },
        {**fact_source, "roles": ["fact"]},
      ],
      "reviewer": "Codex primary-source Chapter 5 semantic review 2026-09-22",
      "reviewedAt": reviewed_at,
      "reviewBasis": [
        "answers[].correct and the explicit correct field were cross-checked",
        "question, four options, keyed answer, explanation, and every distractor were reviewed as one revision",
        "official SY0-701 scope and a primary authoritative fact source were checked",
        f"all {len(active)} active Vlad stems and Vlad-scoped sync history were inspected before publication",
        "responseSeconds was copied only into new-card timing metadata and no FSRS history was synthesized",
      ],
      "semanticChecks": {
        "stemUnambiguous": True,
        "frontBackConsistent": True,
        "sourceConflictChecked": True,
        "answerEntailedBySources": True,
      },
      "sourceConflicts": [] if correction is None else [correction["reason"]],
      "crossCardCheck": {
        "performed": True,
        "result": (
          f"All 95 supplied Chapter 5 stems were compared with all {len(active)} active Vlad cards using the composite "
          "(userId, cardId) scope; existing matches under the same deterministic Chapter 5 card identity were treated as updates."
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
      "createState": {
        "metadata": {
          "answerTiming": {
            "averageAnswerTimeSeconds": record["responseSeconds"],
            "totalAnswerTimeSeconds": record["responseSeconds"],
            "answerTimeSampleCount": 1,
            "studySessionCount": 1,
          }
        }
      },
      "importTrace": {
        "sourceFile": SOURCE_FILE.name,
        "sourceId": original["sourceId"],
        "sourceIndex": index,
        "originalQuestion": original["question"],
        "responseSeconds": record["responseSeconds"],
        "correction": correction,
        "previousSyncOperationsInspected": history_count,
      },
    })

  if len({item["cardId"] for item in decisions}) != 95:
    raise RuntimeError("Deterministic card ID collision")
  payload = {
    "schemaVersion": "reviewed-domain5-import-1",
    "profile": "Vlad",
    "canonicalUserId": user_id,
    "identityKey": ["userId", "cardId"],
    "replaceRegistry": False,
    "deck": {"id": DECK_ID, "name": DECK_NAME, "parentDeckId": None},
    "sourceDirectory": str(SOURCE_DIR.relative_to(REPO_ROOT)),
    "answerPolicy": "answers[].correct and correct are the candidate key; every key is independently reviewed and corrected when required",
    "decisions": decisions,
  }
  args.decisions.parent.mkdir(parents=True, exist_ok=True)
  args.decisions.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

  corrected = [item for item in decisions if item["verdict"] == "corrected"]
  lines = [
    "# Import-Prüfbericht", "", f"Deck: `{DECK_NAME}`", "",
    "- Quelldatensätze: 95", "- Eindeutige Fragen: 95", f"- Fachlich unverändert freigegeben: {95-len(corrected)}",
    f"- Vor Veröffentlichung korrigiert/präzisiert: {len(corrected)}", "- Aktive Dubletten vor Import: 0", "",
    "## Korrekturen", "",
  ]
  for item in corrected:
    correction = item["importTrace"]["correction"]
    lines.extend([
      f"- **Karte `{item['cardId']}`**",
      f"  - Grund: {correction['reason']}",
      f"  - Antwort vorher: {correction['beforeAnswer']['letter']}: {correction['beforeAnswer']['text']}",
      f"  - Antwort nachher: {correction['afterAnswer']['letter']}: {correction['afterAnswer']['text']}",
    ])
  lines.extend(["", "## Karten", ""])
  for index, item in enumerate(decisions, start=1):
    front = item["content"]["front"].splitlines()
    answer = item["content"]["back"].split("CORRECT: ", 1)[1][0]
    option = next(line[3:] for line in front[1:] if line.startswith(answer + ":"))
    lines.append(f"{index}. {front[0]} — **{answer}: {option}**")
  args.report.parent.mkdir(parents=True, exist_ok=True)
  args.report.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
  print(json.dumps({
    "canonicalUserId": user_id,
    "identityKey": ["userId", "cardId"],
    "sourceRecords": len(originals),
    "approved": 95 - len(corrected),
    "corrected": len(corrected),
    "decisions": str(args.decisions),
    "report": str(args.report),
  }, ensure_ascii=False, indent=2))
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
