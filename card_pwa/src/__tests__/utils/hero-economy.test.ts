/**
 * AI_CONTEXT: Vitest coverage for the hero economy (gold, funded purchases, dungeon gates) and the game-memory replay incl. exploit personas.
 */
import { describe, it, expect } from 'vitest'
import { createEmptyCard, fsrs, generatorParameters, Rating as FsrsRating, type Grade } from 'ts-fsrs'
import {
  DAY_GOLD_CAP,
  buildDungeonProgress,
  buildFundedPurchases,
  buildHeroPower,
  computeDayGoldByDay,
  computeEarnedGold,
  computeGearPower,
  computeReviewGold,
  getNextTier,
  getTierPrice,
  type HeroPurchase,
  type ReviewGoldInput,
} from '../../utils/heroEconomy'
import { buildGameMemoryReplay, GAME_NEW_CARD_DAILY_CAP, isGameMature, type GameReviewInput } from '../../utils/heroGameMemory'

const DAY = 86_400_000
const T0 = new Date('2026-10-12T10:00:00').getTime()

function gold(overrides: Partial<ReviewGoldInput> = {}): ReviewGoldInput {
  return {
    reviewKey: 'r1', cardId: 'c1', dayKey: 'd1', rating: 3, timeMs: 3000, wasDue: true, preGameStability: 0, ...overrides,
  }
}

describe('computeReviewGold', () => {
  it('Again zahlt 0 und nie negativ', () => {
    expect(computeReviewGold(gold({ rating: 1 }))).toBe(0)
  })
  it('Hard 3, Good und Easy 4 (Easy zahlt nicht mehr)', () => {
    expect(computeReviewGold(gold({ rating: 2 }))).toBe(3)
    expect(computeReviewGold(gold({ rating: 3 }))).toBe(4)
    expect(computeReviewGold(gold({ rating: 4 }))).toBe(4)
  })
  it('Blindklicks unter 1,0 s und vorgezogene Reviews zahlen 0', () => {
    expect(computeReviewGold(gold({ timeMs: 999 }))).toBe(0)
    expect(computeReviewGold(gold({ timeMs: Number.NaN }))).toBe(0)
    expect(computeReviewGold(gold({ wasDue: false }))).toBe(0)
  })
  it('Reifezuschlag steigt mit der Stabilität, geheilter Lapse gibt einmalig +6', () => {
    expect(computeReviewGold(gold({ preGameStability: 1 }))).toBe(5)
    expect(computeReviewGold(gold({ preGameStability: 7 }))).toBe(6)
    expect(computeReviewGold(gold({ preGameStability: 21 }))).toBe(8)
    expect(computeReviewGold(gold({ preGameStability: 60 }))).toBe(10)
    expect(computeReviewGold(gold({ preGameStability: 180 }))).toBe(12)
    expect(computeReviewGold(gold({ healedNow: true }))).toBe(10)
  })
})

describe('computeDayGoldByDay', () => {
  it('zählt je Karte und Tag nur das Maximum und dedupliziert Sync-Replays', () => {
    const days = computeDayGoldByDay([
      gold({ reviewKey: 'a', rating: 2 }),
      gold({ reviewKey: 'b', rating: 3 }),
      gold({ reviewKey: 'b', rating: 3 }),
    ])
    expect(days).toEqual([{ dayKey: 'd1', raw: 4, capped: 4 }])
  })
  it('deckelt die Tagessumme bei 52', () => {
    const reviews = Array.from({ length: 30 }, (_, i) => gold({ reviewKey: `r${i}`, cardId: `c${i}`, preGameStability: 21 }))
    const [day] = computeDayGoldByDay(reviews)
    expect(day.raw).toBe(240)
    expect(day.capped).toBe(DAY_GOLD_CAP)
    expect(computeEarnedGold([day])).toBe(52)
  })
})

