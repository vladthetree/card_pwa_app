# Bericht: Darstellung auf Handy & Desktop — Analyse + verbindliche Umsetzungsvorgaben

Stand: 2026-07-03 · Methode: Code-Analyse (Layout-Container, Breakpoints, Handset-Pfad)
plus Live-Screenshots der App via `run-card-pwa`-Driver (Chromium headless) in
390×844 (Touch), 1280×900 und 1920×1080.

Dieses Dokument ist zweiteilig: **Teil A** ist die Analyse (warum), **Teil B** sind
maschinen-präzise Arbeitspakete (was genau), die ein KI-Agent ohne weitere
Rückfragen fehlerfrei umsetzen kann. Alle Ist-Code-Strings in Teil B wurden am
o. g. Stand wörtlich verifiziert.

---

# Teil A — Analyse

## 1. Kernaussage

**Mobil ist die App sehr gut optimiert** — dedizierter Handset-Pfad
(`useHandsetLayout`: `pointer: coarse` + `≤1024px`), Karte füllt die volle Höhe,
Rating als 2×2-Grid am Daumenrand, Safe-Areas und Landscape gelöst.

**Desktop ist kaum gestaltet:** oberhalb von 768px (`md:`) passiert fast nichts
mehr. Auf 1920×1080 entstehen drei sichtbare Probleme: extrem breite Lesezeilen
in der Lernansicht, eine leere untere Bildschirmhälfte und einspaltige Listen in
einem 1280px-Container. Alle Maßnahmen in Teil B betreffen ausschließlich den
Desktop-Pfad — der Mobile-Pfad wird nicht angefasst.

Messbare Basis (Tailwind-Klassen im gesamten `src/`):

| Breakpoint | Vorkommen |
|---|---|
| `sm:` (≥640px) | 229 |
| `md:` (≥768px) | 36 |
| `lg:` (≥1024px) | **4** |
| `xl:` / `2xl:` | **0** |

## 2. Ist-Zustand pro Ansicht

### 2.1 Lernansicht (StudyView) — größter Handlungsbedarf

Evidenz (1920×1080): Karte spannt sich über ~1900px, Fragetext als einzelne
Zeile oben links, untere ~40 % des Viewports leer. Nach dem Aufdecken laufen
Antwortzeile und die vier Rating-Buttons (je ~460px) über die volle Breite.

Ursachen:
- `StudyView.tsx` Karten-Wrapper `w-full` ohne `max-w-*`; Scroll-Container nur `px-3 sm:px-4`.
- Rating-Bar `w-full`, nicht an eine Lesespalte gekoppelt.
- `CardFace.tsx` Desktop `min-h-[500px]`, aber kein Füllen der Resthöhe (mobil über `compact` gelöst).
- Zeilenlängen 200+ Zeichen — weit über der Lesbarkeitsgrenze (~60–90).
- Inkonsistenz: `ShuffleStudyView` begrenzt bereits auf `max-w-5xl`.

### 2.2 Startseite (HomeView)

Container `max-w-7xl` (gut), KPI-Zeile `grid-cols-2 sm:grid-cols-4` (gut),
aber **Deck-Liste einspaltig** — bei vielen Decks langes Scrollen, rechts
ungenutzter Platz. Mobil (2×2-KPIs, kompakte Kacheln) gut.

### 2.3 Karten-Editor (CardFormModal)

Desktop: ~512px schmale Mittelspalte (`sm:max-w-lg`), Felder stapeln vertikal,
Footer muss erscrollt werden — ineffizient für die häufigste Desktop-Tätigkeit
(Authoring).

### 2.4 Lernvideos (VideosView) — Positivbeispiel

Echter 3-Spalten-Split (Sidebar `w-56`, Player `flex-[3]`, Notizen `w-1/4
min-w-[300px]`). Einziger Punkt: Video auf `max-w-4xl` (896px) gedeckelt —
auf 1920px viel Schwarz um den Player. Mobil vorbildlich.

### 2.5 Mobile-Pfad insgesamt

`useHandsetLayout`, `compact`-CardFace, 2×2-Rating, Landscape-`clamp(...dvh...)`,
Safe-Area-Utilities: ausgereift. **Das Handset-Muster „Karte füllt Höhe, Aktionen
unten fixiert" ist genau das, was dem Desktop fehlt.**

### 2.6 Viewport-Meta

`index.html` setzt `maximum-scale=1.0, user-scalable=no` → kein Pinch-Zoom
(Accessibility). iOS ignoriert das ohnehin, Android respektiert es.

---

# Teil B — Verbindliche Umsetzungsvorgaben für KI-Agenten

