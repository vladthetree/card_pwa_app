# ADR 001: Overlay Primitive

Stand: 2026-07-27

## Status

Vorgeschlagen.

## Kontext

Die App hat mehrere Modal-, Sheet- und Panel-Varianten. Ziel ist keine groessere
`ModalShell`, sondern getrennte Oberflaechen: `Dialog`, `AlertDialog`, `Sheet`
und `FullscreenPanel`.

## Entscheidung

Vor einer breiten Migration wird ein kleines projektinternes Primitive mit
Tests gegen `ConfirmModal` und einen einfachen Anzeige-Dialog evaluiert. Die
Entscheidung bleibt offen, bis Tastatur-, Fokus-, iOS-PWA- und Nested-Overlay-
Verhalten nachgewiesen sind.

## Muss-Kriterien

- sichtbarer Titel ist per ARIA verbunden
- Escape und Backdrop treffen nur das oberste Overlay
- Fokus kehrt zum Ausloeser zurueck
- nicht dismissible Overlays ignorieren Escape/Backdrop
- Reduced Motion reduziert Animationen
- z-Index-Werte kommen aus Overlay-Tokens, nicht aus rohen `z-[9999]`-Klassen

## Konsequenzen

Die Store-Basis darf Overlay-Stack und leichte Payloads bereits modellieren.
Die visuelle Migration startet erst, wenn das Primitive per Test abgesichert
ist.

