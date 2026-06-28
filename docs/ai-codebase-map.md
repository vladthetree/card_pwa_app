# AI Codebase Map

Diese Karte ist der schnelle Einstieg fuer KI-Tools und neue Entwickler. Sie
beschreibt die App als System, nicht als Dateiliste. Fuer Details stehen in den
wichtigen `src`-Dateien zusaetzlich strukturierte `AI_CONTEXT`-Header.

## Produktbild

Die Anwendung ist eine offline-first Lern-PWA fuer Security+ Karten, Review-
Sessions, Imports, lokale Professor-Messer-Videos, Video-Notizen, Tags und
Sync. Der Second-Brain-Gedanke entsteht vor allem durch:

- Karten mit Tags
- Video-Notizen mit Inline-`#tags`
- Tag-Sammlungen, die Video-Notizen und Karten zusammen anzeigen
- Objective-Codes als Bruecke zwischen Decks, Videos, Recall-Checks und Notizen
- Backup/Restore, damit diese Wissensstruktur portabel bleibt

## Einstiegspunkte

- `card_pwa/src/main.tsx`: React mount und globale Styles.
- `card_pwa/src/App.tsx`: Root-Shell, Top-Level-Views, Provider, globale Modals.
- `card_pwa/src/components/HomeView.tsx`: Hauptdashboard fuer Decks, Tags,
  Shuffle, Import/Export, Settings, Labs und Videos.
- `card_pwa/src/components/StudyView.tsx`: aktive Lernsession mit Rating,
  Undo, Persistenz, Coach und Spezialkarten.
- `card_pwa/src/components/videos/VideosView.tsx`: Video-Arbeitsbereich mit
  Player, Download, Notizen, Recall-Check und Tag-Sammlung.

## Datenmodell

- `card_pwa/src/db/index.ts`: Dexie-Schema, Record-Typen und Migrationen.
- `card_pwa/src/types/index.ts`: UI-/Domain-Typen nach Query-Mapping.
- `card_pwa/src/db/queries/index.ts`: oeffentliche Query-Exports.
- `card_pwa/src/db/queries/cards.ts`: Card-Mutationen und Sync-Operationen.
- `card_pwa/src/db/queries/decks.ts`: Deck-/Card-Read-Model, Hierarchie,
  Tags, Due-Counts und Study-Kandidaten.
- `card_pwa/src/db/queries/reviews.ts`: Review-Write-Layer und Scheduling.
- `card_pwa/src/db/queries/videoNotes.ts`: profile-scoped Video-Notizen,
  Inline-Tags, Tag-Listen und verwandte Tags.
- `card_pwa/src/db/queries/videoDownloads.ts`: lokale Offline-Video-Blobs und
  Download-Metadaten.

Regel: User-facing DB-Schreibzugriffe sollen ueber `db/queries/*` laufen, nicht
direkt ueber Dexie-Tabellen, sonst koennen Sync, Events oder Metriken fehlen.

## Karten und Lernen

- `card_pwa/src/utils/sm2.ts`: pure SM-2 Scheduling-Logik.
- `card_pwa/src/utils/fsrs.ts`: Adapter fuer `ts-fsrs`.
- `card_pwa/src/services/StudySessionManager.ts`: Auswahl/Reihenfolge der
  Karten fuer eine Session.
- `card_pwa/src/services/studySessionReducer.ts`: lokale Session-UI-State-
  Maschine.
- `card_pwa/src/services/studySessionPersistence.ts`: versionierte Session-
  Persistenz.
- `card_pwa/src/services/learningCoach.ts`: pure Session-Auswertung und
  Problemkarten-Hinweise.
- `card_pwa/src/utils/cardTextParser.ts`: Parser fuer Standard/MC/Ordering/
  Matching-Karten.
- `card_pwa/src/utils/cardVariant.ts`: Erkennung spezieller Kartenformate.

Regel: Scheduling-Mutationen gehoeren in `db/queries/reviews.ts`; UI-Session-
Zustand gehoert in Reducer/Persistenz; reine Reihenfolge gehoert in
`StudySessionManager`.

## Video- und Tag-System

- `card_pwa/src/components/videos/VideosView.tsx`: orchestriert den kompletten
  Video-Flow.
- `card_pwa/src/components/videos/MesserVideoPlayer.tsx`: HTML-Video-Player
  mit Resume, Geschwindigkeit, Fullscreen und Seek.
- `card_pwa/src/components/videos/VideoNotesPanel.tsx`: Notizfeld mit Autosave,
  Inline-Tags, Zettel-Signalen und Zeitankern.
- `card_pwa/src/components/videos/TagCollectionPanel.tsx`: Tag-Sammlung fuer
  verbundene Video-Notizen und Karten.
- `card_pwa/src/components/videos/VideoRecallCheck.tsx`: aktiver Abruf direkt
  nach einem Video, ohne Review-Schedule zu veraendern.
- `card_pwa/src/hooks/useLocalMesserVideos.ts`: Server-Manifest plus
  IndexedDB-Downloads plus spielbare Quellen.
- `card_pwa/src/hooks/useMesserVideoProgress.ts`: watched/confidence je
  Objective gegen passives "gesehen = gelernt".
