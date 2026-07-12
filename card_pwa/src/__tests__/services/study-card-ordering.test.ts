/**
 * AI_CONTEXT: Vitest coverage for study session manager; protects services behavior from regressions in the learning PWA.
 */
import { describe, expect, it } from 'vitest'
import {
  buildDailyQuestSelection,
  buildStudySessionSelection,
  getCardWeight,
  interleaveCardsByDeck,
  resolveNewCardAllowance,
  sortStudyCards,
} from '../../services/studyCardOrdering'
import type { Card } from '../../types'

function createCard(overrides: Partial<Card>): Card {
  const nowDay = Math.floor(Date.now() / 86_400_000)
  return {
    id: overrides.id ?? `card-${Math.random()}`,
    noteId: overrides.noteId ?? `note-${Math.random()}`,
    deckId: overrides.deckId,
    type: overrides.type ?? 'new',
    front: overrides.front ?? 'Q',
    back: overrides.back ?? 'A',
    extra: overrides.extra ?? { acronym: '', examples: '', port: '', protocol: '' },
    tags: overrides.tags ?? [],
    interval: overrides.interval ?? 0,
    due: overrides.due ?? nowDay,
    dueAt: overrides.dueAt,
    reps: overrides.reps ?? 0,
    lapses: overrides.lapses ?? 0,
    queue: overrides.queue ?? 0,
    stability: overrides.stability,
    difficulty: overrides.difficulty,
    algorithm: overrides.algorithm,
  }
}

describe('studyCardOrdering', () => {
  it('limits session size via maxCards', () => {
    const cards = Array.from({ length: 10 }, (_, idx) =>
      createCard({ id: `n-${idx}`, type: 'new', due: 100 + idx })
    )

    const result = sortStudyCards(cards, { maxCards: 4 })
    expect(result).toHaveLength(4)
  })

  it('prioritizes due review cards before new cards', () => {
    const nowMs = Date.now()
    const dueReview = createCard({ id: 'review-due', type: 'review', dueAt: nowMs - 1, due: 1 })
    const newCard = createCard({ id: 'new-card', type: 'new', dueAt: nowMs + 1_000_000, due: 9999 })

    const [first] = sortStudyCards([newCard, dueReview])
    expect(first.id).toBe('review-due')
  })

  it('orders card types by priority: learning, relearning, review, new', () => {
    const nowMs = Date.now() - 10_000
    const cards = [
      createCard({ id: 'new', type: 'new', dueAt: nowMs }),
      createCard({ id: 'learning', type: 'learning', dueAt: nowMs }),
      createCard({ id: 'relearning', type: 'relearning', dueAt: nowMs }),
      createCard({ id: 'review', type: 'review', dueAt: nowMs }),
    ]

    const result = sortStudyCards(cards)
    expect(result.map(card => card.id)).toEqual(['learning', 'relearning', 'review', 'new'])
  })

  it('sorts earlier due cards first within same type', () => {
    const nowMs = Date.now()
    const later = createCard({ id: 'later', type: 'review', dueAt: nowMs + 120_000 })
    const sooner = createCard({ id: 'sooner', type: 'review', dueAt: nowMs + 60_000 })

    const [first] = sortStudyCards([later, sooner])
    expect(first.id).toBe('sooner')
  })

  it('uses failure pressure as tiebreaker for same due/type', () => {
    const sameDue = Date.now() + 60_000
    const lowPressure = createCard({
      id: 'low-pressure',
      type: 'review',
      dueAt: sameDue,
      reps: 10,
      lapses: 0,
    })
    const highPressure = createCard({
      id: 'high-pressure',
      type: 'review',
      dueAt: sameDue,
      reps: 10,
      lapses: 4,
    })

    const [first] = sortStudyCards([lowPressure, highPressure])
    expect(first.id).toBe('high-pressure')
  })

  it('falls back to deterministic id ordering when all other fields tie', () => {
    const dueAt = Date.now() + 90_000
    const a = createCard({ id: 'a-card', type: 'review', dueAt, reps: 1, lapses: 1 })
    const b = createCard({ id: 'b-card', type: 'review', dueAt, reps: 1, lapses: 1 })

    const result = sortStudyCards([b, a])
    expect(result.map(card => card.id)).toEqual(['a-card', 'b-card'])
  })

  it('varies equal-priority run batches when a run seed is supplied', () => {
    const cards = Array.from({ length: 10 }, (_, idx) =>
      createCard({ id: `seeded-${idx}`, type: 'new', due: 200 + idx, dueAt: 0 })
    )

    const first = sortStudyCards(cards, { maxCards: 4, runSeed: 'run-a' }).map(card => card.id)
    const repeat = sortStudyCards(cards, { maxCards: 4, runSeed: 'run-a' }).map(card => card.id)
    const second = sortStudyCards(cards, { maxCards: 4, runSeed: 'run-b' }).map(card => card.id)

    expect(repeat).toEqual(first)
    expect(second).not.toEqual(first)
  })

  it('treats non-finite maxCards as unlimited', () => {
    const cards = Array.from({ length: 6 }, (_, idx) =>
      createCard({ id: `u-${idx}`, type: 'new', due: 200 + idx })
    )

    const result = sortStudyCards(cards, { maxCards: Number.NaN })
    expect(result).toHaveLength(6)
  })

  it('computes larger weight for cards with more lapses', () => {
    const low = createCard({ reps: 20, lapses: 1 })
    const high = createCard({ reps: 20, lapses: 5 })

    expect(getCardWeight(high)).toBeGreaterThan(getCardWeight(low))
  })
})

