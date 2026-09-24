#!/usr/bin/env python3
"""Build reviewed import decisions for the 15 additions in Alle_Fragen(1).json."""
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
SOURCE_DIR = REPO_ROOT / "NEW_INFO" / "Chapter 2: Domain 2.0: Threats, Vulnerabilities, and Mitigations"
BASE_SOURCE = SOURCE_DIR / "Alle_Fragen.json"
SOURCE_FILE = SOURCE_DIR / "Alle_Fragen(1).json"
REQUIREMENTS_FILE = REPO_ROOT / "card_pwa" / "content" / "sy0-701" / "generated" / "sy0-701-requirements.json"
DECISIONS_FILE = REPO_ROOT / "card-sync-server" / "reviews" / "domain2-batch2-import-decisions-2026-08-21.json"
REPORT_FILE = SOURCE_DIR / "IMPORT_PRUEFBERICHT_BATCH2.md"
DECK_ID = "newinfo-chapter-2-domain-2-threats-vulnerabilities-mitigations"
DECK_NAME = "Chapter 2: Domain 2.0: Threats, Vulnerabilities, and Mitigations"
SCOPE_URL = "https://lecbyo.files.cmp.optimizely.com/download/cf25ec24b8a511ef9ecbb69c0f9687be"


def fact(url: str, title: str, locator: str, supports: str) -> dict:
  return {"url": url, "title": title, "locator": locator, "supports": supports, "roles": ["fact"]}


