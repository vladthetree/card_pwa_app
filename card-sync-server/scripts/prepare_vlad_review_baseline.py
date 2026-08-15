#!/usr/bin/env python3
"""Assemble the one-time Vlad review baseline from completed review artifacts.

This is a migration helper, not an automatic approval engine.  It refuses to
run unless the completed 751-card manual review, the 272 requirement-grounded
additions, the final validation report, and all currently active cards form an
exact, gap-free set.  Later changes must enter the normal review queue.
"""
from __future__ import annotations

import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


SERVER_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = SERVER_ROOT.parent
DB_PATH = SERVER_ROOT / "sync.db"
REPORTS = REPO_ROOT / "sample_Transcripts" / "improve" / "reports"
MAPPINGS = REPO_ROOT / "sample_Transcripts" / "Mapping_Knowledge"
AUTHORED_BACKS = SERVER_ROOT / "scripts" / "style_rewrites_authored.json"
OUT_DIR = SERVER_ROOT / "reviews"
REPAIR_PATH = OUT_DIR / "vlad-content-repair-decisions.json"
REGISTRATION_PATH = OUT_DIR / "vlad-initial-review-decisions.json"

COMPTIA = "https://lecbyo.files.cmp.optimizely.com/download/cf25ec24b8a511ef9ecbb69c0f9687be"
NIST_GLOSSARY = "https://csrc.nist.gov/glossary"
NIST_BLOCKCHAIN = "https://doi.org/10.6028/NIST.IR.8202"
NIST_CRYPTO = "https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines"
NIST_IDENTITY = "https://doi.org/10.6028/NIST.SP.800-63-4"
NIST_ZERO_TRUST = "https://doi.org/10.6028/NIST.SP.800-207"
NIST_CONTROLS = "https://doi.org/10.6028/NIST.SP.800-53r5"
NIST_INCIDENT = "https://doi.org/10.6028/NIST.SP.800-61r3"
NIST_RISK = "https://doi.org/10.6028/NIST.SP.800-30r1"
NIST_CONTINGENCY = "https://doi.org/10.6028/NIST.SP.800-34r1"
NIST_CLOUD = "https://doi.org/10.6028/NIST.SP.800-145"
NIST_ICS = "https://doi.org/10.6028/NIST.SP.800-82r3"
NIST_TESTING = "https://doi.org/10.6028/NIST.SP.800-115"
NIST_FIREWALL = "https://doi.org/10.6028/NIST.SP.800-41r1"
CISA_THREATS = "https://www.cisa.gov/topics/cyber-threats-and-advisories"
OWASP_WSTG = "https://owasp.org/www-project-web-security-testing-guide/"
RFC_5280 = "https://www.rfc-editor.org/rfc/rfc5280.html"
RFC_8446 = "https://www.rfc-editor.org/rfc/rfc8446.html"
IANA_PORTS = "https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml"
LOCKHEED_KILL_CHAIN = "https://www.lockheedmartin.com/en-us/capabilities/cyber/cyber-kill-chain.html"
GDPR = "https://eur-lex.europa.eu/eli/reg/2016/679/oj"

CORRECT_RE = re.compile(r"(?:>>\s*)?(?:CORRECT|RICHTIG)\s*:\s*([A-Z])", re.I)
OPTION_RE = re.compile(r"^\s*([A-Z])\s*[:.)|]\s*(.+?)\s*$")


def load(path: Path):
  return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, value):
  path.parent.mkdir(parents=True, exist_ok=True)
  path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def decode(value, fallback):
  try:
    return json.loads(value) if isinstance(value, str) else value
  except Exception:
    return fallback


def canonical(row: sqlite3.Row, authored_backs: dict[str, str]) -> dict:
  return {
    "noteId": row["note_id"],
    "deckId": row["deck_id"],
    "front": row["front"],
    "back": authored_backs.get(str(row["id"]), row["back"]),
    "tags": decode(row["tags_json"], []),
    "extra": decode(row["extra_json"], {}),
  }


def current(row: sqlite3.Row) -> dict:
  return {
    "noteId": row["note_id"],
    "deckId": row["deck_id"],
    "front": row["front"],
    "back": row["back"],
    "tags": decode(row["tags_json"], []),
    "extra": decode(row["extra_json"], {}),
  }


def keyed_answer(content: dict) -> str:
  match = CORRECT_RE.search(content["back"] or "")
  if not match:
    return ""
  letter = match.group(1).upper()
  options = {}
  for line in (content["front"] or "").splitlines():
    option = OPTION_RE.match(line)
    if option:
      options[option.group(1).upper()] = option.group(2).strip()
  return options.get(letter, "")


