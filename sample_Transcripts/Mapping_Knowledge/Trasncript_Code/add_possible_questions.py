#!/usr/bin/env python3
"""Add mapped practice question/answer pairs to all five requirement mappings.

The existing distilledContent values are treated as immutable. Questions are
derived from the topic labels in practice-questions-coverage-mapping.json and
answers are either the correct acronym expansion, the exact requirement path,
or an unchanged excerpt of distilledContent.
"""

from __future__ import annotations

import json
import re
import runpy
from collections import OrderedDict
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
COVERAGE_PATH = Path(__file__).resolve().parent / "practice-questions-coverage-mapping.json"
AUDIT_PATH = Path(__file__).resolve().parent / "possible-question-mapping-audit.md"


ACRONYMS = {
    "TACACS+": "Terminal Access Controller Access-Control System Plus",
    "CIA": "Confidentiality, Integrity, and Availability",
    "CCTV": "Closed-Circuit Television",
    "PTZ": "Pan-Tilt-Zoom",
    "CA": "Certificate Authority",
    "CRL": "Certificate Revocation List",
    "CSR": "Certificate Signing Request",
    "OCSP": "Online Certificate Status Protocol",
    "DSA": "Digital Signature Algorithm",
    "ECDSA": "Elliptic Curve Digital Signature Algorithm",
    "AES": "Advanced Encryption Standard",
    "CBC": "Cipher Block Chaining",
    "CFB": "Cipher Feedback",
    "DES": "Data Encryption Standard",
    "ECC": "Elliptic Curve Cryptography",
    "ECDH": "Elliptic Curve Diffie-Hellman",
    "RSA": "Rivest-Shamir-Adleman",
    "DHE": "Diffie-Hellman Ephemeral",
    "EFS": "Encrypting File System",
    "FDE": "Full-Disk Encryption",
    "SED": "Self-Encrypting Drive",
    "RC4": "Rivest Cipher 4",
    "HTTPS": "Hypertext Transfer Protocol Secure",
    "SSL": "Secure Sockets Layer",
    "HMAC": "Hash-based Message Authentication Code",
    "MD5": "Message Digest Algorithm 5",
    "RIPEMD": "RACE Integrity Primitives Evaluation Message Digest",
    "SHA": "Secure Hash Algorithm",
    "PBKDF2": "Password-Based Key Derivation Function 2",
    "PKI": "Public Key Infrastructure",
    "HSM": "Hardware Security Module",
    "KEK": "Key Encryption Key",
    "TPM": "Trusted Platform Module",
    "APT": "Advanced Persistent Threat",
    "IM": "Instant Messaging",
    "SPIM": "Spam over Instant Messaging",
    "SMS": "Short Message Service",
    "MSP": "Managed Service Provider",
    "MSSP": "Managed Security Service Provider",
    "TOC": "Time of Check",
    "TOU": "Time of Use",
    "OS": "Operating System",
    "VM": "Virtual Machine",
    "XSS": "Cross-Site Scripting",
    "SQL": "Structured Query Language",
    "SQLi": "Structured Query Language Injection",
    "CSRF": "Cross-Site Request Forgery",
    "XSRF": "Cross-Site Request Forgery",
    "IoC": "Indicator of Compromise",
    "PUP": "Potentially Unwanted Program",
    "RAT": "Remote Access Trojan",
    "DoS": "Denial of Service",
    "DNS": "Domain Name System",
    "ARP": "Address Resolution Protocol",
    "RFID": "Radio-Frequency Identification",
    "ACL": "Access Control List",
    "FACL": "File Access Control List",
    "HIPS": "Host-Based Intrusion Prevention System",
    "CSP": "Cloud Service Provider",
    "HA": "High Availability",
    "ICS": "Industrial Control System",
    "SCADA": "Supervisory Control and Data Acquisition",
    "IaC": "Infrastructure as Code",
    "IoT": "Internet of Things",
    "VLAN": "Virtual Local Area Network",
    "SDN": "Software-Defined Networking",
    "RTOS": "Real-Time Operating System",
    "VDI": "Virtual Desktop Infrastructure",
    "PDU": "Power Distribution Unit",
    "NGFW": "Next-Generation Firewall",
    "UTM": "Unified Threat Management",
    "WAF": "Web Application Firewall",
    "HIDS": "Host-Based Intrusion Detection System",
    "IDS": "Intrusion Detection System",
    "IPS": "Intrusion Prevention System",
    "NIDS": "Network-Based Intrusion Detection System",
    "NIPS": "Network-Based Intrusion Prevention System",
    "WIDS": "Wireless Intrusion Detection System",
    "WIPS": "Wireless Intrusion Prevention System",
    "EAP": "Extensible Authentication Protocol",
    "SASE": "Secure Access Service Edge",
    "SD-WAN": "Software-Defined Wide Area Network",
    "AH": "Authentication Header",
    "ESP": "Encapsulating Security Payload",
    "IKE": "Internet Key Exchange",
    "IPSec": "Internet Protocol Security",
    "TLS": "Transport Layer Security",
    "L2TP": "Layer 2 Tunneling Protocol",
    "PPTP": "Point-to-Point Tunneling Protocol",
    "VPN": "Virtual Private Network",
    "PHI": "Protected Health Information",
    "PII": "Personally Identifiable Information",
    "COOP": "Continuity of Operations",
    "UPS": "Uninterruptible Power Supply",
    "OT": "Operational Technology",
    "BYOD": "Bring Your Own Device",
    "CYOD": "Choose Your Own Device",
    "COPE": "Corporate-Owned, Personally Enabled",
    "MDM": "Mobile Device Management",
    "WAP": "Wireless Access Point",
    "RADIUS": "Remote Authentication Dial-In User Service",
    "CHAP": "Challenge-Handshake Authentication Protocol",
    "LEAP": "Lightweight Extensible Authentication Protocol",
    "MS-CHAP": "Microsoft Challenge-Handshake Authentication Protocol",
    "PAP": "Password Authentication Protocol",
    "PEAP": "Protected Extensible Authentication Protocol",
    "CCMP": "Counter Mode with Cipher Block Chaining Message Authentication Code Protocol",
    "PSK": "Pre-Shared Key",
    "TKIP": "Temporal Key Integrity Protocol",
    "WEP": "Wired Equivalent Privacy",
    "SAE": "Simultaneous Authentication of Equals",
    "WPA": "Wi-Fi Protected Access",
    "CVE": "Common Vulnerabilities and Exposures",
    "CVSS": "Common Vulnerability Scoring System",
    "AIS": "Automated Indicator Sharing",
    "STIX": "Structured Threat Information Expression",
    "TAXII": "Trusted Automated Exchange of Intelligence Information",
    "OSINT": "Open-Source Intelligence",
    "AV": "Antivirus",
    "DLP": "Data Loss Prevention",
    "SCAP": "Security Content Automation Protocol",
    "SIEM": "Security Information and Event Management",
    "SNMP": "Simple Network Management Protocol",
    "DMARC": "Domain-based Message Authentication, Reporting, and Conformance",
    "DKIM": "DomainKeys Identified Mail",
    "SPF": "Sender Policy Framework",
    "EDR": "Endpoint Detection and Response",
    "XDR": "Extended Detection and Response",
    "FIM": "File Integrity Monitoring",
    "NAC": "Network Access Control",
    "GPO": "Group Policy Object",
    "SELinux": "Security-Enhanced Linux",
    "SWG": "Secure Web Gateway",
    "URL": "Uniform Resource Locator",
    "DAC": "Discretionary Access Control",
    "IdP": "Identity Provider",
    "IAM": "Identity and Access Management",
    "PIV": "Personal Identity Verification",
    "MFA": "Multifactor Authentication",
    "HOTP": "HMAC-Based One-Time Password",
    "TOTP": "Time-Based One-Time Password",
    "LDAP": "Lightweight Directory Access Protocol",
    "SSO": "Single Sign-On",
    "OAuth": "Open Authorization",
    "SAML": "Security Assertion Markup Language",
    "API": "Application Programming Interface",
    "PCAP": "Packet Capture",
    "PCI DSS": "Payment Card Industry Data Security Standard",
    "GDPR": "General Data Protection Regulation",
    "AUP": "Acceptable Use Policy",
    "BCP": "Business Continuity Plan",
    "DRP": "Disaster Recovery Plan",
    "CERT": "Computer Emergency Response Team",
    "CIRT": "Computer Incident Response Team",
    "IR": "Incident Response",
    "IRP": "Incident Response Plan",
    "SDLC": "Software Development Life Cycle",
    "SDLM": "Software Development Life Cycle Methodology",
    "MTBF": "Mean Time Between Failures",
    "MTTR": "Mean Time to Repair",
    "RPO": "Recovery Point Objective",
    "RTO": "Recovery Time Objective",
    "ALE": "Annualized Loss Expectancy",
    "ARO": "Annualized Rate of Occurrence",
    "SLE": "Single Loss Expectancy",
    "BPA": "Business Partners Agreement",
    "MSA": "Master Service Agreement",
    "MOA": "Memorandum of Agreement",
    "MOU": "Memorandum of Understanding",
    "NDA": "Non-Disclosure Agreement",
    "SLA": "Service-Level Agreement",
    "SOW": "Statement of Work",
    "WO": "Work Order",
}


