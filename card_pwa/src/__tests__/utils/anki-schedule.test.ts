import { describe, expect, it } from 'vitest'
import { normalizeAnkiSchedule } from '../../utils/import/ankiDatabase'

const DAY_MS = 86_400_000
const collectionCreatedAtMs = 100 * DAY_MS
const nowMs = 1_800_000_000_000

describe('Anki due normalization', () => {
  it('treats review due as days since collection creation', () => {
    const result = normalizeAnkiSchedule({ type: 2, queue: 2, due: 30, interval: 12, collectionCreatedAtMs, nowMs })
    expect(result).toMatchObject({ type: 2, queue: 2, dueAt: 130 * DAY_MS, interval: 12 })
  })

  it('treats intraday learning due as Unix seconds', () => {
    const dueSeconds = 1_700_000_000
    const result = normalizeAnkiSchedule({ type: 1, queue: 1, due: dueSeconds, interval: 0, collectionCreatedAtMs, nowMs })
    expect(result).toMatchObject({ type: 1, queue: 1, dueAt: dueSeconds * 1000, learningStep: 0 })
  })

  it('keeps a new-card queue position immediately studyable instead of treating it as epoch days', () => {
    const result = normalizeAnkiSchedule({ type: 0, queue: 0, due: 1234, interval: 0, collectionCreatedAtMs, nowMs })
    expect(result.type).toBe(0)
    expect(result.dueAt).toBe(nowMs + 1234)
  })
})
