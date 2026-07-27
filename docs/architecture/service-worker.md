# Service Worker

Der Service Worker bleibt eigenstaendig fuer App-Shell-Caching, Runtime-
Signale und Background-Sync-Anstoss.

Sync-Regel:

- Offene App-Clients: der Service Worker delegiert per `SYNC_NOW` an die App.
- Keine App-Clients: der Service Worker darf die Sync-Queue direkt via
  IndexedDB flushen.

Der Contract-Test prueft Queue-DB-/Store-Konstanten und den gemeinsamen Push-
Envelope.

