# Audit-Bericht: Video- und Tagsystem als Second Brain

Stand: 2026-06-28. Basis: aktueller Worktree in `/home/_vb/card_pwa_app`.
Fokus: Videobereich, Video-Notizen, Tag-Verknuepfung, Obsidian-aehnliches
Second-Brain-Zielbild.

## Kurzfazit

Die Anwendung hat bereits einen bemerkenswert guten Kern fuer ein persoenliches
Lern-Second-Brain: lokale Videos, Offline-Kopien, Resume/Speed, Objective-nahe
Notizen, Inline-`#tags`, Tag-Sammlungen, verwandte Tags und einen Abruf-Check
gegen die passive "Video geschaut = gelernt"-Falle.

Der naechste grosse Hebel ist nicht ein weiterer Player-Button, sondern ein
einheitliches Wissensmodell: Tags sollten Karten, Video-Notizen, Objectives,
Zeitmarken, Fragen und Kartenideen in einem gemeinsamen Netz verbinden. Im
aktuellen Stand sind diese Teile schon sichtbar, aber noch nicht voll
zusammengefuehrt. Besonders wichtig sind Tag-Kanonisierung, Export/Backup,
Suchindex, Timestamp-Notizen und ein sauberer Weg von Video-Notiz zu Lernkarte.

Prioritaet:

1. P0: Video-Notizen und Tag-Netz in Backup/Export/Sync einbeziehen.
2. P0: Einheitliches Tag-Modell fuer Video-Tags und Karten-Tags einfuehren.
3. P1: Zeitmarken, Notiz-zu-Karte-Workflow und globale Suche bauen.
4. P1: Tag-Sammlung zu einem echten Knowledge-Hub erweitern.
5. P2: Graph, Backlinks, Review-Steuerung und Speichermanagement ausbauen.

## Verifikation

Durchgefuehrt:

- Code-Sichtung der Video-Komponenten, Hooks, DB-Queries, Tag-Utilities und
  Backup-Logik.
- Gezielte Tests:
  `npm test -- --run src/__tests__/utils/video-tags.test.ts src/__tests__/utils/tag-suggestions.test.ts src/__tests__/utils/video-note-signals.test.ts src/__tests__/utils/video-playback.test.ts src/__tests__/utils/local-video-manifest.test.ts src/__tests__/utils/video-download-queue.test.ts src/__tests__/hooks/messer-video-progress.test.ts src/__tests__/components/video-recall-check.test.tsx`
- Ergebnis: 8 Testdateien, 71 Tests, alle gruen.
- Production-Build:
  `npm run build`
- Ergebnis: erfolgreich, `VideosView` ca. 41.23 kB, `TagCollectionPanel` ca.
  19.29 kB im Build-Output.

Nicht durchgefuehrt:

- Kein manueller Browser-Test gegen einen echten Pi-Medienserver.
- Kein echter iOS-/Android-Speichertest mit grossen MP4-Blobs.
- Keine Pruefung realer Nutzerdaten in IndexedDB.

Hinweis zum Worktree: Beim Audit lagen bereits uncommitted Aenderungen im
Video-/Home-Bereich vor, u. a. `VideoNotesPanel.tsx`, `VideosView.tsx`,
`HomeView.tsx`, `HomeDeckToolbar.tsx`, plus neue Dateien fuer
`videoNoteSignals`. Der Bericht bewertet den aktuellen Worktree-Zustand.

## Ist-Zustand: Videobereich

### Lokale Videoquelle

Die App nutzt selbst gehostete Professor-Messer-Videos statt YouTube-Embeds.
`useLocalMesserVideos` laedt ein Manifest von `/media/messer/index.json` und
mischt Server-Dateien mit bereits heruntergeladenen Offline-Dateien
(`card_pwa/src/hooks/useLocalMesserVideos.ts:87`). Dateinamen werden im Client
geparst und nach Objective gruppiert (`card_pwa/src/utils/localVideoManifest.ts`).

Staerken:

- Keine Abhaengigkeit von YouTube im Lernfluss.
- Offline-Faehigkeit ist real angelegt, nicht nur PWA-Shell.
- Objective-Struktur passt zum Security+-Deckmodell.
- Manifest- und Queue-Logik sind testbar.

