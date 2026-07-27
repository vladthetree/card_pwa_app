/**
 * AI_CONTEXT: Verifies that permanently failing queue records leave the active
 * pending count, so pull sync is not blocked forever after retry exhaustion.
 */
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  online: true,
  fetchWithTimeout: vi.fn(async () => ({ ok: false, json: async () => ({ ok: false, error: 'server_error' }) }) as Response),
  opCounter: 0,
}))

const mockedDb = vi.hoisted(() => ({
  syncOutbox: {
    orderBy: vi.fn(() => ({
      limit: vi.fn(() => ({
        toArray: vi.fn(async () => []),
      })),
    })),
    delete: vi.fn(async () => undefined),
    clear: vi.fn(async () => undefined),
    count: vi.fn(async () => 0),
  },
  cards: {
    get: vi.fn(async () => undefined),
    toArray: vi.fn(async () => []),
  },
  decks: {
    filter: vi.fn(() => ({
      toArray: vi.fn(async () => []),
    })),
  },
}))

vi.mock('../../db', () => ({
  db: mockedDb,
}))

vi.mock('../../env', () => ({
  supportsServiceWorker: () => false,
}))

vi.mock('../../services/syncConfig', () => ({
  SYNC_MAX_RETRIES: 2,
  buildAuthHeaders: () => ({}),
  buildOpId: () => `op-${++state.opCounter}`,
  fetchWithTimeout: state.fetchWithTimeout,
  getOrCreateSyncClientId: () => 'client-1',
  getSyncBaseEndpoint: () => 'http://sync.test/sync',
  getSyncConfig: () => ({ enabled: true }),
  isSyncActive: () => true,
}))

vi.mock('../../services/syncedDeckScope', () => ({
  getSelectedDeckFilter: vi.fn(async () => null),
}))

vi.mock('../../utils/reviewDecks', () => ({
  isReviewDeckId: () => false,
  readReviewDecksEnabledFromStorage: () => true,
}))

describe('syncQueue dead-letter pending count', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.restoreAllMocks()
    state.online = true
    state.fetchWithTimeout.mockClear()
    state.opCounter = 0
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: state.online },
      configurable: true,
    })
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('card-pwa-sync-queue')
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      request.onblocked = () => resolve()
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not count retry-exhausted operations as pending work', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000)
    const {
      enqueueSyncOperation,
      flushSyncQueue,
      getSyncQueueDiagnostics,
      getSyncQueuePendingCount,
    } = await import('../../services/syncQueue')

    await enqueueSyncOperation('examDate.upsert', { examDateIso: '2026-12-31', updatedAt: 1000 })
    expect(await getSyncQueuePendingCount()).toBe(1)

    const first = await flushSyncQueue({ limit: 10 })
    expect(first.pending).toBe(1)

    nowSpy.mockReturnValue(10_000)
    const second = await flushSyncQueue({ limit: 10 })
    expect(second.pending).toBe(0)
    expect(await getSyncQueuePendingCount()).toBe(0)
    expect(await getSyncQueueDiagnostics()).toMatchObject({
      pendingCount: 0,
      deadLetterCount: 1,
      deferredCount: 0,
      outboxCount: 0,
    })
    expect(state.fetchWithTimeout).toHaveBeenCalledTimes(2)
  })

  it('can release dead-letter operations for another retry', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000)
    const {
      enqueueSyncOperation,
      flushSyncQueue,
      getSyncQueueDiagnostics,
      getSyncQueuePendingCount,
      releaseDeadLetterSyncQueue,
    } = await import('../../services/syncQueue')

    await enqueueSyncOperation('examDate.upsert', { examDateIso: '2026-12-31', updatedAt: 1000 })
    await flushSyncQueue({ limit: 10 })

    nowSpy.mockReturnValue(10_000)
    await flushSyncQueue({ limit: 10 })
    expect(await getSyncQueuePendingCount()).toBe(0)

    nowSpy.mockReturnValue(20_000)
    await expect(releaseDeadLetterSyncQueue()).resolves.toBe(1)

    expect(await getSyncQueueDiagnostics()).toMatchObject({
      pendingCount: 1,
      deadLetterCount: 0,
    })
  })
})
