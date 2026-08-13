/**
 * AI_CONTEXT: Utility module for dbBackupPayload; the pure data shape of a
 * full local backup. Owned here (not services/dbBackup.ts, which builds/
 * restores it via Dexie I/O) so pure utils/import parsers can depend on the
 * shape without depending on the I/O-heavy service module.
 */
import type { CardRecord, DeckRecord, ReviewRecord, VideoNoteRecord } from '../db'
import type { LearningUnitsBackupData } from '../db/queries/learningUnits'

interface BackupMeta {
  app: 'card-pwa'
  version: 1 | 2 | 3
  exportedAt: number
  tableCounts: {
    decks: number
    cards: number
    reviews: number
    videoNotes?: number
    /** Summe aller Zeilen des dedizierten Lerneinheiten-Systems (ab Version 3). */
    learningUnits?: number
  }
}

export interface DbBackupPayload {
  meta: BackupMeta
  settings: unknown
  data: {
    decks: DeckRecord[]
    cards: CardRecord[]
    reviews: ReviewRecord[]
    videoNotes: VideoNoteRecord[]
    /** Dediziertes Lerneinheiten-System (§16.3); fehlt in Backups vor Version 3. */
    learningUnits?: LearningUnitsBackupData
  }
}