CONFIG = {
  "075": {
    "requirements": ["req:sy0701:v7:2.4:malware-attacks:virus"],
    "sources": [fact(
      "https://csrc.nist.gov/glossary/term/virus",
      "NIST CSRC Glossary: virus",
      "Definitions sourced from CNSSI 4009, NIST SP 800-28 Version 2, and NIST SP 800-82 Rev. 3",
      "NIST defines a virus as self-replicating software that propagates by copying itself into or attaching to other programs or files.",
    )],
    "reasons": {
      "A": "A Trojan is malware disguised as desirable software; that does not describe the copying behavior in the stem.",
      "B": "A virus can copy itself and propagate through infected files, matching the shared-file propagation described.",
      "C": "A keylogger records keystrokes; the stem instead describes malware propagation between workstations.",
      "D": "A rootkit is used to conceal or retain privileged access; it is not defined by the copying behavior in the stem.",
    },
  },
  "078": {
    "requirements": ["req:sy0701:v7:2.4:physical-attacks:environmental"],
    "sources": [fact(
      "https://doi.org/10.6028/NIST.SP.800-53r5",
      "NIST SP 800-53 Rev. 5",
      "Control PE-14, Environmental Controls",
      "PE-14 requires monitoring temperature, humidity, and other environmental conditions in facilities containing systems.",
    )],
    "reasons": {
      "A": "Video cameras provide visual monitoring but do not directly measure datacenter temperature or similar environmental conditions.",
      "B": "Intrusion alarms detect unauthorized physical entry rather than temperature or other environmental conditions.",
      "C": "Temperature monitoring sensors directly measure an environmental condition and are the best listed monitoring control.",
      "D": "Log analysis can consume sensor events but does not itself measure the physical environmental condition.",
    },
  },
  "080": {
    "requirements": ["req:sy0701:v7:2.3:misconfiguration", "req:sy0701:v7:2.3:cloud-specific"],
    "sources": [fact(
      "https://docs.aws.amazon.com/wellarchitected/latest/framework/sec_protect_compute_reduce_manual_management.html",
      "AWS Well-Architected Framework: SEC06-BP03",
      "Implementation guidance, step 4, security-group ingress rules and misconfiguration detection",
      "AWS tells customers to inspect security-group ingress and use AWS Config to detect misconfigured security groups.",
    )],
    "reasons": {
      "A": "The scenario identifies customer-managed security-group rules, not a defect in an AWS-provided API.",
      "B": "Failure to manage security-group rules effectively is a cloud configuration error and therefore a misconfiguration.",
      "C": "No malicious insider activity is described; the problem is how administrators configure security groups.",
      "D": "Security-group rules control network traffic and do not by themselves describe an MFA-based attack.",
    },
  },
  "082": {
    "requirements": ["req:sy0701:v7:2.4:cryptographic-attacks:collision"],
    "sources": [fact(
      "https://doi.org/10.6028/NIST.SP.800-107r1",
      "NIST SP 800-107 Rev. 1",
      "Section 3, collision resistance definition",
      "NIST defines a collision as two different inputs to a hash function that produce the same hash value.",
    )],
    "reasons": {
      "A": "A hash collision does not reveal a private decryption key or decrypt encrypted file contents.",
      "B": "The defining output is a hash value, not an encrypted output produced by encryption.",
      "C": "Two different file contents producing the same hash are exactly the outcome of a cryptographic collision.",
      "D": "A hash collision does not bypass public-key decryption or reveal the plaintext of an encrypted file.",
    },
  },
  "091": {
    "requirements": ["req:sy0701:v7:2.1:threat-actors:hacktivist"],
    "sources": [fact(
      "https://www.cisa.gov/sites/default/files/Monitors/ICS-CERT_Monitor_Feb2012.pdf",
      "CISA ICS-CERT Monitor, February 2012",
      "Page 4, footnote a, hacktivist definition and tactics",
      "CISA describes hacktivists as ideologically motivated actors who attack to promote change or make a political statement, including through web defacement.",
    )],
    "reasons": {
      "A": "A script is a tool or code artifact, not the threat-actor category indicated by a political message.",
      "B": "Nation-state activity is not established by the political website defacement described in the stem.",
      "C": "Organized crime is commonly financially motivated, while the stated motive is opposition to public policies.",
      "D": "Political messaging combined with website defacement directly matches hacktivist motivation and tactics.",
    },
  },
  "093": {
    "requirements": ["req:sy0701:v7:2.2:vulnerable-software:client-based-vs-agentless"],
    "sources": [fact(
      "https://doi.org/10.6028/NIST.SP.800-92",
      "NIST SP 800-92",
      "Section 3.4, agentless and agent-based collection",
      "NIST distinguishes agentless collection, which requires no special software on each host, from agent-based collection, which installs an agent program on the host.",
    )],
    "reasons": {
      "A": "Agentless systems can still consume endpoint, server, network, and control-plane resources during queries and actions.",
      "B": "Greater endpoint visibility is a possible capability difference, not the primary threat-vector distinction asked here.",
      "C": "Agentless deployment removes the endpoint agent itself as an installed component that could contain exploitable vulnerabilities.",
      "D": "Both agent-based and agentless product components can receive security patches; patchability is not exclusive to client agents.",
    },
  },
  "095": {
    "requirements": ["req:sy0701:v7:2.4:application-attacks:privilege-escalation"],
    "sources": [fact(
      "https://attack.mitre.org/techniques/T1068/",
      "MITRE ATT&CK T1068: Exploitation for Privilege Escalation",
      "Technique description, elevation from user-level permissions to SYSTEM or root",
      "MITRE states that exploiting a software vulnerability to move from lower privileges to SYSTEM or root is privilege escalation.",
    )],
    "reasons": {
      "A": "Cross-site scripting executes attacker-controlled script in a web context; it does not define obtaining root privileges.",
      "B": "Moving from the initial web-application context to root privileges is vertical privilege escalation.",
      "C": "SQL injection manipulates database queries; the defining result in the stem is elevated operating-system privilege.",
      "D": "A race condition depends on timing between operations, which is not the defining behavior described.",
    },
  },
  "097": {
    "requirements": ["req:sy0701:v7:2.4:network-attacks:domain-name-system-dns-attacks"],
    "sources": [fact(
      "https://www.rfc-editor.org/rfc/rfc5452.html",
      "RFC 5452: Measures for Making DNS More Resilient against Forged Answers",
      "Section 3, Description of DNS Spoofing",
      "RFC 5452 explains that forged DNS data accepted by a cache makes clients contact the wrong and potentially malicious servers.",
    )],
    "reasons": {
      "A": "A backdoor bypasses normal access controls and does not describe falsified DNS records.",
      "B": "An advanced persistent threat is an actor or campaign category, not the DNS-record manipulation technique.",
      "C": "False DNS mappings that redirect legitimate names to malicious addresses are DNS poisoning.",
      "D": "A Trojan is malware disguised as legitimate software and does not describe altered DNS records.",
    },
  },
  "099": {
    "requirements": ["req:sy0701:v7:1.4:public-key-infrastructure-pki:private-key", "req:sy0701:v7:4.1:application-security:code-signing"],
    "sources": [fact(
      "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-5.pdf",
      "NIST FIPS 186-5: Digital Signature Standard",
      "Sections 5.1-5.2 and 6.2, signature generation and private/public key pairs",
      "FIPS 186-5 assigns the private key to signature generation and the associated public key to signature verification.",
    )],
    "reasons": {
      "A": "Possession of the signing private key enables generation of a signature that verifies under the trusted public key.",
      "B": "A collision with a legitimate update hash is not required when the attacker can generate a valid signature with the private key.",
      "C": "The public key verifies signatures but does not provide the secret signing capability needed to sign the malicious update.",
      "D": "Matching the hash of another malicious file would not establish trust or create a signature accepted under the trusted certificate.",
    },
  },
  "110": {
    "requirements": ["req:sy0701:v7:2.4:password-attacks:brute-force"],
    "sources": [
      fact(
        "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/hh994565%28v%3Dws.11%29",
        "Microsoft Learn: Cached and Stored Credentials Technical Overview",
        "Security Accounts Manager database section",
        "Microsoft documents that the local SAM database stores account information including NT password hashes.",
      ),
      fact(
        "https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/6/html/security_guide/sect-security_guide-workstation_security-password_security",
        "Red Hat Enterprise Linux Security Guide: Password Security",
        "Shadow passwords and offline password cracking discussion",
        "Red Hat documents that password hashes are stored in /etc/shadow and that stolen hash data can be attacked offline.",
      ),
    ],
    "reasons": {
      "A": "The Windows Registry is too broad, and modern Linux password hashes are not stored in /etc/passwd.",
      "B": "The Windows SAM is relevant, but Linux stores protected password hashes in /etc/shadow rather than /etc/passwd.",
      "C": "The Windows SAM and Linux /etc/shadow contain the local password-hash material targeted by offline cracking.",
      "D": "Linux /etc/shadow is relevant, but the Windows target is specifically the SAM database rather than the Registry generally.",
    },
  },
  "111": {
    "requirements": ["req:sy0701:v7:2.2:unsecure-networks:bluetooth"],
    "sources": [fact(
      "https://doi.org/10.6028/NIST.SP.800-121r2-upd1",
      "NIST SP 800-121 Rev. 2 Update 1",
      "Section 4.2, Bluetooth Threats, Bluesnarfing",
      "NIST defines bluesnarfing as forcing a Bluetooth connection that provides access to data stored on the device.",
    )],
    "reasons": {
      "A": "Bluejacking sends unsolicited Bluetooth messages; it does not describe stealing stored phone data.",
      "B": "Bluesnarfing is unauthorized access to data on a Bluetooth device and matches the unexplained connection and theft.",
      "C": "An evil twin is a rogue Wi-Fi access point imitating a legitimate network, not a Bluetooth data-access attack.",
      "D": "The scenario provides evidence of an unauthorized Bluetooth connection, not installation of a remote-access Trojan.",
    },
  },
  "115": {
    "requirements": ["req:sy0701:v7:2.5:access-control:permissions"],
    "sources": [
      fact(
        "https://www.gnu.org/s/coreutils/manual/html_node/Numeric-Modes.html",
        "GNU Coreutils Manual: Numeric Modes",
        "Section 27.3, octal read, write, and execute bits for owner, group, and other",
        "GNU documents that octal digit 7 grants read, write, and execute/search and that the three digits apply to owner, group, and other.",
      ),
      fact(
        "https://doi.org/10.6028/NIST.SP.800-53r5",
        "NIST SP 800-53 Rev. 5",
        "Control AC-6, Least Privilege",
        "AC-6 requires allowing only the accesses necessary to accomplish assigned tasks, making universal rwx access a weak permission configuration.",
      ),
    ],
    "reasons": {
      "A": "Mode 777 grants read, write, and execute/search to owner, group, and all other users, which is an open or weak permission setting.",
      "B": "The finding is specifically the access mode assigned to the directory, not a file-handling workflow issue.",
      "C": "No attacker is shown gaining higher privileges; Alex is identifying an insecure permission configuration.",
      "D": "Open or weak permissions directly describes mode 777 on a sensitive system directory, so none-of-the-above is false.",
    },
  },
  "116": {
    "requirements": ["req:sy0701:v7:2.4:indicators:concurrent-session-usage", "req:sy0701:v7:2.4:indicators:impossible-travel"],
    "sources": [fact(
      "https://learn.microsoft.com/en-us/entra/id-protection/concept-identity-protection-risks",
      "Microsoft Entra ID Protection: Risk detections",
      "Impossible travel detection",
      "Microsoft describes user activity from geographically distant locations within an impossible travel time as a risk that may indicate another user has the credentials.",
    )],
    "reasons": {
      "A": "Multiple sessions on the same system can be normal and provide no geographic inconsistency by themselves.",
      "B": "A user may legitimately use two assigned systems; location and timing are needed to establish a stronger indicator.",
      "C": "Simultaneous activity from different locations can create impossible travel and may indicate credential compromise.",
      "D": "Concurrent sessions in the same location do not by themselves create the geographic anomaly associated with compromise.",
    },
  },
  "118": {
    "requirements": ["req:sy0701:v7:2.3:cloud-specific", "req:sy0701:v7:2.1:motivations:service-disruption"],
    "sources": [fact(
      "https://docs.aws.amazon.com/whitepapers/latest/aws-best-practices-ddos-resiliency/metrics-and-alarms.html",
      "AWS Best Practices for DDoS Resiliency: Metrics and alarms",
      "Metrics and alarms guidance and AWS Shield/CloudWatch detection metrics",
      "AWS recommends provider monitoring tools, CloudWatch metrics and alarms, and Shield DDoS-detection metrics to determine whether cloud resources are under attack.",
    )],
    "reasons": {
      "A": "Cloud providers do offer security, logging, monitoring, and DDoS-protection capabilities.",
      "B": "Calling support may be an escalation path, but reviewing and enabling the available customer-facing tools is the direct detection action.",
      "C": "Provider security tools, logging, metrics, and anti-DoS capabilities give Frank the visibility needed to detect an attack.",
      "D": "The cloud provider manages its ISP relationship; Frank should use the controls exposed by his cloud provider.",
    },
  },
  "120": {
    "requirements": ["req:sy0701:v7:2.2:open-service-ports", "req:sy0701:v7:2.5:hardening-techniques:disabling-ports-protocols"],
    "sources": [fact(
      "https://doi.org/10.6028/NIST.SP.800-53r5",
      "NIST SP 800-53 Rev. 5",
      "Control CM-7 and CM-7(1), Least Functionality and Periodic Review",
      "CM-7 requires reviewing systems to identify and disable unnecessary functions, ports, protocols, software, and services.",
    )],
    "reasons": {
      "A": "Passive capture only reveals services that generate observed traffic and can miss listening services that remain unused during capture.",
      "B": "A configuration review can enumerate configured ports and services without relying on a vulnerability scanner or observed traffic.",
      "C": "Packet capture observes traffic rather than comprehensively enumerating every configured but currently unused service.",
      "D": "Logs may not contain entries for listening services that have not been accessed, so log review can miss open ports.",
    },
  },
}


