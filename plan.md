# Plan: Prüfungsorientiertes Lerneinheiten-System für CompTIA Security+ SY0-701

Stand: 2026-07-15 · Planrevision 2 · Statusabgleich: 2026-07-18 (Häkchen = im Code/Content verifiziert)

Dieser Arbeitsplan beschreibt die Umsetzung. Die verbindlichen Funktionsverträge, Datenmodelle, Migrationen und Abnahmekriterien stehen in **[docs/lerneinheiten-sy0-701-umsetzungsplan.md](docs/lerneinheiten-sy0-701-umsetzungsplan.md)**. Bei Abweichungen gilt der Detailplan.

## Ziel und Erfolgsmaß

Das Modul **„Aktuelles Paket“** wird zur zentralen Übersicht eines prüfungsorientierten Lernpfads für **CompTIA Security+ SY0-701**. Es führt durch Professor-Messer-Videos, gezielte Wiederholungen, praktische Labs und realistische Prüfungssimulationen.

Das Produktziel ist, die Wahrscheinlichkeit des Bestehens zu erhöhen. Die App darf keine Bestehensgarantie geben und darf Kursabschluss nicht mit Prüfungsreife gleichsetzen. Drei Ebenen bleiben getrennt:

- **Aktivität:** `notStarted | inProgress | completed`
- **Objective-Evidenz:** `insufficientEvidence | learning | mastered`
- **Gesamtreife:** `notReady | approaching | examReady`

`courseCompleted` bedeutet nur, dass der Lernpfad bearbeitet wurde. **Streichung 2026-07-19:** Der `examReady`-Nachweis (Exam-Engine, Holdouts, Server-Receipts) ist kein Produktziel mehr — Ziel ist eine sehr gute, vollständige und geprüfte **Lerngrundlage** für SY0-701. Die App zeigt `examReady` niemals an; die Reife-Ebene bleibt dauerhaft auf dem ehrlichen Default und wird aus der UI genommen.

## Nutzerentscheidungen vom 2026-07-15

- **Zuschnitt:** 1 Video = 1 `course`-Einheit; Playlist-Indizes 002–121 ergeben 120 Einheiten. Video 001 ist ein optionaler, nicht prüfungsrelevanter Einstieg und zählt nicht zum Kursfortschritt.
- **Reihenfolge:** geführte Messer-Reihenfolge mit freiem Vorziehen. Eine bereits gestartete Einheit bleibt `inProgress`.
- **Wiederholung:** höchstens eine empfohlene `review`-Einheit pro Lerntag gemäß `nextDayStartsAt` vor neuem Stoff; sie blockiert den Kurs nicht.
- **Tagesdosis:** mehrere Einheiten pro Tag sind erlaubt; Pacing und Evidenz steuern die Empfehlung.
- **Labs:** je Szenario eine eigene Einheit, gruppiert nach Kategorie und nach dem zugehörigen Objective empfohlen.
- **Prüfung:** kurze Drills und vollständige 90-Minuten-Simulationen sind getrennte Modi.
- **Anzeige:** große aktive Kachel, kompakte Empfehlungsliste und Vollliste im Sheet des Moduls „Aktuelles Paket“.

**Streichung 2026-07-19:** Phase 5 (Exam-Engine/Readiness) entfällt komplett. Verbindlich bleiben Phase 0 in der Lerngrundlagen-Ausprägung (Content-Basis, Coverage, QA) sowie die umgesetzten Phasen 1–4; Phase 6 ist Feinschliff, Phase 7 optionaler Komfort-Sync. Der Schwerpunkt liegt fortan auf **Qualität und Zusammenstellung des Materials**.

## Nutzerentscheidungen vom 2026-07-18

- **Prüfungssprache: Englisch.** UI bleibt Deutsch; Vollsimulationen und bewertbare Übungen in Englisch.
- **Prüfungstermin:** das in den App-Einstellungen hinterlegte `examDateIso` ist die Quelle (fließt per Legacy-Import als Draft-Plan des Owners ein).
- **Wochenbudget: ca. 5 h/Woche** (~300 min). Puffertage und Baseline-Diagnostik weiter offen.
- **Keine Mapping-Moves — endgültig.** Der Kartenbestand wird nicht angetastet; Lerneinheiten referenzieren Karten rein logisch über die Karten-ID (Content-Map erreicht alle 375 gemappten Recall-MCs), Metriken laufen wie gehabt über die Karten-ID. `mapping-decisions.json` bleibt Dokumentation, `apply_mapping_decisions.py` wird nicht ausgeführt.
- **Eigener Screen statt Sheet:** Die Lerneinheiten bekommen eine eigene Vollbild-Ansicht (`LearningUnitsView`); das Dashboard trägt nur noch eine kompakte Referenz-Kachel darauf. *(Am 2026-07-19 revidiert: Home-Modus statt Vollbild-Route, siehe unten.)*

## Nutzerentscheidungen vom 2026-07-19

