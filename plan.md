# Plan: Prüfungsorientiertes Lerneinheiten-System für CompTIA Security+ SY0-701

Stand: 2026-07-15 · Planrevision 2 · Statusabgleich: 2026-07-18 (Häkchen = im Code/Content verifiziert)

Dieser Arbeitsplan beschreibt die Umsetzung. Die verbindlichen Funktionsverträge, Datenmodelle, Migrationen und Abnahmekriterien stehen in **[docs/lerneinheiten-sy0-701-umsetzungsplan.md](docs/lerneinheiten-sy0-701-umsetzungsplan.md)**. Bei Abweichungen gilt der Detailplan.

## Ziel und Erfolgsmaß

Das Modul **„Aktuelles Paket“** wird zur zentralen Übersicht eines prüfungsorientierten Lernpfads für **CompTIA Security+ SY0-701**. Es führt durch Professor-Messer-Videos, gezielte Wiederholungen, praktische Labs und realistische Prüfungssimulationen.

Das Produktziel ist, die Wahrscheinlichkeit des Bestehens zu erhöhen. Die App darf keine Bestehensgarantie geben und darf Kursabschluss nicht mit Prüfungsreife gleichsetzen. Drei Ebenen bleiben getrennt:

- **Aktivität:** `notStarted | inProgress | completed`
- **Objective-Evidenz:** `insufficientEvidence | learning | mastered`
- **Gesamtreife:** `notReady | approaching | examReady`

`courseCompleted` bedeutet nur, dass der Lernpfad bearbeitet wurde. `examReady` erfordert zusätzlich vollständige, geprüfte Inhaltsabdeckung und unabhängige Leistungsnachweise.

## Nutzerentscheidungen vom 2026-07-15

- **Zuschnitt:** 1 Video = 1 `course`-Einheit; Playlist-Indizes 002–121 ergeben 120 Einheiten. Video 001 ist ein optionaler, nicht prüfungsrelevanter Einstieg und zählt nicht zum Kursfortschritt.
- **Reihenfolge:** geführte Messer-Reihenfolge mit freiem Vorziehen. Eine bereits gestartete Einheit bleibt `inProgress`.
- **Wiederholung:** höchstens eine empfohlene `review`-Einheit pro Lerntag gemäß `nextDayStartsAt` vor neuem Stoff; sie blockiert den Kurs nicht.
- **Tagesdosis:** mehrere Einheiten pro Tag sind erlaubt; Pacing und Evidenz steuern die Empfehlung.
- **Labs:** je Szenario eine eigene Einheit, gruppiert nach Kategorie und nach dem zugehörigen Objective empfohlen.
- **Prüfung:** kurze Drills und vollständige 90-Minuten-Simulationen sind getrennte Modi.
- **Anzeige:** große aktive Kachel, kompakte Empfehlungsliste und Vollliste im Sheet des Moduls „Aktuelles Paket“.

Für das Bestehensziel sind **Phase 0 bis 5 einschließlich Readiness-Gate Pflicht**. Phasen 1–3 allein sind nur ein Lernorganisations-MVP. Phase 6 ist Feinschliff, Phase 7 optionaler Komfort-Sync. Der für Holdout-Integrität nötige Readiness-Sync gehört bereits zu Phase 5.

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

Für `examReady` reicht Akronym-Content nicht: jedes offizielle Akronym-Bedeutungspaar muss geprüft worden sein, die aktuelle Akronymleistung muss mindestens 80 Prozent betragen und bei mehrdeutigen Paaren darf kein ungelöster Fehler bestehen.

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

Labs und Examensimulationen verwenden eigene Versuchstabellen. Während eines Lab- oder Examversuchs wird **kein** `recordReview` geschrieben, kein Scheduler verändert und kein XP vergeben. Erst nach Abgabe kann eine explizite Remediation normale Review-Sessions anlegen. Dadurch bleiben verspätetes Feedback, Holdout-Integrität und unverfälschte Readiness-Messung erhalten.