Grenzen:

- Die Datenquelle ist stark an das Dateinamensschema gebunden.
- Es gibt keine inhaltlichen Metadaten wie Dauer, Kapitelbeschreibung,
  Transkript, Hash, Version oder Quellenstatus.
- Ohne Manifest bleibt nur die Menge der bereits offline gespeicherten Videos
  sichtbar.

Empfehlung:

- Das Manifest erweitern auf `{ file, objective, title, duration, size, hash,
  updatedAt, transcriptFile? }`.
- Client-Parsing als Fallback behalten, aber nicht mehr als primaeres
  Wissensmodell nutzen.
- Hash/size fuer Offline-Integritaet und "Video wurde aktualisiert"-Hinweise
  verwenden.

### Offline-Downloads

Offline-Kopien werden sequentiell geladen, Fortschritt wird pro Datei gehalten,
und grosse Blobs liegen getrennt von Metadaten in IndexedDB
(`card_pwa/src/hooks/useLocalMesserVideos.ts:136`,
`card_pwa/src/db/index.ts:171`). Das ist fuer Mobilgeraete sinnvoll, weil
Kapitel-Downloads den Pi und den Geraetespeicher nicht parallel ueberlasten
(`card_pwa/src/hooks/useLocalMesserVideos.ts:75`).

Staerken:

- Saubere Trennung von `videoDownloads` und `videoBlobs`.
- Sequenzielle Queue mit Abbruch.
- Quota-Fehler werden erkannt und als Zustand sichtbar gemacht.
- `navigator.storage.persist()` wird best-effort angefragt.

Risiken:

- IndexedDB-Video-Blobs koennen je nach Browser/OS verdraengt werden.
- Es gibt keine Detailansicht "welche Videos belegen wie viel Speicher".
- Es gibt keinen Reparaturmodus fuer kaputte/halb geloeschte Blobs.
- Backup exportiert aktuell Karten/Decks/Reviews, aber nicht Video-Notizen oder
  Offline-Metadaten (`card_pwa/src/utils/dbBackup.ts`).

Empfehlung:

- Speicherverwaltung als eigener Bereich: Groesse pro Kapitel, zuletzt genutzt,
  "sicher offline", "erneut laden", "alle Loeschen".
- Offline-Video-Blobs bewusst nicht in Standard-Backups packen, aber Metadaten,
  Notizen und Zeitmarken unbedingt exportieren.
- Optional: "Download-Health-Check", der `videoDownloads` und `videoBlobs`
  gegeneinander validiert.

### Player

Der Player speichert Resume-Positionen pro Datei, eine globale Playback-Rate und
unterstuetzt Fullscreen (`card_pwa/src/components/videos/MesserVideoPlayer.tsx:43`).
Positionen werden beim Timeupdate, Pause, Pagehide und Unmount persistiert
(`card_pwa/src/components/videos/MesserVideoPlayer.tsx:70`,
`card_pwa/src/components/videos/MesserVideoPlayer.tsx:82`).

Staerken:

- Gute Alltags-UX: Resume, Speed, Fullscreen.
- Vorsichtiger Umgang mit Remounts, damit die alte Position nicht durch 0
  ueberschrieben wird.
- Playback-State ist vom Lernstatus getrennt.

Grenzen:

- Keine expliziten Zeitmarken im Notizsystem.
- Keine "Screenshot/Frame/Clip"-Funktion.
- Kein Transkript, keine Volltextsuche innerhalb des Videos.
- Kein Keyboard-/Command-Palette-Konzept fuer schnelle Wissensarbeit.

Empfehlung:

- Button "Zeitmarke einfuegen" im Notizzettel: z. B.
  `@03:42 Begriff erklaeren #pki`.
- Klick auf Zeitmarke springt im Player an die Stelle.
- Zeitmarken als strukturierte Anchors speichern, nicht nur als Text.
- Spaeter: Transkript-Anker und "Notiz aus markierter Transkriptstelle".

### Lernfortschritt und Abruf