- **Home-Modi unter „Ansicht", zwei Sektionen:** „Ansicht" (Dashboard, Nach Tags, Shuffle-Decks, Lernvideos) und „Modus" (Daily Quest, Lerneinheiten, Decks, Labs). Die **Homebar bleibt auf dem Handy unverändert** (links Prüfungstage, dann Ansichten, Einstellungen, Karten-Plus) und steht in allen Modi obendrüber — nur Karten-Session und Lernvideos sind Vollbild.
- **Lerneinheiten und Labs als Home-Modi:** `LearningUnitsView` und `LabsView` rendern eingebettet unter der Homebar (kein eigener Zurück-Pfeil); die View-Routen `learning-units` und `labs` entfallen. Desktop erreicht die Modi über dasselbe „Ansicht"-Menü der Deck-Toolbar.
- **Dashboard = reine Statistik:** nur KPIs, Quests-Panel und Heatmap, untereinander scrollbar. Heute-Paket-Kachel, Lerneinheiten-Kachel und Daily-Quest-Kachel sind bewusst raus („das braucht man da nicht"); Daily Quest hat einen eigenen Modus, die Heute-Paket-Kachel ist ersatzlos aus der UI (die Mechanik bleibt im Code; den geführten Tagespfad decken die Lerneinheiten ab).
- **Rückweg-Kontrakt:** Aus dem Lerneinheiten-Modus geöffnete Videos, Labs und Karten-Sessions kehren beim Schließen/Zurück exakt in den Modus zurück — nie in die Lernvideos-/Labs-Liste oder auf das leere Home.
- **Exam-Engine gestrichen:** keine `ExamView`, keine Vollsimulationen/Drills-Engine, keine Holdout-Formen, kein Readiness-Server/-Receipt, keine Start-Gates. Ziel ist eine sehr gute Lerngrundlage; Priorität hat die Qualität und Zusammenstellung des Materials (Leaf-Abdeckung, Kartenlücken, QA/Provenienz, Akronyme, Lab-Aufgabentypen).

## Verbindliche Prüfungsbasis

Kanonischer Snapshot am 2026-07-15:

- Prüfung: **CompTIA Security+ V7, SY0-701**
- offizielles Exam-Objectives-Dokument: **Version 7.0**
- Quelle: <https://lecbyo.files.cmp.optimizely.com/download/cf25ec24b8a511ef9ecbb69c0f9687be>
- SHA-256: `95a2c75157928a8ba21b755b9cd25bde12c36983588b9fd4ee4e2268ae756b06`
- Format: höchstens 90 Multiple-Choice- und Performance-Based Questions, global 90 Minuten
- Bestehensgrenze: 750 auf der Skala 100–900; daraus wird **keine rohe Prozentgrenze** abgeleitet
- Domaingewichte: 12 / 22 / 18 / 28 / 20 Prozent
- aktuell gelistete Sprachen: Englisch, Japanisch, Portugiesisch, Spanisch und Thai; Deutsch ist keine gelistete Prüfungssprache
- Retirement: nur als 2026 geschätzt; Buchbarkeit muss erneut geprüft werden

URL, Titel, Exam-Code, Dokumentrevision, Abrufdatum und Hash werden versioniert gespeichert. Ein geänderter Hash, Exam-Code oder Lifecycle-Status blockiert die Freigabe, bis ein manueller Objective-Diff abgeschlossen ist. Die Prüfung erfolgt zu Lernbeginn, bei Buchung und unmittelbar vor dem Termin.

## Verifizierter Ausgangsbestand

- 5 Domains und 28 Objective-Decks; 803 aktive Karten je Profil.
- 339 Karten direkt in den fünf Domain-Root-Decks: 30 / 57 / 96 / 90 / 66.
- 412 Karten in Objective-Decks: 130 / 114 / 57 / 71 / 40 je Domain.
- 121 Videodateien, davon 120 mit Objective-Code und prüfungsrelevantem Playlist-Index.
- APKG-Audit: 2.995 Rohkarten, 1.532 Notes, 375 als Recall-MC aufbereitete Einträge und 1.155 Einträge mit `needs_review`.
- 31 der 375 gemappten Recall-MCs liegen im falschen Zieldeck; mit der heutigen zieldeckstrikten Auswahl sind deshalb nur 344 erreichbar.
- 4.2 und 4.9 sind in der App leer, obwohl im APKG Rohmaterial vorhanden ist; 4.4, 4.7 und 4.8 sind dünn.
- ungefähr 16 Videos besitzen weder gemappte MC- noch Transkriptfragen.
- 100 kuratierte Lab-Szenarien und 11 Blueprints.
- Parsererkannt 23 PBQ-artige Karten: 9 „Interaktive Übungen“, 7 echte Matching-/Ordering-Karten im Acronym-Deck und 7 in Objective-Decks. Die übrigen Karten im Acronym-Deck sind nicht automatisch PBQs.

Diese Mengen sind Inventar, kein Qualitäts- oder Vollständigkeitsnachweis. Der importierte Kartensatz wird bis zur geklärten Provenienz als Dritt-/abgeleitetes Material bezeichnet, nicht als „offizieller Messer-Kartensatz“.

## Fachliche Leitplanken

### Atomare Abdeckung statt Mengenmetrik

Die offizielle Hierarchie wird vollständig gespiegelt:

`5 Domains → 28 Objectives → alle Bullet- und Unter-Bullet-Pfade → vollständige Akronymliste`

Jeder kleinste prüfbare Eintrag erhält eine stabile `requirementId`, Aufgabenverb, Lernquelle, bewertbare Retrieval-Frage, bei Szenariozielen praktische Evidenz und einen Status:

`covered | content-missing | assessment-missing | mapping-review`

„Ein Video vorhanden“ oder „eine Karte vorhanden“ reicht nicht als Coverage. Mehrdeutige Akronyme wie MAC, PAM, RA, RBAC und SAN werden als getrennte Kürzel-Bedeutungs-Paare behandelt.

Akronym-Qualitätsziel (als Lernziel weitergeführt, nachdem `examReady` gestrichen ist): jedes offizielle Akronym-Bedeutungspaar ist prüfbar abgedeckt, und mehrdeutige Paare werden getrennt geübt, bis kein ungelöster Fehler mehr besteht.

### Inhalts- und Herkunfts-QA

Jedes bewertbare Item benötigt Objective-/Requirement-Zuordnung, Quelle, Urheber, Nutzungsgrundlage, Abrufdatum, Sprache, Lösungserklärung, Distraktorbegründungen, Aufgabentyp, Schwierigkeit, Version, Reviewer und Freigabestatus. Echte, erinnerte, geleakte oder angebliche Prüfungsfragen sind ausgeschlossen und werden quarantänisiert; eine mögliche Exposition stoppt den betroffenen Ablauf, wird nach CompTIA-Anleitung gemeldet und als Readiness-Evidenz invalidiert. Offizielle Objectives sind Referenzen, nicht der Ursprung „offizieller“ Übungsfragen. Auch die Nutzung/Redistribution des Objective-/Akronym-Snapshots erhält eine dokumentierte Grundlage.

### PBQ-Qualität

Matching und Ordering sind nur Teil der Praxisabdeckung. Der Pflichtumfang umfasst auch Log-/Datenquellenanalyse, Firewall-/ACL- und Konfigurationsentscheidungen, IAM, Härtung sowie Incident-Response-/Untersuchungsabläufe. Jede Aufgabe hat Ausgangszustand, ausführbare Entscheidungen, Rubrik, Teilpunkte und Feedback erst nach Abgabe. Der Plan behauptet keine exakte Nachbildung proprietärer CompTIA-PBQs.

## Architekturentscheidungen

- `LearningUnitDefinition` beschreibt statische Inhalte und wird deterministisch erzeugt.
- `LearningUnitExecution` friert die konkrete Ausführung ein: `cardIds`, `recallQuestionIds`, `labScenarioId` oder `examAttemptId`.
- Nutzerzustand, Versuche und Exposition werden profilgetrennt persistiert.
- Die heute globalen Core-Stores für Decks, Karten/Scheduler, Reviews, Stats, Deckfortschritt, Sessions und Shuffle-Collections werden in Phase 2 auf profilgescopte Compound-Keys migriert; Profilwechsel leert keine Lerndaten mehr.
- IDs: `unit:course:{index3}`, `unit:review:{objective}`, `unit:lab:{scenarioId}`, `unit:exam:{descriptorId}`; Examversuche besitzen stabile UUIDs und referenzieren Launchdeskriptor sowie versionierte Form.
- Eine `course`-Einheit erhält **explizite Karten-IDs pro Video**. Das gesamte Objective-Deck darf nicht jedem Video desselben Objectives zugeordnet werden.
- Der gewählte Kartenscheduler bleibt maßgeblich: FSRS **oder** SM-2. Fehlerbasierte Kontrollabrufe nicht fälliger Karten sind ein klar bezeichneter Assessment-Overlay mit Abstand, kein zweiter Intervallscheduler.
- Empfehlung und Mastery lesen vollständige Antwortstatistiken mit Nenner, Stichprobengröße, Aktualität und Exposition; eine reine Fehlerliste reicht nicht.
- Jedes Item erhält vor Nutzung `originPool` und erlaubte Kontexte. Course-Items dürfen nach Erstexposition in normale Reviews wechseln; Readiness bleibt strikt exklusiv und erscheint nie im Kurs, Review, Daily Quest oder Lab-Training.

## Wirkungsgrenzen

`course`- und `review`-Kartenschritte starten die normale Study-Session. Dort geschriebene Reviews wirken wie heute auf den ausgewählten Scheduler, Kartenstatistik, XP, Tagesziel, Streak und Quests. Der Einheitenabschluss vergibt kein zusätzliches XP.

Recall-Checks bleiben formative, non-scheduling Aktivität: Sie schreiben keine Kartenreviews, vergeben kein XP und zählen ohne per-Item Server-Scoring nicht als Mastery-Evidenz.

Labs verwenden eigene Versuchstabellen *(Examensimulationen: gestrichen 2026-07-19)*. Während eines Labversuchs wird **kein** `recordReview` geschrieben, kein Scheduler verändert und kein XP vergeben. Erst nach Abgabe kann eine explizite Remediation normale Review-Sessions anlegen. Dadurch bleiben verspätetes Feedback, Holdout-Integrität und unverfälschte Readiness-Messung erhalten.

Daily Quest und alle Home-/Shortcut-Einstiege beziehen die Ausschlussmenge aus einer zentralen profilbezogenen Query. Aktive Kurs-/Review-Karten sowie Items eines laufenden Examversuchs werden nicht doppelt angeboten; Readiness-Holdouts sind dauerhaft ausgeschlossen.

## Umsetzungsstatus (Fortschreibung 2026-07-18)

**Architektur-Abweichung (Nutzerentscheidung, rein additiv):** Statt der in Phase 2 geplanten v22-Migration der Haupt-DB wurde ein **dediziertes, additives System** gebaut — eigene Dexie-DB `card-pwa-learning-units` (v1, [learningUnitsDb.ts](card_pwa/src/db/learningUnitsDb.ts)), eigenes Content-Verzeichnis `card_pwa/content/sy0-701/` und eigene Generatoren `card_pwa/scripts/sy0701/`. Der Bestand (Decks, Karten, Scheduler, Heute-Paket, Serverdaten) bleibt unangetastet; die 7 freigegebenen Mapping-Moves sind entschieden, aber auf Anweisung **nicht angewendet**. Häkchen unten gelten für diese additive Entsprechung des Detailplans (§16/§23).

**Umgesetzt und committet:**

- Phase 0: Source-Snapshot, Crosswalk (28 Objectives / 655 Leafs / 336 Akronyme), Snapshots des Ist-Bestands, 31 Mapping-Entscheidungen, zehn generierte Pflichtartefakte samt Gates (`node scripts/sy0701/validate.mjs`). Offene Punkte gesammelt in [OFFENE-PUNKTE.md](card_pwa/content/sy0-701/OFFENE-PUNKTE.md).
- Phase 1: purer Kern ([learningUnits.ts](card_pwa/src/utils/learningUnits.ts)), Ranking/Phasen/Pacing ([learningUnitRanking.ts](card_pwa/src/utils/learningUnitRanking.ts)), generierte Content-Map ([sy0701ContentMap.ts](card_pwa/src/data/sy0701ContentMap.ts)), Home-Integration (HomeLearningUnitList, LearningUnitSheet, useLearningUnits) — mit Unit-Tests.
- Phase 2 (Teil): dedizierte DB v1 + profilfeste Queries ([queries/learningUnits.ts](card_pwa/src/db/queries/learningUnits.ts)), eingefrorene Executions, einmaliger Legacy-Owner-Import, Draft-`LearnerExamPlan`, Runner mit exaktem Fortsetzen ([learningUnitRunner.ts](card_pwa/src/services/learningUnitRunner.ts)), execution-gebundene Recall-Läufe in VideosView.

**Erledigt am 2026-07-18** (Backup/Restore committet als `a812443`; Folgearbeit im Working Tree, 796/796 Tests + Build grün):

- Backup/Restore v3 für das Lerneinheiten-System (alle Stores außer `migrationMeta`; Restore idempotent, LWW, Epoch nie autoritativ).
- **Lernreset mit Evidence-Epoch:** `resetProfileLearningEvidence` (Epoch+1 atomar, offene Units abgebrochen, Executions/Läufe bleiben Audit, abgeschlossene Aktivität bleibt) — angebunden an „Lernfortschritt zurücksetzen“ in den Einstellungen.
- **Session-Persistenz über `executionId`:** Karten-Schritt einer Unit persistiert unter `unit-exec:{executionId}` (wiederaufnehmbar, „Weiterlernen“-Kachel zeigt „Lerneinheit NNN“); keine Kollision mehr mit der Heute-Paket-Session desselben Objectives; Unit-Abschluss räumt die Session auf.
- **Coverage-Zeile im Sheet:** je Objective „Leafs X/Y nachgewiesen · n formative Abrufe“ aus Crosswalk + epochgefilterten Recall-Läufen (`summarizeLeafCoverageByObjective`, `listVideoRecallRunsForProfile`).

**Zweite Runde am 2026-07-18** (Working Tree, 805/805 Tests + Build grün):

- `assessment.event`/Outbox begründet auf Phase 3+ verschoben (siehe Notiz am Phase-2-Punkt).
- **Lernplan-Editor** im Lerneinheiten-Sheet: Prüfungssprache (en/ja/pt/es/th), Stunden/Woche, Lerntage/Woche, Puffertage → Draft-`LearnerExamPlan` (Vorbelegung = Entscheidungen vom 2026-07-18; Termin bleibt Settings-Sache).
- **`computeDraftPacing` rechnet jetzt echt:** Budget nach Puffertagen vs. Dauerschätzungen der offenen Units — ehrlich `missing-plan`/`missing-estimates` statt Scheinurteil, `capacity-shortfall` als No-Go im Ranking und Hinweis im Sheet. Dauerschätzungen je Unit fehlen noch (Phase 6, `durationSec`).
- **Phase-3-Start:** `computeAnswerStats` (pur) + `listAnswerStats` (Query) ersetzen die Wrong-only-Sicht — Hint-Qualität mit dokumentierten Grenzen, Mastery bleibt dem Ledger vorbehalten.

**Dritte Runde am 2026-07-18** (Working Tree, 813/813 Tests + Build grün): **Review-Units komplett** — eine `unit:review:{objective}` je Objective ([buildReviewUnits](card_pwa/src/utils/learningUnits.ts)), Auswahl eingefroren aus fälligen Karten (Study-Eligibility, direkte Deckquery, keine neuen Karten) plus ungelösten Fehlern aus `listAnswerStats` ([startOrResumeReviewUnit](card_pwa/src/services/learningUnitRunner.ts)); Abschluss über Reconcile protokolliert den Versuch (`reviewUnitAttempts`), die Tageskappe begrenzt die Empfehlung auf eine Review pro Lerntag, und das Home-Ranking bekommt echte `reviewDueUnitIds`/`reviewCompletedToday`-Signale. Start aus Liste/Sheet öffnet die Karten-Session unter `unit-exec:{executionId}`.

**Vierte Runde am 2026-07-18** (Working Tree, 813/813 Tests + Build grün): **Eigener Lerneinheiten-Screen** per Nutzerentscheidung — neue Vollbild-Ansicht [LearningUnitsView](card_pwa/src/components/LearningUnitsView.tsx) (View-Route `learning-units`, eigener Lazy-Chunk) mit Lernplan-Editor, Empfehlungsliste und der Vollliste Domain → Objective inkl. Leaf-Coverage; Unit-Start (Course/Review) läuft jetzt dort. Das Dashboard trägt nur noch die Referenz-Kachel [HomeLearningUnitsTile](card_pwa/src/components/home/HomeLearningUnitsTile.tsx) (Phase, Fortschritt, Termin, Top-Empfehlung → navigiert in den Screen); das Modal `LearningUnitSheet` ist ersetzt und entfernt.

**Fünfte Runde am 2026-07-19** (Working Tree, 814/814 Tests + Build grün):

- **Review-Abbruch komplett** (letzter offener Kernpunkt der Phase 3): `abortReviewUnit` im Runner + Abbruch-Button an laufenden Review-Zeilen im Screen; `abandoned`-Versuche zählen nicht zur Tageskappe.
- **Dauerschätzungen vorgezogen** (Phase-6-Punkt erledigt): ffprobe-Dauern aller 120 Videos → Content-Map (Manifest `2026-07-19.1`, neues Gate `video-dauern`) → `estimatedMinutes` je Course-Unit → das Pacing liefert erstmals echte `on-track`/`capacity-shortfall`-Urteile.
- **Entscheidung lokale Assessment-Proposals: NEIN, erst mit dem Server (Phase 5).** Begründung: Ein Proposal ohne Server-Acceptance ist per §10 keine Evidenz und dürfte weder Response noch Punkte festlegen — lokal wäre es totes Gewicht mit Pflege-/Migrationskosten. Die ReviewRecords tragen bereits `opId`, `answerCorrect`, Zeit und Timestamp, sodass Proposals beim Phase-5-Serverstart idempotent aus der bestehenden Historie rekonstruiert werden können. Der §10-Wrapper (Review + Proposal + Outbox atomar) kommt zusammen mit der Server-Acceptance.

Damit ist Phase 3 abgeschlossen; das serverseitige Ledger (zweiter Punkt) ist mit der Phase-5-Streichung am 2026-07-19 entfallen — die lokalen Antwortstatistiken mit dokumentierten Grenzen bleiben die Empfehlungsbasis.

**Sechste Runde am 2026-07-19** (Working Tree, 817/817 Tests + Build grün): **Phase-4-Kern umgesetzt** — dedizierte DB v2 mit UUID-`labAttempts` (eingefrorener `scenarioSnapshot` + Content-Hash-Version, Update nur inProgress, Abgabe unveränderlich, Retry = neue UUID, Backup-fest), Legacy-„geschafft“-Import (`legacy-labs-v1`-Marker, Abschluss- ohne Score-Evidenz), eine `lab`-Einheit je Szenario im Ranking/Screen, Deep Link Lerneinheiten-Screen → LabsView-Szenario, additive Instrumentierung: Öffnen startet/fortsetzt den Versuch, jeder Lösungs-Check protokolliert (Fehlversuch → Update, Lösung → Abgabe + Unit-Abschluss). Offen in Phase 4: fachliche §13.2-Normalisierung aller Szenarien (Schritt-IDs, Teilpunkt-Rubriken) und darauf aufbauend verspätetes Feedback + Remediation-Links.

**Siebte Runde am 2026-07-19** (Working Tree, 822/822 Tests + Build grün): **Phase 4 softwareseitig abgeschlossen** — §13.2-Normalisierung als deterministische Ableitung ([labSnapshot.ts](card_pwa/src/utils/labSnapshot.ts): stabile Schritt-IDs, Teilpunkt-Rubrik mit Feedback, Content-Hash-Version; alle 100 Szenarien belegt), Versuche frieren den normalisierten Snapshot ein, jeder Lösungs-Check wird ausschließlich gegen die eingefrorene Rubrik bewertet (echte Teilpunkte statt UI-Anteil), nach der Abgabe Remediation-Link ins Lerneinheiten-Modul. Verbleibende Phase-4-Arbeit ist Content: Aufgabentypen über Matching/Ordering hinaus (§13.1-Pflichtkompetenzen) und `requirementIds` nach dem Phase-0-Leaf-Mapping.

**Achte Runde am 2026-07-19** (Working Tree; 828/828 Tests + Build grün; E2E-Smoke per Driver belegt): **Navigation/Desktop-Ausbau nach Nutzerentscheidungen vom 2026-07-19** —

- **Home-Modi:** `HomeTab = dashboard | decks | tags | learning-units` (persistiert, Default Dashboard) mit Auswahl unter „Ansicht" in Handy-Sheet ([HomeBottomBar](card_pwa/src/components/home/HomeBottomBar.tsx)) und Desktop-Menü ([HomeDeckToolbar](card_pwa/src/components/home/HomeDeckToolbar.tsx)) — damit sind die Lerneinheiten auch auf dem Desktop erreichbar. Homebar-Zeile unverändert (Tage · Ansichten · Einstellungen · Plus).
- **Lerneinheiten eingebettet:** `LearningUnitsView` bekam einen `embedded`-Modus und rendert als Home-Modus unter der Homebar; die App-Route `learning-units` und der View-Union-Eintrag sind entfernt. Rücksprünge laufen über einen `homeTabRequest`-Token an HomeView.
- **Dashboard-Stack:** `HomeStatsSection layout="stack"` zeigt alle Widgets untereinander scrollbar als eigenen Modus; das Karussell aus dem Kopfbereich der Deckliste ist dorthin umgezogen.
- **Rücknavigations-Bug behoben:** App verfolgt die Herkunft (`videos/labs/studyReturnToUnits`); Header-Zurück in Videos/Labs, das Schließen des per Unit geöffneten Videos (mobiler Player-X), Zurück aus dem deep-verlinkten Lab-Szenario und der Study-Exit einer Unit-Session kehren in den Lerneinheiten-Modus zurück statt auf Lernvideos-/Labs-Liste oder Home.
- **REV-Bug behoben:** `startOrResumeReviewUnit` liefert bei leerer Auswahl `null` — der Tap wirkte „tot" (z. B. „Wiederholung 1.2", wenn nichts fällig/kein Fehler ungelöst). Jetzt Info-Toast mit Begründung; Startfehler zeigen einen Error-Toast.
- **Test-Reparatur:** `labs-view.test.tsx` scheiterte seit der Lab-Instrumentierung auf Suite-Ebene (useSettings ohne Provider) und wurde von der Testzahl verdeckt; mit Settings-Mock laufen real 828 Tests (statt 822 + 1 kaputte Suite).

