# Recovery-Log / Provenance-Ledger – Card PWA

> Zweck: jeder wiederhergestellte Baustein muss **nachvollziehbar & belegbar** sein.
> Hier wird festgehalten: Quell-Artefakte (mit Prüfsumme), woher jede Wiederherstellung
> stammt, und welche Entscheidungen wann getroffen wurden.

## 1. Quell-Artefakte (SHA-256, Stand 2026-06-09)

| Datei | SHA-256 | Inhalt |
|---|---|---|
| `card-pwa-backup-2026-06-08T21-20-25-967Z.txt` | `b7859b55…dd4a8ce4` | 779 Karten, base64-Meta (SRS) |
| `card-pwa-backup-2026-06-08T21-54-32-447Z.csv` | `96f8e536…bda1a52a` | 779 Karten, flach/Komma |
| `WhatsApp …23.36.20.jpeg` | `cc6374d6…3cc4bcec` | Home (Daily/Pilot, Decks) |
| `WhatsApp …23.38.26.jpeg` | `39ebb607…ca044bd4` | Labs-Liste (4/71) |
| `WhatsApp …23.38.47.jpeg` | `446c1f42…0e8e3c54` | Lab-Detail (Matching, oben) |
| `WhatsApp …23.38.57.jpeg` | `786f7f5a…aafbac98` | Lab-Detail (Matching, alle Slots) |
| `WhatsApp …23.39.17.jpeg` | `fe27ee32…72bce888` | Lab-Detail (Ordering, Firewall) |
| `WhatsApp …23.39.49.jpeg` | `aeb44445…03996519` | Lab-Detail (Ordering, Change-Mgmt) |
| `WhatsApp …23.40.53.jpeg` | `5c5b19b1…31fd5004` | Ansichten-/Dashboard-Menü |
| `Default_Card_View_enabled_Fokus_mode.jpeg` | `e1c63ad2…f252ce9f` | M1 Flip (Antwort) + Rating 1–4, Fokus-Modus |
| `Drag-Match1_enabled_Fokus_Mode.jpeg` | `923d7d5a…317651f4` | M2 Drag-Match (Frage, 4 Optionen), Fokus |
| `Drag-Match2_enabled_Fokus_mode.jpeg` | `40a065ad…2768991f` | M2 Drag-Match (Falsch-Feedback + Erklärung) |

(Volle Hashes per `sha256sum` reproduzierbar.)

## 2. Kreuz-Checks (Belege)

- **2026-06-09** `.txt` vs `.csv`: beide enthalten **exakt dieselben 779 `card_id`** (0 nur-in-txt,
  0 nur-in-csv) → die beiden Exporte bestätigen sich gegenseitig; Datenstand ist konsistent.
- **2026-06-09** `card-sync-server/sync.db`: Schema vorhanden, aber **alle Tabellen leer**
  (`server_cards`/`server_decks`/`server_reviews`/`devices`/`users`/`sync_operations` = 0 Zeilen).
  → Server hält **keine** Daten; das Handy-Backup ist die **einzige** Datenquelle (kein Merge nötig).
  Die zwei Backup-Dateien sind aktuell die **einzige Off-Phone-Kopie** der Lerndaten.
- **2026-06-09** M2-Frage gelöst: Screenshot `Drag-Match1/2` zeigt das Badge „DRAG-MATCH" auf einer
  normalen 4-Optionen-MC-Karte (ZTNA-Acronym) → **M2 ist ein eigener Studien-Renderer** für
  4-Optionen/1-richtig-Karten, **getrennt** vom PBQ-`MatchingCard` (Mehrfach-Paare).
- **2026-06-10** M2-Daten verifiziert an der echten Karte (CSV `…T21-54-32`, `card_id 1779669260169`):
  `front` listet kanonisch `A: Zoned Trust… / B: Zero Trust Network Access / C: Zone-based Tunneling… /
  D: Zero-Touch…`, `back` = `>> CORRECT: B | …`. Im Screenshot `Drag-Match1` erscheinen die Optionen
  **nach Position neu beschriftet** (A=Zoned, B=Zone-based, C=Zero-Touch, **D=Zero Trust Network Access**),
  und `Drag-Match2` zeigt **„RICHTIGE ANTWORT: Zero Trust Network Access"** → bestätigt: die App **mischt
  die Optionen und relabelt A–D**, trackt Korrektheit über die **Identität** (kanonisch B), nicht den
  Buchstaben. Genau so im Renderer umgesetzt (`utils/dragMatchScoring.ts` + Shuffle/Relabel in `DragMatchCard`).