Der Fortschritt trennt neutral `watched` von Selbsteinschaetzung `gaps`, `ok`,
`solid` (`card_pwa/src/hooks/useMesserVideoProgress.ts:3`). Das ist didaktisch
sehr gut: Die App verhindert, dass reines Anschauen mit Koennen verwechselt
wird (`card_pwa/src/hooks/useMesserVideoProgress.ts:84`).

Der Abruf-Check zieht Karten des Objective-Decks, mischt bis zu 7 Karten und
fuehrt durch "erst erinnern, dann aufdecken" (`card_pwa/src/components/videos/VideoRecallCheck.tsx:15`,
`card_pwa/src/components/videos/VideoRecallCheck.tsx:155`). Er schreibt bewusst
keine Reviews und veraendert den FSRS-Zeitplan nicht.

Staerken:

- Sehr gutes Gegenmittel gegen passive Lernillusion.
- Ergebnis wird in eine Confidence-Empfehlung uebersetzt.
- Funktioniert mit verschiedenen Kartentypen durch `describeCard`.

Grenzen:

- Der Abruf-Check ist nicht mit den Notizsignalen verbunden.
- `Karte:`-Zeilen im Notizzettel erzeugen noch keine Kartenentwuerfe.
- Es gibt keinen "Video hat Luecken erzeugt, plane Wiederholung"-Flow.

Empfehlung:

- `Karte:`-Signale in eine Draft-Queue ueberfuehren.
- Nach Recall-Check bei `gaps`: Vorschlag "3 Karten aus Notizen erstellen" oder
  "Objective in Lernsession aufnehmen".
- Keine vollautomatische Kartenanlage. Besser: Reviewbare Entwuerfe mit Quelle
  und Zeitmarke.

## Ist-Zustand: Notizen und Tags

### Video-Notizen

Video-Notizen sind pro Profil und Objective gespeichert, nicht pro Datei
(`card_pwa/src/db/index.ts:151`, `card_pwa/src/db/index.ts:419`). Der Primary Key
ist `[profileId+objective]` (`card_pwa/src/db/index.ts:428`). In der UI werden
sie mit Debounce gespeichert, bei Wechsel/Unmount geflusht und nur uebernommen,
wenn die Live-Query wirklich zum aktuellen Objective aufgeloest hat
(`card_pwa/src/components/videos/VideoNotesPanel.tsx:163`).

Staerken:

- Profiltrennung ist sauber.
- Gute Schutzlogik gegen Ueberschreiben durch veraltete Live-Query.
- Tags werden aus dem Text abgeleitet, also kein doppelter Pflegezustand.
- Zettel-Tools fuer Frage, Merksatz und Karte sind bereits angelegt
  (`card_pwa/src/components/videos/VideoNotesPanel.tsx:273`).
- Zettelspuren werden erkannt und angezeigt
  (`card_pwa/src/components/videos/VideoNotesPanel.tsx:129`).

Grenzen:

- Ein Objective kann mehrere Videos haben, aber nur eine Notiz. Das ist fuer
  Kursstruktur praktisch, fuer feingranulare Wissensarbeit zu grob.
- Es gibt keine `createdFrom`, `sourceVideoTime`, `anchors`, `links`,
  `outgoingLinks` oder `cardDrafts`.
- Freitext bleibt Freitext; Signale werden angezeigt, aber nicht als Workflow
  nutzbar.

Empfehlung:

- Kurzfristig: Eine Objective-Notiz behalten, aber Zeitmarken/Abschnitte
  einfuehren.
- Mittelfristig: `VideoNoteBlock` oder `NoteAnchor` einfuehren:
  `{ id, profileId, objective, videoId, timeSec, kind, text, tags, createdAt }`.
- UI weiter schlicht halten: Der Nutzer schreibt frei, die App extrahiert
  Struktur im Hintergrund.

### Inline-Tags

Tags werden mit `#tag` im Text erkannt, case-insensitiv dedupliziert und in
Segmente fuer Hervorhebung zerlegt (`card_pwa/src/utils/videoTags.ts`). Beim
Speichern werden Tags neu aus dem Content extrahiert
(`card_pwa/src/db/queries/videoNotes.ts:89`).

