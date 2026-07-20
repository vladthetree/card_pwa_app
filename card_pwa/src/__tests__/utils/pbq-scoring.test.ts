/**
 * AI_CONTEXT: Vitest coverage for pbq scoring; protects utils behavior from regressions in the learning PWA.
 */
/**
 * UC-1  Ordering card scoring
 * UC-2  Matching card scoring
 *
 * A PBQ (Performance-Based Question) card grants partial credit: the score is a
 * float in [0, 1] that represents the fraction of items the user got right.
 * StudyView converts score < 1.0 into rating = 1 (Again), so these functions are
 * on the critical path for determining whether a card re-enters the study queue.
 */
import { describe, expect, it } from 'vitest'
import { computeOrderingScore, computeMatchingScore, computeDecisionScore } from '../../utils/pbqScoring'

// ─── UC-1: Ordering card ─────────────────────────────────────────────────────

describe('UC-1  Ordering card scoring (computeOrderingScore)', () => {
  // The correct order is expressed as 0-based indices into originalItems.
  // e.g. NIST IR: items listed as [Containment, Preparation, Identification, …]
  //      correctOrder = [1,2,0,3,4,5]  means Preparation first, then Identification, etc.

  const items    = ['Containment', 'Preparation', 'Identification', 'Eradication', 'Recovery', 'Lessons Learned']
  const correct  = [1, 2, 0, 3, 4, 5]   // correct sequence as 0-based indices
  const expected = ['Preparation', 'Identification', 'Containment', 'Eradication', 'Recovery', 'Lessons Learned']

  it('UC-1a: full credit when all items are in the correct position', () => {
    expect(computeOrderingScore(expected, correct, items)).toBe(1)
  })

  it('UC-1b: zero score when no item is in the correct position', () => {
    // Completely reversed — nothing lines up
    const reversed = [...expected].reverse()
    expect(computeOrderingScore(reversed, correct, items)).toBe(0)
  })

  it('UC-1c: partial credit proportional to correct positions', () => {
    // First 3 correct, last 3 wrong
    const half = [
      'Preparation',       // pos 0 ✓
      'Identification',    // pos 1 ✓
      'Containment',       // pos 2 ✓
      'Recovery',          // pos 3 ✗ (expected Eradication)
      'Eradication',       // pos 4 ✗ (expected Recovery)
      'Lessons Learned',   // pos 5 ✓
    ]
    expect(computeOrderingScore(half, correct, items)).toBeCloseTo(4 / 6)
  })

  it('UC-1d: score is clamped — never below 0 or above 1', () => {
    const s = computeOrderingScore(expected, correct, items)
    expect(s).toBeGreaterThanOrEqual(0)
    expect(s).toBeLessThanOrEqual(1)
  })

  it('UC-1e: single-item quiz is all-or-nothing', () => {
    expect(computeOrderingScore(['A'], [0], ['A'])).toBe(1)
    expect(computeOrderingScore(['B'], [0], ['A'])).toBe(0)
  })

  it('UC-1f: empty item list returns 0 (no division by zero)', () => {
    expect(computeOrderingScore([], [], [])).toBe(0)
  })
})

// ─── UC-2: Matching card ─────────────────────────────────────────────────────

describe('UC-2  Matching card scoring (computeMatchingScore)', () => {
  const pairs = [
    { left: '22',   right: 'SSH'   },
    { left: '25',   right: 'SMTP'  },
    { left: '53',   right: 'DNS'   },
    { left: '443',  right: 'HTTPS' },
  ]

  it('UC-2a: full credit when every pair is matched correctly', () => {
    const connections = { '22': 'SSH', '25': 'SMTP', '53': 'DNS', '443': 'HTTPS' }
    expect(computeMatchingScore(connections, pairs)).toBe(1)
  })

  it('UC-2b: zero score when no connections are made', () => {
    expect(computeMatchingScore({}, pairs)).toBe(0)
  })

  it('UC-2c: zero score when all connections are wrong', () => {
    const connections = { '22': 'DNS', '25': 'HTTPS', '53': 'SSH', '443': 'SMTP' }
    expect(computeMatchingScore(connections, pairs)).toBe(0)
  })

  it('UC-2d: partial credit — exactly half correct', () => {
    const connections = { '22': 'SSH', '25': 'SMTP', '53': 'WRONG', '443': 'WRONG' }
    expect(computeMatchingScore(connections, pairs)).toBe(0.5)
  })

  it('UC-2e: one correct out of many gives proportional score', () => {
    const connections = { '22': 'SSH' }   // only first pair correct
    expect(computeMatchingScore(connections, pairs)).toBe(0.25)
  })

  it('UC-2f: empty pair list returns 0 (no division by zero)', () => {
    expect(computeMatchingScore({}, [])).toBe(0)
  })

  it('UC-2g: matching is exact-value — close but wrong right-side is not credited', () => {
    const connections = { '22': 'ssh' }   // lowercase — case-sensitive
    expect(computeMatchingScore(connections, [{ left: '22', right: 'SSH' }])).toBe(0)
  })
})

describe('UC-3  Decision card scoring (computeDecisionScore)', () => {
  it('UC-3a: single-select — correct pick gives full credit', () => {
    expect(computeDecisionScore(['b'], ['b'])).toBe(1)
  })

  it('UC-3b: single-select — wrong pick gives zero, not negative', () => {
    expect(computeDecisionScore(['a'], ['b'])).toBe(0)
  })

  it('UC-3c: multi-select — all correct options picked gives full credit', () => {
    expect(computeDecisionScore(['a', 'c'], ['a', 'c'])).toBe(1)
  })

  it('UC-3d: multi-select — partial pick gives proportional credit', () => {
    expect(computeDecisionScore(['a'], ['a', 'c'])).toBe(0.5)
  })

  it('UC-3e: multi-select — an incorrect extra pick is penalized, not just ignored', () => {
    // 2 of 2 correct picked, but 1 wrong extra also picked: (2-1)/2
    expect(computeDecisionScore(['a', 'c', 'x'], ['a', 'c'])).toBe(0.5)
  })

  it('UC-3f: penalty cannot push the score below 0', () => {
    expect(computeDecisionScore(['x', 'y', 'z'], ['a'])).toBe(0)
  })

  it('UC-3g: no selection gives zero', () => {
    expect(computeDecisionScore([], ['a', 'b'])).toBe(0)
  })

  it('UC-3h: empty correct-id list returns 0 (no division by zero)', () => {
    expect(computeDecisionScore(['a'], [])).toBe(0)
  })

  it('UC-3i: duplicate selections do not inflate the score', () => {
    expect(computeDecisionScore(['a', 'a'], ['a', 'b'])).toBe(0.5)
  })
})
