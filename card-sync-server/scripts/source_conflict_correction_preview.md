# Vorschau: Quellenkonflikte in Domain-Mappings und Live-Karten

Stand: 2026-08-13

Diese Datei ist eine reine Änderungsvorschau. Datenbank und Mapping-Wissensbase wurden noch nicht verändert.

## Ergebnis der Quellenprüfung

Alle 15 als `⚠ QUELLENKONFLIKT` markierten Stellen wurden gegen die offiziellen CompTIA-SY0-701-Prüfungsziele und, wo CompTIA einen Begriff nur nennt, gegen passende Primärquellen wie NIST, CISA und OWASP geprüft.

| # | Thema | Ergebnis | Geplante Auswirkung |
|---:|---|---|---|
| 1 | Resource reuse | **Fachliche Korrektur.** Gemeint ist die Wiedervergabe einer Ressource, ohne Restinformationen des vorherigen Nutzers sicher zu entfernen. Eine bloße fehlerhafte Speichertrennung zwischen gleichzeitig laufenden VMs ist nicht die Definition. | Frage und Erklärung einer Live-Karte korrigieren; Mapping auf NIST „Object Reuse/Residual Information Protection“ ausrichten. |
| 2 | Malicious code | **Einordnung präzisieren.** CompTIA führt „Malicious code“ unter Network Attacks; der Begriff selbst bezeichnet weiterhin schädlichen Code. Die im Cram-Material daneben genannten Angriffe sind keine Definition von Malicious Code. | Live-Karte ist bereits fachlich richtig; nur Mapping-Kommentar aktualisieren. |
| 3 | Out-of-cycle logging | **Kein echter Widerspruch.** „Außerhalb eines erwarteten Zyklus/Zeitfensters“ umfasst ungewöhnliche Logzeiten ebenso wie Aktivitäten außerhalb normaler Patch-, Change- oder Geschäftsfenster. | Hauptkarte unverändert; nur eine veraltete Konfliktformulierung in einem Distraktor bereinigen. |
| 4 | Published/documented | **Begriff in den CompTIA-Zielen nicht ausdefiniert.** Für die Karte wird die defensive Nutzung bereits veröffentlichter oder dokumentierter IoCs und Angriffsmuster verwendet. NIST SP 800-150 stützt diesen Threat-Intelligence-Anwendungsfall. | Zwei Live-Erklärungen präzisieren und die verbleibende Mehrdeutigkeit im Mapping offen kennzeichnen. |
| 5 | Parallel processing | **Fachliche Kontextkorrektur.** In SY0-701 3.4 steht der Begriff unter Tests für Resilienz und Wiederherstellung: Primär- und Alternativumgebung laufen während des Tests parallel. Die allgemeine CPU-Bedeutung ist hier nicht prüfungszielgerecht. | Vier Live-Karten bzw. Distraktoren bereinigen; eine falsche Aussage über einen notwendigen realen Failover-Vorfall ersetzen. |
| 6 | Heat maps | **Kein fachlicher Widerspruch.** Die Farbpalette ist werkzeug- und konfigurationsabhängig; maßgeblich sind Messwert und Legende. | Drei veraltete Konflikthinweise in Live-Karten durch eine quellenneutrale Erklärung ersetzen. |
| 7 | CYOD | **Fachliche Korrektur.** Nach NIST SP 800-124r2 kauft der Mitarbeiter das Gerät aus einer vom Unternehmen freigegebenen Liste; das Gerät gehört dem Mitarbeiter. Organisationseigentum gehört zu COPE. | CYOD-Frage und -Erklärung sowie drei Distraktoren korrigieren. |
| 8 | Enumeration | **Ergänzende Perspektiven.** Im CompTIA-Kontext Monitoring/Asset Tracking bedeutet Enumeration das systematische Ermitteln und Katalogisieren erreichbarer Assets und ihrer Merkmale. Das Zerlegen eines Assets in Bestandteile kann Teil davon sein. | Live-Karte ist bereits passend; nur Mapping aktualisieren. |
| 9 | Package monitoring | **Fachliche Schwerpunktkorrektur.** Im Kontext Vulnerability Management/Application Security geht es primär um das Überwachen von Drittanbieter- und Open-Source-Abhängigkeiten auf bekannte Schwachstellen; Herkunft und Vertrauenswürdigkeit bleiben ergänzende Supply-Chain-Aspekte. | Keine fokussierte Live-Karte vorhanden; Mapping korrigieren. |
| 10 | Attestation in IAM | **Kontextabhängige Bedeutungen, kein binärer Konflikt.** Attestation kann Identitäts- oder Compliance-Aussagen belegen; technisch kann sie signierte Nachweise über Herkunft, Eigenschaften oder Integrität eines Authenticators beziehungsweise Endpunkts liefern. | Drei Live-Erklärungen so formulieren, dass Device/Platform Attestation im jeweiligen Szenario eindeutig ist. |
| 11 | Risk tolerance | **Definitionen vereinbar.** NIST beschreibt sowohl das akzeptable Risikoniveau als auch die Bereitschaft, verbleibendes Risiko zu tragen. Appetite, tolerance und capacity sollten dennoch nicht gleichgesetzt werden. | Live-Karte unverändert; Mapping präzisieren. |
| 12 | MOA | **Keine allgemeingültige Bindungsregel.** Ob ein Memorandum of Agreement rechtlich bindend ist, hängt von Wortlaut, Bindungswillen, Vertretungsmacht und anwendbarem Recht ab, nicht allein von der Dokumentbezeichnung. Behörden verwenden sowohl bindende als auch ausdrücklich nicht bindende MOAs. | Drei Live-Karten von pauschalen Aussagen zur Rechtsverbindlichkeit bereinigen. |
| 13 | Due diligence / due care | **Fachliche Korrektur.** Due Diligence ist die sorgfältige Ermittlung, Prüfung und laufende Verifikation; Due Care sind daraus folgende angemessene Schutzmaßnahmen. Die belastbare Grenze lautet Prüfen versus Handeln, nicht extern versus intern. | Zwei veraltete Distraktoren korrigieren; die fokussierten Live-Karten sind bereits richtig. |
| 14 | Attestation / acknowledgement in Compliance | **Rollen- und sachverhaltsabhängig.** Management kann Compliance attestieren; Beschäftigte können Richtlinien bestätigen oder deren Einhaltung attestieren. | Hauptkarte ist bereits quellenneutral; nur Mapping aktualisieren. |
| 15 | Passive reconnaissance | **Definitionen vereinbar.** Passiv bedeutet keine direkte Interaktion mit dem Ziel. DNS-Daten können passiv aus Drittquellen bzw. Passive-DNS-Diensten oder aktiv durch direkte Abfragen der Zielinfrastruktur erhoben werden. | Live-Karten unverändert; Mapping um die DNS-Abgrenzung ergänzen. |

