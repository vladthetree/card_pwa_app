# Wiederherstellung Card PWA — Runbook für die ausführende KI

> ⏩ **AKTUELLER STAND / ÜBERGABE (2026-06-10 Abend):** Siehe [`HANDOFF.md`](./HANDOFF.md) —
> **Phase 1 gepusht** (`origin/main` = `0326e4e`). **Phase 2 ist KOMPLETT umgesetzt** (A–G:
> Mono, Fokus-Modus, cardId-Metrik, M3, Daily-Quest/Clean-Dashboard, Ansichten-Menü, Labs)
> + **Phase 2b (docs/) fertig**. Build grün, **436/436 Tests** grün. **7 neue Commits
> warten auf Push** (Credentials auf dem Pi fehlen weiterhin). Offen: Phase 3 (Daten-Import,
> Nutzer-Aktion) und Phase 4 (Abnahme am Gerät).

> **Dieses Dokument ist ein Auftrag an eine KI.** Lies Abschnitt 1–4 vollständig, halte
> dich strikt an die **Hard Rules** (Abschnitt 2), arbeite die **Phasen** der Reihe nach ab
> und protokolliere **jeden** Schritt belegbar in [`RECOVERY_LOG.md`](./RECOVERY_LOG.md).
> Sprache: Deutsch. Stand: 2026-06-09. Alles muss **nachvollziehbar & belegbar** sein:
> keine Behauptung ohne Quelle (Commit-Hash / Datei-SHA / Screenshot) — oder explizit als
> „neu generiert, ohne Originalquelle" markieren.

---

## 1. Ausgangslage (Mission-Briefing — in 60 Sekunden erfassen)

**Was ist das Projekt?**
„Card PWA" — eine Spaced-Repetition-Lern-App (Karteikarten) für die CompTIA-Zertifizierung
**Security+ SY0-701**. Zwei Teile, beide laufen lokal auf einem **Raspberry Pi**:
- **Frontend** `card_pwa/` — React + TypeScript + Vite PWA (offline-fähig, Service-Worker).
- **Backend** `card-sync-server/` — Python-Sync-Server (nur Standardbibliothek), HTTPS, SQLite (`sync.db`).
- Repo-Wurzel: `/home/_vb/card_pwa_app` · GitHub: `github.com/vladthetree/card_pwa_app`.

**Was ist passiert? (der Schaden)**
Der Nutzer hat **~2 Monate keinen Code gepusht**. Die **neueste, funktionierende Version
läuft nur noch als installierte PWA auf seinem iPhone** (Stand 8. Juni 2026). In Git ist:
- `main` = **alter Stand vom 26. Apr** (HEAD `f9c615f`).
- Branch `origin/claude/review-code-H4gIA` = **Stand 17. Mai** (+12 Commits) → rettet den
  **Großteil** der neuen Features.
- → Es fehlen real nur **~3 Wochen Code (17. Mai → 8. Juni)**, die nur auf dem Handy existieren.
Zusätzlich hat der Nutzer die **Karten-Datenbank vom Handy** als Backup exportiert
(`.txt` + `.csv`, 779 Karten) und **7+3 Screenshots** der neuesten UI bereitgestellt.

**Aktueller System-Zustand (bereits hergestellt — nicht kaputt machen):**
- Backend läuft: `systemctl --user status card-sync-server.service` → HTTPS auf **8787**, Health
  `https://127.0.0.1:8787/health`.
- Frontend (Prod-Server) läuft als **System**-Service `card-pwa-prod.service`, wurde aber per
  Drop-in auf **Port 8444** umgezogen. **Port 8443 ist bewusst FREI** (siehe Hard Rules).
- `sync.db` ist **leer** (Beleg: RECOVERY_LOG §2) → der Server hält keine Daten.

**Mission / Ziel:**
Den **Handy-Stand vom 8. Juni** bestmöglich als **sauberen, gepushten Code + wiederhergestellte
Daten** rekonstruieren — vollständig, getestet, belegt. Reihenfolge: erst sichern/einfrieren,
dann Branch zurückholen, dann die 3-Wochen-Lücke, dann Daten, dann Abnahme.

