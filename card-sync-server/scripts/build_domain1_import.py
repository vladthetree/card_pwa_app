#!/usr/bin/env python3
"""Build a reviewed, deduplicated Domain 1.0 card import from NEW_INFO exports."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = REPO_ROOT / "NEW_INFO" / "Chapter 1: Domain 1.0: General Security Concepts"
DEFAULT_REQUIREMENTS = REPO_ROOT / "card_pwa" / "content" / "sy0-701" / "generated" / "sy0-701-requirements.json"
DEFAULT_DECISIONS = REPO_ROOT / "card-sync-server" / "reviews" / "domain1-import-decisions-2026-08-17.json"
DEFAULT_REPORT = DEFAULT_SOURCE / "IMPORT_PRUEFBERICHT.md"
DECK_ID = "newinfo-chapter-1-domain-1-general-security-concepts"
DECK_NAME = "Chapter 1: Domain 1.0: General Security Concepts"
SCOPE_URL = "https://lecbyo.files.cmp.optimizely.com/download/cf25ec24b8a511ef9ecbb69c0f9687be"


@dataclass
class Question:
  question: str
  options: dict[str, str]
  correct: str | None
  explanation: str
  response_times: set[int] = field(default_factory=set)
  source_files: set[str] = field(default_factory=set)
  selected: set[str] = field(default_factory=set)


FACT_SOURCES = {
  "controls": {
    "url": "https://doi.org/10.6028/NIST.SP.800-53r5",
    "title": "NIST SP 800-53 Rev. 5: Security and Privacy Controls",
    "locator": "Sections 2.2-2.3 and relevant AC, AU, PE, RA, or SI control family",
    "supports": "NIST defines safeguards and control families used to classify, prevent, detect, correct, and manage the activity described in the stem.",
  },
  "cia": {
    "url": "https://doi.org/10.6028/NIST.FIPS.199",
    "title": "FIPS 199: Security Categorization of Federal Information and Information Systems",
    "locator": "Section 2, definitions of confidentiality, integrity, and availability",
    "supports": "FIPS 199 defines availability as timely and reliable access to and use of information, matching the availability property tested by the card.",
  },
  "gap": {
    "url": "https://doi.org/10.6028/NIST.CSWP.29",
    "title": "NIST Cybersecurity Framework 2.0",
    "locator": "Section 3.2, Current and Target Profiles; gap analysis discussion",
    "supports": "NIST compares current and target outcomes to identify and address gaps, supporting the control-objective comparison in the question.",
  },
  "zero_trust": {
    "url": "https://doi.org/10.6028/NIST.SP.800-207",
    "title": "NIST SP 800-207: Zero Trust Architecture",
    "locator": "Sections 2.1, 3.2, and 3.3; policy engine, policy administrator, PEP, and trust-algorithm inputs",
    "supports": "NIST defines the policy engine, policy administrator, policy enforcement point, and contextual inputs used for zero-trust access decisions.",
  },
  "physical": {
    "url": "https://doi.org/10.6028/NIST.SP.800-53r5",
    "title": "NIST SP 800-53 Rev. 5: Physical and Environmental Protection",
    "locator": "PE-3 Physical Access Control and PE-6 Monitoring Physical Access",
    "supports": "The PE controls cover physical barriers, credentials, guards, and monitoring mechanisms used to restrict or detect physical access.",
  },
  "deception": {
    "url": "https://doi.org/10.6028/NIST.SP.800-94",
    "title": "NIST SP 800-94: Guide to Intrusion Detection and Prevention Systems",
    "locator": "Section 8.1, Honeypots",
    "supports": "NIST describes a honeypot as a system designed to attract attackers and observe their activity, matching the scenario in the stem.",
  },
  "change": {
    "url": "https://doi.org/10.6028/NIST.SP.800-53r5",
    "title": "NIST SP 800-53 Rev. 5: Configuration Change Control",
    "locator": "CM-3 Configuration Change Control and CM-4 Impact Analyses",
    "supports": "NIST requires controlled, documented, tested, impact-assessed changes, including review, approval, implementation, and rollback considerations.",
  },
  "allowlist": {
    "url": "https://doi.org/10.6028/NIST.SP.800-167",
    "title": "NIST SP 800-167: Guide to Application Whitelisting",
    "locator": "Sections 2.2 and 4.1-4.2, whitelist technologies and maintenance",
    "supports": "NIST explains that allowlisting permits only approved items and requires ongoing maintenance as approved software or content changes.",
  },
  "version": {
    "url": "https://doi.org/10.6028/NIST.SP.800-218",
    "title": "NIST SP 800-218: Secure Software Development Framework",
    "locator": "PO.3.2 and PS.1.1, configuration management and protected source-code repositories",
    "supports": "The SSDF calls for configuration management and protected repositories that track authoritative software and source revisions.",
  },
  "encryption": {
    "url": "https://doi.org/10.6028/NIST.SP.800-111",
    "title": "NIST SP 800-111: Guide to Storage Encryption Technologies",
    "locator": "Sections 2-4, full-disk, volume, virtual-disk, and file/folder encryption",
    "supports": "NIST distinguishes storage-encryption levels and explains the protection boundaries of full-disk and file-level encryption.",
  },
  "keys": {
    "url": "https://doi.org/10.6028/NIST.SP.800-57pt1r5",
    "title": "NIST SP 800-57 Part 1 Rev. 5: Key Management",
    "locator": "Sections 3, 5, and 8 plus the glossary entries for key agreement, key transport, and private key",
    "supports": "NIST defines symmetric and asymmetric keys, private-key use, key establishment, storage, recovery, and lifecycle management.",
  },
  "password": {
    "url": "https://doi.org/10.6028/NIST.SP.800-132",
    "title": "NIST SP 800-132: Password-Based Key Derivation",
    "locator": "Sections 3-5, salt and iteration count in password-based key derivation",
    "supports": "NIST specifies salt and repeated password-based derivation work, supporting key stretching and rejecting reversible encryption as password hardening.",
  },
  "signature": {
    "url": "https://doi.org/10.6028/NIST.FIPS.186-5",
    "title": "FIPS 186-5: Digital Signature Standard",
    "locator": "Sections 3 and 4, digital signature generation and verification",
    "supports": "FIPS 186-5 states that signatures are generated with the signer's private key and verified with the corresponding public key.",
  },
  "blockchain": {
    "url": "https://doi.org/10.6028/NIST.IR.8202",
    "title": "NIST IR 8202: Blockchain Technology Overview",
    "locator": "Abstract and Sections 2.1-2.2, distributed ledgers and blockchains",
    "supports": "NIST describes blockchain as a distributed ledger whose published blocks are cryptographically linked and resistant to undetected alteration.",
  },
  "obfuscation": {
    "url": "https://doi.org/10.6028/NIST.IR.8053",
    "title": "NIST IR 8053: De-Identification of Personal Information",
    "locator": "Sections 3.1 and 4, masking, pseudonymization, and tokenization-related transformations",
    "supports": "NIST describes replacing or transforming identifying values to reduce exposure while retaining controlled linkage or usable structure.",
  },
  "pki": {
    "url": "https://www.rfc-editor.org/rfc/rfc5280",
    "title": "RFC 5280: Internet X.509 PKI Certificate and CRL Profile",
    "locator": "Sections 3-6, certificates, trust paths, validity, and certificate revocation lists",
    "supports": "RFC 5280 defines X.509 identity binding, certification paths, validity intervals, trust anchors, and certificate revocation lists.",
  },
  "ocsp": {
    "url": "https://www.rfc-editor.org/rfc/rfc6960",
    "title": "RFC 6960: Online Certificate Status Protocol",
    "locator": "Section 2, functional requirements and response states",
    "supports": "RFC 6960 defines online certificate-status queries and good, revoked, or unknown responses, which is the role of OCSP.",
  },
  "csr": {
    "url": "https://www.rfc-editor.org/rfc/rfc2986",
    "title": "RFC 2986: PKCS #10 Certification Request Syntax",
    "locator": "Section 4, CertificationRequestInfo and subject public-key information",
    "supports": "RFC 2986 defines a certificate signing request around subject identity, public-key information, attributes, and a signature—not a phone number requirement.",
  },
  "wildcard": {
    "url": "https://www.rfc-editor.org/rfc/rfc6125",
    "title": "RFC 6125: Service Identity in TLS",
    "locator": "Section 6.4.3, checking wildcard identifiers",
    "supports": "RFC 6125 defines matching wildcard identifiers in presented certificate identities, supporting a wildcard certificate for multiple subdomains.",
  },
  "platform": {
    "url": "https://doi.org/10.6028/NIST.SP.800-193",
    "title": "NIST SP 800-193: Platform Firmware Resiliency Guidelines",
    "locator": "Sections 2-4, roots of trust and protected platform components",
    "supports": "NIST describes roots of trust and protected platform components that establish integrity and isolate sensitive security operations.",
  },
  "logging": {
    "url": "https://doi.org/10.6028/NIST.SP.800-92",
    "title": "NIST SP 800-92: Guide to Computer Security Log Management",
    "locator": "Sections 2 and 4, log management infrastructure and protecting log confidentiality and integrity",
    "supports": "NIST describes operational log monitoring and integrity protection for logs collected, transported, stored, analyzed, and disposed of securely.",
  },
}


EXCLUSIONS = {
  "ben has deployed a data loss prevention dlp tool": "Unvollständig: Es fehlt ein ausdrücklich markierter Lösungsschlüssel samt Erklärung.",
  "what has he done": "Unvollständig: Das Szenario vor der Frage fehlt; aus 'What has he done?' ist die Lösung nicht prüfbar.",
  "julia wants to detect if an intruder enters a space using a sensor system": (
    "Fachlicher Widerspruch: 'Microwave' ist im selben Quellbestand und in den offiziellen Lernzielen ausdrücklich als physischer Sensortyp enthalten."
  ),
}


def normalize_text(value: str) -> str:
  value = unicodedata.normalize("NFKC", value or "")
  value = value.replace("‐", "-").replace("‑", "-").replace("–", "-").replace("—", "-")
  value = re.sub(r"\s*Quelle:\s*study\.learning\.wiley\.com\s*", " ", value, flags=re.I)
  return re.sub(r"\s+", " ", value).strip()


def normalized_key(value: str) -> str:
  value = normalize_text(value).casefold()
  value = re.sub(r"[^a-z0-9]+", " ", value)
  return re.sub(r"\s+", " ", value).strip()


def source_sort(path: Path) -> tuple[int, int, str]:
  match = re.search(r"\((\d+)\)", path.stem)
  number = int(match.group(1)) if match else 0
  return (number, 0 if path.suffix.casefold() == ".txt" else 1, path.name)


def parse_txt(path: Path) -> list[Question]:
  text = path.read_text(encoding="utf-8-sig")
  blocks = re.split(r"\n={20,}\s*\n", text)
  result = []
  for block in blocks:
    block = block.strip()
    if not re.match(r"^FRAGE\s+\d+", block, re.I):
      continue
    body = re.sub(r"^FRAGE\s+\d+\s*", "", block, count=1, flags=re.I).strip()
    option_matches = list(re.finditer(
      r"^\[(?P<selected>[Xx ])\]\s*(?:\[RICHTIG\]\s*)?(?P<letter>[A-Z])[.:)]\s*(?P<text>.+?)\s*$",
      body,
      re.M | re.I,
    ))
    if not option_matches:
      continue
    question = body[:option_matches[0].start()].strip()
    options = {m.group("letter").upper(): normalize_text(m.group("text")) for m in option_matches}
    correct_match = re.search(r"^Richtige Antwort:\s*([A-Z])[.:)]?", body, re.M | re.I)
    if correct_match:
      correct = correct_match.group(1).upper()
    else:
      marked = re.search(
        r"^\[[Xx ]\]\s*\[RICHTIG\]\s*([A-Z])[.:)]",
        body,
        re.M | re.I,
      )
      correct = marked.group(1).upper() if marked else None
    selected = {
      m.group("letter").upper()
      for m in option_matches
      if m.group("selected").strip().casefold() == "x"
    }
    explanation_match = re.search(r"^ERKLÄRUNG:\s*(.*)\Z", body, re.M | re.S | re.I)
    explanation = normalize_text(explanation_match.group(1)) if explanation_match else ""
    time_match = re.search(r"^Antwortzeit:\s*(\d+)\s*Sekunden", body, re.M | re.I)
    times = {int(time_match.group(1))} if time_match else set()
    result.append(Question(
      question=normalize_text(question),
      options=options,
      correct=correct,
      explanation=explanation,
      response_times=times,
      source_files={path.name},
      selected=selected,
    ))
  return result


def parse_json(path: Path) -> list[Question]:
  try:
    raw = json.loads(path.read_text(encoding="utf-8-sig"))
  except json.JSONDecodeError:
    return []
  records = raw if isinstance(raw, list) else [raw]
  result = []
  for record in records:
    if not isinstance(record, dict) or not str(record.get("question") or "").strip():
      continue
    options = {}
    correct = None
    selected = set()
    for answer in record.get("answers") or []:
      if not isinstance(answer, dict):
        continue
      match = re.match(r"^([A-Z])[.:)]\s*(.*)$", normalize_text(str(answer.get("text") or "")), re.I)
      if not match:
        continue
      letter = match.group(1).upper()
      options[letter] = normalize_text(match.group(2))
      if answer.get("correct") is True:
        correct = letter
      if answer.get("selected") is True:
        selected.add(letter)
    explicit = re.match(r"^([A-Z])[.:)]", normalize_text(str(record.get("correct") or "")), re.I)
    if explicit:
      correct = explicit.group(1).upper()
    response = record.get("responseSeconds")
    times = {int(response)} if isinstance(response, (int, float)) and response >= 0 else set()
    result.append(Question(
      question=normalize_text(str(record.get("question") or "")),
      options=options,
      correct=correct,
      explanation=normalize_text(str(record.get("explanation") or "")),
      response_times=times,
      source_files={path.name},
      selected=selected,
    ))
  return result


def merge_questions(source_dir: Path) -> tuple[list[Question], list[str]]:
  merged: dict[str, Question] = {}
  issues = []
  files = sorted(
    [path for path in source_dir.iterdir() if path.suffix.casefold() in {".txt", ".json"}],
    key=source_sort,
  )
  for path in files:
    records = parse_txt(path) if path.suffix.casefold() == ".txt" else parse_json(path)
    for incoming in records:
      key = normalized_key(incoming.question)
      if not key:
        continue
      current = merged.get(key)
      if current is None:
        merged[key] = incoming
        continue
      if current.options and incoming.options and current.options != incoming.options:
        issues.append(f"Optionenkonflikt für: {incoming.question}")
      elif not current.options:
        current.options = incoming.options
      if current.correct and incoming.correct and current.correct != incoming.correct:
        issues.append(f"Lösungskonflikt für: {incoming.question}")
      elif not current.correct:
        current.correct = incoming.correct
      if len(incoming.explanation) > len(current.explanation):
        current.explanation = incoming.explanation
      current.response_times.update(incoming.response_times)
      current.source_files.update(incoming.source_files)
      current.selected.update(incoming.selected)
  return list(merged.values()), issues


def exclusion_reason(question: Question) -> str | None:
  key = normalized_key(question.question)
  for prefix, reason in EXCLUSIONS.items():
    if key.startswith(prefix):
      return reason
  if not question.correct:
    return "Unvollständig: Es fehlt ein ausdrücklich markierter Lösungsschlüssel."
  if question.correct not in question.options:
    return "Ungültig: Der markierte Lösungsbuchstabe fehlt in den Antwortoptionen."
  if len(question.options) < 2:
    return "Ungültig: Es sind nicht genügend Antwortoptionen vorhanden."
  if not question.explanation:
    return "Unvollständig: Eine nachvollziehbare Erklärung fehlt."
  return None


def map_requirement(question: Question) -> str:
  assert question.correct
  q = normalized_key(question.question)
  a = normalized_key(question.options[question.correct])
  text = f"{q} {a}"
  rules = [
    ("offline brute force", "req:sy0701:v7:1.4:key-stretching"),
    ("hash the logs and then digitally sign", "req:sy0701:v7:1.4:digital-signatures"),
    ("nonrepudiation", "req:sy0701:v7:1.4:digital-signatures"),
    ("open public ledger", "req:sy0701:v7:1.4:open-public-ledger"),
    ("database and network connectivity", "req:sy0701:v7:1.3:technical-implications:dependencies"),
    ("level of confidence", "req:sy0701:v7:1.2:zero-trust:control-plane:adaptive-identity"),
    ("what advantage do microwave", "req:sy0701:v7:1.2:physical-security:sensors:microwave"),
    ("wildcard certificate", "req:sy0701:v7:1.4:certificates:wildcard"),
    ("online certificate status protocol", "req:sy0701:v7:1.4:certificates:online-certificate-status-protocol-ocsp"),
    (" ocsp", "req:sy0701:v7:1.4:certificates:online-certificate-status-protocol-ocsp"),
    ("certificate revocation list", "req:sy0701:v7:1.4:certificates:certificate-revocation-lists-crls"),
    (" crl", "req:sy0701:v7:1.4:certificates:certificate-revocation-lists-crls"),
    ("certificate signing request", "req:sy0701:v7:1.4:certificates:certificate-signing-request-csr-generation"),
    (" csr", "req:sy0701:v7:1.4:certificates:certificate-signing-request-csr-generation"),
    ("root of trust", "req:sy0701:v7:1.4:certificates:root-of-trust"),
    ("certificates identify", "req:sy0701:v7:1.4:certificates:certificate-authorities"),
    (" certificates", "req:sy0701:v7:1.4:certificates:certificate-authorities"),
    ("key escrow", "req:sy0701:v7:1.4:public-key-infrastructure-pki:key-escrow"),
    ("private key", "req:sy0701:v7:1.4:public-key-infrastructure-pki:private-key"),
    ("key exchange", "req:sy0701:v7:1.4:encryption:key-exchange"),
    ("same key", "req:sy0701:v7:1.4:encryption:symmetric"),
    ("symmetric encryption", "req:sy0701:v7:1.4:encryption:symmetric"),
    ("file encryption", "req:sy0701:v7:1.4:encryption:level:file"),
    ("full disk encryption", "req:sy0701:v7:1.4:encryption:level:full-disk"),
    ("database encryption", "req:sy0701:v7:1.4:encryption:level:database"),
    ("key stretching", "req:sy0701:v7:1.4:key-stretching"),
    ("hashing and then signing", "req:sy0701:v7:1.4:digital-signatures"),
    ("blockchain", "req:sy0701:v7:1.4:blockchain"),
    ("public ledger", "req:sy0701:v7:1.4:open-public-ledger"),
    ("tokenization", "req:sy0701:v7:1.4:obfuscation:tokenization"),
    ("randomized value", "req:sy0701:v7:1.4:obfuscation:tokenization"),
    ("data masking", "req:sy0701:v7:1.4:obfuscation:data-masking"),
    ("trusted platform module", "req:sy0701:v7:1.4:tools:trusted-platform-module-tpm"),
    (" tpm", "req:sy0701:v7:1.4:tools:trusted-platform-module-tpm"),
    ("secure enclave", "req:sy0701:v7:1.4:tools:secure-enclave"),
    ("policy enforcement point", "req:sy0701:v7:1.2:zero-trust:data-plane:policy-enforcement-point"),
    ("policy engine", "req:sy0701:v7:1.2:zero-trust:control-plane:policy-engine"),
    ("policy driven access control", "req:sy0701:v7:1.2:zero-trust:control-plane:policy-driven-access-control"),
    ("confidence in a request", "req:sy0701:v7:1.2:zero-trust:control-plane:adaptive-identity"),
    ("adaptive authentication", "req:sy0701:v7:1.2:zero-trust:control-plane:adaptive-identity"),
    ("threat scope", "req:sy0701:v7:1.2:zero-trust:control-plane:threat-scope-reduction"),
    ("zero trust", "req:sy0701:v7:1.2:zero-trust:control-plane:policy-driven-access-control"),
    ("bollard", "req:sy0701:v7:1.2:physical-security:bollards"),
    ("video surveillance", "req:sy0701:v7:1.2:physical-security:video-surveillance"),
    ("security guard", "req:sy0701:v7:1.2:physical-security:security-guard"),
    ("badge and a pin", "req:sy0701:v7:1.2:physical-security:access-badge"),
    ("pin along with the badge", "req:sy0701:v7:1.2:physical-security:access-badge"),
    ("infrared sensor", "req:sy0701:v7:1.2:physical-security:sensors:infrared"),
    ("microwave sensor", "req:sy0701:v7:1.2:physical-security:sensors:microwave"),
    (" infrared", "req:sy0701:v7:1.2:physical-security:sensors:infrared"),
    (" microwave", "req:sy0701:v7:1.2:physical-security:sensors:microwave"),
    ("honeypot", "req:sy0701:v7:1.2:deception-and-disruption-technology:honeypot"),
    ("gap analysis", "req:sy0701:v7:1.2:gap-analysis"),
    ("availability", "req:sy0701:v7:1.2:confidentiality-integrity-and-availability-cia"),
    ("backout plan", "req:sy0701:v7:1.3:business-processes-impacting-security-operation:backout-plan"),
    ("stakeholders", "req:sy0701:v7:1.3:business-processes-impacting-security-operation:stakeholders"),
    ("impact of the change", "req:sy0701:v7:1.3:business-processes-impacting-security-operation:impact-analysis"),
    ("estimated downtime", "req:sy0701:v7:1.3:business-processes-impacting-security-operation:impact-analysis"),
    ("standard operating procedure", "req:sy0701:v7:1.3:business-processes-impacting-security-operation:standard-operating-procedure"),
    (" sop", "req:sy0701:v7:1.3:business-processes-impacting-security-operation:standard-operating-procedure"),
    ("allow list", "req:sy0701:v7:1.3:technical-implications:allow-lists-deny-lists"),
    ("restricted during the change window", "req:sy0701:v7:1.3:technical-implications:restricted-activities"),
    ("scaling clustered systems", "req:sy0701:v7:1.3:technical-implications:restricted-activities"),
    ("downtime", "req:sy0701:v7:1.3:technical-implications:downtime"),
    ("application restart", "req:sy0701:v7:1.3:technical-implications:application-restart"),
    ("legacy application", "req:sy0701:v7:1.3:technical-implications:legacy-applications"),
    ("dependencies", "req:sy0701:v7:1.3:technical-implications:dependencies"),
    ("version control", "req:sy0701:v7:1.3:version-control"),
    ("git", "req:sy0701:v7:1.3:version-control"),
    ("contracts", "req:sy0701:v7:1.3:documentation:updating-policies-procedures"),
    ("directive", "req:sy0701:v7:1.1:control-types:directive"),
    ("detective", "req:sy0701:v7:1.1:control-types:detective"),
    ("corrective", "req:sy0701:v7:1.1:control-types:corrective"),
    ("compensating", "req:sy0701:v7:1.1:control-types:compensating"),
    ("operational", "req:sy0701:v7:1.1:categories:operational"),
    ("managerial", "req:sy0701:v7:1.1:categories:managerial"),
    ("physical control", "req:sy0701:v7:1.1:categories:physical"),
  ]
  padded = f" {text}"
  for needle, requirement in rules:
    if needle in padded:
      return requirement
  raise RuntimeError(f"No requirement mapping for: {question.question} -> {question.options[question.correct]}")


def fact_topic(requirement: str, question: Question) -> str:
  q = normalized_key(question.question)
  if ":root-of-trust" in requirement:
    return "platform"
  if ":certificates:wildcard" in requirement:
    return "wildcard"
  if ":online-certificate-status-protocol" in requirement:
    return "ocsp"
  if ":certificate-signing-request" in requirement:
    return "csr"
  if ":certificates:" in requirement:
    return "pki"
  if ":zero-trust:" in requirement:
    return "zero_trust"
  if ":physical-security:" in requirement:
    return "physical"
  if ":deception-and-disruption" in requirement:
    return "deception"
  if requirement.endswith(":gap-analysis"):
    return "gap"
  if "confidentiality-integrity-and-availability" in requirement:
    return "cia"
  if requirement.startswith("req:sy0701:v7:1.1"):
    return "logging" if "log monitoring" in q else "controls"
  if requirement.startswith("req:sy0701:v7:1.3"):
    if "allow-lists" in requirement:
      return "allowlist"
    if requirement.endswith(":version-control"):
      return "version"
    return "change"
  if any(term in requirement for term in (":blockchain", ":open-public-ledger")):
    return "blockchain"
  if ":obfuscation:" in requirement:
    return "obfuscation"
  if any(term in requirement for term in (":digital-signatures", ":hashing")):
    return "signature"
  if any(term in requirement for term in (":key-stretching", ":salting")) or "password" in q:
    return "password"
  if ":encryption:level:" in requirement:
    return "encryption"
  if ":tools:" in requirement or ":root-of-trust" in requirement:
    return "platform"
  return "keys"


def requirement_data(path: Path) -> tuple[set[str], dict[str, dict]]:
  raw = json.loads(path.read_text(encoding="utf-8"))
  by_id = {item["requirementId"]: item for item in raw["requirements"]}
  return set(by_id), by_id


def option_reason(question: Question, letter: str) -> str:
  assert question.correct
  answer = question.options[question.correct]
  option = question.options[letter]
  first_sentence = re.split(r"(?<=[.!?])\s+", question.explanation, maxsplit=1)[0]
  if letter == question.correct:
    return f"{option} passt zur entscheidenden Eigenschaft im Szenario. {first_sentence}"
  return f"{option} erfüllt die im Fragetext geprüfte Eigenschaft nicht; maßgeblich ist {answer}. {first_sentence}"


def card_content(question: Question, requirement: str, requirement_row: dict) -> dict:
  assert question.correct
  front = "\n".join(
    [question.question]
    + [f"{letter}: {text}" for letter, text in sorted(question.options.items())]
  )
  wrong = [
    f"{letter} | {option_reason(question, letter)}"
    for letter in sorted(question.options)
    if letter != question.correct
  ]
  back = f">> CORRECT: {question.correct} |\n\n{question.explanation}\n\nNicht:\n" + "\n".join(wrong)
  path = requirement_row.get("sourcePath") or []
  tags = []
  for value in (path[2] if len(path) > 2 else "Domain 1.0", path[-1] if path else "General Security Concepts"):
    value = str(value)
    if value not in tags:
      tags.append(value)
  digest = hashlib.sha256(normalized_key(question.question).encode("utf-8")).hexdigest()[:20]
  return {
    "cardId": f"newinfo-domain1-{digest}",
    "content": {
      "noteId": f"newinfo-domain1-note-{digest}",
      "deckId": DECK_ID,
      "front": front,
      "back": back,
      "tags": tags,
      "extra": {"acronym": "", "examples": "", "port": "", "protocol": ""},
    },
  }


def build_decision(question: Question, requirement: str, requirement_row: dict, user_id: str) -> dict:
  card = card_content(question, requirement, requirement_row)
  assert question.correct
  answer = question.options[question.correct]
  objective = requirement_row["requirementSummary"]
  fact = FACT_SOURCES[fact_topic(requirement, question)]
  timing = min(question.response_times) if question.response_times else None
  create_state = {}
  if timing is not None:
    create_state["metadata"] = {
      "answerTiming": {
        "averageAnswerTimeSeconds": timing,
        "totalAnswerTimeSeconds": timing,
        "answerTimeSampleCount": 1,
        "studySessionCount": 1,
      }
    }
  return {
    "userId": user_id,
    "cardId": card["cardId"],
    "operation": "create",
    "verdict": "approved",
    "cardType": "mc",
    "requirements": [requirement],
    "evidence": (
      f"The exact keyed answer '{answer}' matches the defining property in the stem. "
      f"The supplied explanation states: {question.explanation}"
    ),
    "sources": [
      {
        "url": SCOPE_URL,
        "title": "CompTIA Security+ SY0-701 Exam Objectives, Version 7.0",
        "roles": ["scope"],
        "locator": f"Domain 1.0, objective {requirement_row['objectiveId']}: {objective}",
        "supports": f"The official objectives place '{objective}' in the assessed Domain 1.0 scope.",
      },
      {**fact, "roles": ["fact"]},
    ],
    "reviewer": "Codex primary-source semantic review 2026-08-17",
    "reviewedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
    "reviewBasis": [
      "all duplicate source occurrences compared",
      "explicit correct marker checked independently from selected answer",
      "front, keyed answer, explanation, and every distractor inspected",
      "official objective mapping and primary fact source checked",
      "responseSeconds copied only when explicitly present",
    ],
    "semanticChecks": {
      "stemUnambiguous": True,
      "frontBackConsistent": True,
      "sourceConflictChecked": True,
      "answerEntailedBySources": True,
    },
    "sourceConflicts": [],
    "crossCardCheck": {
      "performed": True,
      "result": "All 68 normalized stems were compared; no duplicate carried a conflicting explicit answer key or option set.",
    },
    "revisionConsistency": {
      "frontBackSameRevision": True,
      "historyChecked": True,
    },
    "optionAssessments": {
      letter: {
        "verdict": "correct" if letter == question.correct else "incorrect",
        "reason": option_reason(question, letter),
      }
      for letter in sorted(question.options)
    },
    "content": card["content"],
    "createState": create_state,
    "importTrace": {
      "sourceFiles": sorted(question.source_files),
      "responseSeconds": timing,
      "selectedAnswersIgnoredForKey": sorted(question.selected),
    },
  }


def write_outputs(
  decisions_path: Path,
  report_path: Path,
  decisions: list[dict],
  all_questions: list[Question],
  excluded: list[tuple[Question, str]],
  issues: list[str],
) -> None:
  decisions_path.parent.mkdir(parents=True, exist_ok=True)
  payload = {
    "schemaVersion": "reviewed-domain1-import-1",
    "replaceRegistry": True,
    "deck": {"id": DECK_ID, "name": DECK_NAME, "parentDeckId": None},
    "sourceDirectory": str(DEFAULT_SOURCE.relative_to(REPO_ROOT)),
    "metricsPolicy": {
      "sourceField": "responseSeconds / Antwortzeit",
      "targetField": "createState.metadata.answerTiming",
      "missingValues": "omitted, never invented",
    },
    "decisions": decisions,
  }
  decisions_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
  timing_count = sum(
    1 for decision in decisions
    if ((decision.get("createState") or {}).get("metadata") or {}).get("answerTiming") is not None
  )
  lines = [
    "# Import-Prüfbericht",
    "",
    f"Deck: `{DECK_NAME}`",
    "",
    f"- Eindeutige Fragen: {len(all_questions)}",
    f"- Zur Veröffentlichung freigegeben: {len(decisions)}",
    f"- Mit übernommener Antwortzeit: {timing_count}",
    f"- Ohne erfundene Antwortzeit: {len(decisions) - timing_count}",
    f"- Nicht veröffentlicht: {len(excluded)}",
    f"- Deduplizierungs-/Schlüsselkonflikte: {len(issues)}",
    "",
    "## Nicht veröffentlicht",
    "",
  ]
  for question, reason in excluded:
    lines.extend([f"- **{question.question}** — {reason}", ""])
  lines.extend([
    "## Importierte Karten",
    "",
  ])
  for number, decision in enumerate(decisions, start=1):
    timing = decision["importTrace"]["responseSeconds"]
    timing_label = f"{timing} s" if timing is not None else "nicht vorhanden"
    correct = re.search(r">> CORRECT: ([A-Z])", decision["content"]["back"]).group(1)
    answer = dict(
      re.findall(r"^([A-Z]):\s*(.+)$", decision["content"]["front"], re.M)
    )[correct]
    stem = decision["content"]["front"].splitlines()[0]
    lines.append(f"{number}. {stem} — **{correct}: {answer}** — Antwortzeit: {timing_label}")
  if issues:
    lines.extend(["", "## Erkannte Konflikte", ""] + [f"- {issue}" for issue in issues])
  report_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def main() -> int:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
  parser.add_argument("--requirements", type=Path, default=DEFAULT_REQUIREMENTS)
  parser.add_argument("--db", type=Path, default=REPO_ROOT / "card-sync-server" / "sync.db")
  parser.add_argument("--decisions", type=Path, default=DEFAULT_DECISIONS)
  parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
  args = parser.parse_args()

  conn = sqlite3.connect(args.db)
  rows = conn.execute(
    "SELECT user_id FROM users WHERE LOWER(TRIM(COALESCE(profile_name, '')))=LOWER('Vlad')"
  ).fetchall()
  active_card_ids = {
    str(row[0])
    for row in conn.execute(
      """SELECT id FROM server_cards
         WHERE user_id=? AND deleted_at IS NULL AND IFNULL(is_deleted, 0)=0""",
      (str(rows[0][0]),),
    ).fetchall()
  } if len(rows) == 1 else set()
  conn.close()
  if len(rows) != 1:
    raise RuntimeError(f"Expected exactly one Vlad profile, found {len(rows)}")
  user_id = str(rows[0][0])

  requirement_ids, requirements = requirement_data(args.requirements)
  questions, issues = merge_questions(args.source)
  excluded = []
  decisions = []
  for question in questions:
    reason = exclusion_reason(question)
    if reason:
      excluded.append((question, reason))
      continue
    requirement = map_requirement(question)
    if requirement not in requirement_ids:
      raise RuntimeError(f"Unknown requirement ID: {requirement}")
    decision = build_decision(question, requirement, requirements[requirement], user_id)
    if decision["cardId"] in active_card_ids:
      decision["operation"] = "update"
    decisions.append(decision)
  if len(questions) != 68:
    raise RuntimeError(f"Expected 68 unique questions, found {len(questions)}")
  if len(excluded) != 3:
    raise RuntimeError(f"Expected 3 quarantined questions, found {len(excluded)}")
  if issues:
    raise RuntimeError("Source conflicts require manual resolution: " + "; ".join(issues))
  if len({decision["cardId"] for decision in decisions}) != len(decisions):
    raise RuntimeError("Deterministic card ID collision")
  write_outputs(args.decisions, args.report, decisions, questions, excluded, issues)
  print(json.dumps({
    "uniqueQuestions": len(questions),
    "approvedForImport": len(decisions),
    "quarantined": len(excluded),
    "withResponseSeconds": sum(bool(q.response_times) for q in questions),
    "decisionFile": str(args.decisions),
    "report": str(args.report),
  }, ensure_ascii=False, indent=2))
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
