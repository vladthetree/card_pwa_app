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
})
