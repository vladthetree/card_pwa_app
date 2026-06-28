/**
 * AI_CONTEXT: Utility module for review Decks; provides pure helpers for scheduling, parsing, scoring, tags, video notes, backup, or app data transformations.
 */
import { STORAGE_KEYS } from '../constants/appIdentity'

export const REVIEW_ROOT_DECK_ID = 'needs-review-root'

export interface ReviewDeckLike {
  id: string
  parentDeckId?: string | null
}

export function isReviewDeckId(deckId: string): boolean {
  return deckId === REVIEW_ROOT_DECK_ID || deckId.startsWith('needs-review-')
}

export function isReviewDeck(deck: ReviewDeckLike): boolean {
  return isReviewDeckId(deck.id) || deck.parentDeckId === REVIEW_ROOT_DECK_ID
}

export function readReviewDecksEnabledFromStorage(): boolean {
  if (typeof localStorage === 'undefined') return false

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings)
    if (!raw) return false
    const parsed = JSON.parse(raw) as { showReviewDecks?: unknown }
    return parsed.showReviewDecks === true
  } catch {
    return false
  }
}
