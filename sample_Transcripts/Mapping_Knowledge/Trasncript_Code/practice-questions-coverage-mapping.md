# Coverage-Mapping: CompTIA Security+ Practice-Questions-Video ↔ SY0-701-Objectives

**Quelle:** [CompTIA SECURITY+ FULL Practice Questions - SY0-701 EXAM PREP (2025)](https://www.youtube.com/watch?v=u6G40H6JPok) (YouTube-ID `u6G40H6JPok`)

**Methode:** Themen-/Requirement-Coverage-Mapping, **keine Frage-Extraktion**. Der Ersteller des Quellvideos beschreibt die zugrunde liegende Fragen-Datenbank ausdrücklich als proprietäres, nicht veröffentlichtes internes Tool. Frage-Stamm und Antwortoptionen wurden deshalb **nicht wortgleich übernommen** — dieses Mapping enthält nur: welches der 655 offiziellen SY0-701-Requirements eine Frage adressiert, ein kurzes Themen-Label und die im Video als richtig genannte Kurzantwort (Begriff, kein Volltext), plus eine fachliche Plausibilitätsprüfung. Das entspricht der Urheberrechts-Konvention, die im übrigen `Mapping_Knowledge`-Ordner für die Messer-Transkripte verwendet wird.

Sechs Agents haben je einen gleich großen Zeilenbereich (~857 Zeilen) des Transkripts unabhängig gelesen und ausgewertet. An den drei Chunk-Grenzen kann dadurch vereinzelt dieselbe Frage doppelt auftauchen (Stem im einen, Auflösung im nächsten Chunk) — das ist in den Rohdaten transparent belassen, betrifft aber nur ca. 1–2 von über 1.000 Fragen.

## Ergebnis auf einen Blick

- **1035 Fragen** im Video identifiziert (inkl. Akronym-Anhang)
- **634 von 655** offiziellen SY0-701-Requirement-Leaves abgedeckt (**96.8 %**)
- **72 Fragen** mit Qualitäts-Flag (Antwort fragwürdig, mehrdeutig, Dublette o. ä.)
- **154 Fragen** ohne eindeutiges Requirement (v. a. reiner Akronym-Anhang, teils nur über die Akronym-Datei `sy0-701-acronyms.json` belegbar)

### Abdeckung je Domain (eindeutige Requirement-Leaves getroffen / insgesamt)

| Domain | Abgedeckt | Gesamt | % |
|---|---|---|---|
| 1 – General Security Concepts | 83 | 93 | 89 % |
| 2 – Threats, Vulnerabilities & Mitigations | 124 | 125 | 99 % |
| 3 – Security Architecture | 105 | 105 | 100 % |
| 4 – Security Operations | 200 | 200 | 100 % |
| 5 – Security Program Management | 122 | 132 | 92 % |

### Nicht getroffene Requirements (21)

Diese 21 Requirement-Leaves kommen im Video nicht klar erkennbar vor — mögliche Lücken, falls die eigene Kartendatenbank an dieser Stelle Ergänzung durch andere Quellen braucht:

- `req:sy0701:v7:1.2:deception-and-disruption-technology:honeyfile` — 1.2: Deception and disruption technology > Honeyfile
- `req:sy0701:v7:1.2:physical-security:access-badge` — 1.2: Physical security > Access badge
- `req:sy0701:v7:1.2:physical-security:access-control-vestibule` — 1.2: Physical security > Access control vestibule
- `req:sy0701:v7:1.2:physical-security:fencing` — 1.2: Physical security > Fencing
- `req:sy0701:v7:1.2:physical-security:lighting` — 1.2: Physical security > Lighting
- `req:sy0701:v7:1.2:physical-security:security-guard` — 1.2: Physical security > Security guard
- `req:sy0701:v7:1.2:physical-security:sensors:microwave` — 1.2: Physical security > Sensors > Microwave
- `req:sy0701:v7:1.2:physical-security:sensors:ultrasonic` — 1.2: Physical security > Sensors > Ultrasonic
- `req:sy0701:v7:1.3:technical-implications:application-restart` — 1.3: Technical implications > Application restart
- `req:sy0701:v7:1.3:technical-implications:dependencies` — 1.3: Technical implications > Dependencies
- `req:sy0701:v7:2.4:physical-attacks:brute-force` — 2.4: Physical attacks > Brute force
- `req:sy0701:v7:5.4:compliance-monitoring:automation` — 5.4: Compliance monitoring > Automation
- `req:sy0701:v7:5.4:privacy:controller-vs-processor` — 5.4: Privacy > Controller vs. processor
- `req:sy0701:v7:5.4:privacy:data-inventory-and-retention` — 5.4: Privacy > Data inventory and retention
- `req:sy0701:v7:5.4:privacy:data-subject` — 5.4: Privacy > Data subject
- `req:sy0701:v7:5.4:privacy:legal-implications:global` — 5.4: Privacy > Legal implications > Global
- `req:sy0701:v7:5.4:privacy:legal-implications:local-regional` — 5.4: Privacy > Legal implications > Local/regional
- `req:sy0701:v7:5.4:privacy:legal-implications:national` — 5.4: Privacy > Legal implications > National
- `req:sy0701:v7:5.4:privacy:ownership` — 5.4: Privacy > Ownership
- `req:sy0701:v7:5.4:privacy:right-to-be-forgotten` — 5.4: Privacy > Right to be forgotten
- `req:sy0701:v7:5.5:attestation` — 5.5: Attestation

## Qualitätsauffälligkeiten (72 Fragen)

Fachliche Plausibilitätsprüfung durch die Agents anhand von allgemeinem Security+-Wissen — nicht gegen die App-Kartendatenbank geprüft. Zur Einordnung nach Flag-Typ:

| Flag | Bedeutung | Anzahl |
|---|---|---|
| `ambiguous` | Mehrdeutig - mehr als eine vertretbare Antwort | 20 |
| `factually-questionable` | Antwort sachlich fragwuerdig/falsch | 14 |
| `distractor-issue` | Ablenkoptionen unsauber (z.B. auch zutreffend oder themenfremd) | 12 |
| `duplicate` | Inhaltliche Dublette einer anderen Frage im Set | 12 |
| `scope-mismatch` | Frage trifft nicht den Kern des zugeordneten Requirements | 4 |
| `near-duplicate` | Fast identische Kernaussage wie eine andere Frage | 4 |
| `imprecise-stem` | Fragestamm ungenau formuliert | 1 |
| `context-mismatch` | Frage-Kontext passt nicht zum eigentlichen Pruefungsthema | 1 |
| `answer-cut-off` | Antwort liegt jenseits der Chunk-Grenze (technisches Artefakt, kein Inhaltsmangel) | 1 |
| `terminology` | Begriffliche Abweichung vom offiziellen Wortlaut | 1 |
| `chunk-boundary` | Frage liegt an der Chunk-Grenze (technisches Artefakt) | 1 |
| `circular-definition` | Begriff wird mit sich selbst definiert | 1 |

Die vier technischen Flags `answer-cut-off`, `chunk-boundary` und ähnliche markieren reine Chunk-Grenzen-Artefakte (kein inhaltlicher Mangel im Original-Video).

### Kritischste Einzelfunde (sachlich falsche gewertete Antwort)

- **`req:sy0701:v7:5.2:risk-analysis:single-loss-expectancy-sle` (SLE):** Kritischster Fund: Die im Video als richtig gewertete Antwort definiert SLE als Eintrittswahrscheinlichkeit; SLE ist aber ein Geldbetrag (Asset Value x Exposure Factor). Die tatsaechlich richtige Option (einmaliger finanzieller Verlust) stand als Distraktor daneben - klarer Keying-Fehler.
- **`req:sy0701:v7:5.2:business-impact-analysis:recovery-time-objective-rto` (RTO):** Die gewertete Antwort beschreibt die tatsaechlich benoetigte Wiederherstellungszeit; RTO ist per Definition die maximal tolerierbare Ausfallzeit - diese praezisere Formulierung war als Distraktor vorhanden.
- **`req:sy0701:v7:1.2:zero-trust:control-plane:policy-administrator`:** Rolle und Antwort vertauscht: Der Policy Administrator setzt die Entscheidung der Policy Engine um; 'Policies aus Kontext ableiten' ist Aufgabe der Policy Engine, nicht des Administrators.
- **`req:sy0701:v7:1.2:zero-trust:control-plane:policy-engine`:** Verortet die Policy Engine in der Data Plane; nach NIST SP 800-207 / SY0-701-Objectives gehoert sie zur Control Plane.
- **`req:sy0701:v7:1.2:zero-trust:data-plane:implicit-trust-zones`:** Definition invertiert: eine implizite Trust Zone ist der Bereich, dem nach Passieren des Policy Enforcement Points implizit vertraut wird - nicht ein per se nicht vertrauenswuerdiger Bereich.

→ Falls aus diesem Video Fragen für die App neu formuliert werden, sollten mindestens diese fünf Themen **nicht** unverändert aus dem Video übernommen werden — die im Video als richtig markierte Antwort ist hier fachlich nicht haltbar.

### Alle 72 markierten Fragen (Requirement, Thema, gewertete Antwort, Flag)

| Requirement | Thema | Gewertete Antwort | Flag |
|---|---|---|---|
| `req:sy0701:v7:1.2:zero-trust:control-plane:policy-administrator` | Rolle Policy Administrator | define and enforce policies from context | `factually-questionable` |
| `req:sy0701:v7:1.2:zero-trust:control-plane:policy-engine` | Rolle Policy Engine | authenticate/authorize per policy | `factually-questionable` |
| `req:sy0701:v7:1.2:zero-trust:data-plane:implicit-trust-zones` | Definition Trust Zone | implicit trust zones | `factually-questionable` |
| `req:sy0701:v7:1.2:physical-security:sensors:pressure` | Zutrittserkennung Hochsicherheit | pressure sensors | `ambiguous` |
| `req:sy0701:v7:1.4:encryption:level:volume` | ganze Speichereinheit/Volume | volume encryption | `ambiguous` |
| `req:sy0701:v7:1.4:certificates:self-signed` | Definition selbstsigniert | signed by the owner, not an external CA | `distractor-issue` |
| `req:sy0701:v7:1.4:certificates:root-of-trust` | Root of Trust in PKI | initial certificate of the chain | `distractor-issue` |
| `req:sy0701:v7:1.4:encryption:algorithms` | Akronym DES | „digital encryption standard" | `factually-questionable` |
| `req:sy0701:v7:1.4:encryption:asymmetric` | ECDH-Akronym | elliptic curve Diffie-Hellman ephemeral | `factually-questionable` |
| `req:sy0701:v7:2.2:message-based:email` | E-Mail-Phishing | email-based phishing | `duplicate` |
| `req:sy0701:v7:2.2:message-based:instant-messaging-im` | Malware über IM | sending malicious links | `duplicate` |
| `req:sy0701:v7:2.2:image-based` | Code in Bilddatei | image-based steganography | `duplicate` |
| `req:sy0701:v7:2.2:file-based` | Malware in Dokumenten | file-based attack | `duplicate` |
| `req:sy0701:v7:2.2:human-vectors-social-engineering:vishing` | Caller-ID-Spoofing | vishing | `duplicate` |
| `req:sy0701:v7:2.2:removable-device` | Wechselmedien-Risiko | malware / exfiltration | `duplicate` |
| `req:sy0701:v7:2.2:vulnerable-software:client-based-vs-agentless` | agentless-Bedenken | external scanning misses endpoints | `duplicate` |
| `req:sy0701:v7:2.2:unsupported-systems-and-applications` | nicht unterstützte Systeme | no security patches | `duplicate` |
| `req:sy0701:v7:2.2:unsecure-networks:bluetooth` | Bluetooth-Angriff | bluesnarfing | `imprecise-stem` |
| `req:sy0701:v7:2.3:application:* (Gruppe, kein Leaf)` | fehlerhafte Eingabeverarbeitung | application vulnerability | `distractor-issue` |
| `req:sy0701:v7:2.3:application:race-conditions:time-of-use-tou` | TOU-Akronym | time of use | `context-mismatch` |
| `req:sy0701:v7:2.4:cryptographic-attacks:birthday` | Wahrscheinlichkeit gleicher Hashes | birthday attack | `ambiguous` |
| `req:sy0701:v7:2.4:network-attacks:domain-name-system-dns-attacks` | Akronym DNS | (Antwort hinter Chunk-Grenze) | `answer-cut-off` |
| `req:sy0701:v7:2.5:hardening-techniques:encryption` | Daten nur für Befugte lesbar | encryption | `duplicate` |
| `req:sy0701:v7:2.5:access-control:access-control-list-acl` | FACL-Akronym | file system access control list | `ambiguous` |
| `req:sy0701:v7:3.2:infrastructure-considerations:firewall-types:layer-4-layer-7` | Firewall auf L4 und L7 | layer 4/layer 7 firewall | `distractor-issue` |
| `req:sy0701:v7:3.2:secure-communication-access:remote-access` | Verbindung ins Firmennetz von außen | remote access | `ambiguous` |
| `req:sy0701:v7:3.3:data-classifications:sensitive` | Klassifikation „sensitive" | sensitive | `ambiguous` |
| `req:sy0701:v7:3.3:data-classifications:confidential` | Klassifikation „confidential" | confidential | `ambiguous` |
| `req:sy0701:v7:3.3:data-classifications:restricted` | Klassifikation „restricted" | restricted | `ambiguous` |
| `req:sy0701:v7:4.1:application-security:secure-cookies` | Secure Cookies | "verschlüsselte Cookies + Attribute" | `factually-questionable` |
| `req:sy0701:v7:4.1:wireless-devices:installation-considerations:site-surveys` | WAP-Akronym | wireless access point | `ambiguous` |
| `req:sy0701:v7:4.3:identification-methods:threat-feed:proprietary-third-party` | proprietär vs. Third-Party | mehr Kontrolle vs. externes Risiko | `scope-mismatch` |
| `req:sy0701:v7:4.3:identification-methods:threat-feed:dark-web` | Dark-Web-Risiko | illegale Inhalte, Cybercrime, Schadsoftware | `scope-mismatch` |
| `req:sy0701:v7:4.3:analysis:prioritize` | Priorisierung | kritische zuerst nach Impact | `distractor-issue` |
| `req:sy0701:v7:4.3:analysis:environmental-variables` | Environmental Variables | "Umwelt, Klima, Standort" | `factually-questionable` |
| `req:sy0701:v7:4.3:vulnerability-response-and-remediation:exceptions-and-exemptions` | Exceptions vs. Exemptions | Exceptions temporär, Exemptions dauerhaft | `factually-questionable` |
| `req:sy0701:v7:4.4:tools:security-information-and-event-management-siem` | SIEM-Hauptfunktion | Event-Daten sammeln/analysieren | `duplicate` |
| `req:sy0701:v7:4.5:ids-ips:trends` | IDS/IPS "Trends" | zunehmender ML/KI-Einsatz | `scope-mismatch` |
| `req:sy0701:v7:4.5:dns-filtering` | DNS-Filtering | bösartige Seiten per DNS blocken | `distractor-issue` |
| `req:sy0701:v7:4.5:email-security:gateway` | Gateway | verbindet zwei Netze, filtert Traffic | `scope-mismatch` |
| `req:sy0701:v7:4.5:email-security:domain-based-message-authentication-reporting-an` | Akronym DMARC | „domain message authentication reporting and conformance" | `terminology` |
| `req:sy0701:v7:4.5:file-integrity-monitoring` | FIM-Akronym | file integrity management | `ambiguous` |
| `req:sy0701:v7:4.6:single-sign-on-sso:open-authorization-oauth` | OAuth | Third-Party-Zugriff ohne Passwortweitergabe | `chunk-boundary` |
| `req:sy0701:v7:4.6:password-concepts:password-best-practices:complexity` | Definition Passwortkomplexität | Zeichenmix | `near-duplicate` |
| `req:sy0701:v7:4.6:password-concepts:password-best-practices:age` | Passwort-Alter tracken | sicherstellen, dass regelmäßig erneuert wird | `near-duplicate` |
| `req:sy0701:v7:4.7:benefits:efficiency-time-saving` | Zeitersparnis durch Automatisierung | Routineaufgaben (Patching, Logauswertung) | `near-duplicate` |
| `req:sy0701:v7:4.7:benefits:employee-retention` | Mitarbeiterbindung | Wissen/Expertise bleibt erhalten | `distractor-issue` |
| `req:sy0701:v7:4.8:digital-forensics:acquisition` | Acquisition-Phase | "preserving digital evidence for analysis" | `factually-questionable` |
| `req:sy0701:v7:5.1:procedures:change-management` | Change Management (Procedure) | Änderungen nachverfolgen/kontrollieren | `near-duplicate` |
| `req:sy0701:v7:5.1:types-of-governance-structures:committees` | Rolle von Committees | Policies gemeinsam erstellen/prüfen | `ambiguous` |
| `req:sy0701:v7:5.1:types-of-governance-structures:centralized-decentralized` | zentral vs. dezentral | zentral = einheitlicher Ansatz | `distractor-issue` |
| `req:sy0701:v7:5.1:policies:incident-response` | Akronym CERT | computer emergency response team | `ambiguous` |
| `req:sy0701:v7:5.1:policies:incident-response` | Akronym CIRT | computer incident response team | `ambiguous` |
| `req:sy0701:v7:5.2:risk-analysis:single-loss-expectancy-sle` | SLE | "the likelihood that a specific risk will occur in a given time period" | `factually-questionable` |
| `req:sy0701:v7:5.2:risk-analysis:likelihood` | Likelihood | "likelihood" | `circular-definition` |
| `req:sy0701:v7:5.2:risk-management-strategies:transfer` | Risk Transfer | Übertragung an Dritte (Versicherung/Outsourcing) | `distractor-issue` |
| `req:sy0701:v7:5.2:risk-management-strategies:accept:*` | Risk Acceptance | Akzeptanz wegen Kosten/geringem Impact | `ambiguous` |
| `req:sy0701:v7:5.2:risk-management-strategies:accept:exception` | Exception | formale Abweichung vom Standardverfahren | `ambiguous` |
| `req:sy0701:v7:5.2:business-impact-analysis:recovery-time-objective-rto` | RTO | „Zeit bis zur vollständigen Wiederherstellung" | `factually-questionable` |
| `req:sy0701:v7:5.2:business-impact-analysis:mean-time-to-repair-mttr` | MTTR-Akronym | mean time to recover | `ambiguous` |
| `req:sy0701:v7:5.4:consequences-of-non-compliance:fines` | Finanzielle Folge | Bußgelder durch Behörden | `distractor-issue` |
| `req:sy0701:v7:5.4:compliance-monitoring:due-diligence-care` | Due Diligence (Security Mgmt) | Drittparteirisiken vor Beziehung bewerten | `duplicate` |
| `req:sy0701:v7:5.5:penetration-testing:integrated` | Integrated Testing | Reaktion mehrerer Sicherheitsschichten | `factually-questionable` |
| `req:sy0701:v7:5.5:penetration-testing:unknown-environment` | Unknown Environment | kein Vorwissen über Systeme/Verteidigung | `ambiguous` |
| `req:sy0701:v7:5.6:phishing:recognizing-a-phishing-attempt` | Phishing-Merkmal | leicht abgewandelte Absenderdomain | `ambiguous` |
| `req:sy0701:v7:5.6:user-guidance-and-training:removable-media-and-cables` | Wechselmedien | nur autorisierte/verschlüsselte Medien | `distractor-issue` |
| `no clear match (Umbrella 3.4 Power)` | Strom in DR-Planung | outages → downtime/data loss | `duplicate` |
| `no clear match (Acronym-Appendix)` | Akronym CRC | cyclical redundancy check | `ambiguous` |
| `no clear match` | ISO-Akronym | international standards organization | `factually-questionable` |
| `no clear match` | VBA-Akronym | Visual Basic | `factually-questionable` |
| `no clear match` | WPS-Akronym | Wi-Fi protected setup | `ambiguous` |
| `no clear match` | WTLS-Akronym | wireless transport layer security | `distractor-issue` |

## Requirement-Coverage (alle 634 getroffenen Leaves, Fragenzahl je Requirement)

Vollständige Zuordnung siehe `practice-questions-coverage-mapping.json` (`requirementCoverage`). Requirements mit mehreren Fragen im Video (Mehrfachabdeckung, meist Domain-übergreifende Akronyme oder mehrfach gestellte Kernkonzepte):

| Requirement | Fragenanzahl |
|---|---|
| `req:sy0701:v7:3.2:infrastructure-considerations:network-appliances:intrusion-prevention-system-ips-intrusion-detect` | 9 |
| `req:sy0701:v7:1.4:encryption:algorithms` | 6 |
| `req:sy0701:v7:1.4:hashing` | 6 |
| `req:sy0701:v7:4.1:wireless-security-settings:authentication-protocols` | 6 |
| `req:sy0701:v7:1.4:encryption:symmetric` | 5 |
| `req:sy0701:v7:3.2:secure-communication-access:tunneling:internet-protocol-security-ipsec` | 5 |
| `req:sy0701:v7:4.1:wireless-security-settings:cryptographic-protocols` | 5 |
| `req:sy0701:v7:5.1:policies:incident-response` | 5 |
| `req:sy0701:v7:1.4:encryption:asymmetric` | 4 |
| `req:sy0701:v7:2.2:message-based:instant-messaging-im` | 4 |
| `req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:cloud:responsibility-matrix` | 4 |
| `req:sy0701:v7:3.1:architecture-and-infrastructure-concepts:industrial-control-systems-ics-supervisory-contr` | 4 |
| `req:sy0701:v7:3.2:secure-communication-access:virtual-private-network-vpn` | 4 |
| `req:sy0701:v7:4.1:wireless-security-settings:wi-fi-protected-access-3-wpa3` | 4 |
| `req:sy0701:v7:4.3:identification-methods:threat-feed:information-sharing-organization` | 4 |
| `req:sy0701:v7:4.6:single-sign-on-sso:lightweight-directory-access-protocol-ldap` | 4 |
| `req:sy0701:v7:1.4:certificates:certificate-authorities` | 3 |
| `req:sy0701:v7:1.4:digital-signatures` | 3 |
| `req:sy0701:v7:1.4:encryption:level:full-disk` | 3 |
| `req:sy0701:v7:1.4:encryption:transport-communication` | 3 |
| `req:sy0701:v7:2.2:supply-chain:managed-service-providers-msps` | 3 |
| `req:sy0701:v7:2.3:web-based:structured-query-language-injection-sqli` | 3 |
| `req:sy0701:v7:2.4:application-attacks:forgery` | 3 |
| `req:sy0701:v7:2.4:network-attacks:domain-name-system-dns-attacks` | 3 |
| `req:sy0701:v7:2.5:access-control:access-control-list-acl` | 3 |
| `req:sy0701:v7:3.3:data-types:regulated` | 3 |
| `req:sy0701:v7:4.1:wireless-security-settings:aaa-remote-authentication-dial-in-user-service-r` | 3 |
| `req:sy0701:v7:4.4:tools:security-information-and-event-management-siem` | 3 |
| `req:sy0701:v7:4.5:endpoint-detection-and-response-edr-extended-det` | 3 |
| `req:sy0701:v7:4.6:multifactor-authentication:implementations:hard-soft-authentication-tokens` | 3 |
| `req:sy0701:v7:5.1:policies:software-development-lifecycle-sdlc` | 3 |
| `req:sy0701:v7:5.3:agreement-types:work-order-wo-statement-of-work-sow` | 3 |
| `req:sy0701:v7:1.2:authentication-authorization-and-accounting-aaa:authenticating-people` | 2 |
| `req:sy0701:v7:1.2:confidentiality-integrity-and-availability-cia` | 2 |
| `req:sy0701:v7:1.2:physical-security:video-surveillance` | 2 |
| `req:sy0701:v7:1.4:certificates:certificate-revocation-lists-crls` | 2 |
| `req:sy0701:v7:1.4:certificates:certificate-signing-request-csr-generation` | 2 |
| `req:sy0701:v7:1.4:certificates:online-certificate-status-protocol-ocsp` | 2 |
| `req:sy0701:v7:1.4:encryption:key-exchange` | 2 |
| `req:sy0701:v7:1.4:encryption:key-length` | 2 |

(+ 109 weitere mit Mehrfachabdeckung, siehe JSON)

## Herkunft der Chunks

| Chunk | Zeilen | Fragen | Flags |
|---|---|---|---|
| 1 | 1-857 | 185 | 17 |
| 2 | 858-1714 | 159 | 8 |
| 3 | 1715-2571 | 137 | 11 |
| 4 | 2572-3428 | 139 | 10 |
| 5 | 3429-4285 | 154 | 16 |
| 6 | 4286-5147 | 261 | 10 |

## Einschränkungen

- Automatische Untertitel (ASR): Begriffe wie *phishing*, *steganography*, *obfuscation*, *hacktivist*, *bollards* sind im Transkript teils verschrieben; das ist ein reines Transkriptionsartefakt und wurde beim Mapping berücksichtigt, nicht als Qualitätsmangel gewertet.
- 34 Fragen zielen auf einen Objective-**Zweig** (z. B. „4.6 Multifactor authentication“ allgemein), für den die 655er-Taxonomie nur Kind-Leaves aber keinen eigenen Eintrag führt — diese sind unter `branchLevelTopics` in der JSON separat aufgeführt, nicht in der 634er-Coverage-Zahl enthalten.
- 154 Fragen (überwiegend der reine Akronym-Anhang am Videoende) haben kein eindeutiges Gegenstück in den 655 Requirements, sind aber prüfungsrelevant und teilweise über die offizielle Akronymliste (`sy0-701-acronyms.json`) referenzierbar.
