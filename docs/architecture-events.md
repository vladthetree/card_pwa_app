# Runtime Event Catalog

Stand: 2026-07-27

## `REVIEW_UPDATED_EVENT`

- Quelle: Review-Mutationen wie Review erfassen, Undo und Lernfortschritt-Reset.
- Konsumenten: Review-Statistik-Hooks wie Heatmap/Streak und UI-Revisionen.
- Grund: Einige Aggregate laufen bewusst ueber Worker und Storage-/Visibility-
  Signale; Dexie-`liveQuery` allein wuerde hier nicht alle sichtbaren Refresh-
  Faelle ohne teure Recomputes abdecken.
- Rueckbaupfad: Review-Aggregate koennen schrittweise auf Query-Revisionen oder
  liveQuery-basierte Signaturen umgestellt werden.

## `EXAM_DATE_SYNCED_EVENT`

- Quelle: Sync-Pull-Anwendung von `examDate.upsert`.
- Konsumenten: `SettingsContext`.
- Grund: Exam-Date lebt aktuell in localStorage-backed Settings, nicht in Dexie.
  Das Event aktualisiert den in-memory SettingsContext ohne Reload.
- Rueckbaupfad: Settings in einen explizit migrierten persistenten Settings-
  Store oder Dexie-Settings-Record verschieben.

## Service-Worker Sync/Update Messages

- Quelle: `service-worker.js`.
- Konsumenten: Sync-Runtime, Update-Banner, Reachability-Runtime.
- Grund: Diese Signale sind Browser-/Runtime-Zustand und keine persistenten
  Domain-Daten.
- Rueckbaupfad: keiner geplant; SW-Kommunikation bleibt eine Runtime-Grenze.

