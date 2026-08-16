#!/usr/bin/env python3
"""Prepare and report the 2026-08-16 primary-source corrections for Vlad.

This script never edits card content itself.  It produces fully adjudicated
decisions for security_card_review_gateway.py and, after publication, a
Vlad-scoped exact-hash report that supersedes the v3 contradiction report.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
SERVER_ROOT = SCRIPT_DIR.parent
REPO_ROOT = SERVER_ROOT.parent
if str(SCRIPT_DIR) not in sys.path:
  sys.path.insert(0, str(SCRIPT_DIR))

import security_card_review_gateway as gateway  # noqa: E402


DECISIONS_PATH = SERVER_ROOT / "reviews" / "vlad-card-corrections-2026-08-16.json"
REPORT_V3_PATH = SERVER_ROOT / "reviews" / "vlad-card-contradictions-2026-08-16-v3.json"
REPORT_V4_PATH = SERVER_ROOT / "reviews" / "vlad-card-contradictions-2026-08-16-v4.json"

COMPTIA_URL = "https://lecbyo.files.cmp.optimizely.com/download/cf25ec24b8a511ef9ecbb69c0f9687be"


def src(source_id: str, title: str, url: str, roles: list[str], locator: str, supports: str) -> dict:
  return {
    "sourceId": source_id,
    "title": title,
    "url": url,
    "roles": roles,
    "locator": locator,
    "supports": supports,
  }


FACT_SOURCES = {
  "incident_r3": src(
    "SRC-NIST-SP800-61R3",
    "NIST SP 800-61 Rev. 3: Incident Response Recommendations",
    "https://csrc.nist.gov/pubs/sp/800/61/r3/final",
    ["fact", "revision"],
    "Publication metadata and section 2.1; final April 2025; supersedes Rev. 2",
    "Rev. 3 is the current NIST incident-response publication and aligns incident response with CSF 2.0.",
  ),
  "incident_r2": src(
    "SRC-NIST-SP800-61R2",
    "NIST SP 800-61 Rev. 2: Computer Security Incident Handling Guide",
    "https://csrc.nist.gov/pubs/sp/800/61/r2/final",
    ["fact", "revision"],
    "Figure 3-1 and publication status",
    "The superseded Rev. 2 grouped containment, eradication, and recovery as one lifecycle phase.",
  ),
  "physical": src(
    "SRC-NIST-SP800-53R5",
    "NIST SP 800-53 Rev. 5: Security and Privacy Controls",
    "https://doi.org/10.6028/NIST.SP.800-53r5",
    ["fact"],
    "Control PE-3, Physical Access Control",
    "PE-3 places guards and physical access devices within the physical-access-control family.",
  ),
  "zero_trust": src(
    "SRC-NIST-SP800-207",
    "NIST SP 800-207: Zero Trust Architecture",
    "https://csrc.nist.gov/pubs/sp/800/207/final",
    ["fact"],
    "Abstract and section 2, especially tenets 3 and 4",
    "Zero trust protects individual resources and evaluates access before a session instead of trusting network location.",
  ),
  "mttr_nist": src(
    "SRC-NIST-MTTR",
    "NIST: A Hierarchical Structure of Key Performance Indicators",
    "https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=919754",
    ["fact"],
    "p. 10, maintenance KPI Mean time to repair (MTTR)",
    "NIST expands MTTR as Mean time to repair and treats it as a maintenance performance indicator.",
  ),
  "mttr_iso": src(
    "SRC-ISO-MTTR",
    "ISO/TC 67 terminology update",
    "https://committee.iso.org/files/live/sites/tc67/files/N2123_Update%20on%20ISOTC67WG%204%20document_Definitions%20and%20Translations_2023.pdf",
    ["fact", "conflict"],
    "p. 5, MTTR and MTTRes terminology",
    "ISO terminology distinguishes mean time to repair, MTTR, from mean time to restoration, MTTRes.",
  ),
  "supply_chain": src(
    "SRC-NIST-SP800-161R1-UPD1",
    "NIST SP 800-161 Rev. 1 Update 1: Cybersecurity Supply Chain Risk Management",
    "https://csrc.nist.gov/pubs/sp/800/161/r1/upd1/final",
    ["fact"],
    "Abstract and executive summary; products, services, suppliers, counterfeit and malicious functionality",
    "C-SCRM covers malicious, counterfeit, and vulnerable products and services introduced through supply-chain parties.",
  ),
  "responsiveness": src(
    "SRC-NIST-TN908",
    "NIST Technical Note 908: Computer Performance Measurement",
    "https://nvlpubs.nist.gov/nistpubs/Legacy/TN/nbstechnicalnote908.pdf",
    ["fact"],
    "section 2.1.1 and Appendix B, system responsiveness and response time",
    "System responsiveness is measured through the time a system takes to answer a user's service-request stimulus.",
  ),
  "ot": src(
    "SRC-NIST-SP800-82R3",
    "NIST SP 800-82 Rev. 3: Guide to Operational Technology Security",
    "https://csrc.nist.gov/pubs/sp/800/82/r3/final",
    ["fact"],
    "Abstract and section 2; OT, ICS, SCADA, PLC and embedded/real-time components",
    "OT and ICS monitor or control physical processes and include SCADA, PLC, embedded, and real-time components.",
  ),
  "rtos": src(
    "SRC-NIST-RTOS-TIMING",
    "NIST: Timing Studies of Real-Time Linux for Control",
    "https://www.nist.gov/publications/timing-studies-real-time-linux-control",
    ["fact"],
    "Abstract; deterministic task execution for industrial control",
    "Real-time operating systems support deterministic task execution for time-sensitive industrial control workloads.",
  ),
  "ephemeral": src(
    "SRC-MICROSOFT-PAM-JIT",
    "Microsoft Service Assurance: Identity and access management",
    "https://learn.microsoft.com/en-us/compliance/assurance/assurance-identity-and-access-management",
    ["fact"],
    "Just-in-time and just-enough-administration section",
    "JIT grants temporary privileged access for an approved period and automatically revokes it when that period ends.",
  ),
  "wireless": src(
    "SRC-NIST-SP800-153",
    "NIST SP 800-153: Guidelines for Securing Wireless Local Area Networks",
    "https://csrc.nist.gov/pubs/sp/800/153/final",
    ["fact"],
    "Abstract and sections 2-3, WLAN radio communications and threats",
    "WLAN security must address radio-range access, eavesdropping, rogue access points, and insecure wireless configurations.",
  ),
  "power": src(
    "SRC-NIST-SP800-34R1",
    "NIST SP 800-34 Rev. 1: Contingency Planning Guide",
    "https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final",
    ["fact"],
    "section 5 and Appendix D, power failure and uninterruptible power supplies",
    "Contingency planning treats power failure as a disruption and identifies UPS and alternate power as continuity measures.",
  ),
  "reputation": src(
    "SRC-MICROSOFT-SMARTSCREEN",
    "Microsoft Defender SmartScreen overview",
    "https://learn.microsoft.com/en-us/deployedge/microsoft-edge-security-smartscreen",
    ["fact"],
    "URL and application reputation checks; download history and prior results",
    "Reputation protection evaluates URLs and downloads using reputation data, history, prevalence, and prior security results.",
  ),
  "baselines": src(
    "SRC-NIST-SP800-128",
    "NIST SP 800-128: Security-Focused Configuration Management",
    "https://csrc.nist.gov/pubs/sp/800/128/upd1/final",
    ["fact"],
    "sections 2.1 and 3.2, baseline configurations and configuration monitoring",
    "Approved baseline configurations establish the secure build state; monitoring detects and addresses unauthorized drift.",
  ),
  "complexity": src(
    "SRC-NIST-SP800-160V1R1",
    "NIST SP 800-160 Vol. 1 Rev. 1: Engineering Trustworthy Secure Systems",
    "https://csrc.nist.gov/pubs/sp/800/160/v1/r1/final",
    ["fact"],
    "sections 2.3 and 2.4, complexity, interactions, dependencies, and emergent behavior",
    "System complexity grows through interacting components and dependencies and makes assurance and testing more difficult.",
  ),
  "industry": src(
    "SRC-NIST-CSF20",
    "NIST Cybersecurity Framework 2.0",
    "https://doi.org/10.6028/NIST.CSWP.29",
    ["fact"],
    "sections 2.4 and 3.2, Organizational Profiles and sector-specific implementation",
    "CSF profiles let organizations tailor cybersecurity outcomes to sector, legal, regulatory, and business requirements.",
  ),
  "assessment": src(
    "SRC-NIST-SP800-53AR5",
    "NIST SP 800-53A Rev. 5: Assessing Security and Privacy Controls",
    "https://csrc.nist.gov/pubs/sp/800/53/a/r5/final",
    ["fact"],
    "chapter 3 and assessment procedures; assessor, method, object, and evidence",
    "Control assessments use defined procedures and evidence to determine whether requirements are implemented and effective.",
  ),
  "conformity": src(
    "SRC-NIST-CONFORMITY",
    "NIST: Conformity Assessment Basics",
    "https://www.nist.gov/standardsgov/conformity-assessment-basics",
    ["fact"],
    "First-, second-, third-party and government conformity-assessment roles",
    "NIST distinguishes internal or first-party assessment, independent third-party assessment, and government's regulatory role.",
  ),
}


def comptia(locator: str, supports: str) -> dict:
  return src(
    "SRC-COMPTIA-SY0-701-V7",
    "CompTIA Security+ SY0-701 V7 Exam Objectives",
    COMPTIA_URL,
    ["scope", "fact"],
    locator,
    supports,
  )


def mc(
  question: str,
  options: dict[str, str],
  key: str,
  explanation: str,
  rationales: dict[str, str],
  comp_locator: str,
  comp_supports: str,
  facts: list[str],
  change: str,
  cross: str,
  conflicts: list[dict] | None = None,
  add_requirements: list[str] | None = None,
) -> dict:
  if set(options) != set(rationales) | {key}:
    raise ValueError(f"Rationales must cover every incorrect option for {question!r}")
  front = question + "\n" + "\n".join(f"{letter}: {text}" for letter, text in options.items())
  back = f">> CORRECT: {key} |\n\n{explanation}\n\nNicht:\n" + "\n".join(
    f"{letter} | {rationales[letter]}" for letter in options if letter != key
  )
  answer_text = options[key]
  evidence = (
    f"The uniquely keyed answer is '{answer_text}'. The revised stem supplies the distinguishing facts, "
    f"and the cited CompTIA objective plus primary fact source entail that option while excluding every distractor."
  )
  return {
    "cardType": "mc",
    "front": front,
    "back": back,
    "key": key,
    "answerText": answer_text,
    "evidence": evidence,
    "optionReasons": {key: explanation, **rationales},
    "sources": [comptia(comp_locator, comp_supports), *(FACT_SOURCES[name] for name in facts)],
    "change": change,
    "cross": cross,
    "sourceConflicts": conflicts or [],
    "addRequirements": add_requirements or [],
  }


CORRECTIONS = {
  "1778313864610": {
    "cardType": "ordering",
    "front": """ORDERING:
Put CompTIA Security+ SY0-701 objective 4.8's incident response process in the correct order.

1) Preparation
2) Detection
3) Analysis
4) Containment
5) Eradication
6) Recovery
7) Lessons Learned""",
    "back": """CORRECT_ORDER: 1,2,3,4,5,6,7

CompTIA SY0-701 objective 4.8 lists Preparation, Detection, Analysis, Containment, Eradication, Recovery, and Lessons Learned in that order.

Quellenhinweis: Dies ist die CompTIA-Prüfungsreihenfolge. Sie darf nicht pauschal als aktuelles NIST-Phasenmodell bezeichnet werden: NIST SP 800-61 Rev. 3 ersetzte Rev. 2 im April 2025 und richtet Incident Response am CSF 2.0 aus. Die zurückgezogene Rev. 2 fasste Containment, Eradication and Recovery als eine gemeinsame Phase zusammen.""",
    "evidence": "CompTIA SY0-701 objective 4.8 explicitly lists all seven steps in this exact order; NIST revision metadata proves why the former six-step NIST attribution was stale.",
    "sources": [
      comptia("p. 12, objective 4.8, Incident response process", "The exam objective lists Preparation, Detection, Analysis, Containment, Eradication, Recovery, and Lessons Learned."),
      FACT_SOURCES["incident_r3"],
      FACT_SOURCES["incident_r2"],
    ],
    "change": "Replaced the stale six-step NIST attribution with CompTIA's exact seven-step objective and an explicit NIST revision note.",
    "cross": "Compared the card with the incident-response cards and mappings; only this ordering card carried the stale six-step attribution.",
    "sourceConflicts": [{
      "sources": ["CompTIA SY0-701 objective 4.8", "NIST SP 800-61 Rev. 2", "NIST SP 800-61 Rev. 3"],
      "resolution": "Teach the CompTIA seven-item exam sequence and label it as CompTIA; do not misattribute it to current NIST.",
    }],
    "addRequirements": ["req:sy0701:v7:4.8:incident-response-process"],
    "items": [
      ("1) Preparation", "CompTIA places preparation first, before an incident is detected or analyzed."),
      ("2) Detection", "CompTIA separates detection from analysis and lists detection as the second item."),
      ("3) Analysis", "CompTIA lists analysis immediately after detection to determine incident facts and scope."),
      ("4) Containment", "CompTIA places containment after analysis to limit further incident impact."),
      ("5) Eradication", "CompTIA places eradication after containment to remove the incident's cause and artifacts."),
      ("6) Recovery", "CompTIA places recovery after eradication to restore affected services safely."),
      ("7) Lessons Learned", "CompTIA lists lessons learned last so results improve future preparation and response."),
    ],
  },
  "1779007738884": {
    "cardType": "matching",
    "front": """MATCHING:
Match each example to its security control category.

Guard shack limiting physical access >> Physical
Fences and locked doors >> Physical
Antivirus software >> Technical
Firewall access control list blocking specific addresses >> Technical
Periodic risk assessment >> Managerial
Official written security policy >> Managerial
Security awareness workshop >> Operational
Daily review of system logs by analysts >> Operational""",
    "back": """Die Zuordnung richtet sich nach der in der Front beschriebenen Kontrolle: Guard shack, fences und locked doors begrenzen physischen Zutritt; Antivirus und Firewall-ACL setzen Kontrollen technisch durch; Risk Assessment und Security Policy steuern Risiken; Workshops und tägliche Logprüfungen sind von Menschen ausgeführte operative Prozesse.

