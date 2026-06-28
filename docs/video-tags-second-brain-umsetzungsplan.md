# Umsetzungsplan: Video- und Tagsystem als Second Brain

Stand: 2026-06-28. Grundlage:
`docs/video-tags-second-brain-audit.md`.

Ziel: Die vorhandenen Video-Notizen, Inline-Tags, Lernkarten und Objectives
werden schrittweise zu einem stabilen, sicherbaren und durchsuchbaren
Wissensnetz ausgebaut. Die App bleibt dabei zuerst Lern-App, nicht allgemeiner
Markdown-Editor.

## Implementierungsstand

Stand nach erstem Umsetzungsschnitt:

- Erledigt: JSON-Backup enthaelt jetzt `videoNotes` aus `videoNotes2`.
- Erledigt: Restore-Utility fuer Video-Notizen aus JSON-Backup-Payloads.
- Erledigt: Restore behandelt alte Backups ohne `videoNotes` tolerant.
- Erledigt: Video-Notiz-Restore fuegt gespeicherte Tags defensiv wieder als
  Inline-`#tags` in den Content ein.
- Erledigt: zentrale Tag-Identitaet via `normalizeTagId`, `tagsMatch`,
  `uniqueByTagId`, `toInlineTag`.
- Erledigt: Video-Tags, Tag-Suggestions, `listCardsByTag`,
  `listNotesByTag`, Related-Tags und Home-Tag-Index nutzen kanonische
  Separator-/Case-Normalisierung.
- Erledigt: Zeitmarken-MVP mit `@MM:SS` / `@H:MM:SS`, Button im
  Video-Notizzettel und klickbaren Sprungmarken zur Playerposition.
- Verifiziert: gezielte Vitest-Suite mit 11 Testdateien / 88 Tests gruen.
- Verifiziert: `npm run build` gruen.

Noch offen:

- Vollstaendiges `KnowledgeTagRecord`-/Alias-Modell mit Merge-UI.
- UI-Restore fuer JSON-Backups, falls gewuenscht.
- Kartenentwuerfe, globale Suche, Tag-Hub, Markdown-Export, Backlinks, Graph
  und Sync-Erweiterungen.

## Leitplanken

- Local-first bleibt Pflicht: Notizen, Tags, Suche und Quellenlinks muessen
  offline funktionieren.
- Video-Blobs werden nicht Teil normaler Backups oder Syncs.
- Video-Notizen, Tag-Metadaten, Zeitmarken und Kartenquellen muessen sicherbar
  sein.
- Freitext bleibt die Eingabeform. Struktur wird extrahiert oder vorgeschlagen,
  nicht erzwungen.
- Keine vollautomatische Kartenerstellung. Karten entstehen aus bestaetigten
  Entwuerfen.
- Jeder groessere Schritt bekommt Unit-Tests fuer reine Logik und mindestens
  einen Integrationstest fuer den Hauptflow.

## Empfohlene Reihenfolge

1. Daten sichern: Video-Notizen in Backup/Restore aufnehmen.
2. Tags stabilisieren: kanonische Tag-IDs und gemeinsame Normalisierung.
3. Tag-Sammlung auf gemeinsames Tag-Modell umstellen.
4. Zeitmarken im Video-Notizzettel einfuehren.
5. Aus `Karte:`-Notizen Kartenentwuerfe erzeugen.
6. Globale Suche ueber Karten, Video-Notizen, Objectives und Tags.
7. Tag-Hub als zentrale Second-Brain-Arbeitsflaeche.
8. Optional: Markdown-Export, Backlinks, Graph, Sync-Ausbau.

## Phase 0: Vorbereitung

Ziel: Eine sichere Arbeitsbasis schaffen, bevor Datenmodell und Backup angefasst
werden.

Aufgaben:

- Aktuellen Worktree sichern oder klare Branch-Basis herstellen.
- Bestehende uncommitted Aenderungen im Video-/Home-Bereich bewusst einordnen.
- Baseline ausfuehren:
  - `npm run build`
  - gezielte Video-/Tag-Tests aus dem Audit
  - optional voller `TZ=UTC npm test -- --run`