ACRONYM_TOPIC_RE = re.compile(r"^(?:Akronym\s+(.+)|(.+?)-Akronym)$", re.IGNORECASE)
QUESTION_KEY_RE = re.compile(r"^possibleQuestion\d+$")
EXCLUDED_TOPICS = {
    ("req:sy0701:v7:1.4:encryption:algorithms", "Akronym CTM"):
        "CTM ist keine etablierte Abkürzung für Counter Mode; gebräuchlich ist CTR.",
}


def acronym_from_topic(topic: str) -> str | None:
    match = ACRONYM_TOPIC_RE.match(topic)
    if not match:
        return None
    return (match.group(1) or match.group(2)).strip(" \"„“")


def normalized_words(value: str) -> set[str]:
    stopwords = {
        "akronym", "begriff", "definition", "funktion", "rolle", "zweck",
        "ziel", "nutzen", "vorteil", "risiko", "merkmal", "security",
        "kontext", "von", "und", "oder", "der", "die", "das", "des",
    }
    return {
        word for word in re.findall(r"[a-z0-9]+", value.casefold())
        if len(word) > 2 and word not in stopwords
    }


def topic_matches_leaf(topic: str, leaf: str) -> bool:
    topic_folded = topic.casefold().strip(" \"„“")
    leaf_folded = leaf.casefold().strip(" \"„“")
    if topic_folded in leaf_folded or leaf_folded in topic_folded:
        return True
    parenthetical = re.findall(r"\(([^)]+)\)", leaf)
    if any(item.casefold() in topic_folded for item in parenthetical):
        return True
    return bool(normalized_words(topic) & normalized_words(leaf))


