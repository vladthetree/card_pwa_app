# Card PWA — Verbesserungsbericht

Stand: 2026-06-10. Basis: aktueller Worktree in `/home/_vb/card_pwa_app`,
Restore-Dokumente, Build-/Teststatus und Code-Sichtung.

Aktualisierung nach Umsetzung:
- `npm run validate:cards` prueft das echte Restore-TXT, Zaehler, M2-Shape und
  Labs-Quellen.
- `scripts/verify-setup.sh` prueft Setup-/Ops-Skripte, Port 8444 und
  idempotente Service-/Env-Konfiguration.
- `verify:phase5` nutzt den stabilen Vitest-Timeout ueber `vitest.config.ts`.
- Der TXT-Backup-Parser kann mehrzeilige `front/back/tags/card-pwa-meta`-Bloecke
  aus echten PWA-Backups lesen.

Nicht Teil dieses Berichts:
- keine Browser-E2E-Suite als Ziel
- kein Audio-Feature
- kein Audit-Dashboard in der App

## Kurzfazit

Die App ist fachlich schon weit: lokale PWA, FSRS/SM-2, Import, Sync-Server,
mehrere Studienmodi, Labs, viele Unit-/Integrationstests und ein funktionierender
Production-Build. Die effektivsten Verbesserungen liegen jetzt nicht in neuen
Features, sondern in vier Bereichen:

1. Daten-Restore und Sync-Sicherheit abschliessen.
2. Setup/Release wirklich reproduzierbar machen.
3. Grosse Codebereiche schneiden, damit Aenderungen weniger riskant werden.
4. Karten-/Labs-Qualitaet maschinell pruefbar machen.

## Evidenz aus dem aktuellen Stand

- `card-sync-server/sync.db` existiert, ist aber leer: `server_cards`,
  `server_decks`, `server_reviews`, `users`, `devices`, `sync_operations` und
  `server_shuffle_collections` jeweils `0`.
- Restore-Quellen existieren in `Project_Restore/`: TXT-Backup ca. 1.6 MB,
  CSV-Backup ca. 605 KB, laut Runbook 779 Karten / 33 Decks.
- Frontend-Build ist erfolgreich; `dist/` liegt bei ca. 6.6 MB.
- Tests: 69 Testdateien im Repo; letzter voller stabiler Lauf:
  `TZ=UTC npm test -- --run --testTimeout 10000` = 66 Testdateien, 455 Tests
  gruen. Der Standard-5s-Lauf kann an `home-view-shell.test.tsx` timeouten.
- `npm run validate:cards`: 779/779 Karten, 33/33 Decks, Labs 71/71; 68
  Warnungen fuer MC-aehnliche Karten mit 5 Optionen, keine Fehler.
- Groesste Code-/Datenbereiche:
  - `src/data/labScenarios.ts` ca. 1970 Zeilen
  - `src/components/SettingsModal.tsx` ca. 1526 Zeilen
  - `src/services/syncPull.ts` ca. 1219 Zeilen
  - `src/components/StudyView.tsx` ca. 1103 Zeilen
  - `src/components/ProfileSyncSection.tsx` ca. 986 Zeilen

## Priorisierte Verbesserungen

### P0 — Daten-Restore als gefuehrten, sicheren Prozess abschliessen

**Warum wirksam:** Solange die Sync-DB leer ist, ist der wertvollste Zustand
weiterhin das Backup. Das ist das groesste reale Risiko.

**Verbesserung:**
- Einen klaren Restore-Pfad definieren: Backup pruefen, DB sichern, Import
  ausfuehren, Zaehler validieren, erst danach Handy-Sync erlauben.
- Optional ein CLI-Tool bauen, das das vorhandene `card-pwa-meta`-TXT oder JSON
  in `sync.db` importiert. Nicht als App-Feature, sondern als Wartungswerkzeug.
- Vor dem Import immer automatisch eine DB-Kopie erzeugen.
- Nach dem Import harte Validierung:
  - 779 Karten
  - 33 Decks
  - keine leeren Front-/Back-Felder
  - FSRS-Algorithmus und Scheduling-Felder plausibel
  - M2-Karten: exakt 4 Optionen und genau 1 Correct-Marker
  - PBQ-/Labs-Karten renderbar/parsingfaehig

**Erwarteter Effekt:** Datenverlust-Risiko sinkt stark, Phase 3 wird sauber
abschliessbar.

**Aufwand:** Mittel.