- Kurze Fixture-Daten fuer Video-Notizen anlegen:
  - eine Notiz ohne Tags
  - eine Notiz mit mehreren Tags
  - eine Notiz mit `Frage:`, `Merke:`, `Karte:`
  - eine Notiz mit kuenftiger Zeitmarke

Abnahmekriterien:

- Baseline ist dokumentiert.
- Fixture-Daten sind als Testdaten oder Test-Helpers verfuegbar.
- Keine Migration startet ohne Backup-Export-Test.

## Phase 1: P0 Daten sichern

### Epic 1.1: Video-Notizen in JSON-Backup aufnehmen

Problem: Der Backup-Pfad deckt Karten, Decks und Reviews ab, aber nicht
Video-Notizen. Fuer ein Second Brain ist das ein hohes Datenverlustrisiko.

Primaere Dateien:

- `card_pwa/src/utils/dbBackup.ts`
- `card_pwa/src/db/index.ts`
- `card_pwa/src/db/queries/videoNotes.ts`
- neue Tests unter `card_pwa/src/__tests__/utils/`

Umsetzung:

1. `DbBackupPayload` um `videoNotes` erweitern.
2. `createDbBackupPayload` laedt `db.videoNotes2.toArray()`.
3. `BackupMeta.tableCounts` erweitert um `videoNotes`.
4. JSON-Export schreibt Video-Notizen vollstaendig mit `profileId`,
   `objective`, `videoId`, `content`, `tags`, `createdAt`, `updatedAt`.
5. Standard-TXT/CSV-Kartenexport bleibt unveraendert, damit Anki-Kompatibilitaet
   nicht leidet.
6. Optional separater Markdown-/TXT-Export fuer Video-Notizen erst in Phase 6.

Tests:

- Backup enthaelt Video-Notizen und korrekte Counts.
- Leere Video-Notiz-Tabelle erzeugt leeres Array.
- Bestehende Karten-/Deck-/Review-Exports bleiben kompatibel.

Abnahmekriterien:

- JSON-Backup kann Video-Notizen enthalten.
- Standard-Kartenexport wird nicht mit Notizdaten vermischt.
- Build und Backup-Tests sind gruen.

### Epic 1.2: Restore fuer Video-Notizen

Problem: Export ohne Restore ist nur halbe Datensicherheit.

Primaere Dateien:

- bestehender Import-/Restore-Pfad, je nach aktueller UI/Script-Struktur
- `card_pwa/src/utils/dbBackup.ts`
- ggf. neue Utility-Datei `card_pwa/src/utils/videoNoteBackup.ts`

Umsetzung:

1. Restore-Parser akzeptiert Backup-Version mit und ohne `videoNotes`.
2. Video-Notizen werden per Compound-Key `[profileId+objective]` upserted.
3. Konfliktstrategie definieren:
   - Standard: neuere `updatedAt` gewinnt.
   - Import-Option: "lokale Notizen behalten" oder "Backup erzwingen" kann
     spaeter folgen.
4. Tags beim Restore defensiv aus `content` neu extrahieren und mit
   gespeicherten Tags abgleichen.

Tests:

- Restore legt neue Video-Notizen an.
- Restore aktualisiert bestehende Video-Notiz nur bei neuerem `updatedAt`.
- Restore alter Backups ohne `videoNotes` bleibt fehlerfrei.

Abnahmekriterien:

- Export -> DB leeren -> Restore stellt Video-Notizen wieder her.
- Keine Offline-MP4-Blobs werden importiert.

### Epic 1.3: Sync-Entscheidung dokumentieren

Problem: Video-Notizen sind profilgebunden und wertvoll. Es muss klar sein, ob
und wann sie synchronisiert werden.

Umsetzung:

1. In `docs/` kurze Sync-Entscheidung ergaenzen:
   - Video-Notizen: ja, syncbar.
   - Tag-Metadaten/Aliases: ja, syncbar.
   - Video-Fortschritt: optional.
   - Video-Blobs: nein.
2. Noch keine Sync-Implementierung in Phase 1, falls Backup/Restore nicht
   abgeschlossen ist.