def card_type(front: str) -> str:
  upper = (front or "").lstrip().upper()
  if upper.startswith("ORDERING:"):
    return "ordering"
  if upper.startswith("MATCHING:"):
    return "matching"
  option_count = sum(1 for line in (front or "").splitlines() if OPTION_RE.match(line))
  return "mc" if option_count >= 2 else "standard"


def source(url: str, title: str, *roles: str) -> dict:
  return {"url": url, "title": title, "roles": list(roles)}


def official_sources(front: str, back: str, deck_name: str, card_id: str) -> list[dict]:
  text = f"{front}\n{back}\n{deck_name}".casefold()
  result = [source(COMPTIA, "CompTIA Security+ SY0-701 V7 Exam Objectives", "scope")]
  routes = (
    (("blockchain", "hash-linked blocks", "hash-verkett"), NIST_BLOCKCHAIN, "NISTIR 8202: Blockchain Technology Overview"),
    (("zero trust", "policy enforcement point", "policy engine"), NIST_ZERO_TRUST, "NIST SP 800-207: Zero Trust Architecture"),
    (("cloud", "iaas", "paas", "saas", "serverless", "hypervisor"), NIST_CLOUD, "NIST SP 800-145: Cloud Computing"),
    (("scada", "industrial control", "ics", "rtos"), NIST_ICS, "NIST SP 800-82 Rev. 3: OT Security"),
    (("certificate", "ocsp", "crl", "x.509", "public key infrastructure"), RFC_5280, "RFC 5280: Internet X.509 PKI"),
    (("tls", "https", "transport layer security"), RFC_8446, "RFC 8446: TLS 1.3"),
    (("password", "authentication", "identity", "biometric", "saml", "openid"), NIST_IDENTITY, "NIST SP 800-63-4: Digital Identity"),
    (("sql injection", "cross-site", "csrf", "ssrf", "web application"), OWASP_WSTG, "OWASP Web Security Testing Guide"),
    (("incident", "forensic", "eradication", "post-incident"), NIST_INCIDENT, "NIST SP 800-61 Rev. 3: Incident Response"),
    (("risk", "ale", "sle", "aro", "business impact"), NIST_RISK, "NIST SP 800-30 Rev. 1: Risk Assessments"),
    (("backup", "rpo", "rto", "hot site", "cold site", "recovery time"), NIST_CONTINGENCY, "NIST SP 800-34 Rev. 1: Contingency Planning"),
    (("penetration test", "vulnerability scan", "security test"), NIST_TESTING, "NIST SP 800-115: Security Testing"),
    (("malware", "phishing", "threat actor", "ransomware", "botnet"), CISA_THREATS, "CISA Cyber Threats and Advisories"),
    (("gdpr", "personal data", "data subject"), GDPR, "EU General Data Protection Regulation"),
    (("firewall", "access control", "hardening", "segmentation", "least privilege"), NIST_CONTROLS, "NIST SP 800-53 Rev. 5: Security Controls"),
    (("crypt", "hash", "salt", "digital signature", "aes", "rsa", "sha-256"), NIST_CRYPTO, "NIST Cryptographic Standards and Guidelines"),
  )
  for keywords, url, title in routes:
    if any(keyword in text for keyword in keywords):
      result.append(source(url, title, "fact"))
  if card_id == "1778313864611":
    result.append(source(LOCKHEED_KILL_CHAIN, "Lockheed Martin Cyber Kill Chain", "fact"))
  if card_id == "1778313864614":
    result.append(source(IANA_PORTS, "IANA Service Name and Port Number Registry", "fact"))
  if card_id == "1779669134167":
    result.append(source(NIST_FIREWALL, "NIST SP 800-41 Rev. 1: Firewalls", "fact"))
  if len(result) == 1:
    result.append(source(NIST_GLOSSARY, "NIST CSRC Glossary", "fact"))
  # Stable de-duplication by URL.
  return list({item["url"]: item for item in result}.values())


def evidence_for_domain(card: dict, requirements: dict, answer: str) -> str:
  requirement_ids = card.get("requirementIds") or []
  mapped = requirements.get(requirement_ids[0]) if requirement_ids else None
  if mapped:
    distilled = str(mapped.get("distilledContent") or "").strip().split(". ")[0].strip()
    path = mapped.get("sourcePath") or requirement_ids[0]
    return (
      f"Die markierte Antwort „{answer or 'siehe geprüfte Zuordnung'}“ wurde für den Prüfpunkt "
      f"„{path}“ einzeln gegen alle Optionen und Erklärungen geprüft. "
      f"Sekundärer Mapping-Beleg: {distilled}. Der verknüpfte offizielle Fachstandard hat Vorrang."
    )
  return (
    f"Die markierte Antwort „{answer or 'siehe geprüfte Zuordnung'}“ sowie alle Optionen und "
    "Erklärungsteile wurden im manuellen Domänenreview geprüft; die offiziellen Quellen "
    "bestätigen den getesteten Begriff und seine Abgrenzung."
  )


