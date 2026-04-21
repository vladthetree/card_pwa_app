/**
 * profileService – manages local Profile state (IndexedDB `profile` store)
 * and communicates with the server auth endpoints.
 *
 * Profile modes:
 *  - 'local':  offline-first, no sync, deviceId only.
 *  - 'linked': profile bound to a server userId + profileToken.
 */

import { db, type ProfileRecord } from '../db'
import { generateUuidV7 } from '../utils/id'
import { fetchWithTimeout, SYNC_FETCH_TIMEOUT_MS } from './syncConfig'

const DEVICE_ID_KEY = 'card-pwa-device-id'
const LEGACY_CLIENT_ID_KEY = 'card-pwa-sync-client-id'

// ─── Device ID ────────────────────────────────────────────────────────────────

export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing) return existing

    // Migrate from legacy sync client id if present
    const legacy = localStorage.getItem(LEGACY_CLIENT_ID_KEY)
    if (legacy) {
      localStorage.setItem(DEVICE_ID_KEY, legacy)
      return legacy
    }

    const next = generateUuidV7()
    localStorage.setItem(DEVICE_ID_KEY, next)
    return next
  } catch {
    return generateUuidV7()
  }
}

// ─── Profile CRUD (IndexedDB) ─────────────────────────────────────────────────

export async function loadProfile(): Promise<ProfileRecord | null> {
  try {
    return (await db.profile.get('current')) ?? null
  } catch {
    return null
  }
}

export async function saveProfile(profile: ProfileRecord): Promise<void> {
  try {
    await db.profile.put(profile)
  } catch {
    // best effort
  }
}

export async function clearProfile(): Promise<void> {
  try {
    await db.profile.delete('current')
  } catch {
    // best effort
  }
}

/** Return a local-only profile record (no server link). */
export function makeLocalProfile(): ProfileRecord {
  const now = Date.now()
  return {
    id: 'current',
    mode: 'local',
    deviceId: getOrCreateDeviceId(),
    createdAt: now,
    updatedAt: now,
  }
}

// ─── Server requests ──────────────────────────────────────────────────────────

interface CreateProfileResponse {
  ok: boolean
  userId?: string
  deviceId?: string
  profileToken?: string
  recoveryCode?: string
  error?: string
}

interface PairIssueResponse {
  ok: boolean
  code?: string
  expiresAt?: number
  error?: string
}

interface PairRedeemResponse {
  ok: boolean
  userId?: string
  deviceId?: string
  profileToken?: string
  error?: string
}

interface RecoverResponse {
  ok: boolean
  userId?: string
  deviceId?: string
  profileToken?: string
  error?: string
}

/** POST /auth/profile — create a new server profile. */
export async function createServerProfile(
  endpoint: string,
  deviceId: string,
  deviceLabel?: string,
): Promise<CreateProfileResponse> {
  const base = endpoint.replace(/\/$/, '').replace(/\/sync$/, '')
  try {
    const res = await fetchWithTimeout(
      `${base}/auth/profile`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, deviceLabel: deviceLabel ?? 'Browser' }),
      },
      SYNC_FETCH_TIMEOUT_MS,
    )
    const json = await res.json() as CreateProfileResponse
    if (!res.ok) return { ok: false, error: json.error ?? `http_${res.status}` }
    return json
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'network_error' }
  }
}

/** POST /auth/pair/issue — generate pairing code for a second device. */
export async function issuePairingCode(
  endpoint: string,
  profileToken: string,
): Promise<PairIssueResponse> {
  const base = endpoint.replace(/\/$/, '').replace(/\/sync$/, '')
  try {
    const res = await fetchWithTimeout(
      `${base}/auth/pair/issue`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${profileToken}`,
        },
        body: '{}',
      },
      SYNC_FETCH_TIMEOUT_MS,
    )
    const json = await res.json() as PairIssueResponse
    if (!res.ok) return { ok: false, error: json.error ?? `http_${res.status}` }
    return json
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'network_error' }
  }
}

/** POST /auth/pair/redeem — second device redeems a pairing code. */
export async function redeemPairingCode(
  endpoint: string,
  code: string,
  deviceId: string,
  deviceLabel?: string,
): Promise<PairRedeemResponse> {
  const base = endpoint.replace(/\/$/, '').replace(/\/sync$/, '')
  try {
    const res = await fetchWithTimeout(
      `${base}/auth/pair/redeem`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, deviceId, deviceLabel: deviceLabel ?? 'Browser' }),
      },
      SYNC_FETCH_TIMEOUT_MS,
    )
    const json = await res.json() as PairRedeemResponse
    if (!res.ok) return { ok: false, error: json.error ?? `http_${res.status}` }
    return json
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'network_error' }
  }
}

/** POST /auth/recover — redeem recovery code on a new device. */
export async function recoverWithCode(
  endpoint: string,
  recoveryCode: string,
  deviceId: string,
  deviceLabel?: string,
): Promise<RecoverResponse> {
  const base = endpoint.replace(/\/$/, '').replace(/\/sync$/, '')
  try {
    const res = await fetchWithTimeout(
      `${base}/auth/recover`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recoveryCode, deviceId, deviceLabel: deviceLabel ?? 'Browser' }),
      },
      SYNC_FETCH_TIMEOUT_MS,
    )
    const json = await res.json() as RecoverResponse
    if (!res.ok) return { ok: false, error: json.error ?? `http_${res.status}` }
    return json
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'network_error' }
  }
}

/** POST /auth/revoke — revoke this device's token. */
export async function revokeDeviceToken(
  endpoint: string,
  profileToken: string,
): Promise<boolean> {
  const base = endpoint.replace(/\/$/, '').replace(/\/sync$/, '')
  try {
    const res = await fetchWithTimeout(
      `${base}/auth/revoke`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${profileToken}`,
        },
        body: '{}',
      },
      SYNC_FETCH_TIMEOUT_MS,
    )
    return res.ok
  } catch {
    return false
  }
}
