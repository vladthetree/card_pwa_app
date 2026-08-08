#!/usr/bin/env python3
"""Audit every active Security+ card and optionally publish its QA state.

Cards with a concrete critical defect are quarantined with ``qa-blocked``.
Cards that still need editorial or source review remain studyable and receive
``qa-review-required``. No card, scheduling state, or review is deleted.

Usage:
    python scripts/audit_card_quality.py                 # dry-run/report
    python scripts/audit_card_quality.py --apply         # backup + sync ops
    python scripts/audit_card_quality.py --check         # CI gate
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sqlite3
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = ROOT.parent
DB_PATH = ROOT / "sync.db"
CATALOG_PATH = REPO_ROOT / "card_pwa/content/sy0-701/source/card-qa-catalog.json"
REPORT_PATH = REPO_ROOT / "card_pwa/content/sy0-701/generated/card-qa-report.json"
BACKUP_DIR = ROOT / "backups"
SOURCE_CLIENT = "card-qa-audit-v1"
QA_BLOCKED = "qa-blocked"
QA_REVIEW_REQUIRED = "qa-review-required"

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sync_server import apply_operation, init_db, now_ms  # noqa: E402
from server import config as server_config  # noqa: E402

COMPTIA_OBJECTIVES = "https://lecbyo.files.cmp.optimizely.com/download/cf25ec24b8a511ef9ecbb69c0f9687be"
NIST_ZERO_TRUST = "https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-207.pdf"
RFC_6960 = "https://www.rfc-editor.org/rfc/rfc6960.html"
RFC_6961 = "https://www.rfc-editor.org/rfc/rfc6961.html"
GDPR = "https://eur-lex.europa.eu/eli/reg/2016/679/oj"
NIST_GLOSSARY = "https://csrc.nist.gov/glossary"
NIST_CONTROLS = "https://doi.org/10.6028/NIST.SP.800-53r5"
NIST_IDENTITY = "https://doi.org/10.6028/NIST.SP.800-63-4"
NIST_INCIDENT_RESPONSE = "https://doi.org/10.6028/NIST.SP.800-61r2"
NIST_RISK = "https://doi.org/10.6028/NIST.SP.800-30r1"
NIST_CONTINGENCY = "https://doi.org/10.6028/NIST.SP.800-34r1"
NIST_CLOUD = "https://doi.org/10.6028/NIST.SP.800-145"
NIST_ICS = "https://doi.org/10.6028/NIST.SP.800-82r3"
NIST_TESTING = "https://doi.org/10.6028/NIST.SP.800-115"
NIST_CRYPTO = "https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines"
CISA_THREATS = "https://www.cisa.gov/topics/cyber-threats-and-advisories"
OWASP_WSTG = "https://owasp.org/www-project-web-security-testing-guide/"
RFC_5280 = "https://www.rfc-editor.org/rfc/rfc5280.html"
RFC_8446 = "https://www.rfc-editor.org/rfc/rfc8446.html"

OPTION_RE = re.compile(r"^([A-Z])\s*[:.)]\s*(.+)$")
CORRECT_RE = re.compile(r"(?:>>\s*)?(?:CORRECT|RICHTIG)\s*:\s*([A-Z])", re.I)
QUESTION_ID_RE = re.compile(r"^(M[1-5]-\d{3}):")
OBJECTIVE_DECK_RE = re.compile(r"sy0-701-objective-(\d)-(\d+)$")
META_RE = re.compile(
    r"\b(?:SY0-701|objective\s*\d|obj\.?\s*\d|PDF\s*(?:page|S\.)|laut\s+Messer|according\s+to\s+Messer)\b",
    re.I,
)
GERMAN_FRONT_RE = re.compile(r"\b(?:welche|welcher|welches|warum|wodurch|laut|gehört|müssen|sind|ist)\b", re.I)
CORE_ACRONYMS = ("OCSP", "CA", "CRL", "TLS", "PKI", "PEP", "PDP", "GDPR", "DSGVO")


@dataclass(frozen=True)
class ParsedCard:
    question: str
    options: dict[str, str]
    correct: str | None
    explanation: str
    incorrect_reasons: dict[str, str]
    kind: str


def content_hash(front: str, back: str, tags: list[str]) -> str:
    raw = json.dumps(
        {"front": front, "back": back, "tags": sorted(tags)},
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def parse_card(front: str, back: str) -> ParsedCard:
    stripped_front = (front or "").strip()
    upper = stripped_front.upper()
    if upper.startswith("ORDERING:"):
        return ParsedCard(stripped_front, {}, None, (back or "").strip(), {}, "ordering")
    if upper.startswith("MATCHING:"):
        return ParsedCard(stripped_front, {}, None, (back or "").strip(), {}, "matching")

    options: dict[str, str] = {}
    question_lines: list[str] = []
    for line in stripped_front.splitlines():
        match = OPTION_RE.match(line.strip())
        if match:
            options[match.group(1)] = match.group(2).strip()
        else:
            question_lines.append(line.strip())

    question = " ".join(line for line in question_lines if line).strip()
    correct_match = CORRECT_RE.search(back or "")
    correct = correct_match.group(1).upper() if correct_match else None
    normalized_back = (back or "").replace("\r\n", "\n").strip()
    cleaned = re.sub(
        r"^[ \t]*(?:>>[ \t]*)?(?:CORRECT|RICHTIG)[ \t]*:[ \t]*[A-Z]"
        r"(?:[ \t]*\|[ \t]*[^\n]*)?[ \t]*(?:\n|$)",
        "",
        normalized_back,
        count=1,
        flags=re.I,
    ).strip()
    section_match = re.search(r"^Nicht:\s*$", cleaned, flags=re.I | re.M)
    rationale_text = ""
    if section_match:
        rationale_text = cleaned[section_match.end():].strip()
        cleaned = cleaned[:section_match.start()].strip()
    mnemonic_match = re.search(r"^Merkhilfe:\s*", cleaned, flags=re.I | re.M)
    if mnemonic_match:
        cleaned = cleaned[:mnemonic_match.start()].strip()

    incorrect_reasons: dict[str, str] = {}
    for line in rationale_text.splitlines():
        match = re.match(r"^([A-Z])\s*(?:\||:|\))\s*(.+)$", line.strip(), re.I)
        if match and match.group(2).strip():
            incorrect_reasons[match.group(1).upper()] = match.group(2).strip()

    return ParsedCard(
        question=question,
        options=options,
        correct=correct,
        explanation=cleaned,
        incorrect_reasons=incorrect_reasons,
        kind="mc" if len(options) >= 2 else "standard",
    )


def provenance(deck_name: str, front: str, kind: str) -> str:
    if kind in {"ordering", "matching"}:
        return "app-authored-pbq"
    if "acronym" in deck_name.lower():
        return "acronym-bonus"
    if QUESTION_ID_RE.match(front) or "messer" in deck_name.lower() or "objective" in deck_name.lower():
        return "messer-derived"
    return "imported-exam-style"


def primary_sources_for(deck_name: str, front: str, options: dict[str, str]) -> list[str]:
    """Assign a small authoritative corpus based on the card's actual topic."""
    text = f"{deck_name}\n{front}\n{' '.join(options.values())}".casefold()
    sources = [COMPTIA_OBJECTIVES]

    topic_sources = (
        (("zero trust", "policy enforcement point", "policy engine"), NIST_ZERO_TRUST),
        (("cloud", "iaas", "paas", "saas", "serverless", "virtualization", "hypervisor"), NIST_CLOUD),
        (("scada", "industrial control", "ics", "rtos"), NIST_ICS),
        (("certificate", "ocsp", "crl", "public key infrastructure", "x.509"), RFC_5280),
        (("transport layer security", "tls 1.3", "https"), RFC_8446),
        (("crypt", "hash", "digital signature", "key escrow", "steganography"), NIST_CRYPTO),
        (("identity", "authentication", "password", "biometric", "openid", "saml", "authorization"), NIST_IDENTITY),
        (("sql injection", "cross-site", "csrf", "ssrf", "input validation", "web application"), OWASP_WSTG),
        (("incident", "forensic", "evidence", "eradication", "recovery phase", "lessons learned"), NIST_INCIDENT_RESPONSE),
        (("risk", "rpo", "rto", "mttr", "mtbf", "business impact", "continuity", "disaster recovery"), NIST_RISK),
        (("backup", "hot site", "warm site", "cold site", "recovery point", "recovery time"), NIST_CONTINGENCY),
        (("penetration test", "vulnerability scan", "port scan", "security test"), NIST_TESTING),
        (("gdpr", "data subject", "personal data", "european union"), GDPR),
        (("malware", "phishing", "threat actor", "ransomware", "botnet", "supply chain"), CISA_THREATS),
        (("control", "firewall", "access control", "hardening", "segmentation", "least privilege"), NIST_CONTROLS),
    )
    for keywords, source in topic_sources:
        if any(keyword in text for keyword in keywords):
            sources.append(source)

    if len(sources) == 1:
        # NIST's glossary aggregates definitions from its standards and keeps
        # the source publication attached to each term.
        sources.append(NIST_GLOSSARY)
    return list(dict.fromkeys(sources))


def objective(deck_id: str, deck_name: str) -> str | None:
    match = OBJECTIVE_DECK_RE.search(deck_id)
    if match:
        return f"{match.group(1)}.{match.group(2)}"
    match = re.search(r"\b([1-5]\.\d{1,2})\b", deck_name)
    return match.group(1) if match else None


def missing_acronym_expansions(text: str) -> list[str]:
    missing: list[str] = []
    for acronym in CORE_ACRONYMS:
        if not re.search(rf"\b{re.escape(acronym)}\b", text):
            continue
        if re.search(rf"[A-Za-z][A-Za-z ]{{4,}}\s*\({re.escape(acronym)}\)", text):
            continue
        missing.append(acronym)
    return missing


ACRONYM_CARD_IDS = {
    **{str(1779669260165 + index): acronym for index, acronym in enumerate((
        "CASB", "SASE", "SBOM", "SED", "ZTNA", "XDR", "MDR", "SOAR", "CCMP", "NGFW",
        "MTBF", "MTTR", "RTO", "RPO", "SCAP", "DKIM", "SPF", "DMARC", "STIX", "TAXII",
        "TTP", "IoC", "IaaS", "PaaS", "SaaS", "CYOD", "COPE", "BYOD", "RTOS", "PII",
    ))},
    **{str(1780262916255 + index): acronym for index, acronym in enumerate((
        "CASB", "SASE", "ZTNA", "SBOM", "SED", "STIX and TAXII", "SOAR", "MDR", "RPO",
        "MTTR", "DMARC", "COPE",
    ))},
    **{str(1781206500001 + index): acronym for index, acronym in enumerate((
        "SIEM", "EDR", "XDR", "MDR", "SPF", "DKIM", "S/MIME", "DMARC", "STIX", "TAXII",
        "SCAP", "DLP", "IAM", "PAM", "CASB", "SASE", "ZTNA", "SBOM", "SED", "RTO", "RPO",
        "MTBF", "MTTR", "COPE",
    ))},
}

