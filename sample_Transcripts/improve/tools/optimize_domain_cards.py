#!/usr/bin/env python3
"""Plan, apply, and validate the reviewed SY0-701 domain-card optimization."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import time
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
IMPROVE = ROOT / "sample_Transcripts" / "improve"
DB = ROOT / "card-sync-server" / "sync.db"
BACKUP = IMPROVE / "snapshots" / "sync-before-domain-card-audit.db"
UNMAPPED_PHASE_BACKUP = IMPROVE / "snapshots" / "sync-before-unmapped-resolution.db"
BASELINE = IMPROVE / "snapshots" / "domain-cards-baseline.json"
MANIFEST = IMPROVE / "snapshots" / "manifest.json"
REQUIREMENTS = ROOT / "card_pwa" / "content" / "sy0-701" / "generated" / "sy0-701-requirements.json"
PLAN = IMPROVE / "work" / "optimization-plan.json"
REPORTS = IMPROVE / "reports"

STATUS_RANK = {"unmapped": 0, "objective_mismatch": 1, "improve": 2, "keep": 3}
ANCHOR_RANK = {"keep": 0, "objective_mismatch": 1, "improve": 2, "unmapped": 3}

# These English descriptions replace absent, ambiguous, fragmentary, or
# demonstrably off-topic possibleQuestion material. They do not alter the
# immutable distilledContent source.
CLUE_OVERRIDES = {
    "req:sy0701:v7:1.1:control-types:compensating": "The preferred control cannot be implemented, so an alternative control is selected to provide comparable risk reduction.",
    "req:sy0701:v7:1.2:authentication-authorization-and-accounting-aaa:authorization-models": "Access decisions are made through defined models such as role-based, rule-based, mandatory, discretionary, or attribute-based access control.",
    "req:sy0701:v7:1.2:zero-trust:data-plane:implicit-trust-zones": "A legacy network segment grants access based mainly on location; Zero Trust seeks to remove this assumption of trust.",
    "req:sy0701:v7:1.2:physical-security:fencing": "A perimeter barrier deters entry, channels people toward controlled gates, and increases the time required to reach a facility.",
    "req:sy0701:v7:1.2:physical-security:access-badge": "A user presents an issued credential at a reader so the organization can authorize and log physical entry.",
    "req:sy0701:v7:1.2:physical-security:lighting": "Illumination around entrances and parking areas improves visibility, deters intruders, and supports camera recording.",
    "req:sy0701:v7:1.2:physical-security:sensors:pressure": "A floor mat or buried device triggers when weight is applied in a protected area.",
    "req:sy0701:v7:1.2:physical-security:sensors:microwave": "A sensor emits radio waves and detects movement from changes in the reflected signal.",
    "req:sy0701:v7:1.3:business-processes-impacting-security-operation:ownership": "A named person is made accountable for a proposed change, including its implementation and outcome.",
    "req:sy0701:v7:1.3:business-processes-impacting-security-operation:maintenance-window": "A disruptive production change is scheduled for an approved low-impact period with staff available to recover the service.",
    "req:sy0701:v7:1.3:business-processes-impacting-security-operation:standard-operating-procedure": "Operators need a documented, repeatable sequence for performing a routine security task consistently.",
    "req:sy0701:v7:1.3:technical-implications:restricted-activities": "A change plan identifies actions that are prohibited because they could violate policy, law, safety requirements, or system constraints.",
    "req:sy0701:v7:1.3:technical-implications:dependencies": "Before a service is changed, the team identifies upstream and downstream components that may also be affected.",
    "req:sy0701:v7:1.4:encryption:level:volume": "Encryption protects an entire logical storage volume rather than only selected files or database fields.",
    "req:sy0701:v7:1.4:encryption:algorithms": "A defined mathematical procedure transforms plaintext into ciphertext and reverses it with the appropriate key.",
    "req:sy0701:v7:1.4:certificates:third-party": "A certificate issued by an external trusted certificate authority can be validated through an established public trust chain.",
    "req:sy0701:v7:2.1:attributes-of-actors:level-of-sophistication-capability": "Analysts distinguish an actor who uses public tools from one capable of developing custom exploits and maintaining stealthy access.",
    "req:sy0701:v7:2.1:motivations:service-disruption": "The attacker seeks to make a target service unavailable rather than steal money or information.",
    "req:sy0701:v7:2.1:motivations:ethical": "An authorized researcher investigates weaknesses with the intent to improve security rather than cause harm.",
    "req:sy0701:v7:2.1:motivations:disruption-chaos": "The actor's goal is widespread disorder and interruption, without requiring a financial or espionage objective.",
    "req:sy0701:v7:2.1:motivations:war": "A state-linked campaign supports armed conflict by degrading an adversary's critical systems.",
    "req:sy0701:v7:2.2:human-vectors-social-engineering:brand-impersonation": "A malicious site copies a trusted company's name, logo, and visual design to trick customers into submitting credentials.",
    "req:sy0701:v7:2.3:operating-system-os-based": "An attacker exploits a weakness in the operating system itself rather than in a business application.",
    "req:sy0701:v7:2.3:misconfiguration": "A secure feature exists, but an unsafe setting such as public storage access exposes the system.",
    "req:sy0701:v7:2.4:physical-attacks:brute-force": "An intruder uses physical force or destructive tools to defeat a lock or barrier.",
    "req:sy0701:v7:2.4:indicators:blocked-content": "Security controls repeatedly deny a user's attempts to reach prohibited sites or files, creating an indicator for investigation.",
    "req:sy0701:v7:2.4:indicators:published-documented": "Defenders learn that an indicator has been formally published or documented and can use it during investigation.",
    "req:sy0701:v7:2.4:indicators:missing-logs": "Expected audit records disappear or are disabled, suggesting tampering or a failure in telemetry collection.",
    "req:sy0701:v7:2.5:monitoring": "After a mitigation is deployed, telemetry is continuously observed to confirm effectiveness and detect renewed activity.",
    "req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:on-premises": "The organization owns and operates the facilities and hardware, so it retains responsibility for their physical and technical security.",
    "req:sy0701:v7:3.1:considerations:patch-availability": "A product is evaluated on whether its vendor releases timely fixes for newly discovered vulnerabilities.",
    "req:sy0701:v7:3.2:secure-communication-access:virtual-private-network-vpn": "A remote employee needs an encrypted tunnel across an untrusted network into the organization's private network.",
    "req:sy0701:v7:3.2:secure-communication-access:remote-access": "An administrator must securely reach an internal system from outside the organization's local network.",
    "req:sy0701:v7:3.2:selection-of-effective-controls": "The architect compares risk, requirements, cost, and operational constraints before choosing safeguards that address the identified threat.",
    "req:sy0701:v7:3.3:data-classifications:sensitive": "Disclosure could harm the organization or an individual, so the information needs protection beyond public data.",
    "req:sy0701:v7:3.3:data-classifications:confidential": "Only specifically authorized personnel may access important non-public business information.",
    "req:sy0701:v7:3.3:data-classifications:restricted": "The organization's most tightly controlled information is limited to a very small set of authorized users.",
    "req:sy0701:v7:3.3:methods-to-secure-data:obfuscation": "Code or data is deliberately made difficult for a person to understand while remaining usable by the system.",
    "req:sy0701:v7:3.4:testing:parallel-processing": "During a recovery test, the alternate environment runs alongside the primary environment without taking production offline.",
    "req:sy0701:v7:3.4:backups:encryption": "Backup media is protected cryptographically so stolen copies cannot be read without the key.",
    "req:sy0701:v7:4.1:hardening-targets:iot-devices": "A connected device ships with default credentials, infrequent firmware updates, and unnecessary exposed services.",
    "req:sy0701:v7:4.1:wireless-devices:installation-considerations:heat-maps": "A visual survey shows wireless signal strength and coverage so access-point placement and dead zones can be evaluated without relying on a fixed color convention.",
    "req:sy0701:v7:4.1:mobile-solutions:connection-methods:cellular": "A mobile device connects through a carrier network rather than local Wi-Fi, Bluetooth, or USB.",
    "req:sy0701:v7:4.3:identification-methods:threat-feed:proprietary-third-party": "A commercial provider supplies curated threat intelligence available only to subscribers.",
    "req:sy0701:v7:4.3:analysis:environmental-variables": "Analysts adjust a vulnerability's priority because the affected asset is internet-facing, business-critical, and protected by few compensating controls.",
    "req:sy0701:v7:4.3:analysis:industry-organizational-impact": "A finding is prioritized according to the harm it could cause to this organization and its industry obligations.",
    "req:sy0701:v7:4.3:analysis:risk-tolerance": "The team compares a vulnerability's residual risk with the amount of risk the organization is prepared to accept.",
    "req:sy0701:v7:4.3:vulnerability-response-and-remediation:exceptions-and-exemptions": "A vulnerability cannot be remediated normally, so a formally approved deviation records its duration, owner, risk, and compensating controls.",
    "req:sy0701:v7:4.4:monitoring-computing-resources:systems": "Security telemetry from servers and endpoints is observed for availability, configuration changes, and suspicious activity.",
    "req:sy0701:v7:4.4:tools:agents-agentless": "One monitoring design installs software on each endpoint; the other collects data remotely without a local component.",
    "req:sy0701:v7:4.5:implementation-of-secure-protocols:transport-method": "The team selects a protected transport such as TLS or an encrypted tunnel appropriate to how the data must travel.",
    "req:sy0701:v7:4.5:dns-filtering": "DNS requests for known malicious domains are blocked before clients receive an address to connect to.",
    "req:sy0701:v7:4.5:email-security:gateway": "Inbound and outbound mail passes through a control that filters spam, malware, malicious links, and policy violations.",
    "req:sy0701:v7:4.6:attestation": "A device presents cryptographically backed evidence of its boot state and integrity before access is granted.",
    "req:sy0701:v7:4.6:multifactor-authentication:implementations:hard-soft-authentication-tokens": "The organization compares a dedicated physical token with a software token generated on a general-purpose device.",
    "req:sy0701:v7:4.6:password-concepts:password-best-practices:reuse": "A user must not use the same password for multiple accounts because one breach could expose every reused credential.",
    "req:sy0701:v7:4.6:password-concepts:password-best-practices:expiration": "The password policy defines when credentials expire, with changes driven by organizational policy and evidence of compromise.",
    "req:sy0701:v7:4.7:use-cases-of-automation-and-scripting:security-groups": "Automation consistently adds and removes network security-group rules as workloads are provisioned and retired.",
    "req:sy0701:v7:4.7:use-cases-of-automation-and-scripting:continuous-integration-and-testing": "Each code change automatically triggers a build and security tests so defects are found before release.",
    "req:sy0701:v7:4.7:benefits:scaling-in-a-secure-manner": "Automation applies the same approved controls as infrastructure expands to many additional workloads.",
    "req:sy0701:v7:4.7:benefits:employee-retention": "Automating repetitive work lets skilled analysts focus on higher-value tasks, reducing burnout and turnover.",
    "req:sy0701:v7:4.8:process:containment": "Responders isolate affected hosts and block malicious communication to prevent an incident from spreading.",
    "req:sy0701:v7:5.1:policies:change-management": "Management requires every change to be assessed, approved, documented, tested, and provided with a rollback plan.",
    "req:sy0701:v7:5.1:standards:password": "A mandatory password standard defines measurable requirements such as minimum length, allowed authentication methods, and reset handling.",
    "req:sy0701:v7:5.1:standards:access-control": "A mandatory access-control standard defines approved models and minimum authorization requirements across the organization.",
    "req:sy0701:v7:5.1:standards:physical-security": "A mandatory physical-security standard defines requirements for badges, locks, visitor escorts, and facility protection.",
    "req:sy0701:v7:5.1:standards:encryption": "A mandatory encryption standard specifies approved algorithms, key lengths, key management, and protection for each data state.",
    "req:sy0701:v7:5.1:procedures:playbooks": "A documented sequence tells responders exactly what to do for a specific event and can be implemented as an automated runbook.",
    "req:sy0701:v7:5.1:types-of-governance-structures:committees": "A group of subject-matter experts implements a board's direction within a defined area and reports its work back to the board.",
    "req:sy0701:v7:5.2:risk-analysis:annualized-rate-of-occurrence-aro": "Historical data indicates an event is expected once every five years, producing an annual frequency of 0.2.",
    "req:sy0701:v7:5.2:risk-analysis:likelihood": "Analysts express the chance of an event qualitatively as rare, possible, likely, or almost certain.",
    "req:sy0701:v7:5.2:risk-analysis:impact": "Analysts estimate the operational, safety, reputational, and financial harm if a risk event occurs.",
    "req:sy0701:v7:5.2:risk-register:risk-threshold": "A predefined boundary triggers a required response when measured risk exceeds the organization's tolerated level.",
    "req:sy0701:v7:5.3:vendor-selection:conflict-of-interest": "A decision-maker receives gifts from a bidder, creating a personal interest that could improperly influence vendor selection.",
    "req:sy0701:v7:5.4:compliance-monitoring:attestation-and-acknowledgement": "An accountable party formally signs to confirm a compliance statement or acknowledge security-policy responsibilities.",
    "req:sy0701:v7:5.4:compliance-monitoring:internal-and-external": "The organization combines its own continuous checks with independent or regulator-facing review to obtain both perspectives on compliance.",
    "req:sy0701:v7:5.4:privacy:data-subject": "Under privacy law, the identified or identifiable natural person to whom personal data relates holds rights over that data.",
    "req:sy0701:v7:5.4:privacy:controller-vs-processor": "One party determines the purposes and means of processing; the other processes personal data on that party's instructions.",
    "req:sy0701:v7:5.4:privacy:ownership": "A designated role holds overall accountability and decision authority for an organizational data set.",
    "req:sy0701:v7:5.4:privacy:right-to-be-forgotten": "A person requests deletion of personal data when the applicable legal conditions are satisfied.",
    "req:sy0701:v7:5.5:penetration-testing:integrated": "A coordinated test combines physical, offensive, and defensive activities with feedback between the participating teams.",
    "req:sy0701:v7:5.6:phishing:recognizing-a-phishing-attempt": "A message uses urgency, a look-alike sender domain, and an unexpected request for credentials.",
    "req:sy0701:v7:5.6:user-guidance-and-training:removable-media-and-cables": "Training tells users not to connect unknown USB media or untrusted charging cables and to use only approved, protected devices.",
    "req:sy0701:v7:5.6:reporting-and-monitoring:initial": "The organization performs a first awareness assessment to establish a baseline before recurring measurements begin.",
    "req:sy0701:v7:1.3:business-processes-impacting-security-operation:impact-analysis": "Before approving a change, the team evaluates its likely effects on business services, security, users, and dependent systems.",
    "req:sy0701:v7:1.3:business-processes-impacting-security-operation:test-results": "Recorded test evidence shows whether a proposed change works and whether its security controls remain effective.",
    "req:sy0701:v7:1.3:technical-implications:downtime": "The change may make a service unavailable, so the plan accounts for the duration and business effect of that outage.",
    "req:sy0701:v7:2.1:motivations:philosophical-political-beliefs": "An actor attacks an organization to advance an ideology or political cause rather than for direct financial gain.",
    "req:sy0701:v7:2.1:motivations:revenge": "A disgruntled former employee damages systems in retaliation for being dismissed.",
    "req:sy0701:v7:2.2:message-based:email": "A phishing lure reaches its victim through an electronic-mail message.",
    "req:sy0701:v7:2.2:image-based": "Malicious content or hidden instructions are embedded in an image to evade ordinary inspection.",
    "req:sy0701:v7:2.2:file-based": "A malicious payload is delivered inside a document, archive, or other downloadable file.",
    "req:sy0701:v7:2.4:indicators:out-of-cycle-logging": "Log activity appears outside expected operational, patch, or change windows and therefore warrants investigation.",
    "req:sy0701:v7:3.3:data-types:humanand-non-human-readable": "The team distinguishes information readable directly by people from binary or encoded data intended for machine processing.",
    "req:sy0701:v7:3.3:data-classifications:public": "The data owner has approved the information for general distribution, so it has no confidentiality restriction even though integrity still matters.",
    "req:sy0701:v7:3.3:methods-to-secure-data:masking": "A display hides selected characters of a sensitive value, such as showing only the last four digits of an account number.",
    "req:sy0701:v7:4.1:mobile-solutions:connection-methods:wi-fi": "A mobile device joins a local wireless LAN and must account for rogue access points, eavesdropping, and untrusted public hotspots.",
    "req:sy0701:v7:4.1:hardening-targets:workstations": "Desktop and laptop endpoints are patched, unnecessary services are disabled, and endpoint protection is enforced.",
    "req:sy0701:v7:4.1:hardening-targets:switches": "Network switches have unused ports disabled, management access restricted, and secure VLAN and port-security settings applied.",
    "req:sy0701:v7:4.1:hardening-targets:routers": "Routing devices use changed default credentials, restricted management interfaces, updated firmware, and only necessary services.",
    "req:sy0701:v7:4.1:hardening-targets:cloud-infrastructure": "Cloud resources are hardened with least-privilege identities, secure configuration baselines, logging, and restricted network access.",
    "req:sy0701:v7:4.1:wireless-security-settings:authentication-protocols": "A wireless deployment selects an authentication protocol such as EAP to verify identities before network access.",
    "req:sy0701:v7:4.6:permission-assignments-and-implications": "An administrator evaluates how granting an entitlement could expose data or functions beyond the user's job requirements.",
    "req:sy0701:v7:4.3:identification-methods:threat-feed:information-sharing-organization": "Organizations participate in a trusted group that standardizes and exchanges threat indicators among its members.",
    "req:sy0701:v7:4.8:process:detection": "Logs and security alerts are monitored to recognize that a potential incident has occurred and separate it from routine noise.",
    "req:sy0701:v7:4.8:training": "Incident-response personnel learn and practice their assigned duties before a real incident occurs.",
    "req:sy0701:v7:4.8:testing:tabletop-exercise": "Participants discuss their actions in a facilitated scenario without performing a live technical attack.",
    "req:sy0701:v7:4.7:other-considerations:ongoing-supportability": "An automated security solution must remain maintainable, documented, updated, and supported as technology and threats change.",
    "req:sy0701:v7:5.2:risk-assessment:continuous": "Risk signals are assessed as part of day-to-day operations, often with automated monitoring rather than a periodic snapshot.",
    "req:sy0701:v7:5.2:risk-appetite:conservative": "The organization favors low-risk choices and preservation of current operations over aggressive high-return growth.",
    "req:sy0701:v7:5.2:risk-management-strategies:accept:exemption": "A formally approved, enduring deviation removes a requirement because compliance is considered impracticable; unlike an exception, it is not merely time-limited.",
    "req:sy0701:v7:5.3:agreement-types:work-order-wo-statement-of-work-sow": "A project-specific document under a broader agreement defines the work, deliverables, responsibilities, and timeline.",
    "req:sy0701:v7:5.4:compliance-reporting:internal": "A structured report informs the organization's own leadership and stakeholders about compliance status and control performance.",
    "req:sy0701:v7:5.5:external:assessment": "An outside assessor identifies and prioritizes security gaps and recommends improvements rather than issuing only a formal audit measurement.",
    "req:sy0701:v7:5.6:phishing:responding-to-reported-suspicious-messages": "After users report a suspicious message, the security team analyzes it, updates filters, removes matching messages, and warns affected staff.",
    "req:sy0701:v7:4.9:data-sources:vulnerability-scans": "An automated assessment reports known weaknesses and misconfigurations as an input to security analysis.",
}


IMPROVEMENT_CLUES = {
    "1728581782664": "A digitally signed message lets a recipient demonstrate who originated it and makes later denial of that action difficult.",
    "1728582261940": "During sign-in, the system verifies that a claimed human identity is genuine before making an access decision.",
    "1728595373661": "Access is granted only after current identity, device, context, and policy signals are explicitly evaluated; network location alone creates no trust.",
    "1728666406964": "A sender encrypts data with the recipient's shareable key so only the corresponding private key can decrypt it.",
    "1728669901392": "A password-derived key function deliberately performs many iterative hash or memory-hard operations to make guessing more expensive.",
    "1728832246367": "A client validates the certificate chain, hostname, validity period, and revocation status before trusting a certificate issued by a certificate authority.",
    "1728833274722": "A certificate is signed with its own private key rather than by a separate internal or public certificate authority.",
    "1728834325821": "A client asks an online responder whether a particular certificate is still valid instead of downloading a complete revocation list.",
    "1728834357184": "A client downloads a certificate authority's signed list of revoked certificate serial numbers for local checking.",
    "1772576852434": "An offline root certificate authority delegates routine certificate issuance to an intermediate authority, reducing exposure of the root key.",
    "1772577765991": "A certificate-status request identifies the issuer and certificate serial number so an OCSP responder can return that certificate's status.",
    "1772577838735": "A large camera deployment sends recordings to centralized storage so footage can be retained, searched, and protected consistently.",
    "1772578430967": "Participants use consensus to append hash-linked blocks, making a later change evident because it would break the subsequent chain.",
    "1772578458651": "Only one complete database record is encrypted as a unit rather than an entire table, column, or disk.",
    "1772578485545": "A Zero Trust data-plane decision distinguishes the requesting human identity from the non-human device or workload making the request.",
    "1779669260168": "A storage device performs encryption in its own controller so the entire disk is protected transparently with hardware-managed keys.",
    "1728935077569": "A third party remotely administers many customers' systems with privileged access, making compromise of that provider a supply-chain risk.",
    "1729004574263": "One false claim is shared accidentally, while another is created and distributed deliberately to deceive an audience.",
    "1729008958156": "Unsanitized input changes the structure of a database query and lets an attacker read or modify data outside the intended command.",
    "1729010233588": "Untrusted input is returned to a web page without context-appropriate output encoding, causing script to execute in another user's browser.",
    "1729011152083": "A developer prevents injected browser script by applying context-appropriate output encoding and complementary input validation.",
    "1729016466796": "The vendor has ended the product's supported lifecycle, so security fixes and normal support are no longer available.",
    "1729016997815": "Persistent low-level code stored on a device initializes and controls its hardware without necessarily being a full operating system.",
    "1729018727159": "A publicly exposed cloud storage policy or overly permissive cloud identity role creates a weakness specific to cloud configuration.",
    "1729019182230": "An application writes past an allocated memory buffer, corrupting adjacent memory and potentially changing control flow.",
    "1729097089990": "Malware encrypts or steals data and demands payment; tested offline backups can support recovery without satisfying the extortion demand.",
    "1729098302259": "Malicious code attaches to a host file and replicates when a user executes the infected host.",
    "1729098545424": "Software covertly monitors activity and collects user or system information without informed authorization.",
    "1729105178993": "Malware modifies local name-resolution settings so a trusted hostname resolves to an attacker-controlled address.",
    "1729186709321": "An endpoint control observes host activity and automatically blocks a malicious action before it succeeds.",
    "1772662005004": "An organization grants a managed service provider privileged remote access and therefore applies strong authentication, monitoring, and contractual controls to that provider.",
    "1772662005058": "An attacker spoofs the victim's address in requests to third-party systems, causing their replies to be reflected toward the victim.",
    "1772662005062": "An attacker delivers malicious links and files through an organization's real-time chat platform.",
    "1772662005096": "Attackers exploit a newly discovered vulnerability before a timely fix or effective defense is available, regardless of when the vendor first learned of it.",
    "1772662005168": "A criminal syndicate with no authorized role in the target organization conducts a coordinated extortion campaign.",
    "1729192837629": "The cloud provider abstracts server management while short-lived functions run on demand and scale in response to events.",
    "1729196325940": "Multiple isolated applications share the host operating-system kernel, unlike virtual machines that each run a guest operating system.",
    "1729198761986": "A platform increases capacity when demand rises and can reduce it again afterward; this is a mechanism for handling growth.",
    "1729435542513": "Participants discuss decisions and communications for a simulated disruption in a facilitated session without activating production recovery systems.",
    "1773526588617": "A workload needs long-running stateful processing with predictable low latency, making short-lived event-driven serverless functions a poor fit.",
    "1773526588618": "Centralized software-defined networking programs consistent policy across many network devices as the environment scales.",
    "1773526588635": "A cryptographic digest changes when input changes and is designed to make finding two inputs with the same digest impractical, not impossible.",
    "1773536533025": "One firewall decision uses ports and transport-layer information; the other understands application-layer content and behavior.",
    "1773536533030": "Sensitive data is actively being processed in memory or by a CPU, so a secure enclave protects it while in use.",
    "1779669260166": "A cloud-delivered edge architecture combines SD-WAN connectivity with security services such as secure web gateway and zero-trust access.",
    "1779669260193": "A safety-critical controller must respond within deterministic deadlines, so it uses an operating system designed for predictable real-time scheduling.",
    "1729095773945": "Administrators use one platform to enforce mobile-device policy, verify compliance, deploy configuration, and selectively wipe corporate data.",
    "1729184967597": "A platform aggregates logs from many sources and correlates events so analysts can investigate and alert from a central view.",
    "1729185236521": "An endpoint platform detects suspicious behavior, supports investigation, and can isolate the affected host; broader cross-domain correlation would be XDR.",
    "1729611199039": "A user authenticates with a FIDO2 credential whose private key is protected by hardware; no reusable password is sent to the service.",
    "1779669260173": "A wireless encryption protocol uses AES for confidentiality and CBC-MAC for integrity as part of CCMP.",
    "1779669260180": "A receiving mail server retrieves a sender-domain public key from DNS and verifies the message's cryptographic signature.",
    "1779669260181": "A receiving mail server compares the sending IP address with the domain's DNS-published list of authorized senders.",
    "1779669260182": "A receiving domain evaluates SPF or DKIM alignment, applies a published handling policy, and sends aggregate reports.",
    "1779669260183": "Members of a threat-sharing organization represent indicators in the structured STIX data model before exchanging them.",
    "1779669260184": "Members of a threat-sharing organization use TAXII services to transport standardized STIX threat-intelligence data.",
    "1779669260190": "Employees select a mobile device from an organization-approved list; the scenario makes no assumption about ownership beyond that choice model.",
    "1779669260191": "The organization owns and manages the phone but permits personal use under policy, retaining defined management and wipe rights.",
    "1779669260192": "An employee-owned phone accesses corporate data, so policy must balance organizational controls such as selective wipe with personal privacy.",
    "1729706672664": "A risk has a $20,000 single-loss expectancy and is expected twice per year, producing a $40,000 annualized loss expectancy.",
    "1729706988234": "The organization defines the amount of variation around its risk objectives that it is able and prepared to bear.",
    "1729785486403": "A board-level group oversees the audit process, reviews internal-control findings, and reports audit matters to the board.",
    "1772922529740": "A web application firewall reduces the likelihood and impact of SQL injection while the service remains in operation.",
    "1772922529749": "A $100,000 asset would lose 30% of its value in one incident; the required risk factor is therefore 30%.",
    "1772922529765": "A regulator revokes the authorization required for a company to conduct its core business, so legal operation must stop.",
    "1772922529768": "A production change follows documented approval, testing, scheduling, implementation, verification, and rollback steps.",
    "1773007098192": "A vendor provides an evaluation performed by an outside assessor rather than relying only on its own claims.",
    "1773007098193": "Before a penetration test, both parties document written authorization, targets, exclusions, timing, and communication procedures.",
    "1773007098198": "A regulator or outside reviewer conducts a formal external review of selected compliance matters.",
    "1773007098201": "Two organizations document the purpose, roles, responsibilities, and agreed terms of their cooperation without relying on a universal assumption about legal enforceability.",
}

ANSWER_LABEL_OVERRIDES = {
    "1772662005168": "Organized crime — external actor",
    "1773526588618": "Software-defined networking (SDN) supporting scalability",
    "1779669260183": "Information-sharing organization using STIX",
    "1779669260184": "Information-sharing organization using TAXII",
}


def dump(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_sources() -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    requirements = json.loads(REQUIREMENTS.read_text(encoding="utf-8"))["requirements"]
    distilled: dict[str, dict[str, Any]] = {}
    for domain in range(1, 6):
        path = ROOT / "sample_Transcripts" / "Mapping_Knowledge" / f"domain-{domain}-requirement-mapping.json"
        for entry in json.loads(path.read_text(encoding="utf-8"))["entries"]:
            distilled[entry["requirementId"]] = entry
    baseline = json.loads(BASELINE.read_text(encoding="utf-8"))["cards"]
    reviewed: list[dict[str, Any]] = []
    for domain in range(1, 6):
        reviewed.extend(json.loads((IMPROVE / "work" / f"domain-{domain}-reviewed.json").read_text(encoding="utf-8"))["cards"])
    if len(requirements) != 655 or len(distilled) != 655 or len(baseline) != 751 or len(reviewed) != 751:
        raise RuntimeError("Unexpected source inventory count")
    return requirements, distilled, baseline, reviewed


def objective_domain(requirement: dict[str, Any]) -> int:
    return int(requirement["objectiveId"].split(".")[0])


def display_label(requirement: dict[str, Any]) -> str:
    parts = requirement["sourcePath"][2:]
    if len(parts) == 1:
        label = parts[0]
    else:
        label = f"{parts[-2]} — {parts[-1]}"
    return label.replace("Humanand non-human-readable", "Human- and non-human-readable")


def clean_sentence(value: str) -> str:
    value = re.sub(r"\s+", " ", value.strip())
    replacements = {
        "cyber security": "cybersecurity",
        "riskmanagement": "risk-management",
        "incident incident": "incident",
        "Where's the": "What is the",
        "Where is the": "What is the",
        "HIPPA": "HIPAA",
        "vaultting": "vaulting",
        "eiscocovery": "e-discovery",
        "subject to is subject to": "subject to",
        "to or in order to": "to",
        "consists of network": "consists of a network",
    }
    for old, new in replacements.items():
        value = value.replace(old, new)
    value = re.sub(r"\buh\b", "", value, flags=re.I)
    value = re.sub(r"\s+", " ", value).strip()
    value = re.sub(r"\b(\w+)\s+\1\b", r"\1", value, flags=re.I)
    if value and value[-1] not in ".?!":
        value += "."
    return value[0].upper() + value[1:] if value else value


def possible_question(entry: dict[str, Any], requirement: dict[str, Any]) -> tuple[str, str]:
    rid = requirement["requirementId"]
    if rid in CLUE_OVERRIDES:
        return "description", clean_sentence(CLUE_OVERRIDES[rid])
    for key in ("possibleQuestion1", "possibleQuestion2", "possibleQuestion3"):
        candidate = entry.get(key)
        if not candidate:
            continue
        flags = set(candidate.get("qualityFlags") or [])
        if flags & {"ambiguous", "circular-definition", "scope-mismatch"}:
            continue
        question = clean_sentence(candidate.get("question") or "")
        answer = clean_sentence(candidate.get("answer") or "")
        if question.lower().startswith("what does ") and " stand for" in question.lower():
            continue
        if len(answer) < 20 and re.search(r"\b(this|their|it)\b", question, re.I) and len(question) < 85:
            continue
        answer_norm = set(re.findall(r"[a-z0-9]+", answer.lower())) - {"a", "an", "the"}
        label_norm = set(re.findall(r"[a-z0-9]+", requirement["sourcePath"][-1].lower())) - {"a", "an", "the"}
        essentially_label = bool(answer_norm and label_norm) and (
            answer_norm <= label_norm or label_norm <= answer_norm
        )
        if len(answer) >= 18 and not essentially_label:
            return "description", answer
        if question:
            return "direct", question
    raise RuntimeError(f"No reviewed English prompt material for {rid}")


def distractors_for(target: dict[str, Any], requirements: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rid = target["requirementId"]
    pools = [
        [r for r in requirements if r["sourcePath"][:-1] == target["sourcePath"][:-1]],
        [r for r in requirements if r["objectiveId"] == target["objectiveId"]],
        [r for r in requirements if objective_domain(r) == objective_domain(target)],
    ]
    result: list[dict[str, Any]] = []
    labels = {display_label(target)}
    seed = int(hashlib.sha256(rid.encode()).hexdigest()[:12], 16)
    for pool in pools:
        ordered = sorted(pool, key=lambda r: hashlib.sha256(f"{seed}:{r['requirementId']}".encode()).hexdigest())
        for candidate in ordered:
            label = display_label(candidate)
            if candidate["requirementId"] == rid or label in labels:
                continue
            result.append(candidate)
            labels.add(label)
            if len(result) == 3:
                return result
    raise RuntimeError(f"Could not create three unique distractors for {rid}")


def short_german(value: str, limit: int = 330) -> str:
    value = re.sub(r"\s+", " ", value.strip())
    if len(value) <= limit:
        return value
    sentence_cut = max(value.rfind(". ", 0, limit), value.rfind("! ", 0, limit), value.rfind("? ", 0, limit))
    if sentence_cut >= int(limit * 0.45):
        return value[: sentence_cut + 1]
    cut = value.rfind(" ", 0, limit - 1)
    return value[:cut] + " …"


def render_card(card_id: str, requirement_ids: list[str], requirements_by_id: dict[str, dict[str, Any]], distilled: dict[str, dict[str, Any]], clue_override: str | None = None) -> dict[str, Any]:
    target = requirements_by_id[requirement_ids[0]]
    if clue_override:
        mode, prompt = "description", clean_sentence(clue_override)
    else:
        mode, prompt = possible_question(distilled[target["requirementId"]], target)
    question = (
        f"Which SY0-701 concept best matches this description?\n\n{prompt}"
        if mode == "description"
        else prompt
    )
    distractors = distractors_for(target, list(requirements_by_id.values()))
    option_requirements = [target, *distractors]
    shift = int(card_id) % 4
    option_requirements = option_requirements[shift:] + option_requirements[:shift]
    labels = "ABCD"
    options = {label: display_label(req) for label, req in zip(labels, option_requirements)}
    correct_label = next(label for label, req in zip(labels, option_requirements) if req["requirementId"] == target["requirementId"])
    if card_id in ANSWER_LABEL_OVERRIDES:
        options[correct_label] = ANSWER_LABEL_OVERRIDES[card_id]
    front = question + "\n" + "\n".join(f"{label}: {options[label]}" for label in labels)
    target_text = " ".join(short_german(distilled[rid]["distilledContent"], 500) for rid in requirement_ids)
    back_lines = [
        f">> CORRECT: {correct_label} |",
        "",
        target_text,
        "",
        f"Prüfpunkt: Damit ist „{options[correct_label]}“ gemeint.",
        "",
        "Nicht:",
    ]
    for label, req in zip(labels, option_requirements):
        if label == correct_label:
            continue
        explanation = short_german(distilled[req["requirementId"]]["distilledContent"])
        back_lines.append(f"{label} | {explanation} Das beschreibt „{display_label(req)}“ und nicht „{options[correct_label]}“.")
    return {
        "front": front,
        "back": "\n".join(back_lines),
        "tags": ["SY0-701", f"Objective {target['objectiveId']}", target["sourcePath"][-2] if len(target["sourcePath"]) > 3 else target["sourcePath"][-1]],
        "extraJson": {"acronym": "", "examples": "", "port": "", "protocol": ""},
        "correctLabel": correct_label,
        "correctAnswer": options[correct_label],
        "question": question,
        "promptSource": "manual_override" if clue_override or target["requirementId"] in CLUE_OVERRIDES else "possibleQuestion_reauthored",
    }


def build_plan() -> dict[str, Any]:
    requirements, distilled, baseline, reviewed = load_sources()
    req_by_id = {r["requirementId"]: r for r in requirements}
    base_by_id = {c["cardId"]: c for c in baseline}
    review_by_id = {c["cardId"]: c for c in reviewed}
    by_requirement: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for card in reviewed:
        for rid in card["requirementIds"]:
            by_requirement[rid].append(card)
    uncovered = [r for r in requirements if r["requirementId"] not in by_requirement]

    con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    try:
        default_user = con.execute("SELECT user_id FROM users WHERE profile_name='Default'").fetchone()[0]
        deck_names = {
            row["id"]: row["name"]
            for row in con.execute("SELECT id, name FROM server_decks WHERE user_id=? AND deleted_at IS NULL", (default_user,))
        }
        existing_ids = {row[0] for row in con.execute("SELECT DISTINCT id FROM server_cards")}
    finally:
        con.close()

    rows: list[dict[str, Any]] = []
    for card_id in sorted(review_by_id, key=int):
        review = review_by_id[card_id]
        baseline_card = base_by_id[card_id]
        action = "keep"
        final_requirements = list(review["requirementIds"])
        target_deck = baseline_card["deckId"]
        rendered = None
        rationale = review["reviewNote"]
        fsrs = "retain"
        if review["status"] == "improve":
            action = "clarify"
            rendered = render_card(card_id, final_requirements, req_by_id, distilled, IMPROVEMENT_CLUES.get(card_id))
            rendered["tags"] = baseline_card["currentContent"]["tags"]
            rendered["extraJson"] = baseline_card["currentContent"]["extraJson"]
            rationale = review["reviewNote"]
            fsrs = "retain_same_requirement_clarity_fix"
        elif review["status"] == "objective_mismatch":
            action = "move"
            if not review.get("targetDeckId"):
                raise RuntimeError(f"Missing reviewed target deck for {card_id}")
            target_deck = review["targetDeckId"]
            fsrs = "retain_content_unchanged"
        rows.append({
            "cardId": card_id,
            "noteId": baseline_card["noteId"],
            "originalDomain": review["domain"],
            "originalDeckId": baseline_card["deckId"],
            "targetDeckId": target_deck,
            "auditStatus": review["status"],
            "initialRequirementIds": review["requirementIds"],
            "finalRequirementIds": final_requirements,
            "action": action,
            "rationale": rationale,
            "fsrsImpact": fsrs,
            "newContent": rendered,
        })

    comparison: list[dict[str, Any]] = []
    for row in rows:
        if row["newContent"]:
            question = row["newContent"]["question"]
            answer = row["newContent"]["correctAnswer"]
        else:
            parsed = base_by_id[row["cardId"]].get("parsedMc")
            if not parsed:
                continue
            question = parsed["question"]
            answer = parsed["correctAnswer"]
        key = normalize(question + " " + answer)
        comparison.append({"cardId": row["cardId"], "key": key, "tokens": set(key.split())})

    new_id_base = 1786384200000
    new_rows: list[dict[str, Any]] = []
    for index, requirement in enumerate(uncovered):
        card_id = str(new_id_base + index)
        if card_id in existing_ids or len(card_id) != 13 or not card_id.isdigit():
            raise RuntimeError(f"Invalid or colliding generated card ID: {card_id}")
        rid = requirement["requirementId"]
        content = render_card(card_id, [rid], req_by_id, distilled)
        target_deck = f"sy0-701-objective-{requirement['objectiveId'].replace('.', '-')}"
        if target_deck not in deck_names:
            raise RuntimeError(f"Missing target deck for new card: {target_deck}")
        content["tags"] = [re.sub(r"^\d+\.\d+\s+", "", deck_names[target_deck])]
        key = normalize(content["question"] + " " + content["correctAnswer"])
        tokens = set(key.split())
        exact = [item["cardId"] for item in comparison if item["key"] == key]
        near: list[dict[str, Any]] = []
        for item in comparison:
            union = tokens | item["tokens"]
            score = len(tokens & item["tokens"]) / len(union) if union else 1.0
            if score >= 0.88 and item["key"] != key:
                near.append({"cardId": item["cardId"], "jaccard": round(score, 4)})
        if exact:
            raise RuntimeError(f"Exact semantic duplicate for proposed card {card_id}: {exact}")
        new_rows.append({
            "cardId": card_id,
            "noteId": f"note-{card_id}",
            "targetDeckId": target_deck,
            "requirementId": rid,
            "officialObjective": requirement["objectiveId"],
            "content": content,
            "proofPreviouslyUntreated": "Die finale manuelle Bestandszuordnung vor Ergänzungen enthält für dieses Requirement keine cardId.",
            "duplicateCheck": {
                "comparedAgainstExistingAndPlannedCards": len(comparison),
                "normalizedExactMatches": [],
                "highSimilarityCandidates": near,
                "decision": "new_card_required_for_uncovered_atomic_requirement",
            },
            "fsrsImpact": "initialize_as_new_fsrs_card",
        })
        comparison.append({"cardId": card_id, "key": key, "tokens": tokens})

    final_coverage: dict[str, list[str]] = defaultdict(list)
    for row in rows:
        for rid in row["finalRequirementIds"]:
            final_coverage[rid].append(row["cardId"])
    for row in new_rows:
        final_coverage[row["requirementId"]].append(row["cardId"])
    missing = sorted(set(req_by_id) - set(final_coverage))
    if missing:
        raise RuntimeError(f"Plan still has uncovered requirements: {missing}")
    action_counts = Counter(row["action"] for row in rows)
    status_counts = Counter(row["auditStatus"] for row in rows)
    return {
        "schemaVersion": "sy0701-domain-optimization-plan-2",
        "policy": {
            "existingFirst": True,
            "existingCardsNeverRepurposedForUnrelatedKnowledge": True,
            "newCards": len(new_rows),
            "sourceHierarchy": ["CompTIA SY0-701 V7 objectives", "immutable distilledContent", "Messer explanation flow", "possibleQuestion/transcript ideas", "existing card schema"],
        },
        "counts": {
            "examinedExistingCards": len(rows),
            "finalDomainCards": len(rows) + len(new_rows),
            "requirements": len(requirements),
            "initialUniqueCoverage": len(by_requirement),
            "initialUncovered": len(uncovered),
            "status": dict(sorted(status_counts.items())),
            "existingActions": dict(sorted(action_counts.items())),
            "addedCards": len(new_rows),
            "finalUniqueCoverage": len(final_coverage),
        },
        "cards": rows,
        "addedCards": new_rows,
    }


def command_plan(_: argparse.Namespace) -> None:
    plan = build_plan()
    dump(PLAN, plan)
    print(json.dumps({"path": str(PLAN), "counts": plan["counts"]}, indent=2))


def scheduling_reset(profile_name: str, card_id: str) -> dict[str, Any]:
    if profile_name == "Default":
        return {"type": 0, "queue": 0, "due": 0, "due_at": int(card_id), "interval": 0, "factor": 2500, "stability": 1.0, "difficulty": 5.0, "retrievability": None, "reps": 0, "lapses": 0, "algorithm": "fsrs", "learning_step": None, "last_reviewed_at": None}
    if profile_name == "Vlad":
        return {"type": 0, "queue": 0, "due": 20641, "due_at": 1783382400000, "interval": 0, "factor": 2500, "stability": 0.0, "difficulty": 0.0, "retrievability": None, "reps": 0, "lapses": 0, "algorithm": "fsrs", "learning_step": None, "last_reviewed_at": None}
    raise RuntimeError(f"Unknown profile for scheduling reset: {profile_name}")


def command_apply(_: argparse.Namespace) -> None:
    if not BACKUP.exists() or not PLAN.exists():
        raise RuntimeError("Baseline backup and optimization plan are required")
    plan = json.loads(PLAN.read_text(encoding="utf-8"))
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    snapshot = sqlite3.connect(BACKUP)
    snapshot.row_factory = sqlite3.Row
    try:
        live_rows = [dict(r) for r in con.execute("SELECT * FROM server_cards ORDER BY user_id, id")]
        snapshot_rows = [dict(r) for r in snapshot.execute("SELECT * FROM server_cards ORDER BY user_id, id")]
        if live_rows != snapshot_rows:
            raise RuntimeError("Live card rows no longer match the reviewed baseline; refusing to overwrite drift")
        profiles = {r["user_id"]: r["profile_name"] for r in con.execute("SELECT user_id, profile_name FROM users")}
        if set(profiles.values()) != {"Default", "Vlad"}:
            raise RuntimeError(f"Unexpected profiles: {profiles}")
        for row in plan["cards"]:
            for user_id, profile_name in profiles.items():
                deck_exists = con.execute(
                    "SELECT 1 FROM server_decks WHERE user_id=? AND id=? AND deleted_at IS NULL",
                    (user_id, row["targetDeckId"]),
                ).fetchone()
                if not deck_exists:
                    raise RuntimeError(f"Missing target deck: {profile_name}/{row['targetDeckId']}")
        for row in plan["addedCards"]:
            for user_id, profile_name in profiles.items():
                deck_exists = con.execute(
                    "SELECT 1 FROM server_decks WHERE user_id=? AND id=? AND deleted_at IS NULL",
                    (user_id, row["targetDeckId"]),
                ).fetchone()
                if not deck_exists:
                    raise RuntimeError(f"Missing new-card target deck: {profile_name}/{row['targetDeckId']}")
                collision = con.execute(
                    "SELECT 1 FROM server_cards WHERE user_id=? AND (id=? OR note_id=?)",
                    (user_id, row["cardId"], row["noteId"]),
                ).fetchone()
                if collision:
                    raise RuntimeError(f"New card or note ID collision: {profile_name}/{row['cardId']}")
        now = int(time.time() * 1000)
        con.execute("BEGIN IMMEDIATE")
        for row in plan["cards"]:
            if row["action"] == "keep":
                continue
            for user_id, profile_name in profiles.items():
                existing = con.execute("SELECT note_id FROM server_cards WHERE user_id=? AND id=? AND is_deleted=0", (user_id, row["cardId"])).fetchone()
                if existing is None or existing["note_id"] != row["noteId"]:
                    raise RuntimeError(f"Missing card or note ID drift: {profile_name}/{row['cardId']}")
                values: dict[str, Any] = {"deck_id": row["targetDeckId"], "updated_at": now}
                if row["newContent"]:
                    values.update({
                        "front": row["newContent"]["front"],
                        "back": row["newContent"]["back"],
                        "tags_json": json.dumps(row["newContent"]["tags"], ensure_ascii=False, separators=(",", ":")),
                        "extra_json": json.dumps(row["newContent"]["extraJson"], ensure_ascii=False, separators=(",", ":")),
                    })
                assignments = ", ".join(f"{column}=?" for column in values)
                con.execute(f"UPDATE server_cards SET {assignments} WHERE user_id=? AND id=?", (*values.values(), user_id, row["cardId"]))
        for row in plan["addedCards"]:
            for user_id, profile_name in profiles.items():
                schedule = scheduling_reset(profile_name, row["cardId"])
                values = {
                    "id": row["cardId"],
                    "note_id": row["noteId"],
                    "deck_id": row["targetDeckId"],
                    "front": row["content"]["front"],
                    "back": row["content"]["back"],
                    "tags_json": json.dumps(row["content"]["tags"], ensure_ascii=False, separators=(",", ":")),
                    "extra_json": json.dumps(row["content"]["extraJson"], ensure_ascii=False, separators=(",", ":")),
                    **schedule,
                    "metadata_json": "{}",
                    "is_deleted": 0,
                    "created_at": int(row["cardId"]),
                    "updated_at": now,
                    "deleted_at": None,
                    "last_source_client": "card-qa-audit-v1",
                    "user_id": user_id,
                }
                columns = ", ".join(values)
                placeholders = ", ".join("?" for _ in values)
                con.execute(f"INSERT INTO server_cards ({columns}) VALUES ({placeholders})", tuple(values.values()))
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        snapshot.close()
        con.close()
    print(json.dumps({
        "database": str(DB),
        "existingActions": plan["counts"]["existingActions"],
        "addedCards": plan["counts"]["addedCards"],
    }, indent=2))


def command_restore(_: argparse.Namespace) -> None:
    """Restore only the audited existing-card rows after a rejected draft apply."""
    if not BACKUP.exists() or not PLAN.exists():
        raise RuntimeError("Baseline backup and applied draft plan are required")
    plan = json.loads(PLAN.read_text(encoding="utf-8"))
    card_ids = [row["cardId"] for row in plan["cards"]]
    live = sqlite3.connect(DB)
    snap = sqlite3.connect(BACKUP)
    live.row_factory = snap.row_factory = sqlite3.Row
    fields = [row["name"] for row in snap.execute("PRAGMA table_info(server_cards)") if row["name"] not in {"id", "user_id"}]
    try:
        live.execute("BEGIN IMMEDIATE")
        restored = 0
        for added in plan.get("addedCards", []):
            live.execute("DELETE FROM server_cards WHERE id=?", (added["cardId"],))
        for user in snap.execute("SELECT user_id FROM users ORDER BY user_id"):
            user_id = user["user_id"]
            for card_id in card_ids:
                source = snap.execute("SELECT * FROM server_cards WHERE user_id=? AND id=?", (user_id, card_id)).fetchone()
                target = live.execute("SELECT 1 FROM server_cards WHERE user_id=? AND id=?", (user_id, card_id)).fetchone()
                if source is None or target is None:
                    raise RuntimeError(f"Cannot restore missing row {user_id}/{card_id}")
                assignments = ", ".join(f"{field}=?" for field in fields)
                live.execute(
                    f"UPDATE server_cards SET {assignments} WHERE user_id=? AND id=?",
                    (*(source[field] for field in fields), user_id, card_id),
                )
                restored += 1
        live.commit()
        live_rows = [dict(r) for r in live.execute("SELECT * FROM server_cards ORDER BY user_id, id")]
        snap_rows = [dict(r) for r in snap.execute("SELECT * FROM server_cards ORDER BY user_id, id")]
        if live_rows != snap_rows:
            raise RuntimeError("Post-restore database does not match the baseline snapshot")
    except Exception:
        live.rollback()
        raise
    finally:
        live.close()
        snap.close()
    print(json.dumps({"restoredExistingRows": restored, "logicalMatchWithBaseline": True}, indent=2))


def parse_mc(front: str, back: str) -> tuple[str, dict[str, str], str]:
    lines = front.splitlines()
    positions = [i for i, line in enumerate(lines) if re.match(r"^[A-D]: ", line)]
    if len(positions) != 4:
        raise RuntimeError("not four options")
    options = {lines[p][0]: lines[p][3:] for p in positions}
    match = re.match(r"^>> CORRECT: ([A-D]) \|", back)
    if not match:
        raise RuntimeError("invalid correct-answer prefix")
    return "\n".join(lines[:positions[0]]).strip(), options, match.group(1)


def normalize(value: str) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", value.lower()))


def command_validate(_: argparse.Namespace) -> None:
    plan = json.loads(PLAN.read_text(encoding="utf-8"))
    requirements, distilled, baseline, reviewed = load_sources()
    req_by_id = {r["requirementId"]: r for r in requirements}
    base_by_id = {c["cardId"]: c for c in baseline}
    review_by_id = {c["cardId"]: c for c in reviewed}
    plan_by_id = {r["cardId"]: r for r in plan["cards"]}
    added_by_id = {r["cardId"]: r for r in plan["addedCards"]}
    existing_ids = set(plan_by_id)
    new_ids = set(added_by_id)
    before = sqlite3.connect(BACKUP)
    after = sqlite3.connect(DB)
    phase = sqlite3.connect(UNMAPPED_PHASE_BACKUP) if UNMAPPED_PHASE_BACKUP.exists() else None
    before.row_factory = after.row_factory = sqlite3.Row
    if phase is not None:
        phase.row_factory = sqlite3.Row
    errors: list[str] = []
    changed_content: list[str] = []
    changed_decks: list[str] = []
    changed_existing: list[dict[str, Any]] = []
    added_details: list[dict[str, Any]] = []
    final_rows: dict[str, dict[str, Any]] = {}
    review_count_before = review_count_after = 0
    resolution_rows = [row for row in plan["cards"] if row.get("unmappedResolution")]
    resolution_counts = Counter(row["unmappedResolution"]["decision"] for row in resolution_rows)
    resolution_scope_counts = Counter(row["unmappedResolution"]["scopeLevel"] for row in resolution_rows)
    if len(resolution_rows) != 104:
        errors.append(f"unmapped resolution contains {len(resolution_rows)} cards instead of 104")
    for row in resolution_rows:
        resolution = row["unmappedResolution"]
        if row.get("originalAuditStatus") != "unmapped":
            errors.append(f"{row['cardId']}: resolution source status was not unmapped")
        if resolution["decision"] == "objective_assigned":
            expected_deck = f"sy0-701-objective-{resolution['objectiveId'].replace('.', '-')}"
            if row["targetDeckId"] != expected_deck:
                errors.append(f"{row['cardId']}: assigned objective deck mismatch")
            if any(req_by_id[rid]["objectiveId"] != resolution["objectiveId"] for rid in row["finalRequirementIds"]):
                errors.append(f"{row['cardId']}: exact requirement belongs to another objective")
        elif resolution["decision"] == "not_relevant":
            archived = row.get("archiveDisposition")
            valid_archive = (
                archived
                and archived.get("deckId") == row["targetDeckId"]
                and row["action"] == "move"
            )
            if row["auditStatus"] != "unmapped" or row["finalRequirementIds"] or (row["action"] != "keep" and not valid_archive):
                errors.append(f"{row['cardId']}: not-relevant resolution mutated mapping or card")
        else:
            errors.append(f"{row['cardId']}: unknown unmapped resolution decision")

    def content_record(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "front": row["front"],
            "back": row["back"],
            "tags": json.loads(row["tags_json"] or "[]"),
            "extraJson": json.loads(row["extra_json"] or "{}"),
        }

    scheduling_fields = (
        "type", "queue", "due", "due_at", "interval", "factor", "stability",
        "difficulty", "retrievability", "reps", "lapses", "algorithm",
        "learning_step", "last_reviewed_at",
    )
    try:
        # Hold one consistent live read snapshot. Reviews may legitimately be
        # added by the app after the phase snapshot while this audit runs.
        after.execute("BEGIN")
        review_reference = phase if phase is not None else before
        reference_reviews = {r["id"]: dict(r) for r in review_reference.execute("SELECT * FROM server_reviews ORDER BY id")}
        live_reviews = {r["id"]: dict(r) for r in after.execute("SELECT * FROM server_reviews ORDER BY id")}
        for review_id, reference_row in reference_reviews.items():
            if live_reviews.get(review_id) != reference_row:
                errors.append(f"review history row changed or disappeared: {review_id}")
        added_review_rows = [row for review_id, row in live_reviews.items() if review_id not in reference_reviews]
        reviewed_during_phase = {(row["user_id"], row["card_id"]) for row in added_review_rows}
        review_mutable_fields = set(scheduling_fields) | {"updated_at", "last_source_client"}

        def unexpected_phase_changes(old: dict[str, Any], new: dict[str, Any], user_id: str, card_id: str, allowed: set[str] | None = None) -> set[str]:
            permitted = set(allowed or ())
            if (user_id, card_id) in reviewed_during_phase:
                permitted.update(review_mutable_fields)
            return {key for key in old if old[key] != new[key] and key not in permitted}

        profiles = [dict(r) for r in after.execute("SELECT user_id, profile_name FROM users ORDER BY user_id")]
        if len(profiles) != 2:
            errors.append("profile count is not two")
        for profile in profiles:
            user_id = profile["user_id"]
            all_after = {r["id"]: dict(r) for r in after.execute("SELECT * FROM server_cards WHERE user_id=? AND is_deleted=0", (user_id,))}
            all_before = {r["id"]: dict(r) for r in before.execute("SELECT * FROM server_cards WHERE user_id=? AND is_deleted=0", (user_id,))}
            all_phase = ({r["id"]: dict(r) for r in phase.execute("SELECT * FROM server_cards WHERE user_id=? AND is_deleted=0", (user_id,))} if phase is not None else all_before)
            if len(all_before) != 803 or len(all_after) != 1075 or set(all_after) != set(all_before) | new_ids:
                errors.append(f"{profile['profile_name']}: active card inventory drift")
            for card_id, row in plan_by_id.items():
                old, new = all_before[card_id], all_after[card_id]
                if new["note_id"] != old["note_id"]:
                    errors.append(f"{profile['profile_name']}/{card_id}: note ID changed")
                content_fields = ("front", "back", "tags_json", "extra_json")
                content_diff = any(old[f] != new[f] for f in content_fields)
                deck_diff = old["deck_id"] != new["deck_id"]
                if profile["profile_name"] == profiles[0]["profile_name"]:
                    final_rows[card_id] = new
                    if content_diff:
                        changed_content.append(card_id)
                    if deck_diff:
                        changed_decks.append(card_id)
                if row["action"] in {"keep", "move"} and content_diff:
                    errors.append(f"{profile['profile_name']}/{card_id}: unexpected content change")
                if row["action"] == "keep" and deck_diff:
                    errors.append(f"{profile['profile_name']}/{card_id}: unexpected deck change")
                if row["action"] == "keep" and unexpected_phase_changes(all_phase[card_id], new, user_id, card_id):
                    errors.append(f"{profile['profile_name']}/{card_id}: unchanged card row is not byte-for-byte logical match")
                if row["action"] in {"move", "move_and_clarify"} and new["deck_id"] != row["targetDeckId"]:
                    errors.append(f"{profile['profile_name']}/{card_id}: objective move mismatch")
                if row["action"] in {"clarify", "move_and_clarify"}:
                    if not content_diff:
                        errors.append(f"{profile['profile_name']}/{card_id}: planned improvement did not change content")
                    try:
                        question, options, correct = parse_mc(new["front"], new["back"])
                        if "\nNicht:\n" not in new["back"] or any(f"\n{x} |" not in new["back"] for x in set("ABCD") - {correct}):
                            errors.append(f"{profile['profile_name']}/{card_id}: incomplete German explanations")
                    except RuntimeError as exc:
                        errors.append(f"{profile['profile_name']}/{card_id}: {exc}")
                if any(all_phase[card_id][k] != new[k] for k in scheduling_fields) and (user_id, card_id) not in reviewed_during_phase:
                    errors.append(f"{profile['profile_name']}/{card_id}: existing scheduling/history state changed")
            for card_id, planned in added_by_id.items():
                new = all_after.get(card_id)
                if not new:
                    errors.append(f"{profile['profile_name']}/{card_id}: new card missing")
                    continue
                if profile["profile_name"] == profiles[0]["profile_name"]:
                    final_rows[card_id] = new
                if new["note_id"] != f"note-{card_id}" or new["deck_id"] != planned["targetDeckId"]:
                    errors.append(f"{profile['profile_name']}/{card_id}: new-card identity/deck mismatch")
                if len(card_id) != 13 or not card_id.isdigit():
                    errors.append(f"{profile['profile_name']}/{card_id}: new card ID schema mismatch")
                expected = ({key: all_phase[card_id][key] for key in scheduling_fields} if card_id in all_phase else scheduling_reset(profile["profile_name"], card_id))
                if any(new[k] != value for k, value in expected.items()) and (user_id, card_id) not in reviewed_during_phase:
                    errors.append(f"{profile['profile_name']}/{card_id}: new-card FSRS state changed during current phase")
                expected_tag = re.sub(r"^\d+\.\d+\s+", "", after.execute(
                    "SELECT name FROM server_decks WHERE user_id=? AND id=?",
                    (user_id, planned["targetDeckId"]),
                ).fetchone()[0])
                if json.loads(new["tags_json"] or "[]") != [expected_tag]:
                    errors.append(f"{profile['profile_name']}/{card_id}: target-deck tag mismatch")
                if json.loads(new["extra_json"] or "{}") != {"acronym": "", "examples": "", "port": "", "protocol": ""} or new["metadata_json"] != "{}":
                    errors.append(f"{profile['profile_name']}/{card_id}: new-card auxiliary schema mismatch")
                try:
                    _, _, correct = parse_mc(new["front"], new["back"])
                    if "\nNicht:\n" not in new["back"] or any(f"\n{x} |" not in new["back"] for x in set("ABCD") - {correct}):
                        errors.append(f"{profile['profile_name']}/{card_id}: incomplete new-card German explanations")
                except RuntimeError as exc:
                    errors.append(f"{profile['profile_name']}/{card_id}: {exc}")
            excluded_ids = [c["cardId"] for c in json.loads(BASELINE.read_text(encoding="utf-8"))["excludedCards"]]
            for card_id in excluded_ids:
                if unexpected_phase_changes(all_phase[card_id], all_after[card_id], user_id, card_id):
                    errors.append(f"{profile['profile_name']}/{card_id}: excluded card row changed")
        # Content must remain exactly mirrored across the two profiles.
        p0, p1 = profiles
        for row in after.execute("SELECT a.id, a.note_id n0, b.note_id n1, a.deck_id d0, b.deck_id d1, a.front f0, b.front f1, a.back b0, b.back b1, a.tags_json t0, b.tags_json t1, a.extra_json e0, b.extra_json e1 FROM server_cards a JOIN server_cards b ON a.id=b.id WHERE a.user_id=? AND b.user_id=? AND a.is_deleted=0 AND b.is_deleted=0", (p0["user_id"], p1["user_id"])):
            if any(row[a] != row[b] for a, b in (("n0", "n1"), ("d0", "d1"), ("f0", "f1"), ("b0", "b1"), ("t0", "t1"), ("e0", "e1"))):
                errors.append(f"profile content mismatch: {row['id']}")
        review_count_before = len(reference_reviews)
        review_count_after = len(live_reviews)

        canonical_user = profiles[0]["user_id"]
        decks = {r["id"]: dict(r) for r in after.execute("SELECT * FROM server_decks WHERE user_id=? AND deleted_at IS NULL", (canonical_user,))}
        deck_names = {deck_id: deck["name"] for deck_id, deck in decks.items()}
        children: dict[str | None, list[str]] = defaultdict(list)
        for deck in decks.values():
            children[deck["parent_deck_id"]].append(deck["id"])
        final_domain_counts: dict[str, int] = {}
        for domain in range(1, 6):
            root_name = f"0{domain}_" if domain < 10 else f"{domain}_"
            roots = [d["id"] for d in decks.values() if d["name"].startswith(root_name)]
            if len(roots) != 1:
                errors.append(f"domain {domain}: root deck lookup failed")
                continue
            descendants = set()
            stack = roots[:]
            while stack:
                deck_id = stack.pop()
                descendants.add(deck_id)
                stack.extend(children.get(deck_id, []))
            final_domain_counts[str(domain)] = sum(1 for row in final_rows.values() if row["deck_id"] in descendants)

        for row in plan["cards"]:
            if row["action"] == "keep":
                continue
            old = dict(before.execute("SELECT * FROM server_cards WHERE user_id=? AND id=?", (canonical_user, row["cardId"])).fetchone())
            new = final_rows[row["cardId"]]
            changed_existing.append({
                "cardId": row["cardId"],
                "domain": row["originalDomain"],
                "status": row["auditStatus"],
                "requirementIds": row["finalRequirementIds"],
                "changeType": row["action"],
                "reason": row["rationale"],
                "previousContent": content_record(old),
                "newContent": content_record(new),
                "previousDeck": {"id": old["deck_id"], "name": deck_names.get(old["deck_id"], base_by_id[row["cardId"]]["deck"])},
                "newDeck": {"id": new["deck_id"], "name": deck_names.get(new["deck_id"])},
                "fsrs": "retained",
            })
        for row in plan["addedCards"]:
            new = final_rows[row["cardId"]]
            added_details.append({
                "cardId": row["cardId"],
                "noteId": row["noteId"],
                "targetDeck": {"id": row["targetDeckId"], "name": deck_names.get(row["targetDeckId"])},
                "requirementId": row["requirementId"],
                "content": content_record(new),
                "proofPreviouslyUntreated": row["proofPreviouslyUntreated"],
                "duplicateCheck": row["duplicateCheck"],
                "initialFsrsByProfile": {
                    profile["profile_name"]: scheduling_reset(profile["profile_name"], row["cardId"])
                    for profile in profiles
                },
            })
    finally:
        before.close()
        after.close()
        if phase is not None:
            phase.close()

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    distilled_hashes = {}
    conflict_rows = []
    for domain in range(1, 6):
        path = ROOT / "sample_Transcripts" / "Mapping_Knowledge" / f"domain-{domain}-requirement-mapping.json"
        key = str(path.relative_to(ROOT))
        distilled_hashes[key] = sha256(path)
        for entry in json.loads(path.read_text(encoding="utf-8"))["entries"]:
            if entry.get("possibleSourceConflict"):
                conflict_rows.append({
                    "requirementId": entry["requirementId"],
                    "distilledContent": entry["distilledContent"],
                    "resolution": "Der offizielle V7-Leaf begrenzt die Coverage. Die Karte verwendet nur eine mit dem Objective vereinbare, konfliktarme Aussage; distilledContent blieb bytegenau unverändert.",
                })
    if distilled_hashes != manifest["distilledSources"]:
        errors.append("distilled source hash changed")

    coverage: dict[str, list[str]] = defaultdict(list)
    for row in plan["cards"]:
        for rid in row["finalRequirementIds"]:
            coverage[rid].append(row["cardId"])
    for row in plan["addedCards"]:
        coverage[row["requirementId"]].append(row["cardId"])

    retrieval_items: list[dict[str, Any]] = []
    schema_counts = Counter()
    schema_errors = []
    for card_id in sorted(existing_ids | new_ids, key=int):
        row = final_rows[card_id]
        if row["front"].startswith("MATCHING:\n"):
            schema_counts["matching"] += 1
            continue
        if row["front"].startswith("ORDERING:\n"):
            schema_counts["ordering"] += 1
            continue
        schema_counts["mc"] += 1
        try:
            question, options, correct = parse_mc(row["front"], row["back"])
            if "\nNicht:\n" not in row["back"] or any(f"\n{x} |" not in row["back"] for x in set("ABCD") - {correct}):
                schema_errors.append({"cardId": card_id, "issue": "missing explanations"})
            key = normalize(question + " " + options[correct])
            retrieval_items.append({"cardId": card_id, "answer": normalize(options[correct]), "key": key, "tokens": set(key.split())})
        except RuntimeError as exc:
            schema_errors.append({"cardId": card_id, "issue": str(exc)})
    if schema_errors:
        errors.append(f"final card schema errors: {schema_errors[:5]}")
    exact_groups: dict[str, list[str]] = defaultdict(list)
    for item in retrieval_items:
        exact_groups[item["key"]].append(item["cardId"])
    exact_groups = {key: ids for key, ids in exact_groups.items() if len(ids) > 1}
    near_pairs = []
    for index, left in enumerate(retrieval_items):
        for right in retrieval_items[index + 1:]:
            if left["answer"] != right["answer"]:
                continue
            union = left["tokens"] | right["tokens"]
            score = len(left["tokens"] & right["tokens"]) / len(union) if union else 1.0
            if score >= 0.82 and left["key"] != right["key"]:
                near_pairs.append({"cardIds": [left["cardId"], right["cardId"]], "jaccard": round(score, 4)})
    if exact_groups:
        errors.append(f"exact final retrieval duplicates: {list(exact_groups.values())[:5]}")

    matrix = []
    for req in requirements:
        ids = sorted(coverage[req["requirementId"]], key=int)
        matrix.append({
            "requirementId": req["requirementId"],
            "objectiveId": req["objectiveId"],
            "sourcePath": req["sourcePath"],
            "covered": bool(ids),
            "cardIds": ids,
            "distilledContentSha256": hashlib.sha256(distilled[req["requirementId"]]["distilledContent"].encode()).hexdigest(),
        })
    audit_rows = []
    for row in plan["cards"]:
        baseline_card = base_by_id[row["cardId"]]
        review = review_by_id[row["cardId"]]
        official_objectives = {req_by_id[rid]["objectiveId"] for rid in row["finalRequirementIds"]}
        resolution = row.get("unmappedResolution")
        if resolution and resolution["decision"] == "objective_assigned":
            official_objectives.add(resolution["objectiveId"])
        audit_rows.append({
            "cardId": row["cardId"],
            "noteId": row["noteId"],
            "domain": row["originalDomain"],
            "deck": {"id": row["originalDeckId"], "name": baseline_card["deck"]},
            "cardType": baseline_card["cardType"],
            "status": row["auditStatus"],
            "requirementIds": row["finalRequirementIds"],
            "officialObjectives": sorted(official_objectives),
            "distilledComparison": row["rationale"] if resolution else review["reviewNote"],
            "sourceIdentifiers": baseline_card["sourceIdentifiers"],
            "currentContent": baseline_card["currentContent"],
            "proposedChange": ({"content": row["newContent"], "targetDeckId": row["targetDeckId"]} if row["action"] == "move_and_clarify" else (row["newContent"] if row["action"] == "clarify" else ({"targetDeckId": row["targetDeckId"]} if row["action"] == "move" else None))),
            "implementedAction": row["action"],
            "fsrsImpact": row["fsrsImpact"],
            "unmappedResolution": resolution,
        })
    action_counts = Counter(r["action"] for r in plan["cards"])
    status_counts = Counter(r["auditStatus"] for r in plan["cards"])
    changed_existing_ids = sorted(set(changed_content) | set(changed_decks), key=int)
    archived_existing = [
        row for row in plan["cards"]
        if row.get("archiveDisposition") and row["targetDeckId"] == row["archiveDisposition"].get("deckId")
    ]
    active_existing_cards = len(plan["cards"]) - len(archived_existing)
    active_final_cards = active_existing_cards + len(plan["addedCards"])
    report = {
        "schemaVersion": "sy0701-domain-validation-3",
        "passed": not errors,
        "errors": errors,
        "equations": {
            "auditStatuses": f"{status_counts['keep']} keep + {status_counts['improve']} improve + {status_counts['objective_mismatch']} objective_mismatch + {status_counts['unmapped']} unmapped = {sum(status_counts.values())} audited cards",
            "existingCards": f"{action_counts['keep']} unchangedExistingCards + {len(changed_existing_ids)} changedExistingCards = {len(plan['cards'])} examinedExistingCards",
            "finalCards": f"{active_existing_cards} active existing + {len(plan['addedCards'])} added = {active_final_cards} active domain cards; {len(archived_existing)} existing cards archived separately",
            "coverage": f"{len(coverage)} covered + {len(requirements)-len(coverage)} uncovered = {len(requirements)} requirements",
            "fsrs": f"{len(plan['cards'])} existing schedules retained + {len(plan['addedCards'])} new FSRS schedules initialized",
        },
        "counts": {
            "examinedExistingCards": len(plan["cards"]),
            "unchangedExistingCards": action_counts["keep"],
            "changedExistingCards": len(changed_existing_ids),
            "addedCards": len(plan["addedCards"]),
            "finalDomainCards": active_final_cards,
            "totalAuditedAndAddedCardRecords": len(plan["cards"]) + len(plan["addedCards"]),
            "archivedNotRelevantCards": len(archived_existing),
            "contentChanged": len(changed_content),
            "contentUnchanged": len(plan["cards"]) - len(changed_content),
            "deckChanged": len(changed_decks),
            "requirementsCovered": len(coverage),
            "requirementsUncovered": len(requirements) - len(coverage),
            "excludedCardsVerifiedUnchanged": 52,
            "reviewHistoryRowsBefore": review_count_before,
            "reviewHistoryRowsAfter": review_count_after,
            "reviewHistoryRowsPreserved": review_count_before,
            "reviewHistoryRowsAddedByNormalStudyActivity": len(added_review_rows),
            "distilledFilesVerifiedByteExact": 5,
            "finalCardTypes": dict(sorted(schema_counts.items())),
            "finalCardsByPhysicalDomainDeckTree": final_domain_counts,
            "exactRetrievalDuplicateGroups": len(exact_groups),
            "nearDuplicatePairsWithSameAnswer": len(near_pairs),
            "previouslyUnmappedReviewed": len(resolution_rows),
            "previouslyUnmappedObjectiveAssigned": resolution_counts["objective_assigned"],
            "previouslyUnmappedMarkedNotRelevant": resolution_counts["not_relevant"],
            "previouslyUnmappedUnresolved": 0,
            "unmappedResolutionScopeLevels": dict(sorted(resolution_scope_counts.items())),
        },
        "changedCardIds": {
            "existing": changed_existing_ids,
            "content": sorted(changed_content, key=int),
            "deck": sorted(changed_decks, key=int),
        },
        "addedCardIds": sorted(new_ids, key=int),
        "distilledSourceHashes": distilled_hashes,
        "independentQualityReportUsed": False,
    }
    dump(REPORTS / "card-audit.json", {"schemaVersion": "sy0701-domain-card-audit-final-2", "cards": audit_rows})
    dump(REPORTS / "coverage-matrix.json", {"schemaVersion": "sy0701-requirement-coverage-final-1", "requirements": matrix})
    dump(REPORTS / "source-conflicts.json", {"schemaVersion": "sy0701-source-conflicts-1", "conflicts": conflict_rows})
    dump(REPORTS / "semantic-duplicate-check.json", {
        "schemaVersion": "sy0701-semantic-duplicate-check-1",
        "newCardsChecked": len(plan["addedCards"]),
        "perNewCard": [{"cardId": row["cardId"], **row["duplicateCheck"]} for row in plan["addedCards"]],
        "finalExactRetrievalDuplicateGroups": exact_groups,
        "finalNearDuplicatePairsWithSameAnswer": near_pairs,
    })
    dump(REPORTS / "validation-report.json", report)
    change_log = {
        "schemaVersion": "sy0701-domain-change-log-3",
        "examinedExistingCards": len(plan["cards"]),
        "unchangedExistingCards": action_counts["keep"],
        "changedExistingCards": {"count": len(changed_existing), "cards": changed_existing},
        "addedCards": {"count": len(added_details), "cards": added_details},
        "statusCounts": dict(sorted(status_counts.items())),
        "unmappedResolution": {
            "reviewed": len(resolution_rows),
            "decisionCounts": dict(sorted(resolution_counts.items())),
            "scopeLevelCounts": dict(sorted(resolution_scope_counts.items())),
            "unresolved": 0,
        },
        "equations": report["equations"],
    }
    dump(REPORTS / "change-log.json", change_log)
    summary = f"""# SY0-701 Domain-Karten: Abschlussbericht