## B.0 Globale Leitplanken (gelten für JEDES Arbeitspaket)

1. **Handset-Pfad ist tabu.** In Ausdrücken der Form
   `` `${isHandsetLayout ? 'X' : 'Y'}` `` darf ausschließlich der `Y`-Zweig
   (Desktop) geändert werden. Der `X`-Zweig und alles hinter `compact === true`
   bleibt byte-identisch.
2. **Exakt-Match-Pflicht.** Jede Änderung ist als „Suchstring → Ersatzstring"
   definiert. Matcht der Suchstring nicht wörtlich (Code hat sich bewegt):
   **abbrechen und melden, nicht raten.** Zeilennummern sind Orientierung,
   der String ist die Wahrheit.
3. **Safe-Area-Regeln aus `card_pwa/CLAUDE.md` einhalten:** keine
   `var(--safe-*)`, keine Apple-Legacy-Metas, keine globalen Safe-Area-Wrapper.
4. **Framer Motion nur über `src/ui/motion`** importieren (niemals direkt
   `framer-motion` — Bundle-Regel).
5. **Ein Arbeitspaket = ein Commit.** Runde 1 (AP1–AP5) ist umgesetzt und
   verifiziert (siehe B.8). Offen ist Runde 2: Reihenfolge AP6 → AP10 → AP7 →
   AP8 → AP11 (AP9 und AP12 nur auf ausdrücklichen Wunsch). Jedes AP ist
   unabhängig; bei Fehlschlag der Verifikation: Commit verwerfen, nächstes AP
   trotzdem möglich.
6. **Nach jedem AP die Verifikation aus B.7 ausführen** (Build + Tests +
   Screenshot-Vergleich Desktop und Mobile). Mobile-Screenshots müssen vor/nach
   identisches Layout zeigen (Pixel-Toleranz: Karteninhalt gleich positioniert).

## AP1 (✅ umgesetzt) — StudyView Desktop: Lesespalte + vertikale Balance

**Ziel:** Karte und Rating auf max. 1024px Lesespalte begrenzen (Konsistenz mit
ShuffleStudyView) und den Kartenblock in der Resthöhe zentrieren, Rating optisch
Richtung Unterkante.

**Datei:** `card_pwa/src/components/StudyView.tsx`

**Änderung 1 — Scroll-Container wird Flex-Spalte (nur Desktop-Zweig).**
Suchstring (aktuell Zeile ~941):

```
className={`flex-1 min-h-0 ${isHandsetLayout ? 'overflow-hidden px-2 pt-2 pb-2' : 'overflow-y-auto px-3 sm:px-4 py-4 sm:py-6'}`}
```

Ersatz:

```
className={`flex-1 min-h-0 ${isHandsetLayout ? 'overflow-hidden px-2 pt-2 pb-2' : 'flex flex-col overflow-y-auto px-3 sm:px-4 py-4 sm:py-6'}`}
```

**Änderung 2 — Karten-Wrapper: Lesespalte + Auto-Margin-Zentrierung (nur Desktop-Zweig).**
Suchstring (aktuell Zeile ~961):

```
className={`w-full ${isHandsetLayout ? 'flex h-full min-h-0 flex-col' : ''}`}
```

Ersatz:

```
className={`w-full ${isHandsetLayout ? 'flex h-full min-h-0 flex-col' : 'mx-auto my-auto max-w-5xl'}`}
```

Hinweis: `my-auto` in einer Flex-Spalte zentriert die Karte im freien Raum und
kollabiert bei Überlauf automatisch auf 0 (kein Clipping — deshalb NICHT
`justify-center` auf dem Scroll-Container verwenden).

**Änderung 3 — Rating-Bar an die Lesespalte koppeln.**
Suchstring (aktuell Zeile ~995):

```
className="w-full mt-5 sm:mt-6"
```

Ersatz:

```
className="mx-auto w-full max-w-5xl mt-5 sm:mt-6"
```

(Dieser String kommt in der Datei nur einmal vor — im
`{!isHandsetLayout && (` … `)}`-Block der Rating-Bar. Steht er woanders:
Leitplanke 2.)

**Erwartete Nebenwirkung (akzeptiert):** Beim Aufdecken rückt die zentrierte
Karte um ~die halbe Rating-Höhe nach oben. Kein Fix nötig.

**Verboten:** Änderungen an `CardFace.tsx`, am `compact`-Prop, an der
Handset-Rating-Leiste (`layout="grid"`-Pfad in `RatingBar`).