Staerken:

- Obsidian-artiges Schreibgefuehl.
- Unicode, Ziffern, Unterstrich und Bindestrich werden unterstuetzt.
- Schutz vor False Positives in URLs oder mitten im Wort.
- Vorschlaege aus vorhandenen Video-Tags sind vorhanden
  (`card_pwa/src/components/videos/VideoNotesPanel.tsx:131`).

Grenzen:

- Es gibt keine kanonische Tag-ID. `#iam`, `#IAM`, `#identity-access`,
  `identity_access` und `#Identity-Access` koennen fachlich dasselbe meinen.
- Karten-Tags und Video-Tags verwenden nicht zwingend dieselbe Schreibweise.
  Karten-Tags im Home-Browser werden lowercased und haeufig mit Unterstrich
  gefuehrt (`card_pwa/src/hooks/home/useTagCardIndex.ts:30`), Video-Tags nutzen
  freie Inline-Schreibweise mit Bindestrich.
- `listCardsByTag` sucht exakt case-insensitiv, normalisiert aber keine
  Bindestrich-/Unterstrich-/Leerzeichen-Varianten
  (`card_pwa/src/db/queries/decks.ts:207`).
- Vorschlaege im Video-Notizzettel kommen nur aus Video-Notiz-Tags, nicht aus
  Karten-Tags.

Empfehlung:

- Ein Tag-Modell einfuehren:
  - `id`: kanonisch, z. B. `identity-access-management`
  - `label`: Anzeige, z. B. `Identity & Access Management`
  - `aliases`: z. B. `iam`, `identity_access`, `identity-access`
  - `source`: `imported`, `user`, `system`
- Alle Tag-Queries gegen kanonische IDs laufen lassen.
- Beim Schreiben freie Tags erlauben, aber eine "Tag zusammenfuehren"-Aktion
  anbieten.
- Karten-Tag-Vorschlaege im Video-Notizzettel einbeziehen.

### Tag-Sammlung

Die Tag-Sammlung zeigt Video-Notizen, Lernkarten und verwandte Tags an
(`card_pwa/src/components/videos/TagCollectionPanel.tsx:82`). Sie ist damit der
wichtigste vorhandene Second-Brain-Baustein. Besonders gut: Aus einem Video-Tag
kann man zu verbundenen Objectives springen (`card_pwa/src/components/videos/VideosView.tsx:437`).

Staerken:

- Gemeinsame Sicht auf Videos und Karten.
- Quelle ist filterbar: beides, Videos, Karten.
- Verwandte Tags erzeugen Backlink-Gefuehl ohne schweres Graphmodell.
- Notizen sind nach Objective sortiert.

Grenzen:

- Related Tags kommen nur aus Video-Notizen, nicht aus Karten-Cooccurrence.
- Es gibt keine Volltextsuche innerhalb der Sammlung.
- Keine Backlinks/Outlinks ausser Tags.
- Keine "Start studying this tag"-Aktion direkt aus der Video-Tag-Sammlung,
  obwohl die Karten vorhanden sind.
- Keine Metriken wie Faelligkeit, Unsicherheit, letzte Wiederholung oder
  Lueckenstatus pro Tag.

Empfehlung:

- Tag-Sammlung zum Knowledge-Hub ausbauen:
  - Videos/Notizen
  - Karten
  - Faellige Karten
  - Zeitmarken
  - verwandte Tags
  - unverbundene Erwaehnungen
  - Aktionen: "Tag lernen", "Kartenentwuerfe erstellen", "Export Markdown"

### Getrennte Tag-Welten

Es gibt aktuell zwei Tag-Browser:

- Home-Tag-Browser fuer Karten-Tags (`card_pwa/src/hooks/home/useTagCardIndex.ts:16`).
- Settings-Tag-Browser fuer Video-Notiz-Tags (`card_pwa/src/components/TagBrowserSection.tsx:6`).

Das ist funktional, aber mental nicht ideal fuer ein Second Brain. Der Nutzer
will nicht wissen, ob ein Konzept aus einer Karte oder einer Video-Notiz stammt;
er will "alles zu `#pki`" sehen.

Empfehlung:

- Einen globalen Bereich "Tags" oder "Wissen" einfuehren.
- Home-Tag-Browser und Video-Tag-Browser auf dieselbe Datenquelle stellen.
- Pro Tag anzeigen: Karten, Notizen, Objectives, faellige Karten, offene
  Fragen, Kartenideen, Related Tags.

## Second-Brain-Zielbild

Das Ziel sollte nicht sein, Obsidian komplett nachzubauen. Die Staerke dieser
App ist Lernen, nicht allgemeines Schreiben. Ein gutes Zielbild lautet:

> Jedes Video, jede Karte, jede Frage und jeder Tag ist ein wiederauffindbarer
> Wissensknoten. Die App hilft, aus Konsum pruefbares Wissen zu machen.

Kernprinzipien:

1. Local-first: Notizen, Tags und Fortschritt muessen offline und ohne Server
   benutzbar sein.
2. Source-first: Jede Karte oder Erkenntnis sollte zur Quelle zurueckfuehren:
   Objective, Video, Zeitmarke, Notizzeile.
3. Tags als Retrieval-Cues: Tags sind nicht Ordner, sondern Abrufausloeser.
4. Freitext bleibt frei: Struktur wird vorgeschlagen, nicht erzwungen.
5. Learning loop: Video -> Notiz -> Frage -> Karte -> Review -> Ruecklink.

## Priorisierte Roadmap

### P0: Backup, Export und Sync fuer Video-Notizen

Problem:

Video-Notizen sind Second-Brain-Daten, aber der vorhandene Backup-Payload deckt
im gezeigten Code nur Decks, Karten und Reviews ab. Damit ist der wertvollste
neue Wissensbestand weniger geschuetzt als die Karten.

Umsetzung:

- `DbBackupPayload` um `videoNotes2` erweitern.
- JSON-Backup: Video-Notizen vollstaendig aufnehmen.
- TXT/CSV-Backup: optional separater Abschnitt oder separate Datei, nicht in
  Anki-Kartenzeilen pressen.
- Import/Restore fuer Video-Notizen bauen.
- Sync-Strategie entscheiden: Video-Notizen ja, Video-Blobs nein.

Akzeptanzkriterien:

- Export enthaelt Anzahl Video-Notizen und Tags.
- Restore stellt Notizen pro Profil und Objective wieder her.
- Keine Offline-MP4s im Standardbackup.
- Tests fuer Export/Import und Migration.

### P0: Kanonisches Tag-Modell

Problem:

Video-Tags und Karten-Tags treffen sich aktuell nur, wenn Schreibweisen exakt
kompatibel sind. Das ist der groesste fachliche Bruch im Second-Brain-Gedanken.

Umsetzung:

- `normalizeTagId(raw)` zentral einfuehren:
  lowercase, trim, Unicode normalisieren, Leerzeichen/Unterstrich/Bindestrich
  auf `-`, doppelte Separatoren reduzieren.
- `TagRecord` oder zumindest `tagAliases` einfuehren.
- Karten-Tags und Video-Tags beim Lesen/Schreiben kanonisieren.
- UI fuer "Tag umbenennen/zusammenfuehren".
- Tag-Vorschlaege aus Karten und Video-Notizen speisen.

Akzeptanzkriterien:

- `#Incident-Response`, `incident_response` und `Incident Response` koennen als
  derselbe Tag behandelt werden.
- Tag-Sammlung zeigt Karten und Video-Notizen auch bei Import-Schreibweisen.
- Tests fuer Normalisierung, Alias und Merge.

### P1: Zeitmarken und Video-Anker

Problem:

Ohne Zeitmarken ist eine Video-Notiz nur mit dem Objective verbunden. Das reicht
fuer grobe Kursnavigation, aber nicht fuer Obsidian-aehnliche Quellenarbeit.

Umsetzung:

- Player stellt aktuelle Zeit bereit.
- Notizzettel bekommt "Zeitmarke einfuegen".
- Syntax z. B. `@03:42` oder `[[video:1.2@222]]`.
- Parser erkennt Zeitmarken und rendert sie klickbar.
- Klick springt im aktiven Player zur Zeit.