**Konkrete Dateien/Orte:**
- `Project_Restore/card-pwa-backup-*.txt`
- `card_pwa/scripts/validate-cards.mjs`
- `card_pwa/src/utils/import/csvImporter.ts`
- `card_pwa/src/utils/dbBackup.ts`
- `card-sync-server/sync_server.py`
- `card-sync-server/maintenance/db-tools/`

### P0 — Sync-Schutz gegen "leerer Server ueberschreibt Client"

**Warum wirksam:** Die Hard Rule verhindert genau dieses Risiko manuell. Besser
ist ein technischer Schutz.

**Verbesserung:**
- Aktueller Befund: Der Server-Handschlag hat bereits eine Schutzlogik
  `server-empty-client-has-data` und der Client bricht leere Snapshots ab, wenn
  lokal Daten vorhanden sind.
- Sync-Server oder Sync-Client blockiert Pull/Push, wenn Server leer ist und der
  Client offensichtlich lokale Daten hat, solange kein expliziter Restore-Status
  gesetzt ist.
- Server kann einen `restore_required`-/`empty_server`-Status in `/health` oder
  `/sync/handshake` melden.
- UI darf dann nur warnen, aber nicht automatisch syncen.

**Erwarteter Effekt:** Ein Fehlklick oder Auto-Sync kann die Handy-Daten nicht
wegdruecken.

**Aufwand:** Mittel.

**Konkrete Dateien/Orte:**
- `card-sync-server/sync_server.py`
- `card_pwa/src/services/syncCoordinator.ts`
- `card_pwa/src/services/syncReachability.ts`
- `card_pwa/src/components/ProfileSyncSection.tsx`

### P1 — Setup und Release auf einen einzigen verifizierten Pfad bringen

**Warum wirksam:** Das Setup soll nach GitHub-Clone automatisch laufen. Aktuell
gibt es mehrere Skripte, historische Wrapper und Port-Sonderregeln.

**Verbesserung:**
- `setup.sh` als offiziellen Einstieg dokumentieren.
- `npm run verify:phase5` ist auf stabilen Vitest-Lauf aktualisiert.
- `scripts/verify-setup.sh` ist als nicht-destruktiver Setup-Check vorhanden.
- Root-Wrapper und Service-Skripte auf klare Rollen reduzieren:
  - `setup.sh`: Erstinstallation
  - `deploy_prod.sh`: kontrolliertes Deploy
  - `stop-server.sh`: kontrolliertes Stoppen
- `scripts/verify-setup.sh` ohne E2E prueft:
  - Shell-Syntax pruefen
  - notwendige Tools pruefen
  - Ports anzeigen
  - Zertifikate vorhanden
  - systemd-Units zeigen auf aktuellen Clone-Pfad

**Erwarteter Effekt:** Weniger "geht auf meinem Pi, aber nicht nach Clone".

**Aufwand:** Klein bis Mittel.

**Konkrete Dateien/Orte:**
- `setup.sh`
- `deploy_prod.sh`
- `stop-server.sh`
- `card_pwa/package.json`
- `card-sync-server/ops/`

### P1 — Teststabilitaet ohne E2E verbessern

**Warum wirksam:** Der volle Standard-Testlauf ist knapp instabil, obwohl die
Logik gruen ist. Das verlangsamt jede weitere Arbeit.

**Verbesserung:**
- `vitest.config.ts` setzt global `testTimeout: 10000`.
- `verify:phase5` laeuft mit `TZ=UTC` und stabilem Timeout.
- Optional bleibt: den langsamen `home-view-shell.test.tsx` auf kleinere
  Einheiten schneiden.
- Keine Browser-E2E-Suite noetig; vorhandene Unit-/Integrationstests reichen
  fuer dieses Projekt aktuell aus, wenn sie stabil laufen.

**Erwarteter Effekt:** Weniger Scheinfehler, schnellere Entscheidungen.

**Aufwand:** Klein.

**Konkrete Dateien/Orte:**
- `card_pwa/vitest.config.ts`
- `card_pwa/src/__tests__/integration/home-view-shell.test.tsx`
- `card_pwa/package.json`

### P1 — Grosse Komponenten und Services schneiden

**Warum wirksam:** Die groessten Dateien sind Aenderungsrisiken. Gerade Settings,
Sync und Study sind zentrale Flaechen.

**Verbesserung:**
- `SettingsModal.tsx` in Sektionen auslagern:
  - Lernen/Algorithmus
  - Darstellung/Fokus
  - Sync/Profile
  - Notifications/PWA
  - Daten/Export
