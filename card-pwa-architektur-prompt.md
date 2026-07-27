# Prompt: Card_PWA-Architektur-Dossier (HTML + PDF) erzeugen/aktualisieren

Zweck dieser Datei: ein eigenständiger, wiederverwendbarer Prompt, den man (in einer neuen
Session, notfalls mit einem frischen Agenten ohne Vorwissen) einsetzen kann, um
`card-pwa-architektur.html` entweder **neu zu erzeugen** oder — der Normalfall, sobald die
Datei existiert — **gegen den aktuellen Code-Stand zu korrigieren**, und danach eine
qualitativ mindestens gleichwertige `card-pwa-architektur.pdf` daraus abzuleiten.

Einfach den Block unten (ab „## Auftrag") 1:1 als User-Prompt verwenden.

---

## Auftrag

Du bist technischer Architektur-Auditor für das Repo `card_pwa_app` (React/TypeScript-PWA
„Card_PWA", Quelle: `card_pwa/src` + `public/service-worker.js`). Erzeuge/aktualisiere ein
einziges, selbstständig lauffähiges HTML-Dossier `card-pwa-architektur.html` im Repo-Root und
exportiere anschließend eine qualitativ gleichwertige oder bessere `card-pwa-architektur.pdf`.

### Grundregel: nichts behaupten, was nicht im Code/in git verifiziert wurde

Jede Aussage (Zeilenzahl, „seit wann", „wird verwendet von", „ungenutzt") muss aus tatsächlichem
Lesen von Dateien, `grep`/`rg`-Treffern oder `git log`/`git show`/`git log -S` ableitbar sein.
Wenn unsicher: als offene Frage in §18 („Anhang: Unklare oder dynamisch erzeugte
Abhängigkeiten") vermerken statt zu spekulieren. Keine Prosa-Behauptung ohne Gegenprobe im
Code — insbesondere bei „ungenutzt"-Aussagen immer projektweit (inkl. `__tests__`) gegenprüfen,
ob es wirklich keinen Verwender gibt.

### Modus A — Datei existiert bereits (Normalfall, bevorzugt)

1. Lies die bestehende `card-pwa-architektur.html` als Basis. **Nicht bei Null neu schreiben** —
   das würde bereits erarbeitete Findings/Kontext vernichten.
2. Ermittle per `git log` seit dem Commit, der die Datei zuletzt aktuell gemacht hat
   (`git log --format='%h %ad %s' --date=format:'%Y-%m-%d %H:%M' -- card-pwa-architektur.html`),
   welche Code-Commits seither passiert sind.
3. Baue dir aus der Doku eine Liste aller referenzierten Dateipfade/Zeilenzahlen/Modulnamen
   (Regex etwa `[A-Za-z0-9_./-]*\.(?:tsx|ts|json|html|css|py|md)\b`) und gleiche sie gegen den
   echten Repo-Stand ab (`find`, `wc -l`, `git ls-files`). Melde: gelöschte Dateien, neue Dateien
   ohne Dokumentation, veraltete Zeilenzahlen, verschobene Module (Schicht-Wechsel!).
4. Korrigiere nur die betroffenen Abschnitte chirurgisch (siehe „Technik" unten), markiere
   behobene Findings mit `tag-ok` + `<s>durchgestrichener Originaltext</s>` statt sie zu löschen
   (Auditierbarkeit erhalten) und ergänze im Footer einen datierten Update-Absatz mit
   Commit-Referenzen.
5. Sei ehrlich, wenn es keine vollständige 7-Pass-Neuanalyse war, sondern eine gezielte
   Korrektur — das explizit im Footer vermerken.

### Modus B — Datei existiert nicht (Erststellung)

Führe folgende Analyse-Pässe aus, jeweils mit tatsächlichen Shell-Kommandos, nicht aus dem
Gedächtnis:

1. **Verzeichnisstruktur**: `find card_pwa/src -type f -name '*.ts*' | ...`, Dateizahl pro
   Ordner (`src/`, `components/`, `components/home|videos|labs|acronyms|settings/`, `hooks/`,
   `hooks/home|app|videos/`, `services/`, `services/syncPull/`, `db/`, `db/queries/`, `utils/`,
   `utils/normalize/`, `data/`, `contexts/`, `types/`, `constants/`, `runtime/`, `ui/`,
   `vendor/`, `workers/`, `import/`, `stats/`, `sync/`).
2. **Einstiegspunkte**: `main.tsx`, `App.tsx`, `public/service-worker.js` lesen.
3. **Modulverantwortung**: Kopfkommentare der Form `/** AI_CONTEXT: ... Used by: ... */` lesen
   (diese Konvention existiert in vielen Dateien des Projekts, z. B.
   `components/videos/ChapterDownloadButton.tsx`) — sie sind die verlässlichste Quelle für
   „wozu dient diese Datei" und „wer verwendet sie".
4. **Datenmodelle**: Dexie-Schemas in `db/index.ts` + zugehörige TS-Interfaces (Card, Deck,
   ReviewRecord, ShuffleCollectionRecord, ProfileRecord, VideoNoteRecord/VideoTagMetaRecord,
   SyncQueueRecord, Lerneinheiten-Familie).
5. **Zustandsverwaltung/Kommunikation**: Contexts, Custom Events, Prop-Drilling-Pfade.
6. **Abhängigkeiten & Schichtregel**: Für jedes Modul in `utils/`, `services/`, `hooks/`,
   `components/` die Imports grep'en und gegen die Schichtregel
   `Components → Hooks → Services → DB/Queries → Utils` prüfen (Utils muss unten
   abhängigkeitsfrei sein). Bei Verstoß: unterscheiden zwischen echtem Laufzeit-Import
   (`import { x }`, gravierend) und reinem `import type { X }` (zur Laufzeit folgenlos, aber
   trotzdem gegen die Regel). Zyklen suchen (`A → B → A`).
7. **API-/Speicherzugriffe**: REST-Endpunkte in `services/*` inkl. „Verwendet von"-Datei exakt
   benennen (nicht nur den Ordner); IndexedDB-Tabellen je Dexie-DB; localStorage-Keys via
   `constants/appIdentity.ts` → `STORAGE_KEYS`/`DATABASE_NAMES`.
8. **Kritische Kopplungen / Dead Code / Komplexität**: Für jeden Export grep'en, ob es
   projektweit (inkl. Tests) einen Verwender gibt; Zeilenzahlen großer Dateien (`wc -l`)
   erfassen; Duplikate (fast identischer Code in zwei Dateien) suchen.

## Dokumentstruktur (exakte Gliederung, ToC-Anker beibehalten)

```
§0  Gesamtübersicht (id="uebersicht")
§1  Architekturdiagramm — flowchart TD (id="dia-architektur")
§2  Klassen-/Komponentendiagramm — classDiagram (id="dia-klassen")
§3  Datenflussdiagramm (id="dia-datenfluss")
§4  Ablaufdiagramme zentraler Anwendungsfälle (id="dia-ablauf")
    4.1 Karte lernen & bewerten (sequenceDiagram)
    4.2 Sync-Zyklus (Push vor Pull) (sequenceDiagram)
    4.3 Heute-Paket: Video ansehen und Recall-Check
    4.4 Import (Anki APKG / CSV / JSON-Backup)
§5  Einstiegspunkte der Anwendung (id="einstieg")
§6  Verzeichnis- und Modulstruktur (id="struktur") — Tabelle mit Dateizahl je Ordner
§7  Verantwortlichkeit jedes wichtigen Moduls (id="verantwortung")
    Unterabschnitte: components/ · hooks/ · services/ · db/ · utils/ · data/
§8  Zentrale Datenmodelle (id="datenmodelle")
§9  Zustandsverwaltung (id="zustand")
§10 Kommunikation zwischen Komponenten (id="kommunikation")
§11 Externe und interne Abhängigkeiten (id="abhaengigkeiten")
    Unterabschnitte: Externe npm-Abhängigkeiten (Laufzeit-relevant) · Interne Schichtregel
§12 API- und Speicherzugriffe (id="api-speicher")
    Unterabschnitte: REST-Endpunkte · IndexedDB · localStorage
§13 Kritische Kopplungen und zyklische Abhängigkeiten (id="kopplungen") — <ul class="findings">
§14 Nicht verwendete oder möglicherweise veraltete Funktionen (id="veraltet") — <ul class="findings">
§15 Stellen mit hoher Komplexität oder schwer nachvollziehbarem Datenfluss (id="komplexitaet")
§16 Abhängigkeitstabelle (id="dep-table") — 10 Unterabschnitte:
    16.1 Shell, Contexts, Views
    16.2 Geteilte UI-Komponenten (Karten-Renderer, Modals, Bars/Panels)
    16.3 Feature-Komponenten (home/*, videos/*, labs/*)
    16.4 Hooks
    16.5 Services
    16.6 DB & Queries
    16.7 Utils — Algorithmen & Text-Parsing
    16.8 Utils — Normalisierung, Sync-Konflikte, Web Worker, Import-Pipeline
    16.9 Utils — Domänenlogik (Lerneinheiten, Labs, Video-Tags, Sonstiges)
    16.10 Statische Daten, Konstanten, Typen
    Spalten je Zeile: Modul | Typ/Tag | Pfad | Verwendet von | Abhängt von | Kern-Typen | Notiz
§17 Datenobjekt-Dokumentation (id="datenobjekte") — Card/CardRecord, Deck/DeckRecord,
    ReviewRecord, ShuffleCollectionRecord, Settings, ProfileRecord,
    VideoNoteRecord/VideoTagMetaRecord, SyncQueueRecord, Lerneinheiten-Familie
§18 Anhang: Unklare oder dynamisch erzeugte Abhängigkeiten (id="anhang")
```

Kopfbereich vor §0: `<header class="doc-head">` mit Eyebrow-Zeile, `<h1>`, Lead-Absatz
(≤ 68ch Breite) und `.stat-row` mit ca. 8 Kennzahlen-Kacheln (Zeilen Code, Komponenten, Hooks,
Services, Utils-Module, Dexie-DBs, Datendateien, Router).

Linke Seitenleiste `<nav class="toc">`: sticky, gruppiert in „Übersicht" / „Diagramme" /
„Dokumentation" / „Referenz", ein Anchor-Link pro Section-ID oben.

## Technik: HTML/CSS

- Einzelne, **komplett offline-fähige** Datei — keine externen Stylesheets, keine
  CDN-Schriftarten, kein CDN-Mermaid (Projektkonvention: keine cross-origin
  render-blocking Resources). Mermaid.js wird als **inline `<script>`** (minifiziert) direkt
  vor `</body>` eingebettet, gefolgt von einem zweiten `<script>` mit
  `mermaid.initialize({ startOnLoad: true, securityLevel: 'loose', theme: 'default',
  flowchart: { htmlLabels: true } })`.
- Farbschema: CSS-Variablen für dark/light via `@media (prefers-color-scheme)` **und**
  `:root[data-theme="dark|light"]`-Override (letzterer gewinnt, falls ein Theme-Toggle im
  Viewer `data-theme` setzt). Tokens: `--bg --surface --surface-2 --border --text --text-muted
  --accent --accent-soft --amber --amber-soft --ok --crit --crit-soft`.
- Komponenten-Klassen wiederverwenden: `.sheet` (Diagramm-Container mit `.sheet-bar` +
  `.sheet-body pre.mermaid`), `.table-scroll > table.data-table`, `.tag` +
  `.tag-crit|.tag-warn|.tag-info|.tag-ok` (Status-Badges), `ul.findings`, `blockquote.note`,
  `.kv-list` (dt/dd-Grid), `.path`/`code` (Monospace-Pillen für Dateipfade).
- **Print-Stylesheet mitliefern** (eigener `<style>@media print{...}</style>`-Block): TOC
  ausblenden, `main` auf volle Breite mit `12mm 14mm` Rand, Basisschrift auf `10.5pt`,
  `.sheet { break-inside: avoid }`, `section h2 { break-before: page }` (erste Section
  ausgenommen), Tabellen auf `7.6pt` verkleinert, `table.data-table th { position: static }`
  (kein sticky-Header im Druck), Links farblos/ohne Unterstreichung. Dieser Block ist die
  Grundlage für eine hochwertige PDF-Ausgabe — ohne ihn sieht der Druck-Export unformatiert aus.
- Mermaid-Konvention: Node-/Participant-**IDs** (z. B. `SYNCSVC`, `STUDYSVC`, `SP`) sind stabil
  und werden von Pfeilen referenziert — beim Aktualisieren nur die **Labels** (Text in `["..."]`
  bzw. nach `as`) ändern, nie die IDs.

## Technik: PDF-Export (gleiche/bessere Qualität als bisher)

Das Projekt hat bereits `puppeteer-core` (`card_pwa/package.json`) + System-Chromium
(`/usr/bin/chromium`) im Einsatz (siehe `card_pwa/.claude/skills/run-card-pwa/driver.mjs`).
Denselben Stack für den PDF-Export nutzen, keine neue Abhängigkeit installieren:

```js
// render-pdf.mjs — im Repo-Root ausführen: node render-pdf.mjs
import puppeteer from 'puppeteer-core'
import { pathToFileURL } from 'node:url'

const CHROMIUM = process.env.CHROMIUM || '/usr/bin/chromium'
const SRC = 'card-pwa-architektur.html'
const OUT = 'card-pwa-architektur.pdf'

const browser = await puppeteer.launch({
  executablePath: CHROMIUM,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage()
await page.goto(pathToFileURL(SRC).href, { waitUntil: 'load' })

// Mermaid rendert client-seitig (startOnLoad) — warten bis jedes pre.mermaid
// durch ein <svg> ersetzt wurde, bevor gedruckt wird.
await page.waitForFunction(() => {
  const blocks = document.querySelectorAll('pre.mermaid, .mermaid')
  return blocks.length > 0 && [...blocks].every(b => b.querySelector('svg'))
}, { timeout: 30_000 })

await page.emulateMediaType('print') // aktiviert den @media print-Block aus dem <style>
await page.pdf({
  path: OUT,
  format: 'A4',
  printBackground: true,       // CSS-Hintergrundfarben/Tag-Badges müssen erhalten bleiben
  margin: { top: 0, right: 0, bottom: 0, left: 0 }, // Ränder kommen aus der Print-CSS (main-padding), sonst doppelt
  preferCSSPageSize: false,
})
await browser.close()
console.log(`geschrieben: ${OUT}`)
```

Qualitätskriterien für den PDF-Export:
- `printBackground: true` ist Pflicht, sonst verschwinden alle `.tag`-Badge-Hintergründe und
  Sheet-Rahmen.
- Vor dem Druck immer auf das Mermaid-`svg` warten (s. o.) — sonst werden leere
  `<pre class="mermaid">`-Textblöcke statt Diagramme gedruckt.
- Da die Print-CSS bereits `break-before: page` pro `<h2>` und `break-inside: avoid` für
  `.sheet`/Tabellenzeilen setzt, keine zusätzlichen Puppeteer-Margins vergeben (sonst doppelte
  Ränder/verschobene Seitenumbrüche).
- Stichprobe nach Export: Seitenzahl plausibel (~1 Seite pro Section bei 16+ Sections),
  Diagramme als Vektor-SVG sichtbar, keine abgeschnittenen Tabellen am Seitenrand.

## Abschluss-Checkliste vor Abgabe

1. Tag-Balance-Check (`<section>`, `<table>`, `<tr>`, `<ul>`, `<li>`, `<span>` — Öffnen/Schließen
   zählen), da die Datei zu groß ist, um sie nach jeder Änderung komplett neu zu lesen.
   Nie unscoped über die ganze Datei grep'en — das eingebettete Mermaid-Minified-JS (~3,3 MB,
   eine einzige Zeile) erzeugt sonst riesige/abgeschnittene Treffer. Immer zuerst mit
   `sed -n '<start>,<end>p'`/`awk 'NR<=1330'` auf den tatsächlichen Inhaltsbereich einschränken.
2. Sweep nach veralteten Pfad-/Zeilenreferenzen (z. B. alte Dateinamen nach einer Umbenennung).
3. Footer aktualisieren: Stand-Commit, Datum, Kurzresümee der Änderungen, ehrlicher Hinweis,
   falls es eine gezielte Korrektur statt vollständiger Neuanalyse war.
4. PDF mit dem Skript oben neu erzeugen — die `.pdf` ist ein abgeleitetes Artefakt und darf nie
   von der `.html` abweichen.
5. Nichts committen ohne explizite Aufforderung.
