import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockedDb = vi.hoisted(() => {
  const state = {
    records: new Map<string, { id: string; payload: string; updatedAt: number }>(),
  }

  const activeSessions = {
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
  readActiveSession,
  readShuffleSession,
  writeActiveSession,
  writeShuffleSession,
} from '../../db/queries'

describe('session queries', () => {
  beforeEach(() => {
    mockedDb.state.records = new Map()
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
})