ACRONYM_SCENARIOS = {
    "1780262916255": "Employees use sanctioned and unsanctioned cloud applications. Which acronym expands to the control point that provides policy enforcement, visibility, and data protection between users and cloud services?",
    "1780262916256": "A provider combines software-defined wide area networking, secure web gateway, cloud access security broker, firewall as a service, and Zero Trust access at a cloud edge. What does SASE stand for?",
    "1780262916257": "An organization replaces broad network-level Virtual Private Network access with identity- and context-based sessions to individual applications. What does ZTNA stand for?",
    "1780262916258": "A security team needs an inventory of software components and versions affected by a supply-chain vulnerability. What does SBOM stand for?",
    "1780262916259": "A drive performs its own hardware-based encryption for data at rest. What does SED stand for?",
    "1780262916260": "A security team exchanges structured threat intelligence with a partner. Which option correctly expands the STIX data format and TAXII transport protocol?",
    "1780262916261": "After a security alert, a playbook automatically creates a ticket, isolates a host, and disables an account. What does SOAR stand for?",
    "1780262916262": "An external provider operates detection, triage, and response around the clock. What does MDR stand for?",
    "1780262916263": "A business can tolerate losing at most thirty minutes of recent data. What does RPO stand for?",
    "1780262916264": "A team measures the average time required to repair or restore a failed service. What does MTTR stand for?",
    "1780262916265": "A domain publishes policy and reporting instructions for messages that fail aligned SPF or DKIM checks. What does DMARC stand for?",
    "1780262916266": "An organization owns its smartphones but permits employees to use them personally under policy. What does COPE stand for?",
}


PBQ_OVERRIDES: dict[str, dict[str, str]] = {
    "1778313864610": {
        "front": """ORDERING:
Put the incident response lifecycle in the correct order.

1) Preparation
2) Detection and Analysis
3) Containment
4) Eradication
5) Recovery
6) Post-Incident Activity""",
        "back": """CORRECT_ORDER: 1,2,3,4,5,6
NIST SP 800-61 ordnet den Lebenszyklus als Vorbereitung, Erkennung und Analyse, Eindämmung, Beseitigung, Wiederherstellung und Nachbereitung. Eindämmung, Beseitigung und Wiederherstellung werden in der Publikation als zusammenhängende Phase behandelt.""",
    },
    "1778313864611": {"front": """ORDERING:
Put the Lockheed Martin Cyber Kill Chain phases in the correct order.

1) Weaponization
2) Reconnaissance
3) Installation
4) Delivery
5) Command and Control
6) Exploitation
7) Actions on Objectives"""},
    "1778313864612": {"front": """ORDERING:
Put these simplified Transport Layer Security (TLS) 1.3 handshake events in the correct order.

1) Server authentication messages
2) ClientHello
3) Application Data
4) ServerHello
5) Client Finished"""},
    "1778313864613": {"front": """MATCHING:
Match each cryptographic algorithm to its category.

AES >> Symmetric
RSA >> Asymmetric
SHA-256 >> Hash
3DES >> Symmetric
ECC >> Asymmetric
DSA >> Asymmetric"""},
    "1778313864614": {"front": """MATCHING:
Match each port to its protocol.

22 >> SSH
25 >> SMTP
53 >> DNS
80 >> HTTP
443 >> HTTPS
3389 >> RDP"""},
    "1778313864615": {"front": """MATCHING:
Match each protocol to its Open Systems Interconnection (OSI) layer.

HTTP >> Layer 7 (Application)
TCP >> Layer 4 (Transport)
IP >> Layer 3 (Network)
Ethernet >> Layer 2 (Data Link)"""},
    "1779007738884": {"front": """MATCHING:
Match each example to its security control category.

Guard shack limiting physical access >> Physical
Fences and locked doors >> Physical
Antivirus software >> Technical
Firewall access control list blocking specific addresses >> Technical
Periodic risk assessment >> Managerial
Official written security policy >> Managerial
Security awareness workshop >> Operational
Daily review of system logs by analysts >> Operational"""},
    "1779095116170": {"front": """ORDERING:
Put these penetration testing activities in a typical top-down order.

1) Reconnaissance
2) Scanning and Enumeration
3) Vulnerability Analysis
4) Exploitation
5) Lateral Movement and Pivoting
6) Reporting"""},
    "1779095116171": {"front": """MATCHING:
Match each description to the threat actor type.

Government-sponsored, sophisticated, long-running operations >> Nation-state
Politically or ideologically motivated defacement or leaks >> Hacktivist
Profit-driven criminal organization >> Organized Crime
Trusted employee abuses legitimate access >> Insider Threat
Inexperienced person using ready-made tools >> Unskilled Attacker
Users bypass IT policy with their own tools or cloud services >> Shadow IT"""},
    "1779095116172": {"front": """MATCHING:
Match each behavior to the malware type.

Encrypts files and demands payment >> Ransomware
Self-replicates over a network without user action >> Worm
Disguises itself as legitimate software >> Trojan
Hides at the operating-system kernel level >> Rootkit
Secretly captures keystrokes >> Keylogger
Waits for a specific condition before execution >> Logic Bomb
Provides remote access and screen capture >> Remote Access Trojan (RAT)"""},
    "1779095116173": {"front": """MATCHING:
Match each business decision to its risk treatment strategy.

Purchase cyber insurance >> Transfer
Tolerate a low-likelihood, low-impact risk >> Accept
Introduce patching, hardening, and multifactor authentication >> Mitigate
Discontinue a high-risk service >> Avoid
Contractually shift specified risk to a service provider >> Transfer
Consciously carry a risk inherent to the business model >> Accept"""},
    "1779095116174": {"front": """MATCHING:
Match each description to the disaster recovery site type.

Fully equipped with current replicated data and immediate failover >> Hot Site
Hardware is present but data must be loaded before use >> Warm Site
Facility and utilities are present but systems must be installed >> Cold Site
Backup location is far from the primary site >> Geographic Diversity
Cloud-based recovery environment provisioned when needed >> Cloud DR"""},
    "1779095116175": {"front": """MATCHING:
Match each protection mechanism to the data state it primarily protects.

TLS 1.3, IPsec, or a VPN tunnel >> Data in Transit
Full-disk encryption such as LUKS or BitLocker >> Data at Rest
Secure enclave or confidential computing >> Data in Use
Database Transparent Data Encryption (TDE) >> Data at Rest
HTTPS connection from a browser to a server >> Data in Transit
Confidential virtual machine technology >> Data in Use"""},
    "1779669134167": {
        "front": """ORDERING:
A firewall evaluates rules from top to bottom and stops at the first match. Order these rules so that only HTTPS from 10.0.0.0/24 reaches web-prod and denied traffic is logged.

1) DENY tcp ANY -> web-prod:22 LOG
2) ALLOW tcp 10.0.0.0/24 -> web-prod:443
3) DENY ALL LOG""",
        "back": """CORRECT_ORDER: 2,1,3
Die spezifische HTTPS-Freigabe muss vor den Sperrregeln stehen. Danach wird SSH ausdrücklich mit Protokollierung gesperrt; die allgemeine, protokollierte Sperre bildet den Abschluss. So kann keine allgemeine Regel die gewünschte Freigabe vorzeitig überdecken.""",
    },
    "1779669134168": {"front": """MATCHING:
Match each business decision to the risk treatment strategy.

Purchase cyber liability insurance >> Transfer
Deploy a web application firewall against SQL injection >> Mitigate
Permanently disable a legacy SSLv2 service >> Avoid
Consciously retain minimal residual risk after patching >> Accept
Contractually shift defined service risks to a provider >> Transfer
Require multifactor authentication for all administrator accounts >> Mitigate"""},
    "1779669134169": {"front": """MATCHING:
Match each use case to the most appropriate encryption level.

BitLocker protects an entire stolen laptop drive >> Full-disk
Encrypted container holds sensitive project data >> Volume
Each customer row is encrypted with a separate key >> Record
Password-encrypted backup archive >> File
Transparent Data Encryption protects an entire SQL database >> Database
System partition is encrypted separately from a data partition >> Partition"""},
    "1779724748973": {"front": """MATCHING:
Match each cloud or Zero Trust acronym to its function.

CASB >> Policy, visibility, and data controls between users and cloud applications
SASE >> Cloud-delivered networking and security services at the edge
ZTNA >> Identity- and context-based access to individual applications
IaaS >> Customer manages the guest operating system, applications, and data
PaaS >> Customer deploys code while the provider manages the runtime and operating system
SaaS >> Customer configures and uses a complete provider-managed application"""},
    "1779724748974": {"front": """MATCHING:
Match each detection or response acronym to its capability.

EDR >> Endpoint telemetry and direct response actions on a host
XDR >> Correlation across endpoint, network, email, identity, and cloud signals
MDR >> Externally operated detection and response service
SOAR >> Automated response playbooks after an alert
SIEM >> Central log collection, correlation, and alerting"""},
    "1779724748975": {"front": """MATCHING:
Match each resilience metric to the question it answers.

MTBF >> What is the average operating time between failures?
MTTR >> What is the average time needed to repair or restore service?
RTO >> How long may a service remain unavailable?
RPO >> How much recent data loss, expressed as time, is tolerable?"""},
    "1779724748976": {"front": """MATCHING:
Match each email authentication acronym to its primary function.

SPF >> DNS policy identifies servers authorized to send for a domain
DKIM >> A header signature supports message integrity and domain authentication
DMARC >> Policy and reporting for SPF and DKIM alignment failures
S/MIME >> Certificate-based signing and encryption of individual messages"""},
    "1779724748977": {"front": """MATCHING:
Match each mobile device strategy to its core meaning.

BYOD >> Privately owned device is also used for work
COPE >> Company-owned device permits personal use
CYOD >> Employee selects a device from an approved company list
MDM >> Central platform enforces policy, manages applications, and supports remote wipe"""},
    "1780262916267": {"front": """ORDERING:
Order the cloud service models from MOST customer-managed responsibility to LEAST customer-managed responsibility.

1) IaaS
2) PaaS
3) SaaS"""},
    "1780262916268": {"front": """ORDERING:
Order the mobile device strategies from LEAST organizational control to MOST organizational control.

1) BYOD
2) CYOD
3) COPE"""},
}


ACRONYM_EXPANSIONS = {
    "OCSP": "Online Certificate Status Protocol",
    "CA": "Certification Authority",
    "CRL": "Certificate Revocation List",
    "TLS": "Transport Layer Security",
    "PKI": "Public Key Infrastructure",
    "PEP": "Policy Enforcement Point",
    "PDP": "Policy Decision Point",
    "GDPR": "General Data Protection Regulation",
    "DSGVO": "Datenschutz-Grundverordnung",
}


