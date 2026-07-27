# Card_PWA - Architektur-Umsetzungsplan

Stand: 2026-07-27. Grundlage: `card-pwa-architektur.md`, insbesondere
Abschnitt 20 Zielarchitektur fuer Modals, Abschnitt 21 Risiken und Empfehlungen und Abschnitt 22
Zusammenfassung.

Ziel: Die App bleibt eine Offline-first-Lernapp. Die Architekturarbeit
priorisiert deshalb Datenintegritaet, Sync-Vertraege, Service-Worker-
Kompatibilitaet und danach erst UI-/Overlay-Vereinheitlichung. Der Plan ist
als umsetzbares Arbeitsprogramm gedacht: jede Phase hat konkrete Dateien,
Akzeptanzkriterien und Tests.

## Leitentscheidungen

1. Datenintegritaet vor UI-Refactor. Reviews, Karten, Decks, Video-Notizen und
   Exam-Date muessen lokal, in der Queue, serverseitig und im Pull konsistent
   bleiben.
2. Bestehende Architektur inkrementell haerten. Keine grosse Rewrite-Phase,
   aber ein professionell begrenztes State Management fuer UI-, View-,
   Overlay- und Runtime-State einfuehren.
3. Dexie bleibt der reaktive Store. `liveQuery` bleibt der primaere Mechanismus
   fuer persistente Daten; der neue UI-State-Store darf keine dauerhaften
   Karten-/Review-/Deck-Daten duplizieren.
4. Service Worker bleibt eigenstaendig, aber vertraglich gebunden. Wenn der SW
   ohne offenen Tab selbst flushen kann, muss sein Verhalten gegen App-Dexie-
   Flush getestet und dokumentiert sein.
5. Overlay-Vereinheitlichung erfolgt ueber getrennte Oberflaechen: `Dialog`,
   `AlertDialog`, `Sheet`, `FullscreenPanel`. Keine immer groessere
   `ModalShell` mit Varianten fuer alles.
6. Der State-Manager wird an Use Cases geschnitten. Keine globale
   "alles-in-einem"-Store-Datei; stattdessen kleine Slices mit stabilen
   Selektoren, Actions und Tests.

## Zielbild nach Abschluss

```text
src/
|-- services/
|   |-- syncMutationContract.ts
|   |-- syncQueue.ts
|   |-- syncCoordinator.ts
|   `-- syncPull/
|-- state/
|   |-- appStore.ts
|   |-- createSelectors.ts
|   |-- slices/
|   |   |-- navigationSlice.ts
|   |   |-- overlaySlice.ts
|   |   |-- syncRuntimeSlice.ts
|   |   |-- homeUiSlice.ts
|   |   `-- pwaRuntimeSlice.ts
|   `-- __tests__/
|-- ui/
|   `-- overlays/
|       |-- Dialog.tsx
|       |-- AlertDialog.tsx
|       |-- Sheet.tsx
|       |-- FullscreenPanel.tsx
|       |-- OverlayHeader.tsx
|       |-- useCloseGuard.ts
|       |-- overlayTokens.ts
|       `-- __tests__/
|-- hooks/
|   `-- home/
|       |-- useHomeDialogs.ts
|       |-- useDeckCommands.ts
|       |-- useShuffleCollectionCommands.ts
|       |-- useHomeExport.ts
|       `-- useHomeViewController.ts
`-- db/
    `-- queries/
