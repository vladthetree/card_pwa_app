# Overlays and Dialogs

Neue Overlay-Arbeit landet unter `card_pwa/src/ui/overlays/`.

Ziel-Oberflaechen:

- `Dialog`
- `AlertDialog`
- `Sheet`
- `FullscreenPanel`

`ConfirmModal` ist der erste Adapter auf `AlertDialog`. Weitere Migrationen
folgen risikoarm in der Reihenfolge aus `docs/architektur-umsetzungsplan.md`.

Z-Index-Werte fuer neue Overlays kommen aus `UI_TOKENS.zIndex` bzw.
`overlayTokens.zIndex`.

