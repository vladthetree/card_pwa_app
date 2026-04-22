import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  healthOk: true,
  syncActive: true,
  flushPending: 0,
  flushProcessed: 0,
}))

const fetchWithTimeoutMock = vi.hoisted(() => vi.fn(async () => ({ ok: state.healthOk }) as Response))
const flushSyncQueueMock = vi.hoisted(() => vi.fn(async () => ({ processed: state.flushProcessed, pending: state.flushPending })))
const pullAndApplySyncDeltasMock = vi.hoisted(() => vi.fn(async () => {}))

vi.mock('../../services/syncConfig', () => ({
  fetchWithTimeout: fetchWithTimeoutMock,
  getSyncBaseEndpoint: () => 'http://localhost:8787/sync',
  isSyncActive: () => state.syncActive,
}))

vi.mock('../../services/syncQueue', () => ({
  flushSyncQueue: flushSyncQueueMock,
}))

vi.mock('../../services/syncPull', () => ({
  pullAndApplySyncDeltas: pullAndApplySyncDeltasMock,
}))

describe('syncCoordinator', () => {
  beforeEach(() => {
    vi.resetModules()
    state.healthOk = true
    state.syncActive = true
    state.flushPending = 0
    state.flushProcessed = 0
    fetchWithTimeoutMock.mockClear()
    flushSyncQueueMock.mockClear()
    pullAndApplySyncDeltasMock.mockClear()

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        onLine: true,
        serviceWorker: {
          controller: { postMessage: vi.fn() },
          ready: Promise.resolve({ active: { postMessage: vi.fn() } }),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      },
      configurable: true,
    })

    Object.defineProperty(globalThis, 'window', {
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        setInterval: vi.fn(() => 1),
        clearInterval: vi.fn(),
      },
      configurable: true,
    })

    Object.defineProperty(globalThis, 'document', {
      value: {
        visibilityState: 'visible',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      configurable: true,
    })
  })

  it('returns false and does not flush when the server is unreachable', async () => {
    state.healthOk = false

    const { runSyncCycleNow } = await import('../../services/syncCoordinator')
    const result = await runSyncCycleNow({ force: true })

    expect(result).toBe(false)
    expect(flushSyncQueueMock).not.toHaveBeenCalled()
    expect(pullAndApplySyncDeltasMock).not.toHaveBeenCalled()
  })

  it('flushes and pulls when the server is reachable', async () => {
    const { runSyncCycleNow } = await import('../../services/syncCoordinator')
    const result = await runSyncCycleNow({ force: true })

    expect(result).toBe(true)
    expect(flushSyncQueueMock).toHaveBeenCalledWith({ limit: 200 })
    expect(pullAndApplySyncDeltasMock).toHaveBeenCalledTimes(1)
  })

  it('skips pull when flush reports pending work remaining', async () => {
    state.flushPending = 3

    const { runSyncCycleNow } = await import('../../services/syncCoordinator')
    const result = await runSyncCycleNow({ force: true })

    expect(result).toBe(true)
    expect(flushSyncQueueMock).toHaveBeenCalledTimes(1)
    expect(pullAndApplySyncDeltasMock).not.toHaveBeenCalled()
  })
})