**Neunte Runde am 2026-07-19** (Working Tree; 829/829 Tests + Build grün; Smoke per Driver): **Home-Modi finalisiert** —

- **Dashboard entschlackt:** `HomeStatsSection layout="stack"` zeigt nur noch KPIs, Quests-Panel und Heatmap; Heute-Paket-, Lerneinheiten- und Daily-Quest-Kachel entfernt (Heute-Paket-Kachel damit ersatzlos aus der UI, Mechanik/Kartenreservierung bleibt).
- **Neue Modi:** `daily-quest` (Quest-Kachel als eigener Reiter) und `labs` (`LabsView` mit `embedded`-Modus unter der Homebar; App-Route `labs` entfernt, Lab-Unit-Deep-Link läuft jetzt HomeView-intern: Lerneinheiten → Szenario → Zurück → Lerneinheiten).
- **Menüs zweigeteilt:** „Ansicht" (Dashboard, Nach Tags, Shuffle-Decks, Lernvideos) / „Modus" (Daily Quest, Lerneinheiten, Decks, Labs) in HomeBottomBar-Sheet und Desktop-Toolbar; Homebar-Zeile unverändert.
- **Race-Fix Lab-Start:** paralleler Doppelstart (StrictMode-Doppeleffekt beim Öffnen) teilt sich jetzt Versuch + Ausführung statt `startUnitExecution`-Fehler zu werfen (`startOrResumeLabUnit`, mit Test).