def first_answer_sentence(content: str) -> str:
    # The paragraph itself remains untouched. This only selects a concise,
    # verbatim answer excerpt for the generated question object.
    parts = re.split(r"(?<=[.!?])\s+(?=[A-ZÄÖÜ])", content.strip(), maxsplit=1)
    return parts[0]


def nominative_phrase(value: str) -> str:
    replacements = {
        "einer ": "eine ",
        "eines ": "ein ",
        "einem ": "ein ",
    }
    folded = value.casefold()
    for prefix, replacement in replacements.items():
        if folded.startswith(prefix):
            return replacement + value[len(prefix):]
    return value


def make_question(topic: str, leaf: str, matches_leaf: bool) -> str:
    acronym = acronym_from_topic(topic)
    if acronym:
        return f"Wofür steht die Abkürzung {acronym}?"

    patterns = (
        (r"^Zweck(?:\s+von)?\s+(.+)$", "Welchen Zweck erfüllt {x}?"),
        (r"^Ziel(?:\s+von)?\s+(.+)$", "Welches Ziel verfolgt {x}?"),
        (r"^Rolle(?:\s+von)?\s+(.+)$", "Welche Rolle übernimmt {x}?"),
        (r"^Funktion(?:\s+von)?\s+(.+)$", "Welche Funktion erfüllt {x}?"),
        (r"^Nutzen(?:\s+von)?\s+(.+)$", "Welchen Nutzen bietet {x}?"),
        (r"^Vorteil(?:\s+von)?\s+(.+)$", "Welchen Vorteil bietet {x}?"),
        (r"^Definition\s+(.+)$", "Wie wird {x} definiert?"),
        (r"^Begriff\s+(.+)$", "Was bedeutet {x}?"),
        (r"^Eigenschaft\s+(.+)$", "Welche zentrale Eigenschaft hat {x}?"),
    )
    for pattern, template in patterns:
        match = re.match(pattern, topic, re.IGNORECASE)
        if match:
            return template.format(x=nominative_phrase(match.group(1)))

    if " vs. " in topic.casefold() or " vs " in topic.casefold():
        return f"Worin unterscheiden sich die in „{topic}“ gegenübergestellten Konzepte?"
    if matches_leaf:
        return f"Welche prüfungsrelevante Aussage trifft auf „{topic}“ zu?"
    return f"Welcher Security+-Begriff beschreibt „{topic}“ am besten?"