Abnahmekriterien:

- Sync-Regel ist dokumentiert.
- Spaetere Implementierung hat klare Grenzen.

## Phase 2: P0 Kanonisches Tag-Modell

### Epic 2.1: Zentrale Tag-Normalisierung

Problem: Karten-Tags und Video-Tags treffen sich nur bei kompatibler
Schreibweise. Ein Second Brain braucht stabile Tag-IDs.

Neue/angepasste Dateien:

- neue Datei `card_pwa/src/utils/tagIdentity.ts`
- `card_pwa/src/utils/videoTags.ts`
- `card_pwa/src/utils/tagSuggestions.ts`
- `card_pwa/src/db/queries/decks.ts`
- `card_pwa/src/db/queries/videoNotes.ts`

Umsetzung:

1. `normalizeTagId(raw: string): string` einfuehren:
   - trim
   - lowercase
   - Unicode normalisieren
   - Leerzeichen, Unterstriche und Bindestriche auf `-`
   - mehrfache Separatoren reduzieren
   - fuehrende/trailing Separatoren entfernen
2. `toInlineTag(labelOrId: string)` zentralisieren.
3. Tests fuer:
   - `Incident Response` -> `incident-response`
   - `incident_response` -> `incident-response`
   - `#IAM` -> `iam`
   - leere/sonderbare Werte
4. Bestehende `extractTags` behaelt Anzeige-Tag, liefert aber optional auch IDs
   oder wird durch `extractTagRefs` ergaenzt.

Abnahmekriterien:

- Alle neuen Tag-Queries koennen auf `tagId` statt Anzeige-String arbeiten.
- Alte Tests fuer Video-Tags bleiben gruen.

### Epic 2.2: TagRecord/Alias-Modell einfuehren

Problem: Reine Normalisierung reicht nicht fuer Synonyme wie `iam` und
`identity-access-management`.

Datenmodell:

```ts
interface KnowledgeTagRecord {
  id: string
  label: string
  aliases: string[]
  createdAt: number
  updatedAt: number
}
```

Primaere Dateien:

- `card_pwa/src/db/index.ts`
- neue Queries `card_pwa/src/db/queries/tags.ts`
- Tests fuer Migration/Queries

Umsetzung:

1. Neue Dexie-Tabelle `knowledgeTags`.
2. Beim Lesen unbekannter Tags kann ein virtueller Record aus `tagId` entstehen.
3. Beim Umbenennen/Mergen wird ein echter Record gespeichert.
4. Aliases werden beim Lookup auf kanonische ID aufgeloest.
5. Bestehende Karten-/Video-Daten muessen nicht sofort hart migriert werden;
   ein Lese-Layer kann sie kanonisch interpretieren.

Abnahmekriterien:

- `resolveTagId(raw)` findet Alias oder normalisierte ID.
- `listAllKnowledgeTags` kann Karten- und Video-Tags zusammenfuehren.
- Keine destruktive Migration vorhandener Tags noetig.

### Epic 2.3: Tag-Sammlung auf kanonische Tags umstellen

Problem: `TagCollectionPanel` verbindet Inhalte aktuell ueber exakte
case-insensitive Schreibweisen.

Primaere Dateien:

- `card_pwa/src/components/videos/TagCollectionPanel.tsx`
- `card_pwa/src/db/queries/decks.ts`
- `card_pwa/src/db/queries/videoNotes.ts`
- `card_pwa/src/hooks/useVideoNotes.ts`

Umsetzung:

1. `TagCollectionPanel` bekommt `tagId` und `label`.
2. `listCardsByTag` nutzt kanonische ID/Alias-Aufloesung.
3. `listNotesByTag` nutzt kanonische ID/Alias-Aufloesung.
4. Related Tags werden ueber `tagId` berechnet, Anzeige ueber Label.
5. Video-Notizzettel-Vorschlaege speisen sich aus Video- und Karten-Tags.

Tests:

- `#Incident-Response` findet Karten mit `incident_response`.
- Related Tags deduplizieren Anzeigevarianten.
- Vorschlaege schlagen bestehende Karten-Tags vor.