Akzeptanzkriterien:

- Zeitmarken bleiben im Freitext sichtbar.
- Zeitmarken sind klickbar.
- Zeitmarken werden in Tag-Sammlung und Export erhalten.

### P1: Notiz-zu-Karte-Workflow

Problem:

`Karte:`-Zeilen und Zettelspuren werden erkannt, aber sie enden noch als reine
Anzeige. Der wichtigste Lerntransfer bleibt dadurch manuell.

Umsetzung:

- `videoNoteSignals` erweitert um stabile Positionen/Zeilennummern.
- Button bei Kartenidee: "Als Karte entwerfen".
- Modal mit Front/Back, Tags, Deck-Vorschlag aus Objective.
- Karte bekommt Quellenmetadaten: `sourceVideoId`, `sourceObjective`,
  `sourceTimeSec`, `sourceNoteLine`.

Akzeptanzkriterien:

- Keine automatische Kartenanlage ohne bestaetigten Entwurf.
- Tag und Objective werden uebernommen.
- Ruecklink von Karte zur Videoquelle ist sichtbar.

### P1: Globale Suche

Problem:

Second Brain lebt von Wiederauffindbarkeit. Aktuell gibt es Tagfilter, aber
keinen gemeinsamen Suchraum fuer Karten, Video-Notizen, Objectives und Tags.

Umsetzung:

- Kleinen lokalen Suchindex bauen:
  - Kartenfront/-back
  - Karten-Tags
  - Video-Notiz-Content
  - Video-Tags
  - Objective-Code/-Titel
- MVP ohne externe Library moeglich; spaeter ggf. gewichtete Suche.
- Suchresultat gruppiert nach Typ und Quelle.

Akzeptanzkriterien:

- Suche nach `kerberos` findet Karte, Video-Notiz und Tag.
- Suche ist offline.
- Resultat kann direkt in Video/Tag/Karte springen.

### P1: Knowledge-Hub fuer Tags

Problem:

Die Tag-Sammlung ist nah dran, aber noch ein Overlay. Fuer Second Brain sollte
sie eine zentrale Arbeitsflaeche werden.

Umsetzung:

- Eigene Ansicht "Wissen" oder "Tags".
- Pro Tag:
  - Kartenanzahl
  - Notizanzahl
  - faellige Karten
  - offene Fragen
  - Kartenideen
  - Related Tags
  - Quellen
  - Aktionen
- "Tag lernen" direkt aus der Sammlung.

Akzeptanzkriterien:

- Ein Tag ist ein echter Startpunkt fuer Lernen und Recherche.
- Karten- und Video-Tags sind nicht mehr getrennte Bereiche.

### P2: Backlinks, Links und Graph

Problem:

Verwandte Tags sind ein guter Anfang, aber Obsidian-Gefuehl entsteht erst durch
sichtbare Rueckverweise.

Umsetzung:

- Wiki-Links optional unterstuetzen: `[[PKI]]`, `[[Kerberos]]`.
- Unlinked mentions anzeigen: "Diese Notiz erwaehnt PKI, ist aber nicht getaggt".
- Link-Tabelle oder berechnete Link-Indizes.
- Graph erst bauen, wenn Tag-/Link-Daten stabil sind.

Akzeptanzkriterien:

- Tag/Link-Seite zeigt eingehende und ausgehende Verbindungen.
- Graph ist optional und nicht die primaere Navigation.

## Datenmodell-Vorschlag

Minimaler evolutionaerer Ausbau:

```ts
interface KnowledgeTagRecord {
  id: string
  label: string
  aliases: string[]
  createdAt: number
  updatedAt: number
}

interface VideoNoteAnchorRecord {
  id: string
  profileId: string
  objective: string
  videoId: string
  timeSec?: number
  kind: 'note' | 'question' | 'cue' | 'cardIdea'
  text: string
  tagIds: string[]
  createdAt: number
  updatedAt: number
}

interface KnowledgeLinkRecord {
  id: string
  profileId: string
  sourceType: 'videoNote' | 'card' | 'objective' | 'tag'
  sourceId: string
  targetType: 'videoNote' | 'card' | 'objective' | 'tag'
  targetId: string
  relation: 'tagged' | 'mentions' | 'derivedFrom' | 'related'
  createdAt: number
}
```