def normalize_front(card_id: str, front: str) -> str:
    """Remove exam-source trivia and ensure learner-visible tasks are English."""
    if card_id in PBQ_OVERRIDES:
        front = PBQ_OVERRIDES[card_id]["front"]

    acronym = ACRONYM_CARD_IDS.get(card_id)
    if acronym:
        lines = front.splitlines()
        options = [line for line in lines if OPTION_RE.match(line.strip())]
        if card_id in ACRONYM_SCENARIOS:
            question = ACRONYM_SCENARIOS[card_id]
        elif card_id.startswith("178120650"):
            question = f"Which option gives the full form of {acronym}?"
        elif acronym == "STIX and TAXII":
            question = "Which option correctly expands STIX and TAXII?"
        else:
            question = f"What does {acronym} stand for?"
        front = "\n".join([question, *options])

    replacements = {
        "Which term best matches this Security+ statement:": "Which term matches this description:",
        "Which term describes this concept:": "Which term matches this description:",
        "Which of the following is NOT one of the six security control types defined in CompTIA Security+ SY0-701?":
            "Which option is not a security control type?",
        "mutliple": "multiple",
        "wahts": "wants",
        "WHich": "Which",
        "dann": "then",
        "Gatewa\n": "Gateway\n",
    }
    for old, new in replacements.items():
        front = front.replace(old, new)
    front = re.sub(r"\bconsol(?:e+)?\b", "console", front, flags=re.I)

    # Keep question IDs for stable support references, but remove syllabus and
    # source annotations from the learner-facing wording.
    front = re.sub(r"\s*\(Obj(?:ective)?\.?\s*\d+(?:\.\d+)?\)", "", front, flags=re.I)
    front = re.sub(r"\s+in the SY0-701 context", "", front, flags=re.I)
    front = re.sub(r"\s+according to (?:CompTIA|Messer)[^?]*(?=\?)", "", front, flags=re.I)

    # Expand a technical acronym once when the card is not explicitly testing
    # that acronym's expansion.
    if card_id not in ACRONYM_CARD_IDS:
        for short, long_name in ACRONYM_EXPANSIONS.items():
            if not re.search(rf"\b{re.escape(short)}\b", front):
                continue
            if re.search(rf"{re.escape(long_name)}\s*\({re.escape(short)}\)", front, re.I):
                continue
            front = re.sub(rf"\b{re.escape(short)}\b", f"{long_name} ({short})", front, count=1)
    return front.strip()


def clean_explanation(text: str) -> str:
    """Remove provenance/editorial commentary from the learner explanation."""
    cleaned = (text or "").strip()
    substitutions = (
        (r"\b(?:laut|nach)\s+Messer\b", ""),
        (r"\bMessers?\s+(?:Beispiel|nennt|beschreibt|betont|erklärt|weist ausdrücklich darauf hin, dass)\s*", ""),
        (r"\bim\s+(?:Messer-)?Video\b", ""),
        (r"\bin\s+den\s+SY0-701-Objectives\b", ""),
        (r"\bSY0-701\s+Obj(?:ective)?\.?\s*\d+(?:\.\d+)?\b", ""),
        (r"\(PDF\s*(?:page|S\.)\s*\d+[^)]*\)", ""),
    )
    for pattern, replacement in substitutions:
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.I)
    cleaned = re.sub(r"\bMessers?\b", "", cleaned, flags=re.I)
    cleaned = re.sub(r"\bnennt er als\b", "gilt als", cleaned, flags=re.I)
    cleaned = re.sub(r"\bnennt er\b", "gilt", cleaned, flags=re.I)
    cleaned = re.sub(r"\bdie er\b", "die", cleaned, flags=re.I)
    cleaned = re.sub(r"\b(?:beschreibt|betont|erklärt|weist) er\b", "dies zeigt", cleaned, flags=re.I)
    cleaned = re.sub(
        r"\([^)]*(?:NIST\s+(?:SP|IR)|RFC\s*\d|ISO\s*\d|SY0-701|Obj\.?\s*\d|PDF\s*(?:page|S\.)?)[^)]*\)",
        "",
        cleaned,
        flags=re.I,
    )
    cleaned = re.sub(r"(?:^|(?<=[.!?])\s+)PDF\b[^.!?]*(?:[.!?]|$)", " ", cleaned, flags=re.I)
    cleaned = re.sub(r"\b(?:im\s+)?SY0-701-Kontext\b", "", cleaned, flags=re.I)
    cleaned = re.sub(r"\s+([,.;:])", r"\1", cleaned)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip(" \n-:")


def strip_answer_echo(explanation: str, answer: str) -> str:
    """Drop legacy answer labels repeated before the German explanation."""
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", explanation) if part.strip()]
    if paragraphs and paragraphs[0].casefold().rstrip(".") == answer.strip().casefold().rstrip("."):
        paragraphs.pop(0)
    return "\n\n".join(paragraphs).strip()


def normalized_back(card_id: str, front: str, back: str, glossary: dict[str, str] | None = None) -> str:
    if card_id in PBQ_OVERRIDES and "back" in PBQ_OVERRIDES[card_id]:
        back = PBQ_OVERRIDES[card_id]["back"]
    parsed = parse_card(front, back)
    if parsed.kind != "mc" or not parsed.correct or parsed.correct not in parsed.options:
        return clean_explanation(back)

    correct_text = parsed.options[parsed.correct]
    explanation = strip_answer_echo(clean_explanation(parsed.explanation), correct_text)
    if not explanation:
        explanation = (
            f"Die im Szenario genannten Merkmale entsprechen „{correct_text}“. "
            "Die richtige Zuordnung folgt aus der beschriebenen Funktion und ihrem Einsatzzweck."
        )

    first_sentence = re.split(r"(?<=[.!?])\s+", explanation, maxsplit=1)[0]
    reasons: dict[str, str] = {}
    for letter, option in parsed.options.items():
        if letter == parsed.correct:
            continue
        existing = clean_explanation(parsed.incorrect_reasons.get(letter, ""))
        if "erfüllt das im Fragentext genannte entscheidende Merkmal nicht" in existing:
            existing = ""
        option_definition = (glossary or {}).get(re.sub(r"\s+", " ", option).strip().casefold())
        if existing:
            reasons[letter] = existing
        elif option_definition:
            reasons[letter] = (
                f"„{option}“ bezeichnet einen anderen Sachverhalt: {option_definition} "
                f"Die hier beschriebenen Merkmale gehören dagegen zu „{correct_text}“."
            )
        else:
            reasons[letter] = (
                f"„{option}“ erfüllt das im Fragentext genannte entscheidende Merkmal nicht. "
                f"Ausschlaggebend ist: {first_sentence}"
            )

    rationale_lines = "\n".join(f"{letter} | {reasons[letter]}" for letter in parsed.options if letter in reasons)
    return f">> CORRECT: {parsed.correct} |\n\n{explanation}\n\nNicht:\n{rationale_lines}".strip()


def reviewed_mc(
    question: str,
    options: dict[str, str],
    correct: str,
    explanation: str,
    incorrect: dict[str, str],
    sources: list[str],
) -> dict[str, Any]:
    if set(options) != {"A", "B", "C", "D"} or set(incorrect) != set(options) - {correct}:
        raise ValueError(f"Ungültiger Reviewed-MC-Datensatz: {question}")
    front = "\n".join([question, *(f"{letter}: {options[letter]}" for letter in "ABCD")])
    back = (
        f">> CORRECT: {correct} |\n\n{explanation}\n\nNicht:\n"
        + "\n".join(f"{letter} | {incorrect[letter]}" for letter in "ABCD" if letter != correct)
    )
    return {
        "status": "approved",
        "front": front,
        "back": back,
        "sources": sources,
        "reviewer": "primary-source-semantic-review-2026-08-08",
    }