---

## 2. Hard Rules (NIE verletzen — sonst droht endgültiger Datenverlust)

1. **`192.168.178.250:8443` muss FREI bleiben**, bis der wiederhergestellte/neue Build steht.
   Die Handy-PWA ist an diese Origin gebunden; läge dort der **alte** Build, würde der
   Service-Worker beim nächsten Online-Öffnen die **neueste Version auf dem Handy überschreiben**.
   → Niemals den alten/aktuellen Build auf `:8443` ausliefern. Dev/Prod läuft auf **:8444**.
2. **Das Handy NICHT mit dem (leeren) Sync-Server syncen lassen**, bevor der Server aus dem
   Backup befüllt ist — sonst Risiko, dass ein „leerer Server"-Zustand Handy-Daten löscht.
   Reihenfolge zwingend: erst Server aus Backup befüllen / Daten importieren, dann sync.
3. **Quell-Artefakte read-only behandeln.** Die Dateien in `Project_Restore/` (Backups,
   Screenshots) sind teils die **einzige Off-Phone-Kopie**. Nicht überschreiben/verschieben;
   nur kopieren. SHA-256 stehen in RECOVERY_LOG §1.
4. **Git-Historie erhalten:** Branch zuerst nach `origin` sichern, dann **Merge statt Squash**
   (Original-Commits = Belege). Nichts force-pushen, was Historie verwirft.
5. **Belegpflicht:** Jeder Wiederherstellungsschritt wird in RECOVERY_LOG §4 mit Quelle
   eingetragen. Ohne Beleg gilt etwas als „neu generiert" und ist so zu markieren.
6. **Keine destruktiven Aktionen ohne Backup** (z. B. `sync.db` überschreiben → vorher kopieren).

---

## 3. Quellen & Provenance (Belege → Details in `RECOVERY_LOG.md`)

| Quelle | Stand | Enthält | Verlässlichkeit |
|---|---|---|---|
| Git `main` (`f9c615f`) | 26. Apr | alte Basis | ✅ |
| Git `origin/claude/review-code-H4gIA` (`55cd385`) | **17. Mai**, +12 Commits | Großteil der neuen Features | ✅ |
| **Handy-PWA** (Service-Worker-Cache) | **8. Juni** | letzte ~3 Wochen (Labs, Pilot, Szenario-Inhalte, `docs/`?) | ⚠️ flüchtig |
| `card-pwa-backup-…T21-20-25.txt` | 8. Juni | 779 Karten, 33 Decks, SRS, Settings (base64-Meta) | ✅ |
| `card-pwa-backup-…T21-54-32.csv` | 8. Juni | dieselben 779 Karten, flach (Autoren-/KI-Format) | ✅ |
| 10 Screenshots (`*.jpeg`) | 8.–9. Juni | UI-Referenz (Home, Labs, M1, M2, Fokus, Menü) | ✅ |
| `docs/` (KI-Anleitung je Modus) | — | Dos & Don'ts pro Modus | ❌ **nicht in Git → verloren, neu generieren** |
| Sync-Server `sync.db` | jetzt | **leer** (0 Zeilen) → keine Datenquelle | ✅ geprüft |

**Belegt durch Kreuz-Checks (RECOVERY_LOG §2):** `.txt` und `.csv` enthalten exakt dieselben
779 `card_id`; `sync.db` ist nachweislich leer.

---

## 4. Bereits getroffene Entscheidungen (verbindlich)

- **Daten-Hoheit:** Das **Handy-Backup ist kanonisch**. Da `sync.db` leer ist, gibt es **nichts
  zu mergen** — Server wird aus dem Backup befüllt.
- **`docs/`:** Es existiert **keine Originalquelle** → **neu generieren** (aus Karten/CSV +
  Screenshots) und diesmal **committen & pushen**.