def make_answer(topic: str, source_path: str, content: str, matches_leaf: bool) -> str:
    acronym = acronym_from_topic(topic)
    if acronym:
        return ACRONYMS[acronym]
    # The question is mapped by requirementId, so the first unchanged sentence
    # of distilledContent is the concise, content-backed answer. This avoids
    # replacing a real answer with a mere taxonomy path.
    return first_answer_sentence(content)


def add_questions(entry: dict, coverage_entry: dict) -> tuple[dict, int, list[tuple[str, str]]]:
    result = OrderedDict()
    pairs: list[dict[str, str]] = []
    excluded: list[tuple[str, str]] = []
    leaf = entry["sourcePath"].split(" > ")[-1]

    for topic in coverage_entry["topics"]:
        reason = EXCLUDED_TOPICS.get((entry["requirementId"], topic))
        if reason:
            excluded.append((topic, reason))
            continue
        acronym = acronym_from_topic(topic)
        if acronym and acronym not in ACRONYMS:
            excluded.append((topic, "Keine verlässlich bestätigte Langform vorhanden."))
            continue
        matches_leaf = topic_matches_leaf(topic, leaf)
        pair = {
            "question": make_question(topic, leaf, matches_leaf),
            "answer": make_answer(topic, entry["sourcePath"], entry["distilledContent"], matches_leaf),
            "sourceTopic": topic,
        }
        pairs.append(pair)

    seen_questions: dict[str, int] = {}
    for pair in pairs:
        question = pair["question"]
        seen_questions[question] = seen_questions.get(question, 0) + 1
        if seen_questions[question] > 1:
            pair["question"] = question[:-1] + " (weitere Variante)?"

    for key, value in entry.items():
        if QUESTION_KEY_RE.match(key):
            continue
        result[key] = value
        if key == "distilledContent":
            for index, pair in enumerate(pairs, start=1):
                result[f"possibleQuestion{index}"] = pair
    return result, len(pairs), excluded


def render_markdown(domain_data: dict) -> str:
    domain = domain_data["domain"]
    requirement_count = domain_data["requirementCount"]
    conflict_count = domain_data["conflictCount"]
    lines = [
        f"# Domain {domain} — Objectives ↔ Transkript-Mapping (destilliert)",
        "",
        f"{requirement_count} Requirements, je mit destilliertem Inhalt aus Messers Einzellektion + Cram-Video.",
        f"{conflict_count} davon mit ⚠ markiertem Quellenkonflikt (Messer und Cram-Video widersprechen sich inhaltlich).",
        "",
    ]
    current_objective = None
    for entry in domain_data["entries"]:
        if entry["objective"] != current_objective:
            current_objective = entry["objective"]
            lines.extend([f"## Objective {current_objective}", ""])
        conflict = " ⚠ QUELLENKONFLIKT" if entry["possibleSourceConflict"] else ""
        lines.extend([
            f"### {entry['sourcePath']}{conflict}",
            f"`{entry['requirementId']}`",
            "",
        ])
        questions = [
            (key, value) for key, value in entry.items() if QUESTION_KEY_RE.match(key)
        ]
        for key, pair in questions:
            lines.extend([
                f"**{key}**",
                "",
                f"- Frage: {pair['question']}",
                f"- Antwort: {pair['answer']}",
                f"- Quellthema: `{pair['sourceTopic']}`",
                "",
            ])
        lines.extend([entry["distilledContent"], ""])
    return "\n".join(lines).rstrip() + "\n"


