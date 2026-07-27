# System Overview

Card_PWA ist eine Offline-first-Lernapp. Persistente Lern- und Sync-Daten
liegen in Dexie und werden ueber Query-Funktionen, `liveQuery` und Sync-
Services gelesen oder veraendert.

Der neue UI-Store in `card_pwa/src/state/` ist bewusst auf kurzlebigen UI- und
Runtime-State begrenzt. Er ersetzt Dexie nicht.