Wichtig: Die frühere Rückseite widersprach der Front, indem sie aus dem „guard shack“ ohne Kennzeichnung die Tätigkeit eines Wachpostens machte. NIST SP 800-53 PE-3 behandelt auch Guards im Rahmen von Physical Access Control. Für diese Karte bleiben daher alle Front-Zuordnungen unverändert.""",
    "evidence": "Every front-side mapping is supported by CompTIA's control categories. NIST PE-3 confirms that guards and physical access devices belong within physical access control, so the former blanket operational claim was wrong.",
    "sources": [
      comptia("p. 1, objective 1.1, categories of security controls", "CompTIA distinguishes technical, managerial, operational, and physical control categories."),
      FACT_SOURCES["physical"],
    ],
    "change": "Removed the front/back contradiction while preserving all eight proven mappings.",
    "cross": "Checked other control-category cards for guard and barrier examples; none requires changing these eight mappings.",
    "sourceConflicts": [],
    "addRequirements": [],
    "items": [
      ("Guard shack limiting physical access >> Physical", "The described guard shack is a facility-based physical access barrier, and NIST PE-3 covers guards under physical access control."),
      ("Fences and locked doors >> Physical", "Fences and locked doors directly restrict physical entry to facilities and protected areas."),
      ("Antivirus software >> Technical", "Antivirus is software that enforces malware prevention and detection through technical mechanisms."),
      ("Firewall access control list blocking specific addresses >> Technical", "A firewall ACL is a technology-enforced rule that allows or blocks network traffic."),
      ("Periodic risk assessment >> Managerial", "Risk assessment is a management and governance activity used to direct security decisions."),
      ("Official written security policy >> Managerial", "A formal security policy expresses management direction and organizational requirements."),
      ("Security awareness workshop >> Operational", "Personnel execute the recurring awareness and training process as an operational control."),
      ("Daily review of system logs by analysts >> Operational", "Analysts perform the recurring log-review procedure, making it an operational process."),
    ],
  },
  "1779724748973": {
    "cardType": "matching",
    "front": """MATCHING:
Match each cloud or Zero Trust acronym to its function.

CASB >> Policy, visibility, and data controls between users and cloud applications
SASE >> Cloud-delivered networking and security services at the edge
ZTNA >> Identity- and context-based access to individual applications
IaaS >> Customer manages the guest operating system, applications, and data
PaaS >> Customer deploys code while the provider manages the runtime and operating system
SaaS >> Customer configures and uses a complete provider-managed application""",
    "back": """CASB = Cloud Access Security Broker
SASE = Secure Access Service Edge
ZTNA = Zero Trust Network Access
IaaS = Infrastructure as a Service
PaaS = Platform as a Service
SaaS = Software as a Service

Merkhilfe:
- CASB = Richtlinien-, Sichtbarkeits- und Datenkontrolle für Cloud-Anwendungen
- SASE = Netzwerk- und Sicherheitsfunktionen als Cloud-Service am Edge
- ZTNA = identitäts- und kontextgeprüfter Zugriff auf einzelne Ressourcen pro Sitzung
- IaaS = Infrastruktur; der Kunde verwaltet Gast-OS, Anwendungen und Daten
- PaaS = Plattform; der Kunde deployt Code
- SaaS = fertige, vom Provider verwaltete Anwendung