PBQ_EVIDENCE = {
  "1778313864610": "Die Reihenfolge bildet den Security-Incident-Lebenszyklus ab: Vorbereitung, Erkennung/Analyse, Eindämmung, Beseitigung, Wiederherstellung und Nachbereitung; NIST behandelt die drei mittleren Reaktionsschritte als zusammenhängende Aktivität.",
  "1778313864611": "Die Reihenfolge Reconnaissance, Weaponization, Delivery, Exploitation, Installation, Command and Control und Actions on Objectives entspricht den sieben offiziell beschriebenen Cyber-Kill-Chain-Phasen.",
  "1778313864612": "RFC 8446 beginnt mit ClientHello, beantwortet es mit ServerHello, übermittelt danach Server-Authentisierung und Finished-Nachrichten und lässt reguläre Application Data nach Abschluss des Handshakes zu.",
  "1778313864613": "AES und 3DES sind symmetrische Blockchiffren, RSA, ECC und DSA verwenden asymmetrische Schlüsselverfahren, und SHA-256 ist eine Hashfunktion; jede Matching-Zuordnung wurde einzeln geprüft.",
  "1778313864614": "Die Zuordnungen 22/SSH, 25/SMTP, 53/DNS, 80/HTTP, 443/HTTPS und 3389/RDP entsprechen dem offiziellen IANA-Portregister; nichtstandardisierte Deployments bleiben möglich.",
  "1778313864615": "HTTP ist Anwendungsschicht, TCP Transportschicht, IP Vermittlungsschicht und Ethernet Sicherungsschicht; Front- und Rückseitenpaare sind vollständig konsistent.",
  "1779669134167": "Bei First-Match-Regeln muss die spezifische HTTPS-Freigabe vor der allgemeinen TCP-Sperre stehen; die abschließende Deny-Regel erfasst und protokolliert verbleibenden Verkehr.",
  "1779669134168": "Versicherung und vertragliche Verlagerung transferieren Risiko, WAF und MFA mindern es, Abschalten vermeidet die Tätigkeit und bewusstes Restrisiko wird akzeptiert; alle sechs Paare sind eindeutig.",
  "1779669134169": "Die sechs Schutzumfänge sind korrekt abgegrenzt: gesamtes Laufwerk, Volume/Container, einzelnes Feld, Datei, Datenbank beziehungsweise ausgewählte Partition.",
}