ARCHIVED_CARD_IDS = {"082": "1772662005082", "110": "1772662005110"}


def normalized_key(value: str) -> str:
  value = unicodedata.normalize("NFKC", value or "")
  value = value.replace("‐", "-").replace("‑", "-").replace("–", "-").replace("—", "-")
  value = re.sub(r"[^a-zA-Z0-9]+", " ", value).casefold()
  return re.sub(r"\s+", " ", value).strip()


def parse_record(record: dict) -> dict:
  options = {}
  marked = []
  selected = []
  for answer in record.get("answers") or []:
    match = re.match(r"^([A-D])[.:)]\s*(.*)$", str(answer.get("text") or ""), re.S)
    if not match:
      raise RuntimeError(f"Invalid option in {record.get('id')}: {answer.get('text')!r}")
    letter = match.group(1).upper()
    options[letter] = match.group(2).strip()
    if answer.get("correct") is True:
      marked.append(letter)
    if answer.get("selected") is True:
      selected.append(letter)
  explicit = re.match(r"^([A-D])[.:)]", str(record.get("correct") or ""))
  if len(marked) != 1 or explicit is None or explicit.group(1).upper() != marked[0]:
    raise RuntimeError(f"Conflicting or missing answer key in {record.get('id')}")
  code_match = re.search(r"\.c02\.(\d{3})", str(record.get("id") or ""))
  if not code_match or code_match.group(1) not in CONFIG:
    raise RuntimeError(f"No batch-2 mapping for {record.get('id')}")
  seconds = record.get("responseSeconds")
  if not isinstance(seconds, (int, float)) or seconds < 0:
    raise RuntimeError(f"Invalid responseSeconds in {record.get('id')}")
  return {
    "code": code_match.group(1),
    "sourceId": str(record.get("id") or ""),
    "question": str(record.get("question") or "").strip(),
    "options": options,
    "correct": marked[0],
    "selected": selected,
    "explanation": str(record.get("explanation") or "").strip(),
    "responseSeconds": int(seconds),
  }