Daily Quest und alle Home-/Shortcut-Einstiege beziehen die Ausschlussmenge aus einer zentralen profilbezogenen Query. Aktive Kurs-/Review-Karten sowie Items eines laufenden Examversuchs werden nicht doppelt angeboten; Readiness-Holdouts sind dauerhaft ausgeschlossen.

## Umsetzungsstatus (Fortschreibung 2026-07-18)

**Architektur-Abweichung (Nutzerentscheidung, rein additiv):** Statt der in Phase 2 geplanten v22-Migration der Haupt-DB wurde ein **dediziertes, additives System** gebaut — eigene Dexie-DB `card-pwa-learning-units` (v1, [learningUnitsDb.ts](card_pwa/src/db/learningUnitsDb.ts)), eigenes Content-Verzeichnis `card_pwa/content/sy0-701/` und eigene Generatoren `card_pwa/scripts/sy0701/`. Der Bestand (Decks, Karten, Scheduler, Heute-Paket, Serverdaten) bleibt unangetastet; die 7 freigegebenen Mapping-Moves sind entschieden, aber auf Anweisung **nicht angewendet**. Häkchen unten gelten für diese additive Entsprechung des Detailplans (§16/§23).

**Umgesetzt und committet:**

- Phase 0: Source-Snapshot, Crosswalk (28 Objectives / 655 Leafs / 336 Akronyme), Snapshots des Ist-Bestands, 31 Mapping-Entscheidungen, zehn generierte Pflichtartefakte samt Gates (`node scripts/sy0701/validate.mjs`). Offene Punkte gesammelt in [OFFENE-PUNKTE.md](card_pwa/content/sy0-701/OFFENE-PUNKTE.md).
- Phase 1: purer Kern ([learningUnits.ts](card_pwa/src/utils/learningUnits.ts)), Ranking/Phasen/Pacing ([learningUnitRanking.ts](card_pwa/src/utils/learningUnitRanking.ts)), generierte Content-Map ([sy0701ContentMap.ts](card_pwa/src/data/sy0701ContentMap.ts)), Home-Integration (HomeLearningUnitList, LearningUnitSheet, useLearningUnits) — mit Unit-Tests.
- Phase 2 (Teil): dedizierte DB v1 + profilfeste Queries ([queries/learningUnits.ts](card_pwa/src/db/queries/learningUnits.ts)), eingefrorene Executions, einmaliger Legacy-Owner-Import, Draft-`LearnerExamPlan`, Runner mit exaktem Fortsetzen ([learningUnitRunner.ts](card_pwa/src/services/learningUnitRunner.ts)), execution-gebundene Recall-Läufe in VideosView.

**Fertig, aber noch uncommittet (Working Tree, Stand 2026-07-18):** Backup/Restore v3 für das Lerneinheiten-System (dbBackup.ts, ImportModal.tsx, `listLearningUnitsBackup`/`restoreLearningUnitsBackup` + Tests). Am 2026-07-18 grün gemacht: Test-Setup nutzte für Quelle und Ziel dieselbe Default-DB statt der Namens-Parameter, Erwartung `added` auf 6 korrigiert (`startUnitExecution` legt den Profil-Lernzustand mit an), TS2352-Cast ersetzt, dedizierte DB in `db-backup.test.ts` gemockt, `meta.version`/`tableCounts` auf v3 nachgezogen. `npm run build` und `npm test -- --run` (789/789) grün — bereit zum Commit.

**Nächste Schritte in Reihenfolge:**

1. ~~Backup/Restore-Baustelle grün machen~~ *(erledigt 2026-07-18, siehe oben)* — committen.
2. Restliche Phase-2-Punkte entscheiden bzw. umsetzen: Study-Session-Persistenz über `executionId` (heute: Objective-Deck-ID + explizite Kartenliste), expliziter Lernreset mit Evidence-Epoch, `assessment.event`/Outbox-Anbindung in additiver Form.
3. Nutzerentscheidungen aus OFFENE-PUNKTE.md Nr. 1–5 einholen (Termin, Prüfungssprache, Wochenbudget, Baseline-Diagnostik, Mapping-Freigabe) und in den Draft-Plan schreiben.
4. Coverage-Ansicht um Leaf-Gaps und Stichprobengröße erweitern (Phase-1-Rest; `buildRequirementCoverage` existiert bereits pur).
5. Phase 3 beginnen: `listAnswerStats`, Review-Units (Schema `reviewUnitAttempts` liegt schon in DB v1), Tageskappe, Abbruch-Handling.