**Zehnte Runde am 2026-07-20** (Working Tree; 829/829 Tests + Build grün): **Content-Qualität, Schwerpunkt a/b/d (teilweise) begonnen** —

- **Leaf-Mapping kuratiert** (`content/sy0-701/source/leaf-mapping.json`, neu): alle 655 Leafs fachlich gesichtet — Video-Zuordnung über eine transkript-verifizierte Regeltabelle (jedes Video-/Bullet-Segment gegen die Original-Transkripte in `~/youtube-playlists/…/transcripts` abgeglichen), Assessment-Zuordnung tokenbasiert vorgeschlagen und je Domain manuell durchgesehen/korrigiert (Verwechslungen wie Zero-Trust-Komponenten, MFA-Faktoren, Certificate-vs-Certification behoben). Generator liest die Datei optional und validiert Referenzen hart (`FATAL` bei unbekannten Asset-/Requirement-IDs). Neues Gate `leaf-mapping-gesichtet` (PASS: 655/655), `leaf-coverage` verschärft und zeigt jetzt die echte Lücke (336/655 `covered`, Rest `assessment-missing`, 0 `content-missing`).
- **Criticality kuratiert** (`content/sy0-701/source/criticality.json`, neu): 16 fachlich ausgewählte kritische Requirements (Konzepte, deren Verwechslung besonders teuer ist: CIA-Ziele, Schlüsselrollen bei Asymmetrie/Signatur, Hashing-Unumkehrbarkeit, Data-States, Least Privilege, IR-Phasenreihenfolge, Chain of Custody, Risikorechnung SLE/ALE, MFA-Faktoren) mit je einer versionierten `CriticalErrorDefinition`. Generator validiert Konsistenz (verwaiste/unbekannte IDs → `FATAL`). Gate `criticality-zugewiesen` PASS.
- **Kartenlücken 4.2/4.4/4.7/4.8/4.9 geschlossen:** 55 neue Recall-Fragen in `messerTranscriptQuestions.ts`, jede einzeln im zugehörigen Video-Transkript verankert (nicht aus dem ungeprüften APKG-`needs_review`-Bestand). Domain 4 (Security Operations) ist damit die erste vollständig `covered` Domain im Leaf-Mapping. Domains 1/2/3/5 haben noch 319 offene `assessment-missing`-Leafs — das ist die bei Weitem größte verbleibende Arbeit und wurde bewusst nicht überstürzt (Qualität vor Geschwindigkeit).
- **Validator-Fix:** `server.watch: null` im vite-Einmalstart, da der VSCode-Extension-Host das inotify-Budget des Systems ausschöpft (`ENOSPC`) — der Generator ist ein Einmalskript ohne laufenden Dev-Server und braucht keinen Datei-Watcher.
- **Datenqualitätstests gehalten:** neue Fragen mussten zweimal gegen `video-recall-check.test.tsx`-Gates (kein Options-Längenbias >3×, keine wortgleichen Fragen über Videos hinweg) nachgeschärft werden — beide Regeln haben reale, leicht zu übersehende Redaktionsfehler gefangen.

