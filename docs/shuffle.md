# Shuffle-Decks — KI-Autorendoku (deckübergreifende Lernmischungen)

> Status: **neu generiert 2026-06-10** (Original-`docs/` nie in Git). Verhalten
> verifiziert am Code des 17.-Mai-Branchs (`ShuffleStudyView`, `ShuffleSessionManager`,
> `shuffleCollections`-Queries).

## Zweck

Shuffle-Decks (virtuelle Decks / Collections) mischen Karten **mehrerer Quelldecks** zu
einer Session. Bewertungen fließen **in das jeweilige Ursprungsdeck** zurück — eine
Shuffle-Collection hält keine eigenen Karten, nur `deckIds`. Sichtbar/startbar nur,
wenn `settings.shuffleModeEnabled` aktiv ist (Settings → Shuffle-Modus).

## Eingabe-/Encoding-Format

Shuffle-Collections sind **Daten, keine Karten**:

```
ShuffleCollection {
  id:       <uuid>
  name:     <Anzeigename, z. B. "Pruefungssprint Domain 1+2">
  deckIds:  [ "<deckId>", ... ]   // Quelldecks; Subdecks über ihre eigenen IDs
}
```

Karten-Auswahl pro Session: fällige Karten aus allen `deckIds`, priorisiert wie eine
reguläre Session (Learning/Relearning zuerst, dann Review/New), gekappt auf
`settings.studyCardLimit`. Beim Autorieren neuer Inhalte für Shuffle-Lernen gilt das
Encoding des jeweiligen Kartenformats (M1/M2/M3 — siehe deren Doku); Shuffle selbst
braucht kein Karten-Encoding.

## Dos & Don'ts

**Do**
- Collections nach Lernzielen schneiden („alle 1.x-Decks", „Schwächen: Ports + Acronyms").
- 2–5 Quelldecks pro Collection — genug Mischung, noch fokussiert.
- Sprechende Namen wählen; der Name erscheint im Session-Header.

**Don't**
- Keine Collections als Karten-Container missverstehen — Karten gehören immer
  einem echten Deck.
- Nicht dasselbe Deck in viele Collections legen und parallel lernen — die
  Fälligkeiten sind global, Sessions konkurrieren um dieselben Karten.

## Vorgaben

- Session-Größe folgt `studyCardLimit` (Default 50, Settings-Regler 10–200).
- Metriken: `ShuffleMetricsModal` aggregiert pro Quelldeck — Collections so schneiden,
  dass die Deck-Aufschlüsselung aussagekräftig bleibt.

## Beispiel-Prompt

> Schlage 3 Shuffle-Collections für die SY0-701-Prüfungswoche vor. Gegeben sind die
> Decks `sy0-701-objective-1-1` … `sy0-701-objective-5-6` sowie
> `sy0-701-acronyms-bonus`. Je Collection: Name (deutsch) + Liste der deckIds +
> 1 Satz Lernziel-Begründung.

## Beispiel-Output

```
1. "Fundament-Sprint" — deckIds: [sy0-701-objective-1-1, sy0-701-objective-1-2,
   sy0-701-acronyms-bonus] — Grundbegriffe und Akronyme gemischt festigen.
2. "Netz & Architektur" — deckIds: [sy0-701-objective-3-1, sy0-701-objective-3-2,
   sy0-701-objective-4-5] — Architektur- und Firewall-Wissen quer abfragen.
3. "Incident-Drill" — deckIds: [sy0-701-objective-4-8, sy0-701-objective-4-9] —
   IR-Ablauf und Forensik-Datenquellen im Wechsel.
```
