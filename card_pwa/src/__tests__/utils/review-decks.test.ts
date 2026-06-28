/**
 * AI_CONTEXT: Vitest coverage for review decks; protects utils behavior from regressions in the learning PWA.
 */
/**
 * UC-4  Review deck classification
 *
 * Review decks (id prefix "needs-review-") are auto-generated and excluded from
 * the main home view and sync by default.  They are only shown when the user
 * explicitly enables "Lernliste anzeigen" in Settings.
 *
 * Mis-classifying a regular deck as a review deck silently hides it from the user;
 * failing to recognise a review deck causes clutter in the normal deck list.
 */
import { describe, expect, it } from 'vitest'
import { isReviewDeckId, isReviewDeck, REVIEW_ROOT_DECK_ID } from '../../utils/reviewDecks'

describe('UC-4  Review deck classification', () => {
  // ── isReviewDeckId ──────────────────────────────────────────────────────────

  describe('isReviewDeckId', () => {
    it('UC-4a: the root review deck id is a review deck', () => {
      expect(isReviewDeckId(REVIEW_ROOT_DECK_ID)).toBe(true)
      expect(isReviewDeckId('needs-review-root')).toBe(true)
    })

    it('UC-4b: auto-generated objective review deck ids are review decks', () => {
      expect(isReviewDeckId('needs-review-objective-1-1')).toBe(true)
      expect(isReviewDeckId('needs-review-objective-4-8')).toBe(true)
      expect(isReviewDeckId('needs-review-other-1772483511761')).toBe(true)
    })

    it('UC-4c: regular content deck ids are NOT review decks', () => {
      expect(isReviewDeckId('sy0-701-objective-1-1')).toBe(false)
      expect(isReviewDeckId('pbq-test-deck-001')).toBe(false)
      expect(isReviewDeckId('1773008953575')).toBe(false)
    })

    it('UC-4d: empty string is not a review deck', () => {
      expect(isReviewDeckId('')).toBe(false)
    })
  })

  // ── isReviewDeck ────────────────────────────────────────────────────────────

  describe('isReviewDeck', () => {
    it('UC-4e: deck whose id is the review root is a review deck', () => {
      expect(isReviewDeck({ id: 'needs-review-root' })).toBe(true)
    })

    it('UC-4f: deck with needs-review- prefixed id is a review deck', () => {
      expect(isReviewDeck({ id: 'needs-review-objective-2-3' })).toBe(true)
    })

    it('UC-4g: deck whose PARENT is the review root is a review deck', () => {
      expect(isReviewDeck({ id: 'some-regular-id', parentDeckId: 'needs-review-root' })).toBe(true)
    })

    it('UC-4h: regular deck with no review-related id or parent is NOT a review deck', () => {
      expect(isReviewDeck({ id: 'sy0-701-objective-1-1', parentDeckId: '1773008953575' })).toBe(false)
    })

    it('UC-4i: PBQ test deck is not a review deck', () => {
      expect(isReviewDeck({ id: 'pbq-test-deck-001', parentDeckId: null })).toBe(false)
    })

    it('UC-4j: deck with null parentDeckId and regular id is not a review deck', () => {
      expect(isReviewDeck({ id: 'some-deck', parentDeckId: null })).toBe(false)
    })
  })
})
