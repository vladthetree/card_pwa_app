import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CardRecord, DeckRecord, ProfileRecord, ReviewRecord } from '../../db'

type CardGetterMock = ReturnType<typeof vi.fn<() => Promise<CardRecord | undefined>>>

const state = vi.hoisted(() => ({
  savedCards: [] as CardRecord[],
  savedDecks: [] as DeckRecord[],
  savedReviews: [] as Omit<ReviewRecord, 'id'>[],
  responses: [] as unknown[],
  authToken: '',
  profileRecord: null as ProfileRecord | null,
}))

function mockResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as Response
}

const mockDb = vi.hoisted(() => ({
  decks: {
    filter: vi.fn(() => ({ count: async () => 0 })),
    clear: vi.fn(async () => {}),
    bulkPut: vi.fn(async (decks: DeckRecord[]) => {
      state.savedDecks = decks
    }),
    toArray: vi.fn(async () => []),
  },
  cards: {
    filter: vi.fn(() => ({ count: async () => 0 })),
    clear: vi.fn(async () => {}),
    bulkPut: vi.fn(async (cards: CardRecord[]) => {
      state.savedCards = cards
    }),
    toArray: vi.fn(async () => []),
    get: vi.fn<() => Promise<CardRecord | undefined>>(async () => undefined),
    put: vi.fn(async () => {}),
    update: vi.fn(async () => 1),
  },
  reviews: {
    each: vi.fn(async () => {}),
    bulkDelete: vi.fn(async () => {}),
    bulkAdd: vi.fn(async (reviews: Omit<ReviewRecord, 'id'>[]) => {
      state.savedReviews = reviews
    }),
    where: vi.fn(() => ({ equals: vi.fn(() => ({ delete: vi.fn(async () => 0) })) })),
    delete: vi.fn(async () => 1),
    add: vi.fn(async () => 1),
    clear: vi.fn(async () => {}),
  },
  profile: {
    get: vi.fn(async () => state.profileRecord),
  },
  transaction: vi.fn(async (_mode: string, ...args: unknown[]) => {
    const callback = args[args.length - 1]
    if (typeof callback === 'function') {
      await callback()
    }
  }),
}))

vi.mock('../../db', () => ({
  db: mockDb,
}))

const fetchWithTimeoutMock = vi.fn(async () => {
  const next = state.responses.shift()
  return mockResponse(next)
})

vi.mock('../../services/syncConfig', () => ({
  getSyncBaseEndpoint: () => 'http://localhost:8787/sync',
  getOrCreateSyncClientId: () => 'test-client',
  makeOpId: () => 'op-id',
  fetchWithTimeout: fetchWithTimeoutMock,
  getSyncConfig: () => ({
    enabled: true,
    endpoint: 'http://localhost:8787/sync',
    mode: 'local' as const,
    authToken: state.authToken,
  }),
  makeAuthHeaders: (config: { authToken: string }) => {
    if (!config.authToken) return {}
    return { Authorization: `Bearer ${config.authToken}` }
  },
}))

vi.mock('../../services/syncQueue', () => ({
  flushSyncQueue: vi.fn(async () => ({ processed: 0, pending: 0 })),
  getSyncQueuePendingCount: vi.fn(async () => 0),
}))

