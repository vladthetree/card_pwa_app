import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  endpoint: 'http://localhost:8787/sync',
  syncActive: true,
  reachable: true,
}))

const fetchWithTimeoutMock = vi.hoisted(() => vi.fn(async () => ({ ok: state.reachable }) as Response))

vi.mock('../../services/syncConfig', () => ({
  SYNC_RUNTIME_CONFIG_CHANGED_EVENT: 'card-pwa:sync-runtime-config-changed',
  fetchWithTimeout: fetchWithTimeoutMock,
  getSyncBaseEndpoint: () => state.endpoint,
  isSyncActive: () => state.syncActive,
}))

describe('syncReachability', () => {
  beforeEach(() => {
    vi.resetModules()
    state.endpoint = 'http://localhost:8787/sync'
    state.syncActive = true
    state.reachable = true
    fetchWithTimeoutMock.mockClear()

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
        location: { origin: 'http://app.local' },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        setInterval: vi.fn(() => 1),
        clearInterval: vi.fn(),
        dispatchEvent: vi.fn(),
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

  it('returns false without fetching when offline or sync is inactive', async () => {
    const { checkSyncServerReachable } = await import('../../services/syncReachability')

    Object.defineProperty(globalThis, 'navigator', {
      value: { ...navigator, onLine: false },
      configurable: true,
    })

    await expect(checkSyncServerReachable(true)).resolves.toBe(false)
    expect(fetchWithTimeoutMock).not.toHaveBeenCalled()

    state.syncActive = false
    Object.defineProperty(globalThis, 'navigator', {
      value: { ...navigator, onLine: true },
      configurable: true,
    })

    await expect(checkSyncServerReachable(true)).resolves.toBe(false)
    expect(fetchWithTimeoutMock).not.toHaveBeenCalled()
  })

  it('builds the health URL and caches successful checks', async () => {
    const { checkSyncServerReachable, getSyncHealthUrl, getSyncReachabilityState } = await import('../../services/syncReachability')

    expect(getSyncHealthUrl()).toBe('http://localhost:8787/health')
    await expect(checkSyncServerReachable(false)).resolves.toBe(true)
    await expect(checkSyncServerReachable(false)).resolves.toBe(true)

    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1)
    expect(getSyncReachabilityState()).toBe('connected')
  })
})