- **Git:** Branch sichern → **Merge (kein Squash)** → pushen.
- **Handy-Belege:** Nutzer hat gezielte Screenshots für **M1, M2, Fokus-Modus** nachgeliefert;
  mehr ist aktuell nicht verfügbar. M3/Settings-Sync ggf. später.

---

## ⚠️ SOFORT – zeitkritisch: Handy-Stand einfrieren & sichern

- [x] **Origin `…250:8443` freigemacht** (2026-06-08): Frontend-Service per Drop-in
      `/etc/systemd/system/card-pwa-prod.service.d/override.conf` auf **Port 8444** umgezogen;
      `:8443` ist unerreichbar → Handy-PWA bleibt offline/eingefroren.
      Rückgängig: Drop-in löschen + `sudo systemctl daemon-reload && sudo systemctl restart card-pwa-prod.service`.
- [x] ~~**Bundle + Sourcemaps aus dem Handy exportieren**~~ — **ENTFÄLLT** (Nutzer-Entscheid
      2026-06-10: Bundle/Sourcemaps werden **nicht** bereitgestellt). → Phase 2 wird **best-effort
      aus Screenshots + Backup-Daten + Branch-Code** rekonstruiert und entsprechend markiert.

---

## Phase 1 – Code aus dem Branch zurückholen (größter, sicherer Hebel)

Holt ~80 % der verlorenen Arbeit zurück (26. Apr → 17. Mai). Der Branch enthält bereits:
`HomeBottomBar`, `MatchingCard` (PBQ-Zuordnung), `OrderingCard` (PBQ-Reihenfolge),
`HomeTagBrowseSection` (Nach Tags), `HomeReviewSection` (Review-Tab), `cardVariant`,
`pbqScoring`, `cardTextParser` (PBQ-Parsing), `deckHierarchy`/`securityDeckHierarchy`, Sync-Fixes.

- [x] Branch gesichert & ausgecheckt: `restore/may17` ← `origin/claude/review-code-H4gIA` (`55cd385`).
- [x] Bauen & Tests grün: `npm ci` + `npm run build` ✅ + **378/378 Vitest** ✅ (unter `TZ=UTC`;
      1 Test ist TZ-abhängig, kein Logikfehler — siehe RECOVERY_LOG §2/§4).
- [x] Review der 12 Commits: **keine Löschungen**, geänderte Dateien passen zum Feature-Set.
- [x] Nach `main` **per Fast-Forward** übernommen (kein Squash) → `main` = `55cd385`.
- [x] Cleanup-Commit `ff4f1eb`: `ignore/` (7.2M Müll) entfernt + `.gitignore`-Typo `ignose/`→`ignore/`.
- [x] **`main` gepusht** (2026-06-10): `origin/main` = `0326e4e` (Phase-1-Stand inkl. M2).
      ⚠️ Die **7 Stage-2-Commits danach** (`e8f6dc5`…`52dd061`) sind wieder **nur lokal** —
      Push vom Pi scheitert weiterhin an fehlenden Credentials (Nutzer-Aktion).
- **Abnahme Phase 1:** Build + Tests grün ✅; `main` enthält neue Dateien ✅; gepusht ✅.

---

## Phase 2 – Lücke 17. Mai → 8. Juni aus dem Handy rekonstruieren

Diese Features sind in den Screenshots belegt, aber **noch nicht im Branch**
(`git grep` im Branch = 0 Treffer für „Labs", „Szenarien", „Antwort prüfen", „DRAG-MATCH"):

- [x] **Labs** ✅ (2026-06-10) – `components/labs/LabsView.tsx`: Reiter „Interaktive
      Sicherheits-Szenarien", Fortschritts-Pill (n/71), aufklappbare Kategorien („n/m SZENARIEN"),
      Schwierigkeit **Einsteiger / Fortgeschritten / Experte**, „GESCHAFFT"-Status (localStorage),
      Zeit (3–5 Min). *(Belege: `WhatsApp …23.38.26/.47/.57/.39.17/.39.49.jpeg`)*
