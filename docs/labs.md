# Labs — KI-Autorendoku (Interaktive Sicherheits-Szenarien)

> Status: **ausgebaut 2026-06-11** (zuvor neu generiert 2026-06-10). Struktur und UI
> rekonstruiert aus den Handy-Screenshots vom 8. Juni 2026
> (`…23.38.26/.47/.57/.39.17/.39.49.jpeg`, RECOVERY_LOG §1, Git-Historie bis `f72ffd6`).
> Inventar: `card_pwa/src/data/labScenarios.ts`.
> **Ziel-Inventar: 100 Szenarien** (Ausbau ueber den belegten 71er-Handy-Stand,
> Pill „4 / 71", hinaus) — alle SY0-701-Domains inkl. der zuvor fehlenden
> Objectives 4.1–4.4/4.7 (neue Kategorie `betrieb`), Schwerpunkt weiterhin
> **Firewalls / Incident Response** (Nutzer-Vorgabe). Jedes Szenario ist ueber
> `LAB_SCENARIO_SOURCE_REFS` auf oeffentliche Quellen zurueckfuehrbar.

## Zweck

Labs sind geführte Mini-Szenarien („Interaktive Sicherheits-Szenarien") außerhalb des
Karten-/FSRS-Systems: Beschreibung + BEWEISMATERIAL/NETZWERKTOPOLOGIE + Ziel, dann
**Dropdown-Zuordnung** (Matching) oder **Drag-Reihenfolge** (Ordering) und „Antwort
prüfen". Gelöste Szenarien erhalten dauerhaft den Status **GESCHAFFT** (localStorage).
Scoring nutzt `utils/pbqScoring.ts` (`computeMatchingScore`/`computeOrderingScore`);
gelöst = Score 1.0.

## Eingabe-/Encoding-Format

Szenarien sind TypeScript-Objekte in `card_pwa/src/data/labScenarios.ts`:

```ts
{
  id: '<kategorie>-<slug>',           // eindeutig, kebab-case
  categoryId: '<LAB_CATEGORIES.id>',  // grundlagen | bedrohungen | firewalls |
                                      // architektur | iam | betrieb |
                                      // incident-response | krypto | governance
  title: '<max. ~45 Zeichen>',
  objective: '<x.y SY0-701-Objective-Label>'  // oder 'Acronym-Bonus'
  difficulty: 'einsteiger' | 'fortgeschritten' | 'experte',
  minutes: 3 | 4 | 5,
  description: '<Szenario-Auftrag, 2–4 Sätze, du-Form>',
  evidence?:  '<BEWEISMATERIAL-Box, mehrzeilig (\n), z. B. Ticket/Log-Auszug>',
  topology?:  '<NETZWERKTOPOLOGIE-Box, ASCII: A -> [B] -> C>',
  goal?:      'Ziel: <ein Satz>',     // amber Callout
  interaction:
    | { type: 'matching',
        items: [{ left: '<Element>', right: '<korrektes Pendant>' }, ...],
        options: ['<alle rechten Werte + ggf. Distraktoren>'] }
    | { type: 'ordering',
        steps: ['<Schritte in BEWUSST gemischter Anzeige-Reihenfolge>'],
        correctOrder: [<Indizes in steps, Lösungs-Reihenfolge>] }
}
```

Quellen werden bewusst zentral statt in jedem Objekt gepflegt:

```ts
LAB_SOURCES                  // oeffentliche Quellen mit URL, Publisher, Abrufdatum
LAB_SCENARIO_SOURCE_REFS     // scenarioId -> sourceIds
getLabScenarioSources(id)    // aufgeloeste Quellen fuer ein Szenario
```

Invarianten (durch `__tests__/utils/lab-scenarios.test.ts` abgesichert):
- IDs eindeutig; `categoryId` existiert; jedes `right` kommt in `options` vor;
  `correctOrder` ist eine Permutation von `0..steps.length-1`.
- Inventar hat exakt 100 Szenarien; Firewalls und Incident Response haben je 14
  Szenarien, `betrieb` (Security Operations) hat 12 und deckt die Objectives
  4.1–4.4 und 4.7 ab; jede Kategorie hat mindestens 9 Szenarien; jedes Szenario
  nennt mindestens zwei oeffentliche Quellen und immer die offiziellen
  CompTIA-SY0-701-Objectives.
- `steps` niemals in Lösungs-Reihenfolge autorieren (sonst ist das Szenario trivial).

## Dos & Don'ts

**Do**
- Realistische Artefakte ins `evidence`: Ticket-Nummern, Log-Zeilen, Regelwerke.
- Firewall-Ordering: Top-Down/First-Match-Logik abbilden (Spezifisch vor generisch,
  implicit DENY ans Ende) — wie das belegte „Geo-Block vor Web-Allow".
- Matching: 3–6 Paare; Ordering: 3–7 Schritte.
- Deutsch mit ue/oe/ae-Transliteration (konsistent zum Kartenbestand).

**Don't**
- Kein reines Faktenwissen ohne Szenario-Rahmen (dafür gibt es Karten).
- Keine Mehrdeutigkeit in der Lösungs-Reihenfolge — wenn zwei Reihenfolgen vertretbar
  sind, das Szenario enger formulieren oder das `goal` präzisieren.
- Keine Distraktor-Option, die für ein anderes Item ebenfalls korrekt wäre.

## Schwierigkeits-/Längen-Vorgaben

| Stufe | Interaktion | Minuten |
|---|---|---|
| Einsteiger | 3–4 Paare/Schritte, eindeutige Zuordnung | 3–4 |
| Fortgeschritten | 4–6 Paare/Schritte, Evidence nötig | 4–5 |
| Experte | 5–7 Schritte, Reihenfolge-Feinheiten (First-Match, Forensik-Prioritäten) | 4–5 |

Ziel-Verteilung im 100er-Inventar: `grundlagen` 9, `bedrohungen` 11, `firewalls` 14,
`architektur` 10, `iam` 10, `betrieb` 12, `incident-response` 14, `krypto` 10,
`governance` 10.
Historie: Die urspruengliche 71er-Zahl stammt aus dem Handy-Screenshot
(Pill „4 / 71"). Der Ausbau auf 100 (2026-06-11) schliesst die zuvor ungedeckten
Objectives 4.1 (Haertung/Wireless/Mobile), 4.2 (Asset-Management),
4.3 (Vulnerability-Management), 4.4 (Alerting/Monitoring) und
4.7 (Automation/SOAR) ueber die neue Kategorie `betrieb` und vertieft duenne
Bereiche (Angriffstypen in 2.4, quantitatives Risiko in 5.2, Privacy in 5.4).

## Trainings-Generator (Blueprints) — ab 2026-06-12

Ergaenzend zum kuratierten 100er-Inventar gibt es einen offline-faehigen
Trainings-Generator: pro Kategorie ein „Uebungs-Lab generieren"-Button, der aus
validierten Wissens-Pools deterministisch frische Szenarien kombiniert.

**Architektur-Entscheidung** (evaluierte Alternativen):
- Hand-Authoring von ~10.000 Szenarien: skaliert nicht (Datei-/Review-/Quellen-Pflege). Verworfen.
- LLM-Generierung zur Laufzeit: bricht Offline-PWA, nicht deterministisch pruefbar. Verworfen.
- **Gewaehlt: Blueprint-System** — hand-validierte Pools + seeded Kombinatorik.

**Bausteine:**
- `card_pwa/src/data/labBlueprints.ts` — Pools: Matching-Paare (12 je Pool,
  Instanz zieht 4–6) bzw. strikt geordnete Schrittfolgen mit Parameter-Tupeln.
- `card_pwa/src/utils/labGenerator.ts` — mulberry32-PRNG; ID
  `gen-<blueprint>-<seed>` (reproduzierbar); kanonische Signatur (gezogene
  Paar-Menge bzw. Schrittauswahl+Parametersatz) fuer Anti-Dopplung;
  `countTotalVariants()` fuer die Kapazitaet.
- `card_pwa/src/utils/labTraining.ts` — geloeste Signaturen in localStorage
  (`card-pwa-labs-training-solved`), getrennt von der kuratierten Pill;
  geloeste Varianten werden beim Generieren ausgeschlossen.

**Eindeutigkeit per Konstruktion:**
- Matching: poolweit eindeutige lefts/rights, jedes right passt nur zu seinem
  left → jede Teilmenge ist eindeutig loesbar; Distraktoren sind automatisch
  die rechten Seiten nicht gezogener Paare (plausibel, garantiert falsch).
- Ordering: strikt totale Ordnung; mit `sampleSteps` markierte Pools bleiben
  fuer jede Teilfolge eindeutig (z. B. Order of Volatility); die
  Firewall-Regelkette ist streng geschachtelt mit alternierenden Aktionen —
  jede Vertauschung aendert das Verhalten.

**Kapazitaet (Stand 2026-06-12, nach Streng-Review):** 20.037 unterscheidbare
Uebungs-Labs (jede Kategorie ≥ 2.211; Ziel ≥ 9.999), abgesichert durch
`__tests__/utils/lab-generator.test.ts`. Neue Pools/Blueprints erhoehen die
Kapazitaet kombinatorisch: 12 validierte Paare ≙ 2.211 Varianten.

**Streng-Review 2026-06-12 (SY0-701-Konformitaet der Kombinationen):**
- Kreuz-Ambiguitaet: Da der Generator beliebige Teilmengen zieht, muss jedes
  `right` gegen JEDES `left` des Pools eindeutig sein. Deshalb entfernt:
  Web-/Content-Filter (laut 4.5 selbst "centralized proxy" → kollidiert mit
  Forward Proxy); Load-Balancer-Definition um Health-Checks geschaerft
  (Abgrenzung Reverse Proxy).
- Nur-701-Begriffe: 601-Altlasten ersetzt (Whaling → Brand Impersonation;
  FAR/FRR/CER → SSO, Time-of-day Restriction, Password Manager; Perfect
  Forward Secrecy/Cert-Pinning → Key Exchange, Blockchain/Open Public Ledger;
  Dwell Time/War Room → Root Cause Analysis, Threat Hunting; AUP/Defense in
  Depth im 1.2-Pool → Access Badge, Adaptive Identity).
- Order of Volatility: RAM, Prozesse und fluechtiger Netzwerk-Status liegen
  nach RFC 3227 auf EINER Stufe — im Drill ein gemeinsamer Schritt, sonst
  waere die Reihenfolge mehrdeutig. Kuratiertes `ir-forensic-volatility`
  korrigiert (Disk VOR Remote-Logs; Hashing nach der letzten Sicherung).
- Firewall-Regelkette: Story auf Internet/Firmen-WAN umgestellt (RFC1918-
  Quellen hinter reinem "Internet"-Perimeter waren Bogons); CIDR-Nesting
  (badHost ∈ branchNet ⊂ regionNet) jetzt als Test-Invariante.
- Anti-Dopplung: Test erzwingt, dass kein Blueprint-Paar ein kuratiertes
  Szenario-Paar wiederholt (normalisierter left/right-Vergleich).

**Pool-Authoring (KI-Prompt-tauglich):** Neue Paare muessen poolweit eindeutige
lefts/rights haben und duerfen sich nicht mit kuratierten Szenario-Paaren
doppeln; neue Ordering-Pools nur, wenn eine strikte Totalordnung begruendbar
ist. Quellen wie gehabt ueber `sourceIds` gegen `LAB_SOURCES`.

**Qualitaets-Gate:** Vor jedem Content-Release den Review-Prompt aus
`docs/labs-review-prompt.md` vollstaendig anwenden (P1 Korrektheit, P2
Eindeutigkeit, P3 Nachvollziehbarkeit, P4 Scope, P5 Didaktik, P6 Usability);
S1/S2-Befunde sind Blocker.

## Beispiel-Prompt

> Erstelle 4 Lab-Szenarien für die Kategorie `firewalls` (SY0-701, deutsch, ue/oe/ae)
> im Encoding aus docs/labs.md: 2× ordering (Firewall-Regelwerke, Top-Down/First-Match,
> implicit DENY), 2× matching (Traffic → greifende Regel; System → Zone). Jedes
> Szenario mit `evidence` oder `topology`, Experte-Szenarien mit `goal`-Callout.
> `steps` gemischt autorieren und `correctOrder` als Permutation angeben.

## Beispiel-Output (belegtes Original-Szenario)

```ts
{
  id: 'firewalls-geo-block',
  categoryId: 'firewalls',
  title: 'Geo-Block vor Web-Allow',
  objective: '3.2 Applying Security Principles',
  difficulty: 'experte',
  minutes: 4,
  description: 'Nach DDoS-Attacken aus bestimmten Laendern soll ein Geo-Block (z.B. 185.204.0.0/16) Web-Zugriff vor dem regulaeren HTTPS-Allow blockieren. Ordne die Regeln korrekt.',
  topology: 'Internet -> [Firewall] -> DMZ Webserver 192.168.1.10:443',
  goal: 'Ziel: Block bekannter Bad-Networks zuerst, danach Standard-Allow-Web-Zugriff, dann implicit DENY.',
  interaction: {
    type: 'ordering',
    steps: [
      'DENY  ANY  ANY → ANY  :ANY',
      'DENY  ANY  185.204.0.0/16 → ANY  :ANY',
      'ALLOW TCP  ANY → 192.168.1.10  :443',
    ],
    correctOrder: [1, 2, 0],
  },
}
```
