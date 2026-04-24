import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  response: null as Response | null,
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
})