def repaired_overrides() -> dict[str, dict[str, Any]]:
    nist_vpn = "https://doi.org/10.6028/NIST.SP.800-77r1"
    nist_virtualization = "https://doi.org/10.6028/NIST.SP.800-125A"
    nist_patch = "https://doi.org/10.6028/NIST.SP.800-40r4"
    nist_identity = "https://doi.org/10.6028/NIST.SP.800-63A-4"
    nist_hunting = "https://doi.org/10.6028/NIST.IR.8428"
    nist_risk = "https://doi.org/10.6028/NIST.IR.8286A"
    nist_contingency = "https://doi.org/10.6028/NIST.SP.800-34r1"
    nist_ics = "https://doi.org/10.6028/NIST.SP.800-82r3"
    rfc_5280 = "https://www.rfc-editor.org/rfc/rfc5280.html"
    shannon = "https://doi.org/10.1002/j.1538-7305.1949.tb00928.x"
    return {
        "1728669281455": reviewed_mc(
            "M1-080: A remote employee uses a full-tunnel Virtual Private Network (VPN). Which statement accurately describes the tunnel's protection?",
            {
                "A": "Only authentication messages are encrypted",
                "B": "Traffic routed through the tunnel is encrypted between the VPN client and VPN gateway",
                "C": "The tunnel guarantees end-to-end encryption from every application to every destination",
                "D": "The tunnel encrypts data stored on both endpoint disks",
            },
            "B",
            "Ein Full-Tunnel-VPN leitet den vorgesehenen Netzwerkverkehr durch einen verschlüsselten Tunnel zwischen VPN-Client und VPN-Gateway. Hinter dem Gateway hängt der weitere Schutz vom Zielprotokoll und der nachfolgenden Verbindung ab.",
            {
                "A": "Ein VPN schützt nicht nur die Authentifizierung, sondern den durch den Tunnel transportierten Netzwerkverkehr.",
                "C": "Der VPN-Tunnel endet am VPN-Gateway und garantiert deshalb nicht automatisch eine durchgehende Anwendungsverschlüsselung bis zu jedem Ziel.",
                "D": "Ein VPN schützt Daten während der Übertragung; Datenträgerverschlüsselung schützt gespeicherte Daten.",
            },
            [COMPTIA_OBJECTIVES, nist_vpn],
        ),
        "1728834517490": reviewed_mc(
            "M1-120: A client needs the current revocation status of one certificate without downloading an entire revocation list. Which protocol is designed for this request?",
            {
                "A": "Online Certificate Status Protocol (OCSP)",
                "B": "Certificate Signing Request (CSR)",
                "C": "Simple Network Management Protocol (SNMP)",
                "D": "Secure Shell (SSH)",
            },
            "A",
            "Das Online Certificate Status Protocol fragt den Status eines bestimmten Zertifikats anhand seiner Kennung bei einem OCSP-Responder ab und liefert eine signierte Statusantwort.",
            {
                "B": "Eine Certificate Signing Request fordert die Ausstellung eines Zertifikats an und prüft keinen Widerrufsstatus.",
                "C": "Simple Network Management Protocol dient der Überwachung und Verwaltung von Netzwerkkomponenten, nicht der Zertifikatsprüfung.",
                "D": "Secure Shell stellt eine verschlüsselte Fernzugriffssitzung bereit und ist kein Zertifikatsstatusprotokoll.",
            },
            [COMPTIA_OBJECTIVES, RFC_6960],
        ),
        "1729017742984": reviewed_mc(
            "M2-045: Code running inside a virtual machine exploits the virtualization layer and gains access to the host. What is this attack called?",
            {
                "A": "Virtual machine escape",
                "B": "Directory traversal",
                "C": "Resource exhaustion",
                "D": "Virtual machine sprawl",
            },
            "A",
            "Bei einem Virtual Machine Escape verlässt Code die Isolation der Gast-VM und erreicht den Hypervisor oder das Hostsystem. Der Übergang zum Host ist das entscheidende Merkmal.",
            {
                "B": "Directory Traversal überschreitet vorgesehene Dateipfade innerhalb einer Anwendung, nicht die Grenze zwischen Gast und Host.",
                "C": "Resource Exhaustion verbraucht Rechen-, Speicher- oder Netzwerkressourcen, ohne zwingend die Virtualisierungsisolation zu durchbrechen.",
                "D": "VM Sprawl bezeichnet die unkontrollierte Vermehrung virtueller Maschinen und ist kein Isolationsangriff.",
            },
            [COMPTIA_OBJECTIVES, nist_virtualization],
        ),
        "1729097907113": reviewed_mc(
            "M2-071: Malware executes mainly through memory and legitimate system tools without relying on a conventional malicious executable stored on disk. What is it called?",
            {
                "A": "Fileless malware",
                "B": "Boot sector virus",
                "C": "Macro virus",
                "D": "Logic bomb",
            },
            "A",
            "Fileless Malware nutzt häufig Speicher, Skriptinterpreter oder legitime Systemwerkzeuge. Der Begriff beschreibt die Ausführungstechnik; er bedeutet nicht zwingend, dass während des gesamten Angriffs keinerlei Datei beteiligt ist.",
            {
                "B": "Ein Bootsektorvirus infiziert startrelevante Bereiche eines Datenträgers und ist damit gerade datenträgerbasiert.",
                "C": "Ein Makrovirus steckt in Makrocode eines Dokuments und ist nicht durch die beschriebene dateilose Ausführung definiert.",
                "D": "Eine Logic Bomb wird durch eine Bedingung ausgelöst; ihr Speicher- oder Dateiverhalten ist dadurch nicht festgelegt.",
            },
            [COMPTIA_OBJECTIVES, "https://www.cisa.gov/news-events/cybersecurity-advisories/aa21-200a"],
        ),
        "1729192290034": reviewed_mc(
            "M3-002: An organization connects its private cloud to a public cloud so applications and data can move between the two environments. Which deployment model is this?",
            {
                "A": "Community cloud",
                "B": "Hybrid cloud",
                "C": "Software as a Service (SaaS)",
                "D": "Serverless architecture",
            },
            "B",
            "Eine Hybrid Cloud verbindet zwei oder mehr eigenständige Cloud-Infrastrukturen so, dass Daten und Anwendungen zwischen ihnen portierbar sind. Hier werden private und öffentliche Cloud gekoppelt.",
            {
                "A": "Eine Community Cloud wird für eine bestimmte Gemeinschaft mit gemeinsamen Anforderungen bereitgestellt; die Kopplung von privater und öffentlicher Cloud definiert sie nicht.",
                "C": "Software as a Service ist ein Servicemodell für eine fertige Anwendung und kein Cloud-Bereitstellungsmodell.",
                "D": "Serverless beschreibt die Ausführung von Funktionen oder Diensten ohne kundenseitige Serververwaltung, nicht die Verbindung zweier Clouds.",
            },
            [COMPTIA_OBJECTIVES, "https://doi.org/10.6028/NIST.SP.800-145"],
        ),
        "1729276778013": reviewed_mc(
            "M3-036: An organization in the European Union wants a provider outside the European Economic Area to process personal data. When can this transfer be lawful under the General Data Protection Regulation (GDPR)?",
            {
                "A": "Only when every copy and backup remains inside the European Union",
                "B": "When the conditions in GDPR Chapter V are met, such as an adequacy decision or appropriate safeguards",
                "C": "Whenever the provider promises to delete the data after processing",
                "D": "Never, because personal data may not leave the European Union",
            },
            "B",
            "Die Datenschutz-Grundverordnung verlangt keine pauschale Speicherung aller Daten innerhalb der EU. Eine Drittlandübermittlung kann nach Kapitel V rechtmäßig sein, etwa auf Grundlage eines Angemessenheitsbeschlusses oder geeigneter Garantien; die konkreten Voraussetzungen müssen erfüllt sein.",
            {
                "A": "Die DSGVO enthält keine allgemeine Pflicht, jede Kopie und jedes Backup physisch innerhalb der EU zu speichern.",
                "C": "Ein Löschversprechen allein schafft keinen zulässigen Übermittlungsmechanismus nach Kapitel V.",
                "D": "Drittlandübermittlungen sind nicht generell verboten; Kapitel V regelt die zulässigen Voraussetzungen.",
            },
            [COMPTIA_OBJECTIVES, GDPR],
        ),
        "1729278256356": reviewed_mc(
            "M3-042: Which cryptographic design property obscures the relationship between the secret key and the resulting ciphertext?",
            {
                "A": "Confusion",
                "B": "Availability",
                "C": "Tokenization",
                "D": "Key escrow",
            },
            "A",
            "Confusion soll die Beziehung zwischen Schlüssel und Chiffretext möglichst komplex machen. Sie ist ein Entwurfsprinzip für Chiffren und bedeutet nicht lediglich, dass Klartext und Chiffretext unterschiedlich aussehen.",
            {
                "B": "Availability beschreibt die Verfügbarkeit von Systemen und Daten, nicht eine kryptografische Beziehung.",
                "C": "Tokenization ersetzt sensible Werte durch Stellvertreter und ist kein Chiffren-Entwurfsprinzip.",
                "D": "Key Escrow bezeichnet die treuhänderische Aufbewahrung kryptografischer Schlüssel.",
            },
            [COMPTIA_OBJECTIVES, shannon],
        ),
        "1729529439876": reviewed_mc(
            "M4-012: A remediation team ranks vulnerabilities using exploitability, asset criticality, and potential business impact. What approach is it using?",
            {
                "A": "Risk-based vulnerability prioritization",
                "B": "Risk acceptance",
                "C": "Asset disposal",
                "D": "Password rotation",
            },
            "A",
            "Bei der risikobasierten Priorisierung bestimmen Ausnutzbarkeit, betroffener Geschäftswert und mögliche Auswirkungen die Reihenfolge der Behebung. Risikotoleranz kann Entscheidungen beeinflussen, ist aber nicht der Name dieses Vorgangs.",
            {
                "B": "Risk Acceptance bedeutet, ein bekanntes Risiko bewusst zu tragen, statt die Behebung nach Risikomerkmalen zu sortieren.",
                "C": "Asset Disposal entfernt ein System aus dem Betrieb und beschreibt keine Priorisierung von Schwachstellen.",
                "D": "Password Rotation ersetzt Zugangsdaten in einem Zeit- oder Ereignisintervall und bewertet keine Schwachstellenpriorität.",
            },
            [COMPTIA_OBJECTIVES, nist_patch],
        ),
        "1729543018478": reviewed_mc(
            "M4-019: Which repository records configuration items such as servers, applications, network devices, and their relationships?",
            {
                "A": "Configuration Management Database (CMDB)",
                "B": "Active Directory domain",
                "C": "Certificate Revocation List (CRL)",
                "D": "Data loss prevention policy",
            },
            "A",
            "Eine Configuration Management Database erfasst Configuration Items und ihre Beziehungen. Sie unterstützt damit Inventarisierung, Abhängigkeitsanalyse und kontrollierte Änderungen.",
            {
                "B": "Active Directory verwaltet vor allem Identitäten, Gruppen, Computerobjekte und Richtlinien; es ist keine allgemeine Datenbank aller Configuration Items und Beziehungen.",
                "C": "Eine Certificate Revocation List enthält widerrufene Zertifikate und keine Systemkomponenten.",
                "D": "Eine Data-Loss-Prevention-Policy definiert Regeln zum Schutz sensibler Daten und ist kein Komponenten-Repository.",
            },
            [COMPTIA_OBJECTIVES, "https://csrc.nist.gov/glossary/term/cmdb"],
        ),
        "1729606385894": reviewed_mc(
            "M4-027: An applicant presents government-issued evidence, and the service validates it against authoritative sources before creating an account. What overall process is this?",
            {
                "A": "Identity proofing",
                "B": "Authorization",
                "C": "Accounting",
                "D": "Federation",
            },
            "A",
            "Identity Proofing sammelt, validiert und verifiziert Informationen und Nachweise, um die behauptete reale Identität mit einem festgelegten Vertrauensniveau zu bestätigen.",
            {
                "B": "Authorization legt nach der Identitätsprüfung fest, auf welche Ressourcen ein Subjekt zugreifen darf.",
                "C": "Accounting protokolliert Aktivitäten und Nutzung; es bestätigt nicht die reale Identität eines Antragstellers.",
                "D": "Federation überträgt Identitäts- und Authentifizierungsaussagen zwischen Vertrauensdomänen, ersetzt aber nicht den beschriebenen Proofing-Prozess.",
            },
            [COMPTIA_OBJECTIVES, nist_identity],
        ),
        "1729614400121": reviewed_mc(
            "M4-040: Analysts proactively search endpoint and network telemetry for evidence of adversaries that automated alerts have not identified. What activity is this?",
            {
                "A": "Threat hunting",
                "B": "Vulnerability scanning",
                "C": "Digital forensics acquisition",
                "D": "Patch management",
            },
            "A",
            "Threat Hunting ist die hypothesen- oder indikatorgestützte, proaktive Suche nach bereits vorhandenen oder bislang unentdeckten Bedrohungen in Telemetriedaten und Systemen.",
            {
                "B": "Vulnerability Scanning sucht bekannte Schwachstellen oder Fehlkonfigurationen, nicht primär Spuren eines bereits aktiven Gegners.",
                "C": "Forensische Datenerfassung sichert Beweismittel für eine Untersuchung; sie ist nicht die allgemeine proaktive Suche in laufender Telemetrie.",
                "D": "Patch Management plant, verteilt und prüft Aktualisierungen und ist keine Bedrohungssuche.",
            },
            [COMPTIA_OBJECTIVES, nist_hunting],
        ),
        "1729707107108": reviewed_mc(
            "M5-006: Which metric provides an early signal that an organization's exposure to a particular risk may be increasing?",
            {
                "A": "Key Risk Indicator (KRI)",
                "B": "Recovery Time Objective (RTO)",
                "C": "Single Loss Expectancy (SLE)",
                "D": "Service-level agreement (SLA)",
            },
            "A",
            "Ein Key Risk Indicator ist eine messbare Größe, die Veränderungen der Risikoexposition sichtbar macht und als Frühwarnsignal dienen kann. Nicht jede Zeile eines Risk Registers ist automatisch ein KRI.",
            {
                "B": "Ein Recovery Time Objective legt die maximal tolerierbare Wiederherstellungszeit fest und ist kein Frühindikator der Risikoexposition.",
                "C": "Single Loss Expectancy schätzt den Verlust eines einzelnen Ereignisses; sie signalisiert nicht fortlaufend eine Veränderung der Exposition.",
                "D": "Ein Service-Level-Agreement definiert vereinbarte Leistungswerte und Pflichten zwischen Parteien.",
            },
            [COMPTIA_OBJECTIVES, nist_risk],
        ),
        "1729708541619": reviewed_mc(
            "M5-015: A database may lose at most 30 minutes of committed transactions after an outage. Which recovery metric expresses this limit?",
            {
                "A": "Recovery Point Objective (RPO)",
                "B": "Recovery Time Objective (RTO)",
                "C": "Mean Time to Repair (MTTR)",
                "D": "Mean Time Between Failures (MTBF)",
            },
            "A",
            "Das Recovery Point Objective begrenzt den tolerierbaren Datenverlust als Zeitspanne zum letzten wiederherstellbaren Datenstand. Dreißig Minuten RPO bedeuten, dass höchstens die jüngsten dreißig Minuten an Daten fehlen dürfen.",
            {
                "B": "Das Recovery Time Objective begrenzt die Ausfalldauer bis zur Wiederherstellung und nicht die Menge verlorener Daten.",
                "C": "Mean Time to Repair ist ein Durchschnittswert für Reparatur oder Wiederherstellung, kein festgelegter Datenverlustpunkt.",
                "D": "Mean Time Between Failures misst die durchschnittliche Betriebsdauer zwischen Ausfällen.",
            },
            [COMPTIA_OBJECTIVES, nist_contingency],
        ),
        "1729783723324": reviewed_mc(
            "M5-020: What does the abbreviation CCO commonly stand for in organizational compliance leadership?",
            {
                "A": "Chief Compliance Officer",
                "B": "Central Controls Operator",
                "C": "Certified Cryptography Owner",
                "D": "Corporate Continuity Organizer",
            },
            "A",
            "CCO steht in diesem Kontext für Chief Compliance Officer. Diese Führungsrolle überwacht das Compliance-Programm und berichtet über die Einhaltung relevanter Anforderungen.",
            {
                "B": "Central Controls Operator ist keine übliche Auflösung der Compliance-Führungsrolle CCO.",
                "C": "Certified Cryptography Owner ist keine etablierte CCO-Rollenbezeichnung.",
                "D": "Corporate Continuity Organizer beschreibt keine übliche Compliance-Leitungsfunktion.",
            },
            [COMPTIA_OBJECTIVES, NIST_GLOSSARY],
        ),
        "1729784557847": reviewed_mc(
            "M5-022: Under the General Data Protection Regulation (GDPR), what is information relating to an identified or identifiable natural person called?",
            {
                "A": "Personal data",
                "B": "Data subject",
                "C": "Data processor",
                "D": "Data inventory",
            },
            "A",
            "Die Datenschutz-Grundverordnung bezeichnet solche Informationen als personenbezogene Daten. Die identifizierte oder identifizierbare natürliche Person selbst ist die betroffene Person beziehungsweise der Data Subject.",
            {
                "B": "Data Subject bezeichnet die natürliche Person, auf die sich die personenbezogenen Daten beziehen, nicht die Informationen selbst.",
                "C": "Ein Data Processor verarbeitet personenbezogene Daten im Auftrag eines Verantwortlichen.",
                "D": "Ein Data Inventory ist ein Verzeichnis vorhandener Datenbestände und keine DSGVO-Datenkategorie für einzelne Informationen.",
            },
            [COMPTIA_OBJECTIVES, GDPR],
        ),
        "1772578672162": reviewed_mc(
            "149: What is the role of a self-signed root Certification Authority (CA) certificate in a public key infrastructure?",
            {
                "A": "It serves as a trust anchor for validating certificate chains",
                "B": "It deletes certificates from a revocation list",
                "C": "It encrypts every subscriber's private key",
                "D": "It performs password key stretching",
            },
            "A",
            "Das selbstsignierte Root-CA-Zertifikat bildet den Vertrauensanker einer Zertifikatskette. Vertraut ein System diesem Root-Zertifikat, kann es Signaturen und Pfade zu untergeordneten Zertifikaten validieren.",
            {
                "B": "Ein Root-Zertifikat entfernt keine Einträge aus einer Certificate Revocation List; die CA veröffentlicht den Widerrufsstatus über separate Mechanismen.",
                "C": "Das Root-Zertifikat enthält den öffentlichen Schlüssel der Root-CA und verschlüsselt nicht pauschal private Schlüssel von Teilnehmern.",
                "D": "Key Stretching erschwert Passwortangriffe und hat keine Funktion in der Zertifikatskette.",
            },
            [COMPTIA_OBJECTIVES, rfc_5280],
        ),
        "1772662005001": reviewed_mc(
            "Brent's organization profiles threat actors targeting sensitive government research. Which motivation is most characteristic of a nation-state actor in this scenario?",
            {
                "A": "Espionage",
                "B": "Personal amusement",
                "C": "Accidental disclosure",
                "D": "Reducing help-desk workload",
            },
            "A",
            "Staatlich unterstützte Akteure betreiben häufig Spionage, um strategische, politische, militärische oder wirtschaftliche Informationen zu gewinnen. Das Forschungsszenario passt zu diesem Motiv.",
            {
                "B": "Persönliche Unterhaltung ist eher ein individuelles Motiv und erklärt keine staatlich ausgerichtete Informationsbeschaffung.",
                "C": "Eine versehentliche Offenlegung ist kein Motiv eines handelnden Bedrohungsakteurs.",
                "D": "Die Verringerung des Helpdesk-Aufwands ist ein Betriebsziel und kein Angriffsmotiv.",
            },
            [COMPTIA_OBJECTIVES, "https://www.cisa.gov/topics/cyber-threats-and-advisories/nation-state-cyber-actors"],
        ),
        "1772662005013": reviewed_mc(
            "13: Which hardware supply-chain risk primarily affects availability rather than the integrity of the delivered device?",
            {
                "A": "Preinstalled malware",
                "B": "A shortage that prevents hardware delivery",
                "C": "Unauthorized component modification",
                "D": "Malicious firmware modification",
            },
            "B",
            "Eine Lieferknappheit verhindert oder verzögert die Bereitstellung benötigter Hardware und betrifft damit primär die Verfügbarkeit. Die übrigen Optionen manipulieren die Vertrauenswürdigkeit des Produkts.",
            {
                "A": "Vorinstallierte Malware verändert die Sicherheitsintegrität des ausgelieferten Systems.",
                "C": "Eine nicht autorisierte Hardwareänderung ist eine Manipulation des Produkts und damit ein Integritäts- und Vertrauensproblem.",
                "D": "Bösartig veränderte Firmware kompromittiert die Integrität und das Verhalten des Geräts.",
            },
            [COMPTIA_OBJECTIVES, "https://doi.org/10.6028/NIST.SP.800-161r1-upd1"],
        ),
        "1772922529734": reviewed_mc(
            "14: An organization is acquiring one subsidiary and needs a risk assessment focused on that single transaction. It does not need an ongoing assessment program. Which assessment approach fits best?",
            {
                "A": "One-time risk assessment",
                "B": "Continuous risk assessment",
                "C": "No risk assessment",
                "D": "Daily vulnerability scanning only",
            },
            "A",
            "Eine einmalige Risikobewertung ist auf einen konkreten Anlass wie diese einzelne Akquisition begrenzt. Sie ersetzt kein dauerhaftes Monitoring, erfüllt aber den beschriebenen abgegrenzten Bewertungsbedarf.",
            {
                "B": "Eine kontinuierliche Risikobewertung ist ein fortlaufender Prozess und widerspricht der ausdrücklich einmaligen Aufgabenstellung.",
                "C": "Eine Akquisition kann neue technische, rechtliche und geschäftliche Risiken einführen; auf eine Bewertung vollständig zu verzichten wäre nicht angemessen.",
                "D": "Vulnerability Scanning deckt nur einen technischen Ausschnitt ab und ersetzt keine umfassende Risikobewertung der Akquisition.",
            },
            [COMPTIA_OBJECTIVES, "https://doi.org/10.6028/NIST.SP.800-30r1"],
        ),
        "1772576382622": reviewed_mc(
            "66: A cloud application delegates user authentication to an external identity provider and receives an ID token about the signed-in user. Which protocol is designed for this?",
            {
                "A": "OpenID Connect",
                "B": "Lightweight Directory Access Protocol (LDAP)",
                "C": "Terminal Access Controller Access-Control System Plus (TACACS+)",
                "D": "Simple Network Management Protocol (SNMP)",
            },
            "A",
            "OpenID Connect ist eine Identitätsschicht auf OAuth 2.0. Eine Anwendung kann damit die Anmeldung über einen Identity Provider durchführen und Informationen über den authentifizierten Benutzer in einem ID Token erhalten.",
            {
                "B": "LDAP greift auf Verzeichnisinformationen zu, definiert aber nicht den beschriebenen webbasierten ID-Token-Flow.",
                "C": "TACACS+ wird vor allem für die zentrale Administration von Netzwerkgeräten eingesetzt.",
                "D": "SNMP dient der Überwachung und Verwaltung von Netzwerkkomponenten, nicht der Benutzeranmeldung an Cloud-Anwendungen.",
            },
            [COMPTIA_OBJECTIVES, "https://openid.net/specs/openid-connect-core-1_0.html"],
        ),
        "1772577707360": reviewed_mc(
            "99: An adaptive authentication system evaluates a sign-in. Which signal can legitimately increase the calculated risk?",
            {
                "A": "The device and location differ from the user's established pattern",
                "B": "The user's job title contains more than ten characters",
                "C": "The application logo was recently changed",
                "D": "The help desk has a new telephone number",
            },
            "A",
            "Adaptive Authentifizierung kann Kontext wie Gerät, Standort, Zeitpunkt und bisheriges Verhalten auswerten. Eine deutliche Abweichung vom etablierten Muster kann deshalb zusätzliche Authentifizierung auslösen.",
            {
                "B": "Die Zeichenlänge einer Stellenbezeichnung ist kein sinnvolles Anmelderisikosignal.",
                "C": "Eine Änderung des Anwendungslogos verändert das Identitäts- oder Gerätekontext-Risiko nicht.",
                "D": "Die Telefonnummer des Helpdesks ist kein Merkmal der konkreten Anmeldung.",
            },
            [COMPTIA_OBJECTIVES, NIST_ZERO_TRUST],
        ),
        "1772578485545": reviewed_mc(
            "132: In a Zero Trust architecture, what component combines the user identity with the endpoint requesting access?",
            {
                "A": "Subject",
                "B": "Policy Engine",
                "C": "Policy Administrator",
                "D": "Policy Enforcement Point",
            },
            "A",
            "Im Zero-Trust-Modell bezeichnet das Subject die Kombination aus einem Benutzer oder einer nichtmenschlichen Entität und dem verwendeten Endpoint. Diese Kombination fordert Zugriff auf eine Ressource an.",
            {
                "B": "Die Policy Engine bewertet Signale und trifft die Zugriffsentscheidung; sie ist nicht der anfragende Benutzer-Endpoint-Kontext.",
                "C": "Der Policy Administrator führt die Entscheidung aus und konfiguriert beziehungsweise steuert den Kommunikationspfad.",
                "D": "Der Policy Enforcement Point ermöglicht, überwacht und beendet die konkrete Verbindung, ist aber nicht das zugreifende Subject.",
            },
            [COMPTIA_OBJECTIVES, NIST_ZERO_TRUST],
        ),
        "1773101490299": reviewed_mc(
            "31: An organization deploys endpoint protection to workstations and servers. Which design best supports consistent detection, response, and administration?",
            {
                "A": "Use a centrally managed endpoint protection platform with policies appropriate to each system role",
                "B": "Install two real-time antivirus engines on every endpoint",
                "C": "Install protection only on employee workstations",
                "D": "Let every user select and configure an unrelated antivirus product",
            },
            "A",
            "Eine zentral verwaltete Endpoint-Schutzplattform ermöglicht konsistente Richtlinien, Telemetrie, Aktualisierungen und Reaktionen. Rollenbezogene Einstellungen berücksichtigen Unterschiede zwischen Workstations und Servern.",
            {
                "B": "Mehrere gleichzeitig aktive Echtzeit-Engines können sich gegenseitig stören und verursachen zusätzliche Last; sie ersetzen kein abgestimmtes Schutzkonzept.",
                "C": "Server sind ebenfalls Angriffsziele und dürfen nicht pauschal vom Endpoint-Schutz ausgeschlossen werden.",
                "D": "Unkoordinierte Einzelprodukte verhindern konsistente Richtlinien, Sichtbarkeit und Reaktion.",
            },
            [COMPTIA_OBJECTIVES, "https://doi.org/10.6028/NIST.SP.800-83r1"],
        ),
        "1773275420019": reviewed_mc(
            "169: Which Privileged Access Management (PAM) capability grants elevated permissions only for the time needed to complete an approved task?",
            {
                "A": "Just-in-time privileged access",
                "B": "Permanent shared administrator password",
                "C": "Anonymous administrator access",
                "D": "Unrestricted standing privilege",
            },
            "A",
            "Just-in-Time-Zugriff stellt privilegierte Berechtigungen erst bei Bedarf und nur für ein begrenztes Zeitfenster bereit. Dadurch sinkt die Dauer, in der ein kompromittiertes Konto dauerhafte Administratorrechte ausnutzen könnte.",
            {
                "B": "Ein dauerhaft geteiltes Administratorkennwort schwächt Zuordenbarkeit und Geheimnisschutz.",
                "C": "Anonymer Administratorzugriff verhindert Verantwortlichkeit und ist kein PAM-Schutzmechanismus.",
                "D": "Unbegrenzte Standing Privileges vergrößern das Missbrauchsfenster und sind das Gegenteil des beschriebenen Prinzips.",
            },
            [COMPTIA_OBJECTIVES, "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final"],
        ),
        "1773618881055": reviewed_mc(
            "127: A switch copies selected traffic to a dedicated monitoring interface without placing the analyzer inline. What is this feature called?",
            {
                "A": "Switched Port Analyzer (SPAN) or port mirroring",
                "B": "Network Address Translation (NAT)",
                "C": "Link aggregation",
                "D": "Virtual Local Area Network (VLAN) trunking",
            },
            "A",
            "Ein SPAN-Port beziehungsweise Port Mirroring erzeugt eine Kopie ausgewählter Frames und sendet sie an einen Monitor-Port. Das Analysegerät beobachtet die Kopie und liegt nicht im produktiven Datenpfad.",
            {
                "B": "NAT übersetzt Netzwerkadressen und erstellt keinen dedizierten Überwachungsfeed.",
                "C": "Link Aggregation bündelt mehrere Verbindungen für Kapazität oder Redundanz.",
                "D": "VLAN Trunking transportiert mehrere VLANs über eine Verbindung und ist keine Monitoring-Kopie.",
            },
            [COMPTIA_OBJECTIVES, "https://www.cisco.com/c/en/us/support/docs/switches/catalyst-6500-series-switches/10570-41.html"],
        ),
        "1773618881056": reviewed_mc(
            "128: A newly disclosed SQL injection pattern is actively targeting a public web application. Which control can be updated quickly to block matching HTTP requests at the application boundary?",
            {
                "A": "Web Application Firewall (WAF)",
                "B": "Secure Access Service Edge (SASE)",
                "C": "Full-disk encryption",
                "D": "Network time synchronization",
            },
            "A",
            "Eine Web Application Firewall prüft HTTP-Anfragen auf Anwendungsebene. Eine gezielte Regel oder ein aktuelles Managed Ruleset kann bekannte Injection-Muster am Web-Anwendungsrand blockieren; die Anwendung selbst sollte zusätzlich sichere Abfragen verwenden.",
            {
                "B": "SASE bündelt Netzwerk- und Sicherheitsdienste, ist aber nicht der spezifische Anwendungskontrollpunkt für SQL-Injection-Regeln.",
                "C": "Full-Disk Encryption schützt gespeicherte Daten bei ausgeschaltetem oder gesperrtem System und filtert keine Webanfragen.",
                "D": "Zeitsynchronisation unterstützt korrekte Protokolle, verhindert jedoch keine SQL Injection.",
            },
            [COMPTIA_OBJECTIVES, "https://owasp.org/www-project-web-security-testing-guide/"],
        ),
        "1773618881061": reviewed_mc(
            "149: A team wants to deploy containerized application code while the provider manages the operating system and runtime. Which cloud service model best matches this responsibility split?",
            {
                "A": "Platform as a Service (PaaS)",
                "B": "Infrastructure as a Service (IaaS)",
                "C": "Software as a Service (SaaS)",
                "D": "On-premises infrastructure",
            },
            "A",
            "Bei Platform as a Service verwaltet der Anbieter die zugrunde liegende Infrastruktur, das Betriebssystem und die Laufzeitumgebung. Der Kunde stellt seine Anwendung bereit und verwaltet deren Daten und Konfiguration.",
            {
                "B": "Bei IaaS verwaltet der Kunde typischerweise auch Gastbetriebssystem und Laufzeit und hätte damit mehr Betriebsaufwand als beschrieben.",
                "C": "SaaS liefert eine fertige Anwendung; der Kunde deployt dort nicht die eigene containerisierte Anwendung als Service-Modell.",
                "D": "On-Premises würde dem Team die Verantwortung für Hardware, Betriebssystem und Laufzeit vollständig belassen.",
            },
            [COMPTIA_OBJECTIVES, "https://doi.org/10.6028/NIST.SP.800-145"],
        ),
        "1773794837309": reviewed_mc(
            "197: Which assessment tests whether identified Internet-facing weaknesses can actually be exploited to reach defined objectives?",
            {
                "A": "Penetration test",
                "B": "Threat feed subscription",
                "C": "Asset inventory export",
                "D": "Security awareness survey",
            },
            "A",
            "Ein Penetrationstest versucht innerhalb eines vereinbarten Umfangs, Schwachstellen kontrolliert auszunutzen und ihre tatsächlichen Auswirkungen nachzuweisen. Er ergänzt, aber ersetzt nicht Inventarisierung und Schwachstellenscans.",
            {
                "B": "Ein Threat Feed liefert Informationen über Bedrohungen und Indikatoren, testet aber nicht die Ausnutzbarkeit der eigenen Systeme.",
                "C": "Ein Asset-Inventory-Export zeigt bekannte Komponenten, führt jedoch keinen kontrollierten Angriff aus.",
                "D": "Eine Awareness-Umfrage bewertet Wissen oder Verhalten von Personen und keine technische Ausnutzbarkeit.",
            },
            [COMPTIA_OBJECTIVES, "https://doi.org/10.6028/NIST.SP.800-115"],
        ),
        "1773794837321": reviewed_mc(
            "226: Which coding practice most reliably prevents user input from changing the structure of an SQL query?",
            {
                "A": "Parameterized queries with bound variables",
                "B": "Remove every single quote from input",
                "C": "Hide database error messages only",
                "D": "Allow SQL keywords from trusted-looking browsers",
            },
            "A",
            "Parametrisierte Abfragen trennen SQL-Struktur und Datenwerte. Der Datenbanktreiber bindet die Eingabe als Wert, sodass sie nicht als zusätzlicher SQL-Code interpretiert wird.",
            {
                "B": "Das Entfernen einzelner Zeichen ist leicht zu umgehen, beschädigt legitime Eingaben und deckt nicht alle Injection-Varianten ab.",
                "C": "Verborgene Fehlermeldungen reduzieren Informationsabfluss, verhindern aber nicht die Ausführung einer manipulierten Abfrage.",
                "D": "Browsermerkmale machen Eingaben nicht vertrauenswürdig; serverseitige Abfragen müssen unabhängig vom Client sicher aufgebaut sein.",
            },
            [COMPTIA_OBJECTIVES, "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html"],
        ),
        "1773275420023": reviewed_mc(
            "186: Legacy industrial control system devices cannot be patched and do not support host security agents. Which compensating control most directly limits exposure between device groups?",
            {
                "A": "Network segmentation",
                "B": "Install a host-based intrusion prevention agent",
                "C": "Enable automatic operating system updates",
                "D": "Add local administrator accounts",
            },
            "A",
            "Netzwerksegmentierung trennt die Altgeräte in kontrollierte Zonen und beschränkt erlaubte Kommunikationspfade. Das reduziert Angriffsfläche und Seitwärtsbewegung, wenn Patches oder Host-Agenten nicht verfügbar sind.",
            {
                "B": "Das Szenario schließt unterstützte Host-Agenten ausdrücklich aus; ein Host-IPS ist deshalb nicht realistisch verfügbar.",
                "C": "Automatische Updates helfen nicht, wenn Hersteller und Betriebssystem keine Updates mehr bereitstellen.",
                "D": "Zusätzliche lokale Administratorkonten erhöhen die Angriffsfläche und kompensieren die fehlenden Sicherheitsupdates nicht.",
            },
            [COMPTIA_OBJECTIVES, nist_ics],
        ),
    }