describe('Käufe und Ausrüstung', () => {
  const purchase = (slot: HeroPurchase['slot'], tier: HeroPurchase['tier'], at: number): HeroPurchase => ({
    slot, tier, variant: 0, pricePaid: getTierPrice(tier), purchasedAt: at,
  })

  it('finanziert ältere Käufe zuerst; fehlendes Gold (Undo) lässt die neuesten ruhen statt sie zu löschen', () => {
    const purchases = [purchase('weapon', 1, 1), purchase('head', 1, 2), purchase('chest', 1, 3)]
    const full = buildFundedPurchases(300, purchases)
    expect(full.funded).toHaveLength(3)
    const undone = buildFundedPurchases(250, purchases)
    expect(undone.funded.map(p => p.slot)).toEqual(['weapon', 'head'])
    expect(undone.unfunded.map(p => p.slot)).toEqual(['chest'])
    expect(undone.balance).toBe(50)
  })
  it('behandelt denselben Slot und dieselbe Stufe nur einmal', () => {
    const result = buildFundedPurchases(1000, [purchase('weapon', 1, 1), purchase('weapon', 1, 2)])
    expect(result.funded).toHaveLength(1)
  })
  it('verlangt Stufen der Reihe nach', () => {
    expect(getNextTier([], 'weapon')).toBe(1)
    expect(getNextTier([purchase('weapon', 1, 1), purchase('weapon', 2, 2)], 'weapon')).toBe(3)
    expect(getNextTier([purchase('weapon', 5, 1)], 'weapon')).toBeNull()
  })
  it('summiert Ausrüstungsmacht je Slot (höchste Stufe oder gewählte)', () => {
    const owned = [purchase('weapon', 1, 1), purchase('weapon', 2, 2), purchase('head', 1, 3)]
    expect(computeGearPower(owned)).toBe(9 + 5)
    expect(computeGearPower(owned, { weapon: 1 })).toBe(5 + 5)
  })
})

describe('buildDungeonProgress', () => {
  const stats = { cards: 100, objectives: 8, mature: 0, deep: 0, covered: 0, kept: 0 }

  it('öffnet ohne Wissen keine Etage, egal wie viel Ausrüstung da ist', () => {
    const progress = buildDungeonProgress(stats, 145)
    expect(progress.examFloors).toBe(0)
    expect(progress.hint?.needMature).toBeGreaterThan(0)
  })
  it('öffnet ohne Ausrüstung keine Etage, egal wie viel Wissen da ist', () => {
    const progress = buildDungeonProgress({ ...stats, mature: 60, covered: 8, deep: 10, kept: 50 }, 0)
    expect(progress.examFloors).toBe(0)
    expect(progress.hint?.needGear).toBeGreaterThan(0)
  })
  it('öffnet die erste Etage mit reifen Karten, Lernziel und Ausrüstung gemeinsam', () => {
    const progress = buildDungeonProgress({ ...stats, mature: 4, covered: 2 }, 5)
    expect(progress.examFloors).toBe(1)
    expect(progress.hint?.floor).toBe(2)
  })
  it('lässt das Lernziel-Schloss entfallen, wo es keine Lernziel-Tags gibt', () => {
    const noObjectives = { ...stats, objectives: 0, mature: 4 }
    expect(buildDungeonProgress(noObjectives, 5).examFloors).toBe(1)
  })
  it('hat den Boss bei 28 % reifen Karten, vollem Lernziel-Anteil und genug Ausrüstung', () => {
    const progress = buildDungeonProgress({ ...stats, mature: 28, covered: 6 }, 29)
    expect(progress.examFloors).toBe(6)
    expect(progress.bossCleared).toBe(true)
  })
  it('Heldenmacht ist nur eine Anzeige: Level ersetzt kein Wissen', () => {
    const power = buildHeroPower(99, 145, { mature: 0, deep: 0, healed: 0, coveredObjectives: 0, solidObjectives: 0, firmObjectives: 0, veryDeep: 0 })
    expect(power.levelPart).toBe(30)
    expect(buildDungeonProgress(stats, 145).examFloors).toBe(0)
  })
})

