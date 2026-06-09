# HANDOFF — Übergabe an die nächste KI

> Zweck: exakter Zwischenstand, damit eine andere KI **nahtlos** weiterarbeiten kann.
> Sprache: Deutsch. Stand: **2026-06-10**. Lies zuerst [`TODO.md`](./TODO.md) (Runbook) und
> [`RECOVERY_LOG.md`](./RECOVERY_LOG.md) (Belege). Halte beide weiter aktuell.

---

## 0. TL;DR — wo wir stehen

- **Phase 1 (Branch-Restore) ist LOKAL fertig.** `main` per Fast-Forward auf den Mai-17-Stand
  gehoben + Cleanup-Commit (`ff4f1eb`). Build grün.
- **NUR der Push nach `origin/main` fehlt** → **blockiert: keine GitHub-Credentials** auf dem Pi.
- **Stage 2 / M2 Drag-Match ist FERTIG (lokal, verifiziert):**
  - ✅ i18n (`dragmatch_*`, de+en), Renderer `DragMatchCard.tsx`, Scoring-Helfer
    `utils/dragMatchScoring.ts`, CardFace-MC-Zweig (lazy) verdrahtet.
  - ✅ **Build grün, 391/391 Tests grün (unter `TZ=UTC`)** — 13 neue Tests (Scoring an der echten
    ZTNA-Karte + Render-Struktur). Rekonstruktion **100 % aus den Drag-Match-Screenshots + CSV-Karte**:
    Mono-Schrift, Shuffle + Positions-Relabeling (kanonisch B → angezeigt „D"), Korrektheit über Identität.
  - ⏳ Commit steht noch aus (lokal) bzw. ist gerade erfolgt — siehe `git log`.
- **Nächster konkreter Schritt:** **Fokus-Modus** (orthogonal, §5) — danach M3, cardId-Metrik, Dashboard,
  Menü, Labs. **Folge-To-do aus M2:** Studien-Ansicht global auf **Mono** umstellen (M1 `CardFace` nutzt
  noch `font-sans`, die `Default_Card_View`-Aufnahme zeigt aber Mono) → RECOVERY_LOG §2/§4.

## 1. Git-/Repo-Zustand (exakt)

- Aktueller Branch: **`main`**, HEAD = **`ff4f1eb`** (`chore: drop committed ignore/ …`),
  darunter `55cd385` (= alter Branch-Tip `origin/claude/review-code-H4gIA`).
- Lokaler Hilfs-Branch **`restore/may17`** zeigt ebenfalls auf `55cd385` (kann bleiben).
- `git status -s` → nur untracked: `Project_Restore/`, `card_pwa/.env.production`, `setup.sh`
  (alles erwartet, nicht committen außer bewusst).
- **`origin/main` ist noch `f9c615f`** (alt!) — wird erst durch den ausstehenden Push aktuell.
- Git-Identität lokal gesetzt: `vlad <vlad@card-pwa.local>` (passend zur Historie).

## 2. Offene BLOCKER (Nutzer-Aktion nötig)

1. **Push `origin/main`** — `git push origin main` scheitert: HTTPS-Remote ohne Credentials
   (kein `gh`, kein SSH-Key, kein `GITHUB_TOKEN`). → Nutzer muss PAT/SSH bereitstellen.
   Zu pushen sind 13 Commits (12 vom Branch + `ff4f1eb`).
2. **Handy-Bundle/Sourcemaps** — kommt laut Nutzer **nie**. Phase 2 daher **best-effort aus
   Screenshots + Backup-Daten + Branch-Code**, jede Übernahme als „rekonstruiert/neu generiert" markieren.

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
   bei `>= 2` Optionen lazy `<DragMatchCard …/>` in `<Suspense>`. Hook-sicher, weil StudyView/
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

> **Offene Folge-Aufgabe aus M2:** Schrift-Befund — die `Default_Card_View`-Aufnahme (M1) ist
> ebenfalls **Mono**, `CardFace` nutzt dort aber `font-sans`. Für 100%-Treue müsste die Studien-
> Ansicht **global auf Mono** umgestellt werden (eigener Schritt; viele Komponenten betroffen).

> **Nächstes Todo: Fokus-Modus** (orthogonal: Header ausblenden, Platz **reservieren**, kein
> Layout-Sprung — in `StudyView`/`CardFace`), dann M3, cardId-Metrik, Dashboard, Menü, Labs.

## 5. Restliche Stages (Reihenfolge siehe TODO.md)

- **Stage 2 weiter:** Fokus-Modus, M3 Free-Recall (neu generiert), Erfolgsmessung pro `cardId`,
  Dashboard-Kachel (KPI/Heatmap/Pilot/Clean) + Daily Quest, Ansichten-Menü, **Labs-Feature**
  (Liste 4/71 + Szenario-Detail + „Antwort prüfen", baut auf Matching/OrderingCard auf;
  71 Inhalte best-effort via `docs/labs.md` neu generieren).
- **Stage 3 (docs/):** `docs/M1-flip.md`, `M2-drag-match.md`, `M3-free-recall.md`, `shuffle.md`, `labs.md`.
- **Stage 4 (Daten):** `sync.db` sichern → Server aus Backup befüllen (kein Seed-Skript vorhanden,
  Import-Pfad ist In-App via `ImportView`/`utils/dbBackup.ts`, Header `#card-pwa:backup-v1`) →
  **erst dann** Handy reconnecten (Nutzer-Aktion). 779 Karten / 33 Decks / FSRS / Settings.
- **Stage 5:** Abnahme gegen Screenshots (TODO.md Phase 4).

## 6. Verifikation / nützliche Befehle

```bash
cd /home/_vb/card_pwa_app
git log --oneline origin/main..main        # zeigt die noch ungepushten Commits
cd card_pwa
TZ=UTC npm run build                       # muss grün sein
TZ=UTC npm test -- --run                   # 378/378 grün (OHNE TZ=UTC schlägt 1 TZ-Test fehl)
```

- **TZ-Test:** `src/__tests__/db/backlog-smoother.test.ts > uses custom nextDayStartsAt …`
  erwartet 21, bekommt 52 in Europe/Berlin. Ursache: Test fixiert UTC-Zeiten, `getDayStartMs()`
  rechnet lokal. **Kein Logikfehler**, identisch auf `main`. **Nicht** die Produktivlogik ändern;
  optionales Härtungs-Todo: TZ im Test/`vitest`-Setup pinnen.

## 7. Schlüsseldateien (Karten-Rendering)

| Datei | Rolle |
|---|---|
| `card_pwa/src/components/StudyView.tsx` | Lern-Session: Queue, Rating/FSRS, rendert `<CardFace>` |
| `card_pwa/src/components/CardFace.tsx` | **Zentrale Render-Weiche**: ordering/matching → Sub-Komponente, sonst Inline-MC/Flip |
| `card_pwa/src/components/MatchingCard.tsx` / `OrderingCard.tsx` | PBQ-Renderer (Drag/Reihenfolge) — Vorbild für `DragMatchCard` |
| `card_pwa/src/utils/cardTextParser.ts` | `parseQuestionText`/`parseAnswerText`/`parseAnyQuestion` etc. |
| `card_pwa/src/utils/cardVariant.ts` | `getCardVariant` (standard/ordering/matching) |
| `card_pwa/src/components/CardFormModal.tsx` | Editor: nutzt `mc`-Variante (Referenz für MC-Datenmodell) |

> Belege/Provenance immer in `RECOVERY_LOG.md` §4 nachtragen; `TODO.md`-Haken pflegen.
