# Umsetzungsplan: Lerneinheiten-System für CompTIA Security+ SY0-701

Stand: 2026-07-13, aktualisiert 2026-07-15 · Basis: vollständige Analyse der Codebasis (card_pwa, card-sync-server, Inhaltsbestand auf dem Pi). **Noch keine Codeänderung** — dieses Dokument ist die Arbeitsgrundlage für die schrittweise Umsetzung.

**Nutzer-bestätigte Entscheidungen (2026-07-15, per Fragenset):** 1 Video = 1 `course`-Einheit · geführte Messer-Reihenfolge mit freiem Vorziehen · max. 1 empfohlene Review vor neuem Stoff · mehrere Einheiten/Tag ohne Deckel · Labs als eigene Einheiten nach Objective-Block · Phasenmodell + zeitbegrenzte `exam`-Einheiten · Anzeige als Kachel + Liste im Modul „Aktuelles Paket“ · Umsetzung Phasen 1–3 zuerst. Alle Empfehlungen dieses Dokuments sind damit bestätigt.

**Zahlenkorrektur 2026-07-15:** Die `sync.db`-Messung vom 13.07. zählte per Join ohne `user_id`-Match doppelt; außerdem war das Lab-Inventar veraltet. Korrekt sind: 803 Karten/Profil (bestätigt), Root-Decks 30/57/96/90/66 (Domain 1–5), Acronym-Bonus 43/Profil, Interaktive Übungen 9/Profil, 4.4/4.7/4.8 nur 4–5 Karten, **100** kuratierte Lab-Szenarien, **11** Blueprints.

Kernidee in einem Satz: Das bestehende Heute-Paket (Video → Abruf-Check → Karten) **ist bereits eine Lerneinheit** — der Plan macht daraus ein explizites, benanntes, persistiertes Modell, zeigt im Modul **„Aktuelles Paket“** die Lerneinheiten als strukturierte Liste (aktive Einheit hervorgehoben) und ergänzt Wiederholungs-, Lab- und Prüfungs-Einheiten auf Basis der vorhandenen Signale (FSRS, Antwortdetails, Recall-Scores, Lab-Fortschritt, Prüfungsdatum).

---

## 1. Ist-Zustand der App

### 1.1 Architektur

