import type { CardRecord, DeckRecord } from '../../db'

// ─── Import Result Types ─────────────────────────────────────────────────────

/** Eine importierte Karte vor der Duplikat-Prüfung */
export interface ImportedCard extends Omit<CardRecord, 'createdAt'> {
  createdAt: number
}

/** Ein importiertes Deck vor der Duplikat-Prüfung */
export interface ImportedDeck extends DeckRecord {}

/** Roher Import-Batch aus einem Datei-Parser */
export interface ParsedImport {
  decks: ImportedDeck[]
  cards: ImportedCard[]
  format: 'apkg' | 'colpkg' | 'csv' | 'txt'
  sourceName: string
}

// ─── Duplikat-Prüfung ────────────────────────────────────────────────────────

export type DuplicateAction = 'skip' | 'update'

/** Konflikt: noteId existiert bereits, Inhalt hat sich geändert */
export interface ImportConflict {
  noteId: string
  cardId: string
  deckName: string
  existing: { front: string; back: string }
  incoming: { front: string; back: string }
  existingTags: string[]
  incomingTags: string[]
}

/** Ergebnis nach Duplikat-Prüfung */
export interface ImportPlan {
  toAdd: ImportedCard[]
  toUpdate: ImportedCard[]   // vom User bestätigt
  toSkip: ImportedCard[]
  conflicts: ImportConflict[]
  newDecks: ImportedDeck[]
  sourceName: string
}