**Akzeptanzkriterien (messbar, 1920×1080):**
- Nach dem Aufdecken: Breite des „Gut"-Buttons ≤ 270px (vorher ~460px).
  Driver-Check: `'eval:[...document.querySelectorAll("button")].find(b=>b.textContent.trim().startsWith("Gut")).clientWidth'`
- Kartenblock horizontal zentriert; oberhalb und unterhalb des Kartenblocks
  ist der Leerraum ungefähr gleich groß (Screenshot-Sichtprüfung).
- Mobile-Screenshot (TOUCH=1 390×844) vor/nach identisch.

## AP2 (✅ umgesetzt) — Deck-Liste: 2 Spalten ab `lg`

**Ziel:** Deck-Kacheln nutzen ab 1024px zwei Spalten.

**Datei:** `card_pwa/src/components/home/HomeDeckListSection.tsx`

**Änderung 1 — Liste.** Suchstring (aktuell Zeile ~169):

```
<div className="flex flex-col gap-2.5 sm:gap-3">
```

Vorsicht: Derselbe String existiert **zweimal** (Zeile ~148 Skeleton, ~169 Liste).
**Beide** Vorkommen ersetzen durch:

```
<div className="grid grid-cols-1 items-start gap-2.5 sm:gap-3 lg:grid-cols-2">
```

`items-start` verhindert, dass eine hohe Kachel (Deck mit Unterdecks) die
Nachbarkachel in der Zeile künstlich streckt.

**Verboten:** Änderungen an `DeckCard.tsx` (verschachtelte Unterdecks rendern
innerhalb der Eltern-Kachel und sind dadurch grid-sicher).

**Akzeptanzkriterien:**
- 1920×1080 mit ≥2 Decks: zwei Kacheln nebeneinander (Screenshot).
- 390×844 (TOUCH=1): weiterhin genau eine Spalte.
- Zahlenmatrix (FÄLLIG/NEU/WIEDERHOLUNG × HEUTE/MORGEN) in halber Breite ohne
  Umbruch-Chaos (Sichtprüfung; falls Umbrüche: AP nicht mergen, melden).

## AP3 (✅ umgesetzt) — Karten-Editor Desktop: breiter + Frage/Antwort nebeneinander

**Ziel:** Authoring auf Desktop ohne Scrollen; Vorderseite/Rückseite im
Direktvergleich.

**Datei:** `card_pwa/src/components/CardFormModal.tsx`

**Änderung 1 — Modalbreite.** Suchstring (aktuell Zeile ~374):

```
max-w-none self-end rounded-b-none sm:max-w-lg sm:self-auto sm:rounded-b-[2rem]
```

Ersatz (nur `sm:max-w-lg` → `sm:max-w-lg md:max-w-3xl`):

```
max-w-none self-end rounded-b-none sm:max-w-lg md:max-w-3xl sm:self-auto sm:rounded-b-[2rem]
```

**Änderung 2 — Front/Back zweispaltig ab `md`, NUR im Standard-Kartentyp-Zweig.**
Im JSX-Zweig des Kartentyps „Vorderseite/Rückseite" (dort, wo die zwei
`<textarea>` mit den Platzhaltern `Frage oder Begriff...` und
`Antwort oder Definition...` gerendert werden, aktuell um Zeile ~594 und ~603):
die beiden `Field`-Blöcke (VORDERSEITE, RÜCKSEITE) in einen gemeinsamen Wrapper
setzen:

```jsx
<div className="grid gap-4 md:grid-cols-2">
  {/* Field VORDERSEITE (unverändert) */}
  {/* Field RÜCKSEITE (unverändert) */}
</div>
```

Die Felder selbst (Labels, Platzhalter, Handler, Validierung) bleiben
unverändert. Die Zweige MULTIPLE-CHOICE / ORDERING / MATCHING **nicht** anfassen.
MERKHILFE und TAGS bleiben volle Breite unterhalb des Grids.

**Akzeptanzkriterien:**
- 1920×1080: „Neue Karte erstellen" zeigt Vorderseite und Rückseite
  nebeneinander; „Speichern" ohne Scrollen sichtbar (Screenshot).
- 390×844 (TOUCH=1): Modal unverändert einspaltig als Bottom-Sheet.
- MC-/Ordering-/Matching-Typ im Modal durchklicken: Layout unverändert.
- Funktionstest per Driver-Sequenz aus B.7: Karte anlegen → „Gespeichert!"
  erscheint, Deck-Zähler `KARTEN` steigt auf 1.

## AP4 (✅ umgesetzt) — Video-Player-Deckel anheben

**Ziel:** Player-Spalte auf FHD besser füllen.

