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
| 2026-06-10 | Folge-To-do M1-Schrift | `Default_Card_View…jpeg` | Studien-Ansicht global auf Mono (Share Tech Mono) umstellen — `CardFace` nutzt noch `font-sans` | ☐ offen |
| 2026-06-10 | **Push `origin/main`** | — | `git push` blockiert: **keine GitHub-Credentials** (kein gh/SSH/Token) | ☐ **offen (Nutzer)** |
| 2026-06-09 | Offen: Handy-Belege | — | gezielte Screenshots M1/M2/M3, Settings/Sync, Fokus | ☐ offen |

> Regel: Jeder Eintrag nennt eine **überprüfbare Quelle** (Commit-Hash, Artefakt-SHA,
> Screenshot-Datei) — oder ist explizit als **„neu generiert / ohne Originalquelle"** markiert.
