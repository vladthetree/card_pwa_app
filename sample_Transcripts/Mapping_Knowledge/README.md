# Mapping: Messer-Einzellektionen ↔ SY0-701-Cram-Domain-Videos

**Datum:** 2026-08-09
**Umfang:** alle 120 Messer-Einzellektionsvideos (Domain 1–5) gegen die 5 neu heruntergeladenen „DOMAIN X COMPLETE"-Cram-Transkripte in `sample_Transcripts/`
**Methode:** 5 unabhängige Domänen-Durchgänge (Modell Opus), jeder Durchgang hat das komplette Cram-Transkript seiner Domain vollständig gelesen (nicht nur gegrept) und jede einzelne Messer-Lektion gegen den Cram-Inhalt geprüft.

## Ausgangslage

Professor Messer veröffentlicht zwei getrennte Video-Formate zu SY0-701:

1. **120 Einzellektionsvideos** — je ein Thema pro Video, bereits vollständig im Projekt transkribiert (`youtube-playlists/CompTIA SY0-701 .../transcripts/`, Metadaten in `card_pwa/content/sy0-701/source/videos-manifest.json`).
2. **5 „Exam Cram"-Domain-Videos** — je ein langes, verdichtetes Rückblick-Video pro CompTIA-Domain (jetzt in `sample_Transcripts/`).

Die Cram-Videos sind **keine** Aneinanderreihung der Einzellektionen, sondern eigenständig formulierte Zusammenfassungen. Wortlaut, Reihenfolge und Tiefe weichen zum Teil deutlich ab. Trotzdem markiert der Sprecher Objective-Übergänge (z. B. „1.1", „1.2" …) explizit im Text — dieses Muster wurde als primärer Ankerpunkt genutzt, aber pro Domain gegen Fehltreffer (Rückverweise auf andere Domains, wiederholte Erwähnungen, Versionsnummern wie „2.4 GHz" oder „802.1X") geprüft.

## Gesamtergebnis

| Domain | Videos | abgedeckt | teilweise | verschmolzen | fehlt |
|---|---:|---:|---:|---:|---:|
| 1 – General Security Concepts | 18 | 17 | 0 | 1 | 0 |
| 2 – Threats, Vulnerabilities, Mitigations | 38 | 35 | 1 | 2 | 0 |
| 3 – Security Architecture | 18 | 18 | 0 | 0 | 0 |
| 4 – Security Operations | 29 | 29 | 0 | 0 | 0 |
| 5 – Security Program Management | 17 | 17 | 0 | 0 | 0 |
| **Gesamt** | **120** | **116** | **1** | **3** | **0** |

**Statusdefinition:**
- **abgedeckt** — das Thema der Einzellektion ist im Cram klar wiedererkennbar und eigenständig behandelt.
- **teilweise** — nur am Rand bzw. in reduzierter Form erwähnt.
- **verschmolzen** — im Cram nicht als eigener Abschnitt erkennbar, sondern in einem Nachbarthema aufgegangen.
- **fehlt** — im Cram nicht auffindbar (kam in keiner Domain vor).

Kein einziges Thema fehlt komplett — die Cram-Serie deckt inhaltlich den gesamten Syllabus ab. Domain 5 wird laut dem prüfenden Durchgang sogar ausdrücklich „Zeile für Zeile" nach dem offiziellen Objective-Katalog vorgetragen, was die vollständige 17/17-Abdeckung erklärt. Domain 2 hat die einzigen drei Lücken: zwei Sammelthemen (Malware-Überblick, Memory Injections), die im Cram direkt in Einzeltypen aufgehen, sowie „Malicious Code" als nur knapp gestreifter Netzwerk-Sammelbegriff.

## Wichtig für die weitere Nutzung

