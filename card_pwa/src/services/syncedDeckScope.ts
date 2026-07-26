/**
 * AI_CONTEXT:
 * Role: Computes which deck IDs are currently in scope for sync/study based on linked-profile selection, descendants, and review-deck visibility.
 * Used by: getSyncedDeckIds — Home derived data, shuffle summaries, deck filtering.
 *   getSelectedDeckFilter — the canonical Set-based filter shared by syncQueue (push) and syncPull, so both apply identical selection rules.
 * Important: A null selection means default scope, an empty array means explicitly no decks; do not conflate those states.
 * getSyncedDeckIds and getSelectedDeckFilter are intentionally separate: the former resolves userId/local-vs-linked itself and always
 * returns a concrete array, the latter expects an already-linked profile and returns null to mean "no filter" to its callers.
 */
import { db } from '../db'
import { isSyncActive } from './syncConfig'
import { readSelectedDeckIds } from './profileService'
import { isReviewDeck, isReviewDeckId, readReviewDecksEnabledFromStorage } from '../utils/reviewDecks'

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
    const showReviewDecks = readReviewDecksEnabledFromStorage()

    if (serverSelected === null) {
      return showReviewDecks ? localIds : localDecks.filter(deck => !isReviewDeck(deck)).map(deck => deck.id)
    }
    if (serverSelected.length === 0) return []

    const selected = showReviewDecks
      ? serverSelected
      : serverSelected.filter(id => {
          const deck = localDecks.find(item => item.id === id)
          return deck ? !isReviewDeck(deck) : !isReviewDeckId(id)
        })
    const serverSet = expandDeckIdsWithDescendants(localDecks, new Set(selected))
    return localIds.filter(id => serverSet.has(id))
  }

  // Local-only: all non-deleted decks are in scope.
  return localIds
}

/**
 * Deck-Id-Filter für das verknüpfte Profil (Set | null; null = kein aktiver
 * Filter). Kanonische Quelle für syncQueue (Push) und syncPull, damit beide
 * exakt dieselbe Auswahl-/Review-Deck-/Hierarchie-Regel anwenden.
 */
export async function getSelectedDeckFilter(): Promise<Set<string> | null> {
  try {
    const profile = await db.profile.get('current')
    if (!profile || profile.mode !== 'linked' || !profile.userId) return null
    const selected = readSelectedDeckIds(profile.userId)
    const decks = (await db.decks.toArray()).filter(deck => !deck.isDeleted)
    const showReviewDecks = readReviewDecksEnabledFromStorage()

    if (selected === null) return null
    if (selected.length === 0) return new Set()

    const visibleSelected = showReviewDecks
      ? selected
      : selected.filter(id => {
          const deck = decks.find(item => item.id === id)
          return deck ? !isReviewDeck(deck) : !isReviewDeckId(id)
        })
    return expandDeckIdsWithDescendants(decks, new Set(visibleSelected))
  } catch {
    return null
  }
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
