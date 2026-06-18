# M4 Szenario-Cloze — KI-Autorendoku (Lueckentext aus Bestandskarten)

> Status: **definiert 2026-06-13, machbar in 2 Stufen** (Machbarkeits-Check
> gegen `cardVariant.ts`/`cardTextParser.ts`, siehe unten). Quellbasis ist der
> bestehende Kartenbestand (779 Karten, Backup
> `card-pwa-backup-2026-06-08T21-54-32-447Z.csv`).
> Hinweis: Front-Nummerierungen im Bestand wie `M1-032`/`M4-040` sind
> Quell-Modul-Nummern der Karten, KEINE Modus-Bezeichnungen.

## Zweck

M4 verpackt **mehrere Fachbegriffe aus bestehenden Karten** in EINEN
zusammenhaengenden Szenariotext (3–6 Saetze) mit nummerierten Luecken plus
Wortbank. Trainiert wird die **Anwendung im Kontext** statt isolierter Abfrage:
Der Lernende muss die Begriffe gegeneinander abgrenzen und richtig im
Berufsszenario platzieren. M4 ergaenzt M1/M2/M3 — es ersetzt keine Quellkarte,
sondern verwebt 3–6 davon.

## Machbarkeit (geprueft am Code, 2026-06-13)

**Stufe 1 — sofort lauffaehig, ohne App-Aenderung:**
`getCardVariant()` kennt nur `ORDERING:`/`MATCHING:`, `isFreeRecallCard()` nur
`RECALL:`/Tag, M2 verlangt exakt 4 `A:`–`D:`-Zeilen plus genau einen
`>> CORRECT:`-Marker. Eine Karte mit `SZENARIO:`-Front (ohne diese Marker)
faellt deshalb sicher auf den **M1-Flip-Fallback** zurueck: Text + Wortbank
vorn, Loesung + Begruendung hinten, Selbstbewertung ueber die FSRS-Leiste.

**Stufe 2 — interaktiver Renderer (geplant):** Luecken als Dropdowns
(eine Auswahl je Luecke, Wortbank als Optionsliste) sind strukturell die
Matching-Interaktion der Labs; `computeMatchingScore` aus `utils/pbqScoring.ts`
ist wiederverwendbar. Erkennung dann ueber `isSzenarioClozeCard()` in
`cardVariant.ts` (Praefix `SZENARIO:` oder Tag `szenario-cloze`), bewusst ohne
Erweiterung des `CardVariant`-Enums — gleiche Entscheidung wie bei M3.
Falsch beantwortete Luecken erzwingen Rating 1 (Again), konsistent zur
P2.2-Regel von M2/M3.

## Metrik-Anker: Card-ID als Sammelbecken (verbindlich)

Die **`card_id` der Quellkarte ist der Join-Key fuer alle Metriken** ueber alle
Variationen desselben Inhalts (M1/M2-Original ↔ M4-Luecke). Deshalb gilt:

- Jede M4-Karte traegt fuer JEDE Luecke einen Tag `src:<card_id>` —
  in Luecken-Reihenfolge. Tags liegen im Datenmodell (`Card.tags`) und
  ueberleben Export/Import (CSV-Spalte `tags`); der Link ist damit ab Tag 1
  dauerhaft in den Daten, auch wenn die Aggregation erst spaeter kommt.
- Die M4-Karte selbst ist eine normale Karte mit eigener ID und eigenem
  FSRS-Zustand. Stufe-2-Ausbau: Luecken-Ergebnisse zusaetzlich je
  `src:`-Karte aggregieren (Lapse-/Fehlerstatistik pro Quell-`card_id`,
  Anschluss an die bestehende Lapse-Gewichtung im `StudySessionManager`).
- Distraktoren in der Wortbank bekommen KEINEN `src:`-Tag (nur Luecken zaehlen
  als Quellbezug).
- M4-Karten in eigene Decks legen (Empfehlung: `SZ: <Quell-Deck-Name>`), damit
  sie die Statistiken der Quell-Decks nicht verzerren.

## Eingabe-/Encoding-Format

