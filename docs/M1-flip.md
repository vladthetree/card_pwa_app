# M1 Flip — KI-Autorendoku (Standard-Karteikarte)

> Status: **neu generiert 2026-06-10** (Original-`docs/` waren nie in Git; Entscheidung
> TODO.md §4). Encoding verifiziert am Backup `card-pwa-backup-2026-06-08T21-54-32-447Z.csv`.

## Zweck

M1 ist das Standard- und Fallback-Format: Vorderseite mit Frage, Rückseite mit Antwort,
Selbstbewertung über die FSRS-Rating-Leiste **Nochmal(1) / Schwer(2) / Gut(3) / Leicht(4)**.
Jede Karte, die kein anderes Format-Encoding trägt (M2-Optionen, PBQ-Präfix, `RECALL:`),
wird als M1 gerendert. Studientext rendert durchgängig in Mono (Share Tech Mono).

## Eingabe-/Encoding-Format

```
front: <englische Frage als Fließtext, eine Aussage, keine Optionszeilen>
back:  <deutsche Antwort als Fließtext>

       [optional] Eselsbruecke: <Merkhilfe — wird als MERKHILFE-Block gerendert>
extra: { acronym?, examples?, port?, protocol? }   // optionale Zusatzfelder
tags:  [ "<Objective-Tag>", ... ]
```

Quellen und Objective-Zuordnung gehören in den QA-Katalog, niemals in den
Lerntext. Fachenglische Abkürzungen werden beim ersten Auftreten ausgeschrieben.

- Beginnt `front` mit `A:`/`B:`-Optionszeilen → die Karte wird **M2**, nicht M1.
- Beginnt `front` mit `ORDERING:`/`MATCHING:` → PBQ-Renderer. Mit `RECALL:` → M3.
- Beginnt `front` mit `SZENARIO:` → **M4 Szenario-Cloze** (docs/M4-szenario-cloze.md);
  in Ausbaustufe 1 rendert M4 bewusst als M1-Flip (Text+Wortbank vorn, Loesung hinten).
- Umlaute im Datenbestand historisch als ue/oe/ae transliteriert — beibehalten,
  damit Karten konsistent zum 779-Karten-Backup bleiben.

## Dos & Don'ts

**Do**
- Eine Frage = ein Konzept; aktive Formulierung („Welche Funktion erfüllt …?").
- Antwort in 1–3 Sätzen; zuerst die Kernaussage, dann die Begründung.
- `Eselsbruecke:` nutzen, wenn ein Konzept verwechslungsanfällig ist.
- Frage auf Englisch, Erklärung auf Deutsch; Quellen nur als Metadaten führen.

**Don't**
- Keine Multi-Part-Fragen („Nenne X und erkläre Y und vergleiche Z").
- Keine Antwortoptionen in `front` (das kippt die Karte nach M2).
- Keine Antworten > ~80 Wörter (Rückseite soll ohne Scrollen erfassbar sein).
- Kein HTML/Markdown im Kartentext — die App rendert Plaintext.

## Schwierigkeits-/Längen-Vorgaben

| Stufe | Frage | Antwort |
|---|---|---|
| Einsteiger | 1 Satz, Definitionsabfrage | 1–2 Sätze |
| Fortgeschritten | Szenario-Einzeiler („Ein Admin sieht …") | 2–3 Sätze + Eselsbrücke |
| Experte | Abgrenzungsfrage (X vs. Y im Kontext Z) | 3 Sätze, inkl. „warum nicht Y" |

## Beispiel-Prompt

> Erstelle 5 M1-Flip-Karten zu Zero Trust. Format je Karte: `front` = englische,
> eigenständig verständliche Frage; `back` = deutsche Antwort in 2–3 Sätzen
> + optional `Eselsbruecke:`. Quellen separat als QA-Metadaten liefern.
> Keine Antwortoptionen, kein Markdown.

## Beispiel-Output

```
front: Why does Zero Trust Network Access (ZTNA) replace broad network-level VPN access?
back: ZTNA gewaehrt Brokered Access zu einzelnen Apps statt Zugriff aufs ganze Netz.
Authentifizierung erfolgt pro Session, es gibt keinen impliziten Trust.

Eselsbruecke: ZTNA = Tuersteher an jeder Tuer, kein Generalpass wie beim VPN.
```
