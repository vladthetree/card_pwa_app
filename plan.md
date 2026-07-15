# Plan: Lerneinheiten-System für CompTIA Security+ SY0-701

Arbeitsplan für die Umsetzung. Vollständige Analyse, Begründungen, Datenmodell-Details und Risikobewertung: **[docs/lerneinheiten-sy0-701-umsetzungsplan.md](docs/lerneinheiten-sy0-701-umsetzungsplan.md)**. Für die Umsetzung durch eine KI verbindlich: **§23 (Technische Spezifikation)** dort — exakte Funktionsverträge, Integrationspunkte, Migrationsalgorithmus, Definition of Done je Phase und Pflichtlektüre-Liste.

## Ziel

Das Dashboard-Modul **„Aktuelles Paket“** wird zur zentralen Übersicht der **Lerneinheiten**: eine strukturierte Liste in Professor-Messer-Reihenfolge, aktive/empfohlene Einheit hervorgehoben, plus Wiederholungs-, Lab- und Prüfungs-Einheiten aus den vorhandenen Signalen (FSRS-Fälligkeit, falsche Antworten, Recall-Scores, Lab-Fortschritt, Prüfungsdatum). Der Lernplan wird in diesem Modul realisiert, abgerufen und eingesehen.

## Entscheidungen (Nutzer-bestätigt am 2026-07-15, per Fragenset)

- **Zuschnitt**: 1 Video = 1 `course`-Einheit (120 Stück) — keine Objective-Blöcke, keine Zeitbudget-Einheiten.
- **Reihenfolge**: geführt mit Freiheit — nächste Messer-Einheit wird empfohlen, Vorziehen über die Vollliste ist erlaubt (aktive Einheit bleibt `inProgress`).
- **Wiederholung**: dezent — max. 1 empfohlene `review`-Einheit vor der Kurs-Einheit; neuer Stoff wird nie blockiert.
- **Tagesdosis**: mehrere Einheiten pro Tag möglich (Abschluss-Schleife bleibt); kein künstlicher Tagesdeckel, Pacing-Hinweis übernimmt die Tempo-Kontrolle.
- **Labs**: eigene Einheiten, empfohlen nach Abschluss eines Objective-Blocks (Phase 4).
- **Prüfungsmodus**: Phasenmodell + zeitbegrenzte `exam`-Einheiten (Phase 5).
- **Anzeige**: Modul „Aktuelles Paket“ = große Kachel + kompakte Liste + Vollliste im Sheet.
- **Umfang**: Phasen 1–3 als Kernpaket zuerst; 4–7 danach einzeln.

## Warum dieser Plan für SY0-701 passt — nachvollziehbare Begründungen

Jede Kernentscheidung ist gegen zwei Quellen prüfbar: die **offiziellen CompTIA-SY0-701-Prüfungsziele** (PDF ist im Repo als Quelle registriert: `LAB_SOURCES['comptia-sy0-701-objectives']` in [labScenarios.ts](card_pwa/src/data/labScenarios.ts)) und den **tatsächlichen Datenbestand der App** (nachgemessen in `card-sync-server/sync.db` und im Video-Verzeichnis auf dem Pi; Zahlen am 2026-07-15 korrigiert — die Messung vom 2026-07-13 hatte per Join ohne `user_id`-Match alle Deck-Kartenzahlen doppelt gezählt).

### Prüfungsformat → Plan-Entscheidung