```
front: SZENARIO: <Titel, max. ~45 Zeichen>
<Szenariotext, 3–6 Saetze, Luecken als [1], [2], … — jede genau einmal>

WORTBANK: <Begriff> | <Begriff> | … (alphabetisch sortiert, inkl. 0–2 Distraktoren)

back: LOESUNG: 1=<Begriff>; 2=<Begriff>; …

<2–4 Saetze Begruendung: warum gehoert welcher Begriff an welche Stelle>

[optional] Eselsbruecke: <Merkhilfe>
PDF-Bezug: SY0-701 Obj <x.y>

tags: ["szenario-cloze", "src:<card_id>", "src:<card_id>", …, "<Objective-Tag>"]
```

Kollisionsregeln (Pflicht, sonst greift ein falscher Renderer):
- Keine Zeilen, die mit `A:`–`D:` beginnen (M2-Erkennung).
- Kein `>> CORRECT:` im `back` (M2-Erkennung).
- Nicht mit `ORDERING:`/`MATCHING:`/`RECALL:` beginnen (PBQ/M3).
- Wortbank alphabetisch — die Reihenfolge darf die Loesung nicht verraten.
- Umlaute als ue/oe/ae (konsistent zum Bestand).

## Dos & Don'ts

**Do**
- 3–6 Luecken aus 3–6 Quellkarten EINES Themenclusters (gleiche Objective/Tags).
- Jede Luecke muss durch den Satzkontext EINDEUTIG bestimmt sein — geprueft
  gegen jeden anderen Wortbank-Begriff (Exklusivitaets-Check wie Labs-P2).
- Rekontextualisieren: neues Berufsszenario erfinden, keine Saetze der
  Quellkarten woertlich uebernehmen.
- Distraktoren aus demselben Deck waehlen (plausibel, aber in keine Luecke
  passend).

**Don't**
- Den Begriff einer Luecke nicht vorher im Text nennen (sonst Ratespiel rueckwaerts).
- Keine Fuellwort-Luecken („Das [1] ist wichtig") — Luecke = der Fachbegriff,
  dessen Verstaendnis geprueft wird.
- Keine zwei Luecken, die untereinander tauschbar waeren, ohne dass der Text
  falsch wird.
- Nicht mehr als 6 Luecken (Arbeitsgedaechtnis; Selbstbewertung in Stufe 1
  wird sonst unscharf).
- Ungeeignete Quellkarten nicht erzwingen: reine Rechenkarten, PBQs und
  Ja/Nein-Karten bleiben aussen vor (in der Coverage-Liste begruenden).

## Schwierigkeits-/Laengen-Vorgaben

| Stufe | Saetze | Luecken | Distraktoren |
|---|---|---|---|
| Einsteiger | 3–4 | 3 | 0–1 |
| Fortgeschritten | 4–5 | 4–5 | 1 |
| Experte | 5–6 | 5–6 | 2 (nah am Thema) |

## KI-Prompt (vollstaendig — fuer die Generierung aus einem Deck)

> Du bist Autor fuer CompTIA-Security+-Lerninhalte (SY0-701). Input ist der
> vollstaendige Karten-Export EINES Decks als CSV/Liste mit `card_id`, `front`,
> `back`, `tags`.
>
> **Pass 1 — Sichtung:** Lies ALLE Karten des Decks. Extrahiere je Karte den
> Kern-Fachbegriff (bei MC-Karten die Kurzantwort hinter `>> CORRECT: X | …`,
> bei Flip-Karten den Antwortkern). Bilde thematische Cluster aus je 3–6
> Karten mit zusammengehoerigen Begriffen (gleiche Objective/Tags). Markiere
> Karten, die sich nicht eignen (Rechenaufgaben, PBQs, Ja/Nein) — sie kommen
> in die Coverage-Liste mit Begruendung.
>
> **Pass 2 — Generierung:** Schreibe je Cluster EINEN Szenariotext nach dem
> Encoding aus docs/M4-szenario-cloze.md: 3–6 Saetze, realistisches
> Berufsszenario (SOC/Admin/Audit-Kontext), deutsch mit ue/oe/ae, jede Luecke
> `[n]` genau einmal, Wortbank alphabetisch mit 0–2 Distraktoren aus demselben
> Deck. Regeln: Begriff nie vor seiner Luecke nennen; keine Quellkarten-Saetze
> woertlich kopieren; jede Luecke muss durch ihren Satzkontext eindeutig sein —
> pruefe jeden Wortbank-Begriff gegen jede Luecke (genau 1 muss passen).
> `back` mit `LOESUNG:`-Zeile + 2–4 Saetzen Begruendung + `PDF-Bezug`.
> Tags: `szenario-cloze`, dann `src:<card_id>` je Luecke in
> Luecken-Reihenfolge, dann Objective-Tag.
>
> **Pass 3 — Selbst-Review:** Pruefe jeden Text nach docs/labs-review-prompt.md
> P1–P3 (fachlich wahr nach SY0-701, eindeutig loesbar, allein aus dem Text
> nachvollziehbar). Verwirf oder verschaerfe Texte mit tauschbaren Luecken.
>
> **Output:** 1) Karten im Encoding, 2) Coverage-Liste: jede `card_id` des
> Decks mit Status `verwendet in <Szenario>` / `ausgelassen: <Grund>`.