## Umsetzungsphasen

### Phase 0 — Prüfungs- und Inhaltsbaseline (Pflicht, blockiert Phase 1)

- [x] Offiziellen Source-Snapshot samt Hash, Dokumentrevision, Exam-Code, Sprache und Lifecycle-Gate speichern; altes im Repo registriertes Objectives-PDF ersetzen oder eindeutig als veraltet markieren. *(source/exam-source-snapshot.json; altes LAB_SOURCES-PDF als historisch dokumentiert)*
- [x] Exakten Crosswalk für alle Objectives, Bullet-/Unter-Bullet-Pfade und Akronym-Bedeutungspaare erstellen. *(objectives-v7-extract.json: 28 Objectives, 655 Leafs, 336 Akronyme; generiert: sy0-701-requirements.json, sy0-701-acronyms.json)*
- [ ] Für jeden Leaf-Pfad Lern-, Assessment- und bei Bedarf Praxisabdeckung samt QA/Provenienz dokumentieren. *(teilweise: Statusfelder generiert, aber 655 Leafs stehen auf `mapping-review`; QA/Provenienz offen)*
- [ ] 31 falsche Video-/Deck-Mappings fachlich entscheiden und korrigieren; danach Generator und Audit reproduzierbar ausführen. *(teilweise: alle 31 entschieden in source/mapping-decisions.json — 24 behalten, 7 verschieben; Anwendung wartet auf Freigabe)*
- [ ] Rohmaterial für 4.2 und 4.9 fachlich prüfen/importieren oder echte Content-Lücke markieren; dünne Objectives und etwa 16 Videos ohne Recall beheben. *(teilweise: Recall-Lücke behoben — 0 Videos ohne Recall via Transkriptfragen; 4.2/4.9-Karten weiter offen)*
- [ ] Alle 23 parsererkannten PBQ-artigen Karten sowie alle Labs mit dem tatsächlichen Kartenparser inventarisieren, fachlich prüfen und Objective-/Requirement-IDs zuordnen. *(teilweise: Inventar mit echtem Parser in generated/pbq-lab-coverage.json; fachliche Prüfung/Requirement-Zuordnung offen)*
- [ ] Inhalte in Course-/Practice-Kontexte sowie mindestens drei untereinander disjunkte Readiness-Full-Formen (zwei Nachweise + Reserve) partitionieren; Leakage-, historische Exposure- und Kalibrierungsreports erzeugen. *(teilweise: Pools + alle drei Reports generiert; Readiness-Formen 0/3, ganzer Bestand historisch exponiert)*
- [ ] Für Readiness ausschließlich neu erstellte, noch nie ausgelieferte oder lückenlos als ungesehen belegte Items verwenden; alte zugängliche Karten, unsichere Legacy-Historie sowie vom Kandidaten erstellte/reviewte Items ausschließen.
- [ ] Holdout-Prompts/Lösungen ausschließlich in einem kandidatenseitig unzugänglichen Serverstore verwalten; Client/Repo/Backup enthalten vor Lease nur Deskriptoren und Hashes. Local-only oder administrativer Kandidatenzugriff blockiert `examReady`.
- [ ] Full-Blueprint unabhängig freigeben: initial 90 Items/90 Minuten, 4–6 PBQ-nahe Items mit mindestens 10 % der Punkte, alle 28 Objectives, Aufgabenverb-/Szenario-/Schwierigkeitsmix und Formäquivalenz; Änderungen nur versioniert nach Kalibrierung.
- [ ] Baseline-Diagnostik, gebuchte Prüfungssprache, Termin, verfügbares Wochenbudget und Puffertage erfassen.
- [ ] UI-Sprache und Prüfungssprache getrennt behandeln: Fachbegriffe und bewertbare Übungen von Beginn an auch in der gebuchten Prüfungssprache anbieten; Vollsimulationen ausschließlich in dieser Sprache durchführen.