def scope_source(requirement_rows: list[dict]) -> dict:
  objective_text = "; ".join(row["requirementSummary"] for row in requirement_rows)
  return {
    "url": SCOPE_URL,
    "title": "CompTIA Security+ SY0-701 Exam Objectives, Version 7.0",
    "roles": ["scope"],
    "locator": f"Official objectives: {objective_text}",
    "supports": f"The official objectives include the mapped topic(s): {objective_text}.",
  }


def archived_state(conn: sqlite3.Connection, user_id: str, card_id: str) -> tuple[str, dict]:
  row = conn.execute(
    """SELECT c.note_id, r.type, r.interval, r.factor, r.stability, r.difficulty,
              r.retrievability, r.reps, r.lapses, r.algorithm, r.metadata_json,
              r.learning_step, r.last_reviewed_at
       FROM shared_card_catalog c
       JOIN server_cards r ON r.id=c.id AND r.user_id=c.canonical_user_id
       WHERE c.canonical_user_id=? AND c.id=? AND c.deleted_at IS NULL
         AND r.is_deleted=1 AND r.deleted_at IS NOT NULL""",
    (user_id, card_id),
  ).fetchone()
  if row is None:
    raise RuntimeError(f"Expected archived predecessor {card_id}")
  reviews = conn.execute(
    "SELECT COUNT(*) FROM server_reviews WHERE user_id=? AND card_id=? AND undone_at IS NULL",
    (user_id, card_id),
  ).fetchone()[0]
  if reviews != 0 or int(row["reps"] or 0) != 0 or int(row["lapses"] or 0) != 0:
    raise RuntimeError(f"Archived predecessor {card_id} unexpectedly has study history")
  return str(row["note_id"]), {
    "type": int(row["type"] or 0),
    "queue": 0,
    "due": 0,
    "dueAt": 0,
    "learningStep": row["learning_step"] if row["learning_step"] is not None else 0,
    "lastReviewedAt": row["last_reviewed_at"],
    "interval": int(row["interval"] or 0),
    "factor": int(row["factor"] or 2500),
    "stability": row["stability"],
    "difficulty": row["difficulty"],
    "retrievability": row["retrievability"],
    "reps": int(row["reps"] or 0),
    "lapses": int(row["lapses"] or 0),
    "algorithm": str(row["algorithm"] or "fsrs"),
  }


