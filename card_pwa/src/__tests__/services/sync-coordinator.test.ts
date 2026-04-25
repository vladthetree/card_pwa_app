import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  syncActive: true,
  reachable: true,
  flushPending: 0,
  flushProcessed: 0,
}))

const flushSyncQueueMock = vi.hoisted(() => vi.fn(async () => ({ processed: state.flushProcessed, pending: state.flushPending })))
const pullAndApplySyncDeltasMock = vi.hoisted(() => vi.fn(async () => {}))
const checkSyncServerReachableMock = vi.hoisted(() => vi.fn(async () => state.reachable))
const startSyncReachabilityRuntimeMock = vi.hoisted(() => vi.fn(() => vi.fn()))

vi.mock('../../services/syncConfig', () => ({
  isSyncActive: () => state.syncActive,
  SYNC_RUNTIME_CONFIG_CHANGED_EVENT: 'card-pwa:sync-runtime-config-changed',
}))

vi.mock('../../services/syncReachability', () => ({
  checkSyncServerReachable: checkSyncServerReachableMock,
  startSyncReachabilityRuntime: startSyncReachabilityRuntimeMock,
}))

vi.mock('../../services/syncQueue', () => ({
  flushSyncQueue: flushSyncQueueMock,
}))

vi.mock('../../services/syncPull', () => ({
  pullAndApplySyncDeltas: pullAndApplySyncDeltasMock,
}))

describe('syncCoordinator', () => {
  let windowListeners: Record<string, EventListener> = {}

  beforeEach(() => {
    vi.resetModules()
    state.syncActive = true
    state.reachable = true
    state.flushPending = 0
    state.flushProcessed = 0
    flushSyncQueueMock.mockClear()
    pullAndApplySyncDeltasMock.mockClear()
    checkSyncServerReachableMock.mockClear()
    startSyncReachabilityRuntimeMock.mockClear()
    windowListeners = {}

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
        addEventListener: vi.fn((type: string, listener: EventListener) => {
          windowListeners[type] = listener
        }),
        removeEventListener: vi.fn((type: string) => {
          delete windowListeners[type]
        }),
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
    state.reachable = false

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
    expect(checkSyncServerReachableMock).toHaveBeenCalledWith(true)
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

  it('requests a sync cycle when runtime config changes while online', async () => {
    const { setupUnifiedSyncRuntime } = await import('../../services/syncCoordinator')
    const dispose = setupUnifiedSyncRuntime()

    const listener = windowListeners['card-pwa:sync-runtime-config-changed']
    expect(listener).toBeTypeOf('function')

    listener(new Event('card-pwa:sync-runtime-config-changed'))
    await Promise.resolve()
    await Promise.resolve()

    expect(checkSyncServerReachableMock).toHaveBeenCalled()
    expect(flushSyncQueueMock).toHaveBeenCalledWith({ limit: 200 })
    dispose()
  })
})