describe('buildGameMemoryReplay', () => {
  const scheduler = fsrs(generatorParameters({ enable_fuzz: false, enable_short_term: false, learning_steps: [], relearning_steps: [] }))

  /** Ehrlicher Lerner: wiederholt jede Karte pünktlich nach dem Plan, immer Good. */
  function diligentReviews(cardCount: number, days: number): GameReviewInput[] {
    const out: GameReviewInput[] = []
    for (let c = 0; c < cardCount; c += 1) {
      let card = createEmptyCard(new Date(T0))
      let when = T0 + (c % 3) * 1000
      for (let i = 0; i < 12 && when < T0 + days * DAY; i += 1) {
        out.push({ reviewKey: `c${c}-${i}`, cardId: `c${c}`, rating: 3, timeMs: 4000, timestamp: when })
        card = scheduler.next(card, new Date(when), FsrsRating.Good as Grade).card
        when = card.due.getTime()
      }
    }
    return out
  }

  it('gibt dem pünktlichen Lerner Reife und Gold', () => {
    const replay = buildGameMemoryReplay(diligentReviews(8, 90))
    const mature = [...replay.cards.values()].filter(card => isGameMature(card)).length
    expect(mature).toBeGreaterThanOrEqual(6)
    const earned = computeEarnedGold(computeDayGoldByDay(replay.goldInputs))
    expect(earned).toBeGreaterThan(40)
  })

  it('Spammer: 150 schnelle Easy-Klicks pro Tag bringen 0 Gold und 0 reife Karten', () => {
    const reviews: GameReviewInput[] = []
    for (let day = 0; day < 20; day += 1) {
      for (let i = 0; i < 150; i += 1) {
        reviews.push({ reviewKey: `s${day}-${i}`, cardId: `c${i % 40}`, rating: 4, timeMs: 400 + (i % 5) * 100, timestamp: T0 + day * DAY + i * 1000 })
      }
    }
    const replay = buildGameMemoryReplay(reviews)
    expect(computeEarnedGold(computeDayGoldByDay(replay.goldInputs))).toBe(0)
    expect([...replay.cards.values()].filter(card => isGameMature(card))).toHaveLength(0)
  })

  it('Vorziehen: tägliches Wiederholen macht nicht schneller reif als der Plan und zahlt nur fällige Abrufe', () => {
    const daily: GameReviewInput[] = []
    for (let day = 0; day < 40; day += 1) {
      daily.push({ reviewKey: `p${day}`, cardId: 'c1', rating: 4, timeMs: 3000, timestamp: T0 + day * DAY })
    }
    const onSchedule = diligentReviews(1, 40).map(review => ({ ...review, reviewKey: `s-${review.reviewKey}` }))
    const dailyReplay = buildGameMemoryReplay(daily)
    const scheduleReplay = buildGameMemoryReplay(onSchedule)
    expect(dailyReplay.cards.get('c1')?.peakStability ?? 0).toBeLessThanOrEqual((scheduleReplay.cards.get('c0')?.peakStability ?? 0) + 1e-9)
    const payingDays = dailyReplay.goldInputs.filter(input => input.wasDue).length
    expect(payingDays).toBeLessThan(10)
    expect(payingDays).toBeLessThan(daily.length / 3)
  })

  it('Easy wirkt im Spielgedächtnis wie Good', () => {
    const make = (rating: 3 | 4): GameReviewInput[] => [
      { reviewKey: 'a', cardId: 'c1', rating, timeMs: 3000, timestamp: T0 },
      { reviewKey: 'b', cardId: 'c1', rating, timeMs: 3000, timestamp: T0 + 10 * DAY },
    ]
    const good = buildGameMemoryReplay(make(3)).cards.get('c1')
    const easy = buildGameMemoryReplay(make(4)).cards.get('c1')
    expect(easy?.stability).toBeCloseTo(good?.stability ?? -1, 6)
  })

  it('deckelt neue Karten pro Lerntag', () => {
    const reviews: GameReviewInput[] = Array.from({ length: 30 }, (_, i) => ({
      reviewKey: `n${i}`, cardId: `n${i}`, rating: 3 as const, timeMs: 3000, timestamp: T0 + i * 1000,
    }))
    const replay = buildGameMemoryReplay(reviews)
    const paying = replay.goldInputs.filter(input => input.wasDue).length
    expect(paying).toBe(GAME_NEW_CARD_DAILY_CAP)
  })

  it('Hochwasser: ein späterer Lapse nimmt die erreichte Reife nicht weg und wird beim Heilen belohnt', () => {
    const reviews: GameReviewInput[] = []
    let card = createEmptyCard(new Date(T0))
    let when = T0
    for (let i = 0; i < 8; i += 1) {
      reviews.push({ reviewKey: `h${i}`, cardId: 'c1', rating: 3, timeMs: 4000, timestamp: when })
      card = scheduler.next(card, new Date(when), FsrsRating.Good as Grade).card
      when = card.due.getTime()
    }
    const peakBefore = buildGameMemoryReplay(reviews).cards.get('c1')?.peakStability ?? 0
    expect(peakBefore).toBeGreaterThanOrEqual(21)
    reviews.push({ reviewKey: 'lapse', cardId: 'c1', rating: 1, timeMs: 5000, timestamp: when })
    const after = buildGameMemoryReplay(reviews).cards.get('c1')
    expect(after?.peakStability).toBeCloseTo(peakBefore, 6)
    expect(after?.lapses).toBe(1)
  })
})