Exit: Kein offizieller Leaf-Pfad fehlt im Crosswalk; keine kritische Inhalts-, Mapping-, Lizenz- oder Assessment-Lücke ist ungeklärt. Andernfalls darf die App weder „vollständig abgedeckt“ noch `examReady` anzeigen.

### Phase 1 — Korrektes Modell und Liste (Lernorganisations-MVP)

- [x] `utils/learningUnits.ts`: Builder, Statusableitung, Coverage und phasenabhängige Rangfolge als pure Funktionen. *(learningUnits.ts + learningUnitRanking.ts, mit Unit-Tests)*
- [x] Manifest validieren: eindeutige Indizes und Unit-IDs, erwartete Folge 002–121, ausschließlich bekannte Objective-Codes. *(`validateCourseCatalog`, Tests gegen den echten Katalog)*
- [x] Generierte `cardIdsByVideoIndex`/`recallQuestionIdsByVideoIndex` verwenden; unmapped Objective-Karten bleiben im Objective-Practice-Pool. *(sy0701ContentMap.ts, generiert aus content/sy0-701; Test „lässt Unmapped im Practice-Pool“)*
- [x] `LearningUnitDefinition` und `LearningUnitExecution` einführen; keine komplette Objective-Deck-Auswahl im Karten-Schritt. *(`createCourseExecution` lehnt nicht gemappte Karten ab)*
- [x] bestehende Paketschritt-Logik als pure Funktion extrahieren und das Tageswechsel-Verhalten fixieren: eine gestartete Einheit überlebt unverändert über Mitternacht. *(additiv als `computeCourseStepState`; Heute-Paket unangetastet; Mitternachtstest vorhanden)*
- [x] Kachel, kompakte Liste und Volllisten-Sheet in `HomeView` integrieren; Aktivitäts-, Evidenz- und Reifestatus visuell trennen. *(HomeLearningUnitList max. 5 Zeilen mit reason, LearningUnitSheet; Heute-Paket-Kachel bleibt die aktive Kachel, read-only überlagert)*
- [ ] Coverage-Ansicht zeigt Leaf-Gaps, Stichprobengröße und `insufficientEvidence`, nicht nur Ressourcenzahlen. *(teilweise: `buildRequirementCoverage` pur + getestet, Sheet zeigt Objective-Evidenz; Leaf-Gaps/Stichprobengröße fehlen in der UI)*

Exit: 120 korrekte Kursdefinitionen, keine Kartenleckage zwischen Videos/Holdouts, bestehendes Kachelverhalten bleibt erhalten, Build und Tests grün.

### Phase 2 — Profilfeste Persistenz und Fortsetzen

*(Umsetzung additiv: dedizierte DB `card-pwa-learning-units` v1 statt v22-Migration der Haupt-DB — siehe Umsetzungsstatus oben.)*