- [x] **Szenario-Detail** ✅ – `components/labs/LabScenarioView.tsx`: **BEWEISMATERIAL** /
      **NETZWERKTOPOLOGIE** / **Ziel**-Callout, **Dropdown-Zuordnung** *oder* **Drag-Reihenfolge**
      (framer `Reorder`) + **„Antwort prüfen"**. Scoring über `pbqScoring.ts`.
- [~] **71 Labs-Szenarien (Inhalt)**: **36 von 71** in `data/labScenarios.ts` — 9 davon
      screenshot-belegt (u. a. Control-Funktion, Standard-Change, Geo-Block **exakt** nach Bild),
      Rest ⚠️ neu generiert. **Auffüllen auf 71** reproduzierbar per [`docs/labs.md`](../docs/labs.md)
      (Kategorie-Quoten: Firewalls/IR je ≥ 12). Fortschritts-Pill zeigt fest „n / 71".
- [x] **Dashboard-Kachel oben** ✅ – Modi **KPI / Heatmap / Pilot / Clean**; „Pilot" =
      **Daily Quest** (`HomeDailyQuestTile`, „Jetzt: 25 Karten …" → gemischte Session über alle
      Decks via `fetchDailyQuestCards`); „Clean" blendet die Kachel aus. *(Beleg: `…23.36.20.jpeg`)*
- [x] **Ansichten-Menü** ✅ (Bottom-Sheet, war großteils im Branch): ANSICHT = Decks / Nach Tags /
      Shuffle-Decks / **Labs (neu)**; SORTIERUNG = Name / Fällig; DASHBOARD = KPI / Heatmap /
      Pilot / **Clean (neu)**. *(Beleg: `…23.40.53.jpeg`)*