| Fakt zur SY0-701-Prüfung (offizielle Objectives/CompTIA) | Entscheidung im Plan | Beleg in der App |
|---|---|---|
| Max. 90 Fragen in 90 Minuten, Multiple-Choice **und** Performance-Based Questions (PBQs); bestanden ab 750/900 | `exam`-Einheiten sind **zeitbegrenzt** und mischen MC-Praxisfragen mit PBQ-Karten (Phase 5) | PBQ-Karten existieren bereits: Deck „Acronym-Bonus (ABCD + PBQ)“ (43 Karten/Profil) + PBQ-Parser [utils/pbqScoring.ts](card_pwa/src/utils/pbqScoring.ts) |
| PBQs sind simulationsartige Aufgaben (Zuordnen, Reihenfolgen, Regelwerke) | Labs (matching/ordering, Firewall-Regelketten, Order of Volatility) werden als `lab`-Einheiten in den Lernpfad integriert (Phase 4) — sie trainieren exakt das PBQ-Format | 100 Szenarien + 11 Blueprints mit genau diesen Interaktionstypen ([labScenarios.ts](card_pwa/src/data/labScenarios.ts), [labBlueprints.ts](card_pwa/src/data/labBlueprints.ts)); Firewall-Regelkette „First Match/Top-Down“ entspricht der klassischen SY0-701-PBQ |
| Die Prüfung testet **28 Objectives in 5 Domains** (1.1–1.4, 2.1–2.5, 3.1–3.4, 4.1–4.9, 5.1–5.6) | Der Objective-Code ist der universelle Join-Key des Systems; die Coverage-Matrix prüft alle 28 Objectives auf Video/Karten/Fragen/Lab | Exakt diese 28 Objectives sind bereits als System-Decks verdrahtet ([securityDeckHierarchy.ts:45](card_pwa/src/utils/securityDeckHierarchy.ts#L45)) — keine neue Taxonomie nötig |
| Szenariofragen dominieren („A security analyst notices…“) | Root-Deck-Praxisfragen (nummerierte Szenario-MCs, 339/Profil über die 5 Domain-Root-Decks) werden Quelle der `exam`-Einheiten — nicht die Definitionskarten | Nachgemessen in `sync.db`: 01: 30, 02: 57, 03: 96, 04: 90, 05: 66 Karten/Profil direkt in den Root-Decks |

### Offizielle Domain-Gewichtung → Priorisierung

Die SY0-701-Domains sind laut offiziellem Objectives-PDF gewichtet. Der Plan nutzt diese Gewichte an zwei Stellen: (a) Zusammensetzung der `exam`-Einheiten, (b) „schwächste Domain zuerst“ in der Vertiefungsphase wird mit dem Prüfungsgewicht multipliziert (eine Schwäche in Domain 4 kostet in der Prüfung mehr als eine in Domain 1).

| Domain | Prüfungsgewicht | Videos (Pi, nachgezählt) | Karten/Profil (Objective- + Root-Decks) |
|---|---|---|---|
| 1 General Security Concepts | 12 % | Obj. 1.1–1.4 | 130 + 30 |
| 2 Threats, Vulnerabilities, Mitigations | 22 % | Obj. 2.1–2.5 | 114 + 57 |
| 3 Security Architecture | 18 % | Obj. 3.1–3.4 | 57 + 96 |
| 4 Security Operations | **28 %** (größte Domain) | Obj. 4.1–4.9 (meiste Videos) | 71 + 90 |
| 5 Security Program Mgmt & Oversight | 20 % | Obj. 5.1–5.6 | 40 + 66 |

Konsequenz aus der Tabelle (echte Lücke, nicht kosmetisch): Domain 4 ist die **schwerste Domain der Prüfung**, aber ausgerechnet dort fehlen Karten für **4.2 Asset Management** und **4.9 Security Data Sources** komplett, und 4.4/4.7/4.8 sind dünn (4–5 Karten). Die Coverage-Matrix (Phase 1) macht genau das sichtbar, statt es zu verstecken.

### Professor-Messer-Reihenfolge als Gliederung — warum das fachlich richtig ist

1. Der Messer-Kurs ist **entlang der offiziellen Objectives aufgebaut**: jeder Videodateiname trägt den Objective-Code (`NNN - D.O - Titel`), nachprüfbar an allen 120 Kursdateien auf dem Pi ([localVideoManifest.ts](card_pwa/src/utils/localVideoManifest.ts) parst genau dieses Schema). Wer der Playlist folgt, arbeitet die Objectives 1.1 → 5.6 in didaktischer Reihenfolge ab — die Domain-Kontrolle ist damit ein Sicherheitsnetz, keine zweite Sortierung.
2. Der Kartensatz ist **derselbe Kurs**: das Original-Apkg heißt „Professor Messer SY0-701 Free Video Course“, seine Deck-Pfade (`Section 1 … 1.2.5: Zero Trust`) spiegeln die Video-Gliederung ([messner_lernkarten/](messner_lernkarten/)). Video ↔ Karten ↔ Fragen sind also inhaltlich aus einer Quelle — die 1:1-Zuordnung über den Objective-Code ist keine Annahme, sondern Herkunft.
3. Die 375 MC-Fragen sind **pro Video** gemappt (generiert aus den Kursdaten, [messerVideoQuestionMap.ts](card_pwa/src/data/messerVideoQuestionMap.ts)), die 264 Transkript-Fragen sind wörtlich aus den Video-Transkripten der jeweiligen Folge kuratiert — der Abruf-Check einer `course`-Einheit fragt also exakt den Stoff des gerade gesehenen Videos ab (Retrieval Practice am richtigen Objekt).

### Lernwissenschaftliche Passung (bereits in der App verankert, wird wiederverwendet)

Die App dokumentiert ihre Lernmechanik quellenpflichtig in [aiModeGuides.ts](card_pwa/src/data/aiModeGuides.ts) (jede Regel mit Forschungsquelle oder Repo-Referenz, strukturell abgesichert durch `ai-mode-guides.test.ts`). Der Plan baut auf genau diesen Mechanismen auf, statt neue zu erfinden:

- **Retrieval Practice statt Wiederansehen**: Schritt-Abschluss zählt nur über echte Signale (Recall-Lauf, `recordReview`), nie über Klicks ([useTodayPackage.ts](card_pwa/src/hooks/home/useTodayPackage.ts)); „watched“ allein ergibt bewusst keinen grünen Status — das Anti-Fluency-Design ist in [useMesserVideoProgress.ts](card_pwa/src/hooks/useMesserVideoProgress.ts) begründet und bleibt unangetastet.
- **Spacing**: FSRS terminiert jede Karte individuell; `review`-Einheiten bündeln nur, was FSRS ohnehin fällig stellt, plus nachweislich falsch beantwortete Fragen (`answerCorrect=false` in [db/index.ts:94](card_pwa/src/db/index.ts#L94)). Kein zweites, konkurrierendes Intervallsystem.
- **Fehlergetriebenes Lernen**: Die Prüfung bestraft Verwechslungs-Distraktoren (OCSP↔CRL, Hot/Warm/Cold Site …); genau dafür speichert die App seit v21 die konkret gewählte falsche Option (`selectedAnswer`) — Phase 3 wertet sie erstmals aus.
- **Interleaving in der Prüfungsphase**: gemischte Domains in `exam`-Einheiten entsprechen dem realen Prüfungsformat (Fragen kommen ungeordnet); die Interleaving-Mechanik existiert bereits (`interleaveCardsByDeck` in [studyCardOrdering.ts](card_pwa/src/services/studyCardOrdering.ts)).

## Architektur-Entscheidungen (fix)

- **Definitionen werden berechnet, nie gespeichert**: purer Builder aus Videokatalog + Objective-Decks + Fragen-Mapping + Lab-Inventar (`utils/learningUnits.ts`, neu).
- **Nur Nutzerzustand wird persistiert**: neue Dexie-Tabelle `learningUnitState`, Compound-Key `[profileId+unitId]` (Muster `videoNotes2`), Dexie v22.
- **Einheiten-Typen**: `course` (1 Video + Abruf-Check + Karten-Dosis, 120 Stück, Playlist-Index = Reihenfolge), `review` (je Objective aus fälligen + falsch beantworteten Karten), `lab`, `exam` (Root-Deck-Praxisfragen + PBQ, zeitbegrenzt).
- **Unit-IDs**: `unit:course:{index3}`, `unit:review:{objective}`, `unit:lab:{categoryId}`, `unit:exam:{n}`.
- **FSRS bleibt die einzige Wiederholungsmaschine** — die Einheitenebene aggregiert nur; Recall-Checks bleiben non-scheduling.
- **Statusmodell**: `notStarted | inProgress | reviewDue | completed | passed`, rein abgeleitet.
- **Umbenennung nur sichtbarer Texte**: „Heute-Paket“/„…Paket“ → „Lerneinheit“; Modul-Label „Aktuelles Paket“ bleibt. Keine Umbenennung von Storage-Keys, Dateinamen, testids, DB-Feldern, Sync-Payloads.
- Umsetzung **schrittweise** (jede Phase einzeln shippbar); Kernpaket = Phasen 1–3.

## Vorbedingung (vor Phase 1, zwingend)

Der Plan referenziert Code, der auf `branch_01` noch **uncommitted** ist (u. a. `activeCardLimit` im Pointer, `computeExamDaysLeft`, Exam-Countdown inkl. neuem Test `home-exam-countdown.test.tsx` — ~24 geänderte Dateien). Reihenfolge: erst diesen Stand mit `npm run build` + `npm test` verifizieren und **committen**, dann Phase 1 beginnen. Niemals Lerneinheiten-Änderungen mit dem Exam-Countdown-Diff vermischen.

## Phase 1 — Modell + Liste im Modul (MVP)

- [ ] `card_pwa/src/utils/learningUnits.ts` (pure): `buildCourseUnits(...)`, `computeUnitStatus(...)`, `rankLearningUnits(...)` (nur `course`), `buildObjectiveCoverage(...)` — Signaturen exakt nach Doku §23.1
- [ ] Signal-Ableitung aus `useTodayPackage.computeSteps` als pure Funktion `computePackageStepState` in `utils/todayPackage.ts` extrahieren (Vertrag §23.1a; Verhalten durch bestehende Tests fixiert; Hook nutzt sie weiter)
- [ ] `components/home/HomeLearningUnitList.tsx` (neu): kompakte Zeilen unter der Kachel — Titel, Status-Chip, Hauptaktion; max. ~5 Zeilen
- [ ] `components/home/LearningUnitSheet.tsx` (neu): Vollliste („Alle Lerneinheiten anzeigen“), Gruppierung nach Objective/Domain, Detailansicht mit Inhalten + Abdeckung
- [ ] Einbindung in den `today`-Slide direkt in [HomeView.tsx:222](card_pwa/src/components/HomeView.tsx#L222) (dort rendert die Kachel); bestehende `HomeTodayPackageTile` bleibt die große Kachel (Props unverändert)
- [ ] Begriffs-Umbenennung: `HomeTodayPackageTile`-COPY („Lade Lerneinheit“, Offline-Text, completedToday-Hinweis), `SettingsModal` („Karten pro Lerneinheit“), `i18n.ts` (`study_stack_size_info`), `aiModeGuides.ts`-Texte, EN-Varianten
- [ ] Tests: `learning-units.test.ts` (Builder/Ranking/Status/Coverage; 4.2/4.9 als bekannte Lücken-Fixture); Komponententest Liste (leer/laden/offline/aktiv hervorgehoben); bestehende Suites grün
- Akzeptanz: Modul zeigt Liste (aktiv + nächste + Sheet); Verhalten der Kachel unverändert; Build + `npm test` grün

## Phase 2 — Persistenz + Profiltrennung

- [ ] Dexie v22: `learningUnitState: '[profileId+unitId], profileId, updatedAt'` (Felder Doku §15; Query-Verträge, Profil-Scope `profileScopeId` und Migrationsalgorithmus Doku §23.2)
- [ ] `db/queries/learningUnits.ts` (neu): get/put, einmalige Pointer-Migration (`TodayPackagePointer` → States; Pointer bleibt als Fallback bestehen, Migration idempotent)
- [ ] `hooks/home/useLearningUnits.ts` (neu, ersetzt `useTodayPackage` im Home-Wiring): Zustand aus Dexie, Signale wie bisher
- [ ] Aktionen: `Starten` / `Fortsetzen` (exakter Schritt: Video-Index / Recall / verbleibende `activeCardIds`) / andere Einheit manuell wählen (aktive bleibt `inProgress`)
- [ ] Tests: Migration (fake-indexeddb), Profilwechsel trennt States, Tageswechsel löscht nichts, Fortsetzen öffnet exakten Schritt
- Akzeptanz: Fortschritt überlebt Reload/Profilwechsel; Daily-Quest-Ausschluss weiter intakt

## Phase 3 — Review-Einheiten + Erklärbarkeit

- [ ] `db/queries/reviews.ts`: `listWrongAnswerStats(deckIds, sinceMs)` (nutzt `answerCorrect`/`selectedAnswer`/`rating≤2`; Vertrag Doku §23.3)
- [ ] `review`-Einheiten je Objective (Kappe ~15 Karten); Ranking-Zeilen: aktiv → überfällige Reviews → reviewDue-Kurs-Einheiten → nächste Kurs-Einheit
- [ ] `reason`-Chip je Empfehlung („Wiederholung aufgrund falscher Antworten“, „Nächstes Thema in der Messer-Reihenfolge“, …) — deterministisch, testbar
- [ ] Anti-Überlastung: max. 1 empfohlene Review vor der Kurs-Einheit; neue Themen nie blockiert
- [ ] Tests: Ranking-Prioritäten einzeln + kombiniert; Review-Einheit enthält nur fällige/falsche Karten
- Akzeptanz: falsch beantwortete Fragen erscheinen gebündelt mit Begründung wieder

## Phase 4 — Labs im Lernpfad

- [ ] Datenpflege: `labScenarios.ts`/`labBlueprints.ts` um normalisierte `objectives: string[]` ergänzen (Format + Validierungstest Doku §23.5; Review-Tabelle im PR)
- [ ] Dexie v23: `labAttempts` (Schema + Legacy-Import Doku §23.5); Import des `labsCompleted`-Sets als Alt-Versuche
- [ ] `lab`-Einheiten: Empfehlung nach Objective-Block-Abschluss; „nicht bestanden → erneut“ im Ranking
- [ ] Ergebnisübersicht nach dem Lab: falsche Schritte/Zuordnungen + Links zu Video/Karten der Objective
- Akzeptanz: Lab-Ergebnisse beeinflussen die Liste; Fortschritt profilfest

## Phase 5 — Prüfungsdatum + Lernphasen

- [ ] `resolveLearningPhase({daysLeft, courseProgress})`: Grundlagen / Vertiefung (≤21 Tage o. ≥60 %) / Prüfung (≤10) / Abschluss (≤3) — rein abgeleitet, kein gespeicherter Zustand (Signatur + null-Termin-Regel Doku §23.5)
- [ ] `exam`-Einheiten: gemischte Root-Deck-Fragen + PBQ-Deck, Timer, Auswertung; Fragenmix nach offizieller Domain-Gewichtung 12/22/18/28/20 % (deterministische Rundung + Quellen-Erkennung Doku §23.5)
- [ ] Schwächen-Priorisierung in der Vertiefungsphase: Fehlerquote je Domain × Prüfungsgewicht (Domain 4 zählt 28 %, Domain 1 nur 12 %)
- [ ] Pacing-Warnung bei unrealistischem Tempo (aus `computeExamPacing`)
- Akzeptanz: Liste verschiebt Schwerpunkte mit Prüfungsnähe; keine neuen Großthemen kurz vor dem Termin

## Phase 6 — Feinschliff

- [ ] Video-Dauern: `index.json`-Generator auf dem Pi um `durationSec` erweitern (ffprobe); Dauer-Anzeigen in Liste/Detail (Fallback: ohne Dauer)
- [ ] Filter-Chips in der Vollliste (Offen/Wiederholen/Abgeschlossen/Labs), A11y, Mobile-Polish (kein horizontaler Overflow)

## Phase 7 — Sync (optional)

- [ ] Op-Typen `unit.progress` / `lab.attempt` + Servertabelle (analog `server_video_notes`), LWW auf `updatedAt`
- [ ] Kandidat: Video-Progress/Recall-Scores von localStorage nach Dexie

## Bekannte Lücken (nicht erfinden — kennzeichnen)

- Objectives **4.2 Asset Management** und **4.9 Security Data Sources**: keine Karten → `Noch nicht vorhanden` / `Zuordnung erforderlich` (Coverage zeigt es an)
- ~16 Videos ohne Abruf-Fragen (weder Mapping noch Transkript) → `Zuordnung erforderlich` (Audit in `messner_lernkarten/`)
- Video 001 (Kurs-Intro, kein Objective-Code): bewusst außerhalb des Modells
- Video-Dauern fehlen im Manifest → Phase 6

## Verifikation je Phase

`npm run build` + `npm test` (Vitest) + Driver-Screenshot über `/run-card-pwa`; E2E-Kernfluss (Phase 2+): Einheit starten → Video → Recall → Karten (inkl. falscher MC-Antwort) → Reload → Fortsetzen an gleicher Stelle → Abschluss → Liste rückt vor.
