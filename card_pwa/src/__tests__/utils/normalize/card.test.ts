import { describe, expect, it } from 'vitest'
import { normalizeCard, normalizeCardUpdates } from '../../../utils/normalize/card'

describe('normalizeCard', () => {
  it('normalizes valid card payload and defaults dueAt from due', () => {
    const normalized = normalizeCard({
      id: 'card-1',
      note_id: 'note-1',
      deck_id: 'deck-1',
      front: 'Front',
      back: 'Back',
      due: 123,
      type: 2,
      queue: 2,
      factor: 2600,
      reps: 4,
    })

    expect(normalized).not.toBeNull()
    expect(normalized?.id).toBe('card-1')
    expect(normalized?.noteId).toBe('note-1')
    expect(normalized?.deckId).toBe('deck-1')
    expect(normalized?.dueAt).toBe(123 * 86_400_000)
    expect(normalized?.algorithm).toBe('sm2')
  })

  it('returns null for invalid payloads', () => {
    expect(normalizeCard(null)).toBeNull()
    expect(normalizeCard({ id: 'x' })).toBeNull()
  })
})

describe('normalizeCardUpdates', () => {
  it('normalizes update payload and infers dueAt from due', () => {
    const updates = normalizeCardUpdates({
      due: 7,
      queue: '2',
      algorithm: 'fsrs',
      tags: ['a', 2, null],
      deleted_at: 100,
    })

    expect(updates.due).toBe(7)
    expect(updates.dueAt).toBe(7 * 86_400_000)
    expect(updates.queue).toBe(2)
    expect(updates.algorithm).toBe('fsrs')
    expect(updates.tags).toEqual(['a', '2', 'null'])
    expect(updates.deletedAt).toBe(100)
    expect(updates.isDeleted).toBe(true)
  })
})
