/**
 * AI_CONTEXT:
 * Role: Parser für JSON-Vollbackups (dbBackup.downloadDbBackupAsJson) — mappt den
 *       Payload auf ParsedImport für die normale Import-Pipeline und reicht
 *       Reviews/VideoNotes als Extras zum Nach-Restore durch.
 * Used by: ImportModal (json-Dateien).
 * Important: Karten behalten IDs und Scheduling; Reviews/VideoNotes werden erst
 *            NACH erfolgreichem Karten-Import wiederhergestellt (dedupe-basiert).
 */
import type { DbBackupPayload } from '../dbBackupPayload'
import type { ImportedCard, ImportedDeck, ParsedImport } from './types'

export interface ParsedJsonBackup {
  parsed: ParsedImport
  /** Für restoreReviewsFromBackupPayload / restoreVideoNotesFromBackupPayload. */
  payload: DbBackupPayload
}

function isBackupPayload(value: unknown): value is DbBackupPayload {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { meta?: { app?: string }; data?: { decks?: unknown; cards?: unknown } }
  return candidate.meta?.app === 'card-pwa'
    && Array.isArray(candidate.data?.decks)
    && Array.isArray(candidate.data?.cards)
}

export async function parseJsonBackupFile(file: File, language: 'de' | 'en'): Promise<ParsedJsonBackup> {
  let payload: unknown
  try {
    payload = JSON.parse(await file.text())
  } catch {
    throw new Error(language === 'de' ? 'Die Datei ist kein gültiges JSON.' : 'The file is not valid JSON.')
  }

  if (!isBackupPayload(payload)) {
    throw new Error(language === 'de'
      ? 'Die Datei ist kein Card_PWA-JSON-Backup (meta.app fehlt).'
      : 'The file is not a Card_PWA JSON backup (missing meta.app).')
  }

  const now = Date.now()
  const decks: ImportedDeck[] = payload.data.decks
    .filter(deck => !deck.isDeleted)
    .map(deck => ({ ...deck }))

  const deckIds = new Set(decks.map(deck => deck.id))
  const cards: ImportedCard[] = payload.data.cards
    .filter(card => !card.isDeleted && deckIds.has(card.deckId))
    .map(card => ({ ...card, createdAt: card.createdAt ?? now }))

  if (cards.length === 0) {
    throw new Error(language === 'de'
      ? 'Das Backup enthält keine aktiven Karten.'
      : 'The backup contains no active cards.')
  }

  return {
    parsed: { decks, cards, format: 'json', sourceName: file.name },
    payload,
  }
}
