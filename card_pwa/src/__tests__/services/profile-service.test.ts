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
})