- `StudyView.tsx` und `ShuffleStudyView.tsx` weiter angleichen:
  - gemeinsame Session-Hooks
  - gemeinsamer Rating-/Answer-Pfad
  - weniger doppelte Branches
- `syncPull.ts` in normalisierte Schritte trennen:
  - Fetch/Transport
  - Snapshot-Normalisierung
  - Konflikt-/Operation-Apply
  - Logging/Telemetry

**Erwarteter Effekt:** Weniger Regressionen bei neuen Kartenmodi, Sync-Fixes und
Settings-Aenderungen.

**Aufwand:** Mittel bis Hoch, aber gut inkrementell machbar.

**Konkrete Dateien/Orte:**
- `card_pwa/src/components/SettingsModal.tsx`
- `card_pwa/src/components/StudyView.tsx`
- `card_pwa/src/components/ShuffleStudyView.tsx`
- `card_pwa/src/services/syncPull.ts`

### P1 — Karten- und Modus-Validator als Wartungswerkzeug

**Warum wirksam:** Das Projekt lebt von Kartenqualitaet. Fehler in Karten sind
fuer den Nutzer sichtbarer als kleine Codefehler.

**Verbesserung:**
- Das Node-Script `card_pwa/scripts/validate-cards.mjs` prueft Backup/Import
  und lokale Szenarien:
  - M1: keine unerwarteten PBQ-/MC-Marker
  - M2: genau 4 Optionen A-D, genau 1 Correct-Marker, keine Buchstaben-Bezuege
    in der Erklaerung
  - M3: `RECALL:` oder Tag `free-recall`
  - Ordering: `correctOrder` nicht zufaellig identisch sortiert
  - Matching: beide Seiten vollstaendig
  - Labs: jede Quelle vorhanden, jede Kategorie sinnvoll verteilt
- Ausgabe als CLI-Bericht, nicht in der App.

**Erwarteter Effekt:** Neue Karten koennen schnell erzeugt und geprueft werden,
ohne die App aufzublaehen.

**Aufwand:** Mittel.

**Konkrete Dateien/Orte:**
- `docs/M1-flip.md`
- `docs/M2-drag-match.md`
- `docs/M3-free-recall.md`
- `docs/labs.md`
- `card_pwa/src/utils/cardTextParser.ts`
- `card_pwa/src/data/labScenarios.ts`

### P2 — Sync-Sicherheit konfigurativ haerten

**Warum wirksam:** Die App laeuft im Heimnetz. Trotzdem ist "offen im LAN" ein
echtes Risiko, sobald Geraete oder Netze wechseln.

**Verbesserung:**
- `SYNC_API_TOKEN` nicht nur optional dokumentieren, sondern im Setup aktiv
  erzeugen oder bewusst bestaetigen lassen.
- CORS nicht dauerhaft `*`, sondern Frontend-Origin(s) aus `.env.sync-server`.
- Health-Endpunkt oeffentlich lassen, mutierende Sync-Endpunkte schuetzen.

**Erwarteter Effekt:** Weniger Risiko durch fremde Requests im LAN.

**Aufwand:** Mittel.

**Konkrete Dateien/Orte:**
- `setup.sh`
- `card-sync-server/sync_server.py`
- `card_pwa/src/services/syncConfig.ts`

### P2 — Production-Build kleiner und sauberer ausliefern

**Warum wirksam:** `dist/` enthaelt Source Maps. Fuer lokale Entwicklung ist das
praktisch, fuer produktive Auslieferung aber groesser und informativer als noetig.

**Verbesserung:**
- Pruefen, ob Production-Deploy Source Maps wirklich ausliefern soll.
- Falls nein: Source Maps nur fuer Debug-Builds erzeugen oder im Deploy
  entfernen.
- Chunk-Groessen beobachten: `HomeView`, `LabsView`, `SettingsModal` sind die
  wichtigsten UI-Brocken.

**Erwarteter Effekt:** Kleinerer Download, weniger Offenlegung interner Struktur,
weniger Cache-Druck.

**Aufwand:** Klein.

**Konkrete Dateien/Orte:**
- `card_pwa/vite.config.ts`
- `card_pwa/scripts/prod-server.mjs`
- `card_pwa/dist/assets/`

### P2 — Import-UX verbessern, ohne neue App-Komplexitaet zu erzeugen

**Warum wirksam:** Import ist ein kritischer Workflow. Fehler muessen sichtbar
sein, bevor geschrieben wird.