- `card_pwa/src/hooks/useVideoNotes.ts`: liveQuery-Hooks fuer Notizen/Tags.
- `card_pwa/src/utils/localVideoManifest.ts`: Dateiname -> Objective/Domain/
  Titel.
- `card_pwa/src/utils/videoPlayback.ts`: per-file Resume und globale Rate.
- `card_pwa/src/utils/videoDownloadQueue.ts`: pure Download-Auswahl/Summary.

Second-Brain-Regel: Objective-Code verbindet Video, Deck, Recall-Check und
Notiz. Tags verbinden frei ueber Objectives hinweg. Notizen bleiben Plain Text;
Struktur wird abgeleitet.

## Tag-Identitaet

- `card_pwa/src/utils/tagIdentity.ts`: kanonische Tag-ID.
- `card_pwa/src/utils/videoTags.ts`: Inline-`#tag` Parser und Related-Tags.
- `card_pwa/src/utils/tagSuggestions.ts`: Cursor-aware Tag-Autocomplete.
- `card_pwa/src/utils/videoTimeAnchors.ts`: `@MM:SS` / `@H:MM:SS` Parser.
- `card_pwa/src/utils/videoNoteSignals.ts`: Fragen, Kartenideen und Merksaetze
  aus Plain-Text-Notizen.
- `card_pwa/src/hooks/home/useTagCardIndex.ts`: Karten-Tag-Index fuer Home.

Wichtig: Anzeigeform und Identitaet sind getrennt. UI darf `Incident Response`
anzeigen, aber Vergleiche sollen ueber `normalizeTagId()` laufen, damit
`incident_response`, `incident-response` und `Incident Response` zusammenfinden.

## Import, Backup und Portabilitaet

- `card_pwa/src/components/ImportView.tsx`: Import-UI und Statusmaschine.
- `card_pwa/src/utils/import/importPipeline.ts`: Plan/Add/Update/Skip/Conflict.
- `card_pwa/src/utils/import/apkgImporter.ts`: APKG/COLPKG Einstieg.
- `card_pwa/src/utils/import/csvImporter.ts`: CSV/TXT/Anki-Text Einstieg.
- `card_pwa/src/utils/dbBackup.ts`: Export/Backup/Restore fuer Karten, Reviews,
  Settings und Video-Notizen.

Regel: `noteId` ist der stabile Import-Konfliktschluessel. Backup-Version 2
enthaelt `videoNotes`; Restore muss alte Backups ohne Video-Notizen tolerieren.

## Sync und Profile

- `card_pwa/src/contexts/SettingsContext.tsx`: globale Settings und Profil-
  Hydration.
- `card_pwa/src/services/profileService.ts`: local/linked Profile, Device-ID,
  Profile-Scope und ausgewaehlte Decks.
- `card_pwa/src/services/syncCoordinator.ts`: einheitlicher Push/Pull-Zyklus
  mit Lock.
- `card_pwa/src/services/syncQueue.ts`: dauerhafte Outbox fuer lokale
  Operationen.
- `card_pwa/src/services/syncPull.ts`: Pull, Bootstrap, Snapshot und Deltas.
- `card_pwa/src/utils/sync/operationResolver.ts`: pure Konflikt-/Diff-Logik.
- `card_pwa/src/utils/normalize/snapshot.ts`: sichere Snapshot-Normalisierung.
- `card_pwa/src/services/syncedDeckScope.ts`: Deck-Auswahl fuer Sync/Study.

Regel: Video-Notizen und Offline-Video-Blobs sind aktuell local-only und
profile-scoped. Karten/Decks/Reviews/Shuffle laufen ueber Sync-Operationen.

## Home-Dashboard

- `card_pwa/src/hooks/home/useHomeViewController.ts`: Home-spezifische
  Aktionen, Modal-State, Export, Deck-Erstellung, Notifications.
- `card_pwa/src/hooks/home/useHomeDerivedData.ts`: teure abgeleitete Daten fuer
  Forecasts, Schedule, Sync-Scope, Shuffle-Summaries.
- `card_pwa/src/hooks/useCardDb.ts`: allgemeine React-Datenhooks ueber Dexie.

Regel: HomeView soll orchestrieren. Datenableitung in Hooks, DB-Arbeit in
Queries, UI-Zustand im Controller.

## Erweiterungsleitlinien fuer KI-Agenten

1. Erst diese Datei lesen, dann die `AI_CONTEXT`-Header der betroffenen Dateien.
2. Fuer neue Second-Brain-Features pruefen: Ist die Quelle Karte, Video-Notiz,
   Objective, Tag oder Profil?
3. Fuer Tag-Features immer `normalizeTagId()` verwenden.
4. Fuer Video-Features Objective-Code als Join-Key behandeln.
5. Fuer Review/Scheduling nie direkt Card-Felder in UI-Komponenten mutieren.
6. Fuer DB-Schemaaenderungen Dexie-Migration, Backup, Sync und Tests gemeinsam
   betrachten.
7. Plain-Text-Notizen nicht vorschnell in starre Rich-Text-Modelle umbauen;
   lieber ableitbare Struktur ergaenzen.