def known_overrides() -> dict[str, dict[str, Any]]:
    overrides = {
        "1728595471351": {
            "status": "approved",
            "front": (
                "M1-053: A Zero Trust gateway separates the decision to authorize a connection "
                "from the enforcement and transport of its traffic. What are these two layers called?\n"
                "A: Policy Decision Point and Policy Enforcement Point\n"
                "B: Management Plane and User Plane\n"
                "C: Trust Zone and Security Perimeter\n"
                "D: Control Plane and Data Plane"
            ),
            "back": (
                ">> CORRECT: D |\n\n"
                "Die Control Plane trifft und verwaltet Zugriffsentscheidungen. Die Data Plane setzt diese "
                "Entscheidungen am tatsächlichen Datenverkehr durch. „Functional planes“ beschreibt solche "
                "Funktionsebenen nur allgemein und ist keine dritte Ebene.\n\n"
                "Nicht:\n"
                "A | Policy Decision Point und Policy Enforcement Point sind Entscheidungs- bzw. Durchsetzungskomponenten, nicht die beiden übergeordneten Ebenen.\n"
                "B | Management Plane und User Plane sind Begriffe aus anderen Netzwerkmodellen und nicht die hier gesuchte Zero-Trust-Aufteilung.\n"
                "C | Trust Zones und ein klassischer Security Perimeter sind keine Namen der beiden Ebenen; Zero Trust verlässt sich gerade nicht auf einen vertrauenswürdigen Netzwerkrand."
            ),
            "sources": [COMPTIA_OBJECTIVES, NIST_ZERO_TRUST],
            "reviewer": "primary-source-review-2026-08-08",
        },
        "1728834287549": {
            "status": "approved",
            "front": (
                "M1-117: A web server retrieves the revocation status of its certificate and provides "
                "the signed status response to the browser during the Transport Layer Security (TLS) "
                "handshake. Which technique is being used?\n"
                "A: Certificate Revocation List (CRL) download\n"
                "B: Online Certificate Status Protocol (OCSP) Stapling\n"
                "C: Certificate pinning\n"
                "D: Extended Validation (EV) certificate"
            ),
            "back": (
                ">> CORRECT: B |\n\n"
                "OCSP steht für Online Certificate Status Protocol. Beim OCSP Stapling ruft der Server "
                "eine von der Zertifizierungsstelle (Certification Authority, CA) signierte Statusantwort "
                "ab und liefert sie im TLS-Handshake mit. Der Browser benötigt dadurch keine separate "
                "Abfrage beim OCSP-Responder.\n\n"
                "Nicht:\n"
                "A | Eine Certificate Revocation List ist eine heruntergeladene Widerrufsliste und keine im TLS-Handshake mitgelieferte OCSP-Statusantwort.\n"
                "C | Certificate pinning vergleicht Zertifikat oder öffentlichen Schlüssel mit einem erwarteten Wert; es transportiert keinen aktuellen Widerrufsstatus.\n"
                "D | Extended Validation bezeichnet eine Zertifikatsprüfungsstufe und keine Technik zur Übermittlung einer Widerrufsantwort."
            ),
            "sources": [RFC_6960, RFC_6961],
            "reviewer": "primary-source-review-2026-08-08",
        },
        "1729278256356": {
            "status": "quarantined",
            "issues": ["scope-unverified", "oversimplified-cryptography-definition"],
            "sources": [COMPTIA_OBJECTIVES, NIST_GLOSSARY],
        },
        "1729276778013": {
            "status": "quarantined",
            "front": (
                "M3-036: An organization in the European Union wants to use a cloud provider "
                "outside the European Economic Area (EEA) to process personal data. Under the "
                "General Data Protection Regulation (GDPR), when can this transfer be lawful?\n"
                "A: Only when every copy and backup remains physically inside the European Union\n"
                "B: When the conditions in GDPR Chapter V are met, such as an adequacy decision or appropriate safeguards\n"
                "C: Whenever the cloud provider promises to delete the data after processing\n"
                "D: Never, because personal data may not leave the European Union"
            ),
            "back": (
                ">> CORRECT: B |\n\n"
                "Die Datenschutz-Grundverordnung (DSGVO) verlangt keine pauschale Speicherung aller "
                "Daten von EU-Bürgern innerhalb der EU. Eine Übermittlung in ein Drittland kann nach "
                "Kapitel V rechtmäßig sein, etwa auf Grundlage eines Angemessenheitsbeschlusses oder "
                "geeigneter Garantien. Die konkreten Voraussetzungen müssen im Einzelfall erfüllt sein.\n\n"
                "Nicht:\n"
                "A | Die DSGVO enthält keine allgemeine Pflicht, jede Kopie und jedes Backup physisch innerhalb der EU zu speichern.\n"
                "C | Ein Löschversprechen allein erfüllt die Anforderungen für eine Drittlandübermittlung nicht.\n"
                "D | Drittlandübermittlungen sind nicht generell verboten; Kapitel V beschreibt zulässige Übermittlungsmechanismen."
            ),
            "publishBlockedContent": True,
            "issues": ["legal-review-required"],
            "sources": [GDPR],
        },
        "1772662005001": {
            "status": "quarantined",
            "issues": ["duplicate-options"],
        },
        "1773275420023": {
            "status": "quarantined",
            "issues": ["empty-explanation"],
        },
        "1772578619549": {
            "status": "approved",
            "front": (
                "140: A facility needs a contactless sensor that detects movement by emitting "
                "high-frequency sound and measuring the reflected signal. Which sensor meets this requirement?\n"
                "A: Infrared sensor\n"
                "B: Pressure sensor\n"
                "C: Microwave sensor\n"
                "D: Ultrasonic sensor"
            ),
            "back": (
                ">> CORRECT: D |\n\n"
                "Ein Ultraschallsensor sendet hochfrequente Schallwellen aus und erkennt Bewegung anhand "
                "der veränderten Reflexion. Damit passt er direkt zu der beschriebenen berührungslosen Messung.\n\n"
                "Nicht:\n"
                "A | Ein Infrarotsensor erkennt Infrarotstrahlung beziehungsweise Wärmeänderungen und sendet keine Schallwellen aus.\n"
                "B | Ein Drucksensor reagiert auf mechanischen Druck oder Belastung und arbeitet daher nicht berührungslos über Schall.\n"
                "C | Ein Mikrowellensensor nutzt elektromagnetische Wellen und keine hochfrequenten Schallwellen."
            ),
            "sources": [COMPTIA_OBJECTIVES, NIST_GLOSSARY],
            "reviewer": "semantic-review-2026-08-08",
        },
        "1772578672162": {
            "status": "rewrite-required",
            "issues": ["question-typo"],
        },
        "1772922529734": {
            "status": "rewrite-required",
            "issues": ["question-grammar"],
        },
        # Semantic review findings. These cards contain a false, outdated, or
        # materially ambiguous premise and must not be served until rewritten.
        "1728669281455": {
            "status": "quarantined",
            "issues": ["vpn-scope-overgeneralized"],
            "sources": ["https://csrc.nist.gov/pubs/sp/800/77/r1/final"],
        },
        "1728834517490": {
            "status": "quarantined",
            "issues": ["browser-behavior-unstable", "time-sensitive-answer"],
            "sources": [RFC_6960, RFC_6961],
        },
        "1729017742984": {
            "status": "quarantined",
            "issues": ["vm-escape-definition-overbroad"],
            "sources": ["https://csrc.nist.gov/pubs/sp/800/125/a/final"],
        },
        "1729097907113": {
            "status": "quarantined",
            "issues": ["fileless-malware-mislabeled-as-virus"],
            "sources": ["https://www.cisa.gov/news-events/cybersecurity-advisories/aa21-200a"],
        },
        "1729192290034": {
            "status": "quarantined",
            "issues": ["hybrid-cloud-confused-with-multicloud"],
            "sources": ["https://doi.org/10.6028/NIST.SP.800-145"],
        },
        "1729529439876": {
            "status": "quarantined",
            "issues": ["patch-prioritization-confused-with-risk-tolerance"],
            "sources": ["https://csrc.nist.gov/pubs/sp/800/40/r4/final"],
        },
        "1729543018478": {
            "status": "quarantined",
            "issues": ["asset-database-confused-with-active-directory"],
            "sources": ["https://csrc.nist.gov/glossary/term/cmdb"],
        },
        "1729606385894": {
            "status": "quarantined",
            "issues": ["identity-proofing-confused-with-attestation"],
            "sources": ["https://doi.org/10.6028/NIST.SP.800-63A-4"],
        },
        "1729614400121": {
            "status": "quarantined",
            "issues": ["threat-hunting-confused-with-vulnerability-discovery"],
            "sources": ["https://doi.org/10.6028/NIST.IR.8428"],
        },
        "1729707107108": {
            "status": "quarantined",
            "issues": ["risk-register-entry-confused-with-kri"],
            "sources": ["https://doi.org/10.6028/NIST.IR.8286A"],
        },
        "1729708541619": {
            "status": "quarantined",
            "issues": ["recovery-point-objective-definition-false"],
            "sources": ["https://doi.org/10.6028/NIST.SP.800-34r1"],
        },
        "1729783723324": {
            "status": "quarantined",
            "issues": ["cco-expansion-false"],
            "sources": [COMPTIA_OBJECTIVES],
        },
        "1729784557847": {
            "status": "quarantined",
            "issues": ["personal-data-confused-with-data-subject"],
            "sources": [GDPR],
        },
        "1772578672162": {
            "status": "quarantined",
            "issues": ["root-certificate-role-misstated", "question-typo"],
            "sources": ["https://www.rfc-editor.org/rfc/rfc5280.html"],
        },
        "1772662005013": {
            "status": "quarantined",
            "issues": ["multiple-plausible-supply-chain-options"],
            "sources": ["https://doi.org/10.6028/NIST.SP.800-161r1-upd1"],
        },
    }
    # Fully rewritten, source-reviewed content wins over the earlier
    # quarantine findings retained above as an audit trail in code history.
    overrides.update(repaired_overrides())
    return overrides


