import { db } from '../db'
import { isSyncActive } from './syncConfig'
import { readSelectedDeckIds } from './profileService'

const REVIEW_ROOT_ID = 'needs-review-root'

function isReviewDeck(deckId: string, decks: Array<{ id: string; parentDeckId?: string | null }>): boolean {
  if (deckId === REVIEW_ROOT_ID) return true
  const deck = decks.find(d => d.id === deckId)
  return deck?.parentDeckId === REVIEW_ROOT_ID
}

/**
 * Returns the IDs of all decks that are currently "in scope" for sync/study.
 *
 * - null   in storage → default: all except review decks
 * - []     in storage → explicitly empty: nothing
 * - [...]  in storage → only those specific decks
 */
export async function getSyncedDeckIds(userId?: string): Promise<string[]> {
  const localDecks = await db.decks.filter(d => !d.isDeleted).toArray()
  const localIds = localDecks.map(d => d.id)

  if (isSyncActive() && userId) {
    const serverSelected = readSelectedDeckIds(userId)

    if (serverSelected === null) {
      // Default: all decks except review decks
      return localIds.filter(id => !isReviewDeck(id, localDecks))
    }
    if (serverSelected.length === 0) return []

    const serverSet = expandDeckIdsWithDescendants(localDecks, new Set(serverSelected))
    return localIds.filter(id => serverSet.has(id))
  }

  // Local-only: all non-deleted decks are in scope.
  return localIds
}

function expandDeckIdsWithDescendants(
  decks: Array<{ id: string; parentDeckId?: string | null }>,
  selectedDeckIds: Set<string>,
): Set<string> {
  const childrenByParent = new Map<string, Array<{ id: string }>>()
  const activeIds = new Set(decks.map(deck => deck.id))
  for (const deck of decks) {
    if (!deck.parentDeckId || !activeIds.has(deck.parentDeckId)) continue
    const bucket = childrenByParent.get(deck.parentDeckId) ?? []
    bucket.push(deck)
    childrenByParent.set(deck.parentDeckId, bucket)
  }

  const expanded = new Set<string>()
  const stack = Array.from(selectedDeckIds)
  while (stack.length > 0) {
    const deckId = stack.pop()
    if (!deckId || expanded.has(deckId)) continue
    expanded.add(deckId)
    for (const child of childrenByParent.get(deckId) ?? []) stack.push(child.id)
  }
  return expanded
}