- **2026-06-10** Schrift-Befund: alle 3 Karten-Screenshots rendern Frage/Antwort/Optionen in **Mono
  (Share Tech Mono = App-Basisfont)**, nicht in `font-sans` (Space Grotesk). M2-Renderer entsprechend
  durchgängig `font-mono`. **Offen/Folgeaufgabe:** M1 `CardFace` nutzt im 17-Mai-Branch `font-sans`
  → für 100%-Treue zur `Default_Card_View`-Aufnahme müsste die Studien-Ansicht global auf Mono umgestellt
  werden (eigener Schritt, da viele Komponenten betroffen — nicht Teil von M2).
- **2026-06-10** Test-Suite `H4gIA`: **378/378 grün unter `TZ=UTC`** (Build grün). 1 Test
  (`db/backlog-smoother.test.ts > uses custom nextDayStartsAt …`) schlägt nur in **lokaler TZ
  Europe/Berlin** fehl (21 erwartet, 52 erhalten). Ursache: Test fixiert UTC-Zeiten, aber
  `getDayStartMs()` rechnet die Tagesgrenze lokal → TZ-abhängiger Test, **kein Logikfehler**,
  identisch auf `main`. Produktivlogik **nicht** verändert (Nutzer-Auflage). Härtungs-To-do offen.

## 3. Git-Anker

- `main` tip: `f9c615fa5512779e3bd10a21683dc33c73dce9fa` (2026-04-26, alte Basis)
- `origin/claude/review-code-H4gIA` tip: `55cd385edabb89c1c681a5d37b64c8a968c4c444` (2026-05-17,
  +12 Commits, enthält Großteil der neuen Features)

## 4. Wiederherstellungs-Einträge (wird je Schritt ergänzt)