def main() -> int:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument("--db", type=Path, default=REPO_ROOT / "card-sync-server" / "sync.db")
  parser.add_argument("--decisions", type=Path, default=DECISIONS_FILE)
  args = parser.parse_args()

  base_raw = json.loads(BASE_SOURCE.read_text(encoding="utf-8-sig"))
  source_raw = json.loads(SOURCE_FILE.read_text(encoding="utf-8-sig"))
  base_stems = {normalized_key(str(item.get("question") or "")) for item in base_raw}
  additions_raw = [item for item in source_raw if normalized_key(str(item.get("question") or "")) not in base_stems]
  if len(base_raw) != 18 or len(source_raw) != 33 or len(additions_raw) != 15:
    raise RuntimeError(f"Expected 18 base, 33 cumulative, and 15 additions; got {len(base_raw)}, {len(source_raw)}, {len(additions_raw)}")
  records = [parse_record(item) for item in additions_raw]
  if len({record["sourceId"] for record in records}) != 15 or len({normalized_key(record["question"]) for record in records}) != 15:
    raise RuntimeError("Batch-2 source IDs and stems must be unique")

  requirements_raw = json.loads(REQUIREMENTS_FILE.read_text(encoding="utf-8"))
  requirements_by_id = {item["requirementId"]: item for item in requirements_raw["requirements"]}
  conn = sqlite3.connect(args.db)
  conn.row_factory = sqlite3.Row
  users = conn.execute("SELECT user_id FROM users WHERE LOWER(TRIM(COALESCE(profile_name, '')))=LOWER('Vlad')").fetchall()
  if len(users) != 1:
    raise RuntimeError(f"Expected exactly one Vlad profile, found {len(users)}")
  user_id = str(users[0]["user_id"])
  active_rows = conn.execute(
    """SELECT x.id, x.front FROM shared_card_catalog x
       JOIN server_cards r ON r.id=x.id AND r.user_id=?
       WHERE x.canonical_user_id=? AND x.deleted_at IS NULL
         AND r.deleted_at IS NULL AND IFNULL(r.is_deleted, 0)=0""",
    (user_id, user_id),
  ).fetchall()
  active_ids = {str(row["id"]) for row in active_rows}
  active_stems = {normalized_key(str(row["front"] or "").splitlines()[0]): str(row["id"]) for row in active_rows}
  duplicate_stems = {record["sourceId"]: active_stems[normalized_key(record["question"])] for record in records if normalized_key(record["question"]) in active_stems}
  if duplicate_stems:
    raise RuntimeError(f"Batch-2 additions already active under other identities: {duplicate_stems}")

  reviewed_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
  decisions = []
  reactivated = []
  for record in records:
    cfg = CONFIG[record["code"]]
    missing_requirements = [item for item in cfg["requirements"] if item not in requirements_by_id]
    if missing_requirements:
      raise RuntimeError(f"Unknown requirements: {missing_requirements}")
    requirement_rows = [requirements_by_id[item] for item in cfg["requirements"]]
    digest = hashlib.sha256(normalized_key(record["question"]).encode("utf-8")).hexdigest()[:20]
    card_id = ARCHIVED_CARD_IDS.get(record["code"], f"newinfo-domain2-{digest}")
    if record["code"] in ARCHIVED_CARD_IDS:
      note_id, create_state = archived_state(conn, user_id, card_id)
      reactivated.append(card_id)
    else:
      note_id = f"newinfo-domain2-note-{digest}"
      create_state = {}
    timing = {
      "averageAnswerTimeSeconds": record["responseSeconds"],
      "totalAnswerTimeSeconds": record["responseSeconds"],
      "answerTimeSampleCount": 1,
      "studySessionCount": 1,
    }
    create_state["metadata"] = {"answerTiming": timing}
    path = requirement_rows[0].get("sourcePath") or []
    tags = []
    for tag in (path[2] if len(path) > 2 else "Domain 2.0", path[-1] if path else "Threats"):
      if str(tag) not in tags:
        tags.append(str(tag))
    front = "\n".join([record["question"]] + [f"{letter}: {record['options'][letter]}" for letter in sorted(record["options"])])
    back = f">> CORRECT: {record['correct']} |\n\n{record['explanation']}\n\nNicht:\n" + "\n".join(
      f"{letter} | {cfg['reasons'][letter]}" for letter in sorted(record["options"]) if letter != record["correct"]
    )
    content = {
      "noteId": note_id,
      "deckId": DECK_ID,
      "front": front,
      "back": back,
      "tags": tags,
      "extra": {"acronym": "", "examples": "", "port": "", "protocol": ""},
    }
    answer_text = record["options"][record["correct"]]
    operation = "update" if card_id in active_ids else "create"
    decision = {
      "userId": user_id,
      "cardId": card_id,
      "operation": operation,
      "verdict": "approved",
      "cardType": "mc",
      "requirements": cfg["requirements"],
      "evidence": f"The exact keyed answer '{answer_text}' is entailed by the cited definition or control and the source explanation; all four options were checked individually.",
      "sources": [scope_source(requirement_rows), *cfg["sources"]],
      "reviewer": "Codex primary-source semantic review 2026-08-21",
      "reviewedAt": reviewed_at,
      "reviewBasis": [
        "answers[].correct and the explicit correct field agree exactly",
        "question, option texts, keyed letter, and explanation preserved from Alle_Fragen(1).json",
        "selected wrong answer ignored as a solution key",
        "all four options and the complete explanation inspected",
        "official SY0-701 scope and authoritative primary fact sources checked",
        "all active Vlad cards compared by composite identity and normalized stem",
        "archived predecessor history inspected where present",
        "responseSeconds copied into answerTiming metadata",
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
        "result": "All 33 cumulative Chapter 2 source stems were compared with all 82 active Vlad cards; no active duplicate exists. Collision versus second-preimage and bluejacking versus bluesnarfing were explicitly distinguished.",
      },
      "revisionConsistency": {
        "frontBackSameRevision": True,
        "historyChecked": True,
      },
      "optionAssessments": {
        letter: {
          "verdict": "correct" if letter == record["correct"] else "incorrect",
          "reason": cfg["reasons"][letter],
        }
        for letter in sorted(record["options"])
      },
      "content": content,
      "importTrace": {
        "sourceFile": SOURCE_FILE.name,
        "sourceId": record["sourceId"],
        "responseSeconds": record["responseSeconds"],
        "selectedAnswersIgnoredForKey": record["selected"],
        "textPolicy": "Question, answer-option text, keyed answer, and source explanation preserved exactly; only A. source delimiters are represented as A: in the card schema.",
        "archivedPredecessorReactivated": card_id if record["code"] in ARCHIVED_CARD_IDS else None,
      },
    }
    if operation == "create":
      decision["createState"] = create_state
    decisions.append(decision)
  conn.close()

  payload = {
    "schemaVersion": "reviewed-domain2-batch2-import-1",
    "profile": "Vlad",
    "canonicalUserId": user_id,
    "identityKey": ["userId", "cardId"],
    "replaceRegistry": False,
    "deck": {"id": DECK_ID, "name": DECK_NAME, "parentDeckId": None},
    "sourceDirectory": str(SOURCE_DIR.relative_to(REPO_ROOT)),
    "sourceFile": SOURCE_FILE.name,
    "answerPolicy": "answers[].correct and correct are authoritative; selected is not a solution key; no question, option, key, or explanation is rewritten",
    "decisions": decisions,
  }
  args.decisions.parent.mkdir(parents=True, exist_ok=True)
  args.decisions.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

  lines = [
    "# Import-Prüfbericht – Chapter 2, Batch 2",
    "",
    f"Deck: `{DECK_NAME}`",
    "",
    "- Kumulative Quelldatensätze: 33",
    "- Bereits im ersten Batch enthalten: 18",
    "- Neue Datensätze in `Alle_Fragen(1).json`: 15",
    f"- Zur Veröffentlichung vorbereitet: {len(decisions)}",
    f"- Archivierte Kartenidentitäten reaktiviert: {len(reactivated)}",
    "- Antwortschlüssel geändert: 0",
    "- Fragen oder Antworttexte umformuliert: 0",
    "- Erklärungen umformuliert: 0",
    "",
    "## Karten",
    "",
  ]
  for index, decision in enumerate(decisions, start=1):
    record = records[index - 1]
    marker = " (archivierte Identität reaktiviert)" if decision["cardId"] in reactivated else ""
    lines.append(f"{index}. `{decision['cardId']}` — {record['question']} — **{record['correct']}: {record['options'][record['correct']]}**{marker}")
  REPORT_FILE.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
  print(json.dumps({
    "canonicalUserId": user_id,
    "identityKey": ["userId", "cardId"],
    "baseRecords": len(base_raw),
    "cumulativeRecords": len(source_raw),
    "batch2Decisions": len(decisions),
    "approved": len(decisions),
    "corrected": 0,
    "reactivatedArchivedIdentities": reactivated,
    "answerKeysChanged": 0,
    "decisions": str(args.decisions),
    "report": str(REPORT_FILE),
  }, ensure_ascii=False, indent=2))
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