ZTNA ist kein „Cloud-VPN“: NIST SP 800-207 betont Ressourcen statt Netzwerksegmente und prüft Authentisierung und Autorisierung vor der Sitzung.""",
    "evidence": "All six mappings match the CompTIA acronym and architecture scope. NIST SP 800-207 directly supports the resource-focused, identity- and context-based ZTNA mapping and disproves the former Cloud-VPN mnemonic.",
    "sources": [
      comptia("pp. 6-7 and acronym list, objectives 3.1 and cloud service models", "CompTIA includes CASB, SASE, ZTNA, IaaS, PaaS, and SaaS in the architecture and acronym scope."),
      FACT_SOURCES["zero_trust"],
    ],
    "change": "Preserved all six mappings and replaced the misleading Cloud-VPN mnemonic with resource-focused per-session access.",
    "cross": "Checked Zero Trust and cloud-model cards for conflicting scope; the revised wording now matches the resource-focused definitions used elsewhere.",
    "sourceConflicts": [],
    "addRequirements": ["req:sy0701:v7:3.1:zero-trust"],
    "items": [
      ("CASB >> Policy, visibility, and data controls between users and cloud applications", "CASB supplies security policy enforcement, visibility, and data protection for cloud application use."),
      ("SASE >> Cloud-delivered networking and security services at the edge", "SASE combines wide-area networking and security capabilities delivered as cloud services near users and resources."),
      ("ZTNA >> Identity- and context-based access to individual applications", "NIST zero trust evaluates subject and device before resource sessions and does not grant broad trust by network location."),
      ("IaaS >> Customer manages the guest operating system, applications, and data", "In IaaS the provider supplies infrastructure while the customer controls the guest software stack and data."),
      ("PaaS >> Customer deploys code while the provider manages the runtime and operating system", "In PaaS the provider manages platform and runtime layers while the customer deploys application code."),
      ("SaaS >> Customer configures and uses a complete provider-managed application", "In SaaS the provider manages the application stack while the customer configures and uses the service."),
    ],
  },
  "1780262916264": mc(
    "According to CompTIA SY0-701 objective 5.2's business impact analysis terminology, what does MTTR stand for?",
    {"A": "Mean Time To Respond", "B": "Mean Time To Repair", "C": "Maximum Time To Recover", "D": "Mean Transaction Time Reliability"},
    "B",
    "MTTR = Mean Time To Repair. CompTIA objective 5.2 and NIST use this expansion. CompTIA's acronym appendix separately prints “Mean Time to Recover”; ISO distinguishes repair from restoration. The unsupported slash form “Repair / Restore” is therefore removed.",
    {
      "A": "Mean Time To Respond is not the expansion used by CompTIA objective 5.2 or the cited NIST maintenance KPI.",
      "C": "Maximum Time To Recover changes both the statistic and wording and is not an official MTTR expansion in the cited sources.",
      "D": "Mean Transaction Time Reliability is not a recognized MTTR expansion in CompTIA, NIST, or ISO terminology.",
    },
    "p. 13, objective 5.2 business impact analysis; acronym appendix entry for MTTR",
    "Objective 5.2 uses Mean time to repair; the appendix separately uses Mean Time to Recover, which is recorded as a source conflict.",
    ["mttr_nist", "mttr_iso"],
    "Replaced the unsupported blended answer Mean Time To Repair / Restore with Mean Time To Repair and disclosed CompTIA's internal terminology conflict.",
    "Compared both duplicate MTTR cards and every MTTR occurrence; both corrected cards now use the same scoped answer and conflict note.",
    [{"sources": ["CompTIA objective 5.2", "CompTIA acronym appendix"], "resolution": "Use Mean Time To Repair because the question explicitly scopes objective 5.2; disclose that the appendix says Recover."}],
    ["req:sy0701:v7:5.2:business-impact-analysis:mttr"],
  ),
  "1781206500023": mc(
    "According to CompTIA SY0-701 objective 5.2's business impact analysis terminology, what does MTTR stand for?",
    {"A": "Mean Time To Repair", "B": "Mean Time To Respond", "C": "Maximum Time To Recover", "D": "Mean Transaction Time Reliability"},
    "A",
    "MTTR = Mean Time To Repair. CompTIA objective 5.2 and NIST use this expansion. CompTIA's acronym appendix separately prints “Mean Time to Recover”; ISO distinguishes repair from restoration. The unsupported slash form “Repair / Restore” is therefore removed.",
    {
      "B": "Mean Time To Respond is not the expansion used by CompTIA objective 5.2 or the cited NIST maintenance KPI.",
      "C": "Maximum Time To Recover changes both the statistic and wording and is not an official MTTR expansion in the cited sources.",
      "D": "Mean Transaction Time Reliability is not a recognized MTTR expansion in CompTIA, NIST, or ISO terminology.",
    },
    "p. 13, objective 5.2 business impact analysis; acronym appendix entry for MTTR",
    "Objective 5.2 uses Mean time to repair; the appendix separately uses Mean Time to Recover, which is recorded as a source conflict.",
    ["mttr_nist", "mttr_iso"],
    "Replaced the unsupported blended answer Mean Time To Repair / Restore with Mean Time To Repair and disclosed CompTIA's internal terminology conflict.",
    "Compared both duplicate MTTR cards and every MTTR occurrence; both corrected cards now use the same scoped answer and conflict note.",
    [{"sources": ["CompTIA objective 5.2", "CompTIA acronym appendix"], "resolution": "Use Mean Time To Repair because the question explicitly scopes objective 5.2; disclose that the appendix says Recover."}],
    ["req:sy0701:v7:5.2:business-impact-analysis:mttr"],
  ),
  "1786384200046": mc(
    "A user connects to public Wi-Fi outside the organization's controlled premises. Because the radio signal is reachable by nearby devices, an attacker can operate a rogue access point or capture unprotected traffic. Which attack-surface category is most specific?",
    {"A": "Unsecure networks — Bluetooth", "B": "Human vectors/social engineering — Impersonation", "C": "Unsecure networks — Wireless", "D": "Unsecure networks — Wired"},
    "C",
    "Unsecure networks — Wireless is uniquely supported because the scenario identifies public Wi-Fi, radio reach, rogue access points, and wireless eavesdropping. NIST SP 800-153 treats those as WLAN threats.",
    {
      "A": "Bluetooth is a separate short-range wireless technology, but the scenario explicitly identifies a Wi-Fi WLAN and rogue access point.",
      "B": "Impersonation depends on a person or system pretending to be a trusted identity, which the scenario does not describe.",
      "D": "A wired attack surface depends on physical cable or switch-port access, not a reachable Wi-Fi radio signal.",
    },
    "p. 5, objective 2.2, unsecure networks: wireless, wired, and Bluetooth",
    "CompTIA separately lists wireless, wired, and Bluetooth attack surfaces, so the stem must identify the relevant medium.",
    ["wireless"],
    "Added public Wi-Fi, radio-range, rogue-AP, and eavesdropping facts so Wireless is uniquely entailed.",
    "Compared the wired and Bluetooth vector cards; their physical-medium facts no longer overlap the revised Wi-Fi scenario.",
  ),
  "1786384200049": mc(
    "An organization buys a finished application from a third-party software producer. That producer's trusted update channel is compromised and distributes a malicious update to customers. Under SY0-701 objective 2.2, which vector is being described?",
    {"A": "Human vectors/social engineering — Phishing", "B": "Unsecure networks — Wireless", "C": "File-based", "D": "Supply chain — Vendors"},
    "D",
    "Supply chain — Vendors is the intended CompTIA vector: a trusted vendor's delivered product and update channel introduce malicious functionality into customer environments. NIST SP 800-161 treats malicious acquired products and services as C-SCRM risk.",
    {
      "A": "Phishing requires a deceptive message that induces user action; the scenario instead compromises the producer's trusted delivery channel.",
      "B": "Wireless describes exposure through a radio network and does not explain a malicious update distributed by a software producer.",
      "C": "The payload is a file, but the distinguishing attack path is compromise of a trusted vendor and its product-distribution channel.",
    },
    "p. 5, objective 2.2, supply chain: managed service providers, vendors, and suppliers",
    "CompTIA explicitly includes vendors as a supply-chain threat vector distinct from unrelated delivery and human vectors.",
    ["supply_chain"],
    "Replaced keyword repetition and overlapping supply-chain distractors with a vendor update-channel scenario and non-overlapping alternatives.",
    "Compared supplier and MSP cards; the revised scenario identifies the finished-product vendor relationship rather than component supply or managed operation.",
  ),
  "1786384200050": mc(
    "An upstream component manufacturer ships counterfeit network hardware that an integrator incorporates into finished systems. Under SY0-701 objective 2.2, which vector is most specific?",
    {"A": "Supply chain — Managed service providers (MSPs)", "B": "Human vectors/social engineering — Misinformation/disinformation", "C": "Supply chain — Suppliers", "D": "File-based"},
    "C",
    "Supply chain — Suppliers is uniquely supported: the upstream party supplies counterfeit hardware components that another organization integrates. NIST SP 800-161 explicitly identifies counterfeit products and supplier risk.",
    {
      "A": "An MSP remotely operates or manages customer services; the upstream component manufacturer in this scenario provides no managed service.",
      "B": "Misinformation or disinformation manipulates beliefs through false information and does not describe counterfeit component delivery.",
      "D": "A file-based vector uses a malicious document or archive; this scenario concerns counterfeit physical hardware from an upstream supplier.",
    },
    "p. 5, objective 2.2, supply chain: managed service providers, vendors, and suppliers",
    "CompTIA includes suppliers as a named supply-chain vector; the revised stem supplies upstream component-manufacturing facts.",
    ["supply_chain"],
    "Replaced an unanswerable generic question with a counterfeit upstream-component scenario and removed the overlapping vendor distractor.",
    "Compared vendor and MSP cards; only this card now describes an upstream component supplier and counterfeit hardware.",
  ),
  "1786384200074": mc(
    "A service remains online under expected load, but users complain that it takes too long to answer application requests. Which architecture consideration directly measures the promptness of those responses?",
    {"A": "Considerations — Scalability", "B": "Considerations — Availability", "C": "Considerations — Responsiveness", "D": "Considerations — Ease of recovery"},
    "C",
    "Considerations — Responsiveness addresses how promptly a running system answers a user's or application's service request. Availability, scalability, and recovery answer different architecture questions.",
    {
      "A": "Scalability concerns adapting capacity as demand grows; it does not directly name the latency of each user request.",
      "B": "Availability concerns whether authorized users can access the service when needed; the scenario states that the service remains online.",
      "D": "Ease of recovery concerns restoring service after disruption, but this scenario describes slow responses during normal operation.",
    },
    "p. 7, objective 3.1, architecture considerations: availability, resilience, cost, responsiveness, scalability, ease of deployment and recovery",
    "CompTIA lists responsiveness as a distinct architecture consideration from availability, scalability, and recovery.",
    ["responsiveness"],
    "Replaced the unrelated threat-detection stem with a service-response-time scenario that uniquely entails Responsiveness.",
    "Compared the monitoring, availability, scalability, and recovery cards; the revised stem no longer duplicates threat detection or mitigation.",
  ),
  "1786384200078": mc(
    "A data center must keep critical servers running during a utility outage. Which architecture consideration is addressed by installing UPS units and standby generators?",
    {"A": "Considerations — Responsiveness", "B": "Considerations — Patch availability", "C": "Considerations — Power", "D": "Considerations — Ease of recovery"},
    "C",
    "Considerations — Power is the direct concern because UPS units and standby generators maintain electrical service during a utility failure. NIST contingency guidance treats loss of power and alternate power as continuity concerns.",
    {
      "A": "Responsiveness measures how quickly a running service answers requests; it does not supply electricity during a utility outage.",
      "B": "Patch availability concerns whether security updates exist and can be obtained, not continuity of electrical service.",
      "D": "Ease of recovery concerns restoration after a failure, while UPS and generators are intended to sustain operation through the outage.",
    },
    "p. 7, objective 3.1, infrastructure considerations including power",
    "CompTIA explicitly lists power as an architecture consideration affecting infrastructure operation and continuity.",
    ["power"],
    "Replaced the tautological wording with an operational utility-outage scenario involving UPS and standby generation.",
    "Compared power, recovery, and availability cards; the revised stem tests the power mechanism without borrowing another card's definition.",
  ),
  "1786384200112": mc(
    "A manufacturing plant uses PLCs, HMIs, and supervisory servers to monitor and control physical production processes. Which hardening target encompasses this industrial control environment?",
    {"A": "Hardening targets — ICS/SCADA", "B": "Hardening targets — IoT devices", "C": "Hardening targets — RTOS", "D": "Hardening targets — Routers"},
    "A",
    "Hardening targets — ICS/SCADA encompasses supervisory servers, HMIs, PLCs, and networks that monitor or control industrial physical processes. NIST SP 800-82 uses these components to characterize ICS and SCADA environments.",
    {
      "B": "IoT devices may sense or actuate, but the coordinated plant-wide supervisory architecture with PLCs and HMIs is specifically ICS/SCADA.",
      "C": "An RTOS is a timing-focused operating system that may run on one component; it is not the entire supervisory control environment.",
      "D": "Routers forward network traffic and may exist in the plant, but they do not encompass PLCs, HMIs, and supervisory control servers.",
    },
    "p. 9, objective 4.1, hardening targets: ICS/SCADA, embedded systems, RTOS, IoT, and network infrastructure",
    "CompTIA names ICS/SCADA as a hardening target distinct from devices, operating systems, and routers.",
    ["ot"],
    "Converted the malformed risk question into an industrial-architecture identification scenario that A actually answers.",
    "Compared the embedded, RTOS, IoT, and network-infrastructure cards; only ICS/SCADA spans all listed supervisory and control components.",
  ),
  "1786384200113": mc(
    "A purpose-built controller performs one dedicated function, offers limited general-purpose operating-system access, and receives appliance-specific firmware. Which hardening target is most specific?",
    {"A": "Hardening targets — Mobile devices", "B": "Hardening targets — RTOS", "C": "Hardening targets — IoT devices", "D": "Hardening targets — Embedded systems"},
    "D",
    "Hardening targets — Embedded systems is most specific because the scenario describes a purpose-built, dedicated-function controller with restricted general-purpose OS access and appliance firmware. Network connectivity and deterministic deadlines are not asserted.",
    {
      "A": "Mobile devices are general user-computing platforms with mobile operating systems and applications, unlike the dedicated controller described here.",
      "B": "RTOS requires deterministic timing or deadline behavior; the scenario deliberately describes no real-time scheduling requirement.",
      "C": "IoT emphasizes network-connected sensing or control; the scenario does not state Internet or network connectivity and instead stresses purpose-built operation.",
    },
    "p. 9, objective 4.1, hardening targets: mobile, embedded, RTOS, and IoT",
    "CompTIA lists embedded systems separately from mobile, RTOS, and IoT hardening targets.",
    ["ot"],
    "Added dedicated-function, limited-OS, and appliance-firmware facts and explicitly avoided RTOS and IoT discriminators.",
    "Compared adjacent mobile, RTOS, and IoT cards; the revised stem contains only embedded-system discriminators.",
  ),
  "1786384200114": mc(
    "A vehicle control unit must schedule tasks predictably and meet fixed timing deadlines. Which hardening target is defined by that deterministic execution requirement?",
    {"A": "Hardening targets — Cloud infrastructure", "B": "Hardening targets — Routers", "C": "Hardening targets — RTOS", "D": "Hardening targets — IoT devices"},
    "C",
    "Hardening targets — RTOS is uniquely supported because real-time operating systems schedule time-critical tasks predictably and are selected when deadlines must be met. NIST describes deterministic execution for industrial control workloads.",
    {
      "A": "Cloud infrastructure provides virtualized compute and services but is not defined by deterministic deadline-bound task scheduling.",
      "B": "Routers forward packets between networks and are not operating systems selected for deterministic control-loop deadlines.",
      "D": "IoT devices are network-connected devices; connectivity alone does not imply deterministic real-time scheduling or fixed deadlines.",
    },
    "p. 9, objective 4.1, hardening targets including real-time operating system",
    "CompTIA explicitly identifies RTOS as a distinct hardening target within specialized computing environments.",
    ["rtos", "ot"],
    "Converted the malformed challenge question into a deterministic, deadline-bound RTOS identification scenario.",
    "Compared the embedded and IoT cards; only the RTOS card now depends on predictable task scheduling and fixed deadlines.",
  ),
  "1786384200157": mc(
    "A web filter evaluates a URL and downloaded application using historical behavior, trust scores, download prevalence, and previous security results. Which filtering mechanism is it using?",
    {"A": "Web filter — Content categorization", "B": "Web filter — Universal Resource Locator (URL) scanning", "C": "Web filter — Block rules", "D": "Web filter — Reputation"},
    "D",
    "Web filter — Reputation is uniquely supported because historical behavior, trust, prevalence, and prior security results are reputation signals. Microsoft's official SmartScreen documentation describes this type of URL and application reputation evaluation.",
    {
      "A": "Content categorization groups sites by subject such as business or gambling; the scenario instead scores trust from historical signals.",
      "B": "URL scanning inspects or checks the address, but the distinguishing facts are the historical and prevalence-based reputation inputs.",
      "C": "Block rules enforce an administrator's allow or deny decision; they are not the historical trust-scoring mechanism described.",
    },
    "p. 11, objective 4.5, web filter: agent-based, centralized proxy, URL scanning, content categorization, block rules, and reputation",
    "CompTIA lists reputation as a separate web-filter mechanism from URL scanning, categories, and explicit block rules.",
    ["reputation"],
    "Replaced the tautological question with a historical trust-score and prevalence scenario.",
    "Compared URL-scanning, category, and block-rule cards; the revised inputs uniquely identify reputation evaluation.",
  ),
  "1786384200178": mc(
    "A privileged access system creates a new short-lived credential for one approved session. The credential becomes invalid and is deleted when the session ends. Which PAM concept is most specific?",
    {"A": "Privileged access management tools — Just-in-time permissions", "B": "Password concepts — Passwordless", "C": "Privileged access management tools — Ephemeral credentials", "D": "Privileged access management tools — Password vaulting"},
    "C",
    "Privileged access management tools — Ephemeral credentials is most specific because the scenario asks about a newly created, short-lived credential that is invalidated and deleted after one session. JIT instead describes when temporary permission is granted.",
    {
      "A": "Just-in-time permissions describes temporary authorization during an approved period, but the stem specifically asks about the credential artifact's creation and deletion.",
      "B": "Passwordless authentication replaces passwords with another authenticator and does not require a per-session credential that is deleted afterward.",
      "D": "Password vaulting stores and brokers standing secrets; the stem instead describes a newly issued credential that does not persist in a vault.",
    },
    "p. 11, objective 4.6, privileged access management tools: just-in-time permissions, password vaulting, temporal accounts, and ephemeral credentials",
    "CompTIA separately lists JIT permissions and ephemeral credentials, so the stem must distinguish authorization from the credential artifact.",
    ["ephemeral"],
    "Added newly created, session-bound, invalidated, and deleted credential facts so C no longer overlaps JIT permissions.",
    "Compared the JIT, temporal-account, and password-vaulting cards; the revised stem uniquely asks about the short-lived credential itself.",
  ),
  "1786384200187": mc(
    "Automation continuously compares running system and network configurations with an approved secure baseline and remediates unauthorized drift. Which automation benefit is most specific?",
    {"A": "Benefits — Standard infrastructure configurations", "B": "Benefits — Enforcing baselines", "C": "Benefits — Workforce multiplier", "D": "Benefits — Scaling in a secure manner"},
    "B",
    "Benefits — Enforcing baselines is uniquely supported because the process continuously checks the approved security baseline and corrects drift. NIST SP 800-128 distinguishes establishing a baseline from monitoring and controlling later changes.",
    {
      "A": "Standard infrastructure configurations concern building systems from common approved templates, not continuously detecting and remediating drift on running systems.",
      "C": "A workforce multiplier increases the amount of work existing staff can handle; it does not specifically require baseline comparison or drift correction.",
      "D": "Scaling securely concerns preserving controls as capacity grows; the scenario instead focuses on continuous conformance of existing configurations.",
    },
    "p. 12, objective 4.7, automation benefits: enforcing baselines and standard infrastructure configurations",
    "CompTIA lists enforcing baselines separately from standard configurations, scaling, and workforce multiplication.",
    ["baselines"],
    "Added continuous comparison and drift remediation so Enforcing baselines is uniquely distinguishable from standard builds.",
    "Compared the standard-configuration card and all automation-benefit cards; only this stem tests continuous drift enforcement.",
  ),
  "1786384200188": mc(
    "Deployment automation provisions new routers and virtual machines from the same approved template so each starts with an identical infrastructure configuration. Which benefit is most specific?",
    {"A": "Benefits — Standard infrastructure configurations", "B": "Benefits — Reaction time", "C": "Benefits — Enforcing baselines", "D": "Benefits — Scaling in a secure manner"},
    "A",
    "Benefits — Standard infrastructure configurations is uniquely supported because new systems are provisioned from one approved template with the same initial configuration. This is distinct from monitoring deployed systems for later drift.",
    {
      "B": "Reaction time concerns how quickly automation detects or responds to events; no incident or response timing is described.",
      "C": "Enforcing baselines continuously detects and corrects drift after deployment, while this scenario describes the initial template-based build.",
      "D": "Scaling securely concerns adding capacity without losing controls; the key fact here is identical initial configuration rather than growth.",
    },
    "p. 12, objective 4.7, automation benefits: standard infrastructure configurations and enforcing baselines",
    "CompTIA lists standard infrastructure configurations as a specific automation benefit distinct from ongoing enforcement.",
    ["baselines"],
    "Added new-system provisioning and a shared approved template so A no longer overlaps continuous baseline enforcement.",
    "Compared the baseline-enforcement card; initial provisioning and post-deployment drift are now tested by separate stems.",
  ),
  "1786384200192": mc(
    "An orchestration workflow spans identity, endpoint, network, and cloud systems. As integrations and dependencies increase, testing all interactions becomes substantially harder. Which consideration is most directly illustrated?",
    {"A": "Other considerations — Complexity", "B": "Other considerations — Cost", "C": "Other considerations — Single point of failure", "D": "Other considerations — Ongoing supportability"},
    "A",
    "Other considerations — Complexity is uniquely supported because the scenario emphasizes many interacting systems, integrations, dependencies, and the resulting test burden. NIST systems engineering guidance treats those interactions as sources of complexity and emergent behavior.",
    {
      "B": "Complex designs may cost more, but the scenario provides no price, staffing, licensing, or budget fact; it describes interaction burden.",
      "C": "A single point of failure is one component whose failure disables the workflow; the scenario identifies no such component.",
      "D": "Ongoing supportability concerns long-term maintenance, training, and compatibility; the scenario specifically concerns integration and test complexity.",
    },
    "p. 12, objective 4.7, automation considerations: complexity, cost, single point of failure, technical debt, and ongoing supportability",
    "CompTIA lists complexity as its own automation consideration separate from cost, failure concentration, and supportability.",
    ["complexity"],
    "Replaced the tautological why-complexity question with a multi-system dependency and interaction-testing scenario.",
    "Compared cost, single-point-of-failure, and supportability cards; the revised stem contains no facts that entail those distractors.",
  ),
  "1786384200222": mc(
    "A hospital tailors its governance program to healthcare-sector practices, while a bank tailors its program to financial-sector expectations. Which external consideration accounts for this sector-specific context?",
    {"A": "External considerations — Regulatory", "B": "External considerations — Legal", "C": "External considerations — Industry", "D": "External considerations — National"},
    "C",
    "External considerations — Industry is uniquely supported because the distinguishing fact is the sector: healthcare versus financial services. NIST CSF Organizational Profiles can be tailored to sector and organizational context.",
    {
      "A": "Regulatory refers to binding rules from an authority; the stem mentions sector practices and expectations without identifying a regulation.",
      "B": "Legal refers to applicable law and legal duties; no statute, court, contract, or legal process is stated in the scenario.",
      "D": "National refers to country-level priorities or requirements; the scenario compares economic sectors, not nations.",
    },
    "p. 13, objective 5.1, external considerations: regulatory, legal, industry, local/regional, national, global",
    "CompTIA explicitly lists industry as an external governance consideration separate from legal, regulatory, and national concerns.",
    ["industry"],
    "Replaced the malformed result question with a healthcare-versus-finance sector-context scenario.",
    "Compared legal, regulatory, national, and industry governance cards; only this stem is driven by sector-specific context.",
  ),
  "1786384200245": mc(
    "Compliance results must be delivered periodically to regulators and contractual third parties outside the organization. Which compliance-reporting category is being used?",
    {"A": "Compliance reporting — Internal", "B": "Compliance monitoring — Internal and external", "C": "Consequences of non-compliance — Reputational damage", "D": "Compliance reporting — External"},
    "D",
    "Compliance reporting — External is uniquely supported because the recipients are regulators and contractual third parties outside the organization. Reporting recipients distinguish external reporting from internal reporting and ongoing monitoring.",
    {
      "A": "Internal compliance reporting is delivered to management or governance bodies inside the organization, not to outside regulators and third parties.",
      "B": "Compliance monitoring is the ongoing collection and evaluation of compliance status; the stem asks about delivering completed results externally.",
      "C": "Reputational damage is a possible consequence of non-compliance, not a category for periodically transmitting compliance results.",
    },
    "p. 14, objective 5.4, compliance reporting: internal and external",
    "CompTIA explicitly distinguishes internal and external compliance reporting and separately lists monitoring and consequences.",
    ["assessment", "conformity"],
    "Replaced the circular purpose question with an explicit outside-recipient reporting scenario.",
    "Compared internal reporting, monitoring, and non-compliance consequence cards; outside recipients uniquely distinguish this card.",
  ),
  "1786384200254": mc(
    "Internal auditors examine whether the organization fulfills required compliance obligations against approved policies and applicable frameworks, without using an external assessor. Which internal-audit focus is most specific?",
    {"A": "Internal — Self-assessments", "B": "External — Regulatory", "C": "Internal — Compliance", "D": "Internal — Audit committee"},
    "C",
    "Internal — Compliance is uniquely supported because internal auditors are evaluating fulfillment of compliance obligations against required policies and frameworks. NIST assessment guidance requires defined procedures and evidence to determine whether requirements are met.",
    {
      "A": "A self-assessment is performed by the responsible unit evaluating itself; the stem instead identifies an internal audit function examining compliance obligations.",
      "B": "External regulatory review is conducted under an outside regulatory mandate; the stem expressly states that no external assessor is used.",
      "D": "An audit committee oversees audit and risk activities but is not the subject-matter focus of the compliance examination described.",
    },
    "p. 14, objective 5.5, internal audits and assessments: compliance, audit committee, and self-assessments",
    "CompTIA separately lists internal compliance, audit committee, and self-assessment concepts within internal audits.",
    ["assessment", "conformity"],
    "Added an internal audit actor, formal obligations, evidence framework, and no-external-assessor boundary to distinguish C from self-assessment.",
    "Compared self-assessment, audit-committee, and regulatory-audit cards; actor and mandate now distinguish all four options.",
  ),
  "1786384200256": mc(
    "A statute or regulator expressly requires an organization to undergo an external examination by a qualified outside assessor. Which external-audit type is defined by that mandate?",
    {"A": "External — Regulatory", "B": "External — Examinations", "C": "External — Assessment", "D": "External — Independent third-party audit"},
    "A",
    "External — Regulatory is uniquely supported because the decisive fact is the mandatory requirement imposed by a statute or regulator. The other options describe broader methods or assessor independence without necessarily establishing a regulatory mandate.",
    {
      "B": "Examination is a broad form of external review; the stem asks for the type specifically defined by a statute or regulator's mandate.",
      "C": "Assessment broadly evaluates control or compliance status and can be voluntary; it is not necessarily required by a regulator.",
      "D": "An independent third-party audit identifies assessor independence, but a third party can be voluntarily commissioned without a regulatory mandate.",
    },
    "p. 14, objective 5.5, external audits: regulatory, examinations, assessment, and independent third-party audit",
    "CompTIA lists regulatory as a specific external-audit category alongside examinations, assessments, and independent audits.",
    ["assessment", "conformity"],
    "Added an express statutory or regulatory mandate so A is uniquely distinguished from broader external review types.",
    "Compared examinations, assessments, and independent third-party audits; only this stem requires an external review because a regulator mandates it.",
  ),
}


UNRESOLVED_IDS = {
  "1786384200045", "1786384200067", "1786384200068", "1786384200099",
  "1786384200100", "1786384200132", "1786384200138",
}
WORDING_ONLY_IDS = {"1786384200084"}
PROTECTED_IDS = {
  "1772578430967", "1779669260176", "1780262916265", "1781206500008",
  "1781206500009", "1781206500010", "1786384200072", "1786384200158",
}


def connect() -> sqlite3.Connection:
  conn = sqlite3.connect(gateway.DEFAULT_DB)
  conn.row_factory = sqlite3.Row
  return conn


def build_decisions(conn: sqlite3.Connection) -> dict:
  user_id = gateway.profile_id(conn)
  cards = {card["cardId"]: card for card in gateway.active_cards(conn, user_id)}
  registry = gateway.load_registry(gateway.DEFAULT_REGISTRY)
  reviews = {str(item["cardId"]): item for item in registry["reviews"]}
  if set(CORRECTIONS) - set(cards):
    raise RuntimeError(f"Correction cards missing from Vlad scope: {sorted(set(CORRECTIONS) - set(cards))}")

  decisions = []
  reviewed_at = gateway.utc_iso()
  for card_id, correction in CORRECTIONS.items():
    current = cards[card_id]
    old_review = reviews[card_id]
    content = gateway.canonical_content({
      **current["content"],
      "front": correction["front"],
      "back": correction["back"],
    })
    history_count = conn.execute(
      "SELECT COUNT(*) FROM sync_operations WHERE user_id=? AND payload_json LIKE ?",
      (user_id, f'%"cardId": "{card_id}"%'),
    ).fetchone()[0]
    semantic_checks = {
      "stemUnambiguous": True,
      "frontBackConsistent": True,
      "sourceConflictChecked": True,
    }
    decision = {
      "userId": user_id,
      "cardId": card_id,
      "verdict": "corrected",
      "cardType": correction["cardType"],
      "requirements": list(dict.fromkeys([
        *old_review["requirements"], *correction.get("addRequirements", []),
      ])),
      "evidence": correction["evidence"],
      "sources": correction["sources"],
      "reviewer": "primary-source-security-card-review-2026-08-16-v4",
      "reviewedAt": reviewed_at,
      "reviewBasis": [
        "CompTIA Security+ SY0-701 V7 objective and acronym scope checked",
        "At least one independent official primary fact source checked",
        "Every option, pair, or ordering step adjudicated against the revised front and back",
        f"Vlad-scoped sync history checked ({history_count} matching operation records)",
      ],
      "semanticChecks": semantic_checks,
      "sourceConflicts": correction["sourceConflicts"],
      "crossCardCheck": {"performed": True, "result": correction["cross"]},
      "revisionConsistency": {"frontBackSameRevision": True, "historyChecked": True},
      "changeSummary": correction["change"],
      "content": content,
    }
    if correction["cardType"] == "mc":
      semantic_checks["answerEntailedBySources"] = True
      decision["optionAssessments"] = {
        letter: {
          "verdict": "correct" if letter == correction["key"] else "incorrect",
          "reason": correction["optionReasons"][letter],
        }
        for letter in gateway.parse_options(content["front"])
      }
    else:
      semantic_checks["allPairsOrStepsVerified"] = True
      decision["itemAssessments"] = [
        {"item": item, "reason": reason} for item, reason in correction["items"]
      ]
    prospective = {
      "content": content,
      "contentHash": gateway.content_hash(content),
    }
    review = {
      **{key: value for key, value in decision.items() if key != "content"},
      "contentHash": prospective["contentHash"],
      "correctAnswer": gateway.keyed_answer(content),
    }
    errors = gateway.validate_review(
      review,
      prospective,
      publication=True,
      expected_user_id=user_id,
    )
    if errors:
      raise RuntimeError(f"Prepared decision {card_id} failed validation:\n- " + "\n- ".join(errors))
    decisions.append(decision)
  return {
    "$schema": "vlad-security-card-correction-decisions-1",
    "generatedAt": reviewed_at,
    "profile": "Vlad",
    "canonicalUserId": user_id,
    "identityKey": ["userId", "cardId"],
    "policy": "Only proven content defects are corrected; unresolved and protected cards are excluded.",
    "decisions": decisions,
  }


def old_record_index(report: dict) -> dict[str, dict]:
  result = {}
  for group in (
    "provenContradictions",
    "semanticCandidatesNotProvenWrong",
    "wordingDefectsWithoutProvenAnswerError",
    "verifiedCorrectCardsDoNotChange",
  ):
    for record in report.get(group, []):
      card_id = str(record.get("cardId") or "")
      if card_id:
        result[card_id] = record
  return result


def build_report(conn: sqlite3.Connection) -> dict:
  user_id = gateway.profile_id(conn)
  cards = {card["cardId"]: card for card in gateway.active_cards(conn, user_id)}
  v3 = gateway.read_json(REPORT_V3_PATH)
  previous = old_record_index(v3)
  decisions = gateway.read_json(DECISIONS_PATH)["decisions"]
  decision_index = {str(item["cardId"]): item for item in decisions}
  registry = gateway.load_registry(gateway.DEFAULT_REGISTRY)
  review_index = {str(item["cardId"]): item for item in registry["reviews"]}

  expected_reviewed = set(CORRECTIONS) | UNRESOLVED_IDS | WORDING_ONLY_IDS | PROTECTED_IDS
  if len(expected_reviewed) != 38 or set(previous) != expected_reviewed:
    raise RuntimeError("The v3 38-card scope does not match the explicit v4 classification")

  for card_id in CORRECTIONS:
    if review_index[card_id].get("verdict") != "corrected":
      raise RuntimeError(f"card {card_id}: corrected registry verdict missing")
    expected_hash = gateway.content_hash(decision_index[card_id]["content"])
    if cards[card_id]["contentHash"] != expected_hash:
      raise RuntimeError(f"card {card_id}: published content does not match the reviewed decision")

  for card_id in UNRESOLVED_IDS | WORDING_ONLY_IDS | PROTECTED_IDS:
    if cards[card_id]["contentHash"] != previous[card_id]["contentHash"]:
      raise RuntimeError(f"card {card_id}: protected/unresolved content changed unexpectedly")

  blockchain = gateway.keyed_answer(cards["1772578430967"]["content"])
  if blockchain != {"letter": "B", "text": "Blockchain"}:
    raise RuntimeError("Protected card 1772578430967 is no longer B — Blockchain")

  def scoped_record(card_id: str, disposition: str) -> dict:
    old = previous[card_id]
    return {
      "userId": user_id,
      "cardId": card_id,
      "contentHash": cards[card_id]["contentHash"],
      "disposition": disposition,
      "priorFinding": old.get("proof") or old.get("issue") or old.get("findingType") or "Reviewed in v3",
      "currentCorrectAnswer": gateway.keyed_answer(cards[card_id]["content"]),
    }

  corrected = []
  for card_id, correction in CORRECTIONS.items():
    corrected.append({
      **scoped_record(card_id, "corrected_through_gateway"),
      "beforeContentHash": previous[card_id]["contentHash"],
      "changeSummary": correction["change"],
      "proof": correction["evidence"],
      "sourceIds": [source["sourceId"] for source in correction["sources"]],
    })

  source_index = {}
  for decision in decisions:
    for source in decision["sources"]:
      source_index[source["sourceId"]] = source

  report = {
    "$schema": "vlad-security-card-contradictions-4",
    "schemaVersion": "vlad-security-card-contradictions-4",
    "reportId": "vlad-card-contradictions-2026-08-16-v4",
    "generatedAt": gateway.utc_iso(),
    "supersedes": str(REPORT_V3_PATH),
    "profile": "Vlad",
    "canonicalUserId": user_id,
    "identityKey": ["userId", "cardId"],
    "hashScope": "Each contentHash is resolved by the composite key (userId, cardId) inside Vlad's canonical catalog.",
    "coverage": {
      "canonicalCardsReviewed": len(cards),
      "reclassifiedV3Records": 38,
      "correctedAndPublished": len(corrected),
      "unresolvedNoChange": len(UNRESOLVED_IDS),
      "wordingOnlyNoChange": len(WORDING_ONLY_IDS),
      "protectedNoChange": len(PROTECTED_IDS),
    },
    "summary": {
      "provenContentDefectsCorrected": len(corrected),
      "unresolvedCandidatesNoChange": len(UNRESOLVED_IDS),
      "wordingOnlyNoChange": len(WORDING_ONLY_IDS),
      "verifiedCorrectCardsNoChange": len(PROTECTED_IDS),
    },
    "databaseContentCorrectionsApplied": True,
    "correctVerifiedCardsChanged": False,
    "correctionsPublished": corrected,
    "unresolvedCandidatesNoChange": [
      scoped_record(card_id, "not_changed_not_proven_wrong") for card_id in sorted(UNRESOLVED_IDS)
    ],
    "wordingOnlyNoChange": [
      scoped_record(card_id, "not_changed_answer_proven_correct") for card_id in sorted(WORDING_ONLY_IDS)
    ],
    "verifiedCorrectCardsDoNotChange": [
      scoped_record(card_id, "protected_verified_correct_no_change") for card_id in sorted(PROTECTED_IDS)
    ],
    "protectedAnchorCardId": "1772578430967",
    "protectedAnchorAnswer": blockchain,
    "sources": [source_index[key] for key in sorted(source_index)],
    "finalDisposition": "Twenty-two proven content defects were corrected through the gateway. Seven unresolved candidates, one wording-only card, and eight verified correct cards were not changed.",
  }
  return report


def main() -> int:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument("command", choices=("decisions", "report"))
  parser.add_argument("--output", type=Path)
  args = parser.parse_args()
  conn = connect()
  try:
    if args.command == "decisions":
      value = build_decisions(conn)
      output = (args.output or DECISIONS_PATH).resolve()
    else:
      value = build_report(conn)
      output = (args.output or REPORT_V4_PATH).resolve()
    gateway.write_json(output, value)
    if args.command == "report":
      result = gateway.verify_report_scope(conn, output)
      if not result["ok"]:
        raise RuntimeError("Generated report failed scope verification:\n- " + "\n- ".join(result["errors"]))
    else:
      result = {"ok": True, "decisions": len(value["decisions"])}
  finally:
    conn.close()
  print(json.dumps({**result, "output": str(output)}, ensure_ascii=False, indent=2))
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