Wichtig: Das muss nicht alles sofort physisch gespeichert werden. Fuer den MVP
kann vieles berechnet werden. Persistenz lohnt sich dort, wo Nutzeraktionen
existieren: Tag-Merge, Aliases, Quellenlinks und Kartenentwuerfe.

## Konkrete technische Findings

### Finding 1: Video-Notizen fehlen im Backup-Pfad

Schweregrad: hoch fuer Second Brain.

Begruendung: Karten lassen sich sichern, Video-Notizen bilden aber das neue
persoenliche Wissensnetz. Ohne Export/Restore ist das Netz fragiler als der
restliche Lernbestand.

Betroffene Orte:

- `card_pwa/src/utils/dbBackup.ts`
- `card_pwa/src/db/index.ts:161`
- `card_pwa/src/db/queries/videoNotes.ts:36`

Empfehlung: Backup-Payload um Video-Notizen erweitern und Restore testen.

### Finding 2: Karten-Tags und Video-Tags haben kein gemeinsames kanonisches Modell

Schweregrad: hoch fuer Obsidian-aehnliche Verknuepfung.

Begruendung: Exakte Tag-Schreibweisen funktionieren fuer kleine Datenmengen,
aber ein Second Brain braucht stabile IDs, Aliases und Merge. Sonst zerfaellt
das Wissensnetz in Parallel-Tags.

Betroffene Orte:

- `card_pwa/src/utils/videoTags.ts`
- `card_pwa/src/utils/tagSuggestions.ts`
- `card_pwa/src/db/queries/decks.ts:207`
- `card_pwa/src/hooks/home/useTagCardIndex.ts:30`
- `card_pwa/src/db/queries/videoNotes.ts:63`

Empfehlung: `normalizeTagId`, `TagRecord`, Alias/Merge und gemeinsame
Vorschlaege.

### Finding 3: Notizen sind pro Objective, nicht pro Video/Position

Schweregrad: mittel bis hoch.

Begruendung: Fuer Kursstruktur ist Objective gut. Fuer Quellenarbeit ist es zu
grob, besonders wenn mehrere Videos zu einem Objective gehoeren oder eine
Erkenntnis an einer bestimmten Stelle sitzt.

Betroffene Orte:

- `card_pwa/src/db/index.ts:161`
- `card_pwa/src/db/index.ts:428`
- `card_pwa/src/db/queries/videoNotes.ts:31`

Empfehlung: Objective-Notiz behalten, aber Anchors/Zeitmarken als zweite Ebene
einfuehren.

### Finding 4: Tag-Sammlung ist stark, aber noch kein globaler Knowledge-Hub

Schweregrad: mittel.

Begruendung: Die Tag-Sammlung verbindet bereits Notizen und Karten. Es fehlen
aber Aktionen, Suche, Faelligkeit, offene Fragen und Kartenideen. Dadurch ist
sie eher Nachschlage-Overlay als Arbeitsflaeche.

Betroffene Orte:

- `card_pwa/src/components/videos/TagCollectionPanel.tsx:82`
- `card_pwa/src/components/TagBrowserSection.tsx:31`
- `card_pwa/src/hooks/home/useTagCardIndex.ts:16`

Empfehlung: Gemeinsame "Wissen"/"Tags"-Ansicht mit Aktionen.

### Finding 5: Zettelspuren sind erkannt, aber nicht operationalisiert

Schweregrad: mittel.

Begruendung: `Frage:`, `Merke:` und `Karte:` sind genau die richtigen
Second-Brain-Spuren. Sie sollten nicht nur angezeigt werden, sondern in
Workflows fuehren.

Betroffene Orte:

- `card_pwa/src/utils/videoNoteSignals.ts`
- `card_pwa/src/components/videos/VideoNotesPanel.tsx:129`
- `card_pwa/src/components/videos/VideoNotesPanel.tsx:338`

Empfehlung: Signale mit Zeilenpositionen liefern und Aktionen fuer
Kartenentwurf, Frage markieren, Merksatz pinnen anbieten.