// ─── sortStudyCards — due filter (Bug 1 fix) ─────────────────────────────────

describe('sortStudyCards — due date filter (Bug 1 fix)', () => {
  // Fixed reference point: 10:00 UTC on 2026-04-11
  const nowMs = new Date('2026-04-11T10:00:00.000Z').getTime()
  const d = new Date(nowMs)
  const todayStartMs = d.setHours(0, 0, 0, 0)
  const tomorrowStartMs = todayStartMs + 86_400_000

  function c(id: string, type: Card['type'], dueAt: number): Card {
    return createCard({ id, type, dueAt })
  }

  describe('new cards — always included', () => {
    it('includes new card with dueAt 10 days in the future', () => {
      const result = sortStudyCards([c('n1', 'new', nowMs + 10 * 86_400_000)], { nowMs })
      expect(result.map(r => r.id)).toContain('n1')
    })

    it('includes new card with dueAt in the past', () => {
      const result = sortStudyCards([c('n1', 'new', nowMs - 86_400_000)], { nowMs })
      expect(result).toHaveLength(1)
    })
  })

  describe('learning / relearning cards — shown when due today', () => {
    it('includes learning card with dueAt 1ms in the past', () => {
      const result = sortStudyCards([c('l1', 'learning', nowMs - 1)], { nowMs })
      expect(result).toHaveLength(1)
    })

    it('includes learning card with dueAt 1ms in the future', () => {
      const result = sortStudyCards([c('l1', 'learning', nowMs + 1)], { nowMs })
      expect(result).toHaveLength(1)
    })

    it('includes learning card with dueAt exactly nowMs', () => {
      const result = sortStudyCards([c('l1', 'learning', nowMs)], { nowMs })
      expect(result).toHaveLength(1)
    })

    it('includes relearning card due in 10 minutes', () => {
      const result = sortStudyCards([c('r1', 'relearning', nowMs + 10 * 60_000)], { nowMs })
      expect(result).toHaveLength(1)
    })

    it('includes relearning card with dueAt exactly nowMs', () => {
      const result = sortStudyCards([c('r1', 'relearning', nowMs)], { nowMs })
      expect(result).toHaveLength(1)
    })

    it('excludes relearning card due exactly at tomorrowStartMs', () => {
      const result = sortStudyCards([c('r1', 'relearning', tomorrowStartMs)], { nowMs })
      expect(result).toHaveLength(0)
    })
  })

  describe('review cards — shown when due today (dueAt < tomorrowStartMs)', () => {
    it('includes review card with dueAt in the past', () => {
      const result = sortStudyCards([c('rv1', 'review', nowMs - 86_400_000)], { nowMs })
      expect(result).toHaveLength(1)
    })

    it('includes review card with dueAt = tomorrowStartMs - 1 (last ms today)', () => {
      const result = sortStudyCards([c('rv1', 'review', tomorrowStartMs - 1)], { nowMs })
      expect(result).toHaveLength(1)
    })

    it('excludes review card with dueAt = tomorrowStartMs (exactly tomorrow)', () => {
      const result = sortStudyCards([c('rv1', 'review', tomorrowStartMs)], { nowMs })
      expect(result).toHaveLength(0)
    })

    it('excludes review card with dueAt 3 days in the future', () => {
      const result = sortStudyCards([c('rv1', 'review', nowMs + 3 * 86_400_000)], { nowMs })
      expect(result).toHaveLength(0)
    })
  })

  describe('maxCards is applied after filtering', () => {
    it('maxCards counts only due cards', () => {
      const cards: Card[] = [
        c('n1', 'new', nowMs),
        c('n2', 'new', nowMs),
        c('n3', 'new', nowMs),
        c('rv1', 'review', nowMs + 3 * 86_400_000), // filtered out
      ]
      const result = sortStudyCards(cards, { maxCards: 2, nowMs })
      expect(result).toHaveLength(2)
    })

    it('returns fewer than maxCards when not enough due cards', () => {
      const cards: Card[] = [
        c('n1', 'new', nowMs),
        c('rv1', 'review', nowMs + 3 * 86_400_000), // filtered out
      ]
      const result = sortStudyCards(cards, { maxCards: 10, nowMs })
      expect(result).toHaveLength(1)
    })
  })

  describe('session re-entry after partial review (Bug 1 scenario)', () => {
    it('cards reviewed Good this session (dueAt = 1d out) are not shown again', () => {
      // Simulates re-entering the same deck after reviewing 3 "Good" cards.
      // Those cards now have dueAt = localMidnight + 1d (in future).
      const reviewed = [
        c('r1', 'review', tomorrowStartMs + 0),           // exactly tomorrow → filtered
        c('r2', 'review', tomorrowStartMs + 86_400_000),  // day after → filtered
        c('r3', 'review', nowMs + 3 * 86_400_000),        // 3d → filtered
      ]
      const unreviewed = [
        c('n1', 'new', nowMs),
        c('n2', 'new', nowMs),
        c('n3', 'new', nowMs),
      ]

      const result = sortStudyCards([...reviewed, ...unreviewed], { nowMs })
      expect(result).toHaveLength(3)
      result.forEach(card => expect(card.type).toBe('new'))
    })

    it('deck with 10 cards, 3 reviewed today: only 7 shown on re-entry', () => {
      const reviewed = Array.from({ length: 3 }, (_, i) =>
        c(`rv${i}`, 'review', nowMs + 86_400_000) // dueAt tomorrow — filtered
      )
      const unreviewed = Array.from({ length: 7 }, (_, i) =>
        c(`n${i}`, 'new', nowMs)
      )
      const result = sortStudyCards([...reviewed, ...unreviewed], { nowMs })
      expect(result).toHaveLength(7)
    })

    it('keeps relearning cards in queue after interruption when due later today', () => {
      const interruptedAgainCards = [
        c('again-1', 'relearning', nowMs + 5 * 60_000),
        c('again-2', 'relearning', nowMs + 30 * 60_000),
      ]
      const regularDueCards = [
        c('rv-due', 'review', nowMs - 60_000),
        c('n1', 'new', nowMs),
      ]

      const result = sortStudyCards([...interruptedAgainCards, ...regularDueCards], { nowMs })
      expect(result.map(card => card.id)).toEqual(['rv-due', 'again-1', 'again-2', 'n1'])
    })
  })

  describe('review cards respect custom nextDayStartsAt boundary', () => {
    it('excludes review card due after custom day rollover', () => {
      // With nextDayStartsAt=6, day rollover is at 06:00 local time.
      // At 10:00, the "tomorrow" boundary is next day 06:00, not midnight.
      const dayStart = new Date(nowMs)
      dayStart.setHours(6, 0, 0, 0)
      const customBoundary = dayStart.getTime() + 86_400_000
      const result = sortStudyCards([c('rv1', 'review', customBoundary)], {
        nowMs,
        nextDayStartsAt: 6,
      })
      expect(result).toHaveLength(0)
    })

    it('includes review card due 1ms before custom day rollover', () => {
      const dayStart = new Date(nowMs)
      dayStart.setHours(6, 0, 0, 0)
      const customBoundary = dayStart.getTime() + 86_400_000
      const result = sortStudyCards([c('rv1', 'review', customBoundary - 1)], {
        nowMs,
        nextDayStartsAt: 6,
      })
      expect(result).toHaveLength(1)
    })
  })

  describe('interleaveCardsByDeck (Daily Quest)', () => {
    const deckCard = (id: string, deckId?: string) => createCard({ id, deckId })

    it('rotiert im Round-Robin über die Decks statt Deck-Blöcke zu bilden', () => {
      const cards = [
        deckCard('a1', 'deck-a'), deckCard('a2', 'deck-a'), deckCard('a3', 'deck-a'),
        deckCard('b1', 'deck-b'), deckCard('b2', 'deck-b'),
        deckCard('c1', 'deck-c'),
      ]
      const result = interleaveCardsByDeck(cards)
      expect(result.map(card => card.id)).toEqual(['a1', 'b1', 'c1', 'a2', 'b2', 'a3'])
    })

    it('behält die Reihenfolge innerhalb eines Decks bei (stabil)', () => {
      const cards = [
        deckCard('a1', 'deck-a'), deckCard('b1', 'deck-b'),
        deckCard('a2', 'deck-a'), deckCard('b2', 'deck-b'),
      ]
      const result = interleaveCardsByDeck(cards)
      const deckAOrder = result.filter(card => card.deckId === 'deck-a').map(card => card.id)
      const deckBOrder = result.filter(card => card.deckId === 'deck-b').map(card => card.id)
      expect(deckAOrder).toEqual(['a1', 'a2'])
      expect(deckBOrder).toEqual(['b1', 'b2'])
      expect(result).toHaveLength(cards.length)
    })

    it('lässt Single-Deck-Sessions und Karten ohne deckId unverändert', () => {
      const singleDeck = [deckCard('a1', 'deck-a'), deckCard('a2', 'deck-a')]
      expect(interleaveCardsByDeck(singleDeck)).toEqual(singleDeck)

      const noDeckIds = [deckCard('x1'), deckCard('x2'), deckCard('x3')]
      expect(interleaveCardsByDeck(noDeckIds)).toEqual(noDeckIds)
    })
  })

  describe('buildDailyQuestSelection (unabhaengige Daily Quest)', () => {
    const nowMs = new Date(2026, 6, 12, 12, 0, 0).getTime()

    it('liefert exakt die konfigurierte Groesse und schliesst Paketkarten aus', () => {
      const cards = [
        ...Array.from({ length: 4 }, (_, idx) => createCard({
          id: `due-${idx}`,
          deckId: `deck-${idx % 2}`,
          type: 'review',
          dueAt: nowMs - 1000,
        })),
        ...Array.from({ length: 20 }, (_, idx) => createCard({
          id: `new-${idx}`,
          deckId: `deck-${idx % 4}`,
          type: 'new',
        })),
      ]

      const result = buildDailyQuestSelection(cards, {
        maxCards: 10,
        nowMs,
        runSeed: 'quest-a',
        excludeCardIds: ['due-0', 'new-0'],
      })

      expect(result).toHaveLength(10)
      expect(result.map(card => card.id)).not.toContain('due-0')
      expect(result.map(card => card.id)).not.toContain('new-0')
    })

    it('bevorzugt faellige Karten und mischt dabei mehrere Decks', () => {
      const cards = [
        ...Array.from({ length: 4 }, (_, idx) => createCard({
          id: `a-due-${idx}`,
          deckId: 'deck-a',
          type: 'review',
          dueAt: nowMs - 5000,
        })),
        ...Array.from({ length: 4 }, (_, idx) => createCard({
          id: `b-due-${idx}`,
          deckId: 'deck-b',
          type: 'review',
          dueAt: nowMs - 5000,
        })),
        ...Array.from({ length: 10 }, (_, idx) => createCard({
          id: `new-${idx}`,
          deckId: 'deck-c',
          type: 'new',
        })),
      ]

      const result = buildDailyQuestSelection(cards, { maxCards: 6, nowMs, runSeed: 'quest-b' })

      expect(result).toHaveLength(6)
      expect(result.every(card => card.type === 'review')).toBe(true)
      expect(new Set(result.map(card => card.deckId))).toEqual(new Set(['deck-a', 'deck-b']))
      for (let idx = 1; idx < result.length; idx += 1) {
        expect(result[idx].deckId).not.toBe(result[idx - 1].deckId)
      }
    })

    it('variiert die zufaellige Auffuell-Auswahl mit dem Start-Seed', () => {
      const cards = Array.from({ length: 30 }, (_, idx) => createCard({
        id: `new-${idx}`,
        deckId: `deck-${idx % 5}`,
        type: 'new',
      }))

      const first = buildDailyQuestSelection(cards, { maxCards: 10, nowMs, runSeed: 'first-run' })
      const second = buildDailyQuestSelection(cards, { maxCards: 10, nowMs, runSeed: 'second-run' })

      expect(first).toHaveLength(10)
      expect(second).toHaveLength(10)
      expect(first.map(card => card.id)).not.toEqual(second.map(card => card.id))
    })

    it('kuerzt nur, wenn der gesamte lernbereite Pool kleiner ist', () => {
      const cards = [
        createCard({ id: 'one', deckId: 'a', type: 'new' }),
        createCard({ id: 'two', deckId: 'b', type: 'new' }),
      ]
      expect(buildDailyQuestSelection(cards, { maxCards: 50, nowMs })).toHaveLength(2)
    })

    it('bleibt beim Eintritt in StudyView unabhaengig von anderen Limits', () => {
      const questCards = Array.from({ length: 50 }, (_, idx) => createCard({
        id: `quest-${idx}`,
        deckId: `deck-${idx % 5}`,
        type: 'new',
      }))

      const result = buildStudySessionSelection(questCards, {
        sessionId: 'daily-quest',
        maxCards: 10,
        maxNewCards: 5,
        nextDayStartsAt: 4,
      })

      expect(result).toHaveLength(50)
      expect(result).toEqual(questCards)
    })

    it('laesst normale Deck-Sessions weiterhin beide Limits respektieren', () => {
      const cards = Array.from({ length: 20 }, (_, idx) => createCard({
        id: `normal-${idx}`,
        type: 'new',
      }))
      const result = buildStudySessionSelection(cards, {
        sessionId: 'regular-deck',
        maxCards: 10,
        maxNewCards: 5,
      })
      expect(result).toHaveLength(5)
    })
  })

  // Tagesdosis neuer Karten (newCardsPerDay): kappt nur den Neu-Anteil einer
  // Session — Fällige und Intraday-Lernschritte bleiben unangetastet.
  describe('maxNewCards (Tagesdosis)', () => {
    it('kappt neue Karten auf die Dosis, Fällige bleiben drin', () => {
      const nowMs = Date.now()
      const cards = [
        ...Array.from({ length: 6 }, (_, idx) => createCard({ id: `new-${idx}`, type: 'new' })),
        createCard({ id: 'review-due', type: 'review', dueAt: nowMs - 1_000, due: 1 }),
      ]

      const result = sortStudyCards(cards, { maxCards: 10, maxNewCards: 2 })
      expect(result.filter(card => card.type === 'new')).toHaveLength(2)
      expect(result.map(card => card.id)).toContain('review-due')
      expect(result).toHaveLength(3)
    })

    it('bei aufgebrauchter Dosis (0) kommen keine neuen Karten mehr', () => {
      const cards = Array.from({ length: 4 }, (_, idx) => createCard({ id: `new-${idx}`, type: 'new' }))
      expect(sortStudyCards(cards, { maxCards: 10, maxNewCards: 0 })).toHaveLength(0)
    })

    it('Lern-/Relearning-Karten sind von der Dosis ausgenommen', () => {
      const nowMs = Date.now()
      const cards = [
        createCard({ id: 'learning-1', type: 'learning', dueAt: nowMs - 1 }),
        createCard({ id: 'new-1', type: 'new' }),
      ]

      const result = sortStudyCards(cards, { maxCards: 10, maxNewCards: 0 })
      expect(result.map(card => card.id)).toEqual(['learning-1'])
    })

    it('ohne Option bleibt das Verhalten unverändert (unbegrenzt)', () => {
      const cards = Array.from({ length: 5 }, (_, idx) => createCard({ id: `new-${idx}`, type: 'new' }))
      expect(sortStudyCards(cards, { maxCards: 10 })).toHaveLength(5)
    })
  })

  describe('resolveNewCardAllowance', () => {
    it('0 oder ungültige Einstellung bedeutet unbegrenzt', () => {
      expect(resolveNewCardAllowance(0, 5)).toBe(Number.POSITIVE_INFINITY)
      expect(resolveNewCardAllowance(-1, 5)).toBe(Number.POSITIVE_INFINITY)
      expect(resolveNewCardAllowance(Number.NaN, 5)).toBe(Number.POSITIVE_INFINITY)
    })

    it('zieht heute bereits angebrochene Karten von der Dosis ab', () => {
      expect(resolveNewCardAllowance(10, 0)).toBe(10)
      expect(resolveNewCardAllowance(10, 4)).toBe(6)
      expect(resolveNewCardAllowance(10, 12)).toBe(0)
    })
  })
})