Damit erfordern neun Themen eine fachliche Auflösung oder Schwerpunktkorrektur (1, 2, 4, 5, 7, 8, 9, 10 und 13). Bei sechs Themen lag kein echter Widerspruch vor oder die Aussage ist kontextabhängig (3, 6, 11, 12, 14 und 15). Auch dort werden irreführende Konfliktmarker entfernt.

## Geplante Kennzeichnung in der Mapping-Wissensbase

Jeder der 15 bisherigen Konfliktblöcke erhält sichtbar den Status:

> **✅ QUELLENPRÜFUNG AKTUALISIERT · 2026-08-13**  
> Ergebnis: …  
> Maßgebliche Einordnung: …  
> Primärquelle: …

Die Überschrift `⚠ QUELLENKONFLIKT` wird entfernt. Wo die offiziellen CompTIA-Ziele einen Begriff lediglich aufführen, wird das ausdrücklich gesagt; eine externe Definition wird nicht als CompTIA-Definition ausgegeben.

Betroffene Mapping-Dateien:

- `sample_Transcripts/Mapping_Knowledge/domain-2-requirement-mapping.md`
- `sample_Transcripts/Mapping_Knowledge/domain-3-requirement-mapping.md`
- `sample_Transcripts/Mapping_Knowledge/domain-4-requirement-mapping.md`
- `sample_Transcripts/Mapping_Knowledge/domain-5-requirement-mapping.md`

## Geplante Änderungen an Live-Karten

21 Karten enthalten entweder einen fachlich zu korrigierenden Inhalt oder eine veraltete Konfliktformulierung:

| Themenblock | Karten-IDs |
|---|---|
| Resource reuse | `1729017832455` |
| Published/documented und Out-of-cycle logging | `1786384200062`, `1786384200063` |
| Parallel processing | `1773618881063`, `1729435542513`, `1786384200100`, `1786384200101` |
| Heat maps | `1786384200106`, `1786384200116`, `1786384200122` |
| CYOD | `1779669260190`, `1779669260191`, `1779669260192`, `1786384200122` |
| Attestation in IAM | `1786384200166`, `1786384200170`, `1786384200177` |
| MOA | `1773007098201`, `1786384200241`, `1786384200243` |
| Due diligence / due care | `1786384200248`, `1786384200249` |

Die Karten-ID `1786384200122` kommt in zwei Themenblöcken vor; es sind daher 21 eindeutige Karten.

Lernfortschritt, Wiederholungsintervalle, Deck-Zuordnung und sonstige Metadaten bleiben unverändert. Geändert werden ausschließlich `front` und/oder `back` der aufgelisteten Karten.

## Repräsentative Vorher-/Nachher-Beispiele

### Resource reuse — Karte `1729017832455`

Vorher, Frage:

> Which virtualization issue can expose memory or resources from one VM to another?

Nachher, Frage:

> Which virtualization issue can expose residual data from a released virtual disk or memory resource to a later tenant or VM instance if the resource is not cleared before reassignment?

Nachher, Kernerklärung:

> Resource Reuse ist die erneute Zuweisung zuvor verwendeter Speicher- oder Systemressourcen. Werden sie vor der Wiedervergabe nicht bereinigt, kann der nächste Mandant beziehungsweise die nächste VM Restdaten des vorherigen Nutzers auslesen; NIST bezeichnet den Schutz dagegen als Object Reuse beziehungsweise Residual Information Protection.