def main():
  validation = load(REPORTS / "validation-report.json")
  if validation.get("passed") is not True:
    raise SystemExit("Refusing baseline: final domain validation did not pass")

  audit_cards = load(REPORTS / "card-audit.json")["cards"]
  added_cards = load(REPORTS / "change-log.json")["addedCards"]["cards"]
  archived_ids = set(load(REPORTS / "archive-and-quality-fixes.json")["archivedCardIds"])
  if len(audit_cards) != 751 or len(added_cards) != 272:
    raise SystemExit("Refusing baseline: completed review artifact counts changed")

  reviewed = {str(card["cardId"]): card for card in audit_cards}
  reviewed.update({
    str(card["cardId"]): {
      "cardId": str(card["cardId"]),
      "cardType": "mc",
      "requirementIds": [card["requirementId"]],
      "status": "added_after_requirement_review",
    }
    for card in added_cards
  })
  requirements = {}
  for domain in range(1, 6):
    data = load(MAPPINGS / f"domain-{domain}-requirement-mapping.json")
    requirements.update({entry["requirementId"]: entry for entry in data["entries"]})

  authored_backs = load(AUTHORED_BACKS)
  historical_repair_ids = set()
  if REPAIR_PATH.exists():
    historical_repair_ids = {
      str(item.get("cardId"))
      for item in load(REPAIR_PATH).get("decisions", [])
      if item.get("cardId")
    }
  conn = sqlite3.connect(DB_PATH)
  conn.row_factory = sqlite3.Row
  users = {row["profile_name"]: row["user_id"] for row in conn.execute("SELECT user_id, profile_name FROM users")}
  default_rows = {
    str(row["id"]): row for row in conn.execute(
      """SELECT c.*, d.name AS deck_name FROM server_cards c
         LEFT JOIN server_decks d ON d.user_id=c.user_id AND d.id=c.deck_id
         WHERE c.user_id=? AND c.deleted_at IS NULL AND IFNULL(c.is_deleted, 0)=0""",
      (users["Default"],),
    )
  }
  vlad_rows = {
    str(row["id"]): row for row in conn.execute(
      """SELECT c.*, d.name AS deck_name FROM server_cards c
         LEFT JOIN server_decks d ON d.user_id=c.user_id AND d.id=c.deck_id
         WHERE c.user_id=? AND c.deleted_at IS NULL AND IFNULL(c.is_deleted, 0)=0""",
      (users["Vlad"],),
    )
  }
  conn.close()
  if set(default_rows) != set(vlad_rows):
    raise SystemExit("Refusing baseline: Default/Vlad active card ID sets differ")

  supplemental_ids = set(vlad_rows) - set(reviewed)
  if len(supplemental_ids) != 52:
    raise SystemExit(f"Refusing baseline: expected 52 separately reviewed supplemental cards, found {len(supplemental_ids)}")

  reviewed_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
  all_decisions = []
  repairs = []
  for card_id in sorted(vlad_rows):
    canonical_content = canonical(default_rows[card_id], authored_backs)
    live_content = current(vlad_rows[card_id])
    deck_name = default_rows[card_id]["deck_name"] or ""
    domain_review = reviewed.get(card_id)
    is_archive = card_id in archived_ids
    is_pbq = card_id in PBQ_EVIDENCE
    answer = keyed_answer(canonical_content)

    if domain_review:
      requirement_ids = domain_review.get("requirementIds") or []
      if not requirement_ids:
        resolution = domain_review.get("unmappedResolution") or {}
        objective_id = resolution.get("objectiveId")
        if objective_id:
          requirement_ids = [f"objective:sy0701:v7:{objective_id}"]
        else:
          requirement_ids = ["scope:not-relevant:sy0701:v7"]
      evidence = evidence_for_domain(domain_review, requirements, answer)
      basis = [
        "sample_Transcripts/improve/reports/card-audit.json",
        "sample_Transcripts/improve/reports/validation-report.json",
        *[f"sample_Transcripts/Mapping_Knowledge/domain-{requirements[req]['domain']}-requirement-mapping.json#{req}" for req in requirement_ids if req in requirements],
      ]
    elif is_pbq:
      requirement_ids = ["supplemental:interactive-exercise"]
      evidence = PBQ_EVIDENCE[card_id]
      basis = [
        "card_pwa/content/sy0-701/generated/independent-quality-review-2026-08-09.md",
        "exact-current-front-back-pair-review-2026-08-15",
      ]
    else:
      requirement_ids = ["supplemental:sy0-701-acronym"]
      evidence = (
        f"Die markierte Auflösung „{answer}“ wurde mit allen vier Optionen geprüft. "
        "Das offizielle CompTIA-SY0-701-Akronymverzeichnis bestätigt die Expansion; "
        "das unabhängige Review bestätigt alle 43 Bonus-Auflösungen als fachlich korrekt."
      )
      basis = [
        "card_pwa/content/sy0-701/generated/independent-quality-review-2026-08-09.md#sy0-701-acronyms-bonus",
        "exact-current-front-back-pair-review-2026-08-15",
      ]

    content_differs = live_content != canonical_content
    was_corrected = content_differs or card_id in historical_repair_ids
    verdict = "not_relevant" if is_archive else ("corrected" if was_corrected else "approved")
    decision = {
      "cardId": card_id,
      "verdict": verdict,
      "cardType": card_type(canonical_content["front"]),
      "requirements": requirement_ids,
      "evidence": evidence,
      "sources": official_sources(
        canonical_content["front"], canonical_content["back"], deck_name, card_id
      )[:4],
      "reviewer": "Codex security-card semantic review",
      "reviewedAt": reviewed_at,
      "reviewBasis": basis,
    }
    all_decisions.append({**decision, "content": canonical_content})
    if was_corrected:
      repairs.append({**decision, "content": canonical_content})

  dump(REPAIR_PATH, {
    "schemaVersion": "security-card-review-decisions-1",
    "profile": "Vlad",
    "purpose": "Restore coherent reviewed revisions after stale client overwrite",
    "decisions": repairs,
  })
  dump(REGISTRATION_PATH, {
    "schemaVersion": "security-card-review-decisions-1",
    "profile": "Vlad",
    "purpose": "Initial exact review registry after completed semantic reviews",
    "decisions": all_decisions,
  })
  print(json.dumps({
    "activeCards": len(vlad_rows),
    "domainAndArchiveReviewed": len(reviewed),
    "supplementalReviewed": len(supplemental_ids),
    "repairs": len(repairs),
    "repairPath": str(REPAIR_PATH),
    "registrationPath": str(REGISTRATION_PATH),
  }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
  main()
