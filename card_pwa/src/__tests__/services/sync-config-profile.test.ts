import { afterEach, describe, expect, it } from 'vitest'
import {
  getSyncBaseEndpoint,
  isSyncActive,
  makeAuthHeaders,
  setCachedProfile,
} from '../../services/syncConfig'

const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')

function installLocalStorage() {
  const storage = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
      removeItem: (key: string) => {
        storage.delete(key)
      },
    },
  })
}

describe('profile-aware sync config', () => {
  afterEach(() => {
    setCachedProfile(null, null)
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', originalLocalStorageDescriptor)
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage')
    }
  })

  it('activates sync from linked profile token and endpoint without legacy settings', () => {
    installLocalStorage()
    setCachedProfile('dt_profile-token', 'http://sync.example.test')

    expect(isSyncActive()).toBe(true)
    expect(getSyncBaseEndpoint()).toBe('http://sync.example.test/sync')
    expect(makeAuthHeaders()).toEqual({ Authorization: 'Bearer dt_profile-token' })
  })

  it('does not activate background sync from a preconfigured endpoint without a profile token', () => {
    installLocalStorage()
    setCachedProfile(null, null)

    expect(isSyncActive()).toBe(false)
    expect(makeAuthHeaders()).toEqual({})
  })

  it('keeps explicit legacy sync active when an auth token is configured', () => {
    installLocalStorage()
    localStorage.setItem('card-pwa-settings', JSON.stringify({
      sync: {
        enabled: true,
        endpoint: 'http://legacy-sync.test/sync',
        mode: 'local',
        authToken: 'legacy-token',
      },
    }))

    expect(isSyncActive()).toBe(true)
    expect(getSyncBaseEndpoint()).toBe('http://legacy-sync.test/sync')
    expect(makeAuthHeaders()).toEqual({ Authorization: 'Bearer legacy-token' })
  })
})
