# ADR 001: Overlay Primitive

Stand: 2026-07-27

## Status

Angenommen.

## Kontext

Die App hat mehrere Modal-, Sheet- und Panel-Varianten. Ziel ist keine groessere
`ModalShell`, sondern getrennte Oberflaechen: `Dialog`, `AlertDialog`, `Sheet`
und `FullscreenPanel`.

## Entscheidung

Wir starten mit einem kleinen projektinternen Primitive in
`card_pwa/src/ui/overlays/`. Es deckt die aktuelle Projektanforderung ab, ohne
eine neue UI-Dependency einzufuehren:

- `Dialog`
- `AlertDialog`
- `Sheet`
- `FullscreenPanel`

`ConfirmModal` ist als erster Adapter auf `AlertDialog` migriert. Weitere
Migrationen bleiben inkrementell und muessen Tastatur-/Fokusverhalten mit
Tests absichern, bevor komplexe verschachtelte Dialoge umgestellt werden.

## Muss-Kriterien

- sichtbarer Titel ist per ARIA verbunden
- Escape und Backdrop treffen nur das oberste Overlay
- Fokus kehrt zum Ausloeser zurueck
- nicht dismissible Overlays ignorieren Escape/Backdrop
- Reduced Motion reduziert Animationen
- z-Index-Werte kommen aus Overlay-Tokens, nicht aus rohen `z-[9999]`-Klassen

## Konsequenzen

Die Store-Basis darf Overlay-Stack und leichte Payloads modellieren. Die
visuelle Migration nutzt die neuen Primitives und `UI_TOKENS.zIndex` bzw.
`overlayTokens.zIndex` als einzige Quelle fuer neue Overlay-zIndex-Werte.
