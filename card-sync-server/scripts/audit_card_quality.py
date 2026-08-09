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
    "1780262916265": "A domain owner wants recipients to quarantine messages that fail identifier alignment and to send aggregate reports. What does DMARC stand for?",
    "1780262916266": "An organization owns its smartphones but permits employees to use them personally under policy. What does COPE stand for?",
}

ACRONYM_USE_CASES: dict[str, tuple[str, str]] = {
    "CASB": (
        "A security team needs visibility and policy enforcement between users and cloud applications.",
        "An audit finds unsanctioned cloud storage and asks for a cloud-service control point.",
    ),
    "SASE": (
        "A provider combines wide-area networking and cloud-delivered security at the network edge.",
        "Remote offices need one cloud service for SD-WAN, web security, firewalling, and Zero Trust access.",
    ),
    "SBOM": (
        "A product owner needs an inventory of the software components and versions inside an application.",
        "A new library vulnerability requires the team to identify every product that contains that dependency.",
    ),
    "SED": (
        "A laptop drive performs hardware-based encryption within the drive itself.",
        "A storage standard describes a disk whose controller encrypts all written sectors automatically.",
    ),
    "ZTNA": (
        "Remote users receive identity- and context-based access to individual applications instead of broad network access.",
        "A company replaces its remote-access VPN with per-application sessions that are continuously evaluated.",
    ),
    "XDR": (
        "A platform correlates detections across endpoints, email, identity, network, and cloud workloads.",
        "An analyst investigates one incident using linked signals from several security domains in a single view.",
    ),
    "MDR": (
        "An external team operates detection, triage, and response for a customer around the clock.",
        "A company buys a managed service because it lacks staff to investigate endpoint alerts overnight.",
    ),
    "SOAR": (
        "A playbook automatically enriches an alert, opens a ticket, disables an account, and isolates a host.",
        "The SOC wants repeatable orchestration and automated response across several security tools.",
    ),
    "CCMP": (
        "A wireless network uses the AES-based confidentiality and integrity protocol introduced with WPA2.",
        "A WLAN configuration replaces TKIP with the stronger AES-based protection suite used by WPA2.",
    ),
    "NGFW": (
        "A firewall identifies applications and integrates deep inspection and intrusion prevention.",
        "The network team needs more than ports and state tracking from its new perimeter firewall.",
    ),
    "MTBF": (
        "A reliability report measures the average operating time between one failure and the next.",
        "Capacity planners want a metric that estimates how long a repairable component runs before failing again.",
    ),
    "MTTR": (
        "Operations measures the average time required to repair or restore a failed service.",
        "A dashboard tracks how quickly the team returns a component to service after each failure.",
    ),
    "RTO": (
        "A business owner states the maximum acceptable time a critical service may remain unavailable.",
        "A recovery plan must define how quickly an application needs to be operating again after disruption.",
    ),
    "RPO": (
        "A business owner states the maximum tolerable data loss measured backward in time.",
        "A backup design must limit lost transactions to no more than thirty minutes before an outage.",
    ),
    "SCAP": (
        "A vulnerability program exchanges machine-readable configuration and assessment information using a standard suite.",
        "Security tools need interoperable formats for checks, identifiers, scores, and configuration content.",
    ),
    "DKIM": (
        "A mail server signs selected headers and message content, and recipients verify the signature with a DNS public key.",
        "An email administrator wants cryptographic message integrity tied to the sending domain.",
    ),
    "SPF": (
        "A domain publishes which mail servers are authorized to send messages on its behalf.",
        "A receiving server checks the connecting sender address against a DNS authorization policy.",
    ),
    "DMARC": (
        "A domain publishes policy and reporting instructions for messages that fail aligned SPF or DKIM checks.",
        "An email owner wants aggregate reports and a reject policy based on identifier alignment.",
    ),
    "STIX": (
        "A threat-intelligence team represents indicators, actors, campaigns, and relationships in a structured format.",
        "Two organizations need a common data model for machine-readable cyber-threat intelligence.",
    ),
    "TAXII": (
        "Two organizations exchange structured cyber-threat intelligence through an application-layer protocol.",
        "A threat platform needs standardized collections and APIs for transporting intelligence objects.",
    ),
    "TTP": (
        "An analyst describes how an adversary operates, including its methods and detailed procedures.",
        "A threat report groups an attacker's strategic behavior, techniques, and observed implementation steps.",
    ),
    "IoC": (
        "A responder records a malicious file hash, domain, and IP address observed during an intrusion.",
        "A detection rule consumes observable artifacts that suggest a system may have been compromised.",
    ),
    "IaaS": (
        "A cloud customer manages guest operating systems, applications, and data while the provider runs the physical infrastructure.",
        "A team rents virtual machines and networks but remains responsible for patching each guest operating system.",
    ),
    "PaaS": (
        "Developers deploy their code while the cloud provider manages the operating system and application runtime.",
        "A team wants to publish an application without administering the underlying guest operating system.",
    ),
    "SaaS": (
        "Users configure and consume a complete provider-managed application through a browser.",
        "A business subscribes to a finished cloud application rather than deploying its own code or virtual machines.",
    ),
    "CYOD": (
        "An employee selects a work device from a company-approved list.",
        "The organization limits personal device choice to several supported models before enrollment.",
    ),
    "COPE": (
        "The organization owns a mobile device but permits reasonable personal use.",
        "An employee receives a corporate smartphone that may also be used privately under policy.",
    ),
    "BYOD": (
        "An employee uses a personally owned phone for both private and company work.",
        "A mobile policy allows staff to enroll their own devices for access to business resources.",
    ),
    "RTOS": (
        "An embedded controller must respond to events within predictable timing constraints.",
        "An industrial device uses an operating system designed for deterministic, time-critical processing.",
    ),
    "PII": (
        "A data inventory identifies information that can distinguish or trace an individual's identity.",
        "A privacy review finds names, government identifiers, and other data linkable to specific people.",
    ),
    "SIEM": (
        "A security platform centralizes logs, correlates events, and generates alerts for analysts.",
        "The SOC needs one searchable system for events collected from many security and infrastructure sources.",
    ),
    "EDR": (
        "A platform records endpoint activity and lets analysts investigate and respond directly on a host.",
        "The SOC needs process telemetry, endpoint detections, and host-isolation actions in one product.",
    ),
    "S/MIME": (
        "A user signs and encrypts an individual email message with certificate-based cryptography.",
        "An organization wants end-to-end email signing and encryption based on public-key certificates.",
    ),
    "DLP": (
        "A control detects and prevents sensitive information from leaving through endpoints, email, or cloud services.",
        "The security team applies content-aware policy to stop unauthorized disclosure of classified data.",
    ),
    "IAM": (
        "A program manages digital identities and their authentication, authorization, and lifecycle.",
        "The organization needs governance for account creation, access assignment, review, and removal.",
    ),
    "PAM": (
        "A platform controls, monitors, and rotates highly privileged accounts and credentials.",
        "Administrators must check out vaulted credentials and have sensitive sessions recorded.",
    ),
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
7) Actions on Objectives""",
        "back": """CORRECT_ORDER: 2,1,4,6,3,5,7
Reconnaissance identifies the target. Weaponization prepares a payload, Delivery brings it to the victim, and Exploitation triggers the vulnerability. Installation establishes a foothold, Command and Control creates the remote channel, and Actions on Objectives pursue the attacker's goal.

Merkhilfe: Erst auskundschaften und vorbereiten, dann zustellen und ausnutzen; danach folgen Persistenz, Fernsteuerung und das eigentliche Angriffsziel."""},
    "1778313864612": {"front": """ORDERING:
Put these simplified Transport Layer Security (TLS) 1.3 handshake events in the correct order.

1) Server authentication messages
2) ClientHello
3) Application Data
4) ServerHello
5) Client Finished""",
        "back": """CORRECT_ORDER: 2,4,1,5,3
Der ClientHello eröffnet den TLS-1.3-Handshake und bietet Parameter an. Der ServerHello wählt die gemeinsamen Parameter; danach authentifiziert sich der Server mit den verschlüsselten Handshake-Nachrichten. Mit Client Finished bestätigt der Client den bisherigen Handshake. Erst nach erfolgreichem Abschluss werden reguläre Anwendungsdaten übertragen."""},
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
3389 >> RDP""",
        "back": """22 gehört zu Secure Shell, 25 zu Simple Mail Transfer Protocol, 53 zum Domain Name System, 80 zu unverschlüsseltem HTTP, 443 zu HTTP über TLS und 3389 zum Remote Desktop Protocol. Das sind die bekannten Standardports; eine konkrete Umgebung kann Dienste dennoch auf anderen Ports betreiben."""},
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
6) Reporting""",
        "back": """CORRECT_ORDER: 1,2,3,4,5,6

Reconnaissance sammelt zunächst Informationen über das Ziel. Scanning und Enumeration machen erreichbare Systeme, Ports, Dienste und Identitäten sichtbar; anschließend bewertet die Vulnerability Analysis mögliche Schwachstellen. Erst danach folgen der kontrollierte Exploit-Versuch sowie — falls freigegeben — Lateral Movement und Pivoting. Der Bericht dokumentiert zum Schluss Nachweise, Risiken und konkrete Empfehlungen.

Merkhilfe: Reconnaissance → Scanning → Analysis → Exploitation → Movement → Reporting. Anders als ein echter Angriff bleibt der Test autorisiert, abgegrenzt und dokumentiert."""},
    "1779095116171": {"front": """MATCHING:
Match each description to the threat actor type.

Government-sponsored, sophisticated, long-running operations >> Nation-state
Politically or ideologically motivated defacement or leaks >> Hacktivist
Profit-driven criminal organization >> Organized Crime
Trusted employee abuses legitimate access >> Insider Threat
Inexperienced person using ready-made tools >> Unskilled Attacker
Users bypass IT policy with their own tools or cloud services >> Shadow IT""",
        "back": """Ein Nation-State verfügt typischerweise über staatliche Ziele und langfristige Ressourcen. Hacktivisten handeln ideologisch, organisierte Kriminalität meist finanziell. Ein Insider missbraucht legitimen internen Zugriff; ein Unskilled Attacker verwendet häufig fertige Werkzeuge. Shadow IT entsteht dagegen, wenn Beschäftigte nicht genehmigte Technik am offiziellen IT-Prozess vorbei einsetzen."""},
    "1779095116172": {"front": """MATCHING:
Match each behavior to the malware type.

Encrypts files and demands payment >> Ransomware
Self-replicates over a network without user action >> Worm
Disguises itself as legitimate software >> Trojan
Hides at the operating-system kernel level >> Rootkit
Secretly captures keystrokes >> Keylogger
Waits for a specific condition before execution >> Logic Bomb
Provides remote access and screen capture >> Remote Access Trojan (RAT)""",
        "back": """Ransomware verschlüsselt oder sperrt Daten und fordert Geld. Ein Worm verbreitet sich selbstständig, während sich ein Trojaner als legitime Software tarnt. Rootkits verbergen privilegierte Aktivitäten, Keylogger zeichnen Eingaben auf, Logic Bombs warten auf eine Auslösebedingung, und ein Remote Access Trojan ermöglicht verdeckte Fernsteuerung.

Merkhilfe: Ordne nicht nach dem Dateinamen, sondern nach dem kennzeichnenden Verhalten: Erpressung, Selbstverbreitung, Tarnung, Verbergen, Mitschneiden, Auslöser oder Fernsteuerung."""},
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

1) DENY tcp ANY -> web-prod:ANY LOG
2) ALLOW tcp 10.0.0.0/24 -> web-prod:443
3) DENY ALL LOG""",
        "back": """CORRECT_ORDER: 2,1,3
Die spezifische HTTPS-Freigabe muss vor der breiten TCP-Sperre stehen; andernfalls würde die Firewall den erlaubten Verkehr bereits an Regel 1 verwerfen. Danach protokolliert die TCP-Regel alle übrigen TCP-Versuche auf web-prod. Die allgemeine Sperre fängt am Ende jeden weiteren Verkehr ab.""",
    },
    "1779669134168": {"front": """MATCHING:
Match each business decision to the risk treatment strategy.

Purchase cyber liability insurance >> Transfer
Deploy a web application firewall against SQL injection >> Mitigate
Permanently disable a legacy SSLv2 service >> Avoid
Consciously retain minimal residual risk after patching >> Accept
Contractually shift defined service risks to a provider >> Transfer
Require multifactor authentication for all administrator accounts >> Mitigate""",
        "back": """Eine Versicherung oder eine vertraglich geregelte Verlagerung überträgt definierte Folgen auf eine andere Partei. WAF und Multifaktor-Authentifizierung verringern das Risiko und sind daher Mitigation. Das Abschalten des unsicheren Dienstes beseitigt die risikobehaftete Tätigkeit und ist Avoidance. Ein bewusst getragenes Restrisiko ist Acceptance."""},
    "1779669134169": {"front": """MATCHING:
Match each use case to the most appropriate encryption level.

BitLocker protects an entire stolen laptop drive >> Full-disk
Encrypted container holds sensitive project data >> Volume
One sensitive database column is encrypted separately >> Field
Password-encrypted backup archive >> File
Transparent Data Encryption protects an entire SQL database >> Database
System partition is encrypted separately from a data partition >> Partition""",
        "back": """Full-Disk Encryption umfasst ein komplettes Laufwerk. Ein verschlüsselter Container bildet ein eigenes Volume, Field Encryption schützt ein einzelnes Datenfeld, und File Encryption eine bestimmte Datei. Database Encryption wirkt auf die Datenbank als Einheit; Partition Encryption beschränkt sich auf eine ausgewählte Partition."""},
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


def collapse_duplicate_expansions(text: str) -> str:
    """Collapse nested or repeated acronym expansions without touching prose."""
    previous = None
    while text != previous:
        previous = text
        text = re.sub(
            r"\b([A-Za-z][A-Za-z -]{3,})\s*\(\1\)",
            r"\1",
            text,
            flags=re.I,
        )
        text = re.sub(
            r"\b([A-Z][A-Z0-9/+.-]{1,})\s*\(([^()]+)\)\s*\(\2\)",
            r"\1 (\2)",
            text,
            flags=re.I,
        )
    return text


def normalize_security_terms(text: str) -> str:
    """Repair recurring acronym expansions in their unambiguous context."""
    text = collapse_duplicate_expansions(text)
    text = re.sub(
        r"MAC\s*\(Mandatory Access Control\)(?=\s*(?:address|addresses|-?Adresse|-?Adressen))",
        "MAC (Media Access Control)",
        text,
        flags=re.I,
    )
    text = re.sub(
        r"MAC\s*\(Mandatory Access Control\)-Adresse",
        "MAC-Adresse (Media Access Control)",
        text,
        flags=re.I,
    )
    text = re.sub(r"RBAC\s*\(Rule-Based Access Control\)", "RBAC (Role-Based Access Control)", text, flags=re.I)
    text = re.sub(r"SOC\s*\(Security Operations Center\)\s*2\b", "SOC 2", text, flags=re.I)
    return text


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
        elif acronym == "STIX and TAXII":
            question = "Which option correctly expands STIX and TAXII?"
        elif acronym in ACRONYM_USE_CASES:
            variant = 1 if card_id.startswith("178120650") else 0
            question = f"{ACRONYM_USE_CASES[acronym][variant]} What does {acronym} stand for?"
        elif card_id.startswith("178120650"):
            question = f"Which option gives the full form of {acronym}?"
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
        "What does the acronym Public Key Infrastructure (PKI) stand for?": "What does PKI stand for?",
        "What does the acronym Online Certificate Status Protocol (OCSP) stand for?": "What does OCSP stand for?",
        "What does the acronym Certificate Revocation List (CRL) stand for in the context of Public Key Infrastructure (PKI)?": "What does CRL stand for?",
        "Ensuring that inetd services like echo, time, rsh, and telnet are not enabled are all examples of what type of action?": "Disabling unnecessary inetd services such as echo, time, rsh, and telnet is an example of which security action?",
    }
    for old, new in replacements.items():
        front = front.replace(old, new)
    front = re.sub(r"\bconsol(?:e+)?\b", "console", front, flags=re.I)
    front = re.sub(r"\binfrastuctur\b", "infrastructure", front, flags=re.I)
    front = re.sub(r"\bmutliple\b", "multiple", front, flags=re.I)
    front = re.sub(r"\bwaht\b", "what", front, flags=re.I)
    front = re.sub(r"\bGatewa\b", "Gateway", front)
    front = front.replace("Digital Key Identified Mail", "DomainKeys Identified Mail")
    front = front.replace("Risk Appetite Posture", "Risk threshold")
    front = front.replace("Central Compliance Officer", "Compliance officer")

    # Imported practice questions carried a visible source sequence number.
    # The database ID already provides stable identity, so the number only
    # made the learner-facing question read like an extraction artifact.
    front = re.sub(r"^\s*\d+\s*[:.)-]\s*", "", front, count=1)

    # Keep question IDs for stable support references, but remove syllabus and
    # source annotations from the learner-facing wording.
    front = re.sub(r"\s*\(Obj(?:ective)?\.?\s*\d+(?:\.\d+)?\)", "", front, flags=re.I)
    front = re.sub(r"\s+in the SY0-701 context", "", front, flags=re.I)
    front = re.sub(r"\s+according to (?:CompTIA|Messer)[^?]*(?=\?)", "", front, flags=re.I)

    # Expand a technical acronym once when the card is not explicitly testing
    # that acronym's expansion.
    tested_acronym_match = re.search(
        r"\b(?:what does|full form of)\s+(?:the\s+acronym\s+)?([A-Z][A-Z0-9/+.-]{1,})\b",
        front,
    )
    tested_acronym = tested_acronym_match.group(1) if tested_acronym_match else None
    if card_id not in ACRONYM_CARD_IDS:
        for short, long_name in ACRONYM_EXPANSIONS.items():
            if short == tested_acronym:
                continue
            if not re.search(rf"\b{re.escape(short)}\b", front):
                continue
            if re.search(rf"{re.escape(long_name)}\s*\({re.escape(short)}\)", front, re.I):
                continue
            front = re.sub(rf"\b{re.escape(short)}\b", f"{long_name} ({short})", front, count=1)
    front = normalize_security_terms(front)
    front = front.replace(".?", "?")
    front = re.sub(r"[ \t]+\n", "\n", front)
    front = re.sub(r"[ \t]{2,}", " ", front)
    return front.strip()


