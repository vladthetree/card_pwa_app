# Card PWA — TODO (konsolidiert)

> Stand: **2026-06-11**. Dieses Dokument ersetzt `HANDOFF.md` und `RECOVERY_LOG.md` —
> die vollständige Wiederherstellungs-Historie samt Belegen liegt in der Git-Historie
> (beide Dateien bis Commit `f72ffd6` versioniert). Hier stehen nur noch:
> aktueller Status, bindende Regeln und **offene Arbeit**.

---

## Status (verifiziert 2026-06-11)

- ✅ **Code komplett wiederhergestellt & gepusht:** `main` = `origin/main` = `f72ffd6`,
  Working Copy sauber. Enthalten: Branch-Restore (17. Mai), Stage 2 komplett (Mono,
  Fokus-Modus, cardId-Metrik, M2 Drag-Match, M3 Free Recall, Daily Quest/Clean-Dashboard,
  Ansichten-Menü), Labs **71/71** mit Quellen-Registry, `docs/`-Autorendoku, Setup-Härtung.
- ✅ Tests: `TZ=UTC npm test -- --run --testTimeout 10000` → **455/455 grün**.
- ✅ `npm run validate:cards`: 779/779 Karten, 33/33 Decks, 71/71 Labs, **0 Fehler**
  (68 Warnungen: MC-Karten mit 5 Optionen, siehe Backlog).
- ✅ **Beide Services laufen wieder** (gestartet 2026-06-11 19:30): `card-sync-server`
  :8787 (Health ok) und `card-pwa-prod` :8444 (HTTP 200). `:8443` frei = Hard Rule 1 intakt.
- ⚠️ **IP-Änderung (Befund 2026-06-11):** Der Pi hat jetzt **192.168.178.2** (nicht mehr
  `.250` wie in den Restore-Dokumenten). App-Adresse: **`https://192.168.178.2:8444`**.
  Das Prod-Zertifikat enthält die neue IP bereits (SAN, gültig bis 2027-06).
  `deploy_prod.sh` ermittelt die LAN-IP jetzt zur Laufzeit und druckt am Ende die
  klickbare Adresse. Folge für Hard Rule 1: die alte Handy-Origin
  `https://192.168.178.250:8443` ist ohnehin unerreichbar, solange die IP nicht `.250` ist.
- ✅ **sync.db ist befüllt** (2026-06-11): 779 Karten / 35 Decks / 1593 Sync-Ops unter dem
  Default-Profil; Validierung 0 Fehler. Die Backups in `Project_Restore/` bleiben read-only
  (Hard Rule 3) — sie sind weiterhin der kanonische Wiederherstellungspunkt.

---

## Verbindliche Entscheidungen (Nutzer, 2026-06-11)

- **Es kommen KEINE weiteren Informationen vom Handy** (keine zusätzlichen Screenshots,
  Exporte oder Bundle-Daten). Die 10 Screenshots in `Project_Restore/` sind die
  **vollständige und verbindliche UI-Referenz**.
- **Die UI wird so nah wie möglich an den Screenshots nachgebaut.** Wo kein Screenshot
  existiert (z. B. M3, Settings-Detail), gilt: plausibel im Stil der belegten Ansichten,
  als „neu generiert" markiert.
- Bestätigt vom Nutzer: Auf dem 8.-Juni-Stand war die **Topbar entfernt**; der
  Online/Offline-Status liegt in den Optionen (Profil & Sync), Add/Streak/Optionen/
  Settings liegen in der **Bottom-Bar** (Beleg: `…23.36.20.jpeg`).

## Hard Rules (weiter bindend)

1. **`192.168.178.250:8443` bleibt FREI**, bis der neue Build bewusst dorthin deployed wird.
   Die Handy-PWA hängt an dieser Origin — ein alter Build dort würde beim nächsten
   Online-Öffnen den Handy-Stand überschreiben. Dev/Prod läuft auf **:8444**.
2. **Handy NICHT mit leerem Sync-Server syncen.** Erst Server/App aus Backup befüllen,
   dann syncen.