| Datum | Baustein | Quelle (Beleg) | Methode | Status |
|---|---|---|---|---|
| 2026-06-09 | Provenance-Baseline | — | Hashes + Kreuz-Check angelegt | ✅ |
| 2026-06-09 | Entscheid: Daten-Hoheit | `sync.db` leer (Beleg §2) | Handy-Backup = kanonisch, kein Merge | ✅ |
| 2026-06-09 | Entscheid: `docs/` | keine Originalquelle | neu generieren + committen | ☐ offen |
| 2026-06-09 | Entscheid: Git-Historie | Branch H4gIA | **Fast-Forward** (kein Squash, FF statt Merge-Commit, da `main` Vorfahre) | ✅ |
| 2026-06-09 | Entscheid: Handy-Bundle | Nutzer | Bundle/Sourcemaps **nicht verfügbar** → Phase 2 best-effort aus Screenshots | ✅ |
| 2026-06-10 | **Phase 1: Branch-Restore** | `origin/claude/review-code-H4gIA` (`55cd385`) | `main` `f9c615f`→`55cd385` per Fast-Forward; 12 Commits erhalten | ✅ lokal |
| 2026-06-10 | Abnahme Phase 1 | `H4gIA`-Build | `npm run build` grün + `378/378` Vitest (TZ=UTC) | ✅ |
| 2026-06-10 | Cleanup `ignore/` | `.gitignore`-Typo `ignose/`→`ignore/` | `git rm -r ignore/` (7.2M Müll) + Typo-Fix, Commit `ff4f1eb`; Blobs bleiben in Historie | ✅ |
| 2026-06-10 | **Stage 2 / M2 Drag-Match** | `Drag-Match1/2_…jpeg` + CSV `card_id 1779669260169` | Neuer Studien-Renderer `DragMatchCard.tsx` (Drag **+** Tap, Drop-Zone, Falsch-Feedback, Erklärung), reine Scoring-Helfer `utils/dragMatchScoring.ts`, CardFace-Verdrahtung (MC-Zweig, lazy). Mono-Schrift + Shuffle/Relabel exakt nach Screenshot. | ✅ lokal |
| 2026-06-10 | Abnahme M2 | Build + Vitest | `TZ=UTC npm run build` grün; **391/391** Vitest grün (13 neue Tests: Scoring an echter ZTNA-Karte + Render-Struktur) | ✅ |
| 2026-06-10 | **A) Studien-Schrift Mono** | `Default_Card_View…jpeg` (M1 rendert Mono) | `font-sans`→`font-mono` in CardFace/OrderingCard/MatchingCard (nur Studien-Renderer; Home/Settings/Editor unberührt). Commit `e8f6dc5` | ✅ lokal |
| 2026-06-10 | **B) Fokus-Modus** | alle 3 Karten-Screenshots (Header leer, Platz reserviert, Zurück-Button sichtbar) | `settings.focusMode` (Default aus) + Toggle in SettingsModal; StudyView/ShuffleStudyView blenden Header-Inhalte per `visibility:hidden` (`invisible`) aus → kein Layout-Sprung. 4 neue Tests (Normalisierung). Commit `3cd0434` | ✅ lokal |
| 2026-06-10 | **C) Erfolgsmessung pro cardId** | Nutzer-Entscheid (TODO §Phase 2); Reviews trugen `cardId` bereits | Additiv: `buildCardSuccessStats` (utils/gamification) + `fetchCardSuccessStats` (db/queries); Gamification-Profil unverändert (Test: mit/ohne cardId identisch). 5 neue Tests. Commit `3bd7f2b` | ✅ lokal |
| 2026-06-10 | **D) M3 Free Recall** | ⚠️ **neu generiert, ohne Original-Screenshot** (Ablauf laut TODO: erinnern→aufdecken→selbst bewerten) | `FreeRecallCard.tsx` + `isFreeRecallCard`/`stripFreeRecallPrefix` (Encoding: `RECALL:`-Präfix oder Tag `free-recall`, definiert in `docs/M3-free-recall.md`) + `scoreFreeRecallSelfCheck` (Gewusst→1.0, Nicht gewusst→0.0→Again wie P2.2); CardFace-Zweig vor MC. 14 neue Tests. Commit `f7ca2be` | ✅ lokal |
| 2026-06-10 | **E) Dashboard-Kachel + Daily Quest + Clean** | `…23.36.20.jpeg` (DAILY QUEST-Kachel), `…23.40.53.jpeg` (Clean-Option) | Branch hatte schon kpi/heatmap/pilot: neu `HomeDailyQuestTile` (Pilot = Daily Quest, „Jetzt: 25 Karten" → gemischte Session via `fetchDailyQuestCards`/`sortStudyCards`, Reviews fließen in Ursprungsdecks) + Modus `clean` (Kachel aus) inkl. Persistenz. 6 neue Tests. Commit `ed7ed7d` | ✅ lokal |
| 2026-06-10 | **F) Ansichten-Menü vervollständigt** | `…23.40.53.jpeg` | Bottom-Sheet (ANSICHT/SORTIERUNG/DASHBOARD) war im Branch; ergänzt: DASHBOARD „Clean" (`ed7ed7d`) + ANSICHT „Labs" (`79c42f3`) | ✅ lokal |
| 2026-06-10 | **G) Labs-Feature** | Liste `…23.38.26.jpeg`; Matching-Detail `…23.38.47/.57.jpeg`; Ordering-Detail `…23.39.17/.49.jpeg`; Inhalte teils ⚠️ neu generiert | `LabsView` (Pill n/71, Kategorien, GESCHAFFT) + `LabScenarioView` (BEWEISMATERIAL/NETZWERKTOPOLOGIE/Ziel, Dropdown-Matching, Drag-Ordering, „Antwort prüfen"; Scoring `pbqScoring`). Inventar `data/labScenarios.ts`: **36/71** — 9 screenshot-belegt (Control-Funktion, Standard-Change, Geo-Block wortgetreu), Rest neu generiert; Auffüllen per `docs/labs.md`. Fortschritt in localStorage. 15 neue Tests. Commit `79c42f3` | ✅ lokal (Inhalt 36/71) |
| 2026-06-10 | **Phase 2b: docs/** | ⚠️ **neu generiert** (keine Originalquelle, Entscheid §4); M2-Encoding verifiziert an CSV `card_id 1779669260169` | `docs/M1-flip.md`, `M2-drag-match.md`, `M3-free-recall.md`, `shuffle.md`, `labs.md` — je Zweck/Encoding/Dos&Don'ts/Vorgaben/Beispiel-Prompt+Output. Commit `52dd061` | ✅ lokal |
| 2026-06-10 | Abnahme Stage 2 | Build + Vitest | `TZ=UTC npm run build` grün; `TZ=UTC npm test -- --run` → **436/436** grün (45 neue Tests seit M2) | ✅ |
| 2026-06-10 | Push Phase-1-Stand | `origin/main` = `0326e4e` | Nutzer hat den M2-Stand gepusht (Quelle: `git status` origin/main aktualisiert) | ✅ |
| 2026-06-10 | **Push Stage-2-Commits** | `git push` 2026-06-10 abends: `could not read Username` | 7 Commits `e8f6dc5`…`52dd061` nur lokal; weiterhin keine Credentials auf dem Pi | ☐ **offen (Nutzer)** |
| 2026-06-09 | Offen: Handy-Belege | — | gezielte Screenshots M1/M2/M3, Settings/Sync, Fokus | ☐ offen |

> Regel: Jeder Eintrag nennt eine **überprüfbare Quelle** (Commit-Hash, Artefakt-SHA,
> Screenshot-Datei) — oder ist explizit als **„neu generiert / ohne Originalquelle"** markiert.