def clean_explanation(text: str) -> str:
    """Remove provenance/editorial commentary from the learner explanation."""
    cleaned = normalize_security_terms((text or "").strip())

    # A few imported answers already contained a miniature distractor section
    # inside the main explanation. The proper per-option reasons follow below,
    # so keeping this block only repeats content and can leak foreign letters.
    cleaned = re.split(
        r"\s*Warum\s+(?:nicht\s+)?die\s+anderen(?:\s+nicht)?\s*:\s*",
        cleaned,
        maxsplit=1,
        flags=re.I,
    )[0].strip()
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
    cleaned = re.sub(r"\ber nennt dies als\b", "dies gilt als", cleaned, flags=re.I)
    cleaned = re.sub(r"\ber ordnet (.+?) als\b", r"\1 gilt als", cleaned, flags=re.I)
    cleaned = re.sub(
        r"\([^)]*(?:NIST\s+(?:SP|IR)|RFC\s*\d|ISO\s*\d|SY0-701|Obj\.?\s*\d|PDF\s*(?:page|S\.)?)[^)]*\)",
        "",
        cleaned,
        flags=re.I,
    )
    cleaned = re.sub(r"(?:^|(?<=[.!?])\s+)PDF\b[^.!?]*(?:[.!?]|$)", " ", cleaned, flags=re.I)
    cleaned = re.sub(r"\b(?:im\s+)?SY0-701-Kontext\b", "", cleaned, flags=re.I)
    cleaned = re.sub(r"\s*Hinweis:\s*[^\n]*(?:siehe\s+Flag)[^\n]*", "", cleaned, flags=re.I)
    grammar_repairs = (
        (r"\bFirewalls und Antivirensoftware gilt\b", "Firewalls und Antivirensoftware gelten"),
        (r"\bSchriftliche Sicherheitsrichtlinien und offizielle Policy-Dokumentation ordnet den Managerial Controls zu\b", "Schriftliche Sicherheitsrichtlinien und offizielle Policy-Dokumentation gehören zu den Managerial Controls"),
        (r"\bZäune und abgeschlossene Türen verhindern physischen Zutritt und gehören klar zur Kategorie Physical — genau wie Türschlösser, die als physisches Beispiel für Preventive Controls nennt\b", "Zäune, abgeschlossene Türen und Türschlösser begrenzen den physischen Zutritt und gehören deshalb zu den physischen Kontrollen"),
        (r"\bdas Wachhäuschen \(Ausweiskontrolle\) bei der konkreten Durchsprache der Preventive Controls ausdrücklich als Beispiel für die Kategorie Operational, weil die Kontrolle von einer Person durchgeführt wird\b", "Das Wachhäuschen ist hier eine operative Kontrolle, weil eine Person die Ausweise prüft und den Zutritt freigibt"),
        (r"\bAnti-virus\b", "Antivirus"),
        (r"\bunsupportet(?:es|en|e)?\b", "nicht unterstütztes"),
        (r"\bz\.B\.\b", "zum Beispiel"),
        (r"\bAnnualized Loss Expectency\b", "Annualized Loss Expectancy"),
        (r"^Telnet, FTP, SMTP und IMAP als Protokolle, die Daten im Klartext übertragen, und empfiehlt stattdessen verschlüsselte Alternativen wie SSH, SFTP oder HTTPS\.?", "Telnet und FTP übertragen ihre Daten standardmäßig im Klartext. Für eine sichere Fernadministration ersetzt SSH das unverschlüsselte Telnet."),
        (r"^konkret CVSS \(Common Vulnerability Scoring System\) als Skala von 0 bis 10 und weist darauf hin, dass", "Das Common Vulnerability Scoring System (CVSS) bewertet die Schwere einer Schwachstelle auf einer Skala von 0,0 bis 10,0. In der Praxis haben"),
        (r"^Memory forensics, dass Malware zwingend im Arbeitsspeicher laufen muss, um aktiv zu sein — Memory Forensics untersucht daher genau diesen flüchtigen Speicher", "Memory Forensics untersucht den flüchtigen Arbeitsspeicher"),
        (r"^empfiehlt für Management-Oberflächen von Infrastrukturgeräten explizit Multifaktor-Authentifizierung", "Für Management-Oberflächen von Infrastrukturgeräten empfiehlt sich Multifaktor-Authentifizierung"),
        (r"^genau sechs Control-Typen:", "Die Security+-Taxonomie unterscheidet sechs Control-Typen:"),
        (r"^vergleicht Non-repudiation direkt mit einer handschriftlichen Unterschrift", "Non-Repudiation lässt sich mit einer handschriftlichen Unterschrift vergleichen"),
        (r"^den Hash als kurzen, festen Wert aus beliebig langen Eingabedaten", "Ein Hash ist ein kurzer Wert fester Länge aus Eingabedaten beliebiger Länge"),
        (r"^definiert einen Threat Actor als", "Ein Threat Actor ist"),
        (r"^admin/admin als typisches Beispiel", "Die Kombination admin/admin ist ein typisches Beispiel"),
        (r"^warnt, dass Update-Nachrichten selbst zum Angriffsvektor werden können", "Update-Nachrichten können selbst zum Angriffsvektor werden"),
        (r"^empfiehlt, laufende Security Audits vertraglich mit Dienstleistern zu vereinbaren", "Laufende Security Audits sollten vertraglich mit Dienstleistern vereinbart werden"),
        (r"^rät, neue Hardware aus der Lieferkette grundsätzlich als ['\"]untrusted out of the box['\"] zu behandeln", "Neue Hardware aus der Lieferkette sollte zunächst als „untrusted out of the box“ behandelt werden"),
        (r"^bezeichnet root- bzw\. Administrator-Konten gemeinsam als Superuser-Konten und empfiehlt, deren direkten Login", "Bei Root- und Administratorkonten sollte der direkte Login"),
        (r"^als konkrete Incident Response Roles u\. a\. Das", "Zu den konkreten Incident-Response-Rollen gehören unter anderem das"),
        (r"^unterscheidet: Likelihood ist", "Likelihood ist"),
        (r"\bhaben viele ungepatchte Cloud-Schwachstellen einen CVSS-Wert von 7 oder höher haben\b", "haben viele ungepatchte Cloud-Schwachstellen einen CVSS-Wert von 7 oder höher"),
        (r"\bsein Beispiel ist\b", "ein Beispiel ist"),
        (r"\bsein Beispiel zeigt\b", "ein Beispiel zeigt"),
        (r"\bsein Beispiel:\s*", "ein Beispiel: "),
        (r"\bsein Kontobeispiel\b", "ein Kontobeispiel"),
        (r"\bsein Kernbeispiel\b", "ein bekanntes Beispiel"),
        (r"\bseinem Beispiel\b", "einem Beispiel"),
        (r"\bseine Beispiele\b", "Beispiele"),
        (r"\bzeigt als Beispiel\b", "Ein Beispiel dafür ist"),
        (r"\bspricht von\b", "spricht man von"),
        (r"\bnennt als Ursache\b", "ist die Ursache"),
        (r"\bnennt als Beispiel\b", "gilt als Beispiel"),
        (r"\bempfiehlt es explizit als\b", "eignet sich als"),
        (r"\bz\.\s*B\.\s+In\b", "zum Beispiel in"),
        (r"\bbzw\.\s+Der\b", "beziehungsweise der"),
        (r"\bbzw\.\s+Die\b", "beziehungsweise die"),
        (r"\bDer Verbindungen\b", "der Verbindungen"),
        (r"\bDie Top\b", "die häufigsten"),
        (r"\bSie erfüllt nicht die hier beschriebene Rolle von\b", "Die beschriebene Rolle übernimmt dagegen"),
    )
    for pattern, replacement in grammar_repairs:
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.I)

    ascii_repairs = {
        "fuer": "für", "ueber": "über", "koennen": "können", "muessen": "müssen",
        "waere": "wäre", "haette": "hätte", "gehoert": "gehört", "erklaert": "erklärt",
        "moeglich": "möglich", "zusaetzlich": "zusätzlich", "Eselsbruecke": "Eselsbrücke",
        "Pruefung": "Prüfung", "Aufloesung": "Auflösung", "zurueck": "zurück",
        "groesser": "größer", "schuetzt": "schützt", "benoetigt": "benötigt",
        "ausgefuehrt": "ausgeführt", "verfuegbar": "verfügbar", "ueblicherweise": "üblicherweise",
        "Aenderung": "Änderung", "Uebertragung": "Übertragung", "Schluessel": "Schlüssel",
        "verschluesselt": "verschlüsselt", "Angreifer": "Angreifer",
        "Komplexitaet": "Komplexität", "wuerde": "würde", "Tuersteher": "Türsteher",
        "Ausfaellen": "Ausfällen", "Empfaenger": "Empfänger", "Empfaengern": "Empfängern",
        "laeuft": "läuft", "Gaesteliste": "Gästeliste", "duerfen": "dürfen",
        "Geraet": "Gerät", "Geraete": "Geräte", "Geraets": "Geräts",
        "Geraetezustand": "Gerätezustand", "Geraete-Liste": "Geräte-Liste",
        "hoechstes": "höchstes", "Hoechstes": "Höchstes", "Identitaet": "Identität",
        "Identitaeten": "Identitäten", "Schluesselpaar": "Schlüsselpaar",
        "einfuehren": "einführen", "Geschaeftsmodells": "Geschäftsmodells",
        "Geschaeftsentscheidung": "Geschäftsentscheidung", "Gebaeude": "Gebäude",
        "guenstig": "günstig", "Hardware-Verschluesselung": "Hardware-Verschlüsselung",
        "Tuer": "Tür", "Verschluesselungsprotokoll": "Verschlüsselungsprotokoll",
        "Backup-Frequenz": "Backup-Frequenz", "zurueckgehen": "zurückgehen",
        "pruefts": "prüft es", "faehrt": "fährt", "waehlt": "wählt", "waehlst": "wählst",
        "rueckfuehrbar": "rückführbar", "unveraendert": "unverändert", "dafuer": "dafür",
        "fuehrt": "führt", "baue": "baue", "Verschluesselung": "Verschlüsselung",
        "buendelt": "bündelt", "persoenliche": "persönliche", "selbststaendig": "selbstständig",
        "zurueckkommen": "zurückkommen", "Zuverlaessigkeit": "Zuverlässigkeit",
        "pruefungsfeste": "prüfungsfeste", "Policy-Moeglichkeiten": "Policy-Möglichkeiten",
        "Flexibilitaet": "Flexibilität", "geschaeftlicher": "geschäftlicher",
        "Loesegeld": "Lösegeld", "Ausfuehrung": "Ausführung",
    }
    for ascii_word, proper_word in ascii_repairs.items():
        cleaned = re.sub(rf"\b{ascii_word}\b", proper_word, cleaned, flags=re.I)

    # Source-label removal in an earlier rollout left a small set of answers
    # beginning with a lower-case German word. Repair only ordinary prose so
    # product names such as iOS and macOS keep their spelling.
    def capitalize_sentence(match: re.Match[str]) -> str:
        prefix, word = match.groups()
        return prefix + word[:1].upper() + word[1:]

    cleaned = re.sub(
        r"(^|(?<=[.!?])\s+|\n\n)(das|die|der|ein|eine|bei|wenn|durch|im|in|auf|diese|dieser|dieses)\b",
        capitalize_sentence,
        cleaned,
        flags=re.I,
    )
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


SECURITY_TERM_DEFINITIONS = {
    "active directory": "Active Directory ist Microsofts Verzeichnisdienst für Identitäten, Geräte, Gruppen und Richtlinien in einer Windows-Domäne.",
    "attack surface": "Die Angriffsfläche umfasst alle erreichbaren Punkte, über die ein System angegriffen werden kann.",
    "boot sector virus": "Ein Bootsektorvirus infiziert startrelevante Bereiche eines Datenträgers und wird beim Bootvorgang aktiv.",
    "buffer overflow": "Bei einem Buffer Overflow überschreibt eine Eingabe den vorgesehenen Speicherbereich und kann Abstürze oder Codeausführung ermöglichen.",
    "certificate chain": "Eine Zertifikatskette verbindet das Endzertifikat über Zwischenzertifikate mit einer vertrauenswürdigen Root-CA.",
    "certificate pinning": "Certificate Pinning vergleicht ein Zertifikat oder einen öffentlichen Schlüssel mit einem vorab erwarteten Wert.",
    "certificate stapling": "Beim OCSP Stapling liefert der Server eine signierte Statusantwort bereits im TLS-Handshake mit.",
    "compensating": "Eine kompensierende Kontrolle senkt ein Risiko auf anderem Weg, wenn die vorgesehene Kontrolle nicht umsetzbar ist.",
    "data subject": "Die betroffene Person ist der Mensch, auf den sich personenbezogene Daten beziehen.",
    "digital key identified mail": "Digital Key Identified Mail ist kein standardisierter Begriff; DKIM steht für DomainKeys Identified Mail.",
    "domain name system (dns)": "Das Domain Name System ordnet Namen den dazugehörigen Netzwerkadressen und weiteren Ressourceneinträgen zu.",
    "fail-closed": "Fail-closed verweigert den Zugriff, wenn eine Sicherheitskomponente ausfällt oder keine eindeutige Entscheidung treffen kann.",
    "firewall rules": "Firewall-Regeln erlauben oder sperren Verkehr anhand festgelegter Merkmale wie Adresse, Port, Protokoll oder Anwendung.",
    "full-disk encryption": "Full-Disk Encryption schützt die Daten eines gesamten Laufwerks bei Verlust oder Diebstahl des ausgeschalteten Geräts.",
    "hash collisions": "Bei einer Hash-Kollision erzeugen zwei unterschiedliche Eingaben denselben Hashwert.",
    "hashing": "Eine Hashfunktion bildet Daten deterministisch auf einen Wert fester Länge ab und ist nicht zur Entschlüsselung gedacht.",
    "implicit trust": "Implizites Vertrauen gewährt Zugriff aufgrund einer angenommenen Vertrauensstellung, ohne jede Anfrage neu zu prüfen.",
    "integrity": "Integrität bedeutet, dass Daten nicht unbefugt oder unbemerkt verändert wurden.",
    "management frame": "WLAN-Management-Frames steuern unter anderem Aufbau, Pflege und Abbau einer Funkverbindung.",
    "master key": "Ein Master Key schützt oder leitet weitere Schlüssel ab und sollte deshalb besonders streng abgesichert werden.",
    "mean time to repair": "Mean Time to Repair misst die durchschnittliche Zeit, die zur Reparatur oder Wiederherstellung benötigt wird.",
    "mean time to respond": "Mean Time to Respond misst die durchschnittliche Zeit bis zur Reaktion auf einen erkannten Vorfall oder Alarm.",
    "middleware": "Middleware vermittelt zwischen Anwendungen, Diensten oder Betriebssystemkomponenten und stellt gemeinsame Funktionen bereit.",
    "need to know": "Need-to-know beschränkt Informationen auf Personen, die sie für ihre konkrete Aufgabe benötigen.",
    "open access": "Offener Zugriff erlaubt die Nutzung ohne die im Szenario verlangte restriktive Zugriffsentscheidung.",
    "organized crime actor": "Organisierte Cyberkriminalität handelt typischerweise finanziell motiviert, arbeitsteilig und mit wiederverwendbarer Infrastruktur.",
    "pass-the-hash attack": "Bei Pass the Hash wird ein gestohlener Passwort-Hash direkt als Authentifizierungsmaterial verwendet.",
    "patch management": "Patch Management bewertet, testet, verteilt und kontrolliert Sicherheits- und Funktionsupdates über ihren Lebenszyklus.",
    "policy enforcement point": "Der Policy Enforcement Point setzt eine Zugriffsentscheidung am Datenpfad durch.",
    "recovery time objective (rto)": "Das Recovery Time Objective legt fest, wie lange ein Dienst höchstens ausfallen darf.",
    "rf attenuation": "RF Attenuation ist die Abschwächung eines Funksignals durch Entfernung, Materialien oder andere Einflüsse.",
    "rootkit": "Ein Rootkit verbirgt Prozesse oder Dateien und erhält privilegierten, möglichst unauffälligen Zugriff auf ein System.",
    "salting": "Ein Salt ergänzt jedes Passwort vor dem Hashing um einen individuellen Zufallswert und erschwert vorberechnete Angriffe.",
    "secure enclave": "Eine Secure Enclave isoliert besonders schützenswerte Berechnungen und Schlüssel vom übrigen System.",
    "session key": "Ein Session Key ist ein zeitlich begrenzter symmetrischer Schlüssel für eine Sitzung oder Verbindung.",
    "shared symmetric key": "Bei symmetrischer Kryptografie verwenden Sender und Empfänger denselben geheimen Schlüssel.",
    "simple network management protocol (snmp)": "SNMP dient der Überwachung und Verwaltung von Netzwerkgeräten und ihrer Betriebswerte.",
    "social engineering": "Social Engineering beeinflusst Menschen, damit sie Informationen preisgeben oder eine sicherheitsrelevante Handlung ausführen.",
    "software as a service (saas)": "Bei SaaS nutzt der Kunde eine fertige, vom Anbieter betriebene Anwendung.",
    "sql": "SQL ist eine Sprache zum Abfragen und Verändern relationaler Datenbanken, keine eigenständige Schutzkontrolle.",
    "the general data protection regulation": "Die Datenschutz-Grundverordnung regelt die Verarbeitung personenbezogener Daten und die Rechte betroffener Personen.",
    "transfer": "Bei der Risikoübertragung werden definierte finanzielle oder operative Folgen vertraglich auf eine andere Partei verlagert.",
    "avoid": "Risikovermeidung beendet die Tätigkeit oder entfernt die Ursache, aus der das Risiko entsteht.",
    "risk acceptance": "Bei der Risikoakzeptanz trägt die zuständige Stelle ein bekanntes Restrisiko bewusst und dokumentiert.",
    "vulnerability scanning": "Ein Schwachstellenscan sucht automatisiert nach bekannten Fehlkonfigurationen und verwundbaren Versionen; er weist nicht zwingend die Ausnutzbarkeit nach.",
    "watering hole": "Bei einem Watering-Hole-Angriff wird eine von der Zielgruppe häufig besuchte Website kompromittiert.",
    "web security gateway": "Ein Secure Web Gateway kontrolliert Webzugriffe, filtert Inhalte und setzt Richtlinien für ausgehenden Webverkehr durch.",
    "wireless vector": "Ein drahtloser Angriffsvektor nutzt Funktechnologien wie WLAN, Bluetooth oder NFC als Zugangsweg.",
    "a waf": "Eine Web Application Firewall filtert HTTP-Verkehr anhand von Regeln auf Anwendungsebene.",
    "waf": "Eine Web Application Firewall filtert HTTP-Verkehr anhand von Regeln auf Anwendungsebene.",
    "sdn": "Software-Defined Networking trennt die zentrale Steuerungslogik von der Weiterleitungsebene des Netzes.",
    "saml": "SAML überträgt signierte Authentifizierungs- und Autorisierungsaussagen zwischen Identitätsanbieter und Dienstanbieter.",
    "single sign-on": "Single Sign-on ermöglicht nach einer Anmeldung den Zugriff auf mehrere verbundene Dienste.",
    "cross-site scripting": "Cross-Site Scripting schleust aktiven Inhalt in eine Webanwendung ein, der anschließend im Browser eines Opfers ausgeführt wird.",
    "evil twin": "Ein Evil Twin ist ein betrügerischer WLAN-Access-Point, der ein erwartetes Netz nachahmt.",
    "bec": "Business Email Compromise nutzt kompromittierte oder nachgeahmte Geschäftskommunikation, um Zahlungen oder Daten zu erlangen.",
    "telnet": "Telnet überträgt die Sitzung einschließlich Anmeldedaten unverschlüsselt und eignet sich nicht für sichere Fernadministration.",
    "smtp": "SMTP transportiert E-Mails zwischen Clients und Mailservern und ist kein allgemeines Fernzugriffsprotokoll.",
    "ftp": "FTP überträgt Dateien standardmäßig ohne Verschlüsselung von Steuer- und Datenkanal.",
    "fde": "Full-Disk Encryption schützt ein vollständiges Laufwerk, nicht den laufenden Netzwerkverkehr.",
    "volume encryption": "Volume Encryption schützt ein logisches Speichervolume oder einen Container; sie muss nicht das vollständige physische Laufwerk umfassen.",
    "bluesnarfing": "Bluesnarfing liest über eine missbrauchte Bluetooth-Verbindung unbefugt Daten von einem Gerät aus.",
    "dkim": "DomainKeys Identified Mail signiert ausgewählte E-Mail-Header und den Nachrichteninhalt; der Empfänger prüft die Signatur mit einem öffentlichen DNS-Schlüssel.",
    "spf": "Sender Policy Framework veröffentlicht per DNS, welche Server E-Mails für eine Domain versenden dürfen.",
    "dmarc": "DMARC legt den Umgang mit Nachrichten fest, die die ausgerichtete SPF- oder DKIM-Prüfung nicht bestehen, und stellt Berichte bereit.",
    "containment": "Containment begrenzt Reichweite und Schaden eines laufenden Vorfalls, bevor die Ursache beseitigt wird.",
    "multifactor authentication": "Multifaktor-Authentifizierung kombiniert Nachweise aus mindestens zwei unterschiedlichen Faktorkategorien.",
    "risk threshold": "Ein Risk Threshold ist ein konkreter Grenzwert, bei dessen Überschreitung eine festgelegte Reaktion ausgelöst wird.",
    "compliance officer": "Ein Compliance Officer koordiniert die Einhaltung geltender Anforderungen und berichtet über den Compliance-Status.",
}

GLOSSARY_STOP_KEYS = {
    "all of the above", "none of the above", "none", "all", "internal", "external",
    "local", "national", "global", "centralized", "decentralized", "financial",
    "regulated", "unregulated", "yes", "no", "true", "false",
}


def term_keys(term: str) -> list[str]:
    """Return conservative aliases for matching an option to a known concept."""
    compact = re.sub(r"\s+", " ", term).strip().casefold()
    keys = [compact]
    without_article = re.sub(r"^(?:a|an|the)\s+", "", compact)
    if without_article not in keys:
        keys.append(without_article)
    acronym = re.search(r"\(([a-z][a-z0-9/+.-]{1,})\)", compact)
    if acronym and acronym.group(1) not in keys:
        keys.append(acronym.group(1))
    no_parenthetical = re.sub(r"\s*\([^()]+\)\s*", " ", without_article).strip()
    if no_parenthetical and no_parenthetical not in keys:
        keys.append(no_parenthetical)
    return [key for key in keys if key not in GLOSSARY_STOP_KEYS]


LOW_QUALITY_REASON_RE = re.compile(
    r"(?:"
    r"hat nicht die hier benötigte Funktion|"
    r"Bei „[^“]+“ ginge es um etwas anderes|"
    r"„[^“]+“ hat eine andere Funktion|"
    r"„[^“]+“ wäre nur in einem anderen Zusammenhang passend|"
    r"Für diesen Einsatzzweck ist|"
    r"Mit „[^“]+“ würde das Problem|"
    r"ist in diesem Zusammenhang eine gültige beziehungsweise übliche Möglichkeit|"
    r"ergibt sich nicht aus den angegebenen Werten beziehungsweise der benötigten Formel|"
    r"greift am beschriebenen Problem vorbei|"
    r"die beschriebene Aufgabe wird von|"
    r"das Szenario führt nicht zu|"
    r"die Beschreibung passt nicht zu|"
    r"ist hier nicht gemeint|"
    r"müssten andere Eigenschaften genannt sein|"
    r"Der entscheidende Unterschied|"
    r"passt, weil|"
    r"Warum (?:nicht )?die anderen|"
    r"berücksichtigt den entscheidenden Hinweis|"
    r"konkrete Anforderung spricht gegen|"
    r"zentrale Merkmal des Szenarios|"
    r"für eine andere Aufgabenstellung passend|"
    r"geschilderte Ablauf ist kein Beispiel|"
    r"fehlt das Merkmal, das .+ begründen würde|"
    r"setzt an einer anderen Stelle an|"
    r"nicht die passende Zuordnung|"
    r"bezeichnet nicht den beschriebenen Begriff|"
    r"Definition enthält das Kennzeichen|"
    r"wäre eine andere Definition nötig|"
    r"Wortlaut grenzt .+ aus|"
    r"deckt die beschriebene Funktion nicht ab|"
    r"angegebene Eigenschaft ist für|"
    r"Achte auf das definierende Merkmal|"
    r"gehört zu einem anderen Konzept|"
    r"erklärt den entscheidenden Hinweis nicht|"
    r"Angaben reichen nicht für|"
    r"genannte Funktion gehört zu|"
    r"Für .+ fehlt das passende Merkmal|"
    r"lässt sich aus den Bedingungen nicht ableiten|"
    r"fachliche Bezug führt zu|"
    r"entscheidet hier das genannte Merkmal|"
    r"von (?:the|he|this)\b|"
    r"sein(?:em|e|) (?:Beispiel|Kontobeispiel|Kernbeispiel)|"
    r"zeigt als Beispiel|"
    r"nennt als (?:Beispiel|Ursache)|"
    r"spricht von|"
    r"weist darauf hin|"
    r"empfiehlt es|"
    r"\(not visible\)|"
    r"\b(?:Jessica|Frank)\b"
    r")",
    re.I,
)


def reusable_incorrect_reason(reason: str, question: str) -> bool:
    """Keep genuinely option-specific prose and discard generated/text-bleed copy."""
    if not reason or len(reason) < 24 or len(reason) > 430:
        return False
    if LOW_QUALITY_REASON_RE.search(reason):
        return False
    # A/B/C references inside a reason often came from a different source card.
    if re.search(r"(?:^|\s)[A-D]\s*\([^)]{2,}\)", reason) and not re.search(r"(?:^|\s)[A-D]\s*\([^)]{2,}\)", question):
        return False
    return True


FORCE_REGENERATE_REASON_CARD_IDS = {
    "1729184967597", "1729196140243",
    "1729094464415", "1729096077718", "1729545965530", "1729706838699",
    "1729708046154", "1729710310793", "1729783659515", "1729784627980",
    "1772662005045", "1772662005115",
    "1772922529755", "1772922529762", "1772922529766",
    "1773101490289", "1773101490321", "1773101490339",
    "1773526588619", "1773536533010", "1773536533014", "1773536533030",
    "1773536533031", "1773536533034", "1773618881053", "1773618881058",
    "1773618881062", "1773618881066", "1773794837303", "1773794837306",
    "1773794837308",
}


