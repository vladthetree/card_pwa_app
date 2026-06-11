# M3 Free Recall — KI-Autorendoku (erinnern → aufdecken → selbst bewerten)

> Status: **neu generiert 2026-06-10, ohne Original-Screenshot** (RECOVERY_LOG §4,
> jetzt in der Git-Historie bis `f72ffd6`).
> Dieses Dokument **definiert** das Encoding (Entscheidung TODO.md Phase 2 D);
> Renderer: `FreeRecallCard.tsx`, Erkennung: `isFreeRecallCard()` in `cardVariant.ts`.

## Zweck

M3 trainiert aktiven Abruf ohne Hilfen: Der Lernende formuliert die Antwort zuerst im
Kopf, deckt dann auf und bewertet sich selbst („Wusstest du die Antwort?" →
**Gewusst / Nicht gewusst**). „Nicht gewusst" erzwingt Rating 1 (Again) — dieselbe
Sonderregel wie bei falschen M2-Antworten (P2.2); „Gewusst" lässt die freie
FSRS-Bewertung 1–4 zu.

## Eingabe-/Encoding-Format

Eine Karte ist M3, wenn **eine** der beiden Markierungen vorliegt:

1. `front` beginnt mit dem Präfix **`RECALL:`** (analog `ORDERING:`/`MATCHING:`), oder
2. die Karte trägt den Tag **`free-recall`** (akzeptiert: `Free-Recall`, `free_recall`,
   `Free Recall`).

```
front: RECALL: <offene Abruf-Aufgabe, z. B. "Nenne die sechs Phasen ...">
back:  <Musterantwort als Fließtext>

       [optional] Eselsbruecke: <Merkhilfe>
tags:  [ "free-recall", "<Objective-Tag>" ]
```

Das Präfix wird in der Anzeige entfernt. Keine Optionszeilen im `front` (sonst greift
die M2-Erkennung nicht mehr sauber — M3 wird zwar vor M2 geprüft, aber Optionszeilen
sind in M3 inhaltlich sinnlos).

## Dos & Don'ts

**Do**
- Aufgaben stellen, die **Produktion** verlangen: „Nenne …", „Skizziere den Ablauf …",
  „Erkläre in eigenen Worten …".
- Musterantwort als Checkliste der erwarteten Punkte formulieren.
- Listen-Abfragen (Phasen, Schritte, Kategorien) — dafür ist M3 ideal.

**Don't**
- Keine Ja/Nein- oder Ein-Wort-Fragen (dafür M1).
- Keine Aufgaben mit > ~7 erwarteten Punkten (Selbstbewertung wird unscharf).
- Keine Fangfragen — der Lernende bewertet sich selbst, Ambiguität frustriert.

## Schwierigkeits-/Längen-Vorgaben

- Einsteiger: 3–4 erwartete Punkte (z. B. CIA-Triade nennen + je 1 Satz).
- Fortgeschritten: 5–6 Punkte oder Ablauf in korrekter Reihenfolge.
- Experte: Ablauf + Begründung je Schritt („warum vor X?").

## Beispiel-Prompt

> Erstelle 3 M3-Free-Recall-Karten (Deutsch, ue/oe/ae) zu SY0-701 Obj 4.8 (Incident
> Response). `front` beginnt mit `RECALL:` und stellt eine offene Abruf-Aufgabe;
> `back` enthält die Musterantwort (Aufzählung in Fließtext) + optional
> `Eselsbruecke:`. Tag-Liste: `free-recall`, `4.8`.

## Beispiel-Output

```
front: RECALL: Nenne die sechs Phasen des NIST-Incident-Response-Lebenszyklus in
der richtigen Reihenfolge.
back: Preparation, Detection & Analysis, Containment, Eradication, Recovery,
Lessons Learned.

Eselsbruecke: P-DA-C-E-R-L — erst vorbereiten und erkennen, dann eindaemmen,
ausmerzen, wiederherstellen, lernen.
tags: free-recall, 4.8
```
