import { describe, expect, it } from 'vitest'
import type { CardRecord, DeckRecord, ReviewRecord } from '../../db'
import { parseJsonBackupFile } from '../../utils/import/jsonBackupImporter'

function card(id: string): CardRecord {
  return {
    id,
    noteId: 'note-ztna',
    deckId: 'sy0-701-acronyms-bonus',
    front: 'ZTNA?',
    back: 'Zero Trust Network Access',
    tags: ['Acronyms'],
    extra: { acronym: 'ZTNA', examples: '', port: '', protocol: '' },
    type: 2,
    queue: 2,
    due: 20_000,
    interval: 10,
    factor: 2500,
    reps: 4,
    lapses: 1,
    createdAt: 1,
  }
}

describe('JSON backup restore and learning-plan identity', () => {
  it('übernimmt Card.id, Deck-ID, Scheduling und Review-Verknüpfung unverändert', async () => {
    const cardId = '1781206500017'
    const deck: DeckRecord = {
      id: 'sy0-701-acronyms-bonus',
      name: 'Acronym-Bonus (ABCD + PBQ)',
      source: 'system',
      createdAt: 1,
    }
    const review: ReviewRecord = {
      cardId,
      rating: 4,
      timeMs: 1000,
      timestamp: 2,
    }
    const payload = {
      meta: {
        app: 'card-pwa',
        version: 3,
        exportedAt: 3,
        tableCounts: { decks: 1, cards: 1, reviews: 1 },
      },
      settings: null,
      data: {
        decks: [deck],
        cards: [card(cardId)],
        reviews: [review],
        videoNotes: [],
      },
    }
    const file = {
      name: 'backup.json',
      text: async () => JSON.stringify(payload),
    } as File

    const restored = await parseJsonBackupFile(file, 'de')

    expect(restored.parsed.cards[0]).toMatchObject({
      id: cardId,
      deckId: 'sy0-701-acronyms-bonus',
      reps: 4,
      interval: 10,
    })
    expect(restored.payload.data.reviews[0].cardId).toBe(cardId)
  })
})
