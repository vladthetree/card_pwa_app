# Wiederherstellung Card PWA — Runbook für die ausführende KI

> ⏩ **AKTUELLER STAND / ÜBERGABE:** Siehe [`HANDOFF.md`](./HANDOFF.md) — Phase 1 ist lokal fertig
> (Push offen, Credentials fehlen), Stage 2 steht beim M2 Drag-Match-Renderer (Recherche fertig).

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
- [ ] **`main` pushen** → **BLOCKIERT: keine GitHub-Credentials** auf dem Pi (kein gh/SSH/Token).
      *Nutzer-Aktion nötig: PAT/SSH bereitstellen, dann `git push origin main`.*
- **Abnahme Phase 1:** Build + Tests grün ✅; `main` enthält neue Dateien ✅; **gepusht: offen** ⏳.

---

## Phase 2 – Lücke 17. Mai → 8. Juni aus dem Handy rekonstruieren

Diese Features sind in den Screenshots belegt, aber **noch nicht im Branch**
(`git grep` im Branch = 0 Treffer für „Labs", „Szenarien", „Antwort prüfen", „DRAG-MATCH"):

- [ ] **Labs** – Reiter „Interaktive Sicherheits-Szenarien", Fortschritt (z. B. 4/71),
      Kategorien (z. B. „Security-Grundlagen · 1/8 Szenarien"), Schwierigkeit
      **Einsteiger / Fortgeschritten / Experte**, „GESCHAFFT"-Status, Zeit (3–5 Min).
      *(Belege: `WhatsApp …23.38.26/.47/.57/.39.17/.39.49.jpeg`)*
- [ ] **Szenario-Detail**: Abschnitte **BEWEISMATERIAL** / **NETZWERKTOPOLOGIE** / **Ziel**,
      Interaktion **Dropdown-Zuordnung** *oder* **Drag-Reihenfolge** + Button **„Antwort prüfen"**.
      Baut auf `MatchingCard`/`OrderingCard` (Phase 1) auf.
- [ ] **71 Labs-Szenarien (Inhalt)**: Basis **CompTIA SY0-701**, alle Domains, Schwerpunkt
      **Firewalls / Incident Response** (vom Nutzer bestätigt). Im Backup liegen nur ~28
      PBQ-Karten → der Rest kommt aus dem **Handy-Bundle** oder wird per `docs/labs.md` neu generiert.
- [ ] **Dashboard-Kachel oben** (statt Topbar), umschaltbar: **KPI / Heatmap / Pilot / Clean**.
      „Pilot" = **Daily Quest** („Jetzt: 25 Karten …", „25 Karten starten"). *(Beleg: `…23.36.20.jpeg`)*
- [ ] **Ansichten-Menü** (Bottom-Sheet): ANSICHT = Decks / Nach Tags / Shuffle-Decks / Labs;
      SORTIERUNG = Name / Fällig; DASHBOARD = KPI / Heatmap / Pilot / Clean. *(Beleg: `…23.40.53.jpeg`)*
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
  - **M3 Free Recall**: frei erinnern → aufdecken → selbst bewerten. *(noch ohne Screenshot)*
- [ ] **Fokus-Modus**: blendet Karten-Header aus; Platz bleibt **leer aber reserviert**
      (kein Layout-Sprung). *(Belegt in allen 3 neuen Screenshots, große leere Fläche.)*
- [ ] **Erfolgsmessung pro `cardId`** (nicht nur `noteId`): eine Karte kann **mehrere Varianten**
      haben; maßgeblich ist die **Card-ID** (Nutzer bestätigt). Grundlage: `cardVariant.ts` (Phase 1).
- [ ] **Vorgehen:** Handy-Bundle gegen Branch-Build diffen → fehlende Logik aus Sourcemaps
      übernehmen; wo keine Sourcemap, anhand Screenshots nachbauen. Jede Übernahme in RECOVERY_LOG §4.
- **Abnahme Phase 2:** Alle obigen Features sichtbar/funktional wie in den Screenshots; Tests grün.

---

## Phase 2b – KI-Autoren-Doku pro Modus (`docs/`) NEU erstellen

`docs/` existiert nirgends in Git → **neu schreiben** (Entscheidung Abschnitt 4) und committen.
Zweck: reproduzierbare KI-gestützte Content-Erstellung pro Lernmodus.

- [ ] Pro Modus eine Datei: `docs/M1-flip.md`, `docs/M2-drag-match.md`, `docs/M3-free-recall.md`,
      `docs/shuffle.md`, `docs/labs.md`.
- [ ] Jede Doku enthält: **Zweck**, **Eingabe-/Encoding-Format** (siehe Referenz unten),
      **Dos & Don'ts**, Schwierigkeits-/Längen-Vorgaben, **Beispiel-Prompt + Beispiel-Output**.
- [ ] `docs/labs.md`: SY0-701, alle Domains, Schwerpunkt Firewalls / Incident Response;
      Szenario-Struktur (BEWEISMATERIAL/NETZWERKTOPOLOGIE/Ziel) + Schwierigkeitsstufen reproduzierbar.
- [ ] `docs/` versionieren, **committen & pushen**.
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
