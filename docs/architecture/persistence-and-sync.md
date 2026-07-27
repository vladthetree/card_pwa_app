# Persistence and Sync

## Quellen der Wahrheit

- Karten, Decks, Reviews, ShuffleCollections und VideoNotes: Dexie.
- Sync-Outbox und Sync-Queue: lokale transaktionale Outbox plus separate
  Sync-Queue-Datenbank.
- UI-Anzeigezaehler fuer Sync: abgeleitet, nicht dauerhaft.

## Contract

Die kanonische Sync-Matrix lebt in
`card_pwa/src/services/syncMutationContract.ts`. Der Contract nennt pro
Operation lokale Producer, Outbox-Verhalten, Serveroperation, Pull-Effekt,
Scope-Regel, Idempotenz und Tests.