describe('syncPull normalization', () => {
  beforeEach(() => {
    const storage = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value)
        },
        removeItem: (key: string) => {
          storage.delete(key)
        },
      },
      configurable: true,
    })

    state.savedCards = []
    state.savedDecks = []
    state.savedReviews = []
    state.responses = []
    state.authToken = ''
    state.profileRecord = null
    fetchWithTimeoutMock.mockClear()
    mockDb.cards.get.mockReset()
    mockDb.cards.get.mockImplementation(async () => undefined)
    mockDb.cards.update.mockClear()
    mockDb.reviews.bulkAdd.mockClear()
    mockDb.reviews.add.mockClear()
    mockDb.reviews.delete.mockClear()
    vi.restoreAllMocks()
  })

  it('adds Authorization header when optional sync token is configured', async () => {
    state.authToken = 'secret-token'
    state.responses = [
      { ok: true, needsSnapshot: false, serverCursor: 0 },
      { ok: true, operations: [], nextCursor: 0, hasMore: false },
    ]

    const { pullAndApplySyncDeltas } = await import('../../services/syncPull')
    await pullAndApplySyncDeltas()

    const handshakeCall = fetchWithTimeoutMock.mock.calls[0] as unknown as [string, { headers?: Record<string, string> }]
    expect(handshakeCall[1].headers).toMatchObject({ Authorization: 'Bearer secret-token' })
  })

  it('defaults algorithm to sm2 unless explicitly fsrs', async () => {
    const now = Date.now()
    state.responses = [
      { ok: true, needsSnapshot: true },
      {
        ok: true,
        cursor: 5,
        decks: [],
        cards: [
          {
            id: 'c-1',
            noteId: 'n-1',
            deckId: 'd-1',
            front: 'Q',
            back: 'A',
            type: 2,
            queue: 2,
            due: Math.floor(now / 86_400_000),
            stability: 4.5,
            difficulty: 5.5,
            createdAt: now,
          },
          {
            id: 'c-2',
            noteId: 'n-2',
            deckId: 'd-1',
            front: 'Q2',
            back: 'A2',
            type: 2,
            queue: 2,
            due: Math.floor(now / 86_400_000),
            algorithm: 'fsrs',
            createdAt: now,
          },
        ],
      },
      { ok: true, operations: [], nextCursor: 5, hasMore: false },
    ]

    const { pullAndApplySyncDeltas } = await import('../../services/syncPull')
    await pullAndApplySyncDeltas()

    expect(state.savedCards).toHaveLength(2)
    expect(state.savedCards[0].algorithm).toBe('sm2')
    expect(state.savedCards[1].algorithm).toBe('fsrs')
  })

  it('imports server snapshot review history for incoming cards', async () => {
    const now = Date.now()
    state.responses = [
      { ok: true, needsSnapshot: true },
      {
        ok: true,
        cursor: 6,
        decks: [],
        cards: [
          {
            id: 'c-history',
            noteId: 'n-history',
            deckId: 'd-1',
            front: 'Q',
            back: 'A',
            type: 2,
            queue: 2,
            due: Math.floor(now / 86_400_000),
            createdAt: now,
          },
        ],
        reviews: [
          {
            cardId: 'c-history',
            rating: 4,
            timeMs: 1234,
            timestamp: now,
          },
        ],
      },
      { ok: true, operations: [], nextCursor: 6, hasMore: false },
    ]

    const { pullAndApplySyncDeltas } = await import('../../services/syncPull')
    await pullAndApplySyncDeltas()

    expect(mockDb.reviews.bulkAdd).toHaveBeenCalledWith([
      expect.objectContaining({
        cardId: 'c-history',
        rating: 4,
        timeMs: 1234,
        timestamp: now,
      }),
    ])
  })

  it('syncs all snapshot decks even when stale profile deck selection exists', async () => {
    const now = Date.now()
    state.profileRecord = {
      id: 'current',
      mode: 'linked',
      deviceId: 'device-1',
      userId: 'profile-1',
      profileToken: 'dt_profile',
      endpoint: 'http://localhost:8787',
      createdAt: now,
      updatedAt: now,
    }
    localStorage.setItem('card-pwa-profile-selected-decks:profile-1', JSON.stringify(['stale-deck-id']))

    state.responses = [
      { ok: true, needsSnapshot: true },
      {
        ok: true,
        cursor: 7,
        decks: [
          { id: 'deck-keep', name: 'Keep', source: 'manual', createdAt: now },
          { id: 'deck-skip', name: 'Skip', source: 'manual', createdAt: now },
        ],
        cards: [
          {
            id: 'card-keep',
            noteId: 'note-keep',
            deckId: 'deck-keep',
            front: 'Q keep',
            back: 'A keep',
            tags: [],
            extra: {},
            type: 0,
            queue: 0,
            due: 0,
            createdAt: now,
          },
          {
            id: 'card-skip',
            noteId: 'note-skip',
            deckId: 'deck-skip',
            front: 'Q skip',
            back: 'A skip',
            tags: [],
            extra: {},
            type: 0,
            queue: 0,
            due: 0,
            createdAt: now,
          },
        ],
        reviews: [
          { cardId: 'card-keep', rating: 4, timeMs: 100, timestamp: now },
          { cardId: 'card-skip', rating: 1, timeMs: 200, timestamp: now },
        ],
      },
      { ok: true, operations: [], nextCursor: 7, hasMore: false },
    ]

    const { pullAndApplySyncDeltas } = await import('../../services/syncPull')
    await pullAndApplySyncDeltas()

    expect(state.savedDecks.map(deck => deck.id)).toEqual(['deck-keep', 'deck-skip'])
    expect(state.savedCards.map(card => card.id)).toEqual(['card-keep', 'card-skip'])
    expect(state.savedReviews.map(review => review.cardId)).toEqual(['card-keep', 'card-skip'])
  })

  it('forces tombstone when deletedAt is present without isDeleted', async () => {
    const now = Date.now()
    state.responses = [
      { ok: true, needsSnapshot: true },
      {
        ok: true,
        cursor: 7,
        decks: [],
        cards: [
          {
            id: 'c-del',
            noteId: 'n-del',
            deckId: 'd-1',
            front: 'Q',
            back: 'A',
            type: 2,
            queue: 2,
            due: Math.floor(now / 86_400_000),
            deletedAt: now,
            createdAt: now,
          },
        ],
      },
      { ok: true, operations: [], nextCursor: 7, hasMore: false },
    ]

    const { pullAndApplySyncDeltas } = await import('../../services/syncPull')
    await pullAndApplySyncDeltas()

    expect(state.savedCards).toHaveLength(1)
    expect(state.savedCards[0].isDeleted).toBe(true)
    expect(state.savedCards[0].deletedAt).toBe(now)
  })

  it('normalizes invalid type and queue and ensures dueAt fallback exists', async () => {
    const now = Date.now()
    state.responses = [
      { ok: true, needsSnapshot: true },
      {
        ok: true,
        cursor: 9,
        decks: [],
        cards: [
          {
            id: 'c-legacy',
            noteId: 'n-legacy',
            deckId: 'd-1',
            front: 'Q',
            back: 'A',
            type: 99,
            queue: -99,
            createdAt: now,
          },
        ],
      },
      { ok: true, operations: [], nextCursor: 9, hasMore: false },
    ]

    const { pullAndApplySyncDeltas } = await import('../../services/syncPull')
    await pullAndApplySyncDeltas()

    expect(state.savedCards).toHaveLength(1)
    expect(state.savedCards[0].type).toBe(3)
    expect(state.savedCards[0].queue).toBe(-1)
    expect(Number.isFinite(state.savedCards[0].dueAt)).toBe(true)
  })

  it('normalizes card.update payloads before applying them locally', async () => {
    const now = Date.now()
    ;(mockDb.cards.get as CardGetterMock).mockResolvedValueOnce({ id: 'c-upd', createdAt: now - 1000, updatedAt: now - 1000 } as CardRecord)

    state.responses = [
      { ok: true, needsSnapshot: false, serverCursor: 0 },
      {
        ok: true,
        operations: [
          {
            id: 10,
            opId: 'op-update-1',
            type: 'card.update',
            payload: {
              cardId: 'c-upd',
              updates: {
                type: 99,
                queue: -99,
                due: 123,
                algorithm: 'legacy-value',
                deleted_at: now,
                updatedAt: now,
              },
            },
          },
        ],
        nextCursor: 10,
        hasMore: false,
      },
    ]

    const { pullAndApplySyncDeltas } = await import('../../services/syncPull')
    await pullAndApplySyncDeltas()

    expect(mockDb.cards.update).toHaveBeenCalledWith(
      'c-upd',
      expect.objectContaining({
        type: 3,
        queue: -1,
        due: 123,
        dueAt: 123 * 86_400_000,
        algorithm: 'sm2',
        isDeleted: true,
        deletedAt: now,
      })
    )
  })

  it('does not mark active snapshot card as deleted when deletedAt is null', async () => {
    const now = Date.now()
    state.responses = [
      { ok: true, needsSnapshot: true },
      {
        ok: true,
        cursor: 11,
        decks: [],
        cards: [
          {
            id: 'c-active-null-del',
            noteId: 'n-active',
            deckId: 'd-1',
            front: 'Q',
            back: 'A',
            type: 2,
            queue: 2,
            due: Math.floor(now / 86_400_000),
            deletedAt: null,
            isDeleted: false,
            createdAt: now,
          },
        ],
      },
      { ok: true, operations: [], nextCursor: 11, hasMore: false },
    ]

    const { pullAndApplySyncDeltas } = await import('../../services/syncPull')
    await pullAndApplySyncDeltas()

    expect(state.savedCards).toHaveLength(1)
    expect(state.savedCards[0].isDeleted).toBe(false)
    expect(state.savedCards[0].deletedAt).toBeUndefined()
  })

  it('does not tombstone card.update when deleted_at is explicitly null', async () => {
    const now = Date.now()
    ;(mockDb.cards.get as CardGetterMock).mockResolvedValueOnce({ id: 'c-upd-null-del', createdAt: now - 1000, updatedAt: now - 1000 } as CardRecord)

    state.responses = [
      { ok: true, needsSnapshot: false, serverCursor: 0 },
      {
        ok: true,
        operations: [
          {
            id: 12,
            opId: 'op-update-null-del',
            type: 'card.update',
            payload: {
              cardId: 'c-upd-null-del',
              updates: {
                type: 2,
                queue: 2,
                due: 321,
                deleted_at: null,
                is_deleted: false,
                updatedAt: now,
              },
            },
          },
        ],
        nextCursor: 12,
        hasMore: false,
      },
    ]

    const { pullAndApplySyncDeltas } = await import('../../services/syncPull')
    await pullAndApplySyncDeltas()

    expect(mockDb.cards.update).toHaveBeenCalledWith(
      'c-upd-null-del',
      expect.objectContaining({
        type: 2,
        queue: 2,
        due: 321,
        dueAt: 321 * 86_400_000,
        isDeleted: false,
      })
    )
    const lastCallUnknown = mockDb.cards.update.mock.calls[mockDb.cards.update.mock.calls.length - 1] as unknown
    const lastUpdate = Array.isArray(lastCallUnknown)
      ? (lastCallUnknown[1] as Partial<CardRecord> | undefined)
      : undefined
    expect(lastUpdate?.deletedAt).toBeUndefined()
  })

  it('does not request snapshot when handshake asks for client bootstrap upload', async () => {
    state.responses = [
      { ok: true, needsClientBootstrapUpload: true, needsSnapshot: true },
      { ok: true, serverCursor: 42 },
      { ok: true, operations: [], nextCursor: 42, hasMore: false },
    ]

    const { pullAndApplySyncDeltas } = await import('../../services/syncPull')
    await pullAndApplySyncDeltas()

    const calledUrls = fetchWithTimeoutMock.mock.calls.map(call => String((call as unknown[])[0]))
    expect(calledUrls.some(url => url.includes('/snapshot'))).toBe(false)
    expect(calledUrls.some(url => url.includes('/bootstrap/upload'))).toBe(true)
  })

  it('skips review write when referenced card is missing locally', async () => {
    state.responses = [
      { ok: true, needsSnapshot: false, serverCursor: 0 },
      {
        ok: true,
        operations: [
          {
            id: 20,
            opId: 'op-review-missing-card',
            type: 'review',
            payload: {
              cardId: 'missing-card',
              rating: 3,
              timeMs: 1234,
              timestamp: Date.now(),
              updated: { type: 2, queue: 2, due: 1 },
            },
          },
        ],
        nextCursor: 20,
        hasMore: false,
      },
    ]

    const { pullAndApplySyncDeltas } = await import('../../services/syncPull')
    await pullAndApplySyncDeltas()

    expect(mockDb.cards.update).not.toHaveBeenCalledWith('missing-card', expect.anything())
    expect(mockDb.reviews.add).not.toHaveBeenCalled()
  })

  it('uses reviewId from review.undo payload for deletion', async () => {
    const now = Date.now()
    ;(mockDb.cards.get as CardGetterMock).mockResolvedValueOnce({ id: 'c-undo', createdAt: now - 1000, updatedAt: now - 1000 } as CardRecord)

    state.responses = [
      { ok: true, needsSnapshot: false, serverCursor: 0 },
      {
        ok: true,
        operations: [
          {
            id: 21,
            opId: 'op-review-undo',
            type: 'review.undo',
            payload: {
              cardId: 'c-undo',
              reviewId: 77,
              restored: { type: 2, queue: 2, due: 1, updatedAt: now },
            },
          },
        ],
        nextCursor: 21,
        hasMore: false,
      },
    ]

    const { pullAndApplySyncDeltas } = await import('../../services/syncPull')
    await pullAndApplySyncDeltas()

    expect(mockDb.cards.update).toHaveBeenCalledWith('c-undo', expect.objectContaining({ type: 2, queue: 2 }))
    expect(mockDb.reviews.delete).toHaveBeenCalledWith(77)
  })

  it('prefers higher incoming reps over a newer local timestamp for card.update', async () => {
    const now = Date.now()
    ;(mockDb.cards.get as CardGetterMock).mockResolvedValueOnce({
      id: 'c-reps-win',
      createdAt: now - 5000,
      updatedAt: now,
      reps: 5,
    } as CardRecord)

    state.responses = [
      { ok: true, needsSnapshot: false, serverCursor: 0 },
      {
        ok: true,
        operations: [
          {
            id: 22,
            opId: 'op-update-reps-win',
            type: 'card.update',
            payload: {
              cardId: 'c-reps-win',
              timestamp: now - 1000,
              updates: {
                reps: 6,
                updatedAt: now - 1000,
                due: 55,
              },
            },
          },
        ],
        nextCursor: 22,
        hasMore: false,
      },
    ]

    const { pullAndApplySyncDeltas } = await import('../../services/syncPull')
    await pullAndApplySyncDeltas()

    expect(mockDb.cards.update).toHaveBeenCalledWith(
      'c-reps-win',
      expect.objectContaining({ reps: 6, due: 55, dueAt: 55 * 86_400_000 })
    )
  })

  it('applies card.schedule.forceTomorrow as a card update payload', async () => {
    const now = Date.now()
    ;(mockDb.cards.get as CardGetterMock).mockResolvedValueOnce({
      id: 'c-force-tomorrow',
      createdAt: now - 5000,
      updatedAt: now - 2000,
      reps: 2,
    } as CardRecord)

    state.responses = [
      { ok: true, needsSnapshot: false, serverCursor: 0 },
      {
        ok: true,
        operations: [
          {
            id: 25,
            opId: 'op-force-tomorrow',
            type: 'card.schedule.forceTomorrow',
            payload: {
              cardId: 'c-force-tomorrow',
              timestamp: now,
              update: {
                type: 2,
                queue: 2,
                due: 99,
                dueAt: 99 * 86_400_000,
                updatedAt: now,
              },
            },
          },
        ],
        nextCursor: 25,
        hasMore: false,
      },
    ]

    const { pullAndApplySyncDeltas } = await import('../../services/syncPull')
    await pullAndApplySyncDeltas()

    expect(mockDb.cards.update).toHaveBeenCalledWith(
      'c-force-tomorrow',
      expect.objectContaining({ type: 2, queue: 2, due: 99, dueAt: 99 * 86_400_000 })
    )
  })

  it('uses timestamp as tiebreaker when reps are equal', async () => {
    const now = Date.now()
    ;(mockDb.cards.get as CardGetterMock)
      .mockResolvedValueOnce({
        id: 'c-ts-skip',
        createdAt: now - 5000,
        updatedAt: now,
        reps: 5,
      } as CardRecord)
      .mockResolvedValueOnce({
        id: 'c-ts-apply',
        createdAt: now - 5000,
        updatedAt: now - 2000,
        reps: 5,
      } as CardRecord)

    state.responses = [
      { ok: true, needsSnapshot: false, serverCursor: 0 },
      {
        ok: true,
        operations: [
          {
            id: 23,
            opId: 'op-update-ts-skip',
            type: 'card.update',
            payload: {
              cardId: 'c-ts-skip',
              timestamp: now - 1000,
              updates: {
                reps: 5,
                updatedAt: now - 1000,
                due: 70,
              },
            },
          },
          {
            id: 24,
            opId: 'op-update-ts-apply',
            type: 'card.update',
            payload: {
              cardId: 'c-ts-apply',
              timestamp: now,
              updates: {
                reps: 5,
                updatedAt: now,
                due: 71,
              },
            },
          },
        ],
        nextCursor: 24,
        hasMore: false,
      },
    ]

    const { pullAndApplySyncDeltas } = await import('../../services/syncPull')
    await pullAndApplySyncDeltas()

    expect(mockDb.cards.update).not.toHaveBeenCalledWith('c-ts-skip', expect.anything())
    expect(mockDb.cards.update).toHaveBeenCalledWith(
      'c-ts-apply',
      expect.objectContaining({ reps: 5, due: 71, dueAt: 71 * 86_400_000 })
    )
  })
})