### CYOD — Karte `1779669260190`

Vorher, Kernerklärung:

> Messer beschreibt CYOD als firmeneigenes Gerät mit Auswahlrecht des Nutzers. Das Cram-Video beschreibt es als Auswahl aus freigegebener Liste, aber mit Mitarbeiter als Käufer — die Quellen widersprechen sich beim Eigentum.

Nachher, Kernerklärung:

> Nach NIST SP 800-124r2 ist ein CYOD-Gerät vom Mitarbeiter für den persönlichen Gebrauch gekauft, aber aus einer vom Unternehmen freigegebenen Geräteliste ausgewählt. Entscheidend sind Mitarbeitereigentum und die vorab genehmigte Auswahl; COPE bleibt dagegen organisationseigen.

### Parallel processing — Karte `1773618881063`

Die richtige Antwort bleibt `D: Parallel processing typically handles issues without outages.` Die sachlich falsche Option

> C: Fail over requires organizations to create a significant issue to allow for the fail over to occur.

wird ersetzt durch:

> C: Parallel processing requires the primary environment to be shut down.

Die Distraktorerklärung stellt anschließend klar, dass beim Parallel Processing gerade Primär- und Alternativumgebung gleichzeitig aktiv bleiben.

### MOA — Karten `1773007098201`, `1786384200241`, `1786384200243`

Die pauschale Gegenüberstellung „meist nicht bindend“ versus „ausdrücklich bindend“ wird ersetzt durch:

> Ein MOA dokumentiert Zweck, Rollen, Pflichten und vereinbarte Bedingungen einer Zusammenarbeit. Ob es rechtlich bindend ist, entscheidet nicht die Bezeichnung allein, sondern Wortlaut, Bindungswille, Vertretungsmacht und anwendbares Recht; US-Behörden veröffentlichen sowohl bindende als auch ausdrücklich nicht bindende MOAs.

### Due diligence / due care — Karten `1786384200248`, `1786384200249`

Die Zuordnung „intern versus extern“ wird ersetzt durch:

> Due Diligence bezeichnet die sorgfältige Risikoermittlung, Prüfung und fortlaufende Verifikation; Due Care die daraus abgeleiteten angemessenen Schutzmaßnahmen. Die belastbare Abgrenzung verläuft daher zwischen Prüfen und Handeln, nicht pauschal zwischen externen und internen Aktivitäten.

## Maßgebliche Primärquellen

- CompTIA: [Security+ SY0-701 Exam Objectives](https://assets.ctfassets.net/82ripq7fjls2/6TYWUym0Nudqa8nGEnegjG/0f9b974d3b1837fe85ab8e6553f4d623/CompTIA-Security-Plus-SY0-701-Exam-Objectives.pdf)
- NIST: [Object Reuse](https://csrc.nist.gov/glossary/term/object_reuse)
- NIST SP 800-124r2: [Guidelines for Managing the Security of Mobile Devices in the Enterprise](https://doi.org/10.6028/NIST.SP.800-124r2)
- NIST: [Malware](https://csrc.nist.gov/glossary/term/malware)
- NIST: [Attestation](https://csrc.nist.gov/glossary/term/attestation) und [Authenticator Attestation](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)
- NIST: [Risk Tolerance](https://csrc.nist.gov/glossary/term/risk_tolerance)
- NIST: [Passive Security Testing](https://csrc.nist.gov/glossary/term/passive_security_testing)
- NIST SP 800-150: [Guide to Cyber Threat Information Sharing](https://csrc.nist.gov/pubs/sp/800/150/final)
- CISA: [Using Operational Security to Support a Cyber Security Culture](https://www.cisa.gov/sites/default/files/recommended_practices/RP_Using%20OpSec_v1_Draft.pdf)
- OWASP: [Component Analysis](https://owasp.org/www-community/Component_Analysis) und [Dependency-Check](https://owasp.org/www-project-dependency-check/)
- Bonneville Power Administration: [MOA/MOU Policy](https://www.bpa.gov/-/media/Aep/about/internal-policy-library/policy-140-4-mou-and-moa.pdf)
- Pennsylvania Department of Health: [Beispiel eines ausdrücklich nicht bindenden MOA](https://www.pa.gov/content/dam/copapwp-pagov/en/health/documents/topics/documents/emergency-preparedness/MOA%20Between%20Pennsylvania%20DOH%20and%20Pharmacy.pdf)

## Ablauf nach Freigabe

1. Zeitgestempeltes Backup der SQLite-Datenbank anlegen.
2. Die 21 Live-Karten über die vorhandene Sync-/Datenbankschicht aktualisieren.
3. Alle 15 Mapping-Blöcke mit Ergebnis, Datum und Primärquelle aktualisieren.
4. Prüfen, dass keine alte `QUELLENKONFLIKT`-Formulierung mehr übrig ist.
5. Prüfen, dass ausschließlich die vorgesehenen Karteninhalte und Mapping-Abschnitte geändert wurden und alle Lernmetadaten unverändert sind.