def render_audit(
    coverage: dict,
    mapped_count: int,
    question_entry_count: int,
    excluded_leaf_topics: list[tuple[str, str, str]],
) -> str:
    branch_question_count = sum(item["questionCount"] for item in coverage["branchLevelTopics"])
    lines = [
        "# Audit: Zuordnung der möglichen Practice-Fragen",
        "",
        "Die Fragen wurden ausschließlich in `domain-1` bis `domain-5-requirement-mapping.json/.md` eingetragen. "
        "`distilledContent` wurde nicht verändert.",
        "",
        "## Ergebnis",
        "",
        f"- {mapped_count} Frage-Antwort-Paare an {question_entry_count} eindeutigen Requirement-IDs eingetragen.",
        f"- {len(excluded_leaf_topics)} fehlerhaftes bzw. nicht belastbar formulierbares Leaf-Thema ausgeschlossen.",
        f"- {branch_question_count} Fragen an {len(coverage['branchLevelTopics'])} Branch-Pfaden nicht künstlich einem Leaf zugeordnet.",
        f"- {coverage['stats']['acronymOrNoMatchRows']} Akronym-/No-match-Zeilen ohne eindeutige Leaf-ID nicht eingetragen.",
        f"- {len(coverage['uncoveredRequirementIds'])} Requirements haben im Practice-Mapping keine Frage und erhielten daher keinen `possibleQuestion`-Key.",
        "",
        "## Ausgeschlossene Leaf-Themen",
        "",
        "| Requirement-ID | Quellthema | Grund |",
        "|---|---|---|",
    ]
    for requirement_id, topic, reason in excluded_leaf_topics:
        lines.append(f"| `{requirement_id}` | {topic} | {reason} |")

    lines.extend([
        "",
        "## Nur auf Branch-Ebene zuordenbar",
        "",
        "| Branch-Pfad | Anzahl | Themen |",
        "|---|---:|---|",
    ])
    for item in coverage["branchLevelTopics"]:
        topics = "; ".join(item["topics"])
        lines.append(f"| `{item['branchPath']}` | {item['questionCount']} | {topics} |")

    lines.extend([
        "",
        "## Requirements ohne Practice-Frage",
        "",
    ])
    lines.extend(f"- `{requirement_id}`" for requirement_id in coverage["uncoveredRequirementIds"])
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    coverage = json.loads(COVERAGE_PATH.read_text(encoding="utf-8"))
    coverage_by_id = {
        item["requirementId"]: item for item in coverage["requirementCoverage"]
    }
    mapped_count = 0
    question_entry_count = 0
    excluded_leaf_topics: list[tuple[str, str, str]] = []
    before_content: dict[str, str] = {}
    after_content: dict[str, str] = {}

    for domain in range(1, 6):
        json_path = ROOT / f"domain-{domain}-requirement-mapping.json"
        md_path = ROOT / f"domain-{domain}-requirement-mapping.md"
        data = json.loads(json_path.read_text(encoding="utf-8"), object_pairs_hook=OrderedDict)
        updated_entries = []
        for entry in data["entries"]:
            requirement_id = entry["requirementId"]
            before_content[requirement_id] = entry["distilledContent"]
            coverage_entry = coverage_by_id.get(requirement_id)
            if coverage_entry:
                entry, count, excluded = add_questions(entry, coverage_entry)
                mapped_count += count
                question_entry_count += int(count > 0)
                excluded_leaf_topics.extend(
                    (requirement_id, topic, reason) for topic, reason in excluded
                )
            updated_entries.append(entry)
            after_content[requirement_id] = entry["distilledContent"]
        data["entries"] = updated_entries
        json_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        md_path.write_text(render_markdown(data), encoding="utf-8")

    if before_content != after_content:
        raise RuntimeError("Invariant verletzt: distilledContent wurde verändert")

    expected_topics = sum(len(item["topics"]) for item in coverage["requirementCoverage"])
    if mapped_count + len(excluded_leaf_topics) != expected_topics:
        raise RuntimeError("Nicht alle Leaf-Themen wurden verarbeitet")

    AUDIT_PATH.write_text(
        render_audit(coverage, mapped_count, question_entry_count, excluded_leaf_topics),
        encoding="utf-8",
    )
    print(
        f"{mapped_count} Paare in {question_entry_count} Requirements; "
        f"{len(excluded_leaf_topics)} Leaf-Thema ausgeschlossen."
    )


if __name__ == "__main__":
    # Compatibility entry point: the original synthetic/German generator is
    # retained as the acronym data source, but direct execution must use the
    # validated English transcript MCQ pipeline.
    runpy.run_path(
        str(Path(__file__).resolve().parent / "add_english_mcq_questions.py"),
        run_name="__main__",
    )
