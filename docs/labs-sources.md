# Labs — Quellen und Verifikation

Stand: 2026-06-10. Diese Datei dokumentiert die oeffentliche Quellenbasis fuer
`card_pwa/src/data/labScenarios.ts`. Die maschinenlesbare Quelle bleibt die
Registry `LAB_SOURCES` + `LAB_SCENARIO_SOURCE_REFS` in `labScenarios.ts`; Tests
erzwingen, dass jedes Szenario mindestens zwei Quellen referenziert und immer
die offiziellen CompTIA-SY0-701-Objectives enthaelt.

## Primaere Quellen

| Quelle | Publisher | Zweck |
|---|---|---|
| https://assets.ctfassets.net/82ripq7fjls2/6TYWUym0Nudqa8nGEnegjG/0f9b974d3b1837fe85ab8e6553f4d623/CompTIA-Security-Plus-SY0-701-Exam-Objectives.pdf | CompTIA | Offizielle SY0-701-Domains, Objectives und Begriffsumfang |
| https://csrc.nist.gov/pubs/sp/800/61/r2/final | NIST | Klassischer Incident-Handling-Lebenszyklus |
| https://csrc.nist.gov/pubs/sp/800/61/r3/final | NIST | Aktuelle IR-Einbettung in Cyber-Risikomanagement |
| https://www.cisa.gov/stopransomware/ransomware-guide | CISA | Ransomware-Praevention, Eindaemmung und Recovery |
| https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-207.pdf | NIST | Zero-Trust-Architektur, Policy Engine/Admin/PEP |
| https://www.cisa.gov/zero-trust-maturity-model | CISA | Zero-Trust-Pfeiler und Maturity Model |
| https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html | Cisco | ACL-Reihenfolge, First Match, implicit deny |
| https://docs.paloaltonetworks.com/network-security/security-policy/administration/security-rules | Palo Alto Networks | Firewall-Policy-Reihenfolge und spezifische Regeln vor generischen |
| https://owasp.org/Top10/2021/ | OWASP | Web-App-Schwachstellen wie Access Control, Injection, SSRF |
| https://attack.mitre.org/ | MITRE | Angriffstaktiken, Techniken, Datenquellen und Sequenzen |
| https://aws.amazon.com/compliance/shared-responsibility-model/ | AWS | Shared Responsibility in Cloud-Modellen |
| https://csrc.nist.gov/pubs/sp/800/63/b/upd2/final | NIST | Digitale Authentisierung, MFA und Authenticator Lifecycle |
| https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf | NIST | CSF 2.0: Govern/Identify/Protect/Detect/Respond/Recover |
| https://www.cisa.gov/topics/information-communications-technology-supply-chain-security/sbom | CISA | SBOM und Software-Supply-Chain-Transparenz |
| https://www.cisa.gov/securebydesign | CISA | Secure-by-Design-/SDLC-Prinzipien |
| https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final | NIST | Kryptografisches Key Management |
| https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=908084 | NIST | Encryption Basics fuer Data at Rest/In Transit |
| https://csrc.nist.gov/pubs/sp/800/88/r2/ipd | NIST | Media Sanitization (aktuelle oeffentliche Draft-Fassung) |

## Inventarstand

Zielzahl aus dem Handy-Screenshot: 71 Szenarien.

| Kategorie | Anzahl |
|---|---:|
| Security-Grundlagen | 8 |
| Bedrohungen & Angriffe | 8 |
| Firewalls & Netzwerk | 12 |
| Sichere Architektur | 8 |
| Identitaet & Zugriff | 8 |
| Incident Response | 12 |
| Kryptografie & PKI | 8 |
| Governance & Risiko | 7 |

Verifikation:

```bash
cd card_pwa
TZ=UTC npm test -- --run src/__tests__/utils/lab-scenarios.test.ts
```