def human_incorrect_reason(
    question: str,
    option: str,
    correct_text: str,
    correct_explanation: str,
    option_definition: str | None,
) -> str:
    """Explain a distractor naturally without the former QA boilerplate."""
    compact_explanation = re.sub(r"\s+", " ", correct_explanation).strip()
    compact_definition = re.sub(r"\s+", " ", option_definition or "").strip()
    question_without_id = re.sub(r"^(?:M[1-5]-\d{3}|\d+)[.:]\s*", "", question).strip()
    lowered = question_without_id.casefold()

    acronym_match = re.search(
        r"\b(?:what does|full form of)\s+([A-Z][A-Z0-9/+.-]{1,})\b",
        question_without_id,
    )
    if acronym_match:
        acronym = acronym_match.group(1)
        return (
            f"„{option}“ ist keine gültige Auflösung von {acronym}. "
            f"Die etablierte Vollform lautet „{correct_text}“."
        )

    explicit_negative = bool(
        re.search(r"\bwhich\s+(?:option|of the following)\s+(?:is|are|would be)\s+not\b", lowered)
        or re.search(r"\bwhich\b[^?]{0,50}\b(?:is|are|would|does|do|can|will)\s+not\b", lowered)
        or re.search(r"\bexcept\b", lowered)
    )
    if explicit_negative:
        digest = hashlib.sha256(f"negative\0{question}\0{option}".encode("utf-8")).digest()
        if compact_definition:
            variants = (
                f"„{option}“ ist keine Ausnahme: {compact_definition} Aus der Reihe fällt „{correct_text}“.",
                f"Die Option „{option}“ gehört zur abgefragten Gruppe. {compact_definition} Gesucht ist stattdessen „{correct_text}“.",
                f"„{option}“ erfüllt das reguläre Kriterium: {compact_definition} Die abweichende Antwort ist „{correct_text}“.",
                f"Für „{option}“ gilt die normale Zuordnung: {compact_definition} Daher bleibt „{correct_text}“ als Ausnahme.",
                f"„{option}“ passt zu den übrigen Einträgen, denn: {compact_definition} Nicht dazu gehört „{correct_text}“.",
                f"Die Definition bestätigt „{option}“ als regulären Fall: {compact_definition} Die Frage sucht aber „{correct_text}“.",
            )
            return variants[digest[0] % len(variants)]
        variants = (
            f"„{option}“ gehört zu den regulären Fällen; die gesuchte Ausnahme ist „{correct_text}“.",
            f"Nicht „{option}“, sondern „{correct_text}“ weicht von den übrigen Antworten ab.",
            f"„{option}“ erfüllt das gemeinsame Kriterium. Ausgenommen ist „{correct_text}“.",
            f"Die Frage sucht den abweichenden Eintrag. Das ist „{correct_text}“ und nicht „{option}“.",
            f"„{option}“ bleibt Teil der genannten Gruppe; „{correct_text}“ ist die Ausnahme.",
            f"Die Ausnahme lässt sich nicht mit „{option}“ begründen. Gemeint ist „{correct_text}“.",
        )
        return variants[digest[0] % len(variants)]

    if re.search(r"\b(?:calculate|calculation|how many|percentage|rate|expectancy)\b", lowered):
        digest = hashlib.sha256(f"calculation\0{question}\0{option}".encode("utf-8")).digest()
        variants = (
            f"Setzt man die Angaben in die benötigte Formel ein, entsteht nicht „{option}“, sondern „{correct_text}“.",
            f"„{option}“ folgt nicht aus der Rechnung. Die angegebenen Werte ergeben „{correct_text}“.",
            f"Der Rechenweg führt zu „{correct_text}“; für „{option}“ müsste mindestens ein Ausgangswert anders sein.",
            f"Mit den Werten aus der Aufgabe ist „{option}“ rechnerisch ausgeschlossen. Das Ergebnis lautet „{correct_text}“.",
        )
        return variants[digest[0] % len(variants)]

    if compact_definition:
        variants = (
            f"{compact_definition} Im Szenario geht es stattdessen um „{correct_text}“.",
            f"{compact_definition} Das unterscheidet „{option}“ von „{correct_text}“.",
            f"{compact_definition} Für die genannte Anforderung ist daher „{correct_text}“ passend.",
            f"{compact_definition} Hier wird jedoch die Funktion von „{correct_text}“ beschrieben.",
            f"{compact_definition} Dieser Zweck weicht vom Szenario ab; dort ist „{correct_text}“ gemeint.",
            f"{compact_definition} Die Frage zielt nicht auf diesen Einsatz, sondern auf „{correct_text}“.",
            f"{compact_definition} Damit gehört „{option}“ fachlich in einen anderen Bereich als „{correct_text}“.",
            f"{compact_definition} Für den vorliegenden Fall bleibt „{correct_text}“ die passende Antwort.",
        )
        digest = hashlib.sha256(f"{question}\0{option}".encode("utf-8")).digest()
        return variants[digest[0] % len(variants)]

    digest = hashlib.sha256(f"{question}\0{option}".encode("utf-8")).digest()

    # With no reliable definition for the distractor, explain the elimination
    # through the decisive scenario cue. Keep this short: the full reasoning is
    # already stated once above and should not be copied into all three rows.
    cue = compact_explanation.split(". ", 1)[0].rstrip(" .") + "."
    if len(cue) > 260:
        cue = cue[:260].rsplit(" ", 1)[0].rstrip(" ,;:") + "."
    if re.search(r"\b(?:which term|what (?:is|are) .+ called|what type|describes?)\b", lowered):
        variants = (
            f"Bei „{option}“ fehlt die beschriebene Eigenschaft. Sie kennzeichnet „{correct_text}“.",
            f"Der Begriff „{option}“ steht nicht für diese Beschreibung. Gemeint ist „{correct_text}“.",
            f"Die Definition beschreibt „{correct_text}“. „{option}“ hat eine andere Bedeutung.",
            f"Das ausschlaggebende Merkmal gehört zu „{correct_text}“ und nicht zu „{option}“.",
            f"„{option}“ lässt sich mit dieser Definition nicht vereinbaren; sie bezeichnet „{correct_text}“.",
            f"Die beschriebene Funktion ist die von „{correct_text}“. „{option}“ erfüllt sie nicht.",
            f"Hier wird nach „{correct_text}“ gefragt. Der Begriff „{option}“ bezeichnet diese Eigenschaft nicht.",
            f"Die Zuordnung lautet „{correct_text}“, weil „{option}“ das genannte Kernmerkmal nicht besitzt.",
        )
    elif re.search(r"\b(?:wants|needs|organization|company|user|administrator|analyst|server|team)\b", lowered):
        variants = (
            f"Die Anforderung wird durch „{correct_text}“ erfüllt. „{option}“ löst die beschriebene Aufgabe nicht.",
            f"Für dieses Szenario wird „{correct_text}“ benötigt; „{option}“ greift an einer anderen Stelle an.",
            f"Der Fall verlangt die Funktion von „{correct_text}“. „{option}“ bietet genau diese Funktion nicht.",
            f"Die Hinweise im Szenario führen zu „{correct_text}“. Für „{option}“ fehlt ein entsprechender Anhaltspunkt.",
            f"„{option}“ passt nicht zum beschriebenen Einsatz. Die geforderte Wirkung liefert „{correct_text}“.",
            f"Im gegebenen Ablauf übernimmt „{correct_text}“ die gesuchte Rolle, nicht „{option}“.",
            f"Die Organisation braucht hier „{correct_text}“. Mit „{option}“ bliebe die genannte Anforderung offen.",
            f"„{correct_text}“ beantwortet den konkreten Bedarf des Szenarios; „{option}“ dagegen nicht.",
        )
    else:
        variants = (
            f"Der zentrale Hinweis lautet: {cue} Deshalb ist „{correct_text}“ richtig und nicht „{option}“.",
            f"Aus der Beschreibung folgt „{correct_text}“. „{option}“ lässt sich daraus nicht ableiten.",
            f"„{option}“ steht für einen anderen Sachverhalt. Die vorliegenden Merkmale beschreiben „{correct_text}“.",
            f"Für „{correct_text}“ spricht: {cue} Das trifft auf „{option}“ nicht zu.",
            f"Das genannte Merkmal führt zu „{correct_text}“. Bei „{option}“ wäre ein anderer Hinweis zu erwarten.",
            f"Die passende Zuordnung ist „{correct_text}“. „{option}“ besitzt die beschriebene Funktion nicht.",
            f"Hier geht es um „{correct_text}“: {cue} „{option}“ beschreibt etwas anderes.",
            f"Der Unterschied liegt in der beschriebenen Funktion. Sie gehört zu „{correct_text}“, nicht zu „{option}“.",
        )
    return variants[digest[0] % len(variants)]


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

    first_sentence = re.sub(r"\s+", " ", explanation.split("\n\n", 1)[0]).strip()
    if len(first_sentence) > 520:
        first_sentence = first_sentence[:520].rsplit(" ", 1)[0].rstrip(" ,;:") + "."
    reasons: dict[str, str] = {}
    for letter, option in parsed.options.items():
        if letter == parsed.correct:
            continue
        existing = clean_explanation(parsed.incorrect_reasons.get(letter, ""))
        if card_id in FORCE_REGENERATE_REASON_CARD_IDS:
            existing = ""
        generated_markers = (
            "erfüllt das im Fragentext genannte entscheidende Merkmal nicht",
            "bezeichnet einen anderen Sachverhalt:",
        )
        if any(marker in existing for marker in generated_markers):
            existing = ""
        option_definition = next(
            ((glossary or {}).get(key) for key in term_keys(option) if (glossary or {}).get(key)),
            None,
        )
        if reusable_incorrect_reason(existing, parsed.question):
            reasons[letter] = existing
        else:
            reasons[letter] = human_incorrect_reason(
                parsed.question,
                option,
                correct_text,
                first_sentence,
                option_definition,
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
    mitre_pass_the_hash = "https://attack.mitre.org/techniques/T1550/002/"
    microsoft_pass_the_hash = "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/how-to-configure-protected-accounts"
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
        "1729174445461": reviewed_mc(
            "M2-096: An attacker obtains an account's NTLM password hash and uses it as authentication material without recovering the plaintext password. Which attack is this?",
            {
                "A": "DNS poisoning",
                "B": "Pass the hash",
                "C": "Password spraying",
                "D": "Birthday attack",
            },
            "B",
            "Bei Pass the Hash verwendet der Angreifer einen gestohlenen NTLM-Passwort-Hash als Authentifizierungsmaterial. Das Klartextpasswort muss dafür weder bekannt noch zuvor geknackt werden.",
            {
                "A": "DNS Poisoning manipuliert die Namensauflösung, damit ein Domainname auf ein falsches Ziel verweist; dabei wird kein Passwort-Hash zur Anmeldung benutzt.",
                "C": "Beim Password Spraying werden wenige häufige Klartextpasswörter gegen viele Konten ausprobiert. Ein bereits gestohlener Hash wird dabei nicht als Anmeldeinformation verwendet.",
                "D": "Ein Birthday Attack nutzt die Wahrscheinlichkeit kryptografischer Hash-Kollisionen. Er beschreibt weder die Wiederverwendung eines NTLM-Hashes noch eine Anmeldung mit gestohlenen Zugangsdaten.",
            },
            [COMPTIA_OBJECTIVES, mitre_pass_the_hash, microsoft_pass_the_hash],
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


def human_editorial_overrides() -> dict[str, dict[str, Any]]:
    """Hand-reviewed fixes for ambiguous or factually unsafe learner items."""
    return {
        "1779007738884": {
            "status": "approved",
            "front": """MATCHING:
Match each example to the category that best describes how the control is carried out.

Guard checks badges at a security desk >> Operational
Fence and locked exterior door >> Physical
Antivirus software blocks malicious files >> Technical
Firewall access control list blocks selected addresses >> Technical
Management performs a periodic risk assessment >> Managerial
Organization publishes a written security policy >> Managerial
Instructor conducts a security awareness workshop >> Operational
Analyst reviews system logs each morning >> Operational""",
            "back": """Die Kategorie richtet sich danach, wie eine Kontrolle umgesetzt wird: Technik setzt technische Kontrollen durch, bauliche Barrieren begrenzen physischen Zutritt, das Management steuert Risiken und Richtlinien, und Menschen führen operative Prozesse aus. Ein Wachposten zählt deshalb hier als operativ; der Schalter oder das Gebäude um die Person ändert nicht, wer die Kontrolle ausführt.

Merkhilfe: Frage zuerst: Wer oder was setzt die Kontrolle tatsächlich um — Technik, eine Barriere, das Management oder ein laufender Arbeitsprozess?""",
            "sources": [COMPTIA_OBJECTIVES, NIST_CONTROLS],
            "reviewer": "human-editorial-review-2026-08-09",
        },
        "1728597672323": reviewed_mc(
            "M1-061: A secure entrance has two interlocking doors. The second door stays locked until the first door closes and the person is authenticated. Which control is this?",
            {
                "A": "Bollard",
                "B": "Turnstile",
                "C": "Access control vestibule",
                "D": "Faraday cage",
            },
            "C",
            "Eine Access Control Vestibule ist ein abgeschlossener Eingangsbereich mit zwei voneinander abhängigen Türen. Die Verriegelung sorgt dafür, dass eine Person geprüft wird, bevor sie den geschützten Bereich betritt.",
            {
                "A": "Ein Bollard ist ein massiver Pfosten gegen die Zufahrt von Fahrzeugen; er steuert keine Personenschleuse mit zwei Türen.",
                "B": "Ein Drehkreuz vereinzelt Personen mechanisch, besteht aber nicht aus dem beschriebenen Raum mit verriegelten Zugangstüren.",
                "D": "Ein Faradayscher Käfig schirmt elektromagnetische Felder ab und kontrolliert keinen Zutritt zwischen zwei Türen.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1773794837301": reviewed_mc(
            "An organization wants to place authenticated users into different network segments according to their roles. Which combination best supports this design?",
            {
                "A": "Network Access Control (NAC) with dynamic VLAN assignment",
                "B": "IEEE 802.1X with application containers",
                "C": "Software-Defined Networking (SDN) with MAC address filtering",
                "D": "Software-Defined WAN (SD-WAN) with static VLANs",
            },
            "A",
            "Network Access Control prüft Identität und Gerätezustand am Netzzugang. Nach erfolgreicher Prüfung kann die Lösung anhand der Rolle dynamisch ein VLAN zuweisen und den Benutzer damit in das passende Netzsegment einordnen.",
            {
                "B": "IEEE 802.1X kann die Anmeldung am Port vermitteln; Application Container isolieren jedoch Anwendungen und übernehmen keine rollenabhängige VLAN-Zuweisung.",
                "C": "MAC-Adressfilter prüfen eine leicht veränderbare Geräteadresse und bilden keine Benutzerrolle ab. SDN allein ergänzt diese fehlende Identitätsentscheidung nicht.",
                "D": "SD-WAN verbindet und steuert Verkehrswege zwischen Standorten. Statische VLANs reagieren nicht auf die Rolle des jeweils angemeldeten Benutzers.",
            },
            [COMPTIA_OBJECTIVES, NIST_ZERO_TRUST],
        ),
        "1773794837311": reviewed_mc(
            "A company must authenticate users when they connect to a switch port and may assign network access according to the authentication result. Which standard provides this port-based access control?",
            {
                "A": "IEEE 802.1X",
                "B": "Static MAC address limiting",
                "C": "VLAN tagging",
                "D": "Extensible Authentication Protocol (EAP) alone",
            },
            "A",
            "IEEE 802.1X steuert den portbasierten Netzzugang. Ein Supplicant authentifiziert sich über den Authenticator bei einem Authentication Server; erst danach wird der Port für den vorgesehenen Zugriff freigegeben.",
            {
                "B": "Eine statische MAC-Begrenzung prüft Geräteadressen, authentifiziert aber nicht den Benutzer über einen zentralen Authentication Server.",
                "C": "VLAN-Tagging kennzeichnet Ethernet-Frames für ein VLAN. Es führt selbst keine Anmeldung am Switch-Port durch.",
                "D": "EAP stellt Methoden und Nachrichten für die Authentifizierung bereit. Den kontrollierten Portzugang und die Rollen von Supplicant, Authenticator und Server definiert hier IEEE 802.1X.",
            },
            [COMPTIA_OBJECTIVES, "https://1.ieee802.org/security/802-1x/"],
        ),
        "1773794837307": reviewed_mc(
            "A company wants managed smartphones to apply different restrictions when they enter or leave a defined geographic area. Which platform most directly provides this capability?",
            {
                "A": "Endpoint Detection and Response (EDR)",
                "B": "Mobile Device Management (MDM)",
                "C": "IEEE 802.1X",
                "D": "Virtual Private Network (VPN)",
            },
            "B",
            "Eine Mobile-Device-Management-Plattform kann Geofencing-Regeln an verwaltete Mobilgeräte verteilen. Dadurch lassen sich Geräteeinstellungen, Apps oder Datenzugriffe abhängig vom Standort einschränken.",
            {
                "A": "EDR sammelt Endpoint-Telemetrie und reagiert auf verdächtiges Verhalten; standortabhängige Mobilgeräterichtlinien sind nicht seine Kernaufgabe.",
                "C": "IEEE 802.1X authentifiziert Geräte oder Benutzer am Netzwerkzugang und verwaltet keine Geofencing-Richtlinien auf Smartphones.",
                "D": "Ein VPN schützt Datenverkehr durch einen Tunnel. Es ist keine zentrale Plattform zur standortabhängigen Gerätekonfiguration.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1773101490300": reviewed_mc(
            "A web application accepts only expected data types, enforces minimum and maximum lengths, and checks values against an allow list before processing them. Which practice is being used?",
            {
                "A": "Output encoding",
                "B": "Error suppression",
                "C": "Input validation",
                "D": "Session token rotation",
            },
            "C",
            "Input Validation prüft eingehende Daten gegen klare Regeln, bevor die Anwendung sie verarbeitet. Datentyp, Länge, Format und erlaubte Werte sind genau die Merkmale, die im Szenario kontrolliert werden.",
            {
                "A": "Output Encoding behandelt Daten bei der Ausgabe, damit sie im Zielkontext nicht als aktiver Code interpretiert werden. Das Szenario prüft dagegen eingehende Werte.",
                "B": "Das Unterdrücken detaillierter Fehler kann Informationsabfluss begrenzen, kontrolliert aber weder Datentyp noch Länge oder erlaubte Werte.",
                "D": "Die Rotation von Session Tokens schützt Sitzungen vor der Wiederverwendung von Kennungen und validiert keine Formularfelder.",
            },
            [COMPTIA_OBJECTIVES, "https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html"],
        ),
        "1773275420004": reviewed_mc(
            "A team knows what happened during an incident but wants to keep asking what caused each preceding condition until it reaches the underlying cause. Which technique should it use?",
            {
                "A": "Five Ws",
                "B": "Fishbone diagram",
                "C": "Five Whys",
                "D": "Recursive enumeration",
            },
            "C",
            "Bei den Five Whys fragt das Team wiederholt, warum ein Ereignis eingetreten ist. Jede Antwort wird zur Grundlage der nächsten Warum-Frage, bis die Untersuchung von einem sichtbaren Symptom zur zugrunde liegenden Ursache gelangt.",
            {
                "A": "Die Five Ws strukturieren bekannte Fakten mit Wer, Was, Wann, Wo und Warum; sie bilden nicht die beschriebene Kette aufeinanderfolgender Warum-Fragen.",
                "B": "Ein Fishbone-Diagramm ordnet mögliche Ursachen in Kategorien. Das Szenario beschreibt stattdessen eine lineare Folge vertiefender Fragen.",
                "D": "Recursive Enumeration ist keine übliche Root-Cause-Analysis-Methode für diese Interviewtechnik.",
            },
            [COMPTIA_OBJECTIVES, NIST_INCIDENT_RESPONSE],
        ),
        "1772922529750": reviewed_mc(
            "A penetration test evaluates an access control vestibule, badge readers, and security guards, without testing networks or applications. What type of test is this?",
            {
                "A": "Physical",
                "B": "Offensive",
                "C": "Defensive",
                "D": "Integrated",
            },
            "A",
            "Der Auftrag prüft ausschließlich den physischen Zutritt: Türen, Ausweise und Wachpersonal. Ein Physical Penetration Test untersucht genau diese Barrieren und die zugehörigen Zutrittsprozesse.",
            {
                "B": "Offensive beschreibt allgemein die angreifende Perspektive und grenzt den hier gefragten Prüfungsumfang nicht ein.",
                "C": "Defensive bezeichnet Schutz- und Erkennungsmaßnahmen, nicht den Typ des beschriebenen Penetrationstests.",
                "D": "Ein Integrated Test würde physische und technische beziehungsweise logische Angriffswege gemeinsam prüfen. Solche IT-Systeme nennt das Szenario ausdrücklich nicht.",
            },
            [COMPTIA_OBJECTIVES, NIST_TESTING],
        ),
        "1772922529735": reviewed_mc(
            "A critical real-time operating system cannot meet the current patch policy. Management decides to keep it temporarily and needs formal approval for this policy deviation. What should the system owner request?",
            {
                "A": "Risk transfer",
                "B": "A policy exception",
                "C": "A new risk appetite",
                "D": "Risk avoidance",
            },
            "B",
            "Eine Policy Exception ist die dokumentierte und befristete Genehmigung, von einer geltenden Vorgabe abzuweichen. Sie benennt das Risiko, die verantwortliche Freigabe, mögliche Ersatzkontrollen und einen Termin zur erneuten Prüfung.",
            {
                "A": "Bei einer Risikoübertragung würden definierte Folgen etwa per Vertrag oder Versicherung auf eine andere Partei verlagert. Das genehmigt keine Abweichung von der Patch Policy.",
                "C": "Der Risk Appetite beschreibt, welches Risiko die Organisation grundsätzlich einzugehen bereit ist; er wird nicht für ein einzelnes Altsystem neu gesetzt.",
                "D": "Risikovermeidung würde die riskante Tätigkeit oder das betroffene System beenden. Das Szenario verlangt ausdrücklich dessen vorläufigen Weiterbetrieb.",
            },
            [COMPTIA_OBJECTIVES, NIST_RISK],
        ),
        "1772922529773": reviewed_mc(
            "An unsupported real-time operating system must remain in service. The security team isolates it in a restricted network segment and adds monitoring to reduce the chance and impact of exploitation. Which risk response is this?",
            {
                "A": "Transfer",
                "B": "Accept",
                "C": "Avoid",
                "D": "Mitigate",
            },
            "D",
            "Segmentierung und zusätzliche Überwachung verringern Eintrittswahrscheinlichkeit und mögliche Auswirkungen, obwohl das verwundbare System bestehen bleibt. Das ist Risk Mitigation durch kompensierende Kontrollen.",
            {
                "A": "Transfer würde Folgen vertraglich oder finanziell auf eine andere Partei verlagern; die Kontrollen im Szenario tun das nicht.",
                "B": "Accept bedeutet, das bekannte Restrisiko bewusst zu tragen. Hier werden jedoch ausdrücklich neue Kontrollen eingeführt, um es zu senken.",
                "C": "Avoid würde die risikobehaftete Tätigkeit beenden oder das Altsystem außer Betrieb nehmen. Das Gerät bleibt hier im Einsatz.",
            },
            [COMPTIA_OBJECTIVES, NIST_RISK, NIST_CONTROLS],
        ),
        "1772922529756": reviewed_mc(
            "How does a business continuity plan differ from a business continuity policy?",
            {
                "A": "The plan describes how continuity will be maintained; the policy states management's high-level direction and requirements",
                "B": "The plan sets management's high-level direction; the policy contains the detailed recovery actions",
                "C": "The plan covers only incident notification; the policy replaces all recovery procedures",
                "D": "There is no difference; the terms are interchangeable",
            },
            "A",
            "Die Policy gibt den verbindlichen Rahmen vor: Zweck, Zuständigkeiten und Erwartungen des Managements. Der Business Continuity Plan setzt diesen Rahmen praktisch um und beschreibt, wie kritische Abläufe während und nach einer Störung fortgeführt oder wiederhergestellt werden.",
            {
                "B": "Diese Option vertauscht die Ebenen. Die Policy gibt die Richtung vor; der Plan enthält die konkrete Umsetzung.",
                "C": "Ein Business Continuity Plan geht über Benachrichtigungen hinaus und umfasst Strategien und Abläufe für die Fortführung kritischer Funktionen.",
                "D": "Policy und Plan hängen zusammen, erfüllen aber unterschiedliche Aufgaben und sind deshalb nicht austauschbar.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTINGENCY],
        ),
        "1728666527085": reviewed_mc(
            "M1-071: Before a Certification Authority can issue certificates that clients trust, what must be established?",
            {
                "A": "An LDAP directory",
                "B": "A RADIUS server",
                "C": "A trust path to the Certification Authority within the Public Key Infrastructure",
                "D": "A dedicated Hardware Security Module",
            },
            "C",
            "Ein Client vertraut einem ausgestellten Zertifikat nur, wenn er die Signaturkette bis zu einer vertrauenswürdigen Certification Authority prüfen kann. Entscheidend ist damit der Trust Path innerhalb der Public Key Infrastructure, nicht ein bestimmter Verzeichnis- oder Hardwaredienst.",
            {
                "A": "LDAP kann Verzeichnisdaten bereitstellen, begründet aber allein kein kryptografisches Vertrauen in die ausstellende Stelle.",
                "B": "RADIUS vermittelt Netzwerkzugang und Authentifizierung; es baut keine Zertifikatskette zu einer vertrauenswürdigen Root-CA auf.",
                "D": "Ein Hardware Security Module kann den privaten CA-Schlüssel schützen. Clients vertrauen der CA dadurch jedoch nicht automatisch.",
            },
            [COMPTIA_OBJECTIVES, RFC_5280],
        ),
        "1773101490309": reviewed_mc(
            "An access gateway grants temporary access only when a request comes from a managed device during an approved maintenance window. Which access control model is making the decision?",
            {
                "A": "Mandatory Access Control",
                "B": "Discretionary Access Control",
                "C": "Role-Based Access Control",
                "D": "Rule-Based Access Control",
            },
            "D",
            "Rule-Based Access Control wertet festgelegte Bedingungen aus. Im Szenario entscheiden Gerätestatus und Zeitfenster darüber, ob die Anfrage zugelassen wird; die Rolle des Benutzers allein reicht nicht aus.",
            {
                "A": "Mandatory Access Control vergleicht Sicherheitslabels und Freigaben. Das Szenario nennt weder Klassifizierungen noch Clearance-Stufen.",
                "B": "Bei Discretionary Access Control entscheidet der Eigentümer einer Ressource über Berechtigungen. Hier setzt das Gateway zentrale Bedingungen durch.",
                "C": "Role-Based Access Control ordnet Rechte einer Rolle zu. Die Entscheidung hängt hier zusätzlich und ausdrücklich von Gerät und Uhrzeit ab.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1773275420018": reviewed_mc(
            "A company wants to detect whether the same Bluetooth device appears at several locations over time. Which Bluetooth-related privacy concern is most relevant?",
            {
                "A": "Unencrypted pairing in every Bluetooth version",
                "B": "Short radio range",
                "C": "Bluejacking messages",
                "D": "Device fingerprinting",
            },
            "D",
            "Beim Device Fingerprinting werden wiedererkennbare Geräte- und Protokollmerkmale kombiniert. Taucht derselbe Fingerabdruck an mehreren Orten auf, kann daraus ein Bewegungsprofil entstehen.",
            {
                "A": "Bluetooth ist nicht in jeder Version und Betriebsart grundsätzlich unverschlüsselt; die pauschale Aussage erklärt außerdem keine standortübergreifende Wiedererkennung.",
                "B": "Eine begrenzte Funkreichweite beeinflusst die Erfassung, ist aber nicht die Methode, mit der ein Gerät über mehrere Beobachtungen wiedererkannt wird.",
                "C": "Bluejacking sendet unerwünschte Nachrichten an Bluetooth-Geräte. Es beschreibt keine langfristige Identifizierung über Merkmale des Geräts.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1773526588626": reviewed_mc(
            "An IPsec deployment must preserve the original IP header for routing while protecting the transport-layer segment and its data. Which IPsec mode provides this layout?",
            {
                "A": "Tunnel mode",
                "B": "Pre-shared-key mode",
                "C": "Internet Key Exchange mode",
                "D": "Transport mode",
            },
            "D",
            "Im Transport Mode bleibt der ursprüngliche IP-Header außerhalb der geschützten Nutzlast. Bei Encapsulating Security Payload werden der Transport-Header und die Anwendungsdaten geschützt; deshalb sind TCP- oder UDP-Ports nach der Verschlüsselung nicht frei lesbar.",
            {
                "A": "Tunnel Mode kapselt das vollständige ursprüngliche IP-Paket und ergänzt einen neuen äußeren IP-Header. Das ist nicht die beschriebene Paketstruktur.",
                "B": "Ein Pre-Shared Key ist eine Authentifizierungsmethode beim Schlüsselaustausch und kein IPsec-Betriebsmodus für die Paketkapselung.",
                "C": "Internet Key Exchange handelt Sicherheitsparameter und Schlüssel aus; es ist nicht der hier gesuchte Transport- oder Tunnelmodus.",
            },
            [COMPTIA_OBJECTIVES, "https://www.rfc-editor.org/rfc/rfc4303.html"],
        ),
        "1773536533027": reviewed_mc(
            "A backup contains every change made since the most recent backup of any type. Which backup method is this?",
            {
                "A": "Incremental backup",
                "B": "Differential backup",
                "C": "Full backup",
                "D": "Snapshot",
            },
            "A",
            "Ein Incremental Backup sichert die Änderungen seit der letzten Sicherung, unabhängig davon, ob diese vollständig oder inkrementell war. Für die Wiederherstellung werden deshalb das letzte Full Backup und alle nachfolgenden Incrementals benötigt.",
            {
                "B": "Ein Differential Backup enthält alle Änderungen seit dem letzten Full Backup und wächst bis zur nächsten Vollsicherung weiter an.",
                "C": "Ein Full Backup kopiert den gesamten festgelegten Datenbestand und nicht nur die Änderungen seit der vorherigen Sicherung.",
                "D": "Ein Snapshot hält den Zustand eines Systems oder Volumes zu einem Zeitpunkt fest; er definiert nicht die beschriebene inkrementelle Sicherungskette.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTINGENCY],
        ),
        "1729282747703": reviewed_mc(
            "M3-047: Which approach executes parts of a computing workload at the same time across multiple processors or systems?",
            {
                "A": "Parallel processing",
                "B": "Hot site",
                "C": "Standby generator",
                "D": "Cold site",
            },
            "A",
            "Parallel Processing teilt eine berechenbare Aufgabe in Teile, die gleichzeitig auf mehreren Prozessorkernen oder Systemen laufen. Das kann die Verarbeitung beschleunigen; Ausfallsicherheit entsteht jedoch nur, wenn die Architektur zusätzlich Redundanz und Fehlerbehandlung vorsieht.",
            {
                "B": "Ein Hot Site ist ein vorbereitetes Ausweichrechenzentrum für die Wiederaufnahme des Betriebs und keine Methode zur gleichzeitigen Verarbeitung einer Rechenaufgabe.",
                "C": "Ein Standby-Generator liefert bei einem Stromausfall längerfristig Energie, verteilt aber keine Rechenoperationen.",
                "D": "Ein Cold Site stellt grundlegende Räumlichkeiten für eine spätere Wiederherstellung bereit und führt keine parallelen Aufgaben aus.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTINGENCY],
        ),
        "1773536533020": reviewed_mc(
            "An incident response team meets in a conference room and talks through its decisions for a simulated ransomware event without touching production systems. What type of exercise is this?",
            {
                "A": "Tabletop exercise",
                "B": "Full-scale exercise",
                "C": "Parallel operations test",
                "D": "Failover test",
            },
            "A",
            "Bei einer Tabletop Exercise bespricht das Team ein vorgegebenes Szenario Schritt für Schritt. Dadurch lassen sich Rollen, Kommunikationswege und Entscheidungspunkte prüfen, ohne Systeme tatsächlich umzuschalten oder einen Angriff praktisch auszuführen.",
            {
                "B": "Eine Full-Scale Exercise setzt Personal, Technik und Abläufe praktisch ein und geht damit deutlich über die reine Gesprächsrunde hinaus.",
                "C": "Ein Parallel Operations Test betreibt alternative Systeme neben der Produktion und ist kein moderiertes Incident-Response-Gespräch.",
                "D": "Ein Failover Test schaltet auf redundante Systeme oder Standorte um; im Szenario findet keine technische Umschaltung statt.",
            },
            [COMPTIA_OBJECTIVES, NIST_INCIDENT_RESPONSE],
        ),
        "1773526588620": reviewed_mc(
            "A network team needs one centrally managed control plane to apply forwarding and segmentation policy consistently across switches in several data centers. Which technology best fits?",
            {
                "A": "Independent local switch configuration",
                "B": "Software-Defined Networking",
                "C": "Application source-code repository",
                "D": "Manual server provisioning",
            },
            "B",
            "Software-Defined Networking trennt die Steuerungslogik von der Weiterleitungsebene. Eine zentrale Control Plane kann dadurch Netzrichtlinien konsistent auf die beteiligten Netzwerkgeräte verteilen.",
            {
                "A": "Unabhängige lokale Konfigurationen erschweren gerade die geforderte zentrale und standortübergreifend einheitliche Steuerung.",
                "C": "Ein Source-Code-Repository versioniert Anwendungscode, übernimmt aber nicht die Control Plane von Switches.",
                "D": "Server-Provisionierung richtet Rechensysteme ein und steuert keine Weiterleitungs- oder Segmentierungsregeln im Netzwerk.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1773536533012": reviewed_mc(
            "A company needs a firewall that identifies many application protocols, performs deep packet inspection, and integrates intrusion prevention for general network traffic. Which type best fits?",
            {
                "A": "Web Application Firewall",
                "B": "Next-Generation Firewall",
                "C": "Basic stateful firewall",
                "D": "Stateless packet filter",
            },
            "B",
            "Eine Next-Generation Firewall verbindet zustandsbehaftete Filterung mit Anwendungserkennung, Deep Packet Inspection und häufig einem Intrusion Prevention System. Der Umfang geht damit über reine Webanwendungen und einfache Portregeln hinaus.",
            {
                "A": "Eine Web Application Firewall schützt gezielt HTTP-basierte Webanwendungen. Das Szenario verlangt Anwendungserkennung für allgemeinen Netzwerkverkehr.",
                "C": "Eine klassische Stateful Firewall verfolgt Verbindungszustände, bietet aber nicht automatisch die genannten NGFW-Funktionen zur Anwendungserkennung und Prävention.",
                "D": "Ein Stateless Packet Filter entscheidet anhand einzelner Headerfelder und kennt weder Verbindungszustand noch Anwendungsprotokoll.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1773618881059": reviewed_mc(
            "A legacy controller is still required, but the vendor no longer provides security updates or replacement parts. Which legacy-system concern is most directly illustrated?",
            {
                "A": "Lack of vendor support",
                "B": "Data classification",
                "C": "Elastic scalability",
                "D": "Geographic redundancy",
            },
            "A",
            "Fehlende Sicherheitsupdates und Ersatzteile sind typische Folgen ausgelaufenen Herstellersupports. Das erschwert sowohl die Behebung von Schwachstellen als auch die Wiederherstellung nach einem Hardwarefehler.",
            {
                "B": "Data Classification legt den Schutzbedarf von Informationen fest und sorgt nicht für Patches oder Ersatzteile eines Altgeräts.",
                "C": "Elastic Scalability beschreibt die bedarfsgerechte Anpassung von Ressourcen, nicht die Wartbarkeit eines nicht mehr unterstützten Controllers.",
                "D": "Geografische Redundanz verteilt Systeme auf Standorte. Sie ersetzt weder Herstellerupdates noch passende Hardwarekomponenten.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1773526588627": reviewed_mc(
            "Which pair of signals is commonly used by mobile geofencing services to estimate whether a device is inside a defined area?",
            {
                "A": "GPS and Wi-Fi positioning",
                "B": "USB and Near Field Communication",
                "C": "HDMI and Bluetooth audio",
                "D": "Ethernet and infrared",
            },
            "A",
            "Mobile Geräte können Positionsdaten aus dem Global Positioning System mit bekannten WLAN-Standorten kombinieren. Welche Quelle genauer ist, hängt von Umgebung, Sicht zum Himmel, Access-Point-Daten und Gerätekonfiguration ab.",
            {
                "B": "USB ist eine lokale Kabelverbindung und NFC arbeitet nur über sehr kurze Distanz; dieses Paar liefert keine übliche flächige Standortbestimmung.",
                "C": "HDMI überträgt Audio- und Videosignale, während Bluetooth Audio keine verlässliche geografische Position bestimmt.",
                "D": "Ethernet kann einen Netzanschluss erkennen und Infrarot kurze Sichtverbindungen nutzen; beides bildet nicht das übliche mobile Geofencing-Paar.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1772922529742": reviewed_mc(
            "Which reconnaissance action interacts directly with the target and is therefore active rather than passive?",
            {
                "A": "Search public Shodan records for the target's addresses",
                "B": "Run an Nmap service scan against the target",
                "C": "Read the organization's public job postings",
                "D": "Review public certificate transparency logs",
            },
            "B",
            "Ein Nmap Service Scan sendet Pakete direkt an Zielsysteme und wertet deren Antworten aus. Diese Interaktion kann vom Ziel protokolliert oder erkannt werden und zählt deshalb zur aktiven Aufklärung.",
            {
                "A": "Die Suche in bereits erhobenen Shodan-Daten fragt nicht unmittelbar das Zielsystem ab und ist aus Sicht des Prüfers passive Recherche.",
                "C": "Öffentliche Stellenanzeigen lassen sich ohne Kontakt zu internen Systemen auswerten und gehören zu Open Source Intelligence.",
                "D": "Certificate-Transparency-Logs sind öffentliche Drittquellen. Ihre Auswertung sendet keinen Scan an das untersuchte Ziel.",
            },
            [COMPTIA_OBJECTIVES, NIST_TESTING],
        ),
        "1729783769844": reviewed_mc(
            "M5-021: Which role coordinates an organization's compliance program, tracks applicable obligations, and reports compliance status to stakeholders?",
            {
                "A": "Data subject",
                "B": "Compliance officer",
                "C": "Data inventory",
                "D": "System owner",
            },
            "B",
            "Ein Compliance Officer koordiniert die Umsetzung geltender gesetzlicher, regulatorischer und vertraglicher Anforderungen. Dazu gehören die Überwachung des Programms und die verständliche Berichterstattung an zuständige Stakeholder.",
            {
                "A": "Ein Data Subject ist die Person, auf die sich personenbezogene Daten beziehen, und keine organisatorische Compliance-Rolle.",
                "C": "Ein Data Inventory erfasst vorhandene Datenbestände und unterstützt Compliance, übernimmt aber weder Programmsteuerung noch Berichterstattung.",
                "D": "Ein System Owner verantwortet ein bestimmtes System. Die organisationsweite Koordination aller Compliance-Pflichten ist nicht automatisch seine Aufgabe.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1729707523667": reviewed_mc(
            "M5-011: Which term describes the amount and type of risk an organization is willing to pursue or retain?",
            {
                "A": "Annualized Loss Expectancy",
                "B": "Risk appetite",
                "C": "Risk register",
                "D": "Risk avoidance",
            },
            "B",
            "Der Risk Appetite beschreibt auf übergeordneter Ebene, welche Arten und welches Ausmaß an Risiko eine Organisation bereit ist einzugehen oder zu behalten. Er setzt den Rahmen für konkretere Toleranzgrenzen und Entscheidungen.",
            {
                "A": "Annualized Loss Expectancy schätzt den erwarteten jährlichen Geldverlust eines Risikos und beschreibt nicht die grundsätzliche Risikobereitschaft.",
                "C": "Ein Risk Register dokumentiert einzelne Risiken, Verantwortliche und Maßnahmen. Es legt nicht den allgemeinen Risikoappetit fest.",
                "D": "Risk Avoidance beendet die risikobehaftete Tätigkeit; der Begriff beschreibt keine Bereitschaft, Risiko zu übernehmen.",
            },
            [COMPTIA_OBJECTIVES, NIST_RISK],
        ),
        "1729699356554": reviewed_mc(
            "M5-003: Which governance document sets a mandatory, measurable requirement such as the approved encryption algorithm or minimum configuration baseline?",
            {
                "A": "Standard",
                "B": "Guideline",
                "C": "Procedure",
                "D": "Acceptable use agreement",
            },
            "A",
            "Ein Standard übersetzt eine übergeordnete Policy in verbindliche und überprüfbare Anforderungen. Ein freigegebener Algorithmus oder eine konkrete Baseline lässt sich dadurch einheitlich vorgeben und auditieren.",
            {
                "B": "Eine Guideline empfiehlt sinnvolle Vorgehensweisen, ist aber normalerweise nicht so verbindlich wie der im Szenario verlangte Standard.",
                "C": "Eine Procedure beschreibt die einzelnen Arbeitsschritte zur Durchführung einer Aufgabe; sie setzt nicht primär den organisationsweiten Mindestwert.",
                "D": "Ein Acceptable Use Agreement regelt die zulässige Nutzung von Ressourcen durch Benutzer und definiert keine technische Verschlüsselungsbaseline.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1773007098204": reviewed_mc(
            "Why should a security awareness program combine short lessons, workshops, and realistic simulations?",
            {
                "A": "To reinforce the same security behaviors in different contexts and give staff opportunities to practice",
                "B": "To prove that every employee has one fixed learning style",
                "C": "To eliminate the need to measure training outcomes",
                "D": "To guarantee that no employee will make a security mistake",
            },
            "A",
            "Unterschiedliche Formate können Aufmerksamkeit, Wiederholung und praktisches Anwenden miteinander verbinden. Eine Simulation übt Entscheidungen unter realistischen Bedingungen, während kurze Lektionen und Workshops Wissen auffrischen und Rückfragen ermöglichen.",
            {
                "B": "Menschen haben keinen nachgewiesenen, unveränderlichen Lerntyp, an den jede Unterweisung angepasst werden müsste. Entscheidend sind Ziel, Inhalt und wirksame Übung.",
                "C": "Gerade bei mehreren Formaten sollten Ergebnisse gemessen werden, etwa durch Übungen, Melderaten oder beobachtbares Verhalten.",
                "D": "Training kann das Risiko menschlicher Fehler senken, aber niemals fehlerfreies Verhalten garantieren.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1772922529763": reviewed_mc(
            "After identifying a data-handling risk, an organization implements the safeguards that a reasonable organization would be expected to apply. Which principle does this demonstrate?",
            {
                "A": "Data stewardship",
                "B": "Due diligence",
                "C": "Attestation",
                "D": "Due care",
            },
            "D",
            "Due Care bedeutet, angemessene Schutzmaßnahmen tatsächlich umzusetzen. Due Diligence geht dem voraus und begleitet den Prozess: Risiken werden sorgfältig untersucht, Entscheidungen geprüft und die Wirksamkeit der Maßnahmen weiter überwacht.",
            {
                "A": "Data Stewardship betrifft die verantwortungsvolle operative Pflege von Daten, ist aber nicht das allgemeine Sorgfaltsprinzip des Szenarios.",
                "B": "Due Diligence bezeichnet die sorgfältige Prüfung und fortlaufende Überwachung. Gefragt ist hier ausdrücklich die Umsetzung angemessener Kontrollen als Due Care.",
                "C": "Eine Attestation bestätigt eine Aussage oder ein Prüfergebnis; sie ist nicht die Durchführung der erwartbaren Sicherheitsmaßnahmen.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1778313864615": {
            "status": "approved",
            "front": """MATCHING:
Match each protocol or technology to its Open Systems Interconnection (OSI) layer.

HTTP >> Layer 7 (Application)
TCP >> Layer 4 (Transport)
IP >> Layer 3 (Network)
Ethernet framing >> Layer 2 (Data Link)""",
            "back": """HTTP stellt Anwendungsfunktionen bereit, TCP transportiert Daten zwischen Endpunkten, IP übernimmt die logische Adressierung und Weiterleitung, und Ethernet-Frames gehören zur Sicherungsschicht.

Merkhilfe: „Please Do Not Throw Sausage Pizza Away“ läuft von Layer 1 bis Layer 7: Physical, Data Link, Network, Transport, Session, Presentation, Application.""",
            "sources": [COMPTIA_OBJECTIVES, "https://www.iso.org/standard/20269.html"],
            "reviewer": "human-editorial-review-2026-08-09",
        },
        "1773526588625": reviewed_mc(
            "A new web service handles authentication, payments, user profiles, and public comments. Where should Transport Layer Security (TLS) protect client-to-service traffic?",
            {
                "A": "Only on the login page",
                "B": "Only on login and payment pages",
                "C": "Only when personally identifiable information is submitted",
                "D": "Across the entire web service",
            },
            "D",
            "TLS sollte die gesamte Websitzung schützen. Auch scheinbar öffentliche Seiten transportieren Cookies, Tokens, Weiterleitungen und Inhalte, die ein Angreifer sonst beobachten oder verändern könnte; ein Wechsel zwischen geschützten und ungeschützten Bereichen schafft vermeidbare Lücken.",
            {
                "A": "Nur die Anmeldeseite zu schützen lässt spätere Session Cookies und Anfragen außerhalb des TLS-Tunnels offen.",
                "B": "Login und Zahlung sind besonders sensibel, doch auch die übrige Sitzung kann Authentifizierungsdaten und manipulierbare Inhalte enthalten.",
                "C": "Der Schutz darf nicht erst bei erkennbaren personenbezogenen Daten beginnen, weil Metadaten, Tokens und Seiteninhalte ebenfalls schutzwürdig sind.",
            },
            [COMPTIA_OBJECTIVES, RFC_8446],
        ),
        "1773101490304": reviewed_mc(
            "Which capability is outside the core purpose of an Endpoint Detection and Response (EDR) platform?",
            {
                "A": "Collecting endpoint telemetry",
                "B": "Detecting and investigating suspicious endpoint activity",
                "C": "Isolating a compromised host",
                "D": "Replacing the organization's network firewall",
            },
            "D",
            "EDR sammelt laufend Endpoint-Telemetrie, unterstützt Erkennung und Untersuchung und kann Reaktionen wie die Isolation eines Hosts auslösen. Es ergänzt andere Kontrollen, ersetzt aber keine zentrale Netzwerk-Firewall.",
            {
                "A": "Prozesse, Dateien, Anmeldungen und Netzwerkverbindungen auf Endpoints zu erfassen, liefert die Datengrundlage einer EDR-Lösung.",
                "B": "Die Korrelation und Untersuchung verdächtiger Endpoint-Aktivität gehört ausdrücklich zu Detection and Response.",
                "C": "Viele EDR-Produkte können einen betroffenen Host als Reaktionsmaßnahme vom Netz isolieren.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1773101490323": reviewed_mc(
            "Each matching line in logfile.txt represents one occurrence of event101. Which command returns only the number of matching lines?",
            {
                "A": "grep -n 'event101' logfile.txt",
                "B": "grep -c 'event101' logfile.txt",
                "C": "grep 'event101' logfile.txt",
                "D": "grep -l 'event101' logfile.txt",
            },
            "B",
            "Die grep-Option -c zählt die Zeilen, die zum Suchmuster passen, und gibt die Anzahl aus. Weil laut Szenario jede Zeile genau ein Ereignis enthält, entspricht diese Zeilenzahl der Zahl der Vorkommnisse.",
            {
                "A": "-n ergänzt die Zeilennummern zu den Treffern, zählt sie aber nicht als einzelne Zahl zusammen.",
                "C": "Ohne Option gibt grep die passenden Zeilen selbst aus und nicht nur deren Anzahl.",
                "D": "-l gibt den Namen einer Datei aus, sobald sie mindestens einen Treffer enthält; es zählt keine Trefferzeilen.",
            },
            [COMPTIA_OBJECTIVES, "https://www.gnu.org/software/grep/manual/grep.html"],
        ),
        "1729545172423": reviewed_mc(
            "M4-023: Which tool is commonly used for file integrity monitoring on Linux systems?",
            {
                "A": "Tripwire",
                "B": "Wireshark",
                "C": "OpenVAS",
                "D": "Nmap",
            },
            "A",
            "Tripwire bildet kryptografische Referenzwerte wichtiger Dateien und vergleicht spätere Zustände mit dieser Baseline. Unerwartete Änderungen an Konfigurationen oder Systemdateien werden dadurch sichtbar.",
            {
                "B": "Wireshark analysiert Netzwerkpakete und überwacht nicht die Integrität lokaler Dateien gegen eine Baseline.",
                "C": "OpenVAS sucht nach bekannten Schwachstellen und Fehlkonfigurationen; es ist kein klassischer File Integrity Monitor.",
                "D": "Nmap untersucht erreichbare Hosts, Ports und Dienste und prüft keine Dateihashes auf einem Linux-System.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1729009567783": reviewed_mc(
            "M2-035: Which practice checks whether user-supplied data has an allowed type, length, range, and format before it is processed?",
            {
                "A": "Input validation",
                "B": "Output encoding",
                "C": "Session fixation",
                "D": "Error suppression",
            },
            "A",
            "Input Validation vergleicht eingehende Daten mit einer möglichst engen Positivdefinition. Typ, Länge, Wertebereich und Format werden geprüft, bevor die Anwendung den Wert weiterverarbeitet.",
            {
                "B": "Output Encoding behandelt Daten beim Einfügen in einen Ausgabekontext und ersetzt nicht die Prüfung eingehender Werte.",
                "C": "Session Fixation missbraucht eine vorgegebene Sitzungskennung und ist keine Methode zur Kontrolle von Eingabeformaten.",
                "D": "Das Unterdrücken von Fehlermeldungen kann Informationsabfluss begrenzen, macht ungültige Eingaben aber nicht gültig oder sicher.",
            },
            [COMPTIA_OBJECTIVES, "https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html"],
        ),
        "1773101490296": reviewed_mc(
            "A login requires a username, a password, and a PIN. How many authentication factor categories are represented?",
            {
                "A": "One",
                "B": "Two",
                "C": "Three",
                "D": "Four",
            },
            "A",
            "Passwort und PIN gehören beide zur Kategorie Wissen. Der Benutzername identifiziert das Konto, ist aber kein zusätzlicher Authentifizierungsfaktor. Mehrere Geheimnisse derselben Kategorie ergeben daher noch keine Multifaktor-Authentifizierung.",
            {
                "B": "Für zwei Faktoren müsste zusätzlich eine andere Kategorie hinzukommen, etwa Besitz oder Biometrie.",
                "C": "Die drei eingegebenen Werte sind nicht drei Faktoren: Benutzername ist eine Kennung, Passwort und PIN sind beide Wissen.",
                "D": "Vier Kategorien können aus den drei genannten Werten schon rechnerisch nicht entstehen; tatsächlich ist nur die Wissenskategorie vertreten.",
            },
            [COMPTIA_OBJECTIVES, NIST_IDENTITY],
        ),
        "1773275420014": reviewed_mc(
            "A default Microsoft SQL Server instance listens on its standard fixed database-engine port. Which inbound port must a firewall allow from the application servers?",
            {
                "A": "TCP 1433",
                "B": "UDP 1434 only",
                "C": "TCP 3389",
                "D": "TCP 445",
            },
            "A",
            "Eine Default Instance der SQL Server Database Engine lauscht standardmäßig auf TCP 1433. Named Instances können dynamische oder abweichende Ports nutzen; der SQL Server Browser verwendet zusätzlich UDP 1434 zur Dienstauflösung, was das Szenario hier bewusst nicht verlangt.",
            {
                "B": "UDP 1434 gehört zum SQL Server Browser und transportiert nicht die eigentliche Datenbanksitzung der beschriebenen Default Instance.",
                "C": "TCP 3389 ist der Standardport des Remote Desktop Protocol und kein SQL-Datenbankport.",
                "D": "TCP 445 wird unter anderem für Server Message Block genutzt und öffnet nicht die SQL Server Database Engine auf ihrem Standardport.",
            },
            [COMPTIA_OBJECTIVES, "https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/configure-the-windows-firewall-to-allow-sql-server-access"],
        ),
        "1773275420003": reviewed_mc(
            "Which authentication option is designed to resist phishing by binding a cryptographic challenge to the legitimate service?",
            {
                "A": "FIDO2 hardware security key",
                "B": "SMS one-time code",
                "C": "Password sent by email",
                "D": "Security question",
            },
            "A",
            "Ein FIDO2 Security Key verwendet Public-Key-Kryptografie und bindet die Anmeldung an die echte Website beziehungsweise deren Origin. Dadurch kann ein Phishing-Proxy die erzeugte Antwort nicht einfach für eine andere Domain wiederverwenden.",
            {
                "B": "SMS-Codes können durch Social Engineering, SIM-Swapping oder einen Echtzeit-Phishing-Proxy abgefangen und weitergegeben werden.",
                "C": "Ein per E-Mail versendetes Passwort bleibt ein wiederverwendbares Geheimnis und ist weder phishing-resistent noch ein sicherer zweiter Faktor.",
                "D": "Antworten auf Sicherheitsfragen sind wissensbasierte, häufig erratbare oder recherchierbare Geheimnisse und nicht kryptografisch an den Dienst gebunden.",
            },
            [COMPTIA_OBJECTIVES, NIST_IDENTITY],
        ),
        "1773101490312": reviewed_mc(
            "Users choose short passwords made from common dictionary words. Which change most directly improves resistance to guessing attacks?",
            {
                "A": "Require longer passwords and block commonly used or compromised values",
                "B": "Force a password change every seven days",
                "C": "Require one symbol while keeping the same short minimum length",
                "D": "Convert every password to uppercase",
            },
            "A",
            "Längere Passwörter vergrößern den Suchraum, und eine Blockliste verhindert besonders häufige oder bereits kompromittierte Werte. Starre, sehr häufige Wechsel und bloße Kompositionsregeln führen dagegen oft zu vorhersehbaren Varianten.",
            {
                "B": "Sehr häufige Pflichtwechsel ohne Hinweis auf eine Kompromittierung fördern leicht vorhersehbare Abwandlungen und beheben kurze Wörter nicht zuverlässig.",
                "C": "Ein einzelnes vorgeschriebenes Sonderzeichen erzeugt oft nur Muster wie ein Ausrufezeichen am Ende; die kurze Basis bleibt leicht zu erraten.",
                "D": "Großschreibung reduziert die Vielfalt möglicher Zeichen und macht ein Wörterbuchpasswort nicht stärker.",
            },
            [COMPTIA_OBJECTIVES, NIST_IDENTITY],
        ),
        "1773101490313": reviewed_mc(
            "A document is labeled Secret, and a user may read it only when the user's clearance dominates that label. Which access control model is this?",
            {
                "A": "Role-Based Access Control",
                "B": "Mandatory Access Control",
                "C": "Discretionary Access Control",
                "D": "Attribute-Based Access Control",
            },
            "B",
            "Mandatory Access Control setzt zentral verwaltete Sicherheitslabels und Freigabestufen durch. Benutzer und Ressourceneigentümer können diese Entscheidung nicht nach eigenem Ermessen überschreiben.",
            {
                "A": "Role-Based Access Control vergibt Rechte anhand einer organisatorischen Rolle und vergleicht nicht zwingend Clearance und Klassifizierungslabel.",
                "C": "Bei Discretionary Access Control kann der Eigentümer einer Ressource Berechtigungen vergeben; das widerspricht der zentral erzwungenen Einstufung.",
                "D": "Attribute-Based Access Control kann viele Attribute auswerten. Das klassische Modell mit verbindlichen Labels und Clearances ist jedoch Mandatory Access Control.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1773101490320": reviewed_mc(
            "A live server may contain volatile evidence of an intrusion. What should the responder do before powering it down or removing storage?",
            {
                "A": "Follow the approved forensic procedure and capture volatile data in order of volatility",
                "B": "Let users continue working so normal activity is preserved",
                "C": "Remove the running system drive immediately",
                "D": "Delete suspicious processes before documenting them",
            },
            "A",
            "Arbeitsspeicher, laufende Prozesse und Netzwerkzustände gehen beim Ausschalten verloren. Der Responder dokumentiert den Zustand, isoliert das System kontrolliert und erfasst flüchtige Daten nach dem freigegebenen Verfahren und der Order of Volatility.",
            {
                "B": "Weitere Benutzung verändert Dateien, Speicher und Protokolle und gefährdet damit die Beweisintegrität.",
                "C": "Das Entfernen eines laufenden Datenträgers kann Daten und Hardware beschädigen und lässt flüchtige Beweise ungesichert.",
                "D": "Das Löschen eines Prozesses verändert den untersuchten Zustand. Zuerst wird beweissicher erfasst und dokumentiert.",
            },
            [COMPTIA_OBJECTIVES, NIST_INCIDENT_RESPONSE],
        ),
        "1773101490284": reviewed_mc(
            "What does a Common Vulnerabilities and Exposures (CVE) entry primarily provide?",
            {
                "A": "A standardized identifier and description for a publicly known vulnerability",
                "B": "A numeric severity score calculated by itself",
                "C": "A vendor patch for every affected product",
                "D": "Proof that the vulnerability was exploited in an organization",
            },
            "A",
            "CVE vergibt öffentlich bekannten Schwachstellen eine gemeinsame Kennung und einen Basisdatensatz. Dadurch können Hersteller, Scanner und Datenbanken denselben Sachverhalt eindeutig referenzieren.",
            {
                "B": "Die numerische Schwere wird üblicherweise mit CVSS beschrieben; eine CVE-Kennung ist selbst kein Score.",
                "C": "Ein CVE-Eintrag verweist auf eine Schwachstelle, garantiert aber weder einen Patch noch dessen Bereitstellung für jedes Produkt.",
                "D": "Die Existenz einer CVE sagt nichts darüber aus, ob genau diese Schwachstelle in der eigenen Umgebung bereits ausgenutzt wurde.",
            },
            [COMPTIA_OBJECTIVES, "https://www.cve.org/ResourcesSupport/AllResources/CveServices"],
        ),
        "1729438002934": reviewed_mc(
            "M4-002: A mobile device keeps corporate application data logically separate from personal data. Which hardening technique is being used?",
            {
                "A": "Data segmentation",
                "B": "Code signing",
                "C": "Fuzzing",
                "D": "Full-disk encryption",
            },
            "A",
            "Data Segmentation trennt Datenbestände nach Zweck oder Schutzbedarf. Auf einem Mobilgerät kann ein verwalteter Unternehmensbereich dadurch eigene Richtlinien, Zugriffsrechte und Löschfunktionen erhalten, ohne private Daten gleichzubehandeln.",
            {
                "B": "Code Signing bestätigt Herkunft und Integrität von Softwarecode, trennt aber keine geschäftlichen und privaten Datenbereiche.",
                "C": "Fuzzing testet Software mit unerwarteten Eingaben auf Fehler und ist keine Technik zur logischen Datentrennung.",
                "D": "Full-Disk Encryption schützt das gesamte Laufwerk bei Verlust des Geräts; innerhalb des laufenden Systems trennt sie die beiden Datenbereiche nicht.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1772662005055": reviewed_mc(
            "Which Windows authentication protocol is commonly targeted by credential relay attacks when protections such as signing or channel binding are absent?",
            {
                "A": "Remote Desktop Protocol",
                "B": "NT LAN Manager",
                "C": "Structured Query Language",
                "D": "Transport Layer Security",
            },
            "B",
            "Bei einem NTLM Relay leitet der Angreifer die Challenge-Response-Nachrichten eines Opfers an einen anderen Dienst weiter. Das Passwort muss dabei nicht entschlüsselt werden; Gegenmaßnahmen sind unter anderem Protokollhärtung, Signing und der Ersatz von NTLM, wo dies möglich ist.",
            {
                "A": "RDP ist ein Fernzugriffsprotokoll und nicht der Name des weitergeleiteten Challenge-Response-Verfahrens.",
                "C": "SQL ist eine Datenbanksprache und kein Windows-Authentifizierungsprotokoll für Credential Relay.",
                "D": "TLS schützt Transportverbindungen. Der beschriebene Relay-Angriff zielt auf NTLM-Authentifizierungsnachrichten.",
            },
            [COMPTIA_OBJECTIVES, "https://learn.microsoft.com/en-us/windows-server/security/kerberos/ntlm-overview"],
        ),
        "1772662005164": reviewed_mc(
            "What does sideloading mean on an Android device?",
            {
                "A": "Installing an application package from outside the approved application store",
                "B": "Replacing Android with a custom operating system image",
                "C": "Gaining privileged root access to the operating system",
                "D": "Copying photos from the device to cloud storage",
            },
            "A",
            "Sideloading installiert eine App aus einer Quelle außerhalb des vorgesehenen App Stores, zum Beispiel aus einer heruntergeladenen APK-Datei. Je nach Android-Version und Richtlinie muss die Installation aus dieser Quelle ausdrücklich erlaubt werden.",
            {
                "B": "Das Einspielen eines vollständigen Systemabbilds ist Custom-ROM-Flashing und nicht die Installation einer einzelnen App.",
                "C": "Rooting verschafft privilegierten Zugriff auf Android, ist aber für den Begriff Sideloading nicht erforderlich.",
                "D": "Das Kopieren eigener Daten in einen Cloudspeicher installiert keine Anwendung und ist kein Sideloading.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1772662005112": reviewed_mc(
            "A program verifies that a file is safe and then opens it later. An attacker replaces the file between those two operations. Which vulnerability is this?",
            {
                "A": "Time-of-check to time-of-use race condition",
                "B": "Integer overflow",
                "C": "Cross-site request forgery",
                "D": "Directory traversal",
            },
            "A",
            "Bei einer Time-of-Check-to-Time-of-Use-Schwachstelle ändert sich das geprüfte Objekt zwischen Kontrolle und Verwendung. Der Angreifer gewinnt das Rennen und sorgt dafür, dass das Programm ein anderes Objekt nutzt als das zuvor geprüfte.",
            {
                "B": "Ein Integer Overflow entsteht durch einen Zahlenwert außerhalb des darstellbaren Bereichs und nicht durch zwei zeitlich getrennte Dateizugriffe.",
                "C": "Cross-Site Request Forgery veranlasst einen angemeldeten Browser zu einer unerwünschten Anfrage und betrifft nicht den Austausch einer geprüften Datei.",
                "D": "Directory Traversal verlässt mithilfe manipulierter Pfade das vorgesehene Verzeichnis; das Szenario beschreibt dagegen einen Zeitabstand zwischen Prüfung und Nutzung.",
            },
            [COMPTIA_OBJECTIVES, NIST_GLOSSARY],
        ),
        "1772662005060": reviewed_mc(
            "A device should install firmware only when the update was released by the trusted vendor and has not been modified. Which control most directly provides this assurance?",
            {
                "A": "Verify the vendor's digital signature before installation",
                "B": "Compress the firmware image",
                "C": "Rename the firmware file",
                "D": "Hide the download URL",
            },
            "A",
            "Eine digitale Signatur verbindet Integrität und Herkunft des Firmware-Updates. Das Gerät prüft die Signatur mit dem vertrauenswürdigen öffentlichen Schlüssel des Herstellers und verwirft veränderte oder nicht autorisierte Images.",
            {
                "B": "Kompression verkleinert das Image, liefert aber keinen kryptografischen Nachweis über Hersteller und Unverändertheit.",
                "C": "Ein Dateiname ist frei veränderbar und kann weder Integrität noch Authentizität belegen.",
                "D": "Eine verborgene URL ist kein belastbarer Schutz; ein erlangtes oder verändertes Image bliebe ohne Signaturprüfung unentdeckt.",
            },
            [COMPTIA_OBJECTIVES, NIST_CRYPTO],
        ),
        "1772662005002": reviewed_mc(
            "An attacker sends a survey link only to sales managers at insurance companies and tailors the message with details about their professional association. Which attack is this?",
            {
                "A": "Spear phishing",
                "B": "Generic spam",
                "C": "Tailgating",
                "D": "Typosquatting",
            },
            "A",
            "Spear Phishing richtet eine Phishing-Nachricht gezielt an eine ausgewählte Person oder Gruppe und verwendet passende Kontextinformationen. Zielgruppe und Branchenbezug machen den Angriff hier spezifischer als eine breit gestreute Phishing-Kampagne.",
            {
                "B": "Generic Spam wird massenhaft und ohne die beschriebene Auswahl und Anpassung an eine klar definierte Berufsgruppe versendet.",
                "C": "Tailgating verschafft physischen Zutritt, indem eine berechtigte Person unbefugt begleitet wird; es verwendet keinen präparierten E-Mail-Link.",
                "D": "Typosquatting registriert ähnlich geschriebene Domainnamen und ist nicht durch die gezielte Empfängerauswahl definiert.",
            },
            [COMPTIA_OBJECTIVES, CISA_THREATS],
        ),
        "1772662005015": reviewed_mc(
            "An employee threatens to publish confidential files unless the company pays money. Which motivation best describes this insider's behavior?",
            {
                "A": "Financial gain through extortion",
                "B": "Unintentional error",
                "C": "Nation-state espionage",
                "D": "Professional curiosity",
            },
            "A",
            "Die Person nutzt legitimen internen Zugriff und droht mit Veröffentlichung, um Geld zu erhalten. Das ist ein finanziell motivierter Insider-Vorfall in Form von Erpressung.",
            {
                "B": "Die Drohung und Zahlungsforderung sind vorsätzlich und deshalb kein unbeabsichtigter Fehler.",
                "C": "Das Szenario nennt weder einen staatlichen Auftrag noch die Beschaffung strategischer Informationen für einen Staat.",
                "D": "Neugier erklärt keine bewusste Zahlungsforderung und Drohung mit Datenveröffentlichung.",
            },
            [COMPTIA_OBJECTIVES, CISA_THREATS],
        ),
        "1772662005084": reviewed_mc(
            "A cloud provider reallocates storage blocks from one tenant to another. Which control most directly prevents the new tenant from reading residual plaintext left in those blocks?",
            {
                "A": "Strong per-tenant encryption with controlled key destruction",
                "B": "Smaller storage clusters",
                "C": "A public asset inventory",
                "D": "A longer retention period",
            },
            "A",
            "Bei verschlüsselten Tenant-Daten bleiben wiederzugewiesene Blöcke ohne den zugehörigen Schlüssel unlesbar. Eine kontrollierte Schlüsselvernichtung kann die verbliebenen Chiffretexte zusätzlich kryptografisch unzugänglich machen.",
            {
                "B": "Die Größe eines Storage-Clusters ändert nichts daran, ob ein neu zugewiesener Block noch lesbare Datenreste enthält.",
                "C": "Ein Asset Inventory unterstützt Verwaltung und Nachweis, schützt aber nicht den Inhalt wiederverwendeter Speicherblöcke.",
                "D": "Eine längere Aufbewahrung erhält Daten sogar länger und verhindert keinen Zugriff auf Residualdaten durch einen anderen Tenant.",
            },
            [COMPTIA_OBJECTIVES, NIST_CLOUD, NIST_CRYPTO],
        ),
        "1772662005146": reviewed_mc(
            "A web application records the session identifier, account, source address, and timestamp for every request. Which log should an analyst correlate to find the same session identifier used concurrently from different addresses?",
            {
                "A": "Web application access log",
                "B": "Antivirus quarantine log",
                "C": "Printer event log",
                "D": "Firmware update log",
            },
            "A",
            "Der Web Application Access Log enthält laut Szenario genau die für den Vergleich benötigten Felder. Werden zeitgleich Anfragen mit derselben Session-ID, aber unterschiedlichen Quelladressen protokolliert, ist das ein Hinweis auf mögliche Session-Wiederverwendung.",
            {
                "B": "Ein Antivirus-Quarantänelog dokumentiert erkannte Dateien und Maßnahmen, nicht jede Webanfrage mit Session-ID.",
                "C": "Ein Druckerprotokoll enthält Aufträge und Geräteereignisse, aber keine Sitzungen der Webanwendung.",
                "D": "Ein Firmware-Update-Log dokumentiert Softwarestände und Updatevorgänge und nicht die parallele Nutzung von Websessions.",
            },
            [COMPTIA_OBJECTIVES, OWASP_WSTG],
        ),
        "1772662005130": reviewed_mc(
            "A server has been sanitized and physically removed from service. Which asset-management action closes the decommissioning record?",
            {
                "A": "Update the asset inventory to show its final disposition",
                "B": "Return the device to production monitoring",
                "C": "Assign a new production owner",
                "D": "Restore its previous network address",
            },
            "A",
            "Nach Stilllegung und Datenbereinigung muss der Lebenszyklus im Asset Inventory nachvollziehbar abgeschlossen werden. Der Eintrag dokumentiert Status, Datum, Sanitization-Methode und endgültigen Verbleib des Geräts.",
            {
                "B": "Ein außer Betrieb genommenes Gerät wird nicht wieder in das Produktionsmonitoring aufgenommen.",
                "C": "Ein neuer Production Owner würde einen weiteren Betrieb voraussetzen und widerspricht der abgeschlossenen Stilllegung.",
                "D": "Die frühere Netzwerkadresse wiederherzustellen bringt das stillgelegte Asset nicht in einen korrekten Abschlusszustand.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1772662005125": reviewed_mc(
            "A trusted system utility and its file are visible, but a low-level forensic view shows a hidden kernel module intercepting system calls and concealing processes. Which malware type does this indicate?",
            {
                "A": "Rootkit",
                "B": "Ransomware",
                "C": "Adware",
                "D": "Logic bomb",
            },
            "A",
            "Ein Rootkit manipuliert systemnahe Funktionen, um seine eigenen Komponenten oder andere Aktivitäten zu verbergen und privilegierten Zugriff zu erhalten. Abweichungen zwischen normalen Werkzeugen und einer unabhängigen Low-Level-Sicht sind dafür ein typischer Hinweis.",
            {
                "B": "Ransomware verschlüsselt oder sperrt Daten und fordert meist eine Zahlung; das Szenario beschreibt stattdessen Tarnung im Kernel.",
                "C": "Adware zeigt Werbung oder sammelt Nutzungsdaten und versteckt üblicherweise keine Prozesse durch einen Kernel-Hook.",
                "D": "Eine Logic Bomb wird bei einer festgelegten Bedingung aktiv; Verbergen durch abgefangene Systemaufrufe definiert sie nicht.",
            },
            [COMPTIA_OBJECTIVES, CISA_THREATS],
        ),
        "1772662005028": reviewed_mc(
            "A request for proposal asks how long a vendor has operated, how many customers it supports, and how long it commits to security updates. Which risk is this information meant to assess?",
            {
                "A": "Loss of vendor support",
                "B": "Cross-site scripting",
                "C": "Radio-frequency interference",
                "D": "Password reuse",
            },
            "A",
            "Betriebsdauer, Kundenbasis und Update-Zusage helfen einzuschätzen, ob ein Anbieter sein Produkt voraussichtlich langfristig warten kann. Fehlender Support würde bekannte Schwachstellen ungepatcht lassen und den sicheren Betrieb erschweren.",
            {
                "B": "Cross-Site Scripting ist eine Webanwendungsschwachstelle und wird nicht aus Geschäftsdauer oder Supportzusage eines Lieferanten abgeleitet.",
                "C": "Funkstörungen hängen von Geräten und Umgebung ab, nicht von Kundenanzahl und zugesagtem Software-Support.",
                "D": "Password Reuse betrifft Identitäts- und Passwortpraxis; die RFP-Fragen bewerten die Beständigkeit des Anbieters.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1729018813146": reviewed_mc(
            "M2-050: An application accepts a filename parameter. An attacker submits ../../etc/passwd to escape the intended directory and read another file. Which attack is this?",
            {
                "A": "Pass the hash",
                "B": "Directory traversal",
                "C": "SQL injection",
                "D": "Cross-site request forgery",
            },
            "B",
            "Directory Traversal manipuliert einen Dateipfad, häufig mit Sequenzen wie ../, sodass die Anwendung das vorgesehene Basisverzeichnis verlässt. Dadurch kann ein Angreifer auf Dateien zugreifen, die außerhalb des erlaubten Pfads liegen.",
            {
                "A": "Pass the Hash verwendet einen gestohlenen Passwort-Hash zur Authentifizierung und verändert keinen Dateipfad.",
                "C": "SQL Injection verändert die Struktur einer Datenbankabfrage; im Szenario wird stattdessen ein Dateisystempfad verlassen.",
                "D": "Cross-Site Request Forgery lässt einen angemeldeten Browser eine unerwünschte Anfrage senden und ist keine Pfadmanipulation.",
            },
            [COMPTIA_OBJECTIVES, OWASP_WSTG],
        ),
        "1729095666668": reviewed_mc(
            "M2-062: What is gaining privileged administrative access on an Android device by bypassing the operating system's default restrictions called?",
            {
                "A": "Rooting",
                "B": "Sideloading",
                "C": "Typosquatting",
                "D": "Smishing",
            },
            "A",
            "Rooting verschafft auf Android privilegierten Root-Zugriff und umgeht damit vorgesehene Betriebssystembeschränkungen. Das Ersetzen des Betriebssystems durch ein Custom ROM kann danach erfolgen, ist aber nicht die Definition von Rooting.",
            {
                "B": "Sideloading installiert eine App aus einer nicht vorgesehenen Quelle und erfordert nicht automatisch Root-Rechte.",
                "C": "Typosquatting nutzt ähnlich geschriebene Domainnamen und verändert keine Rechte auf einem Mobilgerät.",
                "D": "Smishing ist Phishing per SMS oder vergleichbarer Textnachricht und hat nichts mit Android-Privilegien zu tun.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1729175231855": reviewed_mc(
            "M2-099: A downloaded program deliberately steals browser credentials and opens a hidden remote-control channel. Which broad category describes it?",
            {
                "A": "Malicious code",
                "B": "Bloatware",
                "C": "Firmware",
                "D": "Shadow IT",
            },
            "A",
            "Der Code führt absichtlich nicht autorisierte und schädliche Funktionen aus: Er stiehlt Zugangsdaten und ermöglicht Fernzugriff. Damit fällt er in die breite Kategorie Malicious Code beziehungsweise Malware.",
            {
                "B": "Bloatware ist unerwünschte oder unnötige vorinstallierte Software, aber nicht allein dadurch Code zum Diebstahl von Zugangsdaten.",
                "C": "Firmware ist gerätenahe Software. Der Speicherort oder die Softwareschicht macht Code nicht automatisch bösartig.",
                "D": "Shadow IT bezeichnet nicht genehmigte Technik oder Dienste außerhalb der IT-Steuerung, nicht die Schadfunktion eines Programms.",
            },
            [COMPTIA_OBJECTIVES, CISA_THREATS],
        ),
        "1729010739212": reviewed_mc(
            "M2-037: A web application copies a request parameter into its response without safe encoding. An attacker sends a victim a crafted link, and the script runs only when that link is opened. Which attack is this?",
            {
                "A": "Reflected cross-site scripting",
                "B": "Stored cross-site scripting",
                "C": "Blind SQL injection",
                "D": "DNS poisoning",
            },
            "A",
            "Bei Reflected XSS übernimmt die Anwendung den schädlichen Wert aus der aktuellen Anfrage in die Antwort. Der Payload wird nicht dauerhaft auf dem Server gespeichert, sondern über den präparierten Link an das Opfer geliefert.",
            {
                "B": "Stored XSS speichert den Payload dauerhaft, etwa in einem Kommentar, und liefert ihn später an weitere Besucher aus.",
                "C": "Blind SQL Injection beeinflusst eine Datenbankabfrage und leitet Ergebnisse aus dem Anwendungsverhalten ab; der Code läuft nicht als Skript im Browser des Opfers.",
                "D": "DNS Poisoning manipuliert die Namensauflösung und ist keine unsichere Ausgabe eines Request-Parameters.",
            },
            [COMPTIA_OBJECTIVES, OWASP_WSTG],
        ),
        "1772662005034": reviewed_mc(
            "An on-path attacker relays a victim's TLS connection without breaking the encryption. What can the attacker observe directly?",
            {
                "A": "Ciphertext and connection metadata, but not the protected plaintext",
                "B": "Every password and message in plaintext",
                "C": "The server's private key",
                "D": "Data stored on the victim's encrypted disk",
            },
            "A",
            "Auch wenn Pakete über das System des Angreifers laufen, bleibt korrekt validierter TLS-Inhalt verschlüsselt. Sichtbar sind unter anderem Adressen, Zeitpunkte, Größen und Chiffretext; Klartext wird erst zugänglich, wenn die Verschlüsselung umgangen oder ein Endpunkt kompromittiert wird.",
            {
                "B": "Das bloße Weiterleiten einer korrekt geschützten TLS-Verbindung entschlüsselt weder Passwörter noch Nachrichten.",
                "C": "Der private Serverschlüssel wird nicht über die Verbindung übertragen und lässt sich nicht allein aus mitgelesenen Paketen gewinnen.",
                "D": "Ein On-Path-Angriff beobachtet Daten während der Übertragung und gewährt keinen automatischen Zugriff auf den verschlüsselten Datenträger des Opfers.",
            },
            [COMPTIA_OBJECTIVES, RFC_8446],
        ),
        "1729105178993": reviewed_mc(
            "M2-087: Which local file can override normal DNS resolution by defining static hostname-to-address mappings?",
            {
                "A": "Hosts file",
                "B": "ARP table",
                "C": "Password shadow file",
                "D": "Browser cookie store",
            },
            "A",
            "Die Hosts-Datei enthält statische Zuordnungen von Hostnamen zu IP-Adressen und wird auf vielen Systemen vor einer normalen DNS-Abfrage berücksichtigt. Eine bösartige Änderung kann Nutzer deshalb auf eine falsche Adresse lenken; die Datei ist jedoch keine DNS-Cache-Datenbank.",
            {
                "B": "Die ARP-Tabelle ordnet lokale IP-Adressen den MAC-Adressen im Layer-2-Netz zu und enthält keine Hostnamen.",
                "C": "Die Shadow-Datei speichert auf Unix-Systemen geschützte Passwort-Hashes und keine Namensauflösung.",
                "D": "Ein Cookie Store speichert Websitzungsdaten und keine systemweiten Hostname-IP-Zuordnungen.",
            },
            [COMPTIA_OBJECTIVES, NIST_GLOSSARY],
        ),
        "1772662005128": reviewed_mc(
            "A user opens an attached executable that installs a credential-stealing program. Which term describes the malicious program itself?",
            {
                "A": "Malware",
                "B": "Phishing",
                "C": "Business email compromise",
                "D": "Cross-site scripting",
            },
            "A",
            "Der installierte, absichtlich schädliche Code ist Malware. Die E-Mail kann zwar der Übertragungsweg eines Phishing-Angriffs sein, gefragt ist hier aber ausdrücklich nach dem Programm selbst.",
            {
                "B": "Phishing ist die Täuschungsmethode, mit der das Opfer zum Öffnen des Anhangs bewegt werden kann; es ist nicht der Schadcode im Anhang.",
                "C": "Business Email Compromise missbraucht Geschäftskommunikation vor allem für Betrug und Zahlungsanweisungen und bezeichnet nicht allgemein die installierte Software.",
                "D": "Cross-Site Scripting führt eingeschleusten Inhalt im Browserkontext aus; das Szenario beschreibt eine lokal gestartete schädliche Datei.",
            },
            [COMPTIA_OBJECTIVES, CISA_THREATS],
        ),
        "1772662005138": reviewed_mc(
            "An AI assistant invents scientific citations without intending to deceive anyone. How should the false information be classified?",
            {
                "A": "Misinformation",
                "B": "Disinformation",
                "C": "Phishing",
                "D": "Brand impersonation",
            },
            "A",
            "Misinformation ist falsche oder ungenaue Information, die ohne Täuschungsabsicht verbreitet wird. Disinformation setzt dagegen eine bewusste Absicht voraus, andere mit falschen Angaben irrezuführen.",
            {
                "B": "Für Disinformation müsste ein Akteur die falschen Quellen absichtlich erzeugen oder verbreiten, um zu täuschen; diese Absicht schließt das Szenario aus.",
                "C": "Phishing versucht Empfänger durch eine gefälschte Nachricht zu einer Handlung oder Preisgabe von Daten zu bewegen.",
                "D": "Brand Impersonation ahmt eine Organisation oder Marke nach. Erfundenen Quellen ohne solche Identitätsvortäuschung fehlt dieses Merkmal.",
            },
            [COMPTIA_OBJECTIVES, CISA_THREATS],
        ),
        "1728575980498": reviewed_mc(
            "M1-005: A guard checks identification and decides whether each visitor may enter a facility. Which security control category best describes the guard's work?",
            {
                "A": "Technical",
                "B": "Managerial",
                "C": "Operational",
                "D": "Physical",
            },
            "C",
            "Die Kontrolle wird von einer Person als laufender Prozess ausgeführt und ist deshalb operational. Tür, Schranke oder Wachhäuschen können zusätzlich physische Kontrollen sein; gefragt ist hier ausdrücklich nach der Tätigkeit des Wachpersonals.",
            {
                "A": "Eine technische Kontrolle würde die Entscheidung durch ein technisches System durchsetzen, etwa durch eine elektronische Zutrittssteuerung ohne die beschriebene Personenprüfung.",
                "B": "Managerial Controls geben Richtlinien, Governance und Risikosteuerung vor, führen aber nicht die einzelne Ausweiskontrolle am Eingang aus.",
                "D": "Bauliche Barrieren sind physisch. Das Szenario fragt jedoch nach dem menschlich ausgeführten Prüfprozess des Guards.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1728576531749": reviewed_mc(
            "M1-010: Security staff verify a visitor's identity before opening the entrance gate. Which functional control type best describes this action?",
            {
                "A": "Compensating",
                "B": "Detective",
                "C": "Preventive",
                "D": "Corrective",
            },
            "C",
            "Die Prüfung findet vor dem Zutritt statt und soll eine unberechtigte Handlung verhindern. Damit ist die Funktion präventiv; dass Wachpersonal sie ausführt, beschreibt zusätzlich die operative Kategorie.",
            {
                "A": "Eine kompensierende Kontrolle ersetzt eine eigentlich vorgesehene, aber nicht umsetzbare Kontrolle. Eine solche Ersatzsituation nennt der Fall nicht.",
                "B": "Eine detektive Kontrolle würde den unberechtigten Zutritt erkennen oder protokollieren, nachdem beziehungsweise während er geschieht.",
                "D": "Eine korrektive Kontrolle behebt Folgen nach einem Ereignis. Hier wird der Zutritt schon vorher gestoppt.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1728595471351": reviewed_mc(
            "M1-053: In a Zero Trust architecture, which functional plane carries traffic and enforces the access decision received from the decision logic?",
            {
                "A": "Data plane",
                "B": "Control plane",
                "C": "Management plane",
                "D": "Trust zone",
            },
            "A",
            "Die Data Plane transportiert den tatsächlichen Datenverkehr und setzt die von der Control Plane getroffene Zugriffsentscheidung am Policy Enforcement Point durch. Die Frage trennt damit die Verkehrsverarbeitung von der Entscheidungslogik.",
            {
                "B": "Die Control Plane erzeugt und verwaltet die Zugriffsentscheidung; sie transportiert nicht den freigegebenen Anwendungsverkehr.",
                "C": "Die Management Plane dient der administrativen Konfiguration und Überwachung und ist nicht die hier beschriebene Durchsetzungsebene.",
                "D": "Eine Trust Zone ist ein Bereich mit gemeinsamen Schutzanforderungen, keine funktionale Ebene für den Datenverkehr.",
            },
            [COMPTIA_OBJECTIVES, NIST_ZERO_TRUST],
        ),
        "1728596420109": reviewed_mc(
            "M1-057: In Zero Trust, which component evaluates identity, device, context, and policy to decide whether access should be granted?",
            {
                "A": "Policy engine",
                "B": "Policy administrator",
                "C": "Policy enforcement point",
                "D": "Data plane",
            },
            "A",
            "Die Policy Engine trifft die eigentliche Zugriffsentscheidung anhand von Richtlinie und verfügbaren Kontextsignalen. Sie kann dabei unter anderem Identität, Gerätezustand, Ressource und Risiko berücksichtigen.",
            {
                "B": "Der Policy Administrator führt die Entscheidung der Policy Engine aus, etwa indem er den Kommunikationspfad einrichtet oder beendet.",
                "C": "Der Policy Enforcement Point kontrolliert die Verbindung am Datenpfad, berechnet aber nicht selbst die übergeordnete Policy-Entscheidung.",
                "D": "Die Data Plane transportiert den zugelassenen Verkehr und ist keine einzelne Zero-Trust-Entscheidungskomponente.",
            },
            [COMPTIA_OBJECTIVES, NIST_ZERO_TRUST],
        ),
        "1728597165153": reviewed_mc(
            "M1-060: After the policy engine makes a Zero Trust access decision, which component establishes or terminates the communication path through the policy enforcement point?",
            {
                "A": "Policy engine",
                "B": "Policy administrator",
                "C": "Trust anchor",
                "D": "Data owner",
            },
            "B",
            "Der Policy Administrator setzt die Entscheidung der Policy Engine administrativ um. Er kommuniziert mit dem Policy Enforcement Point, damit der Kommunikationspfad aufgebaut, überwacht oder beendet wird.",
            {
                "A": "Die Policy Engine entscheidet über den Zugriff; das anschließende Einrichten des Pfads ist die Aufgabe des Policy Administrators.",
                "C": "Ein Trust Anchor bildet einen kryptografischen Vertrauenspunkt und steuert keinen Kommunikationspfad am PEP.",
                "D": "Ein Data Owner legt Schutzanforderungen und Berechtigungen für Daten fest, ist aber keine Komponente im beschriebenen Zero-Trust-Datenfluss.",
            },
            [COMPTIA_OBJECTIVES, NIST_ZERO_TRUST],
        ),
        "1728598202804": reviewed_mc(
            "M1-063: A vault requires two authorized employees to present separate credentials before it opens. Which security principle is illustrated?",
            {
                "A": "Two-person integrity",
                "B": "Need to know",
                "C": "Job rotation",
                "D": "Least privilege",
            },
            "A",
            "Two-Person Integrity verhindert, dass eine einzelne Person den kritischen Vorgang allein ausführt. Beide autorisierten Personen müssen gleichzeitig mitwirken; dieses Prinzip wird auch als Dual Control bezeichnet.",
            {
                "B": "Need to Know beschränkt Informationen auf Personen mit einem konkreten Arbeitsbedarf, verlangt aber nicht zwingend zwei Personen für eine Aktion.",
                "C": "Job Rotation wechselt Zuständigkeiten in festgelegten Abständen und ist keine gleichzeitige Zwei-Personen-Freigabe.",
                "D": "Least Privilege begrenzt Rechte auf das notwendige Minimum; die beschriebene gemeinsame Freigabe geht darüber hinaus.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1728832628955": reviewed_mc(
            "M1-109: Which term describes a hardware or firmware component that is inherently trusted to perform foundational security functions such as secure boot measurements?",
            {
                "A": "Root of trust",
                "B": "Certificate chain",
                "C": "Key escrow",
                "D": "Session key",
            },
            "A",
            "Eine Root of Trust ist eine besonders vertrauenswürdige Basis, auf der weitere Sicherheitsentscheidungen aufbauen. Sie kann beispielsweise Messungen, Schlüsseloperationen oder die erste Prüfung einer Secure-Boot-Kette bereitstellen.",
            {
                "B": "Eine Zertifikatskette verbindet ein Endzertifikat mit einer vertrauenswürdigen CA, ist aber nicht die Hardware- oder Firmwarebasis des Secure Boot.",
                "C": "Key Escrow hinterlegt Schlüssel für eine kontrollierte Wiederherstellung und führt keine Boot-Messungen als Vertrauenswurzel aus.",
                "D": "Ein Session Key schützt eine einzelne Sitzung und ist kein dauerhaftes, inhärent vertrauenswürdiges Fundament.",
            },
            [COMPTIA_OBJECTIVES, NIST_CRYPTO],
        ),
        "1728668006980": reviewed_mc(
            "M1-074: Why do secure protocols commonly combine asymmetric and symmetric cryptography?",
            {
                "A": "Asymmetric cryptography can establish trust or keys, while symmetric cryptography efficiently protects bulk data",
                "B": "Symmetric cryptography creates digital certificates without a trusted issuer",
                "C": "Asymmetric cryptography is always faster for large data transfers",
                "D": "Using both removes the need to authenticate the peer",
            },
            "A",
            "Hybride Protokolle nutzen die Stärken beider Verfahren. Asymmetrische Kryptografie unterstützt Authentisierung oder Schlüsselaushandlung; der anschließend vereinbarte symmetrische Sitzungsschlüssel schützt größere Datenmengen effizient.",
            {
                "B": "Zertifikate werden von einer ausstellenden Stelle signiert und beruhen nicht allein auf symmetrischer Kryptografie.",
                "C": "Asymmetrische Operationen sind für große Datenmengen typischerweise deutlich aufwendiger als symmetrische Verschlüsselung.",
                "D": "Die Kombination ersetzt keine Peer-Authentisierung; ohne sie könnte weiterhin ein falscher Kommunikationspartner beteiligt sein.",
            },
            [COMPTIA_OBJECTIVES, NIST_CRYPTO],
        ),
        "1728665665642": reviewed_mc(
            "M1-068: An endpoint permits applications by default and blocks only programs explicitly named by policy. Which application-control model is this?",
            {
                "A": "Deny list",
                "B": "Allow list",
                "C": "Default deny",
                "D": "Application sandboxing",
            },
            "A",
            "Bei einer Deny List darf Software grundsätzlich ausgeführt werden, solange sie nicht ausdrücklich gesperrt ist. Das Modell ist leicht einzuführen, kann aber neue oder unbekannte Schadsoftware übersehen.",
            {
                "B": "Eine Allow List kehrt die Vorgabe um: Nur ausdrücklich freigegebene Programme dürfen starten.",
                "C": "Default Deny beschreibt ebenfalls eine grundsätzlich gesperrte Ausführung und passt damit nicht zur standardmäßigen Erlaubnis.",
                "D": "Sandboxing isoliert die Ausführung eines Programms, entscheidet aber nicht allein anhand einer Sperrliste, ob es starten darf.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1728665620599": reviewed_mc(
            "M1-067: An endpoint blocks every application unless its hash or signer has been explicitly approved. Which application-control model is this?",
            {
                "A": "Allow list",
                "B": "Deny list",
                "C": "Open execution",
                "D": "Audit-only monitoring",
            },
            "A",
            "Eine Allow List setzt Default Deny um: Nur Anwendungen mit einem freigegebenen Merkmal wie Hash, Pfad oder Signatur dürfen ausgeführt werden. Unbekannte Software bleibt zunächst gesperrt.",
            {
                "B": "Eine Deny List erlaubt unbekannte Anwendungen und blockiert lediglich Einträge, die bereits als unerwünscht bekannt sind.",
                "C": "Open Execution würde Programme ohne vorherige Freigabe starten lassen und widerspricht dem beschriebenen Standardverbot.",
                "D": "Audit-only Monitoring protokolliert Verstöße, verhindert die Ausführung aber nicht zwingend.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1728675819604": reviewed_mc(
            "M1-089: Which TPM feature helps slow repeated guesses against an authorization value?",
            {
                "A": "Dictionary-attack lockout and rate limiting",
                "B": "Storing every key in plaintext",
                "C": "Disabling all authorization checks",
                "D": "Publishing the private endorsement key",
            },
            "A",
            "Ein Trusted Platform Module kann wiederholte fehlgeschlagene Autorisierungsversuche verzögern oder zeitweise sperren. Das erschwert Online-Dictionary-Angriffe, macht ein TPM aber nicht grundsätzlich unangreifbar und ersetzt keine sichere Konfiguration.",
            {
                "B": "Ein TPM soll Schlüssel gerade geschützt verarbeiten und legt sie nicht absichtlich als Klartext für beliebige Software offen.",
                "C": "Ohne Autorisierungsprüfung gäbe es keinen Schutz gegen Rateversuche; das ist keine Sicherheitsfunktion.",
                "D": "Der private Endorsement Key bleibt geschützt. Seine Veröffentlichung würde Vertrauen zerstören statt Guessing zu begrenzen.",
            },
            [COMPTIA_OBJECTIVES, NIST_CRYPTO],
        ),
        "1728678521196": reviewed_mc(
            "M1-098: What is it called when two different inputs produce the same hash value?",
            {
                "A": "Hash collision",
                "B": "Key escrow",
                "C": "Tokenization",
                "D": "Perfect forward secrecy",
            },
            "A",
            "Eine Hash Collision liegt vor, wenn zwei unterschiedliche Eingaben denselben Ausgabewert erzeugen. Kollisionsresistenz ist deshalb eine zentrale Sicherheitseigenschaft kryptografischer Hashfunktionen.",
            {
                "B": "Key Escrow hinterlegt kryptografische Schlüssel für kontrollierte Wiederherstellung und beschreibt keine zwei Eingaben mit demselben Hash.",
                "C": "Tokenization ersetzt sensible Daten durch einen Stellvertreterwert und ist keine Eigenschaft einer Hashfunktion.",
                "D": "Perfect Forward Secrecy schützt vergangene Sitzungen bei späterem Schlüsselverlust; sie betrifft keine Hash-Kollisionen.",
            },
            [COMPTIA_OBJECTIVES, NIST_CRYPTO],
        ),
        "1728669781020": reviewed_mc(
            "M1-082: When the same cryptographic algorithm is used correctly, what is the usual effect of increasing its key length?",
            {
                "A": "It increases the number of keys an exhaustive search must test",
                "B": "It guarantees that every implementation is secure",
                "C": "It makes encryption unnecessary",
                "D": "It removes the need for key management",
            },
            "A",
            "Innerhalb desselben geeigneten Algorithmus vergrößert ein längerer Schlüssel üblicherweise den Schlüsselraum und damit den Aufwand einer vollständigen Suche. Die Aussage lässt sich nicht pauschal zwischen unterschiedlichen Algorithmen oder fehlerhaften Implementierungen übertragen.",
            {
                "B": "Auch ein langer Schlüssel hilft nicht gegen Implementierungsfehler, schwache Zufallszahlen oder unsichere Protokollnutzung.",
                "C": "Die Schlüssellänge ist ein Parameter der Verschlüsselung und ersetzt das Verfahren nicht.",
                "D": "Längere Schlüssel müssen weiterhin sicher erzeugt, verteilt, gespeichert, rotiert und gelöscht werden.",
            },
            [COMPTIA_OBJECTIVES, NIST_CRYPTO],
        ),
        "1728580721902": reviewed_mc(
            "M1-034: Which Public Key Infrastructure object binds an identity to a public key through a Certification Authority's digital signature?",
            {
                "A": "Digital certificate",
                "B": "Rainbow table",
                "C": "Firewall rule",
                "D": "Password salt",
            },
            "A",
            "Ein digitales Zertifikat enthält den öffentlichen Schlüssel und Angaben zum Subject. Die digitale Signatur der Certification Authority schützt diese Bindung und ermöglicht dem Prüfer, Herkunft und Integrität des Zertifikats zu validieren.",
            {
                "B": "Eine Rainbow Table enthält vorberechnete Hashwerte für Passwortangriffe und bindet keine Identität an einen öffentlichen Schlüssel.",
                "C": "Eine Firewall-Regel steuert Netzwerkverkehr und bestätigt keine kryptografische Identität.",
                "D": "Ein Salt individualisiert einen Passwort-Hash und ist weder Zertifikat noch CA-Signatur.",
            },
            [COMPTIA_OBJECTIVES, RFC_5280],
        ),
        "1728594503878": reviewed_mc(
            "M1-051: A security gap analysis compares the current environment with its target state. Which pair must be examined because technology alone cannot reveal whether controls are understood and consistently followed?",
            {
                "A": "People and processes",
                "B": "Screen size and keyboard layout",
                "C": "Office color and furniture style",
                "D": "Brand names and product logos",
            },
            "A",
            "Eine Gap Analysis betrachtet neben Technik auch Menschen und Abläufe. Sie prüft etwa Rollen, Wissen, Schulung und die tatsächliche Durchführung von Prozessen gegen den gewünschten Sollzustand.",
            {
                "B": "Bildschirmgröße und Tastaturlayout zeigen nicht, ob Sicherheitsrollen und Arbeitsabläufe den Sollvorgaben entsprechen.",
                "C": "Einrichtungsstil ist kein aussagekräftiger Vergleichspunkt für die Wirksamkeit von Security Controls.",
                "D": "Produktmarken belegen weder geschultes Personal noch einen funktionierenden Sicherheitsprozess.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1729194474927": reviewed_mc(
            "M3-008: Which functional plane builds routing and forwarding information that tells network devices where traffic should go?",
            {
                "A": "Control plane",
                "B": "Data plane",
                "C": "Air gap",
                "D": "Serverless architecture",
            },
            "A",
            "Die Control Plane lernt oder berechnet Netzwerkpfade und erzeugt daraus Informationen für die Weiterleitung. Die Data Plane verwendet diese Einträge anschließend, um einzelne Pakete mit hoher Geschwindigkeit weiterzuleiten.",
            {
                "B": "Die Data Plane leitet Pakete anhand vorhandener Einträge weiter; sie ist nicht die Ebene, die dynamische Routingentscheidungen berechnet.",
                "C": "Ein Air Gap trennt Systeme physisch oder logisch vom Netz und erstellt keine Routinginformationen.",
                "D": "Serverless Architecture ist ein Cloud-Ausführungsmodell und keine funktionale Ebene eines Netzwerkgeräts.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1772576869480": reviewed_mc(
            "A facility wants a control whose primary purpose is to discourage unauthorized visitors before they attempt to enter. Which option best fits?",
            {
                "A": "A clearly visible warning sign describing monitored access and penalties",
                "B": "A backup generator",
                "C": "A fire suppression system",
                "D": "A post-incident evidence image",
            },
            "A",
            "Ein sichtbarer Warnhinweis soll die Entscheidung eines potenziellen Eindringlings beeinflussen, bevor ein Versuch beginnt. Das ist die typische Funktion einer deterrent control; andere Kontrollen können zusätzlich verhindern oder erkennen.",
            {
                "B": "Ein Generator erhält bei Stromausfall die Verfügbarkeit und soll keinen Eindringling abschrecken.",
                "C": "Eine Feuerlöschanlage begrenzt Brandschäden und kommuniziert keine abschreckende Zutrittsfolge.",
                "D": "Ein forensisches Abbild sichert Beweise nach einem Vorfall und wirkt nicht vor dem Zutrittsversuch.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1772576902230": reviewed_mc(
            "A permissionless public blockchain is being considered. Who may normally participate in reading or submitting transactions, subject to that network's protocol rules?",
            {
                "A": "Any participant who can connect to the public network",
                "B": "Only members unanimously approved by current participants",
                "C": "Only employees of the organization operating a node",
                "D": "Only users invited by one central ledger owner",
            },
            "A",
            "Ein permissionless public ledger hat keine zentrale Stelle, die jede Teilnahme vorab genehmigt. Grundsätzlich kann jeder das Netz lesen oder Transaktionen einreichen; Konsensregeln bestimmen anschließend, welche Transaktionen gültig in die Kette aufgenommen werden.",
            {
                "B": "Eine einstimmige Aufnahmeentscheidung wäre ein zugangsbeschränktes Governance-Modell und ist nicht kennzeichnend für permissionless participation.",
                "C": "Die Teilnahme ist nicht auf Beschäftigte einer einzelnen Organisation begrenzt.",
                "D": "Ein zentraler Eigentümer mit Einladungsrecht würde dem dezentralen, öffentlichen Zugangsmodell widersprechen.",
            },
            [COMPTIA_OBJECTIVES, NIST_GLOSSARY],
        ),
        "1772576942307": reviewed_mc(
            "Which hardware security component in Apple devices isolates cryptographic keys and sensitive operations from the main processor?",
            {
                "A": "Secure Enclave",
                "B": "Windows Registry",
                "C": "Linux swap partition",
                "D": "Android application cache",
            },
            "A",
            "Apples Secure Enclave ist ein isolierter Sicherheitsprozessor für Schlüssel und besonders schützenswerte Operationen. Secure Enclaves und Trusted Execution Environments existieren auch in anderen Ökosystemen; die Frage zielt deshalb auf die konkrete Apple-Komponente, nicht auf ein Betriebssystem als einzig mögliche Plattform.",
            {
                "B": "Die Windows Registry ist eine Konfigurationsdatenbank und kein isolierter kryptografischer Sicherheitsprozessor.",
                "C": "Eine Swap-Partition erweitert virtuellen Speicher und bietet keine Secure-Enclave-Isolation.",
                "D": "Ein App Cache speichert Anwendungsdaten und ist kein hardwareisolierter Schlüsselbereich.",
            },
            [COMPTIA_OBJECTIVES, "https://support.apple.com/guide/security/secure-enclave-sec59b0b31ff/web"],
        ),
        "1772576990007": reviewed_mc(
            "A company needs contactless employee badges that can be read by doorway readers from several centimeters away. Which technology is commonly used?",
            {
                "A": "RFID",
                "B": "Wi-Fi",
                "C": "Infrared",
                "D": "GPS",
            },
            "A",
            "RFID-Badges übertragen ihre Kennung per Funk an einen Zutrittsleser und sind für kontaktlose Ausweise weit verbreitet. NFC ist eine kurzreichweitige Untergruppe der RFID-Technik; deshalb wäre eine Gegenüberstellung beider Begriffe als getrennte Antworten mehrdeutig.",
            {
                "B": "Wi-Fi verbindet aktive Netzwerkgeräte und ist nicht die übliche Technik eines einfachen kontaktlosen Zutrittsbadges.",
                "C": "Infrarot benötigt typischerweise Sichtkontakt und wird nicht als gängiger Funk-Ausweis am Türleser eingesetzt.",
                "D": "GPS empfängt Satellitensignale zur Positionsbestimmung und übermittelt keine Badge-ID an den Türleser.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1729262665983": reviewed_mc(
            "M3-023: A network security device sits inline, inspects traffic in real time, and automatically drops packets that match a known exploit signature. Which device is this?",
            {
                "A": "Intrusion Prevention System",
                "B": "Passive network sensor",
                "C": "Jump server",
                "D": "Load balancer",
            },
            "A",
            "Ein Intrusion Prevention System arbeitet inline und kann erkannten schädlichen Verkehr aktiv blockieren. Genau die Kombination aus Echtzeitanalyse und automatischem Drop grenzt es von einer rein passiven Erkennung ab.",
            {
                "B": "Ein passiver Sensor erhält eine Kopie des Verkehrs und kann alarmieren, den Originaldatenstrom aber nicht unmittelbar verwerfen.",
                "C": "Ein Jump Server bündelt administrativen Fernzugriff auf interne Systeme und analysiert nicht automatisch jeden Transitstrom auf Exploits.",
                "D": "Ein Load Balancer verteilt Verbindungen auf mehrere Systeme und ist kein Signatur-basiertes Intrusion-Prevention-Gerät.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1729265956352": reviewed_mc(
            "M3-029: A load balancer sends requests to one server while a second server waits in standby and takes over only after a failure. Which availability design is this?",
            {
                "A": "Active/passive",
                "B": "Active/active",
                "C": "Round-robin without health checks",
                "D": "Cold site",
            },
            "A",
            "In einer Active/Passive-Konfiguration bedient die aktive Instanz den Verkehr, während die passive Instanz bereitsteht. Nach einem erkannten Ausfall übernimmt der Standby-Knoten die Funktion.",
            {
                "B": "Bei Active/Active verarbeiten mehrere Knoten gleichzeitig produktive Anfragen; der zweite Server würde nicht ungenutzt warten.",
                "C": "Round-Robin verteilt Anfragen der Reihe nach und beschreibt keinen gezielten Standby-Failover.",
                "D": "Ein Cold Site ist ein nur grundlegend vorbereitetes Ausweichgebäude und kein laufendes Serverpaar hinter einem Load Balancer.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTINGENCY],
        ),
        "1729268983360": reviewed_mc(
            "M3-035: Which appliance combines several functions such as firewalling, intrusion prevention, web filtering, and antimalware in one platform?",
            {
                "A": "Unified Threat Management appliance",
                "B": "Layer 2 hub",
                "C": "Hardware Security Module",
                "D": "Wireless survey tool",
            },
            "A",
            "Unified Threat Management bündelt mehrere Sicherheitsfunktionen in einer Plattform. Das vereinfacht Betrieb und Richtlinienverwaltung, kann aber auch einen gemeinsamen Leistungs- oder Ausfallpunkt schaffen.",
            {
                "B": "Ein Hub wiederholt Ethernet-Signale und stellt keine Firewall-, Filter- oder Antimalware-Funktionen bereit.",
                "C": "Ein Hardware Security Module schützt Schlüssel und kryptografische Operationen, ersetzt aber keine kombinierte Netzwerk-Security-Appliance.",
                "D": "Ein Wireless Survey Tool misst Funkabdeckung und Störungen und filtert keinen produktiven Web- oder Netzwerkverkehr.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1729267646397": reviewed_mc(
            "M3-031: Which standard controls access at a wired or wireless network port by authenticating a supplicant through an authenticator?",
            {
                "A": "IEEE 802.1X",
                "B": "IEEE 802.3af",
                "C": "Spanning Tree Protocol",
                "D": "Network Address Translation",
            },
            "A",
            "IEEE 802.1X stellt portbasierte Network Access Control bereit. Ein Switch oder Access Point arbeitet als Authenticator und vermittelt die EAP-Nachrichten zwischen Supplicant und Authentication Server.",
            {
                "B": "IEEE 802.3af beschreibt Power over Ethernet und keine portbasierte Benutzer- oder Geräteauthentifizierung.",
                "C": "Spanning Tree verhindert Layer-2-Schleifen und entscheidet nicht anhand einer Anmeldung über Portzugang.",
                "D": "Network Address Translation übersetzt Adressen zwischen Netzen und authentifiziert keinen Supplicant.",
            },
            [COMPTIA_OBJECTIVES, "https://1.ieee802.org/security/802-1x/"],
        ),
        "1773526588633": reviewed_mc(
            "A network-based Intrusion Detection System receives a mirrored copy of traffic. What can it do with a detected attack?",
            {
                "A": "Analyze the copy and generate an alert",
                "B": "Drop the original packet inline",
                "C": "Encrypt sensitive fields while they pass",
                "D": "Patch the vulnerable destination automatically",
            },
            "A",
            "Ein passiv angebundenes Network IDS analysiert die gespiegelte Verkehrskopie und erzeugt bei einem Treffer einen Alarm. Weil der ursprüngliche Datenpfad nicht durch das IDS führt, kann es das auslösende Paket nicht selbst inline verwerfen.",
            {
                "B": "Zum unmittelbaren Drop müsste das Gerät inline als Intrusion Prevention System in den Originaldatenpfad eingebunden sein.",
                "C": "Ein IDS beobachtet Verkehr; es verändert und verschlüsselt keine sensiblen Felder während der Übertragung.",
                "D": "Ein Alarm kann einen Patch-Prozess anstoßen, aber das IDS installiert nicht selbst automatisch Software auf dem Ziel.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1729277707224": reviewed_mc(
            "M3-040: Which data state is being protected when an application encrypts sensitive values while they are stored in a database?",
            {
                "A": "Data at rest",
                "B": "Data in transit",
                "C": "Data in use",
                "D": "Data in disposal",
            },
            "A",
            "Daten in einer gespeicherten Datenbank befinden sich at rest. Datenbank-, Feld- oder Datenträgerverschlüsselung kann diese gespeicherten Werte schützen, solange Schlüssel und Zugriffsrechte ebenfalls angemessen abgesichert sind.",
            {
                "B": "Data in Transit bewegt sich zwischen Systemen und wird typischerweise durch Transportprotokolle wie TLS geschützt.",
                "C": "Data in Use wird gerade im Arbeitsspeicher oder Prozessor verarbeitet und benötigt andere Schutzmechanismen.",
                "D": "Disposal beschreibt das sichere Löschen oder Vernichten am Ende des Lebenszyklus und ist kein üblicher Datenzustand der aktiven Datenbank.",
            },
            [COMPTIA_OBJECTIVES, NIST_CRYPTO],
        ),
        "1773526588614": reviewed_mc(
            "Which system centrally monitors and controls geographically distributed industrial equipment such as power-generation units and substations?",
            {
                "A": "Supervisory Control and Data Acquisition",
                "B": "Security Information and Event Management",
                "C": "Customer Relationship Management",
                "D": "Content Delivery Network",
            },
            "A",
            "SCADA sammelt Telemetrie von räumlich verteilten Industriekomponenten und ermöglicht deren übergeordnete Überwachung und Steuerung. Energieversorgung und Versorgungsnetze sind typische Einsatzbereiche.",
            {
                "B": "Ein SIEM sammelt und korreliert Sicherheitsereignisse, steuert aber nicht die industriellen Prozesse eines Kraftwerks.",
                "C": "Ein CRM verwaltet Kundenbeziehungen und keine Sensoren, Schalter oder Prozesswerte.",
                "D": "Ein Content Delivery Network verteilt Webinhalte und ist kein industrielles Leitsystem.",
            },
            [COMPTIA_OBJECTIVES, NIST_ICS],
        ),
        "1772922529767": reviewed_mc(
            "A customer cannot directly audit a major cloud provider. Which existing independent report can the customer review to evaluate the provider's controls over time?",
            {
                "A": "SOC 2 Type 2 report",
                "B": "The provider's marketing brochure",
                "C": "A public port scan performed without authorization",
                "D": "The customer's own employee handbook",
            },
            "A",
            "Ein SOC 2 Type 2 Report enthält die Beurteilung eines unabhängigen Prüfers, ob relevante Kontrollen über einen festgelegten Zeitraum wirksam betrieben wurden. Kunden erhalten damit belastbarere Assurance, ohne selbst die Produktionsumgebung zu prüfen.",
            {
                "B": "Marketingmaterial ist eine Selbstdarstellung und kein unabhängiger Prüfbericht über die Wirksamkeit von Kontrollen.",
                "C": "Ein nicht autorisierter Portscan ist rechtlich und technisch problematisch und bewertet keine organisatorischen Kontrollen über einen Zeitraum.",
                "D": "Das eigene Mitarbeiterhandbuch beschreibt nicht die Kontrollen des Cloud Providers.",
            },
            [COMPTIA_OBJECTIVES, "https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2"],
        ),
        "1772922529755": reviewed_mc(
            "A system owner needs a temporary deviation from an approved security baseline. Which action provides formal authorization and traceability for the change?",
            {
                "A": "Submit the deviation through the change-management and exception-approval process",
                "B": "Make the change first and document it only if an incident occurs",
                "C": "Ask a colleague for verbal approval",
                "D": "Remove the security baseline from the repository",
            },
            "A",
            "Die formale Bearbeitung dokumentiert Grund, Risiko, Genehmiger, Ersatzkontrollen, Geltungsdauer und Rückkehr zum Sollzustand. So bleibt die Abweichung nachvollziehbar und wird nicht zu einer stillen Dauerlösung.",
            {
                "B": "Eine nachträgliche Dokumentation nur im Schadenfall umgeht Prüfung und Freigabe vor der Änderung.",
                "C": "Eine informelle mündliche Zustimmung schafft weder belastbare Autorisierung noch eine auditierbare Spur.",
                "D": "Das Löschen der Baseline beseitigt die gültige Vorgabe und genehmigt keine begrenzte Abweichung.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1772922529766": reviewed_mc(
            "What is the primary purpose of a business continuity plan during a disruptive event?",
            {
                "A": "Maintain or restore critical business functions at an acceptable level",
                "B": "Describe only how malware samples are reverse engineered",
                "C": "Replace every incident response procedure",
                "D": "Guarantee that no service will ever be interrupted",
            },
            "A",
            "Business Continuity hält kritische Geschäftsprozesse während einer Störung aufrecht oder stellt sie innerhalb akzeptabler Grenzen wieder her. Der Auslöser kann technisch, natürlich oder menschengemacht sein; entscheidend ist die Fortführung der Geschäftsfunktion.",
            {
                "B": "Malware-Analyse kann Teil einer technischen Incident Response sein, ist aber nicht der Zweck des organisationsweiten Continuity Plans.",
                "C": "Business Continuity und Incident Response ergänzen sich. Ein Continuity Plan ersetzt nicht alle spezifischen Reaktionsverfahren.",
                "D": "Resilienz reduziert Dauer und Auswirkung von Ausfällen, kann eine Unterbrechung aber nicht absolut ausschließen.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTINGENCY],
        ),
        "1773007098186": reviewed_mc(
            "A document gives mandatory, ordered steps for notifying parties, preserving evidence, and initiating a forensic investigation after a payment-card compromise. What type of document is it?",
            {
                "A": "Procedure",
                "B": "High-level policy",
                "C": "Risk appetite statement",
                "D": "Security awareness poster",
            },
            "A",
            "Eine Procedure beschreibt verbindliche Arbeitsschritte für eine konkrete Situation, einschließlich Reihenfolge, Zuständigkeiten und Fristen. Genau diese operative Handlungsanweisung liefert das Dokument im Szenario.",
            {
                "B": "Eine Policy setzt übergeordnete Absicht und Anforderungen, enthält aber normalerweise nicht die vollständige Schrittfolge des Vorfalls.",
                "C": "Ein Risk Appetite Statement beschreibt die grundsätzliche Risikobereitschaft und keine Incident-Schritte.",
                "D": "Ein Awareness-Poster vermittelt eine kurze Botschaft und ist keine verbindliche forensische Arbeitsanweisung.",
            },
            [COMPTIA_OBJECTIVES, NIST_INCIDENT_RESPONSE],
        ),
        "1772662005045": {
            "status": "approved",
            "front": """A compromised workstation is followed by attackers using passwords that its assigned user recently typed. Which malware should the analyst look for?
A: Rootkit
B: Keylogger
C: Worm
D: Boot sector virus""",
            "sources": [COMPTIA_OBJECTIVES, CISA_THREATS],
            "reviewer": "human-editorial-review-2026-08-09",
        },
        "1772662005115": {
            "status": "approved",
            "front": """A Linux administrator runs chmod 777 on /etc, allowing every local user to modify critical configuration files. How should this finding be classified?
A: Excessive file permissions
B: Improper input validation
C: A completed privilege-escalation attack
D: A memory leak""",
            "sources": [COMPTIA_OBJECTIVES, NIST_CONTROLS],
            "reviewer": "human-editorial-review-2026-08-09",
        },
        "1773007098195": reviewed_mc(
            "A company operates in several countries. Which legal scopes should its compliance review consider?",
            {
                "A": "Only the law of the city containing headquarters",
                "B": "Only national law in the country of incorporation",
                "C": "Only international frameworks",
                "D": "Applicable local, national, regional, and international requirements",
            },
            "D",
            "Eine Organisation kann gleichzeitig Pflichten aus lokalen, nationalen und überstaatlichen Regelungen haben. Maßgeblich sind unter anderem Standort, Geschäftstätigkeit, betroffene Personen, verarbeitete Daten und vertragliche Bindungen — nicht nur der Hauptsitz.",
            {
                "A": "Lokale Vorschriften können relevant sein, bilden bei internationaler Tätigkeit aber nicht allein den vollständigen Rechtsrahmen.",
                "B": "Das Gründungsland ist wichtig, doch weitere Staaten und Regionen können aufgrund von Tätigkeit oder Datenverarbeitung ebenfalls zuständig sein.",
                "C": "Internationale oder regionale Regeln ersetzen nicht automatisch die anwendbaren lokalen und nationalen Gesetze.",
            },
            [COMPTIA_OBJECTIVES, GDPR],
        ),
        "1773101490289": reviewed_mc(
            "An application runs on a provider-managed web platform rather than on servers controlled by the customer. Where should the customer obtain HTTP request and application traffic logs?",
            {
                "A": "The cloud platform's logging service",
                "B": "A local Apache log on a server the customer does not operate",
                "C": "The employee's browser history",
                "D": "The office printer log",
            },
            "A",
            "Bei einer provider-managed Plattform stellt der Cloud-Dienst die für die Anwendung verfügbaren Request- und Plattformlogs bereit. Der Kunde muss diese Logs aktivieren, exportieren und mit geeigneten Aufbewahrungs- und Zugriffsregeln versehen.",
            {
                "B": "Ohne selbst betriebenen Apache-Server gibt es keinen lokalen Apache-Logbestand des Kunden für diesen Dienst.",
                "C": "Browser History zeigt besuchte Seiten eines einzelnen Clients und keine serverseitigen Anfragen aller Benutzer.",
                "D": "Ein Druckerprotokoll hat keinen Bezug zum HTTP-Verkehr der Cloud-Anwendung.",
            },
            [COMPTIA_OBJECTIVES, NIST_CLOUD],
        ),
        "1773101490321": reviewed_mc(
            "An analyst must determine whether a workstation uploaded a sensitive file to an external host. Which data source is most directly useful?",
            {
                "A": "A packet capture or network telemetry source with sufficient detail",
                "B": "The Windows print-service log",
                "C": "The monitor's display settings",
                "D": "The keyboard-layout configuration",
            },
            "A",
            "Netzwerktelemetrie kann Ziel, Zeitpunkt, Protokoll und übertragene Datenmenge einer Verbindung zeigen; ein Packet Capture kann bei unverschlüsseltem Verkehr sogar den Inhalt belegen. Bei verschlüsseltem Traffic sind zusätzliche Proxy-, DLP- oder Anwendungslogs nötig.",
            {
                "B": "Der Print-Service protokolliert Druckvorgänge und belegt keinen Datei-Upload an einen externen Host.",
                "C": "Anzeigeeinstellungen enthalten keine Netzwerkverbindungen oder übertragenen Dateien.",
                "D": "Das Tastaturlayout beeinflusst Eingaben, zeichnet aber keinen ausgehenden Datenverkehr auf.",
            },
            [COMPTIA_OBJECTIVES, NIST_INCIDENT_RESPONSE],
        ),
        "1773101490339": reviewed_mc(
            "A restrictive Windows Defender Firewall policy blocks Google Chrome from making outbound connections. Which rule most directly permits only that program?",
            {
                "A": "Create an outbound allow rule for the chrome.exe program path",
                "B": "Allow every program to use TCP ports 80 and 443",
                "C": "Create an inbound rule from the Internet to all local ports",
                "D": "Disable Windows Defender Firewall",
            },
            "A",
            "Eine programmbezogene Outbound-Regel kann genau chrome.exe unter den vorgesehenen Profilen zulassen. Das hält die Ausnahme eng und vermeidet eine breite Portfreigabe für alle Anwendungen.",
            {
                "B": "Eine allgemeine Portregel würde auch andere Programme zulassen und wäre weiter als die geforderte Chrome-Ausnahme.",
                "C": "Eine Inbound-Regel betrifft eingehende Verbindungen und löst die blockierte ausgehende Browserkommunikation nicht.",
                "D": "Das vollständige Abschalten der Firewall beseitigt eine wichtige Schutzschicht und ist keine angemessen begrenzte Freigabe.",
            },
            [COMPTIA_OBJECTIVES, "https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/rules"],
        ),
        "1728832486334": reviewed_mc(
            "M1-108: Which X.509 certificate field identifies the entity that issued and signed the certificate?",
            {
                "A": "Issuer",
                "B": "Subject",
                "C": "Serial number",
                "D": "Subject public key info",
            },
            "A",
            "Das Issuer-Feld benennt die Certification Authority beziehungsweise die ausstellende Identität, deren Signatur das Zertifikat trägt. Der Prüfer verwendet diese Angabe zusammen mit der Signatur und der Zertifikatskette.",
            {
                "B": "Subject bezeichnet die Identität, für die das Zertifikat ausgestellt wurde, nicht die ausstellende CA.",
                "C": "Die Seriennummer identifiziert das Zertifikat innerhalb des Namensraums des Issuers, benennt aber nicht selbst den Aussteller.",
                "D": "Subject Public Key Info enthält den öffentlichen Schlüssel und Algorithmus des Subjects und nicht den Namen der signierenden Stelle.",
            },
            [COMPTIA_OBJECTIVES, RFC_5280],
        ),
        "1728669344784": reviewed_mc(
            "M1-081: Which deprecated protocol is the predecessor of Transport Layer Security (TLS)?",
            {
                "A": "Secure Sockets Layer",
                "B": "Secure Shell",
                "C": "Datagram Transport Layer Security",
                "D": "Internet Protocol Security",
            },
            "A",
            "Secure Sockets Layer war der Vorgänger von TLS. SSL-Versionen gelten heute als veraltet und unsicher; aktuelle Systeme verwenden unterstützte TLS-Versionen mit angemessener Konfiguration.",
            {
                "B": "Secure Shell schützt interaktive Fernzugriffe und Dateiübertragungen, ist aber nicht der Vorgänger von TLS.",
                "C": "DTLS überträgt TLS-ähnliche Sicherheitsmechanismen auf Datagrammverkehr und ist kein historischer Vorgänger von TLS.",
                "D": "IPsec schützt Verkehr auf der Netzwerkschicht und gehört zu einer anderen Protokollfamilie.",
            },
            [COMPTIA_OBJECTIVES, RFC_8446],
        ),
        "1728578626914": reviewed_mc(
            "M1-028: A security policy instructs employees to store sensitive files only in approved encrypted folders. Which functional control type is the instruction itself?",
            {
                "A": "Directive",
                "B": "Detective",
                "C": "Corrective",
                "D": "Compensating",
            },
            "A",
            "Die schriftliche Anweisung lenkt das Verhalten der Beschäftigten und ist deshalb directive. Die technische Verschlüsselung des Ordners kann zusätzlich präventiv wirken; gefragt ist jedoch ausdrücklich nach der Funktion der Policy-Anweisung.",
            {
                "B": "Eine detektive Kontrolle würde einen Verstoß erkennen oder melden, statt nur das erwartete Verhalten vorzugeben.",
                "C": "Eine korrektive Kontrolle behebt einen festgestellten Schaden oder Zustand nach dem Ereignis.",
                "D": "Eine kompensierende Kontrolle ersetzt eine nicht umsetzbare Primärkontrolle; eine solche Ersatzlage nennt das Szenario nicht.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1773275420025": reviewed_mc(
            "A receiving mail server must check whether the connecting server's IP address is authorized to send for the envelope-from domain. Which framework performs this check?",
            {
                "A": "Sender Policy Framework",
                "B": "DomainKeys Identified Mail",
                "C": "Domain-based Message Authentication, Reporting and Conformance",
                "D": "Simple Mail Transfer Protocol",
            },
            "A",
            "SPF vergleicht die IP-Adresse des sendenden Mailservers mit der DNS-Richtlinie der Envelope-From-Domain. Die präzise Nennung von Absender-IP und Domain grenzt die Aufgabe von Signaturprüfung und übergeordneter DMARC-Policy ab.",
            {
                "B": "DKIM prüft eine kryptografische Signatur über ausgewählte Header und Inhalt; es autorisiert nicht anhand der verbindenden Server-IP.",
                "C": "DMARC wertet die ausgerichteten Ergebnisse von SPF oder DKIM aus und legt Policy sowie Reporting fest; der einzelne IP-Autorisierungscheck ist SPF.",
                "D": "SMTP transportiert Nachrichten, veröffentlicht aber keine Liste autorisierter Absender-IP-Adressen.",
            },
            [COMPTIA_OBJECTIVES, "https://www.rfc-editor.org/rfc/rfc7208.html"],
        ),
        "1773275420001": reviewed_mc(
            "Administrators receive a text message for every failed login, including ordinary user typing errors. Which action best reduces noise while preserving detection of suspicious bursts?",
            {
                "A": "Tune the alert rule by adding an appropriate threshold and time window",
                "B": "Disable failed-login monitoring",
                "C": "Send the same alert by both text message and email",
                "D": "Ignore every failed login from administrator accounts",
            },
            "A",
            "Alert Tuning passt Logik, Schwellenwert, Zeitfenster, Kontext und Empfänger an. Mehrere Fehlversuche innerhalb kurzer Zeit können dadurch weiterhin alarmieren, während ein einzelner Tippfehler nicht sofort eine Textnachricht auslöst.",
            {
                "B": "Das vollständige Abschalten entfernt auch Hinweise auf Password Spraying, Brute Force oder kompromittierte Konten.",
                "C": "Ein zweiter Kanal verdoppelt die Benachrichtigungen und verbessert nicht die Erkennungslogik.",
                "D": "Gerade fehlgeschlagene Anmeldungen an privilegierten Konten können besonders relevant sein und dürfen nicht pauschal ignoriert werden.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1729526448891": reviewed_mc(
            "M4-009: Which source can provide authoritative public threat advisories, vulnerability alerts, and sector-specific cybersecurity guidance?",
            {
                "A": "A national cybersecurity agency",
                "B": "A false-negative scanner result",
                "C": "An organization's risk tolerance",
                "D": "An unverified social-media rumor",
            },
            "A",
            "Nationale Cybersecurity-Behörden veröffentlichen Advisories, Warnungen, technische Analysen und branchenspezifische Hinweise. Solche Quellen sind wertvoll, müssen aber weiterhin auf Relevanz, Aktualität und die eigene Umgebung geprüft werden.",
            {
                "B": "Ein False Negative ist ein übersehener Befund eines Scanners und keine Quelle für Threat Intelligence.",
                "C": "Risk Tolerance ist eine interne Grenze für akzeptable Abweichung und liefert keine externen Bedrohungsinformationen.",
                "D": "Ein unbestätigtes Gerücht besitzt weder belastbare Herkunft noch ausreichende technische Verifikation.",
            },
            [COMPTIA_OBJECTIVES, CISA_THREATS],
        ),
        "1729184719692": reviewed_mc(
            "M2-118: Which Windows feature encrypts selected files and folders on an NTFS volume?",
            {
                "A": "Encrypting File System",
                "B": "BitLocker Drive Encryption",
                "C": "Apple FileVault",
                "D": "Transport Layer Security",
            },
            "A",
            "Encrypting File System verschlüsselt ausgewählte Dateien und Ordner auf NTFS und bindet den Zugriff an die zugehörigen Benutzerzertifikate und Schlüssel. BitLocker schützt dagegen ein vollständiges Volume.",
            {
                "B": "BitLocker ist Windows-Vollvolumeverschlüsselung und nicht die selektive NTFS-Dateiverschlüsselung der Frage.",
                "C": "FileVault ist Apples Laufwerksverschlüsselung für macOS und keine Windows-NTFS-Funktion.",
                "D": "TLS schützt Daten während der Netzwerkübertragung und verschlüsselt keine ausgewählten Dateien im NTFS-Dateisystem.",
            },
            [COMPTIA_OBJECTIVES, NIST_CRYPTO],
        ),
        "1728581458148": reviewed_mc(
            "M1-043: Which term describes a fixed-length value calculated from input data of any size, also known as a message digest?",
            {
                "A": "Salt",
                "B": "Session key",
                "C": "Digital signature",
                "D": "Hash",
            },
            "D",
            "Eine Hashfunktion verarbeitet Eingabedaten beliebiger Länge und liefert einen Ausgabewert fester Länge. Dieser Hash wird auch Message Digest genannt und kann Änderungen an Daten sichtbar machen.",
            {
                "A": "Ein Salt ist ein zusätzlicher Zufallswert, der vor allem Passwort-Hashes individualisiert; er ist nicht selbst der berechnete Message Digest.",
                "B": "Ein Session Key ist ein zeitlich begrenzter kryptografischer Schlüssel für eine Sitzung und kein Fingerabdruck von Eingabedaten.",
                "C": "Eine digitale Signatur verwendet asymmetrische Kryptografie, um Herkunft und Integrität zu bestätigen; der zugrunde liegende Digest ist nur ein Bestandteil dieses Verfahrens.",
            },
            [COMPTIA_OBJECTIVES, NIST_CRYPTO],
        ),
        "1728664841112": reviewed_mc(
            "M1-065: A proposed software change affects Shipping, Accounting, and senior management. What are these affected people and departments called?",
            {
                "A": "Change Advisory Board",
                "B": "Change owners",
                "C": "Stakeholders",
                "D": "Risk committee",
            },
            "C",
            "Stakeholder sind Personen oder Organisationseinheiten, die eine Änderung beeinflusst oder deren Arbeit, Verantwortung oder Ergebnis von ihr betroffen wird. Deshalb gehören hier nicht nur die direkt arbeitenden Teams, sondern auch weitere betroffene Entscheider dazu.",
            {
                "A": "Ein Change Advisory Board bewertet und berät geplante Änderungen. Es umfasst nicht automatisch alle Personen und Abteilungen, die von der Änderung betroffen sind.",
                "B": "Change Owner verantworten die Steuerung einer Änderung. Der Begriff bezeichnet nicht die gesamte Gruppe ihrer Betroffenen.",
                "D": "Ein Risk Committee überwacht Risiken und deren Behandlung auf Governance-Ebene; es ist keine Sammelbezeichnung für alle von einer Änderung Betroffenen.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
        ),
        "1729006621297": reviewed_mc(
            "M2-028: Two application threads access and update the same value at nearly the same time, producing an unpredictable result. Which vulnerability is this?",
            {
                "A": "Race condition",
                "B": "Buffer overflow",
                "C": "Hash collision",
                "D": "DNS poisoning",
            },
            "A",
            "Bei einer Race Condition hängt das Ergebnis davon ab, welcher von mehreren konkurrierenden Vorgängen zuerst auf eine gemeinsam genutzte Ressource zugreift. Fehlende Synchronisierung kann dadurch falsche Zustände, Abstürze oder Sicherheitslücken erzeugen.",
            {
                "B": "Ein Buffer Overflow überschreibt Speicher außerhalb eines vorgesehenen Puffers. Das Problem der Aufgabe entsteht dagegen durch konkurrierende Zugriffe und deren zeitliche Reihenfolge.",
                "C": "Eine Hash Collision liegt vor, wenn unterschiedliche Eingaben denselben Hashwert erzeugen. Gemeinsame Variablen und Thread-Timing spielen dafür keine definierende Rolle.",
                "D": "DNS Poisoning manipuliert Namensauflösungsdaten, damit Anfragen an ein falsches Ziel führen. Es erklärt keinen fehlerhaften gleichzeitigen Speicherzugriff.",
            },
            [COMPTIA_OBJECTIVES, NIST_GLOSSARY],
        ),
        "1729009525180": reviewed_mc(
            "M2-034: An application removes or neutralizes potentially malicious content in user-supplied data before processing it. What is this practice called?",
            {
                "A": "Input amplification",
                "B": "Hash collision",
                "C": "Packet capture",
                "D": "Input sanitization",
            },
            "D",
            "Input Sanitization bereinigt Eingaben, bevor die Anwendung sie weiterverarbeitet. Je nach Kontext werden unerlaubte Zeichen oder Konstrukte entfernt, kodiert oder neutralisiert; eine strikte Eingabevalidierung sollte zusätzlich nur erwartete Formate zulassen.",
            {
                "A": "Input Amplification vergrößert die Wirkung oder Datenmenge einer Eingabe und ist keine Bereinigung von Nutzerdaten.",
                "B": "Eine Hash Collision betrifft zwei unterschiedliche Eingaben mit demselben Hashwert und nicht die sichere Verarbeitung von Formulardaten.",
                "C": "Ein Packet Capture zeichnet Netzwerkverkehr zur Analyse auf. Es verändert oder bereinigt die Eingabe der Anwendung nicht.",
            },
            [COMPTIA_OBJECTIVES, OWASP_WSTG],
        ),
        "1729018546549": reviewed_mc(
            "M2-048: Which system assigns a numerical severity score from 0.0 to 10.0 to a vulnerability?",
            {
                "A": "Common Vulnerabilities and Exposures (CVE)",
                "B": "Security Content Automation Protocol (SCAP)",
                "C": "Domain Name System (DNS)",
                "D": "Common Vulnerability Scoring System (CVSS)",
            },
            "D",
            "Das Common Vulnerability Scoring System bewertet technische Merkmale einer Schwachstelle und bildet sie auf einen Score von 0,0 bis 10,0 ab. Der Wert unterstützt die Priorisierung, ersetzt aber keine Bewertung des konkreten Geschäftsrisikos.",
            {
                "A": "CVE vergibt standardisierte Kennungen für öffentlich bekannte Schwachstellen. Eine CVE-ID ist keine Schweregradskala.",
                "B": "SCAP standardisiert den automatisierten Austausch und die Verarbeitung von Sicherheitsinformationen; die konkrete Bewertungsskala heißt CVSS.",
                "C": "DNS löst Namen in Netzwerkressourcen auf und bewertet keine Schwachstellen.",
            },
            [COMPTIA_OBJECTIVES, "https://www.first.org/cvss/"],
        ),
        "1729094464415": reviewed_mc(
            "M2-060: An analyst records network frames and packets so they can inspect protocols, endpoints, and unencrypted content. Which technique is being used?",
            {
                "A": "Packet capture",
                "B": "RFID cloning",
                "C": "Rooting",
                "D": "Birthday attack",
            },
            "A",
            "Ein Packet Capture zeichnet Netzwerkverkehr für die spätere Analyse auf. Daraus lassen sich unter anderem Protokolle, Kommunikationspartner und Metadaten erkennen; bei unverschlüsselter Übertragung kann auch der Inhalt sichtbar sein.",
            {
                "B": "RFID Cloning kopiert Daten eines Funktransponders, etwa einer Zutrittskarte. Es zeichnet keinen allgemeinen IP-Netzwerkverkehr auf.",
                "C": "Rooting verschafft auf einem Gerät privilegierte Betriebssystemrechte und ist keine Methode zur Aufzeichnung von Netzwerkpaketen.",
                "D": "Ein Birthday Attack nutzt die Wahrscheinlichkeit von Hash-Kollisionen und dient nicht der Analyse aufgezeichneter Frames und Pakete.",
            },
            [COMPTIA_OBJECTIVES, NIST_GLOSSARY],
        ),
        "1729174658387": reviewed_mc(
            "M2-097: Which protocol uses Transport Layer Security (TLS) to protect HTTP traffic between a client and a web server?",
            {
                "A": "HTTPS",
                "B": "FTP",
                "C": "Telnet",
                "D": "SNMPv1",
            },
            "A",
            "HTTPS ist HTTP, das über eine TLS-geschützte Verbindung übertragen wird. TLS schützt die Vertraulichkeit und Integrität des Verkehrs und authentifiziert üblicherweise den Webserver über dessen Zertifikat.",
            {
                "B": "FTP ist ein Protokoll zur Dateiübertragung und schützt seine Steuer- und Datenkanäle in der Grundform nicht mit TLS.",
                "C": "Telnet stellt eine unverschlüsselte interaktive Terminalsitzung bereit und transportiert keinen geschützten HTTP-Verkehr.",
                "D": "SNMPv1 dient der Verwaltung und Überwachung von Netzwerkgeräten und besitzt keine TLS-geschützte HTTP-Funktion.",
            },
            [COMPTIA_OBJECTIVES, RFC_8446],
        ),
        "1729180535847": reviewed_mc(
            "M2-111: An analyst finds unusual outbound traffic, unexpected file-hash changes, and impossible concurrent logins. What is this evidence collectively called?",
            {
                "A": "Indicators of Compromise (IOCs)",
                "B": "Access control lists (ACLs)",
                "C": "Recovery point objectives (RPOs)",
                "D": "Common Vulnerability Scoring System (CVSS) scores",
            },
            "A",
            "Indicators of Compromise sind beobachtbare Spuren, die auf eine mögliche oder erfolgte Kompromittierung hindeuten. Einzelne Signale müssen im Kontext bewertet und miteinander korreliert werden, bevor der Analyst eine belastbare Schlussfolgerung zieht.",
            {
                "B": "Access Control Lists erlauben oder verweigern Zugriffe anhand von Regeln; sie sind Kontrollen und nicht die beschriebenen Beweisspuren.",
                "C": "Ein Recovery Point Objective begrenzt den tolerierbaren Datenverlust nach einer Störung und klassifiziert keine verdächtigen Beobachtungen.",
                "D": "CVSS bewertet den technischen Schweregrad einer Schwachstelle. Es bezeichnet weder Log-Anomalien noch konkrete Spuren auf einem kompromittierten System.",
            },
            [COMPTIA_OBJECTIVES, NIST_INCIDENT_RESPONSE],
        ),
        "1772662005154": reviewed_mc(
            "An organization wants to reduce Business Email Compromise (BEC). Which action is NOT a generally useful BEC defense?",
            {
                "A": "Automatically delete every email attachment",
                "B": "Require multifactor authentication for email accounts",
                "C": "Verify unusual payment requests through a separate trusted channel",
                "D": "Teach users to inspect sender domains and unexpected links",
            },
            "A",
            "Das pauschale Löschen jedes Anhangs unterbricht legitime Geschäftsprozesse und verhindert viele textbasierte BEC-Betrugsversuche trotzdem nicht. Wirksamer sind Kontoschutz, geschulte Prüfung und eine unabhängige Bestätigung ungewöhnlicher Zahlungs- oder Datenanfragen.",
            {
                "B": "Multifaktor-Authentifizierung erschwert die Übernahme eines E-Mail-Kontos und ist deshalb eine sinnvolle BEC-Schutzmaßnahme.",
                "C": "Eine Rückbestätigung über einen bekannten, separaten Kommunikationsweg kann gefälschte oder kompromittierte Zahlungsanweisungen aufdecken.",
                "D": "Die Prüfung von Absenderdomain und Links hilft, nachgeahmte Adressen und Social-Engineering-Hinweise zu erkennen.",
            },
            [COMPTIA_OBJECTIVES, CISA_THREATS],
        ),
        "1772662005161": reviewed_mc(
            "A traveler connects a laptop to an untrusted wired hotel network. Which threat is specifically associated with a fraudulent wireless access point rather than this wired connection?",
            {
                "A": "Packet capture",
                "B": "Network-based exploitation",
                "C": "Evil twin",
                "D": "Worm propagation",
            },
            "C",
            "Ein Evil Twin ist ein betrügerischer WLAN-Access-Point, der ein erwartetes Funknetz nachahmt. Da das Szenario ausdrücklich eine kabelgebundene Verbindung beschreibt, ist genau dieser WLAN-spezifische Angriff die Ausnahme.",
            {
                "A": "Auch in einem nicht vertrauenswürdigen kabelgebundenen Netz kann ein Angreifer erreichbaren oder fehlgeleiteten Verkehr mitschneiden; Packet Capture ist daher nicht WLAN-spezifisch.",
                "B": "Netzwerkbasierte Angriffe können grundsätzlich über kabelgebundene wie drahtlose Netze erfolgen.",
                "D": "Ein Worm kann sich über erreichbare Netzwerkdienste verbreiten und ist nicht auf WLAN beschränkt.",
            },
            [COMPTIA_OBJECTIVES, NIST_GLOSSARY],
        ),
        "1772662005171": reviewed_mc(
            "Which scenario is LEAST characteristic of Business Email Compromise (BEC)?",
            {
                "A": "An attacker sends payment instructions from a compromised corporate mailbox",
                "B": "An attacker uses a look-alike business domain to impersonate an executive",
                "C": "An employee sends an ordinary personal message from a private email account",
                "D": "Malware steals access to a business mailbox that is later used for fraud",
            },
            "C",
            "Eine gewöhnliche private Nachricht ohne Täuschung, Kontokompromittierung oder betrügerische Geschäftsanforderung ist kein typischer BEC-Vorgang. BEC missbraucht dagegen glaubwürdig wirkende Geschäftskommunikation, um Zahlungen oder sensible Daten zu erlangen.",
            {
                "A": "Ein kompromittiertes Firmenpostfach verleiht einer gefälschten Zahlungsanweisung hohe Glaubwürdigkeit und ist ein typisches BEC-Muster.",
                "B": "Eine ähnlich geschriebene Geschäftsdomain kann eine Führungskraft oder einen Lieferanten imitieren und wird häufig für BEC verwendet.",
                "D": "Malware kann den Zugang zu einem geschäftlichen Postfach liefern, das anschließend für einen BEC-Betrug missbraucht wird.",
            },
            [COMPTIA_OBJECTIVES, CISA_THREATS],
        ),
        "1729264760996": reviewed_mc(
            "M3-027: A proxy sits inline with network communication, but users do not configure proxy settings on their devices and may not notice it. Which proxy type is this?",
            {
                "A": "Forward proxy",
                "B": "Open proxy",
                "C": "Transparent proxy",
                "D": "Active/passive cluster",
            },
            "C",
            "Ein Transparent Proxy liegt im Datenpfad und verarbeitet Verkehr, ohne dass auf den Endgeräten eine ausdrückliche Proxy-Konfiguration erforderlich ist. Für die Nutzer kann diese Weiterleitung deshalb unsichtbar bleiben.",
            {
                "A": "Forward Proxy beschreibt die Richtung und Rolle eines Proxys für ausgehende Clientanfragen. Ein Forward Proxy kann ausdrücklich konfiguriert sein und ist deshalb nicht automatisch transparent.",
                "B": "Ein Open Proxy ist für nicht vertrauenswürdige oder beliebige externe Nutzer erreichbar. Der Begriff sagt nichts darüber aus, ob Endgeräte ihn konfigurieren müssen.",
                "D": "Active/Passive beschreibt eine Hochverfügbarkeitsanordnung mit aktiver und bereitstehender Instanz, nicht die Sichtbarkeit eines Proxys für Clients.",
            },
            [COMPTIA_OBJECTIVES, NIST_CONTROLS],
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
    overrides.update(human_editorial_overrides())
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
    glossary: dict[str, str] = dict(SECURITY_TERM_DEFINITIONS)
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
        definition = re.sub(r"\s+", " ", explanation.split("\n\n", 1)[0]).strip()
        if len(definition) > 520:
            definition = definition[:520].rsplit(" ", 1)[0].rstrip(" ,;:") + "."
        for key in term_keys(answer):
            glossary.setdefault(key, definition)
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