- Geprüfte Bestandskarten: {len(plan['cards'])}
- Unveränderte Bestandskarten: {action_counts['keep']}
- Geänderte Bestandskarten: {len(changed_existing_ids)} ({len(changed_content)} inhaltlich verbessert, {len(changed_decks)} verschoben; Überschneidungen werden nur einmal gezählt)
- Neue Karten: {len(plan['addedCards'])}
- Finale aktive Domain-Karten: {active_final_cards}; zusätzlich {len(archived_existing)} bewusst nicht relevante Bestandskarten im separaten Archiv
- Coverage: {len(coverage)}/{len(requirements)} Requirements
- Auditstatus: {status_counts['keep']} keep, {status_counts['improve']} improve, {status_counts['objective_mismatch']} objective_mismatch, {status_counts['unmapped']} unmapped (alle bewusst `not_relevant`; 0 ungeklärt)
- Unmapped-Nachprüfung: {len(resolution_rows)}/104 geprüft; {resolution_counts['objective_assigned']} einem Objective zugeordnet, {resolution_counts['not_relevant']} bewusst als nicht relevant markiert, 0 ungeklärt
- FSRS: kein Schedule durch die Kartenbearbeitung zurückgesetzt; alle {review_count_before} vor der Unmapped-Phase vorhandenen Review-Historienzeilen erhalten, {len(added_review_rows)} normale neue Reviews akzeptiert; {len(plan['addedCards'])} Karten waren initial als neue FSRS-Karten angelegt worden
- Ausgeschlossen und unverändert: 43 Akronym-Bonus- plus 9 interaktive Karten
- distilledContent: 5/5 Quelldateien bytegenau unverändert
- Semantische Duplikatprüfung: {len(plan['addedCards'])} neue Karten geprüft; {len(exact_groups)} exakte Retrieval-Duplikatgruppen, {len(near_pairs)} hochähnliche Paare mit gleicher Antwort im finalen Bestand

Gleichung: {action_counts['keep']} + {len(changed_existing_ids)} = {len(plan['cards'])} bestehende Karten; neue Karten werden separat gezählt.
"""
    (REPORTS / "summary.md").write_text(summary, encoding="utf-8")
    if errors:
        raise RuntimeError("Validation failed: " + "; ".join(errors[:10]))
    print(json.dumps({"passed": True, "report": str(REPORTS / "validation-report.json"), "counts": report["counts"], "equations": report["equations"]}, indent=2))


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("plan").set_defaults(func=command_plan)
    sub.add_parser("apply").set_defaults(func=command_apply)
    sub.add_parser("restore").set_defaults(func=command_restore)
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
