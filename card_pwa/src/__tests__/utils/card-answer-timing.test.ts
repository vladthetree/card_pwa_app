import { describe, expect, it } from 'vitest'
import {
  buildCardSessionAppearance,
  buildFirstCardAnswerTiming,
  normalizeCardAnswerTimingStats,
} from '../../utils/cardAnswerTiming'

describe('card answer timing aggregation', () => {
  it('zählt eine Karte pro Session nur einmal als angezeigt', () => {
    const first = buildCardSessionAppearance(undefined, 'session-a')
    const repeated = buildCardSessionAppearance(first.stats, 'session-a')
    const nextSession = buildCardSessionAppearance(repeated.stats, 'session-b')

    expect(first.changed).toBe(true)
    expect(repeated.changed).toBe(false)
    expect(nextSession.stats.studySessionCount).toBe(2)
  })

  it('speichert nur die erste Antwortzeit pro Karte und Session', () => {
    const wrongFirstAnswer = buildFirstCardAnswerTiming(undefined, 'session-a', 12)
    const repeatedCard = buildFirstCardAnswerTiming(wrongFirstAnswer.stats, 'session-a', 99)
    const nextSession = buildFirstCardAnswerTiming(repeatedCard.stats, 'session-b', 18)

    expect(repeatedCard.changed).toBe(false)
    expect(repeatedCard.stats.answerTimeSampleCount).toBe(1)
    expect(repeatedCard.stats.totalAnswerTimeSeconds).toBe(12)
    expect(nextSession.stats).toMatchObject({
      averageAnswerTimeSeconds: 15,
      totalAnswerTimeSeconds: 30,
      answerTimeSampleCount: 2,
      studySessionCount: 2,
      lastAnsweredSessionRunId: 'session-b',
    })
  })

  it('normalisiert ausschließlich auf ganze, nichtnegative Sekunden', () => {
    const stats = normalizeCardAnswerTimingStats({
      averageAnswerTimeSeconds: 4.4,
      totalAnswerTimeSeconds: 13.6,
      answerTimeSampleCount: 3,
      studySessionCount: -2,
    })

    expect(stats.averageAnswerTimeSeconds).toBe(5)
    expect(stats.totalAnswerTimeSeconds).toBe(14)
    expect(stats.answerTimeSampleCount).toBe(3)
    expect(stats.studySessionCount).toBe(0)
  })
})