- [ ] Dexie v22: alle globalen Core-Lernstores atomar dem Legacy-Owner zuordnen und auf profilgescopte Deck-/Karten-/Scheduler-/Review-/Stats-/Progress-/Session-/Shuffle-Stores umstellen; zusätzlich `profileLearningState` mit monotoner Evidence-Epoch, `learningUnitState`, Unit-/Review-Ausführungen, execution-gebundene Recall-Läufe, Assessment-Proposals und serverakzeptierte Events/Resets/Receipts, Migrationsmetadaten sowie Video-Fortschritt mit `[profileId+videoIndex]`. *(teilweise: alle neuen Stores in der dedizierten DB v1 vorhanden [profileLearningState/Epoch, learningUnitState, Executions, Recall-Läufe, videoProgressByProfile, migrationMeta]; Core-Store-Migration bewusst NICHT ausgeführt — Bestand bleibt global; Assessment-Proposals/Receipts folgen)*
- [x] Profilbezogenen `LearnerExamPlan` für Exam-Code, Termin, UI-/Prüfungssprache, Wochenbudget, Lerntage/Woche, Puffertage, Source-Snapshot und optionale Baseline-Diagnostik speichern. Legacy-`examDateIso` wird nur als unvollständiger Draft des Ownerprofils importiert; danach ist der Plan die einzige Schreibquelle. *(Draft-Ausbaustufe; serverbestätigter Plan ist Phase 5)*
- [x] Statische Definition und dynamische Ausführung trennen; aktive `cardIds` bleiben bis Abschluss/Abbruch eingefroren.
- [x] Legacy-localStorage genau einmal dem beim Upgrade aktiven Profil zuordnen. Ein globaler Migrationsmarker verhindert Kopien in weitere Profile; Import atomar in einer Dexie-Transaktion. *(`runLegacyLearningImport` + Marker `legacy-learning-v1`, mit Tests)*
- [x] Tageswechsel verändert `activeStartedAt`, Schrittstand und Ausführung nicht. *(Schrittstand hängt an `createdAt`, Test vorhanden)*
- [x] Fortsetzen öffnet exakt Video, Recall, Karten oder den referenzierten Versuch. *(für Course-Units via `startOrResumeCourseUnit`; Lab-/Examversuche folgen Phase 4/5)*
- [ ] Study-Sessions über `executionId` statt Objective-Deck-ID persistieren; mehrere vorgezogene aktive Units bleiben getrennt und reservieren gemeinsam ihre Karten. *(teilweise: gemeinsame Reservierung über `listReservedCardIds` + Heute-Paket-Ausschluss umgesetzt; Session-Persistenz läuft noch über Objective-Deck-ID + explizite Kartenliste)*
- [ ] Profilwechsel ist ein atomarer Scope-Wechsel ohne Core-Store-Clear und muss Kartenfälligkeit, Reviews, Stats, Deckfortschritt sowie v6-Sessions/Ausführungen offline erhalten; ein expliziter Lernreset setzt nur den betroffenen Profil-Scheduler samt Reviews/Stats/Progress zurück, erhöht bei Schema v2 atomar die Evidence-Epoch, bricht offene Zustände ab und lässt Exposure-/Lease-Audit unverändert. *(teilweise: das dedizierte System ist per Compound-Keys profilfest, Profiltrennung getestet; Lernreset-Flow mit Epoch-Erhöhung fehlt noch)*
- [ ] Alle neuen Study-Einstiege schreiben Review, profil-/session-/contentversioniertes Proposal und Outbox atomar. Nur der Server darf aus Rohantwort, kanonischem Inhalt und verifizierter Zeit ein masteryfähiges Event erzeugen; Legacy-Reviews bleiben reine Hints.
- [ ] `assessment.event` samt append-only Servertabelle in derselben Phase einführen, damit keine unbekannte Outbox-Operation bis Phase 5 liegen bleibt.
- [ ] Bestehende SyncQueueDB/transactionale Outbox profilfest erweitern, nicht ersetzen: Legacy-Operationen und Retry/Backoff erhalten, v1-`progress.reset {timestamp,due,dueAt}` weiterhin decodieren, abgelaufene In-Flight-Sendeleases nach Crash sicher übernehmen, v1→v2 bzw. Main-DB-Migration; ownerlose Altzeilen bleiben bis eindeutiger Zuordnung `deferred-auth`.
- [x] Backup/Restore umfasst neue Zustände, Ausführungen, Resets/Evidence-Epoch und profilbezogene Signale, aber keine internen Migrationsmarker oder Queue/Outbox. Ein Auth-Bootstrap-Reconcile stellt fehlende Proposal-/Reset-/Attempt-Operationen anhand ihrer Original-ID idempotent wieder her; eine Backup-Epoch wird nicht ohne Serverbestätigung autoritativ. Offene Readiness-Versuche werden nicht exportiert; abgeschlossene nur redaktiert ohne Prompts, Optionen, Scoring oder rohe Antworten. *(Umgesetzt als Backup v3: alle Stores der dedizierten DB außer `migrationMeta`; Restore idempotent, States per updatedAt-LWW, Executions unveränderlich, Backup-Epoch nie autoritativ, Legacy-Import restore-fest. Auth-Bootstrap-Reconcile und Readiness-Redaktion folgen mit ihren Phasen — die betroffenen Stores existieren noch nicht.)*

Exit: Reload, Tageswechsel, Profilwechsel und Restore sind deterministisch; kein globales Signal kann eine fremde Einheit abschließen.

