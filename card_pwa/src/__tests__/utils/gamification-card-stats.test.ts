import { describe, it, expect } from 'vitest'
import { buildCardSuccessStats, buildGamificationProfile, type GamificationReviewInput } from '../../utils/gamification'

/**
 * Erfolgsmessung pro cardId (Nutzer-Entscheid, TODO.md Phase 2 C): eine Note
 * kann mehrere Karten-Varianten haben — maßgeblich ist die Card-ID. Die
 * Aggregation ist additiv: bestehende Profil-Statistiken bleiben unverändert.
 */

const review = (cardId: string | undefined, rating: 1 | 2 | 3 | 4, timestamp: number): GamificationReviewInput => ({
  rating,
  timeMs: 5_000,
  timestamp,
  cardId,
})

describe('buildCardSuccessStats — Aggregation pro cardId', () => {
  it('trennt Varianten derselben Note über die Card-ID', () => {
    const stats = buildCardSuccessStats([
      review('note1-variant-a', 4, 1_000),
      review('note1-variant-a', 3, 2_000),
      review('note1-variant-b', 1, 3_000),
    ])

    expect(stats.get('note1-variant-a')).toMatchObject({ totalReviews: 2, successfulReviews: 2, successRate: 100 })
    expect(stats.get('note1-variant-b')).toMatchObject({ totalReviews: 1, successfulReviews: 0, successRate: 0 })
  })

  it('zählt rating >= 3 als Erfolg (gleiche Regel wie Deck-/Global-Stats)', () => {
    const stats = buildCardSuccessStats([
      review('c1', 1, 1_000),
      review('c1', 2, 2_000),
      review('c1', 3, 3_000),
      review('c1', 4, 4_000),
    ])
    expect(stats.get('c1')).toMatchObject({ totalReviews: 4, successfulReviews: 2, successRate: 50 })
  })

  it('führt lastReviewedAt als jüngsten Zeitstempel', () => {
    const stats = buildCardSuccessStats([
      review('c1', 3, 9_000),
      review('c1', 3, 4_000),
    ])
    expect(stats.get('c1')?.lastReviewedAt).toBe(9_000)
  })

  it('überspringt Legacy-Reviews ohne cardId', () => {
    const stats = buildCardSuccessStats([
      review(undefined, 4, 1_000),
      review('c1', 4, 2_000),
    ])
    expect(stats.size).toBe(1)
    expect(stats.get('c1')?.totalReviews).toBe(1)
  })
})

describe('buildGamificationProfile — bestehende Stats bleiben unverändert', () => {
  it('liefert mit und ohne cardId identische Profil-Werte', () => {
    const base: GamificationReviewInput[] = [
      { rating: 4, timeMs: 5_000, timestamp: 1_000 },
      { rating: 1, timeMs: 9_000, timestamp: 2_000 },
    ]
    const withIds = base.map((entry, idx) => ({ ...entry, cardId: `c${idx}` }))

    const profileWithout = buildGamificationProfile({ reviews: base, activeCardCount: 10, nowMs: 100_000 })
    const profileWith = buildGamificationProfile({ reviews: withIds, activeCardCount: 10, nowMs: 100_000 })

    expect(profileWith).toEqual(profileWithout)
  })
})