**Elfte Runde am 2026-07-20** (Working Tree; 829/829 Tests + Build grün): **Leaf-Coverage komplett — 655/655** — die verbleibenden 154 `assessment-missing`-Leafs aus Domain 4 (76) und Domain 5 (78) nach demselben Muster wie Runde 10 geschlossen: je Leaf eine im Original-Transkript verankerte Frage verfasst (78 Videos zusätzlich gelesen), Datenqualitätstests (kein Options-Längenbias, keine Duplikate) mehrfach nachgeschärft. **Gate `leaf-coverage` steht erstmals auf PASS** (0 content-missing, 0 assessment-missing). Insgesamt in Runden 10+11: 337 neue Fragen über 5 Commits (b22aa51, dd4fe3a, 8ca7d03, 3b636ac, dec70c9 + Domain-5-Commit). Bewusst nicht angefasst: QA/Provenienz der 375 *alten* Recall-MCs (Punkt 13), Akronym-Fragen (Punkt 9), Lizenzprüfung (Punkt 12), Labs-Aufgabentypen (Punkt 14) — das sind andersartige Aufgaben (Metadaten-Pflege bzw. neue Screens/Interaktionstypen), keine Leaf-Coverage-Lücken mehr.

**Zwölfte Runde am 2026-07-20** (Working Tree; 829/829 Tests + Build grün, alle Gates PASS): **QA der 375 alten Recall-MCs abgeschlossen (schlanke Variante).** Vor Beginn zwei Entscheidungen mit dem Nutzer geklärt: (a) APKG-Herkunft — kein offizielles Messer-Produkt, vermutlich Community-Deck, keine eingebettete Lizenz; Nutzung bleibt auf privaten Gebrauch beschränkt, dokumentiert in `content/sy0-701/LIZENZ-HERKUNFT.md` (gitignored wie `OFFENE-PUNKTE.md`). (b) QA-Tiefe — schlanke Qualitätsprüfung statt vollem `ContentQaRecord`-Schema (§6.1), da Letzteres für die gestrichene Exam-Engine gedacht war. Durchführung: 5 parallele Subagenten (einer je Domain) lasen je Karte den zugehörigen Original-Videotranskript (Mapping über `messerVideoQuestionMap.ts`, 104 Transkripte), ersetzten die generische Templat-Erklärung durch eine echte, transkript-verankerte deutsche Erklärung und flaggten fragliche Karten statt sie stillschweigend zu ändern. Alle Flags selbst gegen das Transkript nachverifiziert (wörtliches Zitat pro Fall). 4 sachliche Fehler bestätigt und korrigiert: `M1-005` (Operational statt Physical), `M1-078` (Field-/Column-Level statt Record-Level), `M4-021` (Optionstext „Digital Key Identified Mail" existiert nicht, korrekt „DomainKeys Identified Mail"/DKIM), `M5-006` („Risk Indicator" → „Key Risk Indicator"). Die beiden vorab bekannten Verdachtsfälle `M4-027` (Attestation) und `M4-012` (Risk Tolerance) wurden geprüft und mit wörtlichem Transkript-Beleg als korrekt bestätigt. Angewendet über `card-sync-server/scripts/apply_mc_data.py` (bestehender, geprüfter Pfad) für beide Profile — `sync_operations` korrekt erzeugt, DB vorher gesichert (`backups/sync.db.before-legacy-mc-qa-*`). `mc_data/section{1-5}_mc.json` sind jetzt der aktuelle Stand (committed).

**Nächste Schritte in Reihenfolge:**