Abnahmekriterien:

- Ein Konzept erscheint als ein Tag-Knoten, nicht als parallele Schreibweisen.

## Phase 3: P1 Zeitmarken und Video-Anker

### Epic 3.1: Aktuelle Playerzeit verfuegbar machen

Problem: Der Notizzettel kann keine Zeitmarken einfuegen, weil die aktuelle
Videozeit nicht nach oben gereicht wird.

Primaere Dateien:

- `card_pwa/src/components/videos/MesserVideoPlayer.tsx`
- `card_pwa/src/components/videos/VideosView.tsx`
- `card_pwa/src/components/videos/VideoNotesPanel.tsx`

Umsetzung:

1. `MesserVideoPlayer` erhaelt optional `onTimeChange`.
2. Throttled aktuelle Zeit in `VideosView` speichern.
3. `VideoNotesPanel` bekommt `currentTimeSec`.
4. Keine zusaetzlichen Writes durch reine Zeitupdates.

Tests:

- Player meldet gerundete Zeit.
- Wechsel des Videos resetet Zeitkontext.

Abnahmekriterien:

- Notizzettel kennt aktuelle Videozeit ohne Playback-Regression.

### Epic 3.2: Zeitmarken-Syntax

Ziel: Nutzer kann per Button eine Zeitmarke in den Notiztext einfuegen.

Syntax-MVP:

- Sichtbar im Text: `@03:42 `
- Parser erkennt `@MM:SS` und `@HH:MM:SS`.
- Klick springt zur Zeit.

Neue/angepasste Dateien:

- neue Datei `card_pwa/src/utils/videoTimeAnchors.ts`
- `VideoNotesPanel.tsx`
- `MesserVideoPlayer.tsx`
- Tests unter `src/__tests__/utils/`

Umsetzung:

1. `formatVideoTime(sec)` und `parseVideoTimeAnchor(text)`.
2. `splitTagSegments` entweder erweitern oder separaten Segmenter fuer Tags und
   Zeitmarken bauen.
3. Button "Zeitmarke" fuegt `@MM:SS ` an Cursorposition ein.
4. Zeitmarke im Preview/Overlay klickbar machen.
5. Klick setzt Playerzeit.

Tests:

- `@03:42` -> 222 Sekunden.
- `@1:02:03` -> 3723 Sekunden.
- Tags und Zeitmarken koexistieren.

Abnahmekriterien:

- Nutzer kann beim Schauen eine Zeitmarke einfuegen und spaeter dahin springen.

## Phase 4: P1 Notiz-zu-Karte-Workflow

### Epic 4.1: Zettelspuren mit Positionen

Problem: `videoNoteSignals` liefert Textlisten, aber keine Zeilenpositionen oder
IDs. Fuer Aktionen braucht die UI stabile Referenzen.

Primaere Dateien:

- `card_pwa/src/utils/videoNoteSignals.ts`
- `card_pwa/src/components/videos/VideoNotesPanel.tsx`

Umsetzung:

1. Rueckgabe erweitern:

```ts
interface VideoNoteSignal {
  id: string
  kind: 'question' | 'cardIdea' | 'cue'
  text: string
  line: number
  start: number
  end: number
}
```

2. Bestehende Summary-Funktion als Kompatibilitaetswrapper behalten.
3. UI zeigt pro Kartenidee eine Aktion "Entwurf".

Tests:

- Signale haben stabile line/start/end-Werte.
- Deduplizierung bleibt erhalten.

Abnahmekriterien:

- UI kann eine konkrete `Karte:`-Zeile als Quelle referenzieren.

### Epic 4.2: Kartenentwurf aus Video-Notiz

Ziel: Aus einer `Karte:`-Zeile wird ein bestaetigbarer Kartenentwurf.

Primaere Dateien:

- `VideoNotesPanel.tsx`
- bestehendes `CreateCardModal` oder neues kleines Draft-Modal
- `card_pwa/src/db/queries/decks.ts`
- ggf. Card-Metadaten in `types`/`db`

Umsetzung:

1. Klick auf "Entwurf" oeffnet Modal.
2. Deck wird aus Objective abgeleitet.
3. Tags werden aus der Notiz uebernommen.
4. Front/Back werden aus dem Signal vorbefuellt:
   - MVP: gesamte Kartenidee als Front, Back leer.
   - Besser: `A -> B` wird Front=A, Back=B.
5. Karte bekommt optionale Quellenmetadaten:
   - `sourceObjective`
   - `sourceVideoId`
   - `sourceTimeSec`
   - `sourceNoteLine`

Tests:

- Draft uebernimmt Objective-Deck.
- Draft uebernimmt Tags.
- `TLS -> Handshake` wird sinnvoll gesplittet.

Abnahmekriterien:

- Keine Karte wird ohne Nutzerbestaetigung erstellt.
- Erstellte Karte ist zur Videoquelle zurueckverfolgbar.

## Phase 5: P1 Globale Suche

### Epic 5.1: Lokaler Suchindex

Ziel: Eine Suche findet Karten, Video-Notizen, Tags und Objectives gemeinsam.

Neue Datei:

- `card_pwa/src/services/knowledgeSearch.ts`

Indexquellen:

- Kartenfront/-back
- Karten-Tags
- Video-Notiz-Content
- Video-Tags
- Objective-Code und Objective-Titel
- spaeter: Zeitmarken und Kartenentwuerfe

Umsetzung:

1. Reine Suchfunktion mit kleinen Scoring-Regeln:
   - exakter Tag-Match hoch
   - Titel/Objective hoch
   - Kartenfront mittel
   - Notizinhalt mittel
   - Kartenback niedrig
2. Kein schwerer Search-Stack im MVP.
3. LiveQuery oder explizites Rebuild bei Datenveraenderung.
4. Resultattyp:

```ts
type KnowledgeSearchResult =
  | { type: 'tag'; tagId: string; label: string }
  | { type: 'videoNote'; objective: string; videoId: string; excerpt: string }
  | { type: 'card'; cardId: string; deckId: string; excerpt: string }
  | { type: 'objective'; objective: string; title: string }
```

Tests:

- Suche nach `kerberos` findet Karte und Notiz.
- Suche nach Tag-Alias findet kanonischen Tag.
- Leere Query liefert leeres Ergebnis oder zuletzt genutzte Tags, je nach UI.

Abnahmekriterien:

- Suche funktioniert offline und ohne Netzwerk.
- Ergebnis kann in Video, Tag-Sammlung oder Karte springen.

### Epic 5.2: Such-UI

Primaere Orte:

- Home-Toolbar oder eigene Knowledge-Ansicht
- spaeter Settings vermeiden; Suche gehoert in den Arbeitsfluss

Umsetzung:

1. Suchfeld in "Tags/Wissen"-Ansicht.
2. Ergebnisgruppen: Tags, Video-Notizen, Karten, Objectives.
3. Klick-Aktionen:
   - Tag -> Tag-Hub
   - Video-Notiz -> VideosView mit Objective
   - Karte -> Karten-/Deckkontext
   - Objective -> VideosView oder Deck

Abnahmekriterien:

- Nutzer kann ein Konzept finden, ohne zu wissen, ob es aus Video oder Karte
  stammt.

## Phase 6: P1 Tag-Hub

### Epic 6.1: Gemeinsame Tag-Ansicht

Problem: Home-Karten-Tags und Video-Notiz-Tags sind getrennte mentale Raeume.

Primaere Dateien:

- `card_pwa/src/components/TagBrowserSection.tsx`
- `card_pwa/src/components/home/HomeTagBrowseSection.tsx`
- `card_pwa/src/components/videos/TagCollectionPanel.tsx`
- neue Komponente `KnowledgeTagView.tsx`

Umsetzung:

1. `TagCollectionPanel` als Basis nehmen, aber in eigenstaendige Tag-Ansicht
   ueberfuehren.
2. Kennzahlen oben:
   - Karten
   - Video-Notizen
   - faellige Karten
   - offene Fragen
   - Kartenideen
3. Tabs/Filter:
   - Alles
   - Videos
   - Karten
   - Fragen
   - Kartenideen