3. **`Project_Restore/`-Artefakte read-only** (Backups `.txt`/`.csv`, Screenshots =
   einzige Off-Phone-Kopie). Nur kopieren, nie überschreiben/verschieben.
4. **Git-Historie erhalten:** kein Squash, kein Force-Push.
5. **Vor jeder Schreibaktion an `sync.db`: Kopie anlegen.**
6. Tests immer mit **`TZ=UTC`** (1 Test ist TZ-abhängig, kein Logikfehler).

---

## Offene Arbeit (in dieser Reihenfolge)

### 1. Services starten ✅ ERLEDIGT (2026-06-11 19:30)

- [x] `card-sync-server.service` läuft (:8787); Health-Check liefert
      `{"ok": true, "service": "card-pwa-sync"}`.
- [x] `card-pwa-prod.service` läuft (:8444, HTTP 200).
- [x] `./scripts/verify-setup.sh` → 0 Fehler / 0 Warnungen; nur :8444 + :8787
      lauschen, `:8443` frei (Hard Rule 1 intakt).

### 2. Daten-Import (ehem. Phase 3) ✅ SERVER BEFÜLLT (2026-06-11 ~19:45)

- [x] DB-Sicherungen vor dem Schreiben (Hard Rule 5):
      `backups/sync.db.before-import-20260611T193046` +
      `backups/db/sync.db.20260611_194334.pre-restore-import.sqlite` (manage_db_backups).
- [x] **Server aus TXT-Backup befüllt** — neues Wartungswerkzeug
      `card-sync-server/scripts/import_card_pwa_backup.py` (liest die kanonischen
      `card-pwa-meta`-Blöcke, schreibt über `apply_operation()` = identischer Pfad wie
      Client-Push, idempotent, mit `--dry-run`). Ergebnis:
      **779 Karten** (655 neu / 124 review, alle `fsrs`, `stability`/`dueAt` 779/779),
      **35 aktive Decks** (33 aus Backup + `4.2`/`4.9` vom Server-Hierarchie-Seeder,
      Roots/Subdecks korrekt verknüpft), **1593 Sync-Ops** publiziert
      (`publish_current_state_to_sync.py`).
- [x] Validiert: Server-Validator (`import_apkg.py` ohne Dateien) → 779 geprüft,
      756 MC / 23 Basic, **0 Fehler** (deckt sich mit der dokumentierten Analyse).
      Stichprobe ZTNA-Karte `1779669260169` korrekt (deck 1.2, `>> CORRECT: B`).
      Server nach Import neu gestartet, Health ok.
- [ ] Browser/App gegenprüfen: App auf :8444 öffnen → Default-Profil verbinden (Auto-Join)
      → Sync-Pull → 779 Karten / 33+2 Decks sichtbar, Fälligkeiten plausibel, PBQ-Karten
      (`pbq-test-deck-001`, `sy0-701-acronyms-bonus`) rendern.
      Hinweis: App-Settings (`language=de`, `algorithm=fsrs`) sind client-seitig — sie
      kommen nicht über den Server-Import; bei Bedarf in den Einstellungen setzen.
- [ ] **Erst DANACH** Handy reconnecten/syncen (Hard Rule 2 erfüllt: Server ist befüllt).
      Beim ersten echten Sync bewusst beobachten (Empty-Server-Schutz greift jetzt ohnehin
      nicht mehr, da der Server Daten hält).

### 3. Abnahme gegen die Screenshots (ehem. Phase 4 „Geräteabnahme")

> Da vom Handy nichts mehr kommt (Entscheidung oben), ist die Abnahme jetzt:
> App auf :8444 im mobilen Viewport Seite-an-Seite gegen die 10 Screenshots prüfen.