1. Akronym-Abdeckung: 336 offizielle Paare mit Erkennungs-/Anwendungsfrage, mehrdeutige (MAC, PAM, RA, RBAC, SAN) als getrennte Paare — braucht vermutlich einen neuen Fragetyp/-screen, kein reiner Content-Task.
2. Labs: Aufgabentypen über Matching/Ordering hinaus (§13.1: Log-Analyse, Firewall/ACL, IAM, Härtung, Incident Response) — neue `decision`-Interaktion (bereits in `LabStepSnapshot`-Typ im Detailplan vorgesehen) plus `requirementIds` je Szenario aus dem jetzt vollständigen Leaf-Mapping zurückspiegeln; die 23 PBQ-artigen Karten fachlich prüfen.
3. Software-Rest (klein): Reife-Beschriftung aus der UI nehmen (Zeile „Reife: …" in Lerneinheiten-Modus/Kachel), Phase-6-Feinschliff (Filter, Tastatur/Screenreader, kein horizontaler Overflow); optional Phase 7 (Komfort-Sync von Video-/Unit-Zustand).

## Umsetzungsphasen

### Phase 0 — Prüfungs- und Inhaltsbaseline (Pflicht, blockiert Phase 1)

- [x] Offiziellen Source-Snapshot samt Hash, Dokumentrevision, Exam-Code, Sprache und Lifecycle-Gate speichern; altes im Repo registriertes Objectives-PDF ersetzen oder eindeutig als veraltet markieren. *(source/exam-source-snapshot.json; altes LAB_SOURCES-PDF als historisch dokumentiert)*
- [x] Exakten Crosswalk für alle Objectives, Bullet-/Unter-Bullet-Pfade und Akronym-Bedeutungspaare erstellen. *(objectives-v7-extract.json: 28 Objectives, 655 Leafs, 336 Akronyme; generiert: sy0-701-requirements.json, sy0-701-acronyms.json)*
- [x] Für jeden Leaf-Pfad Lern-, Assessment- und bei Bedarf Praxisabdeckung samt QA/Provenienz dokumentieren. *(2026-07-20 abgeschlossen: kuratierte `source/leaf-mapping.json` — alle 655 Leafs fachlich gesichtet UND vollständig abgedeckt [Gates `leaf-mapping-gesichtet` und `leaf-coverage` beide PASS: 655/655 covered, 0 Lücken]. Video-Zuordnung per transkript-verifizierter Regeltabelle, Assessment-Zuordnung je Leaf einzeln im Original-Transkript verankert. 337 neue Recall-Fragen über alle fünf Domains verfasst [Domain 4: 131, Domain 3: 68, Domain 2: 61, Domain 5: 78, Domain 1: 36]. Schlanke QA der 375 alten Recall-MCs [Runde 12] ebenfalls abgeschlossen; formales `ContentQaRecord`-Reviewer-/Lizenz-Feldschema bewusst nicht angelegt, siehe Punkt 13/12 in OFFENE-PUNKTE.md.)*
- [x] 31 falsche Video-/Deck-Mappings fachlich entscheiden und korrigieren; danach Generator und Audit reproduzierbar ausführen. *(alle 31 entschieden in source/mapping-decisions.json; Korrektur am 2026-07-18 endgültig als „keine physischen Moves“ beschlossen — Zuordnung rein logisch per Karten-ID, der Generator erreicht alle 375 M-Karten, Audit via validate.mjs reproduzierbar)*
- [x] Rohmaterial für 4.2 und 4.9 fachlich prüfen/importieren oder echte Content-Lücke markieren; dünne Objectives und etwa 16 Videos ohne Recall beheben. *(2026-07-19: Recall-Lücke behoben — 0 Videos ohne Recall; 4.2/4.4/4.7/4.8/4.9 aus Transkript [nicht APKG-`needs_review`] mit 55 neuen, im Video verankerten Fragen geschlossen — Domain 4 durchgängig `covered`)*
- [ ] Alle 23 parsererkannten PBQ-artigen Karten sowie alle Labs mit dem tatsächlichen Kartenparser inventarisieren, fachlich prüfen und Objective-/Requirement-IDs zuordnen. *(teilweise: Inventar mit echtem Parser in generated/pbq-lab-coverage.json; `requirementIds` im generierten `sy0701ContentMap.ts` werden jetzt aus dem kuratierten Leaf-Mapping zurückgespiegelt, für die 336 covered-Leafs also gefüllt; fachliche PBQ-Prüfung + neue §13.1-Aufgabentypen [Logs, Firewall/ACL, IAM, Härtung, IR] weiter offen)*
- [x] Criticality je Requirement fachlich zuweisen; `CriticalErrorDefinition`s referenzieren. *(2026-07-19: kuratierte `source/criticality.json` — 16 fachlich ausgewählte kritische Requirements [CIA-Verwechslung, Schlüsselrollen, Data-States, Least Privilege, IR-Reihenfolge, Chain of Custody, Risikorechnung SLE/ALE, MFA-Faktoren] mit je einer versionierten `CriticalErrorDefinition`; Gate `criticality-zugewiesen` PASS, Konsistenzprüfung [verwaiste/unbekannte IDs] im Generator)*
- [x] Inhalte in Course-/Practice-Kontexte partitionieren; Leakage-, Exposure- und Kalibrierungsreports erzeugen. *(Pools + alle drei Reports generiert und als Struktur-/QA-Werkzeuge behalten; **Readiness-Full-Formen gestrichen 2026-07-19**)*
- *(gestrichen 2026-07-19)* Readiness-Item-Regeln, Holdout-Serverstore und Full-Blueprint — entfallen mit der Exam-Engine.
- [ ] Baseline-Diagnostik, gebuchte Prüfungssprache, Termin, verfügbares Wochenbudget und Puffertage erfassen. *(teilweise, 2026-07-18: Sprache Englisch, Termin = Settings-`examDateIso`, Budget ~5 h/Woche; Baseline-Diagnostik und Puffertage offen)*
- [ ] UI-Sprache und Prüfungssprache getrennt behandeln: Fachbegriffe und bewertbare Übungen von Beginn an auch auf Englisch (gebuchte Prüfungssprache) anbieten. *(Vollsimulationsteil gestrichen 2026-07-19)*

Exit: Kein offizieller Leaf-Pfad fehlt im Crosswalk; keine kritische Inhalts-, Mapping-, Lizenz- oder Assessment-Lücke ist ungeklärt. Andernfalls darf die App nicht „vollständig abgedeckt“ anzeigen (`examReady` gibt es nicht mehr).

### Phase 1 — Korrektes Modell und Liste (Lernorganisations-MVP)

- [x] `utils/learningUnits.ts`: Builder, Statusableitung, Coverage und phasenabhängige Rangfolge als pure Funktionen. *(learningUnits.ts + learningUnitRanking.ts, mit Unit-Tests)*
- [x] Manifest validieren: eindeutige Indizes und Unit-IDs, erwartete Folge 002–121, ausschließlich bekannte Objective-Codes. *(`validateCourseCatalog`, Tests gegen den echten Katalog)*
- [x] Generierte `cardIdsByVideoIndex`/`recallQuestionIdsByVideoIndex` verwenden; unmapped Objective-Karten bleiben im Objective-Practice-Pool. *(sy0701ContentMap.ts, generiert aus content/sy0-701; Test „lässt Unmapped im Practice-Pool“)*
- [x] `LearningUnitDefinition` und `LearningUnitExecution` einführen; keine komplette Objective-Deck-Auswahl im Karten-Schritt. *(`createCourseExecution` lehnt nicht gemappte Karten ab)*
- [x] bestehende Paketschritt-Logik als pure Funktion extrahieren und das Tageswechsel-Verhalten fixieren: eine gestartete Einheit überlebt unverändert über Mitternacht. *(additiv als `computeCourseStepState`; Heute-Paket unangetastet; Mitternachtstest vorhanden)*
- [x] Kachel, kompakte Liste und Volllisten-Sheet in `HomeView` integrieren; Aktivitäts-, Evidenz- und Reifestatus visuell trennen. *(Umgebaut per Nutzerentscheidung 2026-07-18: eigener Vollbild-Screen `LearningUnitsView` mit Lernplan-Editor, Empfehlungsliste und Vollliste; das Dashboard trägt nur die Referenz-Kachel `HomeLearningUnitsTile`; Heute-Paket-Kachel bleibt unangetastet)*
- [x] Coverage-Ansicht zeigt Leaf-Gaps, Stichprobengröße und `insufficientEvidence`, nicht nur Ressourcenzahlen. *(Sheet zeigt je Objective „Leafs X/Y nachgewiesen · n formative Abrufe“ + Evidenzstatus; Stichprobe = formative Recall-Läufe der aktuellen Epoch, bis das Assessment-Ledger in Phase 3 echte Mastery-Stichproben liefert)*

Exit: 120 korrekte Kursdefinitionen, keine Kartenleckage zwischen Videos/Holdouts, bestehendes Kachelverhalten bleibt erhalten, Build und Tests grün.

### Phase 2 — Profilfeste Persistenz und Fortsetzen

*(Umsetzung additiv: dedizierte DB `card-pwa-learning-units` v1 statt v22-Migration der Haupt-DB — siehe Umsetzungsstatus oben.)*

- [ ] Dexie v22: alle globalen Core-Lernstores atomar dem Legacy-Owner zuordnen und auf profilgescopte Deck-/Karten-/Scheduler-/Review-/Stats-/Progress-/Session-/Shuffle-Stores umstellen; zusätzlich `profileLearningState` mit monotoner Evidence-Epoch, `learningUnitState`, Unit-/Review-Ausführungen, execution-gebundene Recall-Läufe, Assessment-Proposals und serverakzeptierte Events/Resets/Receipts, Migrationsmetadaten sowie Video-Fortschritt mit `[profileId+videoIndex]`. *(teilweise: alle neuen Stores in der dedizierten DB v1 vorhanden [profileLearningState/Epoch, learningUnitState, Executions, Recall-Läufe, videoProgressByProfile, migrationMeta]; Core-Store-Migration bewusst NICHT ausgeführt — Bestand bleibt global; Assessment-Proposals/Receipts folgen)*
- [x] Profilbezogenen `LearnerExamPlan` für Exam-Code, Termin, UI-/Prüfungssprache, Wochenbudget, Lerntage/Woche, Puffertage, Source-Snapshot und optionale Baseline-Diagnostik speichern. Legacy-`examDateIso` wird nur als unvollständiger Draft des Ownerprofils importiert; danach ist der Plan die einzige Schreibquelle. *(Draft-Ausbaustufe; serverbestätigter Plan ist Phase 5. Seit 2026-07-18 editierbar im Lerneinheiten-Sheet: Prüfungssprache, Stunden/Woche, Lerntage/Woche, Puffertage — Termin bleibt in den Einstellungen)*
- [x] Statische Definition und dynamische Ausführung trennen; aktive `cardIds` bleiben bis Abschluss/Abbruch eingefroren.
- [x] Legacy-localStorage genau einmal dem beim Upgrade aktiven Profil zuordnen. Ein globaler Migrationsmarker verhindert Kopien in weitere Profile; Import atomar in einer Dexie-Transaktion. *(`runLegacyLearningImport` + Marker `legacy-learning-v1`, mit Tests)*
- [x] Tageswechsel verändert `activeStartedAt`, Schrittstand und Ausführung nicht. *(Schrittstand hängt an `createdAt`, Test vorhanden)*
- [x] Fortsetzen öffnet exakt Video, Recall, Karten oder den referenzierten Versuch. *(für Course-Units via `startOrResumeCourseUnit`; Lab-/Examversuche folgen Phase 4/5)*
- [x] Study-Sessions über `executionId` statt Objective-Deck-ID persistieren; mehrere vorgezogene aktive Units bleiben getrennt und reservieren gemeinsam ihre Karten. *(Session-Key `unit-exec:{executionId}`, wiederaufnehmbar inkl. „Weiterlernen“-Kachel; Abschluss räumt die Session auf; Reservierung über `listReservedCardIds` + Heute-Paket-Ausschluss)*
- [ ] Profilwechsel ist ein atomarer Scope-Wechsel ohne Core-Store-Clear und muss Kartenfälligkeit, Reviews, Stats, Deckfortschritt sowie v6-Sessions/Ausführungen offline erhalten; ein expliziter Lernreset setzt nur den betroffenen Profil-Scheduler samt Reviews/Stats/Progress zurück, erhöht bei Schema v2 atomar die Evidence-Epoch, bricht offene Zustände ab und lässt Exposure-/Lease-Audit unverändert. *(teilweise: das dedizierte System ist per Compound-Keys profilfest, Profiltrennung getestet; Lernreset umgesetzt — `resetProfileLearningEvidence` erhöht atomar die Epoch, bricht offene Units ab, erhält das Audit und hängt am bestehenden „Lernfortschritt zurücksetzen“; Core-Store-Scoping der Haupt-DB bleibt bewusst offen)*
- [ ] Alle neuen Study-Einstiege schreiben Review, profil-/session-/contentversioniertes Proposal und Outbox atomar. Nur der Server darf aus Rohantwort, kanonischem Inhalt und verifizierter Zeit ein masteryfähiges Event erzeugen; Legacy-Reviews bleiben reine Hints.
- [ ] `assessment.event` samt append-only Servertabelle in derselben Phase einführen, damit keine unbekannte Outbox-Operation bis Phase 5 liegen bleibt. *(Entscheidung 2026-07-18: mit den beiden Nachbarpunkten auf Phase 3+ verschoben — im additiven System entstehen Proposals erst mit den neuen Review-Units und leben in der dedizierten DB statt in der Legacy-SyncQueue, es kann also keine unbekannte Outbox-Operation liegen bleiben; der produktive Sync-Server wird nur einmal, gebündelt mit dem Phase-5-Auth-/Receipt-Design, angefasst)*
- [ ] Bestehende SyncQueueDB/transactionale Outbox profilfest erweitern, nicht ersetzen: Legacy-Operationen und Retry/Backoff erhalten, v1-`progress.reset {timestamp,due,dueAt}` weiterhin decodieren, abgelaufene In-Flight-Sendeleases nach Crash sicher übernehmen, v1→v2 bzw. Main-DB-Migration; ownerlose Altzeilen bleiben bis eindeutiger Zuordnung `deferred-auth`.
- [x] Backup/Restore umfasst neue Zustände, Ausführungen, Resets/Evidence-Epoch und profilbezogene Signale, aber keine internen Migrationsmarker oder Queue/Outbox. Ein Auth-Bootstrap-Reconcile stellt fehlende Proposal-/Reset-/Attempt-Operationen anhand ihrer Original-ID idempotent wieder her; eine Backup-Epoch wird nicht ohne Serverbestätigung autoritativ. Offene Readiness-Versuche werden nicht exportiert; abgeschlossene nur redaktiert ohne Prompts, Optionen, Scoring oder rohe Antworten. *(Umgesetzt als Backup v3: alle Stores der dedizierten DB außer `migrationMeta`; Restore idempotent, States per updatedAt-LWW, Executions unveränderlich, Backup-Epoch nie autoritativ, Legacy-Import restore-fest. Auth-Bootstrap-Reconcile und Readiness-Redaktion folgen mit ihren Phasen — die betroffenen Stores existieren noch nicht.)*

Exit: Reload, Tageswechsel, Profilwechsel und Restore sind deterministisch; kein globales Signal kann eine fremde Einheit abschließen.

### Phase 3 — Evidenzbasierte Reviews und Empfehlungen

- [x] `listAnswerStats` statt Wrong-only-Query: `scored`, `correct`, `wrong`, `unanswered`, eindeutige Items, Exposition, Zeit, erste/letzte Antwort, letzte Antwort und `resolvedAt`. *(als Hint-Aggregation über ReviewRecords: pure `computeAnswerStats` + Query `listAnswerStats`; `answerCorrect`-Vorrang mit rating≥3-Fallback, Auflösung nur durch strikt spätere korrekte Antwort, `masteryEligibleOnly` ⇒ leer und `independentSessionCount` 0, bis das Ledger existiert)*
- *(gestrichen 2026-07-19)* Autoritatives Server-AssessmentEvent-Ledger — entfällt mit der Exam-Engine. Es gilt dauerhaft: lokale Review-Hints liefern Empfehlungen, behaupten aber keine Mastery.
- [x] Fälligkeit über dieselbe pure Eligibility-Logik wie die gewählte Study-Sortierung berechnen; direkte statt rekursive Deckquery verwenden. *(`sortStudyCards` mit `maxNewCards: 0` — eine Wiederholung führt nie neue Karten ein — über `listCardsByDeckIdsDirect`)*
- [x] Review-Ausführung aus fälligen Karten und ungelösten Fehlern einfrieren; ein später korrekt gelöstes Item bleibt nicht endlos falsch. *(`buildReviewSelection` + `startOrResumeReviewUnit`; Auflösung über die strikt-später-Regel aus `listAnswerStats`)*
- [x] Reviewversuche separat protokollieren. Die Tageskappe nutzt Profil, lokales Lerntagsdatum und Abschlussverlauf. *(`reviewUnitAttempts` append-only via Reconcile-Abschluss; `countReviewUnitAttemptsForDay` speist `reviewCompletedToday` im Ranking — höchstens eine Empfehlung pro Lerntag)*
- [x] Review-Abbruch explizit speichern, aktive Reservierung lösen und unerledigte/überhängende Karten weiter als `reviewDue` behandeln. *(2026-07-19: `abortReviewUnit` protokolliert einen `abandoned`-Versuch — zählt NICHT zur Tageskappe —, löst die Reservierung, behält die Ausführung als Audit und räumt die Session auf; Abbruch-Button an laufenden Review-Zeilen im LearningUnitsView)*
- [x] `rankLearningUnits` erhält Phase, Datum, heutige Reviews, Mastery und Readiness: Grundlagen priorisieren Kurs + fällige Reviews; Vertiefung Schwächen/Labs; Prüfungsphase Holdout-Drills; Abschlussphase kurze gezielte Remediation. *(seit 2026-07-18 mit echten Signalen verdrahtet: `reviewDueUnitIds` aus Eligibility + ungelösten Fehlern, `reviewCompletedToday` aus der Tageskappe; Mastery/Readiness bleiben bis Ledger/Phase 5 ehrliche `insufficientEvidence`/`notReady`-Defaults)*
- [x] Wenn Evidenz oder Zeit nicht reicht, zeigt das System einen klaren No-Go-/Terminverschiebungshinweis statt offene kritische Themen auszublenden. *(Zeitseite umgesetzt — `capacity-shortfall` blockiert das Ranking und zeigt „Termin verschieben oder Budget erhöhen“; Evidenzseite besteht lokal aus ehrlicher Stichproben-Anzeige [„Evidenz: unzureichend“] — der Server-Ledger-Teil ist gestrichen)*

Exit: Empfehlungen sind mit einem deterministischen `reason` erklärbar; kleine Stichproben werden nie als starke/beherrschte Objectives dargestellt.

### Phase 4 — Praktische Labs und PBQs

- [x] Szenarien erhalten stabile IDs, normalisierte `objectiveIds`/`requirementIds`, stabile Schritt-IDs und Rubriken. *(2026-07-19: deterministische §13.2-Normalisierung `buildLabScenarioSnapshot` — stabile Schritt-IDs, Teilpunkt-Rubrik [1 Punkt je Paar bzw. exakt platzierter Position] mit Feedback-Texten, Content-Hash-Version; per Test über alle 100 Registry-Szenarien belegt. `requirementIds` folgen dem offenen Phase-0-Leaf-Mapping; Aufgabentypen über Matching/Ordering hinaus [Logs, IAM, Härtung — §13.1-Pflichtkompetenzen] bleiben fachliche Content-Arbeit)*
- [x] Je Szenario eine `lab`-Einheit; Kategorien dienen nur der Gruppierung. *(`buildLabUnits`: `unit:lab:{scenarioId}` mit Objective aus dem Label, `estimatedMinutes` aus der Registry; im Ranking und in der Vollliste des Screens)*
- [x] Dexie v23: UUID-basierte `labAttempts` mit Profil, Szenario-/Versions-ID, Antworten, Teilpunkten, Fehlversuchen, Dauer, Resume- und Abgabestatus; laufende Versuche sind aktualisierbar, abgegebene unveränderlich. *(als v2 der dedizierten DB; Update/Submit auf abgegebene Versuche wirft, Retry = neue UUID; in Backup/Restore aufgenommen)*
- [x] Szenario, Schritte und Rubrik beim Start vollständig versioniert einfrieren; Resume/Scoring darf nach Content-Updates nicht auf die neue Registry umspringen. *(`scenarioSnapshot` = tiefe Kopie beim Start + Content-Hash-Version; Registry-Mutationen erreichen den Versuch nachweislich nicht [Test])*
- [x] Legacy-„geschafft“-Sets mit separatem v23-Marker konservativ in exakt das in v22 gespeicherte Ownerprofil importieren; alte Einträge liefern Abschluss-, aber keine Score-/Mastery-Evidenz. *(`runLegacyLabsImport` mit Marker `legacy-labs-v1`, wartet auf den v1-Owner-Marker; `origin: 'legacy-completed'` ohne Score, Unit-Status „bearbeitet“)*
- [x] Deep Link in `LabsView`/`LabScenarioView`, Resume, verspätetes Feedback und Links zur normalen Remediation. *(Deep Link `initialScenarioId`, Resume über den eingefrorenen Versuch, Bewertung jedes Checks ausschließlich gegen die eingefrorene Rubrik [`recordLabCheck` liefert Teilpunkte + Kriterien-Feedback], nach der Abgabe Remediation-Link zurück in den Lerneinheiten-Screen; die Bestandsansicht deckt weiterhin keine Lösungen vor der Abgabe auf — eine eigene Feedback-Detailansicht folgt mit den neuen Aufgabentypen)*
- [x] Szenario-Coverage-Gate für die sieben „Given a scenario“-Objectives 2.4, 3.2, 4.1, 4.5, 4.6, 4.9 und 5.6. *(Generator-Gate `szenario-objectives-praxis` in validate.mjs, PASS: alle 7 mit Praxispfad)*

Exit: Praxisleistung ist profilfest, nachvollziehbar und fließt nur mit hinreichender Rubrik in Mastery ein.

### Phase 5 — Exam-Engine und Readiness *(GESTRICHEN am 2026-07-19)*

Auf Nutzerentscheidung ersatzlos gestrichen: keine `ExamView`, keine `examAttempts`/Exposition (DB v24 entfällt), keine Holdout-Formen, kein Readiness-Sync, keine Receipts, keine internen Start-Gates und keine 750/900-Deutung. Die App behauptet zu keinem Zeitpunkt Prüfungsreife; sichtbar bleiben nur **Aktivität** und **formative Evidenz** mit ehrlicher Stichprobenangabe. Die Phase-5-Abschnitte des Detailplans sind damit obsolet.

### Phase 6 — Feinschliff

- [x] Manifestgenerator um `durationSec` erweitern; UI-Fallback ohne Dauer. *(vorgezogen am 2026-07-19: ffprobe-Dauern aller 120 Videos im Source-Snapshot + Content-Map [Manifest 2026-07-19.1, Gate `video-dauern`]; `estimatedMinutes` = Videodauer + 10 min Draft-Overhead → Pacing rechnet echt [voller Kurs ≈ 15 h Video + 20 h Overhead]; ohne Dauer bleibt der ehrliche `missing-estimates`-Fallback)*
- [ ] Filter, mobile Darstellung, Tastaturbedienung, Screenreader-Texte und kein horizontaler Overflow.
- [ ] Persönliche Exam-Day-Checkliste: Sprache, Ausweis/Check-in, Systemtest, Zeitstrategie und genehmigte Accessibility-Vorkehrungen. *(optional; reine Info-Seite, unabhängig von der gestrichenen Exam-Engine)*

### Phase 7 — Optionaler Komfort-Sync

- [ ] Unit-/Videozustand mit dokumentierter LWW-/monotoner Merge-Regel synchronisieren.
- [ ] Weitere Komfortzustände geräteübergreifend erhalten. *(Der frühere Pflicht-Readiness-/Exposure-Sync ist mit Phase 5 gestrichen.)*

## Datenbank- und Abhängigkeitsplan

*(Stand 2026-07-18: umgesetzt als dedizierte DB `card-pwa-learning-units` v1 neben der Haupt-DB; die v22/v23/v24-Nummern unten bezeichnen die inhaltlichen Ausbaustufen, nicht mehr zwingend Versionen der Haupt-DB. `fake-indexeddb` ist als Dev-Dependency im Einsatz.)*

- Aktueller Ausgangspunkt: Dexie v21.
- v22: profilgescopte Core-Stores für Decks/Karten/Scheduler/Reviews/Stats/Progress/Sessions/Shuffle, Profil-Lernzustand/Evidence-Epoch, Unit-State/Executions, Migrationsmeta, profil- und execution-bezogener Video-/Recall-Zustand, Assessment-Proposals/Accepted-Events/Resets/Receipts, Reviewversuche, Restore-Reconciliation und `LearnerExamPlan`.
- v23: Labversuche. *(am 2026-07-19 als v2 der dedizierten DB umgesetzt; die serverseitigen Qualification-Receipts sind mit Phase 5 gestrichen)*
- v24: *(gestrichen 2026-07-19 — Examversuche/Exposition/Receipts entfallen mit der Exam-Engine)*
- Keine neuen Runtime-Abhängigkeiten. `fake-indexeddb` ist als eine neue **Dev-Dependency** für deterministische Migrationstests erlaubt; alternativ müssen diese Tests in einem echten Browser laufen.
- Neue Tabellen werden in Backup/Restore und später im Sync explizit berücksichtigt.

## Vorbedingung für Implementierung

**Erledigt.** Baseline war Commit `e6595dd`; die Implementierung ist seitdem in separaten Commits erfolgt (Stand 2026-07-18: bis `25577ee`). Die Regel bleibt: keine Implementierungs- und Planänderungen in einem unklaren Misch-Diff.

## Abnahme

### Software-DoD je Phase

- `npm run build`
- `npm test -- --run`
- neue pure Funktionen mit Unit-Tests; Dexie-Migrationen und Profiltrennung mit `fake-indexeddb` oder Browser-Test
- Integrationsfluss: starten → Video → Recall → Karten → Reload/Tageswechsel → exakt fortsetzen → Abschluss
- ab Phase 4: Lab-Resume/Submit *(die Phase-5-Prüfpunkte Timer/Autosubmit/Offline-Resume sind gestrichen)*
- Backup/Restore, Daily-Quest-Ausschluss, Holdout-Leakage und A11y prüfen

### Content-DoD

- vollständiger versionierter Leaf-/Akronym-Crosswalk
- QA- und Provenienzfelder vollständig, keine ungeklärten Brain-Dump-/Lizenzrisiken
- 4.2/4.9, dünne Objectives, 31 Fehlmappings und Recall-Lücken entschieden
- Szenario-/PBQ-Matrix fachlich reviewed; Kurs- und Practice-Pools sauber getrennt *(Readiness-Pool gestrichen)*

### Learner-DoD *(reduziert 2026-07-19)*

- persönlicher Zeitplan (Termin, Wochenbudget, Puffertage) gepflegt
- offene Schwächen sind sichtbar (unzureichende Evidenz wird nie kaschiert)
- Exam-Code, Termin, Buchbarkeit und Prüfungssprache bleiben selbst zu prüfen

Die App zeigt `examReady` nicht mehr an (Streichung 2026-07-19). Software- und Content-DoD bleiben der Qualitätsmaßstab der Lerngrundlage; eine Bestehensgarantie gab und gibt es nicht.