4. Aktionen:
   - Tag lernen
   - Tag exportieren
   - Tag umbenennen/zusammenfuehren

Tests:

- Tag-Hub zeigt Karten und Video-Notizen ueber kanonischen Tag.
- "Tag lernen" startet eine Session mit aktiven Karten.
- Filter liefern korrekte Counts.

Abnahmekriterien:

- Ein Tag ist ein echter Startpunkt fuer Lernen und Recherche.

### Epic 6.2: Related Tags verbessern

Umsetzung:

1. Related Tags aus Video-Notiz-Cooccurrence.
2. Related Tags aus Karten-Cooccurrence.
3. Gewichtung:
   - gleiche Notiz: +2
   - gleiche Karte: +1
   - gleicher Objective-Kontext: +1
4. Anzeige mit Quelle oder Score.

Abnahmekriterien:

- Related Tags zeigen echte Konzeptnachbarschaft ueber Karten und Videos.

## Phase 7: P2 Export, Backlinks, Graph

### Epic 7.1: Markdown-Export

Ziel: Obsidian-Bruecke ohne Vendor-Lock-in.

Umsetzung:

- Export pro Tag:
  - Titel
  - Aliases
  - Video-Notizen nach Objective
  - Zeitmarken
  - Karten mit Front/Back
  - Related Tags
- Export pro Objective:
  - Videos
  - Notiz
  - Karten
  - offene Fragen

Abnahmekriterien:

- Exportierte Markdown-Datei ist in Obsidian lesbar.
- Tags und Zeitmarken bleiben erhalten.

### Epic 7.2: Wiki-Links und Backlinks

Syntax:

- `[[PKI]]`
- `[[Kerberos]]`

Umsetzung:

1. Parser fuer Wiki-Links.
2. Link-Index berechnen.
3. Tag-Hub zeigt Backlinks und unlinked mentions.

Abnahmekriterien:

- Ein Linkziel zeigt eingehende und ausgehende Verbindungen.
- Unlinked mentions koennen in Tags/Links verwandelt werden.

### Epic 7.3: Optionaler Graph

Voraussetzung:

- Kanonische Tags stabil.
- Links/Backlinks stabil.
- Genug echte Daten vorhanden.

Umsetzung:

- Kleiner lokaler Graph, nicht als Hauptnavigation.
- Knoten: Tags, Objectives, Karten, Video-Notizen.
- Kanten: tagged, derivedFrom, mentions, related.

Abnahmekriterien:

- Graph ist optional.
- Graph bleibt performant bei realer Datenmenge.

## Phase 8: P2 Sync und Speichermanagement

### Epic 8.1: Sync fuer Knowledge-Daten

Syncbare Daten:

- `videoNotes2`
- `knowledgeTags`
- Kartenquellenmetadaten
- optional Video-Fortschritt

Nicht syncbar:

- `videoBlobs`

Umsetzung:

1. Sync-Schema erweitern.
2. Konfliktstrategie:
   - Notizen: neueres `updatedAt` gewinnt.
   - Tags/Aliases: Merge statt Replace.
   - Quellenmetadaten: additive Felder.
3. Schutz gegen leeren Server beibehalten.

Abnahmekriterien:

- Handy und Desktop sehen dieselben Notizen/Tags.
- Kein Sync versucht MP4-Blobs zu uebertragen.

### Epic 8.2: Offline-Speicherverwaltung

Umsetzung:

- View "Offline-Videos":
  - pro Kapitel Groesse
  - pro Video Groesse
  - zuletzt genutzt
  - Status: Blob vorhanden/fehlt
  - Aktionen: erneut laden, loeschen
- Health-Check `videoDownloads` gegen `videoBlobs`.

Abnahmekriterien:

- Nutzer kann Speicher bewusst freigeben.
- Kaputte Offline-Eintraege sind reparierbar.

## Vorgeschlagene PR-/Commit-Schnitte

1. `backup-video-notes`
   - JSON-Backup/Restore fuer `videoNotes2`
   - Tests