- [ ] Home: Dashboard-Kachel (KPI / Heatmap / Pilot / Clean) + Bottom-Bar
      (Sync, Filter, Settings, Streak, „+"); Daily Quest startet gemischte Session.
- [x] **Topbar am Handy entfernt** (2026-06-11, Nutzer-Bestätigung + Foto `…23.36.20.jpeg`):
      `HomeView.tsx` rendert den `HomeHeaderBar` nur noch ab `md` (Desktop); mobil gibt es
      wie im Original nur Dashboard-Kachel + Bottom-Bar. Der Online/Offline-Status liegt
      jetzt zusätzlich in den Optionen: `ProfileSyncSection` zeigt eine
      Server-Status-Zeile (Lampe + „Server online/offline", live via Sync-Reachability).
      Build + 455/455 Tests grün.
      Hinweis Layout: Such-Toolbar (FILTER/FEATURE-Pills) ist Desktop-only (`hidden
      sm:block`), Bottom-Bar Mobile-only (`sm:hidden`) — Browser-Ansicht ≠ Handy-Ansicht.
- [ ] Deck-Karten: Subdeck-Zähler + 3 Spalten (neu/lernen/review) für Heute/Morgen.
- [ ] Labs: Liste (n/71, Kategorien, Schwierigkeit, GESCHAFFT) + Detail mit „Antwort prüfen".
- [ ] Studienmodi greifen je Kartentyp: M1 Rating-Leiste, M2 Drag-Match (+ Falsch-Feedback
      mit Erklärung), M3 Free Recall; Fokus-Modus ohne Layout-Sprung.
- [ ] Sync-Status in den Einstellungen sichtbar; Ansichten/Sortierung/Dashboard-Umschalter ok.
- [ ] M3 und Settings/Sync haben keinen Screenshot-Beleg → bleiben „neu generiert";
      Stil an die belegten Screens anlehnen (kein weiterer Beleg zu erwarten).
- [ ] Deploy auf `:8443` erst nach bewusstem Nutzer-Entscheid (Hard Rule 1) —
      damit geht die Handy-Origin wieder live.

### 4. Verbesserungs-Backlog (nach 1–3; aus App-Sichtung 2026-06-11)

**Erledigt (2026-06-11):**
- [x] **UI-Bug-Batch (Abend):** ① Unsichtbare-aber-klickbare Decks nach
      Shuffle→Labs→Decks: Ursache war Framer-Varianten-Orchestrierung
      (`initial="hidden"/animate="show"` + Stagger) — remountende Kinder blieben in
      `hidden` (Opacity 0). Fix: selbstständige Enter-Animation pro Karte
      (`constants/animations.ts → cardEnter`, DeckCard/TagBrowse/DeckList/Review).
      ② „In Zukunft"-Modal-Flackern: Subtree-Remounts + 0.2s-Delay-Fade des
      KPI-Grids entschärft; Headless-Messung: 0 Remounts/Toggles über 5s.
      ③ Mobil mehr Luft zwischen Dashboard/KPI und Deckliste (`pb-3`).
      ④ Ansichten-Sheet ohne dekorative Icons (nur Auswahl-Häkchen bleiben).
      ⑤ Labs ohne Bottom-Bar ist **screenshot-treu** (`…23.38.26.jpeg`: nur
      Zurück-Pfeil) — kein Bug; Zurück-Pfeil → Home verifiziert.
      Alles browser-verifiziert (Tab-Flow, Opacity-Messung, Modal-Beobachtung)
      + Study-E2E-Regression grün; 466/466 Unit-Tests.
- [x] **Source-Map-Fehler in DevTools behoben (= Verbesserungsbericht P2 „Production-
      Build kleiner ausliefern"):** Stale SW-Bundles forderten gelöschte `.map`-Dateien
      an, und der SPA-Fallback lieferte dafür `index.html` mit HTTP 200 → DevTools
      parste HTML als JSON. Fixes: ① Prod-Build ohne Source Maps (`vite.config.ts`,
      Debug weiter via `PWA_SOURCEMAP=1 npm run build`) — dist/ von 6,6 MB auf
      **2,0 MB**; ② `prod-server.mjs`: fehlende Dateien mit Endung bzw. unter
      `/assets/` liefern jetzt echten **404**, SPA-Fallback nur noch für
      Navigationspfade. Verifiziert: stale .map → 404, neues Bundle ohne
      `sourceMappingURL`, SPA-Routen weiter 200, E2E-Smoke grün.
- [x] **Bugfix „Zurück-Pfeil nach Drag-Match führt nicht zum Homescreen":** dieselbe
      Hänger-Klasse wie der schwarze Kartenbereich — `App.tsx` gatete ALLE View-Wechsel
      (Study→Home etc.) durch exit-gated AnimatePresence; verlor der Study-Exit seine
      Completion, mountete Home nie. Fix: Views remounten per Key nur mit
      Enter-Animation (auch ImportView-Statusphasen entschärft). Neue Tests:
      ① Vitest-Regressions-Guard `__tests__/ui/no-animatepresence-wait.test.ts`
      (verbietet wait/popLayout in src/, fand beim ersten Lauf prompt den vierten
      Treffer in ImportView); ② repo-eigener E2E-Smoke `npm run e2e:study`
      (`scripts/e2e-study-back-smoke.mjs`, System-Chromium + puppeteer-core):
      Session starten → Drag-Match per echtem Drag beantworten → Tap-zählt-nicht
      prüfen → Auflösung sichtbar → Zurück-Pfeil → Homescreen, 4 Runden. Beide grün
      (466/466 Unit + 4/4 E2E-Runden). Zurück-Buttons haben jetzt `aria-label` +
      `data-testid="study-back-button"`.
- [x] **Bugfix „schwarzer Screen nach Rating / Karte weg nach Auflösung":** Headless-
      Browser-Repro zeigte: nach dem Bewerten blieb der Kartenbereich intermittierend
      dauerhaft leer (nur Undo-Button, kein JS-Fehler). Ursache: `AnimatePresence
      mode="wait"` um den Kartencontainer — der Exit→Enter-Handover konnte hängen,
      die Folgekarte mountete nie. Fix: Karten-Remount rein über React-Key (Enter-
      Animation bleibt, kein Exit-Gate) in StudyView + ShuffleStudyView. Verifiziert:
      8 Karten in Folge bewertet, 0 Hänger. Nebeneffekt: Kartenwechsel ist schneller.
- [x] **Drag-Match: Tap zählt nicht mehr als Antwort** (Nutzer-Vorgabe): Antwort
      ausschließlich per Drag in die Drop-Zone; Drag jetzt auch bei Reduced-Motion
      aktiv. Drag-Feel verbessert: CSS-`active:scale` kollidierte mit dem Framer-
      Drag-Transform (Ruckeln) — entfernt; Zurückschnappen gestrafft
      (`dragTransition`). Tap-MC-Karten (Inline-Renderer) tappen weiterhin normal.
- [x] **Bugfix „keine Decks / Server offline":** `prod-server.mjs` proxied nur `/sync*` —
      die Auth-Endpunkte (`/auth/default-profile` für Auto-Join) liefen in den
      SPA-Fallback (HTML statt JSON) → kein Profil, kein Sync, keine Decks. Fix: Proxy
      leitet jetzt auch `/auth*` und `/health` an den Sync-Server weiter (`/health`
      beantwortete der Static-Server vorher selbst = falsches „online"). Verifiziert:
      `/auth/default-profile` via :8444 liefert das Default-Profil-JSON, Requests
      erscheinen im Sync-Server-Log.
- [x] **Bottom-Bar an Foto angeglichen** (`…23.36.20.jpeg`): Suchleiste entfernt,
      Streak-Pill (`StreakBadge compact`) zwischen Settings und „+" eingefügt,
      Icons gleichmäßig verteilt. Suche bleibt im Desktop-Layout (Toolbar) erhalten.
- [x] **Service-Worker: es läuft immer nur die aktuellste Version.** Geprüft: jeder Build
      stempelt automatisch eine neue SW-Version (`package-Version + Build-Zeit` →
      `?v=…`-URL, `updateViaCache: 'none'`; Update-Checks bei Fokus/alle 5 Min;
      `activate` löscht alle alten `card-pwa-*`-Caches). Lücke geschlossen: der neue SW
      wartete bisher auf Klick im Update-Banner — jetzt aktiviert `App.tsx` wartende
      Worker **automatisch** (SKIP_WAITING + Auto-Reload); einzige Ausnahme: laufende
      Lern-Session, dort greift das Update nach Session-Ende (Banner erlaubt sofortiges
      Update per Klick). Build + 455/455 Tests grün.

**Hoch (Datenverlust-Risiko):**
- [ ] Labs-Fortschritt („GESCHAFFT") liegt NUR in `localStorage`
      ([`labProgress.ts`](../card_pwa/src/utils/labProgress.ts)) — weder im Backup-Export
      ([`dbBackup.ts`](../card_pwa/src/utils/dbBackup.ts)) noch im Sync; geht bei
      Reinstall/Gerätewechsel verloren. → additiv in Backup-Export oder Dexie+Sync aufnehmen.

**Mittel (Qualität / Wartbarkeit):**
- [ ] Kartenpflege: 68 Karten mit 5 MC-Optionen (Validator-Warnungen) fallen aus der
      M2-Form (exakt 4 Optionen + 1 Correct) und rendern als Tap-MC. Entscheiden:
      auf 4 Optionen kürzen (→ M2) oder bewusst belassen + Warnung whitelisten.
- [ ] Kein README an Repo-Wurzel/`card_pwa/`: Quickstart, Portregeln 8444/8787,
      Hard Rules, `verify-setup.sh` dokumentieren.

**Niedrig (Komfort / Folgearbeiten):**
- [ ] i18n-Strings zusammenführen (`SettingsContext`-`STRINGS` + `i18n.ts` ~1000 Z.).
- [ ] Große Dateien schneiden: `SettingsModal.tsx` (1526 Z.), `syncPull.ts` (1219 Z.),
      `StudyView.tsx` (1103 Z.), `ProfileSyncSection.tsx` (986 Z.).
- [ ] Weiteres nach [`docs/app-verbesserungsbericht.md`](../docs/app-verbesserungsbericht.md)
      (P0–P3, weiterhin gültig): P0 Restore-Prozess → P1 Setup/Release-Pfad, Teststabilität,
      Datei-Schnitt → P2 Sync-Härtung (Token/CORS), Import-Preview, Source-Maps,
      A11y Drag/Ordering → P3 CI (Build+Test, ohne E2E).

---

## Referenz (nur was für die offene Arbeit gebraucht wird)

- **Quell-Artefakte** (read-only): `card-pwa-backup-…T21-20-25-967Z.txt` (779 Karten,
  base64-`card-pwa-meta` mit SRS) · `…T21-54-32-447Z.csv` (dieselben 779 Karten, flach —
  Autoren-/Diff-/Re-Import-Format) · 10 Screenshots (UI-Referenz 8./9. Juni).
  SHA-256-Belege: `RECOVERY_LOG.md` in der Git-Historie (`f72ffd6`).
- **Verifikation:**
  ```bash
  cd /home/_vb/card_pwa_app/card_pwa
  TZ=UTC npm run build                            # grün
  TZ=UTC npm test -- --run --testTimeout 10000    # 455/455
  npm run validate:cards                          # 0 Fehler / 68 bekannte Warnungen
  ../scripts/verify-setup.sh                      # Setup-/Port-Check
  ```
- **Schlüsseldateien:** `ImportView.tsx` + `utils/import/csvImporter.ts` + `utils/dbBackup.ts`
  (Import) · `services/syncPull.ts` (Empty-Snapshot-Schutz) · `CardFace.tsx` (Render-Weiche;
  der Inline-Tap-MC ist **aktiver Fallback** für MC-Karten außerhalb der M2-Form — nicht
  entfernen) · `data/labScenarios.ts` (71 Szenarien + Quellen-Registry) · `docs/*.md`
  (KI-Autorendoku je Modus).