**Datei 1:** `card_pwa/src/components/videos/MesserVideoPlayer.tsx`
Suchstring (aktuell Zeile ~195):

```
${compact ? 'max-w-3xl shrink-0 gap-1.5' : 'max-w-4xl gap-2'}
```

Ersatz (nur der Desktop-Zweig, `compact`-Zweig unangetastet):

```
${compact ? 'max-w-3xl shrink-0 gap-1.5' : 'max-w-5xl gap-2'}
```

**Datei 2 (Konsistenz der Lade-/Leerzustände):**
`card_pwa/src/components/videos/VideosView.tsx` — dort existieren genau drei
Vorkommen von `aspect-video w-full max-w-4xl` (aktuell Zeilen ~600/605/611).
In allen drei `max-w-4xl` → `max-w-5xl`.

**Akzeptanzkriterien:**
- Desktop 1920: Video/Platzhalter sichtbar breiter, Notiz-Spalte unverändert
  (Screenshot Lernvideos + geöffnetes Video „The CIA Triad").
- Mobile Videos (TOUCH=1): unverändert (compact-Zweig).

## AP5 (✅ umgesetzt) — Pinch-Zoom freigeben

**Datei:** `card_pwa/index.html` (Zeile ~6). Suchstring:

```
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

Ersatz:

```
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

`viewport-fit=cover` MUSS erhalten bleiben (Edge-to-Edge/Safe-Areas).
Keine weiteren Metas hinzufügen oder entfernen (CLAUDE.md-Verbote!).

**Akzeptanzkriterien:** Build grün; Sichtprüfung Mobile-Screenshot unverändert.
Hinweis für den Betreiber: iOS übernimmt Meta-Änderungen erst nach Entfernen
und Neu-Hinzufügen der App vom Homescreen (in CLAUDE.md dokumentiert).

---

# Runde 2 — Optimierungen nach Verifikation (offen)

Ergebnis der Nachprüfung vom 2026-07-03 (Details in B.8) plus einer zweiten
Abdeckungsrunde über die restlichen Ansichten (Labs, Import, Metrik-Modals,
Tag-Browser, Spezialkarten, Abschluss-Screen): Runde 1 wirkt wie geplant;
es bleiben sieben Pakete. **AP6 und AP10 sind die wichtigsten (Bugfix bzw.
komplette Ansicht ohne Lesespalte), AP7/AP8/AP11 sind Feinschliff,
AP9/AP12 nur auf ausdrücklichen Wunsch.** Alle Ist-Strings wurden am Stand
nach Runde 1 (Commit `7694221`) wörtlich verifiziert und sind in ihrer Datei
eindeutig. Es gelten unverändert die Leitplanken aus B.0 und das
Verifikations-Playbook aus B.7.

## AP6 — Bugfix: Study-Karte schrumpft bei kurzem Inhalt (Priorität: hoch)

**Problem (vorbestehend, Befund F1 in B.8):** Bei kurzem Kartentext ist die
Karte auf Handsets und in Desktop-Fenstern <1024px nur so breit wie ihr Inhalt
(~140px bei einem Wort). Ursache: `items-start` auf der Flex-Spalte in
StudyView, kein `w-full` am Karten-Wrapper; ab `lg` kaschiert
`lg:flex-row` + `flex-1` das Problem.

**Datei:** `card_pwa/src/components/StudyView.tsx`
Suchstring (aktuell Zeile ~965, direkt unter dem `flex flex-col lg:flex-row`-Div):

```
<div className={`flex-1 ${isHandsetLayout ? 'h-full min-h-0' : ''}`}>
```

Ersatz:

```
<div className={`w-full min-w-0 flex-1 ${isHandsetLayout ? 'h-full min-h-0' : ''}`}>
```

`w-full` stellt die Breite in der Flex-Spalte wieder her; in der `lg:flex-row`
regelt weiterhin `flex-1` die Breite (dort ist `w-full` wirkungslos/harmlos).
`min-w-0` verhindert Overflow durch lange ungebrochene Tokens.

**Akzeptanzkriterien:**
- TOUCH=1 390×844, Karte mit einwortiger Antwort (z. B. „Testantwort.") →
  Karte spannt die volle Viewport-Breite (B.7-Mobilsequenz, Study-Screenshot).
- Desktop 1920: Lesespalte unverändert 1024px; „Gut"-Button weiterhin ≤ 270px.
- Build + Tests grün.

## AP7 — Desktop-Karte: Leerraum im Kasten reduzieren (Priorität: mittel, Geschmack)

**Problem:** Kurzer Text sitzt oben links in einem 500px hohen Kasten. Durch
die `my-auto`-Zentrierung aus AP1 wirkt ein niedrigerer Kasten ausgewogener.

**WICHTIG — die Staffel existiert als identische Kopie in FÜNF Dateien** (je
genau 1 Vorkommen). Alle fünf müssen im selben Commit geändert werden, sonst
haben Standard-, Matching-, Ordering-, DragMatch- und FreeRecall-Karten
unterschiedliche Höhen:

- `card_pwa/src/components/CardFace.tsx` (~Z. 324)
- `card_pwa/src/components/MatchingCard.tsx` (~Z. 140)
- `card_pwa/src/components/OrderingCard.tsx` (~Z. 237)
- `card_pwa/src/components/DragMatchCard.tsx` (~Z. 134)
- `card_pwa/src/components/FreeRecallCard.tsx` (~Z. 66)

Suchstring (in jeder der fünf Dateien identisch):

```
compact ? 'h-full min-h-0' : 'min-h-[280px] sm:min-h-[420px] md:min-h-[500px]'
```

Ersatz (nur der Desktop-Zweig; `compact`-Zweig unangetastet):

```
compact ? 'h-full min-h-0' : 'min-h-[280px] sm:min-h-[380px] md:min-h-[440px]'
```

**Hinweis:** CardFace wird auch von der Shuffle-Lernansicht (non-compact auf
Desktop) genutzt — die Änderung wirkt dort konsistent mit; das ist gewollt.

**Akzeptanzkriterien:**
- Desktop 1920, Karte mit kurzem Inhalt: Kasten sichtbar niedriger, Inhalt
  wirkt zentrierter; MC-Karten mit 4 Optionen weiterhin ohne Layoutsprung
  (Sichtprüfung mit einer Multiple-Choice-Karte im Editor anlegbar).
- `grep -rn "md:min-h-\[500px\]" card_pwa/src/components/` liefert nach der
  Änderung **null** Treffer (Konsistenz-Check über alle fünf Dateien).
- Mobil unverändert (compact-Zweig).

## AP8 — Karten-Editor: mehr Schreibfläche ab `md` (Priorität: mittel)

**Problem:** In der zweispaltigen Desktop-Form (AP3) bleiben die
Front-/Back-Textareas bei `rows={3}` (~72px) — für längere Kartentexte zu
knapp. Mobil soll die kompakte Höhe erhalten bleiben, daher CSS-`min-h` ab
`md:` statt `rows`-Erhöhung.

**Datei:** `card_pwa/src/components/CardFormModal.tsx` — genau **zwei**
Änderungen im Standard-Zweig (die Textareas mit `t.front_placeholder` bzw.
`t.back_placeholder`; die Strings `${inputCls} resize-none` existieren auch
bei MERKHILFE — die bleibt unverändert, deshalb mehrzeilig matchen):

Suchstring 1:

```
                      placeholder={t.front_placeholder}
                      rows={3}
                      className={`${inputCls} resize-none`}
```

Ersatz 1:

```
                      placeholder={t.front_placeholder}
                      rows={3}
                      className={`${inputCls} resize-none md:min-h-[10rem]`}
```

Suchstring 2:

```
                      placeholder={t.back_placeholder}
                      rows={3}
                      className={`${inputCls} resize-none`}
```

Ersatz 2:

```
                      placeholder={t.back_placeholder}
                      rows={3}
                      className={`${inputCls} resize-none md:min-h-[10rem]`}
```

**Akzeptanzkriterien:**
- Desktop 1920: beide Felder ~160px hoch, „Speichern" weiterhin ohne Scrollen
  sichtbar (Editor-Screenshot aus B.7-Desktopsequenz).
- Mobil 390×844: Feldhöhen unverändert (kein `md:` aktiv).
- MC-/Ordering-/Matching-Zweige und MERKHILFE unverändert.

## AP9 — Typografie-Stufe `lg:` für den Kartentext (NUR auf ausdrücklichen Wunsch)

**Kontext:** Durch die 1024px-Lesespalte (AP1) liest sich die aktuelle Größe
bereits gut. Dieses Paket nur umsetzen, wenn der Betreiber den Text auf FHD
ausdrücklich zu klein findet.

**Datei:** `card_pwa/src/components/CardFace.tsx`, Funktion
`getQuestionTextClass`, **nur der non-compact-Teil** (nach dem
`if (compact) { … }`-Block). Fünf Einzelersetzungen:

| Suchstring | Ersatz |
|---|---|
| `'text-xl sm:text-2xl md:text-3xl'` | `'text-xl sm:text-2xl md:text-3xl lg:text-4xl'` |
| `'text-lg sm:text-xl md:text-2xl'` | `'text-lg sm:text-xl md:text-2xl lg:text-3xl'` |
| `'text-base sm:text-lg md:text-xl'` | `'text-base sm:text-lg md:text-xl lg:text-2xl'` |
| `'text-[15px] sm:text-base md:text-lg'` | `'text-[15px] sm:text-base md:text-lg lg:text-xl'` |
| `return 'text-[16px]'` | `return 'text-[16px] lg:text-lg'` |

Der `compact`-Block (px-Werte) und `getOptionTextClass`/
`getCorrectAnswerTextClass` bleiben unangetastet (Options-/Chip-Texte bewusst
eine Stufe kleiner als der Fragetext).

**Akzeptanzkriterien:**
- Desktop 1920: Fragetext eine Stufe größer; T-Button-Stufen (Default→XXXL)
  weiterhin monoton aufsteigend.
- Mobil: unverändert (compact-Pfad).

## AP10 — Labs: Lesespalte für Übersicht + Szenario (Priorität: hoch)

**Problem:** Beide Labs-Ansichten haben — wie die StudyView vor AP1 —
**gar keinen** Breiten-Container: Kategorie-Kacheln, Szenario-Beschreibung,
Evidence-Boxen und Matching-/Ordering-Interaktionen laufen auf Desktop über
die volle Viewport-Breite.

**Änderung 1 — Übersicht.** Datei `card_pwa/src/components/labs/LabsView.tsx`,
Suchstring (einziges Vorkommen, direkt im Scroll-Container „Kategorien",
aktuell Zeile ~130):

```
<div className="flex flex-col gap-3">
```

Ersatz:

```
<div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
```

**Änderung 2 — Szenario-Ansicht.** Datei
`card_pwa/src/components/labs/LabScenarioView.tsx`. Der Scroll-Container
(einziges Vorkommen, aktuell Zeile ~133):

```
<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" data-study-scroll="allow">
```

bekommt einen inneren Wrapper um **sämtliche** bisherigen Kinder (analog zum
AP3-Muster; Kinder selbst unverändert):

```jsx
<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" data-study-scroll="allow">
  <div className="mx-auto w-full max-w-5xl">
    {/* alle bisherigen Kinder unverändert */}
  </div>
</div>
```

**Akzeptanzkriterien:**
- Desktop 1920: Labs-Kategorien und ein geöffnetes Szenario (inkl.
  Matching-Optionen) laufen in einer zentrierten ~1024px-Spalte.
  Driver-Weg: Home → `click:Filter` → Menüpunkt „Labs"/FlaskConical-Eintrag
  (per `dump` verifizieren), Screenshot vor/nach.
- Mobil 390×844 (TOUCH=1): optisch unverändert (`max-w-5xl` greift dort nicht).
- Labs-Fortschritt/Interaktion funktional unverändert (ein Szenario lösen).

## AP11 — Deck-Metrik-Modal an die anderen Metrik-Modals angleichen (Priorität: mittel)

**Problem:** `DeckMetricsModal` ist `max-w-xl` (576px), während
`ShuffleMetricsModal` und `FutureForecastModal` bereits `max-w-3xl` nutzen —
Diagramme/Verteilungen wirken im Deck-Modal auf Desktop gequetscht.

**Datei:** `card_pwa/src/components/DeckMetricsModal.tsx`,
Suchstring (aktuell Zeile ~68):

```
className={`${UI_TOKENS.modal.shell} max-w-xl`}
```

Ersatz:

```
className={`${UI_TOKENS.modal.shell} max-w-3xl`}
```

**Akzeptanzkriterien:** Desktop: Modal ~768px breit, Inhalte ohne
Layoutbruch (Sichtprüfung über „…"-Menü einer Deck-Kachel → Metriken);
mobil unverändert (Modal-Shell bleibt `w-full`-basiert).

## AP12 — Abschluss-Screen der Lernsession verbreitern (NUR auf ausdrücklichen Wunsch)

**Kontext:** Der Session-Abschluss (Zusammenfassung + SessionCoachPanel mit
Karten-Liste) steckt in `max-w-lg` (512px). Auf Desktop ist das eng, aber
bewusst fokussiert — nur ändern, wenn der Betreiber mehr Übersicht will.

**Datei:** `card_pwa/src/components/StudyView.tsx`,
Suchstring (aktuell Zeile ~661, Abschluss-Karte):

```
className={`w-full max-w-lg rounded-ds border bg-ds-card p-8 text-center shadow-card sm:p-10 ${
```

Ersatz:

```
className={`w-full max-w-lg md:max-w-2xl rounded-ds border bg-ds-card p-8 text-center shadow-card sm:p-10 ${
```

**Akzeptanzkriterien:** Desktop: Abschluss-Karte ~672px, Coach-Liste lesbarer;
mobil unverändert.

## B.6 Explizit NICHT umsetzen (ohne separaten Auftrag)

- Kein `h-full`-Refactor der Desktop-CardFace (Typografie-/Padding-Kaskade
  über `compact` — höheres Risiko, separates Paket).
- Keine Änderung an `useHandsetLayout`-Media-Queries.
- Keine neuen Breakpoint-Systeme/Container-Komponenten („Ultrawide-Guard" ist
  durch AP1 + bestehendes `max-w-7xl` abgedeckt; Rest ist Doku-Leitlinie).
- Keine Umstellung der Deck-Kacheln auf Tabellen-/Kompaktansicht.

## B.6a Geprüft und bewusst belassen (Abdeckungsnachweis, Stand 2026-07-03)

Diese Ansichten wurden auf Flächennutzung geprüft und brauchen **kein** Paket:

| Ansicht | Befund |
|---|---|
| `SettingsModal` | bereits `max-w-3xl` |
| `FutureForecastModal` / `ShuffleMetricsModal` | bereits `max-w-3xl` |
| `HomeDeckCardsModal` (Kartenverwaltung) | bereits `grid-cols-1 md:grid-cols-2` |
| `ImportView` | Dialog (`max-w-md`) — bewusst schmaler, fokussierter Ablauf |
| Tag-Browser (`HomeTagBrowseSection`) | rendert im Home-Container (`max-w-7xl`), begrenzt |
| `VideosView` Desktop-Split | 3 Spalten, nach AP4 ausgereizt |
| Landscape-Handsets | `clamp(...dvh...)`-Lösung vorhanden |
| Handset-Pfad gesamt | Referenzqualität — unangetastet lassen (B.0) |

Damit sind alle Haupt- und Nebenansichten der App erfasst; die verbleibenden
Potenziale stehen vollständig als AP6–AP12 in diesem Dokument.

## B.7 Verifikations-Playbook (nach JEDEM Arbeitspaket)

Alle Befehle aus `card_pwa/` heraus ausführen.

**1. Build + Tests (müssen grün sein):**

```bash
npm run build
TZ=UTC npm test -- --run
```

**2. Dev-Server für Screenshots** (bindet nur IPv6-localhost — `localhost`
verwenden, niemals `127.0.0.1`):

```bash
npm run dev &   # http://localhost:5173
```

**3. Desktop-Studyflow-Screenshot (validierte Sequenz).** Jede Driver-Session
startet mit leerem Profil; Deck + Karte müssen daher in derselben Session
angelegt werden. Diese Sequenz ist erprobt — Stolperfallen: Menüpunkt „Karte"
per Exakt-Match klicken (Substring träfe „KARTEN"), Karten-Modal lädt lazy
(wait 2500), „Speichern" schließt das Modal nach ~1,5s selbst:

```bash
S=/tmp/verify; mkdir -p $S
VIEWPORT=1920x1080 node .claude/skills/run-card-pwa/driver.mjs \
  "click:Aktionen oeffnen" wait:400 "click:Deck erstellen" wait:600 \
  'focus:input[placeholder="Neues Deck..."]' "type:Verify Deck" wait:200 \
  "click:Deck erstellen" wait:800 \
  "click:Aktionen oeffnen" wait:600 \
  'eval:[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Karte").click()' wait:2500 \
  'focus:textarea[placeholder="Frage oder Begriff..."]' "type:Testfrage?" \
  'focus:textarea[placeholder="Antwort oder Definition..."]' "type:Testantwort." wait:300 \
  'eval:[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Speichern").click()' wait:2000 \
  shot:$S/desk-home.png \
  'eval:document.querySelector("[data-testid=daily-quest-start]").click()' wait:2500 \
  shot:$S/desk-study-front.png \
  'eval:[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Antwort").click()' wait:1500 \
  shot:$S/desk-study-back.png \
  'eval:[...document.querySelectorAll("button")].find(b=>b.textContent.trim().startsWith("Gut")).clientWidth'
```

**4. Mobile-Regression (muss vor/nach identisch aussehen).** `TOUCH=1` ist
Pflicht — ein schmaler Viewport allein rendert weiterhin Desktop-Layout:

```bash
TOUCH=1 VIEWPORT=390x844 node .claude/skills/run-card-pwa/driver.mjs \
  "click:Erstellen & Aktionen" wait:500 "click:Deck erstellen" wait:800 \
  'focus:input[placeholder="Neues Deck..."]' "type:Verify Deck" wait:200 \
  "click:Deck erstellen" wait:1200 shot:$S/mob-home.png \
  "click:Filter & Sortierung" wait:500 "click:Lernvideos" wait:2000 shot:$S/mob-videos.png
```

**5. Screenshots ANSEHEN** (nicht nur erzeugen): leerer Frame = Step nicht
gelandet. Vergleichsmaßstab sind die Akzeptanzkriterien des jeweiligen AP.

## B.8 Verifikationsprotokoll (2026-07-03, nach Umsetzung)

Alle fünf AP wurden als Einzel-Commits umgesetzt (`d40886f`…`7694221`) und
verifiziert: Suchstrings exakt getroffen, Build grün, **600/600 Tests grün**,
Screenshots 1920×1080 + 390×844 (TOUCH=1) geprüft.

| AP | Ergebnis |
|---|---|
| AP1 Study-Lesespalte | ✅ Karte zentriert in 1024px-Spalte; „Gut"-Button 248px (Soll ≤ 270, vorher ~460) |
| AP2 Deck-Grid | ✅ 2 Spalten ab `lg`, Zahlenmatrix bricht nicht; mobil 1 Spalte |
| AP3 Editor | ✅ `md:max-w-3xl`, Front/Back nebeneinander, Speichern ohne Scrollen; mobil unverändertes Bottom-Sheet; MC/Ordering/Matching-Zweige unangetastet |
| AP4 Video | ✅ Player sichtbar breiter, Notiz-Spalte unverändert; compact-Zweig unangetastet |
| AP5 Viewport | ✅ Meta bereinigt, `viewport-fit=cover` erhalten |

### Folge-Befund F1 (vorbestehend, KEINE AP-Regression): Karte schrumpft bei kurzem Inhalt

Bei kurzem Kartentext ist die Study-Karte auf Handsets (und in
Desktop-Fenstern <1024px) nur so breit wie ihr Inhalt (~140px bei einem Wort).
Ursache: [StudyView.tsx:964](../card_pwa/src/components/StudyView.tsx#L964)
setzt `items-start` auf eine Flex-Spalte, das Kind-`div` (Z. ~965) hat kein
`w-full`, und die CardFace-Wurzel auch nicht
([CardFace.tsx:334](../card_pwa/src/components/CardFace.tsx#L334)). Ab `lg`
kaschiert `lg:flex-row` + `flex-1` das Problem. Mit langem Text (max-content >
Viewport) füllte die Karte bisher zufällig die Breite — deshalb fiel es nie auf.

**Fix-Vorgabe: siehe AP6 in „Runde 2"** (eine Zeile in StudyView; dort mit
exaktem Such-/Ersatz-String und Akzeptanzkriterien).

## B.9 Referenz: verifizierte Ist-Anker (Stand 2026-07-03, vor Runde 1)

| Anker | Datei:Zeile | Ist-Inhalt |
|---|---|---|
| Study-Scroll-Container | `src/components/StudyView.tsx:941` | `overflow-y-auto px-3 sm:px-4 py-4 sm:py-6` (Desktop-Zweig) |
| Study-Karten-Wrapper | `src/components/StudyView.tsx:961` | `w-full` ohne `max-w` |
| Study-Rating-Bar | `src/components/StudyView.tsx:995` | `w-full mt-5 sm:mt-6` |
| CardFace min-h | `src/components/CardFace.tsx:324` | `min-h-[280px] sm:min-h-[420px] md:min-h-[500px]` |
| Home-Container | `src/constants/ui.ts:8` | `homeMaxWidth: 'max-w-7xl'` |
| Deck-Liste | `src/components/home/HomeDeckListSection.tsx:148+169` | `flex flex-col gap-2.5 sm:gap-3` |
| Karten-Modal | `src/components/CardFormModal.tsx:374` | `sm:max-w-lg` |
| Video-Player | `src/components/videos/MesserVideoPlayer.tsx:195` | `max-w-4xl` (non-compact) |
| Videos-Split | `src/components/videos/VideosView.tsx:825–848` | `w-56` / `flex-[3]` / `w-1/4 min-w-[300px]` |
| Shuffle-Referenzbreite | `src/components/ShuffleStudyView.tsx:518/538/565` | `max-w-5xl` |
| Viewport-Meta | `index.html:6` | `maximum-scale=1.0, user-scalable=no` |
| Handset-Query | `src/hooks/useHandsetLayout.ts` | `(pointer: coarse) and (max-width: 1024px)` |
