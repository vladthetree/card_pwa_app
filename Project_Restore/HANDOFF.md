# HANDOFF — Übergabe an die nächste KI

> Zweck: exakter Zwischenstand, damit eine andere KI **nahtlos** weiterarbeiten kann.
> Sprache: Deutsch. Stand: **2026-06-10 (Abend)**. Lies zuerst [`TODO.md`](./TODO.md) (Runbook)
> und [`RECOVERY_LOG.md`](./RECOVERY_LOG.md) (Belege). Halte beide weiter aktuell.

---

## 0. TL;DR — wo wir stehen

- **Phase 1 ✅ KOMPLETT (inkl. Push):** `origin/main` = `0326e4e` (Nutzer hat gepusht).
- **Phase 2 (A–G) ✅ KOMPLETT umgesetzt (lokal, verifiziert), 8 lokale Commits + aktuelle Arbeitskopie:**
  - `e8f6dc5` **A) Mono-Schrift** in den Studien-Renderern (CardFace/Ordering/Matching).
  - `3cd0434` **B) Fokus-Modus** (`settings.focusMode`, Header per `visibility` → kein Sprung).
  - `3bd7f2b` **C) cardId-Metrik** (`buildCardSuccessStats`/`fetchCardSuccessStats`, additiv).
  - `f7ca2be` **D) M3 Free Recall** (`FreeRecallCard`, `RECALL:`-Präfix/Tag `free-recall`;
    ⚠️ neu generiert, ohne Screenshot).
  - `ed7ed7d` **E) Daily-Quest-Kachel (Pilot) + Clean-Modus** (Dashboard KPI/Heatmap/Pilot/Clean).
  - `79c42f3` **G) Labs** (Liste + Detail + „Antwort prüfen"; Basis-Inventar 36/71, 9 Szenarien
    screenshot-belegt, Rest neu generiert). **F)** Menü-Einträge
    Clean+Labs stecken in `ed7ed7d`/`79c42f3`.
  - `52dd061` **Phase 2b: docs/** (M1/M2/M3/shuffle/labs-Autorendoku, Repo-Wurzel `docs/`).
- `2b35f6b` Restore-Runbook/Handoff/Log aktualisiert.
- **Zusatz 2026-06-10 (aktuelle Arbeitskopie, noch nicht committed):** Labs-Inventar auf **71/71**
  aufgefuellt, `LAB_SOURCES`/`LAB_SCENARIO_SOURCE_REFS` mit oeffentlichen Quellen, `docs/labs-sources.md`,
  Tests fuer Inventar, Quellenpflicht und nicht-vorsortierte Ordering-Szenarien. Danach Audit:
  Kartenmodus-Doku als Source of Truth, M2 nur noch **4 Optionen + 1 Correct**, TXT-Backup-Import
  fuer echte mehrzeilige `card-pwa-meta`-Backups repariert, Setup-Skripte clone-/port-stabiler.
  Neu: `npm run validate:cards` (779/779 Karten, 33/33 Decks, Labs 71/71; 68 Warnungen fuer
  5-Options-MC-Karten) und `scripts/verify-setup.sh` (nicht-destruktiver Setup-Check).
- ✅ **Abnahme:** `TZ=UTC npm run build` grün; `TZ=UTC npm test -- --run --testTimeout 10000`
  → **455/455** grün. Standard-5s-Full-Run hat 1 Timeout, isoliert läuft der Test grün.
- ⛔ **8 lokale Commits sind UNGEPUSHT** — Push vom Pi scheitert weiter (keine Credentials);
  die 71/71-Labs-Erweiterung liegt zusaetzlich als Arbeitskopie vor.
- **Nächste Schritte:** ① Nutzer pusht (`git push origin main`); ② **Phase 3 Daten-Import**
  (Hard Rule 2 beachten: erst importieren, dann syncen); ③ Phase 4 Abnahme am Gerät
  (Seite-an-Seite gegen Screenshots); ④ Labs-Quellen/71er-Erweiterung committen und pushen.

## 1. Git-/Repo-Zustand (exakt)

- Aktueller Branch: **`main`**, HEAD = **`2b35f6b`** (Restore-Doku), 8 Commits vor `origin/main`
  (= `0326e4e`). Kein Force nötig — reiner Fast-Forward-Push. Zusaetzlich gibt es uncommitted
  Arbeitskopie-Aenderungen fuer Labs 71/71 + Quellenpflicht.
- Lokaler Hilfs-Branch **`restore/may17`** zeigt auf `55cd385` (kann bleiben).
- `git status -s` → modifiziert (Nutzer-Arbeitsstand, bewusst uncommitted): `deploy_prod.sh`,
  `stop-server.sh`, gelöscht `run-https.sh`; `Project_Restore/` bleibt untracked/lokal.
- Git-Identität lokal: `vlad <vlad@card-pwa.local>`.

## 2. Offene BLOCKER (Nutzer-Aktion nötig)

1. **Push `origin/main`** — 8 Commits (`e8f6dc5`…`2b35f6b`) lokal; `git push` scheitert:
   `could not read Username` (kein `gh`, kein SSH-Key, kein Token auf dem Pi). Der Phase-1-Push
   lief offenbar von einem anderen Gerät. → PAT/SSH bereitstellen, dann `git push origin main`.
2. **Phase 3 Daten-Import** — In-App via `ImportView` (`#card-pwa:backup-v1`-Datei aus
   `Project_Restore/`); **Hard Rule 2**: erst Server/App befüllen, dann Handy syncen lassen.
   Audit 2026-06-10: Server-DB ist weiterhin leer (alle relevanten Tabellen 0); TXT-Backup-Import
   liest `card-pwa-meta` jetzt testgesichert korrekt.

## 3. HARD RULES (unverändert gültig — Details TODO.md §2)

- **`192.168.178.250:8443` bleibt FREI** (Dev/Prod auf **:8444**). *Verifiziert: :8443 frei,
  :8444 + :8787 aktiv, Drop-in-Override vorhanden.* Niemals alten Build auf :8443 deployen.
- **Handy NICHT mit leerem Sync-Server syncen** (sync.db ist leer). Erst Server befüllen.
- **`Project_Restore/`-Artefakte read-only** (nur kopieren).
- **Git-Historie erhalten** (kein Squash/Force-Push).
- **Belegpflicht** → RECOVERY_LOG §4. **Nutzer-Auflage: bestehende Logik darf NICHT negativ
  verändert werden** → Stage-2-Arbeiten strikt **additiv**, nach jedem Schritt Tests grün.
- Tests immer mit **`TZ=UTC`** laufen lassen (1 Test ist sonst TZ-abhängig, siehe §6).

## 4. Stage 2 / M2 Drag-Match — Recherche-Ergebnis & nächste Schritte

### Daten-Kodierung (verifiziert am CSV-Backup)
- **756 von 779 Karten** sind MC-Format (dominant!). Beispiel ZTNA-Karte:
  - `front`: erste Zeile = Frage, danach Optionszeilen `A: …` / `B: …` / `C: …` / `D: …`
  - `back`: `>> CORRECT: B | <Kurzantwort>` + Leerzeile + Erklärungs-Absätze (+ ggf. `PDF-Bezug:`)
- **Wichtig:** Im Screenshot ist die richtige Antwort „D)", in den Daten `>> CORRECT: B` →
  **die App mischt die Optionen** und trackt Korrektheit über die Identität/den Text, nicht den Buchstaben.

### Was der Branch (17. Mai) SCHON kann — NICHT brechen
- **MC wird bereits gerendert**, in [`CardFace.tsx`](../card_pwa/src/components/CardFace.tsx)
  als **Tap-Auswahl** (Options-Buttons), inkl.:
  - Parsing: `parseQuestionText(front)` → `question.question`, `question.options{A,B,C,D}`;
    `parseAnswerText(back)` → `answer`, `correct`, `correctOptions[]`, `merkhilfe`, `nicht`
    (Quelle: [`cardTextParser.ts`](../card_pwa/src/utils/cardTextParser.ts), `QuestionParser`/`AnswerParser`).
  - Shuffle der Optionen (`shuffleKeys`), Auswahl-Handler `handleAnswerSelect`, Auto-Flip,
    Richtig/Falsch-Feedback auf der Rückseite, `onAnswerEvaluated(score)` an StudyView.
- **Dispatch-Kette:** [`StudyView.tsx`](../card_pwa/src/components/StudyView.tsx) (~Zeile 993)
  rendert `<CardFace onAnswerEvaluated={handleAnswerEvaluated} … />`. CardFace dispatcht intern:
  `parseAnyQuestion(front)` → `ordering` → `OrderingCard`; `matching` → `MatchingCard`;
  **sonst (standard + MC) = Inline-Rendering** (Tap-MC, ab CardFace Zeile ~147).
- `StudyView` hat bereits MC-Sonderregel „P2.2: falsche MC-Antwort = Rating 1 (Again)"
  (`answerWasIncorrect`, Zeile ~445/454).
- `getCardVariant(front)` ([`cardVariant.ts`](../card_pwa/src/utils/cardVariant.ts)) liefert nur
  `standard|ordering|matching` (nie `mc`); MC-Erkennung läuft über `parseQuestionText().options.length`.
  Typ `'mc'` existiert aber bereits und wird in `CardFormModal` (Editor) genutzt.

### Was der 8.-Juni-Stand NEU hinzufügt (= M2-Rekonstruktion, aus Screenshots)
*Belege: `Drag-Match1_enabled_Fokus_Mode.jpeg`, `Drag-Match2_enabled_Fokus_mode.jpeg`.*
1. Header-Badge **„DRAG-MATCH"** (amber/oranger Rahmen) statt simplem „A".
2. **Drag-&-Drop statt Tap:** gestrichelte Drop-Zone **„KORREKTE ANTWORT HIERHER ZIEHEN"**;
   die 4 Optionen A–D sind unten als ziehbare Chips.
3. **Falsch-Feedback** (reicher als heute): rote gestrichelte Zone **„FALSCH."**, Panel mit
   **DEINE ANTWORT** / **RICHTIGE ANTWORT** + Block **„ERKLÄRUNG AUS DER KARTE"** (= `back` nach `>> CORRECT: X |`).

### OFFENE DESIGN-ENTSCHEIDUNG (vor dem Coden klären)
- Ersetzt Drag-Match die Tap-MC für **alle** 4-Optionen-Karten, oder ist es ein **Modus/Toggle**
  (M1 Flip ↔ M2 Drag-Match)? TODO.md sagt „automatische Wahl je Karte" → vermutlich: 4-Optionen-Karte
  ⇒ M2. **Empfehlung:** additiv als eigene Komponente `DragMatchCard.tsx` bauen und in CardFace
  für den MC-Zweig einhängen (Tap-MC als Fallback/Setting behalten → bestehende Logik bleibt intakt).

### 4a. M2 Drag-Match — ✅ ERLEDIGT (2026-06-10)

Alle Schritte umgesetzt, Build + Tests grün. Konkret:
1. ✅ **CardFace verdrahtet** — MC-Zweig in [`CardFace.tsx`](../card_pwa/src/components/CardFace.tsx)
   **vor** den `useState`-Hooks (nach dem matching-Early-Return): `parseQuestionText(card.front)`,
   Drag-Match nur bei **genau 4 Optionen A-D + genau 1 Correct-Marker** (`isDragMatchShape`,
   Source of Truth: `docs/M2-drag-match.md`). Hook-sicher, weil StudyView/
   ShuffleStudyView CardFace in `<motion.div key={currentCard.id}>` (AnimatePresence) rendern →
   pro Karte frischer Mount (gleicher Schutz wie ordering/matching). Inline-Tap-MC bleibt als
   toter Zweig im Code; Plain-Flip (ohne Optionen) unverändert → bestehende Logik intakt.
2. ✅ **Renderer** [`DragMatchCard.tsx`](../card_pwa/src/components/DragMatchCard.tsx): Mono-Schrift,
   gestrichelte Drop-Zone, **Shuffle + Positions-Relabeling** (Anzeige A–D nach Position; Korrektheit
   über kanonische Identität), Falsch-Feedback (FALSCH. / DEINE / RICHTIGE / ERKLÄRUNG), Header „FRAGE *"
   + amber „DRAG-MATCH"-Badge. Drag **und** Tap rufen denselben Pfad.
3. ✅ **Scoring ausgelagert** in [`utils/dragMatchScoring.ts`](../card_pwa/src/utils/dragMatchScoring.ts)
   (`correctDragMatchKey`, `scoreDragMatchChoice`) — rein & unit-testbar im Node/SSR-Test-Setup
   (kein jsdom im Repo). Der Renderer nutzt exakt diese Funktionen (kein Parallel-Code).
4. ✅ **Tests:** `__tests__/utils/drag-match-scoring.test.ts` (richtig→1.0/falsch→0.0, Identität statt
   Buchstabe, Erklärungs-Text — an der **echten** ZTNA-Karte) + `__tests__/components/drag-match-card.test.tsx`
   (`renderToStaticMarkup`: Badge, Drop-Zone, 4 Optionen, A–D-Relabel, Mono, Rückseiten-Erklärung).
5. ✅ **Verifiziert:** `TZ=UTC npm run build` grün; `TZ=UTC npm test -- --run` → **391/391** grün.
6. ✅ RECOVERY_LOG §2/§4 + TODO.md aktualisiert (Beleg: Screenshots + CSV `card_id 1779669260169`).

> **M2-Folgeaufgabe erledigt:** Der Schrift-Befund aus `Default_Card_View…jpeg` wurde in Stage 2A
> umgesetzt; Studien-Renderer nutzen Mono.

> Fokus-Modus, M3, cardId-Metrik, Dashboard, Menü und Labs sind umgesetzt; offene Arbeit liegt
> jetzt bei Daten-Import, Geräteabnahme und Push/Commit der lokalen Änderungen.

## 5. Restliche Stages (Reihenfolge siehe TODO.md)

- ~~**Stage 2** (Fokus, M3, cardId, Dashboard/Quest, Menü, Labs)~~ → ✅ **fertig** (Commits §0).
  Labs-Inventar ist in der aktuellen Arbeitskopie **71/71** inklusive Quellenpflicht.
- ~~**Stage 3 (docs/)**~~ → ✅ **fertig** (`52dd061`): `docs/M1-flip.md`, `M2-drag-match.md`,
  `M3-free-recall.md`, `shuffle.md`, `labs.md`.
- **Labs 71/71 (Arbeitskopie) — UMGESETZT, aber noch committen:** `card_pwa/src/data/labScenarios.ts`
  enthaelt 71 Szenarien; `docs/labs-sources.md` dokumentiert oeffentliche Quellen; Tests sind gruen.
- **Stage 4 (Daten) — OFFEN:** `sync.db` sichern → App/Server aus Backup befüllen (kein
  Seed-Skript vorhanden, Import-Pfad ist In-App via `ImportView`/`utils/dbBackup.ts`, Header
  `#card-pwa:backup-v1`) → **erst dann** Handy reconnecten (Nutzer-Aktion, Hard Rule 2).
  Der TXT-Import von `card-pwa-meta` wurde in der Arbeitskopie repariert und getestet.
  779 Karten / 33 Decks / FSRS / Settings.
- **Stage 5 — OFFEN:** Abnahme gegen Screenshots (TODO.md Phase 4); Deploy des neuen Builds
  auf `:8443` erst nach bewusstem Nutzer-Entscheid (Hard Rule 1).

### Neue Schlüsseldateien aus Stage 2 (Ergänzung zu §7)

| Datei | Rolle |
|---|---|
| `card_pwa/src/components/FreeRecallCard.tsx` | M3-Renderer (erinnern → aufdecken → selbst bewerten) |
| `card_pwa/src/utils/freeRecallScoring.ts` · `utils/cardVariant.ts` | M3-Score + Erkennung (`RECALL:`/Tag) |
| `card_pwa/src/components/home/HomeDailyQuestTile.tsx` | Pilot-Kachel „Daily Quest" |
| `card_pwa/src/db/queries/decks.ts → fetchDailyQuestCards` | gemischte Quest-Session über alle Decks |
| `card_pwa/src/components/labs/LabsView.tsx` / `LabScenarioView.tsx` / `labUi.tsx` | Labs-Liste + Szenario-Detail |
| `card_pwa/src/data/labScenarios.ts` | Labs-Inventar (71/71), Quellen-Registry `LAB_SOURCES`/`LAB_SCENARIO_SOURCE_REFS` |
| `card_pwa/src/utils/labProgress.ts` | GESCHAFFT-Persistenz (localStorage) |
| `card_pwa/src/utils/gamification.ts → buildCardSuccessStats` | Erfolgsmessung pro cardId |
| `docs/*.md` (Repo-Wurzel) | KI-Autorendoku je Modus + `labs-sources.md` |

## 6. Verifikation / nützliche Befehle

```bash
cd /home/_vb/card_pwa_app
git log --oneline origin/main..main        # zeigt die 8 ungepushten Stage-2-Commits
cd card_pwa
TZ=UTC npm run build                       # muss grün sein
TZ=UTC npm test -- --run --testTimeout 10000 # 455/455 grün
npm run validate:cards                     # Backup/Labs-Validator
../scripts/verify-setup.sh                 # Setup-/Port-/Shell-Check
```

- **Test-Hinweis:** Der Standard-5s-Gesamtlauf kann aktuell an
  `src/__tests__/integration/home-view-shell.test.tsx` timeouten; isoliert läuft der Test grün
  (ca. 4,7s Testzeit). Fuer stabile Full-Runs `--testTimeout 10000` nutzen oder den Test entschlacken.

## 7. Schlüsseldateien (Karten-Rendering)

| Datei | Rolle |
|---|---|
| `card_pwa/src/components/StudyView.tsx` | Lern-Session: Queue, Rating/FSRS, rendert `<CardFace>` |
| `card_pwa/src/components/CardFace.tsx` | **Zentrale Render-Weiche**: ordering/matching → Sub-Komponente, sonst Inline-MC/Flip |
| `card_pwa/src/components/MatchingCard.tsx` / `OrderingCard.tsx` | PBQ-Renderer (Drag/Reihenfolge) — Vorbild für `DragMatchCard` |
| `card_pwa/src/utils/cardTextParser.ts` | `parseQuestionText`/`parseAnswerText`/`parseAnyQuestion` etc. |
| `card_pwa/src/utils/cardVariant.ts` | `getCardVariant` (standard/ordering/matching) + `isDragMatchShape` (M2: 4 Optionen + 1 Correct) |
| `card_pwa/src/components/CardFormModal.tsx` | Editor: nutzt `mc`-Variante (Referenz für MC-Datenmodell) |

> Belege/Provenance immer in `RECOVERY_LOG.md` §4 nachtragen; `TODO.md`-Haken pflegen.
