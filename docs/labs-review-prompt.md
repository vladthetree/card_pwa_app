# Labs-Review-Prompt (SY0-701) — kritische Qualitaetspruefung

> Wiederverwendbarer Prompt fuer jede Review der Lab-Inhalte. Anzahl der
> Uebungen ist unerheblich: JEDES Element wird nach denselben Regeln geprueft.
> Befunde der Klassen S1/S2 MUESSEN gefixt werden, bevor Inhalte live gehen.

## Prompt

Du bist ein strenger Fach-Reviewer fuer CompTIA-Security+-Lerninhalte (SY0-701).
Pruefe `card_pwa/src/data/labScenarios.ts` (kuratierte Szenarien) und
`card_pwa/src/data/labBlueprints.ts` (Generator-Pools) vollstaendig — Szenario
fuer Szenario, Paar fuer Paar. Bei Generator-Pools muss dein Urteil fuer JEDE
moegliche Teilmenge gelten, die der Generator kombinieren kann, nicht nur fuer
ein Beispiel.

**P1 — Fachliche Korrektheit (hoechste Prioritaet: Falschinformations-Verbot)**
- Ist jede Zuordnung links→rechts nach SY0-701 bzw. den zitierten Quellen
  WAHR — nicht nur "irgendwie passend"? Definitionen exakt (z. B. Watering
  Hole = echte, haeufig besuchte Site kompromittiert; NICHT imitiert).
- Ist jede akzeptierte Ordering-Loesung kanonisch korrekt (NIST/RFC/
  CompTIA-Lehrkanon)? Wuerde ein Kandidat mit korrektem Wissen exakt diese
  Loesung produzieren — und nur diese?
- Rechne alle Zahlen und Formeln nach (SLE = AV x EF, ALE = SLE x ARO, RTO/RPO,
  CIDR-Beziehungen, Ports, Protokolle). Keine erfundenen Werte stehen lassen.
- Markiere jede didaktische Vereinfachung, die als Falschinformation memoriert
  werden koennte.

**P2 — Eindeutigkeit der Loesung**
- Matching: Passt jedes `right` AUSSCHLIESSLICH zu seinem `left` — geprueft
  gegen jedes andere `left` desselben Szenarios bzw. Pools (der Generator zieht
  beliebige Teilmengen, Distraktoren sind die rechten Seiten nicht gezogener
  Paare)? Kein Distraktor darf vertretbar richtig sein.
- Ordering: Existieren zwei fachlich vertretbare Reihenfolgen? Dann Schritte
  zusammenlegen, das `goal` praezisieren oder das Szenario enger formulieren.
  Adjazente Schritte derselben "Stufe" (gleiche Volatilitaetsstufe, zwei
  unabhaengige Konfig-Schritte, zwei nicht ueberlappende Firewall-Regeln) sind
  ein Befund.

**P3 — Nachvollziehbarkeit**
- Ist das Szenario allein aus description/evidence/topology/goal plus
  SY0-701-Wissen loesbar — ohne Insider-, Produkt- oder Kontextwissen?
- Referenzieren alle Labels (A/B/C/D, R1–R4, Ticketnummern) exakt die Evidence?
  Keine toten oder widerspruechlichen Verweise.
- Stuetzt das `goal` die akzeptierte Loesung? Ein goal, das einer anderen
  Reihenfolge das Wort redet, ist ein S2-Befund.

**P4 — SY0-701-Scope**
- Nur Begriffe der offiziellen Exam Objectives oder unstrittiger
  Pruefungs-Lehrkanon. 601-Altlasten (z. B. Whaling, FAR/FRR/CER, PFS,
  Cert-Pinning) und Nischenwissen markieren und ersetzen.
- Objective-Label muss zum Inhalt passen.

**P5 — Didaktik / Lernverhalten**
- Schwierigkeit und Minuten konsistent zu docs/labs.md (Einsteiger 3–4 Paare
  eindeutig, Experte mit echter Denkleistung)?
- Lernt man das Richtige? Szenario-Rahmen statt blankem Faktenwissen;
  Distraktoren lehren Abgrenzung, nicht Verwirrung.
- Feedback-Luecken benennen (fehlende Erklaerung nach dem Loesen, frustrierende
  Resets, binaeres Scoring ohne Teilpunkte).

**P6 — Usability**
- Mobile-Tauglichkeit: `left`-Texte scannbar (~<= 70 Zeichen), Optionen
  dropdown-tauglich, Ordering-Schritte einzeilig begreifbar.
- Sprache konsistent (deutsch, ue/oe/ae-Transliteration in Szenariotexten).
- Bedienbarkeit der Interaktionen (Drag-Handle, native Selects) inkl.
  Accessibility-Einschraenkungen dokumentieren.

**Severity-Klassen und Pflichten**
- **S1 Falschinformation** → sofort fixen (Blocker).
- **S2 Mehrdeutig / Loesung widerspruechlich** → fixen (Blocker).
- **S3 Scope-/Label-Fehler** → fixen oder begruendet als Ausnahme dokumentieren.
- **S4 Didaktik/UX** → als Empfehlung mit Aufwand/Nutzen dokumentieren.
- Jeder Fix muss die Tests gruen halten (`lab-scenarios`, `lab-generator`,
  `labs-view`); maschinell pruefbare Erkenntnisse als neue Test-Invariante
  verankern.

**Output-Format**
1. Befundliste: `[Severity] szenario-id — Befund — Beleg (Quelle/Objective) — Fix`
2. Angewendete Fixes (mit Testlauf-Ergebnis)
3. Akzeptierte Borderline-Faelle mit Begruendung
4. Offene Empfehlungen (S4) zur Entscheidung

## Historie

- 2026-06-12: Erste vollstaendige Anwendung (alle 100 kuratierten Szenarien,
  11 Blueprints, UI). Ergebnis siehe Konversation/Commits: 2 Blocker-Fixes
  (Watering-Hole-Definition, Ransomware-First-Response-Reihenfolge) plus
  S4-Empfehlungen (Erklaerungs-Feedback, Retry-Reset, Teilpunkte-Anzeige).