### Phase 3 — Evidenzbasierte Reviews und Empfehlungen

- [ ] `listAnswerStats` statt Wrong-only-Query: `scored`, `correct`, `wrong`, `unanswered`, eindeutige Items, Exposition, Zeit, erste/letzte Antwort, letzte Antwort und `resolvedAt`.
- [ ] Das autoritative AssessmentEvent-Ledger vollständig aggregieren; Legacy-Review-Hints dürfen Empfehlungen, aber wegen unsicherer Herkunft keine Mastery liefern.
- [ ] Fälligkeit über dieselbe pure Eligibility-Logik wie die gewählte Study-Sortierung berechnen; direkte statt rekursive Deckquery verwenden.
- [ ] Review-Ausführung aus fälligen Karten und ungelösten Fehlern einfrieren; ein später korrekt gelöstes Item bleibt nicht endlos falsch.
- [ ] Reviewversuche separat protokollieren. Die Tageskappe nutzt Profil, lokales Lerntagsdatum und Abschlussverlauf.
- [ ] Review-Abbruch explizit speichern, aktive Reservierung lösen und unerledigte/überhängende Karten weiter als `reviewDue` behandeln.
- [ ] `rankLearningUnits` erhält Phase, Datum, heutige Reviews, Mastery und Readiness: Grundlagen priorisieren Kurs + fällige Reviews; Vertiefung Schwächen/Labs; Prüfungsphase Holdout-Drills; Abschlussphase kurze gezielte Remediation. *(teilweise: pures Grundgerüst mit `reason`, Phasenableitung und Draft-Pacing existiert und läuft auf Home; echte Mastery-/Review-Inputs fehlen bis `listAnswerStats`)*
- [ ] Wenn Evidenz oder Zeit nicht reicht, zeigt das System einen klaren No-Go-/Terminverschiebungshinweis statt offene kritische Themen auszublenden.

Exit: Empfehlungen sind mit einem deterministischen `reason` erklärbar; kleine Stichproben werden nie als starke/beherrschte Objectives dargestellt.

### Phase 4 — Praktische Labs und PBQs

- [ ] Szenarien erhalten stabile IDs, normalisierte `objectiveIds`/`requirementIds`, stabile Schritt-IDs und Rubriken.
- [ ] Je Szenario eine `lab`-Einheit; Kategorien dienen nur der Gruppierung.
- [ ] Dexie v23: UUID-basierte `labAttempts` mit Profil, Szenario-/Versions-ID, Antworten, Teilpunkten, Fehlversuchen, Dauer, Resume- und Abgabestatus; laufende Versuche sind aktualisierbar, abgegebene unveränderlich.
- [ ] Szenario, Schritte und Rubrik beim Start vollständig versioniert einfrieren; Resume/Scoring darf nach Content-Updates nicht auf die neue Registry umspringen.
- [ ] Legacy-„geschafft“-Sets mit separatem v23-Marker konservativ in exakt das in v22 gespeicherte Ownerprofil importieren; alte Einträge liefern Abschluss-, aber keine Score-/Mastery-Evidenz.
- [ ] Deep Link in `LabsView`/`LabScenarioView`, Resume, verspätetes Feedback und Links zur normalen Remediation.
- [ ] Szenario-Coverage-Gate für die sieben „Given a scenario“-Objectives 2.4, 3.2, 4.1, 4.5, 4.6, 4.9 und 5.6.

Exit: Praxisleistung ist profilfest, nachvollziehbar und fließt nur mit hinreichender Rubrik in Mastery ein.

### Phase 5 — Exam-Engine, Phasen und Readiness (Pflicht)