- [ ] **Studien-Formate** (automatische Wahl je Karte) — **belegt durch Screenshots**:
  - **M1 Flip** (Standard/Fallback): Vorder-/Rückseite, Rating-Leiste **Nochmal(1)/Schwer(2)/
    Gut(3)/Leicht(4)** (FSRS). *(Beleg: `Default_Card_View_enabled_Fokus_mode.jpeg`)*
  - **M2 Drag-Match** — ✅ **FERTIG (lokal, verifiziert)**: Renderer `DragMatchCard.tsx` (Drag **+**
    Tap, Drop-Zone, Falsch-Feedback, Erklärung), Scoring-Helfer `utils/dragMatchScoring.ts`,
    CardFace-Verdrahtung (MC-Zweig, lazy). Build grün, **391/391** Tests (13 neue). Badge
    „DRAG-MATCH", „KORREKTE ANTWORT HIERHER ZIEHEN", **4 Optionen A–D / 1 richtig**, Falsch-Feedback
    „FALSCH." + DEINE/RICHTIGE ANTWORT + „ERKLÄRUNG AUS DER KARTE", durchgängig **Mono-Schrift**.
    Optionen werden **gemischt + nach Position neu beschriftet** (kanonisch B erscheint im Screenshot
    als „D"), Korrektheit über **Identität**. → **eigener Studien-Renderer** (NICHT PBQ-`MatchingCard`!).
    *(Belege: `Drag-Match1_…`, `Drag-Match2_enabled_Fokus_mode.jpeg`, CSV `card_id 1779669260169`)*
  - **M3 Free Recall** ✅ (2026-06-10): `FreeRecallCard.tsx` — erinnern → aufdecken → selbst
    bewerten (Gewusst→1.0 / Nicht gewusst→0.0→Again). Encoding `RECALL:`-Präfix oder Tag
    `free-recall` (Definition: `docs/M3-free-recall.md`). ⚠️ **neu generiert, ohne Screenshot**.
- [x] **Fokus-Modus** ✅ (2026-06-10): `settings.focusMode` + Toggle in SettingsModal;
      Header in StudyView/ShuffleStudyView per `visibility` (invisible) ausgeblendet —
      Platz bleibt **reserviert**, kein Layout-Sprung; Zurück-Button bleibt sichtbar.
- [x] **Erfolgsmessung pro `cardId`** ✅ (2026-06-10): `buildCardSuccessStats` +
      `fetchCardSuccessStats` — Aggregation pro Card-ID (Variante), additiv; Reviews trugen
      `cardId` bereits, Gamification-Profil unverändert (Test belegt Gleichheit).
- [x] **Vorgehen:** Handy-Bundle existiert nicht (Nutzer-Entscheid) → komplett **aus Screenshots +
      Backup-Daten + Branch-Code** rekonstruiert; jede Übernahme in RECOVERY_LOG §4 belegt.
- **Abnahme Phase 2:** Features umgesetzt wie in den Screenshots ✅; Build grün ✅; **436/436 Tests** ✅.
  Seite-an-Seite-Sichtprüfung am Gerät = Teil von Phase 4.

---

## Phase 2 — Konkreter Arbeitsplan (✅ KOMPLETT umgesetzt 2026-06-10, Commits `e8f6dc5`…`52dd061`)

> Reihenfolge bewusst: erst die zwei kleinen, screenshot-belegten UI-Angleichungen (Schrift,
> Fokus-Modus), dann die Mess-Grundlage (cardId), dann die größeren Features. Nach **jedem**
> Schritt: `cd card_pwa && TZ=UTC npm run build && TZ=UTC npm test -- --run` grün + RECOVERY_LOG §4.
> Bestehende Logik bleibt **additiv** (Nutzer-Auflage). „M2 Drag-Match" + „M1 Flip" sind als
> Vorbild/Anker bereits vorhanden.

### A) M1/Studien-Schrift global auf Mono ✅ (Commit `e8f6dc5`)
*Befund 2026-06-10: `Default_Card_View…jpeg` (M1) rendert Frage/Antwort in **Mono** (Share Tech
Mono), aber `CardFace` nutzt `font-sans` (Space Grotesk). M2 ist schon Mono.*
- Dateien: [`CardFace.tsx`](../card_pwa/src/components/CardFace.tsx) (Frage-, Antwort-, Options-Text),
  zur Konsistenz prüfen: [`OrderingCard.tsx`](../card_pwa/src/components/OrderingCard.tsx),
  [`MatchingCard.tsx`](../card_pwa/src/components/MatchingCard.tsx).
- Schritte: `font-sans` in den **Studien**-Renderern → `font-mono` (Basisfont). Home/Settings/Editor
  **nicht** anfassen. Optional: Schalter, falls Sans bewusst bleiben soll (Default = Mono).
- Abnahme: Seite-an-Seite gegen `Default_Card_View…jpeg`; Build + Tests grün.

### B) Fokus-Modus ✅ (Commit `3cd0434`; belegt in allen 3 Karten-Screenshots)
*Header ausgeblendet, Platz aber **reserviert** → kein Layout-Sprung (große leere Fläche oben).*
- Dateien: [`StudyView.tsx`](../card_pwa/src/components/StudyView.tsx),
  [`ShuffleStudyView.tsx`](../card_pwa/src/components/ShuffleStudyView.tsx), `CardFace.tsx`,
  `StudyHeaderProgress`; Toggle in `SettingsModal`/`SettingsContext` (`settings.focusMode`).
- Schritte: Setting `focusMode: boolean` + Toggle; im Studien-Header Sichtbarkeit per
  `visibility:hidden`/`opacity-0` **statt** `display:none` (Höhe bleibt reserviert); Progress-Leiste
  analog. Karten-interner Header (A/B-Badge) bleibt — nur der **äußere** Session-Header geht weg.
- Abnahme: Toggle blendet Header aus, Karte springt **nicht**; Vergleich gegen die 3 Screenshots.

### C) Erfolgsmessung pro `cardId` (statt nur `noteId`) ✅ (Commit `3bd7f2b`)
*Nutzer bestätigt: eine Note kann mehrere Karten-Varianten haben; maßgeblich ist die Card-ID.*
- Dateien: [`db/queries/gamification.ts`](../card_pwa/src/db/queries/gamification.ts),
  [`utils/gamification.ts`](../card_pwa/src/utils/gamification.ts), Review-/Session-Recording
  [`services/StudySessionManager.ts`](../card_pwa/src/services/StudySessionManager.ts),
  Basis [`cardVariant.ts`](../card_pwa/src/utils/cardVariant.ts).
- Schritte: Review-Events/Statistik um `cardId` ergänzen (additiv, `noteId` behalten); Aggregation
  pro `cardId`. Tests in `__tests__/db`/`__tests__/services` erweitern.
- Abnahme: Metrik je Variante getrennt; bestehende Stats unverändert; Tests grün.

### D) M3 Free Recall ✅ (Commit `f7ca2be`; **kein Screenshot** → neu generiert, so markiert)
- Dateien: neuer Renderer `components/FreeRecallCard.tsx` (Vorbild: M2/Ordering), CardFace-Zweig,
  i18n (`freerecall_*`). Auswahl: Karten ohne Optionen, die als Free-Recall markiert sind
  (Format/Tag prüfen — sonst `docs/M3-free-recall.md` definiert das Encoding).
- Schritte: „erinnern → aufdecken → selbst bewerten" (Self-Rating mappt auf FSRS 1–4 via StudyView).
- Abnahme: Tests (Aufdecken-Pfad, Self-Rating → `onAnswerEvaluated`); in RECOVERY_LOG als
  **„neu generiert, ohne Original-Screenshot"** kennzeichnen.

### E) Dashboard-Kachel oben (KPI / Heatmap / Pilot / Clean) + Daily Quest ✅ (Commit `ed7ed7d`; Beleg `…23.36.20.jpeg`)
- Dateien: [`HomeView`](../card_pwa/src/components/HomeView.tsx) (+ `components/home/`), neue
  `HomeDashboardTile` mit 4 Modi; „Pilot" = Daily Quest („Jetzt: 25 Karten …" → „25 Karten starten",
  gemischte Session über mehrere Decks).
