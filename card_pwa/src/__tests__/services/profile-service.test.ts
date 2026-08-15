/**
 * AI_CONTEXT: Vitest coverage for profile service; protects services behavior from regressions in the learning PWA.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '../../constants/appIdentity'

const state = vi.hoisted(() => ({
  response: null as Response | null,
  storage: new Map<string, string>(),
}))

const fetchWithTimeoutMock = vi.fn(async () => {
  if (!state.response) {
    throw new Error('missing mock response')
  }
  return state.response
})

vi.mock('../../services/syncConfig', () => ({
  fetchWithTimeout: fetchWithTimeoutMock,
  SYNC_FETCH_TIMEOUT_MS: 15_000,
  getAuthApiBase: (endpoint: string) => endpoint.replace(/\/$/, '').replace(/\/sync$/, ''),
}))

function htmlResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError('JSON.parse: unexpected character at line 1 column 1 of the JSON data')
    },
  } as unknown as Response
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response
}

describe('profileService', () => {
  beforeEach(() => {
    state.response = null
    state.storage = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => state.storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          state.storage.set(key, value)
        },
        removeItem: (key: string) => {
          state.storage.delete(key)
        },
      },
      configurable: true,
    })
    fetchWithTimeoutMock.mockClear()
  })

  it('returns a stable error when profile list response is not JSON', async () => {
    state.response = htmlResponse()

    const { listServerProfiles } = await import('../../services/profileService')
    const result = await listServerProfiles('/sync')

    expect(result).toEqual({ ok: false, error: 'invalid_server_response' })
  })

  it('returns a stable error when the server rejects an already-linked device', async () => {
    state.response = jsonResponse({
      ok: false,
      error: 'device_already_linked',
      userId: 'profile-1',
      profileName: 'Anna',
      deviceId: 'device-1',
    }, false, 409)

    const { createServerProfile } = await import('../../services/profileService')
    const result = await createServerProfile('/sync', 'device-1', 'Phone')

    expect(result).toEqual({
      ok: false,
      error: 'device_already_linked',
    })
    expect(fetchWithTimeoutMock).toHaveBeenCalledWith(
      '/auth/profile',
      expect.objectContaining({ method: 'POST' }),
      15_000,
    )
  })

  it('writes a profile-api error log for failed login/profile API responses', async () => {
    state.response = jsonResponse({
      ok: false,
      error: 'default_profile_not_configured',
    })

    const { fetchDefaultProfileInfo } = await import('../../services/profileService')
    const result = await fetchDefaultProfileInfo('/sync')

    expect(result).toBeNull()
    const logs = JSON.parse(state.storage.get(STORAGE_KEYS.errorLog) ?? '[]')
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({
      source: 'profile-api',
      message: 'Profile API failed: fetch default profile',
    })
    expect(logs[0].details).toContain('target: /auth/default-profile')
    expect(logs[0].details).toContain('reason: default_profile_not_configured')
  })

  it('sends Authorization header when listing protected server profiles', async () => {
    state.response = jsonResponse({ ok: true, profiles: [] })

    const { listServerProfiles } = await import('../../services/profileService')
    await listServerProfiles('/sync', 'dt_list_token', 20)

    expect(fetchWithTimeoutMock).toHaveBeenCalledWith(
      '/auth/profiles?limit=20',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer dt_list_token' }),
      }),
      15_000,
    )
  })

  it('forwards an optional profile name when creating a profile', async () => {
    state.response = jsonResponse({
      ok: true,
      userId: 'profile-1',
      profileName: 'Anna',
      profileToken: 'dt_profile',
    })

    const { createServerProfile } = await import('../../services/profileService')
    await createServerProfile('/sync', 'device-1', 'Phone', 'Anna')

    expect(fetchWithTimeoutMock).toHaveBeenCalledWith(
      '/auth/profile',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          deviceId: 'device-1',
          deviceLabel: 'Phone',
          profileName: 'Anna',
        }),
      }),
      15_000,
    )
  })

  it('sends Authorization header when switching protected server profile', async () => {
    state.response = jsonResponse({ ok: true, userId: 'profile-1', profileToken: 'dt_switch' })

    const { switchServerProfile } = await import('../../services/profileService')
    await switchServerProfile('/sync', 'profile-1', 'device-1', 'Phone', 'dt_switch_token')

    expect(fetchWithTimeoutMock).toHaveBeenCalledWith(
      '/auth/profile/switch',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer dt_switch_token' }),
      }),
      15_000,
    )
  })

  it('sends Authorization header when issuing a pairing code', async () => {
    state.response = jsonResponse({ ok: true, code: 'ABC123', expiresAt: 123456 })

    const { issuePairingCode } = await import('../../services/profileService')
    await issuePairingCode('/sync', 'dt_pair_token')

    expect(fetchWithTimeoutMock).toHaveBeenCalledWith(
      '/auth/pair/issue',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer dt_pair_token' }),
      }),
      15_000,
    )
  })

  it('posts device metadata when redeeming a pairing code', async () => {
    state.response = jsonResponse({ ok: true, userId: 'profile-1', profileToken: 'dt_redeemed' })

    const { redeemPairingCode } = await import('../../services/profileService')
    await redeemPairingCode('/sync', 'ABC123', 'device-1', 'Phone')

    expect(fetchWithTimeoutMock).toHaveBeenCalledWith(
      '/auth/pair/redeem',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ code: 'ABC123', deviceId: 'device-1', deviceLabel: 'Phone' }),
      }),
      15_000,
    )
  })

  it('posts device metadata when recovering with a recovery code', async () => {
    state.response = jsonResponse({ ok: true, userId: 'profile-1', profileToken: 'dt_recovered' })

    const { recoverWithCode } = await import('../../services/profileService')
    await recoverWithCode('/sync', 'recover-123', 'device-1', 'Phone')

    expect(fetchWithTimeoutMock).toHaveBeenCalledWith(
      '/auth/recover',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ recoveryCode: 'recover-123', deviceId: 'device-1', deviceLabel: 'Phone' }),
      }),
      15_000,
    )
  })

  describe('isDefaultProfile', () => {
    it('is true only for a linked profile named exactly "Default"', async () => {
      const { isDefaultProfile } = await import('../../services/profileService')
      expect(isDefaultProfile(null)).toBe(false)
      expect(isDefaultProfile({ id: 'current', mode: 'local' } as never)).toBe(false)
      expect(isDefaultProfile({ id: 'current', mode: 'linked', userId: 'u1', displayName: 'Vlad' } as never)).toBe(false)
      expect(isDefaultProfile({ id: 'current', mode: 'linked', userId: 'u2', displayName: 'Default' } as never)).toBe(true)
    })
  })

  describe('profile hint cookie', () => {
    beforeEach(() => {
      let cookieJar = ''
      Object.defineProperty(globalThis, 'document', {
        value: {
          get cookie() {
            return cookieJar
          },
          set cookie(entry: string) {
            const [pair] = entry.split(';')
            const separatorIndex = pair.indexOf('=')
            const key = pair.slice(0, separatorIndex)
            const value = pair.slice(separatorIndex + 1)
            const remaining = cookieJar.split('; ').filter(existing => existing && !existing.startsWith(`${key}=`))
            cookieJar = [...remaining, `${key}=${value}`].join('; ')
          },
        },
        configurable: true,
      })
    })

    it('round-trips the last-joined userId, surviving a fresh module import like an app reinstall would', async () => {
      const { writeProfileHintCookie, readProfileHintCookie } = await import('../../services/profileService')
      expect(readProfileHintCookie()).toBeNull()

      writeProfileHintCookie('fbe23414-9399-4a3b-9d89-19867a3b71da')
      expect(readProfileHintCookie()).toBe('fbe23414-9399-4a3b-9d89-19867a3b71da')
    })
  })
})
