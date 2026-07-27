# Import Boundary Exceptions

Stand: 2026-07-27

Die Datei `card_pwa/scripts/check-architecture-imports.mjs` enthaelt eine
Baseline fuer bekannte Alt-Ausnahmen. Neue Schichtverletzungen sollen trotzdem
scheitern.

## Bewusste direkte Dexie-Zugriffe ausserhalb `db/`

- `hooks/useHeatmap.ts`, `hooks/useStreak.ts`: Worker-basierte Review-
  Aggregate mit Signatur-/Visibility-Refresh. Rueckbaupfad: Query-Revision
  oder liveQuery-basierte Read-Model-Funktionen.
- `hooks/useCardDb.ts`: zentraler Legacy-Datenhook. Rueckbaupfad: einzelne
  Query-Hooks und klarer Event-/Revision-Adapter.
- Sync-Services unter `services/syncPull/*`, `services/syncQueue.ts`,
  `services/syncedDeckScope.ts`: fachliche Sync-Grenze, darf direkt Dexie
  anwenden.
- Import/Backup/Algorithmus-Services: technische Batch-/Migrationsgrenzen.

## Bewusste UI-Komponenten-Ausnahmen

- `components/AppInitializer.tsx`: DB-Startup-Diagnose.
- `components/settings/SettingsPwaFullReset.tsx`: expliziter Full-Reset.