**Verbesserung:**
- Import-Preview mit:
  - Anzahl Decks/Karten
  - erkannter Backup-Typ
  - Algorithmus-Verteilung
  - Anzahl Konflikte/Duplikate
  - Anzahl Karten je Modus
- "Dry run" intern erzwingen, bevor Daten persistiert werden.
- Nach Import eine Export-/Backup-Erinnerung anzeigen.

**Erwarteter Effekt:** Weniger Unsicherheit bei Restore und Re-Import.

**Aufwand:** Mittel.

**Konkrete Dateien/Orte:**
- `card_pwa/src/components/ImportView.tsx`
- `card_pwa/src/utils/import/importPipeline.ts`
- `card_pwa/src/utils/import/csvImporter.ts`
- `card_pwa/src/utils/dbBackup.ts`

### P2 — Accessibility fuer Drag/Ordering absichern

**Warum wirksam:** Die App ist stark interaktiv. Drag-only ist auf Touch zwar
nett, aber Keyboard/Screenreader/Reduced-Motion sollten nicht kaputtgehen.

**Verbesserung:**
- Drag-Match und Ordering immer auch per Tap/Buttons bedienbar halten.
- ARIA-Labels fuer Drop-Zonen/Optionen pruefen.
- Reduced-Motion in den Studienrenderern konsequent respektieren.

**Erwarteter Effekt:** Robustere Nutzung auf iPhone, iPad, Desktop und bei
eingeschraenkter Motorik.

**Aufwand:** Klein bis Mittel.

**Konkrete Dateien/Orte:**
- `card_pwa/src/components/DragMatchCard.tsx`
- `card_pwa/src/components/OrderingCard.tsx`
- `card_pwa/src/components/MatchingCard.tsx`

### P3 — CI ohne E2E einrichten

**Warum wirksam:** Der Repo-Zustand ist aktuell lokal wertvoll, aber Push/CI
fehlt als Sicherheitsnetz.

**Verbesserung:**
- GitHub Actions nur fuer:
  - `npm ci`
  - `TZ=UTC npm run build`
  - `TZ=UTC npm test -- --run --testTimeout 10000`
  - optional Shell-Syntaxcheck
- Kein Playwright, kein Browser-E2E.

**Erwarteter Effekt:** Jeder Push beweist Build/Test-Faehigkeit.

**Aufwand:** Klein.

**Konkrete Dateien/Orte:**
- `.github/workflows/ci.yml`
- `card_pwa/package.json`
- `setup.sh`

## Reihenfolge, die ich empfehlen wuerde

### Woche 1: Risiko runter

1. Daten-Restore fertigstellen und Zaehler beweisen.
2. Sync-Schutz gegen leeren Server einbauen.
3. `verify:phase5` stabilisieren.
4. Ungepushte Commits pushen oder exportierbaren Patch erzeugen.

### Woche 2: Wartbarkeit hoch

1. `SettingsModal` schneiden.
2. `StudyView`/`ShuffleStudyView` gemeinsame Logik extrahieren.
3. Karten-/Modus-Validator als CLI bauen.

### Danach: Komfort und Feinschliff

1. Import-Preview verbessern.
2. Source-Map-/Production-Auslieferung klaeren.
3. Sync-Konfiguration haerten.
4. Accessibility fuer Drag/Ordering nachziehen.

## Dinge, die ich nicht priorisieren wuerde

- Browser-E2E: aktuell nicht der beste Aufwand/Nutzen-Hebel.
- Audio-Features: fuer Security+-Karteikarten nicht noetig.
- In-App-Audit-/Admin-Dashboard: wuerde die Lern-App aufblasen; besser als
  CLI-/Markdown-/Log-Bericht ausserhalb der App.
- Grosse visuelle Neugestaltung: erst Restore, Sync und Wartbarkeit stabilisieren.
- Weitere neue Lernmodi: M1/M2/M3/PBQ/Labs reichen. Qualitaet der bestehenden
  Modi ist jetzt wertvoller als ein vierter Modus.

## Definition of Done fuer den naechsten sinnvollen Meilenstein

- Backup importiert oder Restore-Tool fertig.
- `sync.db` enthaelt erwartete Karten-/Deckzahlen.
- Handy-Sync erst nach belegtem Import erlaubt.
- `TZ=UTC npm run build` gruen.
- `TZ=UTC npm test -- --run --testTimeout 10000` gruen.
- Setup-Hilfe nennt 8444 und der installierte Service nutzt 8444.
- Kartenmodus-Doku, Code-Erkennung und Validator widersprechen sich nicht.