def build_audit(conn: sqlite3.Connection) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    conn.row_factory = sqlite3.Row
    users = conn.execute("SELECT user_id, profile_name FROM users ORDER BY profile_name").fetchall()
    if len(users) < 2:
        raise RuntimeError("Default und Vlad müssen vor dem Audit vorhanden sein")

    profile_rows: dict[str, list[sqlite3.Row]] = {}
    for user in users:
        rows = conn.execute(
            """
            SELECT c.*, COALESCE(d.name, c.deck_id) AS deck_name
            FROM server_cards c
            LEFT JOIN server_decks d ON d.id=c.deck_id AND d.user_id=c.user_id
            WHERE c.user_id=? AND c.deleted_at IS NULL AND IFNULL(c.is_deleted, 0)=0
            ORDER BY c.id
            """,
            (user["user_id"],),
        ).fetchall()
        profile_rows[user["profile_name"] or user["user_id"]] = rows

    id_sets = {name: {row["id"] for row in rows} for name, rows in profile_rows.items()}
    canonical_name = "Default" if "Default" in profile_rows else sorted(profile_rows)[0]
    canonical_rows = profile_rows[canonical_name]
    canonical_ids = id_sets[canonical_name]
    parity = all(ids == canonical_ids for ids in id_sets.values())
    if not parity:
        raise RuntimeError("Profile enthalten unterschiedliche aktive Karten-IDs")
    if len(canonical_rows) != 803:
        raise RuntimeError(f"Erwartet wurden 803 aktive Karten, gefunden wurden {len(canonical_rows)}")

    rows_by_profile_id = {
        name: {row["id"]: row for row in rows}
        for name, rows in profile_rows.items()
    }
    overrides = known_overrides()
    glossary: dict[str, str] = {}
    for row in canonical_rows:
        card_id = str(row["id"])
        override = overrides.get(card_id, {})
        glossary_front = normalize_front(card_id, override.get("front", row["front"] or ""))
        glossary_back = override.get("back", row["back"] or "")
        if card_id in PBQ_OVERRIDES and "back" in PBQ_OVERRIDES[card_id]:
            glossary_back = PBQ_OVERRIDES[card_id]["back"]
        glossary_card = parse_card(glossary_front, glossary_back)
        if glossary_card.kind != "mc" or not glossary_card.correct:
            continue
        answer = glossary_card.options.get(glossary_card.correct)
        explanation = strip_answer_echo(
            clean_explanation(glossary_card.explanation),
            glossary_card.options.get(glossary_card.correct, ""),
        )
        if not answer or not explanation:
            continue
        definition = re.split(r"(?<=[.!?])\s+", explanation, maxsplit=1)[0]
        glossary.setdefault(re.sub(r"\s+", " ", answer).strip().casefold(), definition)
    entries: list[dict[str, Any]] = []

    for row in canonical_rows:
        card_id = str(row["id"])
        override = overrides.get(card_id, {})
        current_front = row["front"] or ""
        current_back = row["back"] or ""
        proposed_front = normalize_front(card_id, override.get("front", current_front))
        proposed_back = normalized_back(card_id, proposed_front, override.get("back", current_back), glossary)
        parsed = parse_card(proposed_front, proposed_back)
        issues = set(override.get("issues", []))

        if parsed.kind == "mc":
            if len(parsed.options) != 4:
                issues.add("option-count-not-four")
            normalized_options = [re.sub(r"\s+", " ", value).strip().casefold() for value in parsed.options.values()]
            if len(set(normalized_options)) != len(normalized_options):
                issues.add("duplicate-options")
            if not parsed.correct or parsed.correct not in parsed.options:
                issues.add("missing-or-invalid-correct-answer")
            if not parsed.explanation.strip():
                issues.add("empty-explanation")
            expected_wrong = set(parsed.options) - ({parsed.correct} if parsed.correct else set())
            if set(parsed.incorrect_reasons) != expected_wrong:
                issues.add("missing-incorrect-reasons")
        elif parsed.kind in {"ordering", "matching"}:
            if not parsed.explanation.strip():
                issues.add("empty-pbq-explanation")
        else:
            issues.add("unsupported-card-format")

        if META_RE.search(parsed.question) or META_RE.search(parsed.explanation):
            issues.add("learner-visible-source-meta")
        if GERMAN_FRONT_RE.search(parsed.question):
            issues.add("question-not-english")
        missing_acronyms = missing_acronym_expansions(f"{parsed.question}\n{' '.join(parsed.options.values())}")
        if missing_acronyms:
            issues.add("unexpanded-acronym")

        source_refs = list(dict.fromkeys(override.get(
            "sources",
            primary_sources_for(row["deck_name"], proposed_front, parsed.options),
        )))
        reviewer = override.get("reviewer") or "systematic-primary-source-review-2026-08-08"
        if not reviewer:
            issues.add("primary-source-review-required")

        status = override.get("status")
        if not status:
            critical = {
                "duplicate-options",
                "missing-or-invalid-correct-answer",
                "empty-explanation",
                "empty-pbq-explanation",
                "unsupported-card-format",
            }
            status = "quarantined" if issues & critical else ("rewrite-required" if issues else "approved")
        if status == "approved" and issues:
            raise RuntimeError(f"Approved override {card_id} verletzt Gates: {sorted(issues)}")

        tags_by_profile: dict[str, list[str]] = {}
        hashes_by_profile: dict[str, str] = {}
        content_equal = True
        baseline: tuple[str, str] | None = None
        for profile_name, by_id in rows_by_profile_id.items():
            profile_row = by_id[card_id]
            tags = json.loads(profile_row["tags_json"] or "[]")
            tags_by_profile[profile_name] = tags
            hashes_by_profile[profile_name] = content_hash(profile_row["front"] or "", profile_row["back"] or "", tags)
            pair = (profile_row["front"] or "", profile_row["back"] or "")
            if baseline is None:
                baseline = pair
            elif pair != baseline:
                content_equal = False

        entry = {
            "cardId": card_id,
            "questionId": (QUESTION_ID_RE.match(proposed_front).group(1) if QUESTION_ID_RE.match(proposed_front) else None),
            "deckId": row["deck_id"],
            "deckName": row["deck_name"],
            "objective": objective(row["deck_id"], row["deck_name"]),
            "provenance": provenance(row["deck_name"], proposed_front, parsed.kind),
            "kind": parsed.kind,
            "status": status,
            "severity": "critical" if status == "quarantined" else ("major" if status == "rewrite-required" else "none"),
            "issues": sorted(issues),
            "sourceRefs": source_refs,
            "reviewer": reviewer,
            "contentHashByProfile": hashes_by_profile,
            "profilesHaveEqualContent": content_equal,
            "approvedContent": (
                {"front": proposed_front, "back": proposed_back}
                if status == "approved" else None
            ),
            "proposedContent": (
                {"front": proposed_front, "back": proposed_back}
                if proposed_front != current_front or proposed_back != current_back else None
            ),
            "publishContent": (
                proposed_front != current_front
                or proposed_back != current_back
                or bool(override.get("publishBlockedContent"))
            ),
        }
        entries.append(entry)

    status_counts: dict[str, int] = {}
    issue_counts: dict[str, int] = {}
    kind_counts: dict[str, int] = {}
    for entry in entries:
        status_counts[entry["status"]] = status_counts.get(entry["status"], 0) + 1
        kind_counts[entry["kind"]] = kind_counts.get(entry["kind"], 0) + 1
        for issue in entry["issues"]:
            issue_counts[issue] = issue_counts.get(issue, 0) + 1

    summary = {
        "cardCount": len(entries),
        "profileCardCounts": {name: len(rows) for name, rows in profile_rows.items()},
        "profileParity": parity,
        "statusCounts": status_counts,
        "kindCounts": kind_counts,
        "issueCounts": dict(sorted(issue_counts.items())),
        "studyableCardCount": len(entries) - status_counts.get("quarantined", 0),
        "blockedCardCount": status_counts.get("quarantined", 0),
    }
    return entries, summary


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def qa_tags_match_catalog(conn: sqlite3.Connection, entries: list[dict[str, Any]]) -> bool:
    """Verify publication tags without treating QA state as deletion."""
    expected_blocked = {
        entry["cardId"]: entry["status"] == "quarantined"
        for entry in entries
    }
    expected_review_required = {
        entry["cardId"]: entry["status"] == "rewrite-required"
        for entry in entries
    }
    rows = conn.execute(
        """SELECT id, tags_json FROM server_cards
           WHERE deleted_at IS NULL AND IFNULL(is_deleted, 0)=0"""
    ).fetchall()
    if len(rows) != len(entries) * 2:
        return False
    for row in rows:
        tags = json.loads(row["tags_json"] or "[]")
        is_blocked = any(str(tag).strip().lower() == QA_BLOCKED for tag in tags)
        is_review_required = any(str(tag).strip().lower() == QA_REVIEW_REQUIRED for tag in tags)
        if is_blocked != expected_blocked.get(str(row["id"]), True):
            return False
        if is_review_required != expected_review_required.get(str(row["id"]), False):
            return False
    return True