```

## Statusbasis

Bereits erledigt oder begonnen:

- `services/syncMutationContract.ts` existiert als maschinenlesbarer
  Sync-Mutationsvertrag.
- Tests sichern Sync-Vertrag, Service-Worker-Queue-Konstanten und
  Dead-Letter-Pending-Verhalten ab.
- `CardFormModal` nutzt fuer Deck-Optionen und Deck-Erstellung die Query-
  Schicht statt direkter `db.decks`-Zugriffe.
- `CardFormModal` nutzt fuer die Kartenloeschung den vorhandenen
  `ConfirmModal` statt eines Inline-Duplikats.
- A1-Inkrement umgesetzt: Der Sync-Mutationsvertrag dokumentiert jetzt pro
  Operation `requiresTransactionalOutbox`, `serverOperation` und konkrete
  Testdateien. Der Vertragstest prueft zudem, dass referenzierte Testdateien
  existieren.
- A2-Inkrement umgesetzt: Der Service-Worker-App-Vertrag prueft Queue-
  Konstanten, Delegation an offene App-Clients und den gemeinsamen Push-
  Envelope.
- A3-Inkrement umgesetzt: Sync-Queue-Diagnosen liefern Pending-, Dead-Letter-,
  Deferred- und Outbox-Zaehler. Dead-Letter-Eintraege koennen bewusst fuer
  Retry freigegeben werden und blockieren Pull weiterhin nicht.
- C1/C2-Inkrement umgesetzt: ADR `docs/adr/002-ui-state-management.md`
  dokumentiert den UI-Store ohne neue Dependency; `src/state/` enthaelt
  getestete Basis-Slices fuer Overlay-Stack und Sync-Runtime.
- B2-Inkrement dokumentiert: `docs/architecture-events.md` beschreibt die
  globalen Runtime-Events und ihre Rueckbaupfade.
- F1-Inkrement umgesetzt: `scripts/check-architecture-imports.mjs` prueft
  Importgrenzen mit expliziter Baseline fuer bekannte Alt-Ausnahmen.

Diese Punkte gelten als Phase A0-Basis und duerfen nicht zurueckgedreht werden.

## State-Management-Zielbild

Empfehlung: Zustand als schlanker UI-State-Store, sofern eine Dependency
akzeptiert wird. Alternative ohne neue Dependency: ein eigener Store auf Basis
von `useSyncExternalStore`, aber nur wenn Bundle-/Dependency-Politik wichtiger
ist als Wartbarkeit. Redux Toolkit ist fuer diese App nur sinnvoll, wenn
Devtools/Time-Travel und sehr strikte Event-Logs fachlich gebraucht werden; fuer
den aktuellen Bedarf waere es zu schwer.

### Was in den Store gehoert

- Navigation/View-State, der heute in `useAppNavigation()` und App-Shell
  verteilt ist.
- Overlay-/Dialog-Registry: welches Overlay offen ist, aktive Datensaetze,
  Close-Grund, Stack-Top.
- Home-UI-State: aktive Tabs, Dashboard-Modus, Shuffle-only-Modus,
  ausgeklappte Subdecks, aktuell ausgewaehlte Home-Aktionen.
- Sync-Runtime-UI: `idle | syncing | blocked | offline | error`,
  letzter erfolgreicher Sync, Pending-/Dead-Letter-Zaehler fuer Anzeige.
- PWA-Runtime-UI: Install-Prompt, SW-Update-Banner, Badge-/Notification-
  Anzeigezustand.
- kurzlebige Wizard-/Form-Drafts nur dann, wenn mehrere Komponenten denselben
  Draft bearbeiten.

### Was nicht in den Store gehoert

- Karten, Decks, Reviews, ShuffleCollections, VideoNotes als dauerhafte Daten.
  Diese bleiben in Dexie und werden ueber Query-Funktionen/liveQuery gelesen.
- Sync-Queue-Records als Quelle der Wahrheit. Der Store darf nur abgeleitete
  Anzeigezaehler halten.
- Settings, die bereits in `SettingsContext` mit Persistenzvertrag leben, bis
  ein eigener Migrationsschritt sie bewusst uebernimmt.
- grosse Import-/Backup-Payloads oder Video-Blobs.

### Zielstruktur

```text
src/state/
|-- appStore.ts
|-- createSelectors.ts
|-- slices/
|   |-- navigationSlice.ts
|   |-- overlaySlice.ts
|   |-- syncRuntimeSlice.ts
|   |-- homeUiSlice.ts
|   `-- pwaRuntimeSlice.ts
`-- __tests__/
```

Store-Regeln:

- Jeder Slice exportiert Typen, Initial State und Actions.
- Komponenten nutzen Selektoren, nicht den ganzen Store.
- Actions duerfen Query-/Service-Funktionen nur in klar benannten Command-
  Funktionen ausloesen; reine State-Actions bleiben synchron.
- Persistenz nur explizit und klein, z. B. mit `partialize` fuer UI-
  Praeferenzen. Keine automatische Persistenz kompletter Stores.
- Store-Reset fuer Tests und PWA-Full-Reset bereitstellen.

## Phase A - Sync- und Datenintegritaet haerten

### A1 - Sync-Mutationsvertrag vervollstaendigen

Ziel: Jede lokale Mutation hat einen expliziten Vertrag fuer lokale
Transaktion, Queue/Outbox, Serveroperation, Pull-Anwendung, Scope-Regel und
Idempotenz.

Primaere Dateien:

- `card_pwa/src/services/syncMutationContract.ts`
- `card_pwa/src/services/syncQueue.ts`
- `card_pwa/src/services/syncPull/apply.ts`
- `card_pwa/src/services/syncPull/deltaPull.ts`
- `card_pwa/src/db/queries/cards.ts`
- `card_pwa/src/db/queries/decks.ts`
- `card_pwa/src/db/queries/reviews.ts`
- `card_pwa/src/db/queries/shuffleCollections.ts`
- `card_pwa/src/db/queries/videoNotes.ts`
- `card_pwa/src/contexts/SettingsContext.tsx`

Aufgaben:

1. Vertrag um Feld `requiresTransactionalOutbox: boolean` erweitern.
2. Vertrag um Feld `serverEndpointShape` oder `serverOperation` erweitern:
   `POST /sync`, `GET /sync/pull`, angewendeter Payload-Typ.
3. Vertrag um Feld `tests` erweitern, das konkrete Testdateien nennt.
4. Fuer jede Operation pruefen, ob Pull-Anwendung in `applyOperation()` exakt
   vertreten ist.
5. Fuer `deck.create` ausdruecklich festhalten: `createDeck()` erzeugt lokale
   leere Decks ohne Queue; `deck.create` entsteht als syncbare Abhaengigkeit,
   sobald Karten/Import/Hierarchie syncbaren Inhalt liefern.

Akzeptanzkriterien:

- TypeScript scheitert, wenn ein neuer `SyncOperationType` ohne Vertrag
  hinzugefuegt wird.
- Jede Vertragszeile nennt mindestens eine Producer-Datei und mindestens eine
  Testdatei.
- `npm run build` bleibt gruen.

Tests:

- `src/__tests__/services/sync-mutation-contract.test.ts`
- bestehende DB-Tests fuer Card/Deck/Review/Shuffle/VideoNote

### A2 - Service-Worker-Queue-Flush gegen App-Queue-Flush absichern

Ziel: Der SW darf bei geschlossenem Tab selbst flushen, aber nicht unbemerkt
vom App-Verhalten abweichen.

Primaere Dateien:

- `card_pwa/public/service-worker.js`
- `card_pwa/src/services/syncQueue.ts`
- `card_pwa/src/constants/appIdentity.ts`
- `card_pwa/src/__tests__/services/sync-mutation-contract.test.ts`

Aufgaben:

1. Queue-Konstanten in einem kleinen, SW-kompatiblen Manifest spiegeln oder
   Test beibehalten, der `service-worker.js` gegen `DATABASE_NAMES.syncQueue`
   vergleicht.
2. SW-Flush-Regeln dokumentieren:
   - offene Tabs: `SYNC_NOW` an App delegieren
   - keine Tabs: rohes IndexedDB-Flush im SW
3. Test fuer SW-Eigenflush-Verhalten ergaenzen. Minimum: Quelltext-/Contract-
   Test. Besser: isolierter SW-Flush-Helfer als testbares Modul extrahieren.
4. Retry-/Dead-Letter-Regeln von App und SW angleichen oder den Unterschied
   explizit begruenden.
5. Bei Schemaaenderungen an `card-pwa-sync-queue` immer Test fuer App+SW
   ergaenzen.

Akzeptanzkriterien:

- Queue-DB-Name und Store-Name koennen nicht still auseinanderlaufen.
- App-Flush und SW-Flush senden denselben HTTP-Envelope:
  `opId`, `type`, `payload`, `clientTimestamp`, `source`, `clientId`.
- SW delegiert bei offenen Clients weiterhin an die App.

Tests:

- `src/__tests__/services/sync-mutation-contract.test.ts`
- neuer Test, falls SW-Flush-Helfer extrahiert wird:
  `src/__tests__/runtime/service-worker-sync-flush.test.ts`

### A3 - Pull-nach-Push-Vertrag hart testen

Ziel: Remote-Deltas werden erst angewendet, wenn lokale Pushes nicht mehr
aktiv pending sind; Dead-Letter-Eintraege duerfen Pull nicht dauerhaft
blockieren.

Primaere Dateien:

- `card_pwa/src/services/syncCoordinator.ts`
- `card_pwa/src/services/syncQueue.ts`
- `card_pwa/src/services/syncPull/deltaPull.ts`
- `card_pwa/src/components/settings/SettingsDataSection.tsx`

Aufgaben:

1. Bestehenden Dead-Letter-Test beibehalten und um Requeue-Fall erweitern.
2. `SettingsDataSection` um sichtbare Diagnose fuer Dead-Letter/Deferred-
   Queue erweitern:
   - Anzahl normale Pending Ops
   - Anzahl Dead-Letter Ops
   - Aktion "Retry freigeben"
   - Aktion "Queue leeren" bleibt bestaetigungspflichtig
3. `pullAndApplySyncDeltas()`-Test ergaenzen:
   - pending vor Flush > 0
   - Flush verarbeitet etwas
   - pending danach 0 => Pull laeuft
   - pending danach > 0 => Pull bricht ab

Akzeptanzkriterien:

- Eine dauerhaft fehlerhafte Operation blockiert Pull nach Dead-Letter nicht.
- Nutzer kann Dead-Letter-Status in Settings erkennen.
- Tests zeigen beide Pfade: Pull laeuft und Pull wartet.

Tests:

- `src/__tests__/services/sync-queue-dead-letter.test.ts`
- `src/__tests__/services/sync-coordinator.test.ts`
- neuer oder erweiterter Test fuer `syncPull/deltaPull`

## Phase B - Datenzugriff und Reaktivitaet vereinheitlichen

### B1 - Direkte DB-Zugriffe aus UI entfernen

Ziel: UI-Komponenten sprechen ueber Query-Funktionen, nicht ueber Dexie-Tabellen.

Primaere Dateien:

- `card_pwa/src/components/CardFormModal.tsx`
- `card_pwa/src/hooks/useHeatmap.ts`
- `card_pwa/src/hooks/useStreak.ts`
- `card_pwa/src/db/queries/*`

Aufgaben:

1. Bereits erledigten `CardFormModal`-Umbau als Muster dokumentieren:
   `listDeckOptions()` statt `db.decks.orderBy(...)`, `createDeck()` statt
   `db.decks.add(...)`.
2. `useHeatmap.ts` und `useStreak.ts` pruefen:
   - falls sie reine Read-Model-Hooks sind, Query-Funktionen extrahieren
   - falls direkte Dexie-Live-Reads bewusst sind, als Ausnahme dokumentieren
3. Ein Import-Regelwerk einfuehren:
   - `components/**` duerfen nicht aus `../db` importieren
   - Ausnahmen nur fuer Typen, falls unvermeidbar
4. Mittelfristig automatisieren:
   - kleines Script `scripts/check-architecture-imports.mjs`
   - CI/`verify:phase5` laesst es laufen

Akzeptanzkriterien:

- Kein `components/**`-Direktimport von `db` fuer Laufzeitdatenzugriff.
- Query-Funktionen sind fuer neue UI-Reads vorhanden.
- Import-Regeltest scheitert bei neuer Schichtverletzung.

Tests:

- vorhandene DB-/Hook-Tests
- neuer Architekturtest fuer Importgrenzen

### B2 - `liveQuery` und globale Events entflechten

Ziel: Persistente Daten aktualisieren sich ueber Dexie-Reaktivitaet; Events
bleiben fuer bewusst nicht-persistente oder Storage-basierte Signale.

Primaere Dateien:

- `card_pwa/src/hooks/useCardDb.ts`
- `card_pwa/src/hooks/useStreak.ts`
- `card_pwa/src/hooks/useHeatmap.ts`
- `card_pwa/src/hooks/home/useLearningUnits.ts`
- `card_pwa/src/hooks/home/useTodayPackage.ts`
- `card_pwa/src/db/queries/reviews.ts`
- `card_pwa/src/constants/appIdentity.ts`

Aufgaben:

1. Event-Katalog erstellen:
   - `REVIEW_UPDATED_EVENT`
   - `EXAM_DATE_SYNCED_EVENT`
   - SW-Update-/Sync-Messages
2. Pro Event festlegen:
   - Quelle
   - Konsumenten
   - warum Dexie-`liveQuery` nicht reicht
3. `REVIEW_UPDATED_EVENT`-Konsumenten pruefen:
   - reine DB-Aggregate nach Moeglichkeit auf Query-Revision/liveQuery
     umstellen
   - teure Aggregate ggf. mit expliziter Revision statt vielen Events
4. Kommentar in `useCardDb.ts` aktualisieren, damit neue Hooks nicht beide
   Mechanismen unkritisch kopieren.

Akzeptanzkriterien:

- Jedes globale Event ist dokumentiert und hat eine begruendete Rolle.
- Keine neuen globalen Events fuer Daten, die Dexie bereits reaktiv melden kann.
- Tests fuer `useCardDb`-Revision bleiben gruen.

## Phase C - Professionelles UI-State-Management einfuehren

### C1 - State-Management-ADR entscheiden

Ziel: Bewusst entscheiden, welche Store-Technik eingefuehrt wird und welche
Grenzen sie hat.

Empfehlung:

- Primaer: Zustand mit `subscribeWithSelector`, kleinen Slices und stabilen
  Selektoren.
- Alternative: eigener `useSyncExternalStore`-Store, falls keine neue
  Dependency gewuenscht ist.
- Nicht empfohlen fuer diese App als erster Schritt: Redux Toolkit als
  Vollersatz, weil persistente Domain-Daten bereits gut in Dexie liegen.

Primaere Dateien:

- neu: `docs/adr/002-ui-state-management.md`
- `card_pwa/package.json`
- neu: `card_pwa/src/state/`

Aufgaben:

1. ADR schreiben:
   - Problem: verstreuter UI-/Modal-/Runtime-State
   - Entscheidung: Zustand oder eigener Store
   - Nicht-Ziele: kein Domain-Daten-Duplikat
   - Migrationsreihenfolge
2. Wenn Zustand gewaehlt wird:
   - Dependency aufnehmen
   - Bundle-/Build-Auswirkung dokumentieren
3. Store-Teststrategie definieren:
   - reine Slice-Tests
   - Hook-/Komponententests nur fuer Integration

Akzeptanzkriterien:

- ADR ist vorhanden.
- Store-Grenzen sind klar: Dexie = persistente Daten, Store = UI/Runtime.
- `npm run build` bleibt gruen.

### C2 - Store-Basis und Selektor-Helfer anlegen

Ziel: Eine kleine, getestete Store-Basis schaffen, bevor View-Code migriert
wird.

Primaere Dateien:

- `card_pwa/src/state/appStore.ts`
- `card_pwa/src/state/createSelectors.ts`
- `card_pwa/src/state/slices/overlaySlice.ts`
- `card_pwa/src/state/slices/navigationSlice.ts`
- `card_pwa/src/state/slices/syncRuntimeSlice.ts`
- `card_pwa/src/state/__tests__/`

Aufgaben:

1. `appStore.ts` als Komposition der Slices anlegen.
2. `createSelectors.ts` bereitstellen, damit Komponenten gezielte Selektoren
   nutzen.
3. `overlaySlice` modellieren:
   - `openOverlay`
   - `closeOverlay`
   - `setActivePayload`
   - `topOverlayId`
4. `syncRuntimeSlice` modellieren:
   - Status
   - `pendingCount`
   - `deadLetterCount`
   - `lastSuccessfulSyncAt`
   - `lastError`
5. Test-Helfer fuer Store-Reset bauen.

Akzeptanzkriterien:

- Store kann in Tests isoliert zurueckgesetzt werden.
- Komponenten muessen nicht den gesamten Store abonnieren.
- Kein Slice importiert direkt React-Komponenten.

Tests:

- `src/state/__tests__/overlaySlice.test.ts`
- `src/state/__tests__/syncRuntimeSlice.test.ts`

### C3 - Navigation und Home-UI migrieren

Ziel: Der Store loest verstreuten View-/Home-UI-State ab, ohne Dexie-Daten in
den Store zu kopieren.

Primaere Dateien:

- `card_pwa/src/hooks/app/useAppNavigation.ts`
- `card_pwa/src/App.tsx`
- `card_pwa/src/hooks/home/useHomeViewController.ts`
- `card_pwa/src/hooks/home/useHomeDerivedData.ts`
- `card_pwa/src/components/HomeView.tsx`
- `card_pwa/src/state/slices/navigationSlice.ts`
- `card_pwa/src/state/slices/homeUiSlice.ts`

Aufgaben:

1. Navigation-State aus `useAppNavigation()` in `navigationSlice`
   verschieben, Hook als Adapter erhalten.
2. Home-UI-Preferences in `homeUiSlice` verschieben:
   - aktiver Tab
   - Dashboard-Modus
   - Shuffle-only-Modus
   - Expanded-Subdeck-IDs
3. Persistenz nur fuer kleine UI-Praeferenzen aktivieren.
4. `useHomeViewController` danach leichter schneiden, weil UI-State nicht mehr
   im Controller haengt.

Akzeptanzkriterien:

- Deep-Link-Startverhalten bleibt unveraendert.
- Home-View liest Domain-Daten weiter ueber Hooks/Queries.
- Tests fuer `useAppNavigation` und Home-Shell bleiben gruen.

### C4 - Overlay-State an neue Overlay-Architektur koppeln

Ziel: Overlay-Stack und aktive Payloads werden zentral verwaltet, waehrend
konkrete Dialoge weiter ihre Formularlogik selbst halten.

Primaere Dateien:

- `card_pwa/src/state/slices/overlaySlice.ts`
- `card_pwa/src/ui/overlays/*`
- `card_pwa/src/hooks/home/useHomeDialogs.ts`
- `card_pwa/src/components/SettingsModal.tsx`
- `card_pwa/src/components/ImportModal.tsx`

Aufgaben:

1. `overlaySlice` als Quelle fuer Stack/Top-Overlay verwenden.
2. `useHomeDialogs` als Adapter auf den Store bauen.
3. `ConfirmModal`/`AlertDialog` an `CloseReason` koppeln.
4. Verschachtelte Dialoge in `SettingsModal`, `ImportModal` und
   `HomeDeckCardsModal` ueber Stack-Top pruefen.

Akzeptanzkriterien:

- Nur oberstes Overlay reagiert auf Escape/Backdrop.
- Aktive Datensaetze liegen typisiert im Store oder in einem klaren Adapter.
- Form-Drafts bleiben lokal, solange sie nur ein Dialog nutzt.

## Phase D - Overlay-Architektur umsetzen

### D1 - Overlay-Verhaltensvertrag definieren

Ziel: Vor der Implementierung steht fest, welches Verhalten alle Overlays
garantieren muessen.

Primaere Dateien:

- neu: `card_pwa/src/ui/overlays/overlayTypes.ts`
- neu: `card_pwa/src/ui/overlays/overlayTokens.ts`
- neu: `card_pwa/src/ui/overlays/__tests__/`
- `card_pwa/src/constants/ui.ts`

Aufgaben:

1. Typen definieren:
   - `CloseReason = 'escape' | 'backdrop' | 'close-button' | 'cancel' | 'submit'`
   - `OverlaySize`
   - `SheetPlacement`
2. Verhalten als Tests formulieren:
   - Fokus nach Oeffnung im Overlay
   - sichtbarer Titel ist programmatisch verbunden
   - Escape trifft nur oberstes Overlay
   - Fokus kehrt zum Ausloeser zurueck
   - nicht dismissible Overlays ignorieren Backdrop/Escape
   - Reduced Motion reduziert Animation
3. Z-Index-Tokens festlegen:
   - `base`
   - `dropdown`
   - `overlay`
   - `overlayNested`
   - `toast`
   - `splash`

Akzeptanzkriterien:

- Tests existieren vor grosser Migration.
- `UI_TOKENS.zIndex` oder `overlayTokens.zIndex` ist die einzige neue Quelle
  fuer Overlay-Zahlen.
- Keine neue Komponente nutzt rohe `z-[9999]`-Werte.

### D2 - Accessible Primitive evaluieren und entscheiden

Ziel: Kein unnoetiger Eigenbau fuer Fokus-Trap und Inert-Verhalten.

Optionen:

- Native `<dialog>.showModal()`
- kleines eigenes Wrapper-Primitive nur fuer Projektbedarf
- etablierte Library, falls bewusst als Dependency akzeptiert

Entscheidungskriterien:

- Tastaturverhalten Desktop + Mobile
- iOS Safari PWA Verhalten
- Fokus-Rueckgabe
- Animation/Framer-Motion-Kompatibilitaet
- Stacking/Nested Dialogs
- Bundle-Kosten

Aufgaben:

1. Proof of Concept mit `ConfirmModal`.
2. Proof of Concept mit einem einfachen Anzeige-Dialog:
   `InstallHintModal` oder `FutureForecastModal`.
3. Playwright oder Testing-Library-Tastaturtests schreiben.
4. Entscheidung als ADR festhalten:
   `docs/adr/001-overlay-primitive.md`.

Akzeptanzkriterien:

- Entscheidung ist dokumentiert.
- PoC besteht Tastaturtests.
- Keine Migration startet ohne bestandenen PoC.

### D3 - Overlay-Komponenten implementieren

Ziel: Getrennte Oberflaechen statt Monolith.

Neue Zielstruktur:

```text
src/ui/overlays/
|-- Dialog.tsx
|-- AlertDialog.tsx
|-- Sheet.tsx
|-- FullscreenPanel.tsx
|-- OverlayHeader.tsx
|-- useCloseGuard.ts
|-- overlayTokens.ts
`-- __tests__/
```

Aufgaben:

1. `Dialog` implementieren fuer normale Dialoge.
2. `AlertDialog` implementieren fuer destructive/confirm Flows.
3. `Sheet` implementieren fuer mobile bottom/side surfaces.
4. `FullscreenPanel` implementieren fuer `LearningPlanPanel`/Video-Panels.
5. `ConfirmModal` als Adapter auf `AlertDialog` migrieren.

Akzeptanzkriterien:

- `ConfirmModal` bleibt public API-kompatibel oder Migration ist klein und
  vollstaendig.
- `Dialog`/`AlertDialog` haben ARIA-Titelverknuepfung.
- Escape/Backdrop/Close-Button liefern `CloseReason`.
- Tests decken Fokus und Close-Policy ab.

### D4 - Migration in sicherer Reihenfolge

Reihenfolge:

1. `InstallHintModal`
2. `FutureForecastModal`
3. `HomeExportModal`
4. `HomeCreateDeckModal`
5. `DeckMetricsModal`
6. `ShuffleMetricsModal`
7. `FaqModal`
8. `HomeShuffleCollectionModal`
9. `HomeDeckCardsModal`
10. `ImportModal` + `DuplicateReviewModal`
11. `SettingsModal`
12. `CardFormModal`
13. `LearningPlanPanel`
14. Video-Panels
15. `AcronymDetailPanel`
16. `MobileBottomSheet`

Pro Migration:

- altes visuelles Verhalten vergleichen
- Tastaturtest ergaenzen
- `prefers-reduced-motion` pruefen
- z-Index-Literal entfernen
- Backdrop/Escape/Dirty-Guard explizit setzen

Akzeptanzkriterien:

- Keine Komponente reimplementiert Overlay/Backdrop/Header ohne Begruendung.
- Keine zwei vollen `z-[1000]`-Overlays ohne Overlay-Manager/Primitive.
- Alle Dialoge haben Titelverknuepfung.

## Phase E - Home-Controller und Feature-Grenzen schneiden

### E1 - `useHomeViewController` nach Use Cases zerlegen

Ziel: HomeView bleibt Komposition, nicht Sammelpunkt fuer alle Befehle.

Zielstruktur:

```text
src/hooks/home/
|-- useHomeDialogs.ts
|-- useDeckCommands.ts
|-- useShuffleCollectionCommands.ts
|-- useHomeExport.ts
|-- usePwaInstallActions.ts
`-- useHomeViewController.ts
```

Aufgaben:

1. `useHomeDialogs.ts`: Sichtbarkeiten, aktive Datensaetze,
   Confirm-State.
2. `useDeckCommands.ts`: create/delete/exportrelevante Deck-Aktionen.
3. `useShuffleCollectionCommands.ts`: create/update/delete Shuffle.
4. `useHomeExport.ts`: JSON/TXT/CSV Export.
5. `usePwaInstallActions.ts`: Install Prompt + Notification Permission.
6. `useHomeViewController.ts` bleibt Kompositions-Hook und exportiert
   dasselbe Shape wie vorher.

Akzeptanzkriterien:

- `HomeView` muss nicht groesser werden.
- Bestehende Tests fuer `useHomeViewController` bleiben gruen.
- Jede neue Hook-Datei hat eine klare AI_CONTEXT-Rolle.
- Kein Hook mischt Modal-State, DB-Write und Export in derselben Funktion.

### E2 - Study/Shuffle-Session-Logik behutsam teilen

Ziel: Keine grosse Basiskomponente, sondern geteilte Controller-Logik.

Primaere Dateien:

- `card_pwa/src/components/StudyView.tsx`
- `card_pwa/src/components/ShuffleStudyView.tsx`
- `card_pwa/src/services/studySessionReducer.ts`
- `card_pwa/src/services/sessionRecovery.ts`

Aufgaben:

1. Gemeinsame Rating-Flow-Hook extrahieren.
2. Gemeinsame Card-Editing-Hook extrahieren.
3. `StudySessionLayout` nur fuer wirklich identische Layoutteile einfuehren.
4. Unterschiede zwischen normalem Deck und Shuffle bewusst erhalten.

Akzeptanzkriterien:

- Keine abstrakte Mega-Study-Komponente.
- Tests fuer `StudyView` und `ShuffleStudyView` bleiben getrennt.
- Gemeinsame Logik hat eigene Unit-Tests.

## Phase F - Architekturregeln automatisieren

### F1 - Importgrenzen pruefen

Ziel: Dokumentierte Schichten werden technisch erzwungen.

Regeln:

- `components/**` duerfen keine Laufzeitimporte aus `db/index.ts` verwenden.
- `utils/**` duerfen nicht aus `components/**`, `hooks/**` oder `services/**`
  importieren, ausser explizit erlaubte reine Typen.
- `db/queries/**` duerfen nicht aus UI-Schichten importieren.
- Direkte Dexie-Zugriffe ausserhalb `db/**` und `services/syncQueue.ts`
  brauchen explizite Ausnahme.

Aufgaben:

1. `scripts/check-architecture-imports.mjs` schreiben.
2. Ausnahmen als kleine Allowlist im Script pflegen.
3. `package.json` Script `check:architecture` ergaenzen.
4. `verify:phase5` um `check:architecture` erweitern, sobald stabil.

Akzeptanzkriterien:

- Neuer direkter `components -> db`-Import faellt im Check.
- Check laeuft ohne Netzwerk und ohne Build.
- Fehlermeldung nennt Datei, Import und verletzte Regel.

### F2 - Dossier wartbarer machen

Ziel: `card-pwa-architektur.md` bleibt hilfreich, ohne volatile Zahlen von
Hand pflegen zu muessen.

Aufgaben:

1. `docs/architecture/` als Zielstruktur anlegen:
   - `README.md`
   - `system-overview.md`
   - `persistence-and-sync.md`
   - `service-worker.md`
   - `overlays-and-dialogs.md`
   - `state-and-navigation.md`
   - `generated/`
   - `adr/`
2. Generierte Kennzahlen aus Script erzeugen:
   - Datei-/LOC-Zaehler
   - Hook-/Komponentenlisten
   - Sync-Operationen aus `syncMutationContract`
   - direkte DB-Imports
   - z-Index-Literale
3. Grosses Dossier als Einstieg behalten oder in `docs/architecture/README.md`
   ueberfuehren.

Akzeptanzkriterien:

- Keine manuell gepflegte Zahl ist ohne Quelle.
- Sync-Matrix wird aus `syncMutationContract.ts` oder einem gemeinsamen JSON
  abgeleitet.
- Dossier verlinkt auf ADRs und generierte Inventare.

## Empfohlene Reihenfolge als Roadmap

### Sprint 1 - Sync-Vertrag fertig machen

1. A1 Vertragsfelder erweitern.
2. A3 Dead-Letter/Requeue/Pull-Tests vervollstaendigen.
3. A2 SW/App-Konstanten- und Envelope-Kompatibilitaet absichern.
4. Build und gezielte Sync-Testmatrix ausfuehren.

Ergebnis: P0-Risiken sind nicht nur dokumentiert, sondern testbar.

### Sprint 2 - Datenzugriff, State-ADR und Architekturgrenzen

1. B1 restliche direkte DB-Zugriffe pruefen und umbauen/als Ausnahme
   dokumentieren.
2. C1 State-Management-ADR entscheiden.
3. F1 Importgrenzen-Script einfuehren.
4. B2 Event-Katalog erstellen und `REVIEW_UPDATED_EVENT`-Konsumenten ordnen.

Ergebnis: Schichten und Store-Grenzen sind technisch kontrolliert.

### Sprint 3 - Store-Basis und erste Migration

1. C2 Store-Basis und Selektor-Helfer anlegen.
2. C3 Navigation/Home-UI schrittweise migrieren.
3. C4 Overlay-State an Stack-/CloseReason-Modell koppeln.
4. Bestehende Home-/Navigation-Tests gruen halten.

Ergebnis: UI-State hat eine professionelle, getestete Heimat ohne Dexie-Daten
zu duplizieren.

### Sprint 4 - Overlay-PoC

1. D1 Verhaltensvertrag und Tests schreiben.
2. D2 Primitive-Entscheidung als ADR festhalten.
3. D3 `Dialog` + `AlertDialog` minimal implementieren.
4. `ConfirmModal` und ein einfacher Anzeige-Dialog migrieren.

Ergebnis: Overlay-Zielarchitektur ist beweisbar, nicht nur geplant.

### Sprint 5 - Overlay-Migration niedriges Risiko

1. Vier aktuelle `ModalShell`-Nutzer migrieren.
2. Metrik-/FAQ-Dialoge migrieren.
3. z-Index-Tokens einfuehren.
4. Reduced-Motion-Ausnahmen entfernen.

Ergebnis: Wiederholtes Modal-Markup sinkt, Accessibility steigt.

### Sprint 6 - Komplexe Dialoge und Home-Schnitt

1. `useConfirmDialog()` oder AlertDialog-Adapter fuer Confirm-Flows.
2. `HomeShuffleCollectionModal`, `HomeDeckCardsModal`, `ImportModal`
   migrieren.
3. E1 `useHomeViewController` in Use-Case-Hooks schneiden.

Ergebnis: weniger gestapelte Ad-hoc-Modals, kleinerer Home-God-Hook.

### Sprint 7 - Panels, Sheets und Dokumentation

1. `FullscreenPanel` auf `LearningPlanPanel` anwenden.
2. Video-Panels und `AcronymDetailPanel` migrieren.
3. `Sheet`/`MobileBottomSheet` final entscheiden.
4. F2 Dossier aufteilen und generierte Inventare einbauen.

Ergebnis: Overlay-Landschaft ist systematisch, Doku bleibt wartbar.

## Definition of Done fuer jede Architekturphase

- Gezielte Unit-/Integrationstests sind gruen.
- `npx tsc --noEmit` ist gruen.
- `npm run build` ist gruen.
- Keine neue Schichtverletzung laut Architektur-Check.
- `card-pwa-architektur.md` oder `docs/architecture/*` wird aktualisiert,
  wenn sich das Zielbild aendert.
- Jede bewusste Ausnahme ist dokumentiert mit Grund und Rueckbaupfad.

## Nicht-Ziele

- Kein kompletter Rewrite.
- Kein globaler Store als Ersatz fuer Dexie oder Query-Funktionen. Zustand
  ist nur fuer UI-/View-/Overlay-/Runtime-State vorgesehen.
- Kein Redux Toolkit als Default, solange die App keinen schweren
  Event-Sourcing-/Devtools-/Time-Travel-Bedarf hat.
- Keine Browser-E2E-Suite als Voraussetzung fuer alle Schritte; gezielte
  Tastatur-/Overlay-Tests reichen fuer die Overlay-Migration.
- Kein ungepruefter Eigenbau eines vollstaendigen Dialog-/Focus-Trap-Systems,
  solange native oder etablierte Primitives reichen.
- Keine funktionale Aenderung am Lernalgorithmus im Rahmen dieser
  Architekturarbeit.
