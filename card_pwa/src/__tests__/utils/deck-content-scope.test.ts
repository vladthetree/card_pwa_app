/**
 * AI_CONTEXT: Vitest coverage for deck content scope; protects utils behavior from regressions in the learning PWA.
 */
import { describe, expect, it } from 'vitest'
import {
  collectDeckIdsWithActiveCardsOrDescendants,
  filterDecksWithActiveCardsOrDescendants,
} from '../../utils/deckContentScope'

const deck = (id: string, parentDeckId?: string) => ({ id, parentDeckId: parentDeckId ?? null })
const card = (deckId: string, isDeleted = false) => ({ deckId, isDeleted })

describe('filterDecksWithActiveCardsOrDescendants', () => {
  it('keeps decks that have active cards', () => {
    const result = filterDecksWithActiveCardsOrDescendants(
      [deck('d1'), deck('d2')],
      [card('d1')],
    )
    expect(result.map(d => d.id)).toEqual(['d1'])
  })

  // Regression: a deck whose every card was rejected by normalizeCard (e.g. because
  // note_id was NULL in the DB → noteId: null in the snapshot JSON) ends up with zero
  // valid cards.  This function is called after card normalisation and must silently
  // drop the deck, which is the correct behaviour — but it was the cause of "PBQ Test"
  // not appearing in the PWA after direct DB seeding without a note_id column value.
  it('drops a deck that has no active cards', () => {
    const result = filterDecksWithActiveCardsOrDescendants(
      [deck('orphan-deck')],
      [],
    )
    expect(result).toHaveLength(0)
  })

  it('drops a deck whose only cards are all marked deleted', () => {
    const result = filterDecksWithActiveCardsOrDescendants(
      [deck('d1')],
      [card('d1', true), card('d1', true)],
    )
    expect(result).toHaveLength(0)
  })

  it('keeps a parent deck when a child deck has active cards', () => {
    const decks = [deck('parent'), deck('child', 'parent')]
    const result = filterDecksWithActiveCardsOrDescendants(decks, [card('child')])
    const ids = result.map(d => d.id).sort()
    expect(ids).toEqual(['child', 'parent'])
  })

  it('drops a parent deck when all descendants have no active cards', () => {
    const decks = [deck('parent'), deck('child', 'parent')]
    const result = filterDecksWithActiveCardsOrDescendants(decks, [])
    expect(result).toHaveLength(0)
  })

  it('collectDeckIdsWithActiveCardsOrDescendants returns only relevant ids', () => {
    const decks = [deck('d-has-cards'), deck('d-empty')]
    const keep = collectDeckIdsWithActiveCardsOrDescendants(decks, [card('d-has-cards')])
    expect(keep.has('d-has-cards')).toBe(true)
    expect(keep.has('d-empty')).toBe(false)
  })
})