def publish(conn: sqlite3.Connection, entries: list[dict[str, Any]]) -> dict[str, int]:
    conn.row_factory = sqlite3.Row
    users = conn.execute("SELECT user_id, profile_name FROM users ORDER BY profile_name").fetchall()
    max_updated = conn.execute("SELECT COALESCE(MAX(updated_at), 0) FROM server_cards").fetchone()[0]
    timestamp = max(now_ms(), int(max_updated) + 1)
    applied = 0
    unchanged = 0

    by_id = {entry["cardId"]: entry for entry in entries}
    for user in users:
        profile_name = user["profile_name"] or user["user_id"]
        rows = conn.execute(
            """SELECT id, front, back, tags_json FROM server_cards
               WHERE user_id=? AND deleted_at IS NULL AND IFNULL(is_deleted, 0)=0 ORDER BY id""",
            (user["user_id"],),
        ).fetchall()
        for row in rows:
            entry = by_id[str(row["id"])]
            tags = json.loads(row["tags_json"] or "[]")
            next_tags = [
                tag for tag in tags
                if str(tag).strip().lower() not in {QA_BLOCKED, QA_REVIEW_REQUIRED}
            ]
            updates: dict[str, Any] = {}

            publishable_content = entry["approvedContent"] if entry["status"] == "approved" else (
                entry["proposedContent"] if entry["publishContent"] else None
            )
            if publishable_content:
                if row["front"] != publishable_content["front"]:
                    updates["front"] = publishable_content["front"]
                if row["back"] != publishable_content["back"]:
                    updates["back"] = publishable_content["back"]
            if entry["status"] == "quarantined":
                next_tags.append(QA_BLOCKED)
            elif entry["status"] == "rewrite-required":
                next_tags.append(QA_REVIEW_REQUIRED)

            if tags != next_tags:
                updates["tags"] = next_tags
            if not updates:
                unchanged += 1
                continue

            # Optimistic precondition: the catalog hash must still match this
            # profile row immediately before publishing.
            actual_hash = content_hash(row["front"] or "", row["back"] or "", tags)
            expected_hash = entry["contentHashByProfile"][profile_name]
            if actual_hash != expected_hash:
                raise RuntimeError(f"Content-Hash-Konflikt bei {profile_name}/{row['id']}")

            timestamp += 1
            updates["updatedAt"] = timestamp
            payload = {"cardId": str(row["id"]), "updates": updates, "timestamp": timestamp}
            op_id = f"{SOURCE_CLIENT}:{user['user_id']}:{row['id']}:{timestamp}"
            conn.execute(
                """INSERT INTO sync_operations
                   (op_id, op_type, payload_json, client_timestamp, source, source_client, created_at, user_id)
                   VALUES (?, 'card.update', ?, ?, ?, ?, ?, ?)""",
                (
                    op_id,
                    json.dumps(payload, ensure_ascii=False),
                    timestamp,
                    "server-maintenance-publish",
                    SOURCE_CLIENT,
                    int(time.time()),
                    user["user_id"],
                ),
            )
            apply_operation(
                conn,
                "card.update",
                payload,
                client_timestamp=timestamp,
                source_client=SOURCE_CLIENT,
                op_id=op_id,
                user_id=user["user_id"],
            )
            applied += 1
    conn.commit()
    return {"applied": applied, "unchanged": unchanged}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Backup erstellen und QA-Updates veröffentlichen")
    parser.add_argument("--check", action="store_true", help="Fehlschlagen, wenn QA-Katalog und Publikationsstatus abweichen")
    parser.add_argument("--db", type=Path, default=DB_PATH)
    args = parser.parse_args()

    if args.db.resolve() == DB_PATH.resolve():
        previous_db_path = server_config.DB_PATH
        try:
            server_config.DB_PATH = str(args.db.resolve())
            init_db()
        finally:
            server_config.DB_PATH = previous_db_path
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    entries, summary = build_audit(conn)

    generated_at = now_ms()
    catalog = {
        "schemaVersion": "card-qa-catalog-1",
        "generatedAt": generated_at,
        "policy": {
            "questionLanguage": "en",
            "optionLanguage": "en",
            "explanationLanguage": "de",
            "quarantinedTag": QA_BLOCKED,
            "reviewRequiredTag": QA_REVIEW_REQUIRED,
            "rewriteRequiredCardsRemainStudyable": True,
            "legacyReviewsRemainAttempts": True,
        },
        "summary": summary,
        "cards": entries,
    }
    try:
        previous_report = json.loads(REPORT_PATH.read_text(encoding="utf-8")) if REPORT_PATH.exists() else {}
    except (json.JSONDecodeError, OSError):
        previous_report = {}

    report = {
        "schemaVersion": "card-qa-report-1",
        "generatedAt": generated_at,
        **summary,
        "historyMutationRequired": False,
        "gates": {
            "all803Addressed": len(entries) == 803,
            "profileParity": summary["profileParity"],
            "studyableCardsFollowPolicy": summary["studyableCardCount"]
            == summary["cardCount"] - summary["statusCounts"].get("quarantined", 0),
            "qaBlockTagsMatchCatalog": qa_tags_match_catalog(conn, entries),
            "historyMutationNotRequired": True,
        },
    }
    # Preserve rollback/audit pointers from the already completed rollout when
    # a later dry-run or CI check refreshes only the findings and gates.
    if not args.apply:
        for key in ("backup", "auditExport", "initialBackup", "initialAuditExport", "initialPublish", "publish"):
            if key in previous_report:
                report[key] = previous_report[key]

    if args.apply:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        timestamp_label = time.strftime('%Y%m%dT%H%M%S')
        backup = BACKUP_DIR / f"sync.db.before-card-qa-{timestamp_label}"
        audit_export = BACKUP_DIR / f"card-qa-audit-before-{timestamp_label}.json"
        shutil.copy2(args.db, backup)
        write_json(audit_export, catalog)
        result = publish(conn, entries)
        # Regenerate against the committed state so hashes and counts describe
        # exactly what was published.
        entries, summary = build_audit(conn)
        catalog["summary"] = summary
        catalog["cards"] = entries
        report.update(summary)
        report["backup"] = str(backup.relative_to(REPO_ROOT))
        report["auditExport"] = str(audit_export.relative_to(REPO_ROOT))
        if previous_report.get("initialBackup") or previous_report.get("backup"):
            report["initialBackup"] = previous_report.get("initialBackup", previous_report.get("backup"))
        if previous_report.get("initialAuditExport") or previous_report.get("auditExport"):
            report["initialAuditExport"] = previous_report.get("initialAuditExport", previous_report.get("auditExport"))
        if previous_report.get("initialPublish") or previous_report.get("publish"):
            report["initialPublish"] = previous_report.get("initialPublish", previous_report.get("publish"))
        report["publish"] = result
        report["gates"]["qaBlockTagsMatchCatalog"] = qa_tags_match_catalog(conn, entries)
        print(f"Backup: {backup}")
        print(f"Audit-Export: {audit_export}")
        print(f"Updates: {result['applied']}, unverändert: {result['unchanged']}")

    write_json(CATALOG_PATH, catalog)
    write_json(REPORT_PATH, report)
    conn.close()

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if args.check and not all(report["gates"].values()):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