| Ebene | Technik | Rolle |
|---|---|---|
| Frontend | React + Vite + TypeScript, Tailwind | PWA, offline-first, App-Shell mit Views `home / study / shuffle-study / shuffle-manage / labs / videos` ([types/index.ts:187](card_pwa/src/types/index.ts#L187)) |
| Lokale DB | Dexie (IndexedDB) `card-pwa-db`, Version 21 | Decks, Karten, Reviews, Sessions, Profil, Video-Notizen/-Downloads, Sync-Outbox ([db/index.ts](card_pwa/src/db/index.ts)) |
| Gerätezustand | localStorage (`STORAGE_KEYS`) | Settings, Heute-Paket-Pointer, Video-Fortschritt, Recall-Scores, Lab-Fortschritt ([constants/appIdentity.ts](card_pwa/src/constants/appIdentity.ts)) |
| Sync-Server | Python auf dem Pi (:8787), SQLite `sync.db`, Ops-Log-basiert | users, devices, sync_operations, server_decks/cards/reviews, video_notes, push ([server/db/schema.py](card-sync-server/server/db/schema.py)) |
| Medien | Pi streamt `/media/messer/*.mp4` (Range), Manifest `/media/messer/index.json` | 121 Professor-Messer-Videos + .vtt-Untertitel + Transkripte |

### 1.2 Relevante Module (Übersicht)

| Bereich | Dateien |
|---|---|
| Heute-Paket (Logik) | [utils/todayPackage.ts](card_pwa/src/utils/todayPackage.ts) (Pointer, Exam-Pacing), [hooks/home/useTodayPackage.ts](card_pwa/src/hooks/home/useTodayPackage.ts) (Schritt-Ableitung, Abschluss-Schleife) |
| Heute-Paket (UI) | [components/home/HomeTodayPackageTile.tsx](card_pwa/src/components/home/HomeTodayPackageTile.tsx) (Label „Aktuelles Paket“), direkt in [HomeView.tsx:222](card_pwa/src/components/HomeView.tsx#L222) im Dashboard-Slide `today` gerendert (nicht über `HomeStatsSection`) |
| Dashboard | [HomeView.tsx](card_pwa/src/components/HomeView.tsx), Modi `today | pilot | quests | kpi | heatmap | clean` (Karussell) |
| Videos | [utils/localVideoManifest.ts](card_pwa/src/utils/localVideoManifest.ts) (Parser `NNN - D.O - Titel`), [hooks/useLocalMesserVideos.ts](card_pwa/src/hooks/useLocalMesserVideos.ts), [components/videos/VideosView.tsx](card_pwa/src/components/videos/VideosView.tsx), [MesserVideoPlayer](card_pwa/src/components/videos/MesserVideoPlayer.tsx) |
| Video-Fortschritt | [hooks/useMesserVideoProgress.ts](card_pwa/src/hooks/useMesserVideoProgress.ts) (watched + Konfidenz gaps/ok/solid, localStorage), [hooks/useVideoRecallScores.ts](card_pwa/src/hooks/useVideoRecallScores.ts) (letzte 5 Läufe je Video, Verdict understood/almost/review) |
| Abruf-Check | [components/videos/VideoRecallCheck.tsx](card_pwa/src/components/videos/VideoRecallCheck.tsx) — non-scheduling, mischt gemappte Deck-MC-Fragen + Transkript-Fragen |
| Fragen-Zuordnung | [data/messerVideoQuestionMap.ts](card_pwa/src/data/messerVideoQuestionMap.ts) (GENERIERT: 375 Fragen ↔ 104 Videotitel), [data/messerTranscriptQuestions.ts](card_pwa/src/data/messerTranscriptQuestions.ts) (264 kuratierte Fragen für 62 Videos) |
| Objective-Hierarchie | [utils/securityDeckHierarchy.ts](card_pwa/src/utils/securityDeckHierarchy.ts) — 5 Domains, 28 Objectives, System-Deck-IDs `sy0-701-objective-D-O` (zentraler Join-Key) |
| Karten/Scheduling | [utils/fsrs.ts](card_pwa/src/utils/fsrs.ts), [utils/sm2.ts](card_pwa/src/utils/sm2.ts), [db/queries/reviews.ts](card_pwa/src/db/queries/reviews.ts) (`recordReview` inkl. Antwortdetails), [services/studyCardOrdering.ts](card_pwa/src/services/studyCardOrdering.ts) (`buildTodayPackageSelection`), `pickDailyQuestCards` in [db/queries/decks.ts:257](card_pwa/src/db/queries/decks.ts#L257) (Ausschluss der Paket-Karten via `excludeCardIds`, übergeben in [HomeView.tsx:181-206](card_pwa/src/components/HomeView.tsx#L181-L206)) |
| Karten-Varianten | [utils/cardVariant.ts](card_pwa/src/utils/cardVariant.ts): `standard | mc | ordering | matching` + Free-Recall-Tag; PBQ-Parser [utils/pbqScoring.ts](card_pwa/src/utils/pbqScoring.ts) |
| Labs | [data/labScenarios.ts](card_pwa/src/data/labScenarios.ts) (100 kuratierte Szenarien, 9 Kategorien), [data/labBlueprints.ts](card_pwa/src/data/labBlueprints.ts) (11 Blueprints → generierte Übungen via [utils/labGenerator.ts](card_pwa/src/utils/labGenerator.ts)), Fortschritt: [utils/labProgress.ts](card_pwa/src/utils/labProgress.ts) + [utils/labTraining.ts](card_pwa/src/utils/labTraining.ts) (localStorage-Sets), UI: [LabsView](card_pwa/src/components/labs/LabsView.tsx) / [LabScenarioView](card_pwa/src/components/labs/LabScenarioView.tsx) |
| Session | [services/studySessionPersistence.ts](card_pwa/src/services/studySessionPersistence.ts) (PersistedStudySession v5 in Dexie `activeSessions`, TTL 45 min, „Weiterlernen“-Banner) |
| Coach/Gamification | [services/learningCoach.ts](card_pwa/src/services/learningCoach.ts), [utils/gamification.ts](card_pwa/src/utils/gamification.ts), cardStats (`correctStreak`, `ratingHistogram`) |
| Settings | [contexts/SettingsContext.tsx](card_pwa/src/contexts/SettingsContext.tsx): `newCardsPerDay` (= Paket-Kontingent), `examDateIso`, `studyCardLimit`, `dailyGoal`, `recallCheckSize`, `nextDayStartsAt` |
| Sync | [services/syncCoordinator.ts](card_pwa/src/services/syncCoordinator.ts), Outbox in Dexie, Ops-Log auf Server; Antwortdetails werden serverseitig gespeichert ([server/sync/operations.py:454](card-sync-server/server/sync/operations.py#L454)) |
| Tests | u. a. [today-package.test.ts](card_pwa/src/__tests__/utils/today-package.test.ts), [home-view-shell.test.tsx](card_pwa/src/__tests__/integration/home-view-shell.test.tsx), [study-card-ordering.test.ts](card_pwa/src/__tests__/services/study-card-ordering.test.ts), lab-generator/lab-scenarios, video-recall-check; E2E via `/run-card-pwa`-Driver |

### 1.3 Persistenz-Landkarte (was liegt wo)

| Datum | Speicherort | Profilgetrennt? | Synchronisiert? |
|---|---|---|---|
| Karten, Decks, Reviews (inkl. Antwortdetails) | Dexie + Server | ja (userId auf Server) | **ja** (Ops-Log) |
| Video-Notizen, Tag-Metadaten | Dexie `videoNotes2`/`videoTagMeta` + Server | ja (`profileId`) | ja |
| Heute-Paket-Pointer (`activeIndex`, `activeCardIds`, …) | localStorage | **nein** | **nein** |
| Video-Fortschritt (watched/Konfidenz) | localStorage `card-pwa-messer-video-status` | **nein** | **nein** |
| Recall-Scores (letzte 5 Läufe je Video) | localStorage `card-pwa-messer-recall-scores` | **nein** | **nein** |
| Lab-Fortschritt (`labsCompleted`, `labsTrainingSolved`) | localStorage | **nein** | **nein** |
| Settings inkl. `examDateIso`, `newCardsPerDay` | localStorage `card-pwa-settings` | nein | nein |
| Video-Offline-Kopien | Dexie `videoDownloads`/`videoBlobs` | nein (geräteweit) | nein (bewusst) |

---

## 2. Vorhandene Inhalte und Daten (Inventar)

### 2.1 Professor-Messer-Videos (primäre Gliederung)

- **121 MP4-Dateien** auf dem Pi (`~/youtube-playlists/CompTIA SY0-701 …`), Schema `NNN - D.O - Titel - CompTIA Security+ SY0-701.mp4`; dazu `.en.vtt`-Untertitel und `transcripts/*.txt`.
- **120 Videos mit Objective-Code** (Playlist-Index 002–121). Video `001` (Kurs-Intro „How to Pass Your SY0-701 Exam“) hat keinen Objective-Code und wird vom Parser bewusst ausgefiltert — es liegt außerhalb des Modells (siehe §4).
- IDs: **Playlist-Index** (`LocalVideoMeta.index`) und **Objective-Code** (`1.2` …) sind die Join-Keys. `videoScoreKey(index)` = 3-stellig gepolstert.
- Reihenfolge = Dateinamens-Index = didaktische Kursreihenfolge → **bereits die gewünschte Lernreihenfolge**.
- Dauer je Video: **Noch nicht vorhanden** (Manifest liefert nur Dateinamen; Vorschlag §7).

### 2.2 Lernkarten

- Quelle: Anki-Export des offiziellen Messer-Kartensatzes ([messner_lernkarten/](messner_lernkarten/), 1532 Notes / 2995 Karten im Original-Apkg) — in die App importiert und bereinigt.
- Aktueller Bestand (Server `sync.db`, aktiv, je Profil — 2 Profile mit identischem Kursbestand): **803 Karten/Profil**, davon **375 MC-Fragen** mit Präfix `M#-###:` (exakt das, was `MESSER_VIDEO_BY_QUESTION_ID` mappt).
- Struktur: 5 Root-Decks (`01_…`–`05_…`, enthalten direkt nummerierte Praxis-/Szenariofragen; 30/57/96/90/66 Karten/Profil für Domain 1–5), 28 Objective-Decks (`1.1 Security Controls` … `5.6 Security Awareness`), plus `Acronym-Bonus (ABCD + PBQ)` (43/Profil, enthält PBQ-Karten) und `Interaktive Übungen` (9/Profil: ORDERING/MATCHING-Karten).
- **Objective-Decks ohne Karten: 4.2 Asset Management, 4.9 Security Data Sources** → `Zuordnung erforderlich` (Karten existieren evtl. thematisch in Root-Decks) bzw. `Noch nicht vorhanden`.
- Karten-Varianten (aus `front`/`back` geparst): Flip (M1), MC, ORDERING, MATCHING, Drag-Match, Free-Recall (Tag), Cloze-artige; Autoren-Dokus in [docs/M1-flip.md](docs/M1-flip.md) ff.

### 2.3 Fragen für den Abruf-Check

| Quelle | Umfang | Zuordnung |
|---|---|---|
| Gemappte Deck-MC-Fragen | 375 Fragen | Fragen-ID → Videotitel (generiert, 104 Videos abgedeckt) |
| Kuratierte Transkript-Fragen | 264 Fragen | Playlist-Index (62 Videos), nur als Auffüllung, nie als Karten |

→ ~**16 Videos ohne jegliche Abruf-Fragen** (weder Mapping noch Transkript): `Zuordnung erforderlich` (Audit-CSV liegt in [messner_lernkarten/professor_messer_video_recall_audit.md](messner_lernkarten/professor_messer_video_recall_audit.md)).

### 2.4 Labs

- **100 kuratierte Szenarien** in 9 Kategorien (grundlagen 9, bedrohungen 11, firewalls 14, architektur 10, iam 10, betrieb 12, incident-response 14, krypto 10, governance 10), je mit `objective`-Label, `difficulty` (einsteiger/fortgeschritten/experte), **`minutes` (geschätzte Dauer vorhanden!)**, Interaktion matching/ordering, Quellen-Registry.
- **11 Blueprints** → deterministisch generierte Übungs-Instanzen (seeded, Anti-Dopplung über gelöste Signaturen).
- Fortschritt: nur „geschafft“-Sets in localStorage; **kein Schrittfortschritt, keine Versuchshistorie, keine Pause/Wiederaufnahme, keine Profiltrennung, kein Sync, keine Fehlerdokumentation**.
- Lab↔Video/Karten: nur über das freitextliche `objective`-Label (z. T. Bereichsangaben wie „4.3–4.5“) → **nicht maschinenlesbar normalisiert** → `Zuordnung erforderlich`.

### 2.5 Antwort- und Fortschrittsdaten

- `ReviewRecord`: `cardId`, `rating` (1–4), `timeMs`, `timestamp` + **additiv `selectedAnswer`, `correctAnswer`, `answerCorrect`** ([db/index.ts:90](card_pwa/src/db/index.ts#L90)) — wird bei interaktiven Karten (MC/Drag-Match/Ordering/Matching) mitgeschrieben und zum Server synchronisiert. Historie ist noch dünn (Feature ist jung), wächst aber ab sofort.
- `cardStats`: totalReviews, correctStreak, ratingHistogram je Karte. `deckProgress`: Aggregat je Deck.
- FSRS (Default) / SM-2 vorhanden; `lapses`, `reps`, `stability`, `difficulty` je Karte; `getCardWeight` gewichtet Fehlerdruck bereits in der Session-Sortierung.
- Video: watched + Konfidenz je Objective; Recall-Verdict je Video (objektiv). Prüfungsdatum: `examDateIso` + `computeExamPacing` (Restkarten/Resttage, Restvideos/Resttage).

---

## 3. Aktuelle Paket- und Fortschrittslogik (präzise)

1. `useTodayPackage` lädt den Videokatalog (Manifest → localStorage-Kopie → Dexie-Downloads als Offline-Fallback).
2. `TodayPackagePointer` (localStorage): `lastCompletedIndex`, `activeIndex`, `activeStartedAt`, `activeCardIds` (feste Dosis), `activeCardLimit`.
3. `pickTodayVideo`: erstes Video mit `index > lastCompletedIndex` → **genau ein aktives Paket**.
4. Schritte werden aus echten Signalen abgeleitet (nie aus Klicks): Video = watched-Flag seit `activeStartedAt` (oder Recall erledigt), Recall = Lauf seit `activeStartedAt`, Karten = feste `activeCardIds` alle per `recordReview` seit `activeStartedAt` bewertet.
5. Sind alle Schritte fertig, rückt der Pointer sofort zum nächsten Video vor (while-Schleife) — **kein Tages-Reset; ein begonnenes Paket überlebt den Tageswechsel bereits** (`activeStartedAt` bleibt, nur `completedToday` hängt an der Tagesgrenze `nextDayStartsAt`).
6. Die Karten-Dosis kommt aus `settings.newCardsPerDay` (Settings-Label „Karten pro aktuellem Paket“); die Daily Quest schließt `activeCardIds` aus (zwei unabhängige Lernpfade).
7. Anzeige: einzelne Kachel im Dashboard-Slide `today` mit 3 Schritt-Zeilen und genau einer Hauptaktion.

**Sichtbare Begriffe heute:** Kachel-Label „Aktuelles Paket“ / „Current package“; Lade-/Offline-Texte „Heute-Paket“; Settings-Sektion „Aktuelles Paket“ mit Regler „Karten pro aktuellem Paket“; Hinweis in `study_stack_size_info` („Das aktuelle Paket hat ein eigenes Kontingent“). Die Bezeichnung „Tägliches Paket“ kommt wörtlich **nicht** (mehr) vor — die Umbenennung betrifft die „Heute-Paket“-/„Paket“-Formulierungen (§6 der Anforderung, Mapping in §9.4 unten).

---

## 4. Gefundene Probleme und Lücken

| # | Problem | Auswirkung | Schwere |
|---|---|---|---|
| P1 | Es existiert **kein Lerneinheits-Modell** — nur ein impliziter Zeiger auf „das nächste Video“ | Keine Liste, keine Detailansicht, kein Vor-/Zurückgreifen, keine Wiederholungs-/Lab-/Prüfungs-Einheiten | hoch |
| P2 | Paket-Fortschritt (Pointer), Video-Fortschritt, Recall-Scores, Lab-Fortschritt liegen **gerätelokal und profilübergreifend** in localStorage | Gerätewechsel/Profilwechsel verliert bzw. vermischt Fortschritt; Offline-Konflikte unlösbar | hoch |
| P3 | Labs sind ein isolierter Bereich: nicht im Tagespfad, `objective` nur Freitext, kein Schritt-/Versuchs-Fortschritt | Praktische Übungen fließen nicht in Empfehlung/Fortschritt ein | mittel–hoch |
| P4 | 4 parallele Statussysteme (Video-Konfidenz, Recall-Verdict, FSRS-Kartenstatus, Lab-geschafft) ohne gemeinsame Aggregation | „Wie weit bin ich bei Objective X?“ ist nirgends beantwortbar | mittel |
| P5 | Falsch-Antwort-Details (`selectedAnswer` …) werden gespeichert, aber **nirgends ausgewertet** | Fehleranalyse/gezielte Wiederholung ungenutzt | mittel |
| P6 | Objectives **4.2 und 4.9 ohne Karten**; ~16 Videos ohne Abruf-Fragen; Video 001 außerhalb des Modells | Lücken in der Abdeckung | mittel |
| P7 | Keine Video-Dauern → Gesamtdauer einer Einheit nicht schätzbar | Dauer-Anzeige unvollständig | niedrig |
| P8 | `examDateIso` erzeugt nur einen Pacing-Hinweis, beeinflusst aber weder Auswahl noch Phasen | Prüfungsnähe ändert nichts am Verhalten | mittel |
| P9 | Kein Zugriff auf frühere/kommende Pakete; Abschluss-Schleife springt sofort weiter — „Wiederholung eines Videos als Einheit“ ist unmöglich | Kein Wiederholungspfad auf Einheitenebene | mittel |
| P10 | Fortschritt „Kurs gesamt“ existiert nur als „Video n/120“ (Katalog ohne Intro) | Kein Domain-/Objective-Fortschritt | niedrig–mittel |

Positiv (bleibt erhalten): signalbasierte Schritt-Erkennung, Tageswechsel-Robustheit, feste Kartendosis je Paket, FSRS als einzige Scheduling-Quelle, Daily-Quest-Abgrenzung, Offline-Fallback des Katalogs.

---

## 5. Zielbild des Lerneinheitensystems

1. **Lerneinheit** = benannte, abgeschlossene Einheit mit Typ, Inhaltsreferenzen, Status, Fortschritt, Begründung. Vier Typen:
   - `course` — 1 Kurs-Video + Abruf-Check + Karten-Dosis der Objective (= heutiges Paket; 120 Stück, feste Messer-Reihenfolge),
   - `review` — dynamische Wiederholungseinheit je Objective (fällige FSRS-Karten + falsch beantwortete Fragen + optional Video-Rewatch bei Recall-Verdict `review`),
   - `lab` — Lab-Einheit je Kategorie/Szenario (vorbereitende Karten → Szenario → Fehlerauswertung),
   - `exam` — Prüfungseinheit (gemischte Praxisfragen aus Root-Decks + PBQ-Deck, zeitbegrenzt; späte Lernphase).
2. Das Modul **„Aktuelles Paket“** bleibt bestehen und wird zur **Liste der Lerneinheiten**: aktive/empfohlene Einheit als große Kachel (heutige Tile wiederverwendet), darunter kompakte Zeilen (offene Wiederholungen, nächste Kurs-Einheiten, fällige Labs), Detailansicht pro Einheit. Der Plan wird hier realisiert, abgerufen und eingesehen.
3. **Inhaltsdefinition ist berechnet, nicht gespeichert**: Ein purer Builder erzeugt die Einheiten deterministisch aus Videokatalog + Decks + Fragen-Mapping + Lab-Index. **Nur Nutzerzustand wird persistiert** (neue Dexie-Tabelle, profilgetrennt, sync-fähig).
4. FSRS bleibt die einzige Wiederholungsmaschine für Karten; die Einheitenebene aggregiert nur.
5. Jede Empfehlung trägt eine maschinenlesbare Begründung (`reason`), deterministisch und testbar.

---

## 6. Struktur nach Professor Messer (primäre Reihenfolge)

- Primärsortierung = **Playlist-Index** (002–121). Domains/Objectives sind Metadaten der Einheit, keine Sortierquelle.
- Kapitel-Gruppierung für die Liste: **Objective-Code** (28 Gruppen) mit Domain-Überschrift (5 Blöcke) — beides aus `LocalVideoMeta` bzw. `SY0_701_OBJECTIVES` ableitbar, keine neuen Daten nötig.
- Video 001 (Intro): als optionale „Einstiegs-Einheit“ ohne Karten/Recall aufnehmen (`Zuordnung erforderlich`: Parser-Ausnahme) — oder bewusst weglassen. Empfehlung: weglassen (kein Prüfungsinhalt), im Plan dokumentiert.
- Objective ↔ Domain ↔ Deck: bereits 1:1 verdrahtet über `getSecurityObjectiveDeckId` — **wiederverwenden, nichts Neues erfinden**.

## 7. Abdeckung der CompTIA-SY0-701-Prüfungsziele (Kontrollfunktion)

Coverage-Matrix als pure Funktion `buildObjectiveCoverage()` (neu, Phase 1) über alle 28 Objectives:

| Signal | Quelle | Stand heute |
|---|---|---|
| Video(s) je Objective | Manifest-Parser | alle 28 Objectives haben ≥1 Video |
| Karten je Objective | Objective-Decks | 26/28 (fehlt: **4.2, 4.9**) |
| Abruf-Fragen je Video | Question-Map + Transkript-Fragen | 104 + 62 Videos; ~16 ohne Fragen |
| Lab je Objective | Lab-`objective`-Label (nach Normalisierung, §12) | 9 Kategorien decken Schwerpunkte ab; feinkörnige Lücken erst nach Normalisierung sichtbar |

Anzeige: kompakte Abdeckungszeile in der Detail-/Übersichtsansicht („Domain 4: 7/9 Objectives mit Karten“). Fehlende Inhalte werden als `Noch nicht vorhanden` markiert, fehlende Verknüpfungen als `Zuordnung erforderlich` — die App erfindet nichts.

**Offizielle Domain-Gewichtung** (CompTIA-Objectives-PDF, im Repo als Quelle registriert: `LAB_SOURCES['comptia-sy0-701-objectives']`): Domain 1 = 12 %, Domain 2 = 22 %, Domain 3 = 18 %, **Domain 4 = 28 %**, Domain 5 = 20 %. Die Gewichte fließen in (a) den Fragenmix der `exam`-Einheiten und (b) die Schwächen-Priorisierung der Vertiefungsphase ein (Fehlerquote × Prüfungsgewicht). Brisant: Ausgerechnet in der schwersten Domain 4 fehlen Karten für 4.2 und 4.9 vollständig, 4.4/4.7/4.8 sind dünn (4–5 Karten/Profil) — die Coverage-Matrix macht das sichtbar.

**Dauer-Metadaten (P7):** Vorschlag — das Manifest-Skript auf dem Pi um `durationSec` je Datei erweitern (`ffprobe` beim Generieren von `index.json`); Client-Fallback: Karten ≈ Ø `timeMs` aus `reviews` (vorhanden), Labs = `minutes` (vorhanden). Markierung: `Noch nicht vorhanden` (Server-Erweiterung nötig, klein).

---

## 8. Aufbau einer Lerneinheit

### 8.1 Typen und Zusammensetzung (nur vorhandene Inhalte)

| Typ | Schritte | Quelle der Inhalte | Größe |
|---|---|---|---|
| `course` (Standard) | Video → Abruf-Check → Karten-Dosis | wie heute (Manifest, RecallCheck, `buildTodayPackageSelection`) | „Normal“: ~25–45 min |
| `review` | fällige/falsche Karten der Objective → Kontrollfragen (Recall-Check-Wiederholung) → optional Video-Rewatch | FSRS-fällige Karten + `answerCorrect=false`/`rating≤2`-Historie + Recall-Verdict | „Kurz“: ~10–20 min |
| `lab` | 2–4 vorbereitende Karten → Szenario (kuratiert oder generiert) → Fehlerauswertung | labScenarios/labBlueprints + Objective-Deck | ~15–30 min (aus `minutes`) |
| `exam` | gemischte Praxisfragen (Root-Decks) + PBQ-Karten, zeitbegrenzt → Auswertung | Root-Deck-Fragen, `Acronym-Bonus (ABCD + PBQ)` | „Prüfung“: 30–60 min |

Nicht jede Einheit hat alle Schritte (z. B. Objective ohne Karten → nur Video+Recall, wie heute schon behandelt).

### 8.2 Größenlogik

- Dosis je `course`-Einheit bleibt `newCardsPerDay` (Settings-Regler, umbenannt in „Karten pro Lerneinheit“).
- `review`-Einheiten kappen bei ~15 Karten (Konstante, testbar); Überhang bleibt der Daily Quest.
- Eine neue Einstellung „gewünschte Lernzeit“ ist **nicht nötig** fürs MVP: Die drei vorhandenen Regler (Paket-Kontingent, studyCardLimit, recallCheckSize) steuern die Größe bereits. Optionale spätere Erweiterung: Ziel-Minuten pro Einheit, sobald Video-Dauern vorliegen (§7).

### 8.3 Statusmodell (einheitlich, abgeleitet)

`notStarted → inProgress → completed` + Querstatus `reviewDue` (Wiederholung erforderlich) und `passed` (bestanden).

- `course`: `completed` = alle Schritte (heutige Logik); `passed` = zusätzlich Recall-Verdict `understood`; `reviewDue` = Verdict `review` ODER ≥N fällige/falsche Karten der Objective.
- `lab`: `completed` = Szenario abgeschlossen; `passed` = fehlerfrei bzw. Score-Schwelle (Phase 4 präzisiert).
- Keine parallelen Statusanzeigen: Video-Konfidenz und Recall-Verdict bleiben als Detail-Signale sichtbar, der Einheiten-Status ist die einzige Listen-Wahrheit.

---

## 9. Darstellung im Modul „Aktuelles Paket“

### 9.1 Layout (mobile-first)

```
┌─ AKTUELLES PAKET ───────────────────────────┐
│ ▶ AKTUELLE LERNEINHEIT           (Hervorhebung)
│   „Zero Trust“ · Video 12/120 · Obj. 1.2
│   ○ Video ✓  ○ Abruf-Check  ○ 8 Karten
│   [ Fortsetzen ]                       ← eine Hauptaktion
├─────────────────────────────────────────────┤
│ Wiederholung fällig                          │
│   ↻ Obj. 1.1 Security Controls · 12 Karten  [Starten]
│ Als Nächstes (Messer-Reihenfolge)            │
│   13 · Physical Security        · offen     │
│   14 · Deception and Disruption · offen     │
│   🧪 Lab: Firewalls & Netzwerk   · empfohlen │
│ [ Alle Lerneinheiten anzeigen ]              │
└─────────────────────────────────────────────┘
```

- Große Kachel = bestehende `HomeTodayPackageTile` (wiederverwendet, umbenannte Texte).
- Darunter neue kompakte Liste (`HomeLearningUnitList`, neu): max. ~5 Zeilen (1 Wiederholung, 2–3 nächste Kurs-Einheiten, ggf. 1 Lab); Zeile = Titel, Status-Chip, Fortschritt, Dauer (sofern vorhanden), kontextuelle Hauptaktion (`Starten`/`Fortsetzen`/`Wiederholen`).
- „Alle Lerneinheiten anzeigen“ → Vollliste als MobileBottomSheet/eigene Ansicht: gruppiert nach Objective/Domain, abgeschlossene eingeklappt, mit `Details anzeigen` (Inhalte, Begründung, Abdeckung). Kein horizontaler Overflow; lange Titel truncaten (Patterns aus `DeckTitleMarquee`/bestehenden Tiles).
- Filter (nur mit Mehrwert): `Offen · Wiederholen · Abgeschlossen · Labs` als Chips in der Vollliste; Standardansicht braucht keine Filter.

### 9.2 Informationen pro Zeile (bewusst reduziert)

Direkt sichtbar: Titel, Playlist-Nr./Objective-Code, Status, Hauptaktion, (Dauer). In der Detailansicht: Domain, Lernziel (Videotitel + Objective-Titel), Kartenzahl, Fragenzahl, Lab-Verknüpfung, offene Wiederholungen, Begründung der Empfehlung, Abdeckungshinweise.

### 9.3 Aktionen

| Zustand | Hauptaktion | Verhalten |
|---|---|---|
| notStarted | Starten | setzt Einheit aktiv (persistiert), öffnet ersten Schritt |
| inProgress | Fortsetzen | öffnet exakt den offenen Schritt (Video-Index/Recall/verbleibende `activeCardIds` — Mechanik existiert) |
| reviewDue | Wiederholen | startet `review`-Einheit der Objective |
| completed/passed | Details anzeigen (sekundär: Wiederholen) | read-only Rückblick |

Erledigte Schritte erscheinen nie wieder als offen (Signal-Ableitung bleibt die Wahrheit). Manuelles Vorziehen einer späteren Kurs-Einheit ist erlaubt (Auswahl in der Vollliste); die aktive Einheit wird dadurch nicht gelöscht, sondern bleibt `inProgress`.

### 9.4 Begriffs-Umbenennung („… Paket“ → „Lerneinheit“)

| Stelle | heute | neu |
|---|---|---|
| Kachel-Label [HomeTodayPackageTile.tsx:14](card_pwa/src/components/home/HomeTodayPackageTile.tsx#L14) | „Aktuelles Paket“ | bleibt (Modulname) |
| ebd. `completedToday` | „Voriges geschafft · weiter mit diesem Paket“ | „… weiter mit dieser Lerneinheit“ |
| ebd. `loading` | „Lade Heute-Paket“ | „Lade Lerneinheit“ |
| ebd. Offline-Notice | „Heute-Paket offline nicht verfügbar …“ | „Lerneinheit offline nicht verfügbar …“ |
| [SettingsModal.tsx:1041](card_pwa/src/components/SettingsModal.tsx#L1041) | Sektion „Aktuelles Paket“, „Karten pro aktuellem Paket“ | Sektion bleibt; Regler „Karten pro Lerneinheit“ (+ aria-Label, Info-Text) |
| [i18n.ts:198](card_pwa/src/i18n.ts#L198) `study_stack_size_info` | „Das aktuelle Paket hat ein eigenes Kontingent.“ | „Die aktuelle Lerneinheit hat ein eigenes Kontingent.“ |
| EN-Varianten | „Current package“, „Today's package“ | „Current package“ (Modul) / „learning unit“ |
| [aiModeGuides.ts](card_pwa/src/data/aiModeGuides.ts), Test-Fixtures/-Namen | „Lernpaket“ | „Lerneinheit“ (nur Texte, keine IDs) |

**Nicht** umbenennen (Risiko ohne Nutzen): `STORAGE_KEYS.todayPackagePointer`, Datei-/Funktionsnamen `todayPackage*`, `data-testid="today-package-*"` (Tests hängen daran; interne Namen dürfen später mit eigenem Refactor nachziehen), DB-Felder, Sync-Payloads.

---

## 10. Priorisierungs- und Wiederholungslogik

### 10.1 Reihenfolge der Liste (deterministisch, pure Funktion `rankLearningUnits`)

1. aktive (`inProgress`) Einheit — immer Platz 1,
2. überfällige `review`-Einheiten (Objective mit ≥N fälligen Karten, älteste zuerst; N≈8, Konstante),
3. `reviewDue`-Kurs-Einheiten (Recall-Verdict `review` einer bereits abgeschlossenen Einheit),
4. nicht bestandenes/abgebrochenes Lab der zuletzt behandelten Kategorie,
5. nächste Kurs-Einheit in Messer-Reihenfolge (Standard-Empfehlung, wenn nichts ansteht),
6. Lab-Empfehlung nach Abschluss eines Objective-Blocks (alle Videos einer Objective `completed` → passendes Lab),
7. `exam`-Einheiten in Prüfungsphase (§13).

Anti-Überlastung: pro Tag höchstens 1 empfohlene `review`-Einheit vor der Kurs-Einheit (Rest bleibt sichtbar, aber unterhalb); dieselbe Karte erscheint innerhalb einer Einheit nie doppelt (Dosis-Mechanik vorhanden); FSRS verhindert Karten-Spam über Intervalle. Neue Themen werden nie vollständig blockiert: Zeile 5 ist immer erreichbar.

### 10.2 Wiederholung

**Kein neues SRS.** FSRS bleibt für Karten zuständig (fällige Karten sind das Signal). Einheitenebene ergänzt nur:
- Recall-Verdict `review`/`almost` → Kurs-Einheit bekommt `reviewDue` (Video-Rewatch + neuer Check),
- `answerCorrect=false` bzw. `rating≤2` seit letztem Einheiten-Abschluss → Karten landen priorisiert in der `review`-Einheit der Objective (Gewichtung existiert in `getCardWeight`),
- Lab nicht bestanden → Lab-Einheit erneut in Zeile 4.

---

## 11. Nutzung richtiger und falscher Antworten

Vorhanden und ausreichend: `cardId`, `rating`, `timeMs`, `timestamp`, `selectedAnswer`, `correctAnswer`, `answerCorrect` (lokal + Server). Karten ohne Auswahl (Flip/Free-Recall) liefern `rating` als Richtig/Falsch-Proxy (≥3 = richtig — gleiche Konvention wie Gamification/Coach).

Neu (Phase 3, reine Queries + pure Aggregation):
- `listWrongAnswerStats(deckIds, sinceMs)`: je Karte Fehlversuche, letzter Fehler, häufigster falscher Distraktor (aus `selectedAnswer`-Häufung),
- Aggregation je Objective/Domain: Erfolgsquote, offene Fehler → speist `review`-Einheiten, Coverage-Ansicht und Begründungen („3 Fragen zuletzt falsch — häufig verwechselt: ‚OCSP‘ ↔ ‚CRL‘“),
- Wieder-Einplanung: falsch beantwortete MC-Fragen erscheinen (a) sofort im FSRS-Kurzintervall (passiert schon) und (b) gebündelt in der nächsten `review`-Einheit; Kappe ~15 Karten/Einheit gegen Überlastung.

---

## 12. Verbesserungen der Labs (bewertet)

| Verbesserung | Lernnutzen | Aufwand | Risiko | Priorität |
|---|---|---|---|---|
| `objective`-Label normalisieren → maschinenlesbare Objective-Codes (`objectives: string[]`) je Szenario/Blueprint | hoch (Voraussetzung für Verknüpfung) | klein (Datenpflege + Test) | gering | **P1** |
| Lab-Fortschritt nach Dexie (profilgetrennt): `labAttempts` mit Szenario-ID, Schritt-Ergebnissen, Score, Dauer, abgeschlossen/bestanden | hoch | mittel | gering (additiv, localStorage-Migration einmalig) | **P1–P2** |
| Lab-Einheiten im Modul (Empfehlung nach Objective-Block, „nicht bestanden → erneut“) | hoch | mittel | gering | **P2** |
| Ergebnisübersicht nach dem Lab: falsche Zuordnungen/Schritte + Verlinkung Video/Karten der Objective | hoch | mittel | gering | **P2** |
| Vor dem Lab: Lernziel, Objective, Dauer (`minutes` vorhanden), 2–4 vorbereitende Karten | mittel | klein | gering | P3 |
| Pausieren/Wiederaufnahme innerhalb eines Szenarios (Schritt-Persistenz) | mittel | mittel | mittel (UI-Zustandsmaschine) | P3 |
| Versuchshistorie + Sync der Lab-Ergebnisse | mittel | mittel (neue Op-Typen) | mittel | P4 |
| Abgestufte Hinweise/Hilfen im Szenario | mittel | mittel | gering | P4 |

Kleine Labs bleiben Bestandteil normaler Einheiten (Schritt 3); umfangreiche/Experten-Szenarien werden eigene `lab`-Einheiten.

---

## 13. Prüfungsdatum und Lernphasen

Vorhanden: `examDateIso`, `computeExamDaysLeft`, `computeExamPacing` (Karten/Tag, Videos/Tag), Countdown in der Mobile-Topbar.

Phasenmodell (pure Funktion `resolveLearningPhase({daysLeft, courseProgress})`, fortschritts- UND zeitbasiert):

| Phase | Bedingung (ODER-verknüpft konservativ) | Schwerpunkt der Liste |
|---|---|---|
| Grundlagen | Kursfortschritt < 60 % und daysLeft > 21 | Kurs-Einheiten dominieren; Reviews nur bei Überfälligkeit |
| Vertiefung | Kursfortschritt ≥ 60 % oder daysLeft ≤ 21 | mehr `review`- und `lab`-Einheiten; schwächste Domain zuerst |
| Prüfung | daysLeft ≤ 10 | `exam`-Einheiten (Root-Deck-Fragen + PBQ, zeitbegrenzt, Fragenmix nach Domain-Gewichtung 12/22/18/28/20 %), Fehleranalyse, Domain-Mix |
| Abschluss | daysLeft ≤ 3 | nur kurze Reviews + häufige Fehler; keine neuen großen Themen (Kurs-Einheiten bleiben wählbar, werden aber nicht mehr empfohlen) |

Verschobenes Datum: Phase wird rein aus den aktuellen Werten abgeleitet — kein gespeicherter Phasen-Zustand, nichts zu migrieren. Pacing-Warnung: wenn `videosPerDay` > ~4, Hinweis in der Liste („Tempo reicht nicht — Prüfungstermin prüfen“), keine automatische Aufblähung der Einheiten.

---

## 14. Offline- und Synchronisationskonzept

- **Einheiten-Definitionen**: vollständig offline (statischer Code + Katalog-Cache + Dexie-Decks). Videokatalog-Fallback existiert; Videos einzeln offline ladbar (Dexie-Blobs); fehlende Offline-Videos werden in der Detailansicht markiert (Download-Status vorhanden in `videoDownloads`).
- **Nutzerzustand** (`learningUnitState`, `labAttempts`): Dexie, Compound-Key `[profileId+unitId]` — Muster identisch zu `videoNotes2` (bewährt inkl. Profil-Trennung).
- **Sync**: Phase 7 — neue Op-Typen `unit.progress` / `lab.attempt` analog `videoNotes`-Sync (Last-Write-Wins auf `updatedAt` je `[profileId+unitId]`; Konflikte sind arm, weil Signale additiv sind). Bis dahin gilt dokumentiert: Einheiten-Status ist gerätelokal — exakt wie heute der Pointer, also keine Regression.
- Migration der localStorage-Signale (Video-watched, Recall-Scores) in Dexie ist **bewusst NICHT Teil des MVP** (funktioniert, wird von VideosView breit genutzt); Kandidat für Phase 7.
- Offline darf nie „abgeschlossen“ vortäuschen: Ableitung nutzt nur lokal vorhandene Signale; fehlt der Katalog, zeigt die Liste den bestehenden Offline-Hinweis statt leerer „alles fertig“-Zustände (Logik existiert: `offlineNoData`).

---

## 15. Vorgeschlagenes Datenmodell

```typescript
// utils/learningUnits.ts (neu, pure) — Definition wird BERECHNET, nie gespeichert
export type LearningUnitKind = 'course' | 'review' | 'lab' | 'exam'
export type LearningUnitStatus = 'notStarted' | 'inProgress' | 'reviewDue' | 'completed' | 'passed'

export interface LearningUnitDefinition {
  id: string                    // 'unit:course:012' | 'unit:review:1.2' | 'unit:lab:firewalls' | 'unit:exam:1'
  kind: LearningUnitKind
  order: number                 // Playlist-Index bzw. Einsortierung durch rankLearningUnits
  title: string                 // Videotitel / '1.2 Security Concepts – Wiederholung' / Lab-Titel
  objective: string | null      // '1.2' — Join-Key zu Deck/Video/Notizen
  domain: number | null         // 1–5
  videoIndexes: number[]        // [] bei review/exam ohne Video
  deckId: string | null         // Objective-Deck (getSecurityObjectiveDeckId)
  labScenarioIds: string[]
  estimatedMinutes: number | null   // Labs: minutes; Videos: null bis §7 umgesetzt
  cardCount: number             // geplante Dosis / Review-Umfang
  questionCount: number         // verfügbare Abruf-Fragen
}

// db/index.ts v22 (neu) — NUR Nutzerzustand, profilgetrennt
export interface LearningUnitStateRecord {
  profileId: string             // 'local' | userId (wie videoNotes2)
  unitId: string
  startedAt: number
  lastActivityAt: number
  completedAt: number | null
  passedAt: number | null
  currentStep: 'video' | 'recall' | 'cards' | 'lab' | 'done'
  activeCardIds: string[] | null    // feste Dosis (ersetzt Pointer-Feld)
  activeCardLimit: number | null
  attempts: number
  updatedAt: number
}
// Dexie: learningUnitState: '[profileId+unitId], profileId, updatedAt'
```

Abgrenzung Inhaltsdefinition ↔ Nutzerzustand ist damit strukturell erzwungen (Definition hat keinen Speicherort). Referenzen statt Kopien: nur IDs (`unitId`, `deckId`, `cardIds`, `videoIndexes`, `labScenarioIds`). Versionierung: `unitId` ist stabil aus Katalog ableitbar; ändert sich der Katalog (neues Video), entstehen neue IDs, alte States bleiben harmlos liegen.

---

## 16. Betroffene Dateien und Komponenten

| Datei | Änderung |
|---|---|
| `utils/learningUnits.ts` **neu** | Builder, Ranking, Status-Ableitung, Phasenmodell, Coverage (pure, testbar) |
| `hooks/home/useLearningUnits.ts` **neu** | ersetzt/umschließt `useTodayPackage` (dessen Signal-Ableitung wird als Funktion extrahiert und wiederverwendet) |
| `components/home/HomeLearningUnitList.tsx` **neu** | kompakte Liste unter der Kachel |
| `components/home/LearningUnitSheet.tsx` **neu** | Vollliste + Detailansicht (MobileBottomSheet-Muster) |
| `HomeTodayPackageTile.tsx` | Texte (§9.4), Props unverändert |
| `HomeView.tsx` | `today`-Slide rendert Kachel + Liste (Andockstelle Z. 222); Wiring der Aktionen (`onOpenVideoAtIndex`, `onStartStudy`, `onOpenLabs` existieren) |
| `db/index.ts` | v22: `learningUnitState` (+ v23: `labAttempts`, Phase 4) |
| `db/queries/learningUnits.ts` **neu** | get/put State, Pointer-Migration |
| `db/queries/reviews.ts` | `listWrongAnswerStats` (additiv) |
| `data/labScenarios.ts` / `labBlueprints.ts` | `objectives: string[]` normalisiert (Datenpflege) |
| `SettingsModal.tsx`, `i18n.ts`, `aiModeGuides.ts` | Begriffs-Umbenennung |
| Sync-Server (Phase 7) | neue Op-Typen + Tabelle `server_learning_units` (analog video_notes) |
| Tests | siehe §18 |

Wiederverwendet ohne Änderung: `buildTodayPackageSelection`, `pickDailyQuestCards` (Ausschluss-Mechanik), FSRS/SM2, RecallCheck, VideosView-Sprungziel (`initialVideoIndex`), Session-Resume, `securityDeckHierarchy`, `computeExamPacing`, `useDayStartMs`.

## 17. Notwendige Migrationen

| Migration | Art | Risiko |
|---|---|---|
| Dexie v22 `learningUnitState` | additiv (neue Tabelle) | gering |
| Einmalig: `TodayPackagePointer` → `learningUnitState['local'\|userId, 'unit:course:{activeIndex}']`; `lastCompletedIndex` → completed-States für Indizes ≤ n | Lese-Migration beim ersten Hook-Lauf; Pointer bleibt danach als Fallback unangetastet (Rollback möglich) | gering |
| Dexie v23 `labAttempts` + Import `labsCompleted`-Set als Alt-Versuche | additiv | gering |
| Keine Migration: DB-Felder, Sync-Payloads, Storage-Keys, Testids | — | — |

## 18. Teststrategie

- **Unit** (`__tests__/utils/learning-units.test.ts` u. a.): Builder-Determinismus, Ranking-Prioritäten (jede Regel einzeln + Kombinationen), Status-Ableitung je Typ, Phasenwechsel (Datum/Fortschritt/verschobener Termin), Coverage-Matrix (4.2/4.9 als bekannter Fail-Fixture), Dosis-Kappen, `listWrongAnswerStats`-Aggregation, Pointer-Migration (fake-indexeddb, Muster vorhanden).
- **Komponenten**: Liste (leer/laden/offline/Fehler), Hervorhebung der aktiven Einheit, Aktions-Label je Status, Filter, lange Titel/Überlauf; bestehende `home-exam-countdown`/`home-daily-quest-tile`-Tests als Vorlage.
- **Integration**: Fortsetzen öffnet exakten Schritt; Review-Einheit enthält nur falsch/fällige Karten; Daily-Quest-Ausschluss weiter intakt (bestehender Test erweitern); Profilwechsel trennt States; Tageswechsel löscht keine Einheit.
- **E2E** (`/run-card-pwa`-Driver, Karten-Seeding-Memo beachten): Einheit starten → Video-Schritt → Recall → Karten (inkl. falscher MC-Antwort) → App-Reload → Fortsetzen an gleicher Stelle → Abschluss → Liste rückt vor + Review-Einheit erscheint.
- Bestehende Suites (`today-package`, `home-view-shell`, `use-home-view-controller`, `study-card-ordering`) bleiben grün — Pointer-Logik wird erst entfernt, wenn die neuen Tests sie vollständig abdecken.

## 19. Umsetzungsphasen

| Phase | Inhalt | Ergebnis (einzeln shippbar) |
|---|---|---|
| **1. Modell + Liste (MVP)** | `learningUnits.ts` (nur `course`-Einheiten), Coverage-Funktion, `HomeLearningUnitList` (read-only: aktiv + nächste + „alle anzeigen“), Begriffs-Umbenennung §9.4 | Modul zeigt Lerneinheiten-Liste; Verhalten sonst identisch |
| **2. Persistenz** | Dexie v22, Pointer-Migration, Profiltrennung, Fortsetzen/Starten/manuelle Auswahl über State | Fortschritt profilfest; Einheiten frei wählbar |
| **3. Review-Einheiten + Erklärbarkeit** | `listWrongAnswerStats`, `review`-Typ, Ranking-Zeilen 2–3, `reason`-Anzeige | gezielte Wiederholung aus Fehlern/FSRS |
| **4. Labs** | Objective-Normalisierung, `labAttempts` (v23), `lab`-Einheiten, Ergebnisübersicht + Verlinkung | Labs im Lernpfad |
| **5. Prüfungsphase** | Phasenmodell, `exam`-Einheiten (Root-Decks + PBQ, Timer), Pacing-Warnung | prüfungsnahe Vorbereitung |
| **6. Feinschliff** | Video-Dauern (Manifest), Dauer-Anzeigen, Filter/Gruppierung Vollliste, A11y/Mobile-Polish | runde UX |
| **7. Sync (optional)** | Op-Typen `unit.progress`/`lab.attempt`, Servertabelle, LWW-Konfliktregel; ggf. Video-Progress/Recall-Scores nach Dexie | Gerätewechsel ohne Verlust |

Jede Phase: Build + `npm test` + Driver-Screenshot (kein `check:safe-area`-Routinelauf, siehe Memory).

## 20. Aufwand, Risiken und Abhängigkeiten

| Phase | Aufwand (grob) | Hauptrisiko | Gegenmaßnahme |
|---|---|---|---|
| 1 | 1–2 Tage | Regression der Kachel-Logik | Tile-Props unverändert; bestehende Tests |
| 2 | 1–2 Tage | Pointer-Migration falsch → Fortschritt „springt“ | Pointer bleibt als Fallback; Migration idempotent + getestet |
| 3 | 1–2 Tage | Review-Spam / Blockade neuer Themen | Kappen + Ranking-Tests; Zeile 5 immer erreichbar |
| 4 | 2–3 Tage | Objective-Normalisierung inhaltlich falsch | Datenpflege mit Review-Tabelle im PR; Coverage-Test |
| 5 | 1 Tag | Phasen-Fehlklassifikation | pure Funktion, Tabellen-Tests |
| 6 | 1 Tag | Server-Skript (ffprobe) | optional, Fallback ohne Dauer |
| 7 | 2–3 Tage | Sync-Konflikte | LWW wie videoNotes; additive Ops |

Abhängigkeiten: 2→1, 3→2, 4→(2, Normalisierung), 5→3, 7→2/4. Phase 6 unabhängig. Bekannte Datenrisiken: dünne Antwort-Historie anfangs (Review-Einheiten stützen sich dann auf FSRS-Fälligkeit — funktioniert ab Tag 1), 4.2/4.9 ohne Karten (Coverage zeigt es transparent an, statt es zu verstecken).

## 21. Empfehlung: schrittweise oder vollständig?

**Schrittweise (Phasen 1–3 als Kernpaket), klar empfohlen.** Begründung: (a) das bestehende Heute-Paket ist stabil und signalbasiert — es wird erweitert, nicht ersetzt; (b) jede Phase ist einzeln testbar und shippbar; (c) die einzige Migration (Pointer→Dexie) bleibt klein und reversibel; (d) Fehler lassen sich pro Phase eingrenzen. Eine Big-Bang-Umsetzung würde UI, Persistenz, Labs und Sync gleichzeitig anfassen — höchstes Risiko bei null Zusatznutzen.

**Architekturentscheidung:** berechnete Einheiten-Definitionen (pure Builder) + persistierter Nutzerzustand in Dexie (profilgetrennt, `[profileId+unitId]`), FSRS unangetastet, Messer-Playlist-Index als primäre Ordnung, Objective-Code als universeller Join-Key. Wiederverwendet werden: TodayPackage-Signal-Ableitung, Kartendosis-Auswahl, RecallCheck, Objective-Deck-Hierarchie, Lab-Inventar, Session-Resume, Exam-Pacing. Ersetzt wird nur die localStorage-Pointer-Persistenz (durch Dexie-State) und die Einzelkachel-Darstellung (durch Kachel + Liste).

**Größter Lernnutzen je Aufwand:** Phase 3 (Fehler-/FSRS-getriebene Review-Einheiten mit Begründung), direkt danach Phase 4 (Labs im Pfad) und Phase 5 (Prüfungsphase).

## 22. Konkrete nächste Arbeitsschritte (Reihenfolge)

1. `utils/learningUnits.ts` + Tests: `buildCourseUnits`, `computeUnitStatus`, `rankLearningUnits`, `buildObjectiveCoverage` (nur `course`).
2. Signal-Ableitung aus `useTodayPackage.computeSteps` in eine pure, wiederverwendbare Funktion extrahieren (Verhalten durch bestehende Tests fixiert).
3. `HomeLearningUnitList` + Einbindung in den `today`-Slide; Vollliste als Sheet; Begriffs-Umbenennung (§9.4) inkl. i18n/EN.
4. Dexie v22 `learningUnitState` + Pointer-Migration + `useLearningUnits`-Hook; Aktionen Starten/Fortsetzen/andere Einheit wählen.
5. `listWrongAnswerStats` + `review`-Einheiten + `reason`-Chip.
6. Lab-Objective-Normalisierung (Datenpflege-PR) → `lab`-Einheiten + `labAttempts`.
7. Phasenmodell + `exam`-Einheiten; danach Feinschliff/Dauern; zuletzt optional Sync.

---

## 23. Technische Spezifikation für die KI-Umsetzung (Phasen 1–3, verbindlich)

Dieser Abschnitt macht den Plan ohne Rückfragen umsetzbar: exakte Verträge, Integrationspunkte und Abnahmekriterien. Bei Widerspruch zwischen §23 und älteren Abschnitten gilt §23.

### 23.0 Verbindliche Arbeitsregeln

1. **Verb-Vertrag aus `card_pwa/CLAUDE.md` einhalten**: `build*`/`compute*` = pur ohne I/O, `list*`/`get*` = Dexie, `read*`/`persist*` = localStorage, `fetch*` = Netz. Deshalb heißt die Status-Ableitung `computeUnitStatus` (nicht `deriveUnitStatus`).
2. `utils/learningUnits.ts` importiert **nie** aus `db/`, `hooks/` oder `services/` — nur Typen und pure Helfer (`localVideoManifest`, `securityDeckHierarchy`, `todayPackage`-Typen). Kein `Date.now()` in puren Funktionen; Zeit kommt als Parameter.
3. Keine Umbenennung von `STORAGE_KEYS`, `data-testid="today-package-*"`, Datei-/Funktionsnamen `todayPackage*`, DB-Feldern, Sync-Payloads (§9.4). Neue Listen-Elemente bekommen das Präfix `data-testid="learning-unit-*"`.
4. FSRS/`recordReview` unangetastet; Recall-Check bleibt non-scheduling.
5. Keine neuen npm-Dependencies. Animationen nur aus `src/ui/motion`.
6. Alle sichtbaren Texte in Deutsch **und** Englisch (COPY-Objekte bzw. `i18n.ts`).
7. Verifikation je Phase: `cd card_pwa && npm run build && npm test`; UI-Nachweis per `/run-card-pwa`-Driver-Screenshot des Home-Screens. Kein `check:safe-area`-Routinelauf.
8. Zuerst lesen (Pflichtlektüre vor der ersten Codezeile): [useTodayPackage.ts](card_pwa/src/hooks/home/useTodayPackage.ts) (komplett), [todayPackage.ts](card_pwa/src/utils/todayPackage.ts), [studyCardOrdering.ts](card_pwa/src/services/studyCardOrdering.ts) (`buildTodayPackageSelection`), [db/queries/decks.ts:257](card_pwa/src/db/queries/decks.ts#L257) (`pickDailyQuestCards` + `excludeCardIds`), [securityDeckHierarchy.ts](card_pwa/src/utils/securityDeckHierarchy.ts), [localVideoManifest.ts](card_pwa/src/utils/localVideoManifest.ts), [HomeTodayPackageTile.tsx](card_pwa/src/components/home/HomeTodayPackageTile.tsx), [HomeView.tsx:222-235](card_pwa/src/components/HomeView.tsx#L222-L235) (Kachel-Wiring), [db/index.ts](card_pwa/src/db/index.ts) (v18-Block `videoNotes2` als Muster), [db/queries/videoNotes.ts](card_pwa/src/db/queries/videoNotes.ts) (Query-Verben), [today-package.test.ts](card_pwa/src/__tests__/utils/today-package.test.ts), [home-view-shell.test.tsx](card_pwa/src/__tests__/integration/home-view-shell.test.tsx).

### 23.1 Phase 1 — exakte Verträge

**(a) Extraktion der Schritt-Ableitung** (additiv in `utils/todayPackage.ts`; die async-Closure `computeSteps` in [useTodayPackage.ts:177-232](card_pwa/src/hooks/home/useTodayPackage.ts#L177-L232) ruft künftig diese pure Funktion):

```typescript
export interface PackageStepInputs {
  videoWatchedSinceStart: boolean   // progressEntry?.watched === true && updatedAt >= activeStartedAt
  recallDoneSinceStart: boolean     // hasRecallRunSince(recallScores[videoScoreKey(index)], activeStartedAt)
  deckCardIds: string[]             // listDeckCards(deckId) → ids
  reviewedCardIds: string[]         // listDeckCardIdsReviewedSince(deckId, activeStartedAt)
  storedCardIds: string[] | null    // pointer.activeCardIds
  fallbackSelectionIds: string[]    // buildTodayPackageSelection(...)-Ergebnis, wenn storedCardIds null
}
export interface PackageStepState {
  steps: { video: boolean; recall: boolean; cards: boolean }
  activeCardIds: string[]           // stored ?? fallback, gefiltert auf deckCardIds
  remainingCardIds: string[]        // activeCardIds ohne reviewedCardIds
}
export function computePackageStepState(input: PackageStepInputs): PackageStepState
```

Semantik 1:1 wie heute: `steps.video = videoWatchedSinceStart || recallDoneSinceStart`; `steps.recall = recallDoneSinceStart`; `steps.cards = activeCardIds.length === 0 || remainingCardIds.length === 0`. Alle I/O-Aufrufe (Dexie-Queries, localStorage-Reads, Selection) bleiben im Hook. Bestehende `today-package`-Tests bleiben **unverändert** grün.

**(b) `utils/learningUnits.ts`** (neu, pur):

```typescript
export type LearningUnitKind = 'course' | 'review' | 'lab' | 'exam'
export type LearningUnitStatus = 'notStarted' | 'inProgress' | 'reviewDue' | 'completed' | 'passed'
export type LearningUnitReason =
  | 'active' | 'next-in-course' | 'review-overdue' | 'recall-review'
  | 'lab-retry' | 'lab-after-block' | 'exam-phase'

export const REVIEW_DUE_CARD_THRESHOLD = 8   // §10.1, N
export const REVIEW_UNIT_CARD_CAP = 15       // §8.2
export const MAX_RECOMMENDED_REVIEWS = 1     // §10.1 Anti-Überlastung

export interface LearningUnitDefinition { /* exakt §15 */ }

export function buildCourseUnits(input: {
  catalog: LocalVideoMeta[]                          // buildLocalVideoManifest-Ausgabe
  cardCountByDeckId: ReadonlyMap<string, number>
  questionCountByVideoIndex: ReadonlyMap<number, number>
  packageCardLimit: number                           // 0 = unbegrenzt
}): LearningUnitDefinition[]
// unitId = `unit:course:${videoScoreKey(video.index)}`; order = video.index;
// objective/domain aus LocalVideoMeta; deckId = getSecurityObjectiveDeckId(objective);
// cardCount = limit > 0 ? min(limit, deckCount) : deckCount; questionCount aus Map (0, wenn fehlt).

export interface CourseUnitSignals {
  activeIndex: number          // pointer.activeIndex (0 = keine aktive Einheit)
  lastCompletedIndex: number   // pointer.lastCompletedIndex
  recallVerdictByVideoKey: Readonly<Record<string, 'understood' | 'almost' | 'review' | null>>
  dueOrWrongCountByObjective: ReadonlyMap<string, number>  // Phase 1: leere Map
}
export function computeUnitStatus(unit: LearningUnitDefinition, signals: CourseUnitSignals): LearningUnitStatus
// course-Regeln, in dieser Reihenfolge:
// 1. videoIndexes[0] === activeIndex → 'inProgress'
// 2. videoIndexes[0] <= lastCompletedIndex →
//    a) Verdict 'review' ODER dueOrWrong >= REVIEW_DUE_CARD_THRESHOLD → 'reviewDue'
//    b) Verdict 'understood' → 'passed'   c) sonst 'completed'
// 3. sonst 'notStarted'

export interface RankedLearningUnit {
  unit: LearningUnitDefinition
  status: LearningUnitStatus
  reason: LearningUnitReason
}
export function rankLearningUnits(
  units: LearningUnitDefinition[],
  statusById: ReadonlyMap<string, LearningUnitStatus>,
): RankedLearningUnit[]
// Phase 1: [inProgress ('active')] + nächste 'notStarted' in order-Reihenfolge ('next-in-course', max 3).
// Phase 3 fügt davor ein: max MAX_RECOMMENDED_REVIEWS 'review'-Einheiten ('review-overdue'),
// dann 'reviewDue'-Kurs-Einheiten ('recall-review') — Reihenfolge §10.1. Deterministisch, kein Zufall.

export interface ObjectiveCoverage {
  objective: string; domain: number
  videoCount: number; cardCount: number; questionCount: number; labCount: number
}
export function buildObjectiveCoverage(input: {
  catalog: LocalVideoMeta[]
  cardCountByDeckId: ReadonlyMap<string, number>
  questionCountByVideoIndex: ReadonlyMap<number, number>
  labObjectivesByCategory?: ReadonlyMap<string, string[]>  // erst ab Phase 4 gefüllt
}): ObjectiveCoverage[]
// Exakt 28 Zeilen in SY0_701_OBJECTIVES-Reihenfolge; 4.2/4.9 liefern cardCount 0 (Test-Fixture).
```

**(c) Datenfluss Phase 1 (read-only, keine neue Persistenz):** `useTodayPackage` wird **additiv** um zwei Felder erweitert: `catalog: LocalVideoMeta[]` und `lastCompletedIndex: number` (beide liegen im Hook bereits vor). Das Home-Wiring baut daraus mit den puren Funktionen die Listen-Zeilen; Kartenzahlen je Deck kommen aus einer kleinen zusätzlichen Query (`listDeckCardCounts(deckIds)` in `db/queries/decks.ts`, additiv), Fragenzahlen aus `MESSER_VIDEO_BY_QUESTION_ID`-Umkehrung + `MESSER_TRANSCRIPT_QUESTIONS` (pure Helper in `learningUnits.ts`). Kein zweiter Katalog-Load, kein zweiter Pointer-Leser.

**(d) UI-Verträge:**

```typescript
// components/home/HomeLearningUnitList.tsx (neu)
interface Props {
  language: 'de' | 'en'
  rows: RankedLearningUnit[]                 // bereits gerankt; Komponente kappt bei 5
  onOpenVideoAtIndex: (videoIndex: number, openRecall: boolean) => void
  onStartCards: (deck: Deck) => void
  onShowAll: () => void
}
// components/home/LearningUnitSheet.tsx (neu) — nutzt bestehendes MobileBottomSheet.tsx;
// Vollliste gruppiert nach Domain → Objective, abgeschlossene eingeklappt.
```

Einbindung: [HomeView.tsx:222](card_pwa/src/components/HomeView.tsx#L222) rendert `HomeTodayPackageTile`; die Liste kommt direkt darunter in denselben Slide. Handler wiederverwenden: `onOpenVideoAtIndex` (HomeView-Prop, Z. 64) und `onStartStudy(deck, remainingCardIds)` (Muster Z. 233). Tile-Props bleiben unverändert.

**(e) Tests Phase 1:** `__tests__/utils/learning-units.test.ts` (Builder-Determinismus, Status-Matrix je Regel, Ranking, Coverage mit 4.2/4.9-Fixture), `__tests__/utils/today-package.test.ts` (additiv: `computePackageStepState`-Fälle), `__tests__/components/home-learning-unit-list.test.tsx` (leer/aktiv-hervorgehoben/Aktions-Label je Status). Bestehende Suites unverändert grün.

### 23.2 Phase 2 — exakte Verträge

**Dexie v22** (Muster: v18-Block `videoNotes2`, [db/index.ts:474-513](card_pwa/src/db/index.ts#L474)):

```typescript
// db/index.ts — Interface LearningUnitStateRecord exakt wie §15, plus:
this.version(22).stores({
  learningUnitState: '[profileId+unitId], profileId, updatedAt',
})
// Tabellen-Property: learningUnitState!: Table<LearningUnitStateRecord, [string, string]>
```

**Profil-Scope:** `profileId = profileScopeId(profile)` aus [services/profileService.ts:105](card_pwa/src/services/profileService.ts#L105) — identisch zum `videoNotes2`-Aufrufmuster in VideosView. Nie selbst 'local'/userId ableiten.

**`db/queries/learningUnits.ts`** (Verben wie `videoNotes.ts`: `get*`/`list*`/`save*`):

```typescript
export async function getLearningUnitState(profileId: string, unitId: string): Promise<LearningUnitStateRecord | null>
export async function listLearningUnitStates(profileId: string): Promise<LearningUnitStateRecord[]>
export async function saveLearningUnitState(record: LearningUnitStateRecord): Promise<void>  // put, updatedAt setzt der Aufrufer
```

**Pointer-Migration** (einmalig beim ersten `useLearningUnits`-Lauf je Profil, idempotent):

```
1. states = listLearningUnitStates(profileId); wenn states.length > 0 → fertig (Idempotenz-Anker).
2. pointer = readTodayPackagePointer(); wenn lastCompletedIndex === 0 UND activeIndex === 0 → fertig.
3. Für jede course-Unit mit videoIndexes[0] <= lastCompletedIndex:
   save({ profileId, unitId, startedAt: lastCompletedAt, lastActivityAt: lastCompletedAt,
          completedAt: lastCompletedAt, passedAt: null, currentStep: 'done',
          activeCardIds: null, activeCardLimit: null, attempts: 1, updatedAt: Date.now() })
4. Wenn activeIndex > 0: save({ …unitId für activeIndex, startedAt: activeStartedAt,
   completedAt: null, currentStep aus Schritt-Signalen, activeCardIds: pointer.activeCardIds,
   activeCardLimit: pointer.activeCardLimit, … })
5. Pointer NICHT löschen. Phase 2 schreibt dual (Pointer + Dexie-State); gelesen wird bevorzugt
   der Dexie-State. Der Pointer-Pfad wird erst entfernt, wenn die neuen Tests ihn vollständig abdecken.
```

**Tests Phase 2:** fake-indexeddb (Muster vorhanden): Migration idempotent (2× ausführen → gleiche States), Profilwechsel trennt (`profileId`-Filter), „Fortsetzen“ öffnet exakten Schritt (currentStep + remainingCardIds), Tageswechsel löscht nichts.

### 23.3 Phase 3 — exakte Verträge

```typescript
// db/queries/reviews.ts (additiv)
export interface WrongAnswerStat {
  cardId: string
  wrongCount: number
  lastWrongAt: number
  topSelectedAnswer: string | null   // häufigster falscher Distraktor; null ohne selectedAnswer
}
export async function listWrongAnswerStats(deckIds: string[], sinceMs: number): Promise<WrongAnswerStat[]>
// „falsch“ = answerCorrect === false ODER (answerCorrect === undefined && rating <= 2)
// (gleiche Richtig/Falsch-Konvention wie Gamification/Coach, §11)
```

`buildReviewUnits` (pur, in `learningUnits.ts`): je Objective mit `dueCardIds.length + wrongStats.length > 0` eine Unit `unit:review:{objective}`; Karten = fällige zuerst, dann falsche nach `lastWrongAt` absteigend, dedupliziert, Kappe `REVIEW_UNIT_CARD_CAP`. Fällige Karten kommen aus der bestehenden Due-Logik in `db/queries/cards.ts` (beim Umsetzen die vorhandene Query wiederverwenden, keine neue Fälligkeitsdefinition erfinden). `reason`-Chip-Texte (de/en) als COPY-Konstante neben der Liste; deterministisch aus `LearningUnitReason` gemappt, kein Freitext.

### 23.4 Kanten-Semantik (verbindlich, deckt die offenen Randfälle ab)

1. **Mehrere `inProgress`-Einheiten** (ab Phase 2 durch manuelle Wahl möglich): Die große Kachel zeigt die Einheit mit dem **höchsten `lastActivityAt`** unter allen `inProgress`-States des Profils. Die Messer-Sequenz-Einheit bleibt zusätzlich in der Liste sichtbar (reason `active` bzw. `next-in-course`).
2. **Pointer-Dual-Write-Regel**: Der localStorage-Pointer verfolgt **ausschließlich die Messer-Sequenz** (exakt wie heute). Manuell vorgezogene Einheiten existieren nur als Dexie-State und berühren den Pointer nie — der Rollback-Fallback bleibt dadurch jederzeit konsistent.
3. **Daily-Quest-Ausschluss** (ab Phase 2): `excludeCardIds` = Vereinigung der `activeCardIds` **aller** `inProgress`-Einheiten des Profils (heute: nur Pointer-`activeCardIds`, [HomeView.tsx:181-206](card_pwa/src/components/HomeView.tsx#L181-L206)). Der bestehende Ausschluss-Test wird auf die Vereinigung erweitert.
4. **`completedToday`** (ab Phase 2): abgeleitet als `max(completedAt aller States) >= todayStartMs`; bis dahin weiter aus `pointer.lastCompletedAt`.
5. **Kursende** (alle Kurs-Videos abgeschlossen, `pickTodayVideo` → null): Kachel behält den bestehenden `courseDone`-Zustand; `rankLearningUnits` liefert keine `next-in-course`-Zeile mehr, die Liste zeigt nur noch `review`-/`lab`-/`exam`-Einheiten.
6. **Karten-Dedup über Einheiten hinweg**: Eine Karte aus den `activeCardIds` einer `inProgress`-`course`-Einheit darf nicht zusätzlich in eine `review`-Einheit aufgenommen werden — `buildReviewUnits` erhält dafür `excludeCardIds` (dieselbe Vereinigung wie Punkt 3). Innerhalb einer Einheit sind Karten ohnehin eindeutig.
7. **Katalog-Änderungen**: `unitId`s sind aus dem Katalog abgeleitet; verschwindet ein Video (Datei umbenannt/gelöscht), bleiben verwaiste States harmlos liegen (§15) und werden nirgends angezeigt. Kein Aufräum-Job nötig.

### 23.5 Phase 4 + 5 — Verträge (Kurzform)

**Phase 4 (Labs):**

- Datenpflege `labScenarios.ts`/`labBlueprints.ts`: neues Feld `objectives: string[]`; jeder Eintrag muss `/^[1-5]\.[1-9]$/` matchen und in `SY0_701_OBJECTIVES` existieren (Test erzwingt beides). Bereichsangaben im Freitext-`objective` („4.3–4.5“) werden beim Normalisieren zu Einzel-Codes expandiert. Das Freitext-Feld bleibt unverändert (UI nutzt es weiter).
- Dexie v23: `labAttempts: '++id, [profileId+scenarioId], profileId, finishedAt'` mit Feldern `{ id?, profileId, scenarioId, startedAt, finishedAt, stepResults: Array<{ stepId: string; correct: boolean }>, score: number /* 0–1 */, passed: boolean, durationMs: number, importedLegacy?: true }`. Einmaliger Import des `labsCompleted`-Sets: je Eintrag ein Versuch mit `passed: true, score: 1, stepResults: [], importedLegacy: true` (Idempotenz-Anker: bereits vorhandene `importedLegacy`-Versuche des Profils).
- `buildLabUnits` (pur): je Kategorie eine Unit `unit:lab:{categoryId}`; empfohlen (reason `lab-after-block`), wenn alle `course`-Einheiten eines der `objectives` der Kategorie `completed`/`passed` sind; erneut empfohlen (reason `lab-retry`), wenn der letzte Versuch `passed === false`. `passed`-Schwelle: `score >= 0.8` (Konstante `LAB_PASS_SCORE`).

**Phase 5 (Prüfungsphase):**

```typescript
export type LearningPhase = 'foundation' | 'deepening' | 'exam' | 'final'
export function resolveLearningPhase(input: {
  daysLeft: number | null        // computeExamDaysLeft(examDateIso); null = kein Termin
  courseProgress: number         // abgeschlossene / alle course-Einheiten, 0–1
}): LearningPhase
// null-Termin → 'foundation' bei < 0.6, sonst 'deepening'. Mit Termin: Tabelle §13.
```

- `buildExamUnits` (pur): Fragenmix nach Domain-Gewichten `[0.12, 0.22, 0.18, 0.28, 0.20]`, deterministisch gerundet (Largest-Remainder-Verfahren, damit die Summe exakt der Zielgröße entspricht). Quellen: Root-Deck-Karten (Deck-Namen `/^0[1-5]_/`) + PBQ-Karten (Karten des Acronym-Bonus-Decks, die der PBQ-Parser [utils/pbqScoring.ts](card_pwa/src/utils/pbqScoring.ts) als PBQ erkennt — Erkennung über den Parser, nie über Kartentext-Heuristik). Zeitlimit: `EXAM_SECONDS_PER_QUESTION = 60` (offizielles Verhältnis 90 Fragen/90 min), Einheit mit K Fragen → K·60 s.
- Schwächen-Priorisierung (Vertiefungsphase): `fehlerquote(domain) × prüfungsgewicht(domain)` absteigend; Fehlerquote aus `listWrongAnswerStats` über die Decks der Domain, Mindeststichprobe 10 Antworten pro Domain (darunter gilt die Domain als „ohne Befund“ und wird nicht priorisiert).

### 23.6 Definition of Done je Phase

| Phase | Abnahme (alles muss zutreffen) |
|---|---|
| 1 | `npm run build` + `npm test` grün; Driver-Screenshot zeigt Kachel + Liste im `today`-Slide; `HomeTodayPackageTile`-Props unverändert (git diff belegt); §9.4-Texte umbenannt inkl. EN; keine neuen Dependencies |
| 2 | Migration idempotent nachgewiesen (Test); Reload + Profilwechsel erhalten Fortschritt (Test); Daily-Quest-Ausschluss-Test auf Vereinigung erweitert und grün; Pointer wird weiterhin geschrieben (Dual-Write-Test) |
| 3 | Ranking-Tests je Regel einzeln + kombiniert; Review-Einheit enthält nur fällige/falsche Karten und respektiert `excludeCardIds` (Test); `reason`-Chip sichtbar im Screenshot; max. 1 Review vor Kurs-Einheit (Test) |
| 4 | `objectives`-Validierungstest grün (alle Codes existieren); Review-Tabelle der Zuordnungen im PR; Lab-Abschluss erzeugt `labAttempts`-Eintrag und beeinflusst Ranking (Test); Legacy-Import idempotent (Test) |
| 5 | Phasen-Tabellentest (jede Zeile aus §13 + Terminverschiebung + null-Termin); Fragenmix-Summen exakt (Largest-Remainder-Test); Exam-Einheit erscheint nur in Phase `exam`/`final` (Test) |