- **Reihenfolge weicht in allen 5 Domains stellenweise ab.** Die Cram-Videos folgen teils der offiziellen Syllabus-Bullet-Reihenfolge statt der Kursvideo-Reihenfolge (z. B. wird „Certificates" in Domain 1 direkt nach PKI vorgezogen; „Intrusion Prevention" und „Network Appliances" sind in Domain 3 vertauscht; Domain 4 zieht Risikoreaktionen aus Domain 5 in den 4.3-Abschnitt vor). Details stehen als Notiz bei der jeweiligen Zeile in den Domain-Dateien.
- **Die Cram-Videos enthalten zusätzlichen Stoff ohne Entsprechung in den 120 Einzellektionen** — u. a. Vendor-Demos (Microsoft Entra ID Conditional Access, Zertifikat-Snap-in, Azure Service Trust Portal, Azure-IaC), einen größeren Krypto-Algorithmen-Katalog in Domain 1, eine CSA-„Egregious 11"-Cloud-Liste in Domain 2, sowie in Domain 5 einen vorangestellten Grundlagenblock zu Social-Engineering-Prinzipien (eigentlich Domain-2-Stoff). Cram-Inhalt ist also **nicht** eine Teilmenge der Einzellektionen — es ist ein eigenständiges, teils überlappendes, teils erweitertes Material.
- **`cramAnchor`-Phrasen sind bewusst kurz** (wenige Worte, wörtlich aus dem Transkript) und dienen nur als eindeutige Fundstelle zum Nachschlagen — kein Ersatz für den Volltext. Eine Stichprobe von 10 Ankern (2 je Domain) wurde per Grep gegen die Quelldateien verifiziert: alle exakt einmal vorhanden.

## Dateien

- `domain-1-mapping.json` / `.md` — Domain 1, General Security Concepts (18 Videos)
- `domain-2-mapping.json` / `.md` — Domain 2, Threats, Vulnerabilities, and Mitigations (38 Videos)
- `domain-3-mapping.json` / `.md` — Domain 3, Security Architecture (18 Videos)
- `domain-4-mapping.json` / `.md` — Domain 4, Security Operations (29 Videos)
- `domain-5-mapping.json` / `.md` — Domain 5, Security Program Management and Oversight (17 Videos)

JSON-Schema pro Eintrag:
```json
{
  "videoIndex": 2,
  "objective": "1.1",
  "videoTitle": "Security Controls",
  "domain": 1,
  "cramFile": "CompTIA Security+ SY0-701 - DOMAIN 1 COMPLETE [SmzTNZwJnIw].txt",
  "coverageStatus": "covered",
  "cramAnchor": "So we'll start with categories of security controls",
  "note": null
}
```

---

# Teil 2: Objectives ↔ Transkript-Mapping (destilliert, alle 655 Requirements)

**Datum:** 2026-08-09 (Fortsetzung)
**Umfang:** alle 655 offiziellen SY0-701-Objective-Blattpunkte (aus `card_pwa/content/sy0-701/generated/sy0-701-requirements.json`), für jeden destilliert, was Messers Einzellektion **und** das jeweilige Cram-Video dazu tatsächlich sagen.
**Unterschied zu Teil 1:** Teil 1 mappt ganze Videos gegeneinander (grobkörnig, mit kurzen Ankerphrasen). Teil 2 geht auf die feinste offizielle Objective-Ebene herunter (z. B. 1.4 → Encryption → Key exchange) und destilliert den Inhalt in eigenen Worten — kein Kartenabgleich, reine Wissensdestillation aus den Quellen.

## Methode

5 Domänen, 30 Objective-Batches (je ein `general-purpose`-Agent pro Objective), jeder Agent hat die zugehörigen Messer-Einzellektionen und den passenden Cram-Abschnitt vollständig gelesen und pro Requirement 1–3 destillierte Sätze (eigene Worte, keine langen Zitate) verfasst. Keine Kartenprüfung — auf ausdrücklichen Wunsch des Nutzers.

## Ergebnis

| Domain | Requirements |
|---|---:|
| 1 – General Security Concepts | 93 |
| 2 – Threats, Vulnerabilities, Mitigations | 125 |
| 3 – Security Architecture | 105 |
| 4 – Security Operations | 200 |
| 5 – Security Program Management | 132 |
| **Gesamt** | **655** |

## Wichtige Beobachtungen aus der Destillation

- **Mehrere echte Quellenkonflikte gefunden**, z. B.: MOA rechtlich bindend (Cram) vs. nicht bindend (Messer, Domain 5.3); Due Diligence/Due Care unterschiedlich abgegrenzt (Domain 5.4); Attestation meint bei Messer Identitätsnachweis, im Cram-Video Device Attestation (Domain 4.6); OSI-Merkhilfe-Richtung in der PBQ-Domain (aus Teil 1).
- **Alle 655 Einträge tragen ein Feld `possibleSourceConflict` (JSON) bzw. eine ⚠-Markierung (Markdown).** 15 Requirements sind so markiert — echte inhaltliche Widersprüche zwischen Messer und Cram-Video (zwei unvereinbare Definitionen desselben Begriffs), keine bloßen Ergänzungen. **Der Konflikttext selbst wurde dabei nirgends entfernt oder aufgelöst** — beide Sichtweisen stehen weiterhin vollständig im `distilledContent`; das Flag ist nur eine zusätzliche, durchsuchbare Markierung obendrauf.

**Die 15 markierten Requirement-IDs:**
| Requirement | Konflikt (Kurzfassung) |
|---|---|
| `2.3:virtualization:resource-reuse` | Messer: Hypervisor-Speicherüberbuchung. Cram: Datenreste bei Cloud-Ressourcen-Weitergabe. |
| `2.4:network-attacks:malicious-code` | Messer: breite Malware-Kategorie. Cram: eigene Netzwerk-Angriffskategorie. |
| `2.4:indicators:out-of-cycle-logging` | Messer: Änderungen außerhalb des Patch-Fensters. Cram: unregelmäßiger Logging-Zeitplan selbst. |
| `2.4:indicators:published-documented` | Messer: eigene Daten geleakt. Cram: öffentlich bekannter, getrackter Exploit. |
| `3.4:testing:parallel-processing` | Messer: gleichzeitige CPU-Nutzung. Cram: DR-Testform mit Parallelbetrieb. |
| `4.1:wireless-devices:heat-maps` | Farbkonvention für Signalstärke gegensätzlich. |
| `4.1:mobile-solutions:cyod` | Eigentümer des Geräts: Firma (Messer) vs. Mitarbeiter kauft (Cram). |
| `4.2:monitoring-asset-tracking:enumeration` | Messer: Asset in Bauteile zerlegen. Cram: Netzgeräte-Scan. |
| `4.3:application-security:package-monitoring` | Messer: Vertrauensprüfung von Paketen. Cram: Monitoring von OSS-Bibliotheken. |
| `4.6:attestation` | Messer: Identitätsnachweis. Cram: Device Attestation. |
| `5.2:risk-tolerance` | Messer: Bandbreite um den Risikoappetit. Cram: Tragfähigkeit der Organisation. |
| `5.3:agreement-types:moa` | Rechtlich bindend (Cram) vs. nicht bindend (Messer). |
| `5.4:compliance-monitoring:due-diligence-care` | Grenzlinie intern/extern (Messer) vs. Bewertung/Maßnahme (Cram). |
| `5.4:compliance-monitoring:attestation-and-acknowledgement` | Führungskraft (Messer) vs. Mitarbeitende (Cram). |
| `5.5:penetration-testing:reconnaissance:passive` | DNS-Abfrage: aktiv (Messer) vs. passiv (Cram). |
- **Messers eigenes Transkript enthält denselben Fehler „Central Compliance Officer" statt „Chief Compliance Officer"**, der bereits in der Kartenqualitätsprüfung vom Vormittag als Kartenfehler auffiel (Domain 5.4) — die Quelle des Fehlers liegt also im Ursprungsmaterial, nicht nur in der Kartengenerierung.
- **Viele Requirements sind in der Vorgaben-Zuordnung (`videos-manifest.json`/`content-qa-report.json`) einem anderen Video zugeordnet, als tatsächlich zutrifft** — die Agents haben das pro Domain korrigiert und in den Dateien vermerkt (z. B. `monitoring-and-revision` und alle Governance-Structure-Punkte in Domain 5.1 stehen tatsächlich in Video 107, nicht 108 wie vorgegeben).
- **Einige Requirements kommen in einer der beiden Quellen gar nicht vor** (explizit vermerkt statt erfunden), z. B. „Guidelines" fehlt komplett bei Messer, „Business Continuity"/„Disaster Recovery" als Policy fehlen im Cram-Abschnitt 5.1.

## Dateien

- `domain-1-requirement-mapping.json` / `.md` — 93 Requirements (Objectives 1.1–1.4)
- `domain-2-requirement-mapping.json` / `.md` — 125 Requirements (Objectives 2.1–2.5)
- `domain-3-requirement-mapping.json` / `.md` — 105 Requirements (Objectives 3.1–3.4)
- `domain-4-requirement-mapping.json` / `.md` — 200 Requirements (Objectives 4.1–4.9)
- `domain-5-requirement-mapping.json` / `.md` — 132 Requirements (Objectives 5.1–5.6)

JSON-Schema pro Eintrag:
```json
{
  "requirementId": "req:sy0701:v7:1.4:encryption:key-exchange",
  "domain": 1,
  "objective": "1.4",
  "sourcePath": "1.4 > Encryption > Key exchange",
  "distilledContent": "Kernproblem ist, den gemeinsamen Schlüssel zu übergeben, ohne ihn über ein unsicheres Medium zu schicken: ..."
}
```