### Finding 6: Performance ist aktuell ausreichend, aber Tag-Queries skalieren begrenzt

Schweregrad: niedrig bis mittel.

Begruendung: Mit ca. hunderten Karten ist `toArray().filter(...)` akzeptabel.
Bei tausenden Karten, vielen Notizen und globaler Suche wird das langsam.

Betroffene Orte:

- `card_pwa/src/db/queries/decks.ts:207`
- `card_pwa/src/hooks/home/useTagCardIndex.ts:24`
- `card_pwa/src/db/queries/videoNotes.ts:64`

Empfehlung: Fuer Karten ebenfalls einen Multi-Entry-Index oder einen separaten
Tag-Index fuehren. Fuer globale Suche einen dedizierten lokalen Suchindex
aufbauen.

## UX-Empfehlungen

1. Video-Notizleiste:
   - Buttons behalten, aber um Zeitmarke erweitern.
   - Bei `Karte:`-Signalen kleine Aktion "Entwurf" anzeigen.
   - Tag-Vorschlaege nach Relevanz sortieren: exakte Prefixe, haeufige Tags,
     Karten-Tags, Related Tags.

2. Tag-Sammlung:
   - Oben Kennzahlen: Karten, Notizen, faellig, offene Fragen.
   - Primaeraktionen: "Tag lernen", "Export", "Tag zusammenfuehren".
   - Related Tags nach Video- und Karten-Cooccurrence berechnen.

3. Home:
   - "Decks" und "Tags" sind gut, aber Tags sollten alle Quellen enthalten.
   - Tag-Kacheln koennen zeigen: x Karten, y Notizen, z offene Fragen.

4. Export:
   - Markdown-Export pro Tag:
     - Titel `# tag`
     - Video-Notizen nach Objective
     - Karten mit Front/Back
     - Quellenlinks/Zeitmarken
   - Das waere die Obsidian-Bruecke ohne Vendor-Lock-in.

## Empfohlene Umsetzung in drei Phasen

### Phase 1: Daten sichern und Tags stabilisieren

- Video-Notizen in JSON-Backup aufnehmen.
- `normalizeTagId` einfuehren.
- Tag-Sammlung so umbauen, dass Karten-Tags und Video-Tags ueber dieselbe
  kanonische ID laufen.
- Tests fuer Backup, Tag-Normalisierung und Tag-Sammlung.

Ergebnis: Das Wissensnetz ist sicherbar und faellt nicht durch Schreibweisen
auseinander.

### Phase 2: Video-Wissen handlungsfaehig machen

- Zeitmarken einfuehren.
- `Karte:`-Signale als Kartenentwuerfe.
- Globaler Suchindex.
- Tag-Hub mit "Tag lernen".

Ergebnis: Aus Video-Konsum wird ein aktiver Lern- und Wiederfindeprozess.

### Phase 3: Obsidian-Gefuehl ausbauen

- Markdown-Export pro Tag/Objective.
- Wiki-Links und Backlinks.
- Optionaler Graph.
- Sync fuer Notizen/Tags/Fortschritt, aber keine Video-Blobs.

Ergebnis: Die App wird zu einem lokalen Lernvault, bleibt aber fokussiert auf
Security+-Lernen und Spaced Repetition.

## Schlussbewertung

Der aktuelle Videoteil ist solide und didaktisch durchdacht. Besonders stark ist
die Kombination aus lokalem Video, Offline-Download, Objective-Struktur,
Freitext-Notizen, Inline-Tags und Abruf-Check. Das ist schon mehr als ein
"Videoplayer in einer Lernapp".

Der groesste naechste Schritt ist konzeptionell klar: Tags muessen zu stabilen
Wissensknoten werden. Sobald Karten-Tags, Video-Tags, Notizen, Zeitmarken und
Kartenentwuerfe unter einem gemeinsamen Tag-/Linkmodell laufen, entsteht genau
das Obsidian-aehnliche Second-Brain-Gefuehl: nicht nur Inhalte speichern,
sondern Gedanken wiederfinden, verknuepfen und in pruefbares Wissen verwandeln.