- Schritte: Topbar durch umschaltbare Kachel ersetzen (additiv); Modus in `settings`/lokalem State.
- Abnahme: 4 Modi umschaltbar; Daily Quest startet Misch-Session; Vergleich gegen Screenshot.

### F) Ansichten-Menü (Bottom-Sheet) ✅ (Bestand aus Branch + Clean/Labs-Einträge in `ed7ed7d`/`79c42f3`; Beleg `…23.40.53.jpeg`)
- ANSICHT = Decks / Nach Tags / Shuffle-Decks / Labs · SORTIERUNG = Name / Fällig ·
  DASHBOARD = KPI / Heatmap / Pilot / Clean.
- Dateien: `HomeView` + `components/home/HomeBottomBar.tsx` (Trigger), neues Bottom-Sheet.
- Abnahme: alle drei Gruppen schaltbar; Auswahl wirkt auf Home; Vergleich gegen Screenshot.

### G) Labs-Feature ✅ (Commit `79c42f3`; Inhalte 36/71, Rest per docs/labs.md; Belege `…23.38.26/.47/.57`, `…23.39.17/.49.jpeg`)
1. **Liste**: Reiter „Interaktive Sicherheits-Szenarien", Fortschritt (z. B. 4/71), Kategorien
   („Security-Grundlagen · 1/8"), Schwierigkeit **Einsteiger/Fortgeschritten/Experte**,
   „GESCHAFFT"-Status, Zeit (3–5 Min).
2. **Szenario-Detail**: Abschnitte **BEWEISMATERIAL / NETZWERKTOPOLOGIE / Ziel**, Interaktion
   **Dropdown-Zuordnung** *oder* **Drag-Reihenfolge** + Button **„Antwort prüfen"** — baut auf
   `MatchingCard`/`OrderingCard` + `pbqScoring.ts` auf.
3. **71 Inhalte**: SY0-701, alle Domains, Schwerpunkt **Firewalls / Incident Response**. Backup
   hat nur ~28 PBQ-Karten → Rest per `docs/labs.md` **neu generieren** (so markieren).
- Abnahme: Liste + Detail + „Antwort prüfen" funktionieren; Inhalte vorhanden; Tests grün.

### H) Push `origin/main` ⛔ **WEITER BLOCKIERT (Nutzer-Aktion)**
- Phase-1-Stand wurde gepusht (`origin/main` = `0326e4e`), aber die **7 Stage-2-Commits**
  (`e8f6dc5` Mono, `3cd0434` Fokus, `3bd7f2b` cardId, `f7ca2be` M3, `ed7ed7d` Dashboard,
  `79c42f3` Labs, `52dd061` docs/) sind nur lokal — vom Pi aus weiterhin **keine Credentials**
  (geprüft 2026-06-10: `git push` → could not read Username). Sobald PAT/SSH da:
  `git push origin main` (kein Force, Historie erhalten).

---

## Phase 2b – KI-Autoren-Doku pro Modus (`docs/`) ✅ ERLEDIGT (Commit `52dd061`)

`docs/` existiert nirgends in Git → **neu schreiben** (Entscheidung Abschnitt 4) und committen.
Zweck: reproduzierbare KI-gestützte Content-Erstellung pro Lernmodus.

- [x] Pro Modus eine Datei: `docs/M1-flip.md`, `docs/M2-drag-match.md`, `docs/M3-free-recall.md`,
      `docs/shuffle.md`, `docs/labs.md`. ✅ (Repo-Wurzel `docs/`)
- [x] Jede Doku enthält: **Zweck**, **Eingabe-/Encoding-Format**, **Dos & Don'ts**,
      Schwierigkeits-/Längen-Vorgaben, **Beispiel-Prompt + Beispiel-Output**. ✅
- [x] `docs/labs.md`: SY0-701, alle Domains, Schwerpunkt Firewalls / Incident Response;
      Szenario-Struktur + Schwierigkeitsstufen + Invarianten (testgesichert) reproduzierbar. ✅
- [x] `docs/` versioniert & committet (`52dd061`); **Push siehe H (blockiert)**.
- **Abnahme Phase 2b:** Für jeden Modus erzeugt die Doku mit einem Beispiel-Prompt valide Inhalte
      im jeweils korrekten Encoding.

---

## Phase 3 – Daten wiederherstellen (Karten + Fortschritt)

> Reihenfolge-Regel (Hard Rule 2): **Erst Server/DB aus Backup befüllen, dann Handy syncen lassen.**

- [ ] Backup importieren (`card_pwa` `ImportView` / `utils/dbBackup.ts`, Header `#card-pwa:backup-v1`).
      Stellt wieder her: **779 Karten**, **33 Decks** (Schemata `sy0-701-objective-x-y` „1.1 …" +
      numerische Alt-IDs „01_General_Security_Concepts …"), **FSRS-Status** je Karte, **Settings**
      `{"language":"de","algorithm":"fsrs"}`.
- [ ] **CSV** als Autoren-/Diff-/Re-Import-Quelle nutzen (`…T21-54-32.csv`; Header:
      `card_id,note_id,deck_id,deck_name,front,back,tags,acronym,examples,port,protocol,type,queue,
      due,interval,factor,reps,lapses,created_at`).
- [ ] PBQ-Karten prüfen (Decks `pbq-test-deck-001` „Interaktive Übungen", `sy0-701-acronyms-bonus`).
- [ ] `sync.db` vor jeder Schreibaktion kopieren; danach Server aus Backup befüllen; **erst dann**
      Handy reconnecten.
- **Abnahme Phase 3:** 779 Karten / 33 Decks in der App; FSRS-Fälligkeiten plausibel; PBQ-Karten rendern.

---

## Phase 4 – Abnahme / Definition of Done (gegen Screenshots verifizieren)

- [ ] Home ohne Topbar, nur Dashboard-Kachel + Bottom-Bar (Sync, Filter, Settings, Streak 🔥, „+").
- [ ] Deck-Karten: Subdeck-Zähler + 3 Spalten (neu/lernen/review) für „Heute fällig" & „Morgen".
- [ ] Daily Quest (Pilot) startet gemischte Session über mehrere Decks.
- [ ] Labs: Liste, Schwierigkeitsgrade, „GESCHAFFT", Szenario-Detail mit „Antwort prüfen".
- [ ] M1 (Rating-Leiste), M2 (Drag-Match + Falsch-Feedback), M3 greifen je Kartentyp; Fokus-Modus ohne Sprung.
- [ ] Sync-Status in den Einstellungen sichtbar.
- [ ] Ansichten / Sortierung / Dashboard-Umschalter funktionieren.
- [ ] **Gesamt:** `main` gebaut, getestet, gepusht; Daten importiert; `docs/` vorhanden;
      RECOVERY_LOG §4 lückenlos (jede Wiederherstellung mit Beleg). Build läuft auf **:8444**,
      `:8443` weiterhin frei bis zum bewussten Re-Deploy des neuen Builds.

---

## Referenz – Daten- & Feature-Inventar (aus der Sichtung, belegt)

**Karten-Schema (Backup-Meta, base64-JSON pro Karte):**
`id, noteId, deckId, front, back, tags[], extra{acronym,examples,port,protocol}, type, queue,
due, dueAt, interval, factor, stability, difficulty, reps, lapses, createdAt, updatedAt,
algorithm, isDeleted, metadata{}` + `deckName`.
- `type/queue`: **SRS-Zustand** (0 = neu → 655, 2 = review → 124). **Nicht** das Anzeige-Format.
- `metadata.format` (selten, z. B. `"abcd"`) markiert PBQ/MC-Format.
- `extra.port/protocol`: im Backup leer (für Port-Zuordnungs-Übungen vorgesehen).

**Studien-Formate (M1/M2/M3) — wie die App das Format je Karte wählt:**
- **M1 Flip** = Default/Fallback für jede Karte. Rating 1–4 (Nochmal/Schwer/Gut/Leicht → FSRS).
- **M2 Drag-Match** = nur Karten mit **4 Optionen (A–D) / 1 richtig**. Optionen aus `front`,
  richtige Antwort aus `back` (`>> CORRECT: X | …`). Eigener Renderer, **≠ PBQ-MatchingCard**.
- **M3 Free Recall** = freies Erinnern + Selbstbewertung.
- **Fokus-Modus** ist orthogonal: blendet Header aus, reserviert den Platz (kein Sprung).

**PBQ-Interaktiv-Karten (für Labs) = Text-Encoding in `front`/`back`:**
- Zuordnung: `front: "MATCHING:\n<Aufgabe>\n\nKEY >> VALUE\n…"` · `back: "KEY = VALUE\n…"`
- Reihenfolge: `front: "ORDERING:\n<Aufgabe>\n\n1) … 2) …"` · `back: "CORRECT_ORDER: 2,3,1,4,5,6\n…"`
- Tags u. a. `PBQ`, `Drag-Drop`. → Renderer `MatchingCard`/`OrderingCard`, Scoring `pbqScoring.ts`.

**Neue Dateien, die der Branch schon liefert (Phase 1):**
`components/home/HomeBottomBar.tsx`, `HomeReviewSection.tsx`, `HomeTagBrowseSection.tsx`,
`components/MatchingCard.tsx`, `components/OrderingCard.tsx`, `hooks/home/useTagCardIndex.ts`,
`hooks/useAutoJoinDefaultProfile.ts`, `hooks/useViewportSafeArea.ts`, `services/deckHierarchy.ts`,
`utils/cardVariant.ts`, `utils/deckContentScope.ts`, `utils/pbqScoring.ts`, `utils/reviewDecks.ts`,
`utils/securityDeckHierarchy.ts` (+ Tests).

**Restliche offene Punkte (nicht blockierend):**
- [ ] Wurden mit dem Handy-Build **Sourcemaps** ausgeliefert/gecacht? (entscheidet: Original-TS
      vs. nur minifizierter JS) — erst nach Bundle-Export beantwortbar.
- [ ] M3 Free-Recall-Screen + Settings/Sync-Status bisher ohne Screenshot-Beleg.
