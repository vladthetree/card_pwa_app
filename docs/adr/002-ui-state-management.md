# ADR 002: UI-State-Management

Stand: 2026-07-27

## Status

Angenommen.

## Kontext

Die App nutzt Dexie als Offline-first-Quelle fuer Karten, Decks, Reviews,
Video-Notizen und Sync-Queue-nahe Daten. Gleichzeitig sind UI-Zustaende wie
Navigation, Overlay-Stack, Home-Preferences, Sync-Runtime-Anzeige und PWA-
Banner ueber Hooks und Komponenten verteilt.

Ein globaler Store darf diese persistenten Domain-Daten nicht duplizieren, weil
sonst Dexie/liveQuery, Sync-Pull und lokale Writes auseinanderlaufen koennen.

## Entscheidung

Wir fuehren einen kleinen UI-/Runtime-Store in `card_pwa/src/state/` ein. Die
erste Implementierung nutzt Reacts `useSyncExternalStore` statt einer neuen
Dependency. Das passt zur aktuellen Bundle-/Dependency-Politik und deckt die
benoetigten Slices ab:

- Navigation/View-State
- Overlay-Stack und leichte aktive Payloads
- Sync-Runtime-Anzeigezaehler und Status
- Home-UI-Preferences
- PWA-Runtime-Anzeigezustand

Dexie bleibt die Quelle der Wahrheit fuer dauerhafte Lern- und Sync-Daten.

## Nicht-Ziele

- Kein Ersatz fuer Dexie, Query-Funktionen oder `liveQuery`.
- Keine automatische Persistenz kompletter Stores.
- Keine Speicherung grosser Import-, Backup-, Video- oder Review-Payloads im
  UI-Store.
- Keine Migration von SettingsContext in diesem Schritt.

## Konsequenzen

- Komponenten abonnieren selektiv ueber `useAppStore(selector)`.
- Store-Slices bleiben synchron und importieren keine React-Komponenten.
- Persistenz kleiner UI-Praeferenzen wird spaeter explizit pro Slice
  entschieden.
- Falls Devtools oder Middleware wichtig werden, kann Zustand spaeter hinter
  derselben Slice-Grenze eingefuehrt werden.

## Teststrategie

- Reine Slice-/Store-Tests fuer Stack-, Counter- und Reset-Verhalten.
- Hook-/Komponententests nur fuer Migrationen, die sichtbares Verhalten aendern.