## Beispiel-Output (aus echten Bestandskarten, Deck „1.2 Security Concepts")

```
front: SZENARIO: Vertrag digital unterschreiben
Ein Vertragsdokument wird digital versendet. Damit Unbefugte den Inhalt
unterwegs nicht lesen koennen, schuetzt [1] die Uebertragung. Der Empfaenger
prueft ueber den Hash, dass das Dokument seit der Signatur unveraendert ist —
das liefert [2]. Dass die Signatur wirklich vom angegebenen Absender stammt,
belegt [3]. Beides zusammen ergibt [4]: Der Absender kann das Senden spaeter
nicht abstreiten. Die Bindung seines oeffentlichen Schluessels an seine
Identitaet bestaetigt dabei ein [5].

WORTBANK: Encryption | Non-repudiation | Proof of Integrity | Proof of Origin | Redundancy | Zertifikat

back: LOESUNG: 1=Encryption; 2=Proof of Integrity; 3=Proof of Origin; 4=Non-repudiation; 5=Zertifikat

Encryption schuetzt die Vertraulichkeit der Uebertragung. Proof of Integrity
(Hash) belegt Unveraendertheit, Proof of Origin die Herkunft — zusammen
ergeben sie Non-repudiation. Das Zertifikat bindet den Public Key an die
Identitaet des Absenders. Redundancy ist der Distraktor (Verfuegbarkeit,
passt in keine Luecke).

PDF-Bezug: SY0-701 Obj 1.2

tags: ["szenario-cloze", "src:1728580188327", "src:1728581211819",
       "src:1728581264271", "src:1728581032043", "src:1728580721902", "1.2"]
```

Zweites Beispiel (Deck „4.8 Incident Response", Einsteiger, 4 Luecken):

```
front: SZENARIO: Verdacht im SOC
Noch bevor ein Alarm feuert, sucht das SOC proaktiv nach Spuren unentdeckter
Angreifer — dieses Vorgehen heisst [1]. Als ein Host auffaellig wird, beginnt
die Disziplin, die Beweise waehrend und nach dem Vorfall erhebt: [2]. Wegen
des Verdachts auf laufende Schadprozesse wird zuerst der fluechtige
Arbeitsspeicher per [3] untersucht. Parallel verlangt die Rechtsabteilung per
Dokument die Aufbewahrung aller relevanten Daten — ein [4].

WORTBANK: Digital Forensics | Legal Hold | Memory Forensics | Threat Hunting

back: LOESUNG: 1=Threat Hunting; 2=Digital Forensics; 3=Memory Forensics; 4=Legal Hold

Threat Hunting ist die proaktive Suche VOR einem Alarm. Digital Forensics ist
die uebergeordnete Beweis-Disziplin, Memory Forensics ihr Spezialfall fuer
fluechtigen Speicher. Der Legal Hold setzt Loeschfristen aus.

PDF-Bezug: SY0-701 Obj 4.8

tags: ["szenario-cloze", "src:1729614400121", "src:1729614808452",
       "src:1729005242071", "src:1729614972339", "4.8"]
```
