/**
 * AI_CONTEXT: Vitest coverage for sessions; protects db behavior from regressions in the learning PWA.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockedDb = vi.hoisted(() => {
  const state = {
    records: new Map<string, { id: string; payload: string; updatedAt: number }>(),
  }

  const activeSessions = {
    toArray: vi.fn(async () => [...state.records.values()]),
    get: vi.fn(async (id: string) => state.records.get(id)),
    put: vi.fn(async (record: { id: string; payload: string; updatedAt: number }) => {
      state.records.set(record.id, record)
    }),
    delete: vi.fn(async (id: string) => {
      state.records.delete(id)
    }),
  }

  return { state, activeSessions }
})

vi.mock('../../db', () => ({
  db: {
    activeSessions: mockedDb.activeSessions,
  },
}))

import {
  clearActiveSession,
  clearShuffleSession,
  listReservedStudySessionCardIds,
  readActiveSession,
  readShuffleSession,
  writeActiveSession,
  writeShuffleSession,
} from '../../db/queries'
import { buildPersistedStudySession } from '../../services/studySessionPersistence'

describe('session queries', () => {
  beforeEach(() => {
    mockedDb.state.records = new Map()
    mockedDb.activeSessions.toArray.mockClear()
    mockedDb.activeSessions.get.mockClear()
    mockedDb.activeSessions.put.mockClear()
    mockedDb.activeSessions.delete.mockClear()

    const storage = new Map<string, string>()
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => {
            storage.set(key, value)
          },
          removeItem: (key: string) => {
            storage.delete(key)
          },
        },
      },
    })
  })

  it('reads deck sessions from indexeddb first', async () => {
    mockedDb.state.records.set('deck-1', { id: 'deck-1', payload: '{"ok":true}', updatedAt: 1 })

    await expect(readActiveSession('deck-1')).resolves.toBe('{"ok":true}')
  })

  it('migrates legacy localStorage deck sessions on first read', async () => {
    window.localStorage.setItem('card-pwa-study-session', '{"legacy":true}')

    const result = await readActiveSession('deck-1')

    expect(result).toBe('{"legacy":true}')
    expect(mockedDb.activeSessions.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'deck-1',
        payload: '{"legacy":true}',
      }),
    )
    expect(window.localStorage.getItem('card-pwa-study-session')).toBeNull()
  })

  it('writes and clears shuffle sessions under the namespaced session id', async () => {
    await writeShuffleSession('collection-1', '{"shuffle":true}')

    expect(mockedDb.activeSessions.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'shuffle:collection-1',
        payload: '{"shuffle":true}',
      }),
    )

    mockedDb.state.records.set('shuffle:collection-1', {
      id: 'shuffle:collection-1',
      payload: '{"shuffle":true}',
      updatedAt: 1,
    })

    await expect(readShuffleSession('collection-1')).resolves.toBe('{"shuffle":true}')

    await clearShuffleSession('collection-1')
    expect(mockedDb.activeSessions.delete).toHaveBeenCalledWith('shuffle:collection-1')
  })

  it('does not try to migrate legacy localStorage data for shuffle sessions', async () => {
    window.localStorage.setItem('card-pwa-study-session', '{"legacy":true}')

    await expect(readShuffleSession('collection-1')).resolves.toBeNull()
    expect(mockedDb.activeSessions.put).not.toHaveBeenCalled()
    expect(window.localStorage.getItem('card-pwa-study-session')).toBe('{"legacy":true}')
  })

  it('writes and clears regular deck sessions unchanged', async () => {
    await writeActiveSession('deck-1', '{"deck":true}')
    await clearActiveSession('deck-1')

    expect(mockedDb.activeSessions.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'deck-1',
        payload: '{"deck":true}',
      }),
    )
    expect(mockedDb.activeSessions.delete).toHaveBeenCalledWith('deck-1')
  })

  it('reserves cards only from actually running and valid sessions', async () => {
    const now = Date.now()
    const active = buildPersistedStudySession({
      deckId: 'today-package:objective-1',
      cardIds: ['due-1', 'due-2'],
      cardLimit: 20,
      sessionCount: 0,
      isFlipped: false,
      isDone: false,
      lastRating: null,
      lowRatingCounts: {},
      relearnSuccessCounts: {},
      forcedTomorrowCardIds: [],
      againCounts: {},
      startTime: now,
      nowMs: now,
    })
    const done = { ...active, deckId: 'done-session', isDone: true }
    const expired = { ...active, deckId: 'expired-session', expiresAt: now - 1 }
    mockedDb.state.records.set(active.deckId, { id: active.deckId, payload: JSON.stringify(active), updatedAt: now })
    mockedDb.state.records.set(done.deckId, { id: done.deckId, payload: JSON.stringify(done), updatedAt: now })
    mockedDb.state.records.set(expired.deckId, { id: expired.deckId, payload: JSON.stringify(expired), updatedAt: now })

    await expect(listReservedStudySessionCardIds(now)).resolves.toEqual(new Set(['due-1', 'due-2']))
  })
})