- [ ] Eigene `ExamView`; keine normale Study-Session und kein unmittelbares Lernfeedback während des Versuchs.
- [ ] Dexie v24: UUID-basierte `examAttempts` und monotone Item-Exposition. Laufende Versuche sind aktualisierbar, abgegebene unveränderlich; gespeichert werden Profil, Exam-Code, Source-Snapshot, Content-Manifest, Sprache, Form-/Item-Versionen, Seed, Snapshots/IDs, globale Deadline, Antworten, Flags, Zeit je Item, Teilpunkte, unbeantwortete Items und Status.
- [ ] Qualifizierende Vollsimulation gemäß freigegebenem Blueprint: initial exakt 90 Items/90 Minuten mit PBQ-/Objective-/Verb-/Szenario-/Schwierigkeitszielen, Navigation, Markieren/Überprüfen, Offline-Resume-Regel, Autosubmit und Feedback erst nach Abgabe. Kürzere Sets sind Drills.
- [ ] Domainmix 12/22/18/28/20 mit deterministischer Rundung; PBQ-Auswahl aus dem vollständigen, geprüften Inventar statt nur aus dem Acronym-Deck.
- [ ] Zwei disjunkte, zuvor ungesehene Holdout-Formen an unterschiedlichen Tagen; Exposition wird dauerhaft verfolgt.
- [ ] Serverseitiger Readiness-Sync mit dauerhafter Auth-Identität→Person→Profil-Bindung, personenweitem Expositionsledger und bestätigten Attempt-/Assessmentdaten; Profil-/Gerätewechsel setzt Holdout-Historie nie zurück.
- [ ] Client baut nur Practice-Formen. Der Server lädt Plan/Lifecycle/Snapshot autoritativ, wählt Readiness selbst und legt in derselben Lease-Transaktion Expositionen samt Receipt sowie genau einen Attempt mit Server-Start/-Deadline an; der signierte Payload enthält keine Scoringdaten, bindet Identity-Assurance und aktiven Plan und kann keinen zweiten Timer erzeugen. Deadline, Submit-Grace, Lease- und Signaturablauf sind exakt gekoppelt.
- [ ] Qualifizierende Readiness-Läufe benötigen serverbelegte Start-/Heartbeat-/Deadline-Zeiten. Offline-Fortsetzung bleibt möglich, wird bei fehlender Zeitattestierung aber dauerhaft nur `practice-only`.
- [ ] `examReady` wird serverseitig aus aktuellen Content-/Akronym-/Evidenz-/Exposure-Gates berechnet und nur über einen kurzlebigen, profil-/person-/assurance-/epoch-/plan-/exam-code-/datum-/sprache-/lifecycle-/booking-/versions-/watermarkgebundenen Receipt angezeigt; lokale Booleans reichen nie und jede Planänderung invalidiert den alten Receipt.
- [ ] Lab-/Diagnostic-/Exam-Evidenz erst nach autoritativem Server-Receipt für Mastery qualifizieren; spätere Clock-/Lease-/Content-/Audit-Invalidierung über append-only Invalidation-Einträge aus allen Aggregaten entfernen.
- [ ] Lernphase aus signierten Resttagen, Fortschritt, Coverage, Mastery und Readiness ableiten; Examtag (`0`) und überfälliger Termin werden eindeutig behandelt.
- [ ] Ergebnis nach Domain, Objective, Requirement und PBQ-Rubrik; explizite Remediation erst nach Abgabe.
- [ ] Practice-Diagnostic beim Einstieg und mindestens wöchentliche Pacing-Neuberechnung; die Diagnostik ist kein Holdout und zählt nicht als Readiness-Mock.
- [ ] Lernplan serverseitig versioniert bestätigen: Candidate-ID ausschließlich aus Auth-Bindung, Bookability per offizieller Quelle aktualisieren und persönliche Buchung separat attestieren; Lease akzeptiert danach nur autoritative Plan-/Lifecycle-IDs.

Interne, konfigurierbare Start-Gates — **keine offizielle 750/900-Umrechnung**:

- Objective `mastered`: 100 % Leaf-Coverage, mindestens 8 unterschiedliche versionierte Abrufitems innerhalb der letzten 21 Tage in mindestens zwei Sitzungen mit 24 Stunden Abstand, in diesem Fenster mindestens 80 %, kein ungelöster kritischer Fehler in den letzten zwei Abrufen und bei Szenariozielen mindestens eine Praxisleistung mit 80 %.
- Domain `ready`: Evidenz für jedes Objective, mindestens 80 % Domainleistung, kein Objective unter 70 % und kein kritischer Leaf-Pfad ungetestet.
- `examReady`: alle 28 Objectives `mastered`, alle fünf Domains `ready`, kein `insufficientEvidence`, vollständige Coverage/Akronyme/Provenienz, keine kritischen Mappingfehler, zwei disjunkte 90-Minuten-Holdout-Mocks an verschiedenen Tagen und in der gebuchten Prüfungssprache, je mindestens 85 % gesamt, je Mock keine Domain unter 75 %, PBQ mindestens 80 %, Zeit eingehalten und keine unbeantworteten Items; getrenntes Labgate mindestens 80 % sowie Exam-Code, Buchbarkeit und Sprache bestätigt.

Exit: Readiness ist reproduzierbar und gegen Leakage geschützt. Bei nicht erfüllten Gates bleibt der Status `approaching` oder `notReady`.

### Phase 6 — Feinschliff

- [ ] Manifestgenerator um `durationSec` erweitern; UI-Fallback ohne Dauer.
- [ ] Filter, mobile Darstellung, Tastaturbedienung, Screenreader-Texte und kein horizontaler Overflow.
- [ ] Persönliche Exam-Day-Checkliste: Sprache, Ausweis/Check-in, Systemtest, Zeitstrategie und genehmigte Accessibility-Vorkehrungen.

### Phase 7 — Optionaler Komfort-Sync

- [ ] Unit-/Videozustand mit dokumentierter LWW-/monotoner Merge-Regel synchronisieren.
- [ ] Weitere nicht-readinesskritische Komfortzustände geräteübergreifend erhalten; Exam-/Exposure-/Assessment-Sync ist bereits Pflicht in Phase 5.

## Datenbank- und Abhängigkeitsplan

*(Stand 2026-07-18: umgesetzt als dedizierte DB `card-pwa-learning-units` v1 neben der Haupt-DB; die v22/v23/v24-Nummern unten bezeichnen die inhaltlichen Ausbaustufen, nicht mehr zwingend Versionen der Haupt-DB. `fake-indexeddb` ist als Dev-Dependency im Einsatz.)*

- Aktueller Ausgangspunkt: Dexie v21.
- v22: profilgescopte Core-Stores für Decks/Karten/Scheduler/Reviews/Stats/Progress/Sessions/Shuffle, Profil-Lernzustand/Evidence-Epoch, Unit-State/Executions, Migrationsmeta, profil- und execution-bezogener Video-/Recall-Zustand, Assessment-Proposals/Accepted-Events/Resets/Receipts, Reviewversuche, Restore-Reconciliation und `LearnerExamPlan`.
- v23: Labversuche und generische serverseitige Assessment-Qualification-Receipts.
- v24: Examversuche, personenweite Exposition, Timing-/Readiness-Receipts, Lifecycle-Confirmations und redaktierte Readiness-Historie.
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
- ab Phase 4: Lab-Resume/Submit; ab Phase 5: Timer, Autosubmit, Offline-Resume, Delayed Feedback und unveränderlicher Versuch
- Backup/Restore, Daily-Quest-Ausschluss, Holdout-Leakage und A11y prüfen

### Content-DoD

- vollständiger versionierter Leaf-/Akronym-Crosswalk
- QA- und Provenienzfelder vollständig, keine ungeklärten Brain-Dump-/Lizenzrisiken
- 4.2/4.9, dünne Objectives, 31 Fehlmappings und Recall-Lücken entschieden
- Szenario-/PBQ-Matrix fachlich reviewed; Kurs-, Practice- und Readiness-Pools disjunkt

### Learner-DoD

- Baseline und persönlicher Zeitplan vorhanden
- alle Objective-/Domain-Evidenzgates erfüllt; sichtbare unzureichende Evidenz blockiert `examReady`
- zwei gültige, disjunkte Holdout-Mocks und Praxisgate erfüllt
- Exam-Code, Termin, Buchbarkeit und Prüfungssprache aktuell bestätigt

Erst wenn alle drei DoDs erfüllt sind, darf die App `examReady` anzeigen. Auch dann bleibt es eine evidenzbasierte Empfehlung, keine Bestehensgarantie.