2. `tag-identity`
   - `normalizeTagId`
   - `knowledgeTags`
   - Tag-Alias-Queries
   - Tests

3. `tag-collection-canonical`
   - `TagCollectionPanel` auf kanonische Tags
   - Karten- und Video-Tags zusammen
   - Vorschlaege aus beiden Quellen

4. `video-time-anchors`
   - Playerzeit nach oben reichen
   - Zeitmarke einfuegen/parsen/klicken
   - Tests

5. `note-card-drafts`
   - Zettelspuren mit Positionen
   - Kartenentwurf-Modal
   - Quellenmetadaten

6. `knowledge-search`
   - lokaler Suchindex
   - Such-UI
   - Navigation in Tag/Video/Karte

7. `knowledge-tag-hub`
   - gemeinsame Tag-Ansicht
   - Kennzahlen und Aktionen
   - "Tag lernen"

8. `knowledge-export-and-links`
   - Markdown-Export
   - Wiki-Links/Backlinks
   - optional Graph-Vorbereitung

## Testmatrix

Pflicht pro Phase:

- `npm run build`
- Relevante Vitest-Dateien gezielt
- Bestehende Video-/Tag-Tests

Zusaetzlich nach Datenmodell-Aenderungen:

- Migration von leerer DB
- Migration von bestehender DB
- Backup/Restore Roundtrip
- Import alter Backups ohne neue Felder

Zusaetzlich nach UI-Aenderungen:

- Desktop-Videomodus: Video + Notizzettel
- Mobile-Videomodus: Player + Tastatur + Notizzettel
- Tag-Sammlung/Tag-Hub
- Offline-Server-unreachable-Zustand

Zusaetzlich nach Offline-Download-Aenderungen:

- Download mit ReadableStream
- Download-Fallback ohne ReadableStream
- Quota-/Network-Fehler
- Entfernen und erneutes Laden

## Risiken und Gegenmassnahmen

Risiko: Datenmigration zerstoert bestehende Notizen.

- Gegenmassnahme: keine destruktive Migration ohne Roundtrip-Test.
- Vor Migration: Backup-Hinweis oder automatischer Backup-Snapshot.

Risiko: Tag-Kanonisierung bricht alte Such-/Filterlogik.

- Gegenmassnahme: Lese-Layer zuerst, physische Migration spaeter.
- Alte Anzeige-Tags behalten, intern `tagId` verwenden.

Risiko: UI wird zu komplex.

- Gegenmassnahme: Tag-Hub als eigene Arbeitsflaeche, Video-Notizzettel schlank
  halten.

Risiko: Suche wird langsam.

- Gegenmassnahme: MVP mit einfacher Indexstruktur, spaeter inkrementeller Index.

Risiko: Sync-Konflikte bei Notizen.

- Gegenmassnahme: Sync erst nach Backup/Restore und Tag-Modell; Konflikte ueber
  `updatedAt` und spaeter optional Merge UI.

## Definition of Done

Eine Phase gilt als abgeschlossen, wenn:

- Datenmodell und Queries dokumentiert sind.
- Bestehende Tests weiter gruen sind.
- Neue Logik mit Unit-Tests abgedeckt ist.
- Mindestens ein realer Nutzerflow getestet wurde.
- Backup/Restore-Auswirkungen geklaert sind.
- Keine Offline-MP4-Blobs versehentlich in Backup oder Sync landen.
- Der Nutzer aus Video, Notiz, Tag und Karte wieder zur Quelle findet.

## Minimaler MVP-Scope

Wenn nur die wirksamsten Schritte umgesetzt werden sollen:

1. Video-Notizen in Backup/Restore.
2. `normalizeTagId` und gemeinsame Tag-Suche fuer Karten + Video-Notizen.
3. Zeitmarke einfuegen und klickbar machen.
4. `Karte:`-Signal als Kartenentwurf.
5. Tag-Hub mit Karten, Notizen und "Tag lernen".

Dieser MVP reicht, damit sich die App deutlich mehr wie ein Obsidian-aehnliches
Second Brain anfuehlt, ohne den Kern als Spaced-Repetition-Lernapp zu
verwischen.
