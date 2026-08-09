# Audit: English MCQ mapping

`distilledContent` was not changed. English questions and answer choices were extracted from the practice-video transcript whenever the automatic captions allowed a reliable parse.

## Result

- 780 English MCQs added to 589 requirement IDs.
- 631 MCQs use four options extracted from the transcript.
- 149 MCQs use the transcript answer plus three English sibling-requirement distractors because the captions did not expose four clean options.
- 0 mappings are marked `review` because lexical mapping confidence is low.
- 601 of 665 non-acronym coverage topics were inserted; the remainder are listed below instead of being forced.
- 179 of 181 acronym coverage topics were inserted; the remainder are listed below.
- 26 main transcript questions were not forced onto a requirement ID.

## Excluded or unresolved

| Requirement ID | Topic | Reason |
|---|---|---|
| `req:sy0701:v7:5.5:penetration-testing:integrated` | Integrated Testing | Transcript answer is factually questionable. |
| `req:sy0701:v7:5.3:vendor-selection:conflict-of-interest` | Interessenkonflikt | Question, answer, or four options could not be extracted reliably. |
| `req:sy0701:v7:5.2:business-impact-analysis:recovery-time-objective-rto` | RTO | Transcript answer is factually questionable. |
| `req:sy0701:v7:5.2:risk-analysis:single-loss-expectancy-sle` | SLE | Transcript answer is factually questionable. |
| `req:sy0701:v7:4.8:digital-forensics:acquisition` | Acquisition-Phase | Transcript answer is factually questionable. |
| `req:sy0701:v7:4.3:vulnerability-response-and-remediation:exceptions-and-exemptions` | Exceptions vs. Exemptions | Transcript answer is factually questionable. |
| `req:sy0701:v7:4.3:analysis:environmental-variables` | Environmental Variables | Transcript answer is factually questionable. |
| `req:sy0701:v7:4.1:application-security:secure-cookies` | Secure Cookies | Transcript answer is factually questionable. |
| `req:sy0701:v7:3.3:data-types:trade-secret` | Proprietäre Formeln/Prozesse | Question, answer, or four options could not be extracted reliably. |
| `req:sy0701:v7:3.2:secure-communication-access:tunneling:transport-layer-security-tls` | Verschlüsselung von Web-Traffic | Question, answer, or four options could not be extracted reliably. |
| `req:sy0701:v7:3.2:secure-communication-access:virtual-private-network-vpn` | Funktion VPN | Question, answer, or four options could not be extracted reliably. |
| `req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:network-infrastructure:logical-segmentation` | Zweck logischer Segmentierung | Question, answer, or four options could not be extracted reliably. |
| `req:sy0701:v7:2.5:monitoring` | Laufende Beobachtung von Traffic/Aktivität | Question, answer, or four options could not be extracted reliably. |
| `req:sy0701:v7:2.4:indicators:blocked-content` | Richtlinienbedingte Web-Sperre | Question, answer, or four options could not be extracted reliably. |
| `req:sy0701:v7:2.4:network-attacks:distributed-denial-of-service-ddos:amplified` | Verstärkung über Drittserver | Question, answer, or four options could not be extracted reliably. |
| `req:sy0701:v7:2.3:misconfiguration` | fehlerhafte Konfiguration | Question, answer, or four options could not be extracted reliably. |
| `req:sy0701:v7:2.1:motivations:war` | geopolitische Angriffe | Question, answer, or four options could not be extracted reliably. |
| `req:sy0701:v7:2.1:motivations:ethical` | Ethical Hacking | Question, answer, or four options could not be extracted reliably. |
| `req:sy0701:v7:1.4:tools:secure-enclave` | isolierte Ausführungsumgebung | Question, answer, or four options could not be extracted reliably. |
| `req:sy0701:v7:1.4:tools:trusted-platform-module-tpm` | Chip für Key Storage/Secure Boot | Question, answer, or four options could not be extracted reliably. |
| `req:sy0701:v7:1.3:business-processes-impacting-security-operation:maintenance-window` | Änderungen einplanen | Question, answer, or four options could not be extracted reliably. |
| `req:sy0701:v7:1.3:business-processes-impacting-security-operation:ownership` | Verantwortlicher für Asset | Question, answer, or four options could not be extracted reliably. |
| `req:sy0701:v7:1.2:zero-trust:data-plane:implicit-trust-zones` | Definition Trust Zone | Transcript answer is factually questionable. |
| `req:sy0701:v7:1.2:zero-trust:control-plane:policy-engine` | Rolle Policy Engine | Transcript answer is factually questionable. |
| `req:sy0701:v7:1.2:zero-trust:control-plane:policy-administrator` | Rolle Policy Administrator | Transcript answer is factually questionable. |
| `req:sy0701:v7:1.1:categories:technical` | technische Kontrolle | Question, answer, or four options could not be extracted reliably. |
| `req:sy0701:v7:4.7:use-cases-of-automation-and-scripting:continuous-integration-and-testing` | CI/Testing | Question, answer, or four options could not be extracted reliably. |
| `req:sy0701:v7:1.4:certificates:certificate-signing-request-csr-generation` | Zweck CSR | Question, answer, or four options could not be extracted reliably. |
| `req:sy0701:v7:5.6:reporting-and-monitoring:initial` | Erstmeldung Vorfall | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:1.1:control-types:preventive` | Vorfall vorab verhindern | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:3.2:selection-of-effective-controls` | Auswahl wirksamer Controls | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:3.3:general-data-considerations:geolocation` | Standortbasierte Richtlinien | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:4.6:password-concepts:password-best-practices:reuse` | Risiko Passwort-Wiederverwendung | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:2.1:attributes-of-actors:level-of-sophistication-capability` | Merkmal hochentwickelter Akteure | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:2.4:malware-attacks:spyware` | heimliche Überwachung | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:4.3:analysis:confirmation:false-negative` | False Negative | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:industrial-control-systems-ics-supervisory-contr` | Warum SCADA Ziel ist | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:4.4:tools:security-information-and-event-management-siem` | SIEM-Hauptfunktion | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:2.4:application-attacks:replay` | Erneutes Senden gültiger Auth-Daten | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:4.6:access-controls:rule-based` | Rule-based access control | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:2.3:hardware:legacy` | Legacy-Systeme | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:4.6:privileged-access-management-tools:just-in-time-permissions` | Just-in-time-Rechte | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:1.4:certificates:certificate-revocation-lists-crls` | Zweck CRL | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:2.2:human-vectors-social-engineering:typosquatting` | ähnliche Domain / Vertipper | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:3.2:infrastructure-considerations:port-security:802-1x` | Funktion 802.1X | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:1.2:gap-analysis` | Zweck Gap-Analyse | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:4.8:process:lessons-learned` | Lessons Learned | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:2.2:message-based:instant-messaging-im` | IM als Zielplattform | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:4.8:process:containment` | IR-Phase Containment | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:2.2:supply-chain:managed-service-providers-msps` | MSP-Risiko | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:2.2:human-vectors-social-engineering:misinformation-disinformation` | gezielte Falschinformation | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:4.8:process:preparation` | IR-Phase Preparation | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:1.4:hashing` | MAC (Kryptografie) | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:2.2:file-based` | Malware in PDF/Office | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:1.3:technical-implications:allow-lists-deny-lists` | Zugriff auf Apps/Sites steuern | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:2.5:decommissioning` | Altsysteme sicher außer Betrieb nehmen | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:2.3:operating-system-os-based` | Angriff auf OS-Mechanismen | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:1.4:blockchain` | dezentrales manipulationssicheres Ledger | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:3.1:considerations:inability-to-patch` | Nicht patchbare Systeme | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:2.4:indicators:account-lockout` | Konto nach Fehlversuchen gesperrt | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:2.3:application:buffer-overflow` | Überschreiben benachbarten Speichers | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:1.4:open-public-ledger` | Zweck Open Public Ledger | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:1.2:authentication-authorization-and-accounting-aaa:authenticating-systems` | Systeme statt Nutzer authentifizieren | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:1.2:authentication-authorization-and-accounting-aaa:authenticating-people` | AAA: Authentifizierung | Low-confidence transcript-to-requirement mapping; not inserted. |
| `req:sy0701:v7:1.4:encryption:algorithms` | Akronym CTM | CTM is not the established abbreviation for Counter Mode; CTR is standard. |
| `req:sy0701:v7:2.4:network-attacks:domain-name-system-dns-attacks` | DNS-Akronym | No unused acronym question remained. |

## Requirements with no mapped source question

These IDs were already marked uncovered by the coverage analysis; no question was invented for them.

| Requirement ID | Source path |
|---|---|
| `req:sy0701:v7:1.2:deception-and-disruption-technology:honeyfile` | 1.2 > Deception/disruption > Honeyfile |
| `req:sy0701:v7:1.2:physical-security:access-badge` | 1.2 > Physical security > Access badge |
| `req:sy0701:v7:1.2:physical-security:access-control-vestibule` | 1.2 > Physical security > Access control vestibule |
| `req:sy0701:v7:1.2:physical-security:fencing` | 1.2 > Physical security > Fencing |
| `req:sy0701:v7:1.2:physical-security:lighting` | 1.2 > Physical security > Lighting |
| `req:sy0701:v7:1.2:physical-security:security-guard` | 1.2 > Physical security > Security guard |
| `req:sy0701:v7:1.2:physical-security:sensors:microwave` | 1.2 > Physical security > Sensors > Microwave |
| `req:sy0701:v7:1.2:physical-security:sensors:ultrasonic` | 1.2 > Physical security > Sensors > Ultrasonic |
| `req:sy0701:v7:1.3:technical-implications:application-restart` | 1.3 > Technical implications > Application restart |
| `req:sy0701:v7:1.3:technical-implications:dependencies` | 1.3 > Technical implications > Dependencies |
| `req:sy0701:v7:2.4:physical-attacks:brute-force` | 2.4 > Physical attacks > Brute force |
| `req:sy0701:v7:5.4:compliance-monitoring:automation` | 5.4 > Compliance monitoring > Automation |
| `req:sy0701:v7:5.4:privacy:controller-vs-processor` | 5.4 > Privacy > Controller vs. processor |
| `req:sy0701:v7:5.4:privacy:data-inventory-and-retention` | 5.4 > Privacy > Data inventory and retention |
| `req:sy0701:v7:5.4:privacy:data-subject` | 5.4 > Privacy > Data subject |
| `req:sy0701:v7:5.4:privacy:legal-implications:global` | 5.4 > Privacy > Legal implications > Global |
| `req:sy0701:v7:5.4:privacy:legal-implications:local-regional` | 5.4 > Privacy > Legal implications > Local/regional |
| `req:sy0701:v7:5.4:privacy:legal-implications:national` | 5.4 > Privacy > Legal implications > National |
| `req:sy0701:v7:5.4:privacy:ownership` | 5.4 > Privacy > Ownership |
| `req:sy0701:v7:5.4:privacy:right-to-be-forgotten` | 5.4 > Privacy > Right to be forgotten |
| `req:sy0701:v7:5.5:attestation` | 5.5 > Attestation |

## Unused main-transcript questions

These parsed questions were not assigned to a requirement ID.

| Transcript line | Question | Parsed answer |
|---:|---|---|
| 2020 | What is the primary concern when using proprietary versus third-party software in a security environment? | proprietary offers more control |
| 2045 | in a controlled way, or to eliminate the need for vulnerability scanning and monitoring. What is the purpose of a responsible disclosure program in cyber security? | to let researchers report vulnerabilities ethically and in a controlled way |
| 2070 | What does confirmation mean in the context of vulnerability management? | verifying the existence of a vulnerability and determining its true impact |
| 2088 | What is the purpose of prioritizing vulnerabilities in a security environment? | to focus on critical vulnerabilities first based on potential impact |
| 2178 | What is the purpose of validating remediation efforts in cyber security? | to ensure that the fix addresses the vulnerability without adding new risks |
| 2292 | [no reliable stem] | to collect, correlate and analyze security data to identify threats |
| 2434 | in the network, or the protocol's ability to bypass firewalls and network filters. Which factor should be considered when selecting a network protocol? | the security level including encryption and authentication |
| 2643 | Where is the main purpose of multifactor authentication or MFA? | it requires two or more verification methods to enhance security |
| 2771 | What is the primary use case of automation and scripting in security operations? | to automate repetitive security tasks |
| 2861 | What is a secure way to scale an organization's infrastructure by rapidly increasing system size without considering security? | by planning and applying security measures as the system grows |
| 3083 | in a system or a daily log of security incidents and responses. What best describes a policy in a security program? | a highle statement of principles guiding security decisions |
| 3136 | What is the purpose of security standards in an organization? | to define the expected level of performance and security practices |
| 3211 | What is the main focus of regulatory requirements in security management? | compliant with laws and standards set by governing bodies |
| 3326 | What is the primary objective of risk assessment in security management? | to evaluate the probability and impact of identified risks |
| 3361 | how long it will take to respond to a risk, assessing the effectiveness of risk response strategies, evaluating the nature, impact, and likelihood of identified risks, or assigning specific responsibility for managing identified risks. What is risk analysis primarily concerned with in security management? | evaluating the nature, impact and likelihood of identified risks |
| 3413 | What does impact refer to in risk management? | the potential consequences or severity of a risk event on the organization as a whole |
| 3456 | which identified risks are no longer considered tolerable or acceptable. Or the total financial and operational resources allocated towards organizational risk management activities. What does risk appetite refer to in an organization's security program? | the organization's willingness to accept and take on risk in pursuit of business objectives |
| 3478 | Which of the following is a riskmanagement strategy? | mitigating, transferring, accepting or avoiding risks |
| 3493 | What does risk acceptance mean in a security program? | low |
| 3519 | What is the goal of mitigating a risk? | to make the pot potential impact of the risk less severe |
| 3534 | when considering potential investments in security safeguards. Who is the primary focus of a business impact analysis or BIA? | to identify and assess the potential effects that disruptions may have on business operations and processes |
| 3612 | Which factor is most important when selecting a vendor in security context? | the vendor's demonstrated compliance with established security standards and formal risk management practices |
| 3724 | What is the purpose of compliance reporting in a security program? | to demonstrate and provide evidence or of adherence to applicable regulatory and legal compliance requirements |
| 3748 | What are potential consequences of non-compliance in a security program? | financial penalties, significant legal repercussions, and lasting reputational damage |
| 3797 | What is the primary purpose of not of compliance monitoring in an organization? | to ensure continuous adherence to applicable regulatory requirements and established internal security policies |
| 4055 | What is the purpose of developing a security awareness program within an organization? | to provide structured training that improves user recognition of threats |
