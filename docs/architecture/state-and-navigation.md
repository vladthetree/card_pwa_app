# State and Navigation

Der UI-Store lebt in `card_pwa/src/state/` und nutzt Reacts
`useSyncExternalStore`.

Aktuell umgesetzt:

- Store-Basis und Selektor-Helfer
- Overlay-Stack-Slice
- Sync-Runtime-Slice
- Navigation-, Home-UI- und PWA-Runtime-Slice als Grundlage

Noch offen:

- `useAppNavigation()` als Adapter auf `navigationSlice`
- Home-UI-Preferences in `homeUiSlice` migrieren
- Overlay-Stack an alle Dialoge anbinden

