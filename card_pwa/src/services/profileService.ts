/**
 * profileService – manages local Profile state (IndexedDB `profile` store)
 * and communicates with the server auth endpoints.
 *
 * Profile modes:
 *  - 'local':  offline-first, no sync, deviceId only.
 *  - 'linked': profile bound to a server userId + profileToken.
 */

import {
  db,
  type ProfileRecord,
  type DeckRecord,
  type CardRecord,
  type ReviewRecord,
  type CardStatsRecord,
  type DeckProgressRecord,
  type ActiveSessionRecord,
} from '../db'
import { generateUuidV7 } from '../utils/id'
import { fetchWithTimeout, SYNC_FETCH_TIMEOUT_MS } from './syncConfig'

const DEVICE_ID_KEY = 'card-pwa-device-id'
const LEGACY_CLIENT_ID_KEY = 'card-pwa-sync-client-id'
const PROFILE_HINT_COOKIE_KEY = 'card_pwa_profile_hint'

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
  profileName?: string
  deviceId?: string
  profileToken?: string
  recoveryCode?: string
  error?: string
}

export interface ServerProfileSummary {
  userId: string
  profileName: string
  lastSeenAt?: number
  linkedDevicesCount?: number
}

interface ListProfilesResponse {
  ok: boolean
  profiles?: ServerProfileSummary[]
  error?: string
}

interface SwitchProfileResponse {
  ok: boolean
  userId?: string
  profileName?: string
  deviceId?: string
  profileToken?: string
  error?: string
}

export interface LocalStudyDataSnapshot {
  decks: DeckRecord[]
  cards: CardRecord[]
  reviews: ReviewRecord[]
  cardStats: CardStatsRecord[]
  deckProgress: DeckProgressRecord[]
  activeSessions: ActiveSessionRecord[]
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
  profileName?: string,
): Promise<CreateProfileResponse> {
  const base = endpoint.replace(/\/$/, '').replace(/\/sync$/, '')
  try {
    const body: Record<string, string> = { deviceId, deviceLabel: deviceLabel ?? 'Browser' }
    if (profileName?.trim()) {
      body.profileName = profileName.trim()
    }
    const res = await fetchWithTimeout(
      `${base}/auth/profile`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

/** GET /auth/profiles — list selectable profiles from server. */
export async function listServerProfiles(
  endpoint: string,
  limit = 20,
): Promise<ListProfilesResponse> {
  const base = endpoint.replace(/\/$/, '').replace(/\/sync$/, '')
  try {
    const query = `${base}/auth/profiles?limit=${encodeURIComponent(String(limit))}`
    const res = await fetchWithTimeout(
      query,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
      SYNC_FETCH_TIMEOUT_MS,
    )
    const json = await res.json() as ListProfilesResponse
    if (!res.ok) return { ok: false, error: json.error ?? `http_${res.status}` }
    return {
      ok: true,
      profiles: Array.isArray(json.profiles) ? json.profiles : [],
    }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'network_error' }
  }
}

/** POST /auth/profile/switch — rebind current device to selected profile. */
export async function switchServerProfile(
  endpoint: string,
  userId: string,
  deviceId: string,
  deviceLabel?: string,
): Promise<SwitchProfileResponse> {
  const base = endpoint.replace(/\/$/, '').replace(/\/sync$/, '')
  try {
    const res = await fetchWithTimeout(
      `${base}/auth/profile/switch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, deviceId, deviceLabel: deviceLabel ?? 'Browser' }),
      },
      SYNC_FETCH_TIMEOUT_MS,
    )
    const json = await res.json() as SwitchProfileResponse
    if (!res.ok) return { ok: false, error: json.error ?? `http_${res.status}` }
    return json
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'network_error' }
  }
}

/** Clears local learning data so selected profile can be rehydrated from server. */
export async function resetLocalStudyDataForProfileSwitch(): Promise<void> {
  await db.reviews.clear()
  await db.cards.clear()
  await db.decks.clear()
  await db.cardStats.clear()
  await db.deckProgress.clear()
  await db.activeSessions.clear()
}

export async function snapshotLocalStudyDataForRollback(): Promise<LocalStudyDataSnapshot> {
  const [decks, cards, reviews, cardStats, deckProgress, activeSessions] = await Promise.all([
    db.decks.toArray(),
    db.cards.toArray(),
    db.reviews.toArray(),
    db.cardStats.toArray(),
    db.deckProgress.toArray(),
    db.activeSessions.toArray(),
  ])

  return {
    decks,
    cards,
    reviews,
    cardStats,
    deckProgress,
    activeSessions,
  }
}

export async function restoreLocalStudyDataFromRollback(snapshot: LocalStudyDataSnapshot): Promise<void> {
  await resetLocalStudyDataForProfileSwitch()

  if (snapshot.decks.length > 0) await db.decks.bulkPut(snapshot.decks)
  if (snapshot.cards.length > 0) await db.cards.bulkPut(snapshot.cards)
  if (snapshot.reviews.length > 0) await db.reviews.bulkAdd(snapshot.reviews)
  if (snapshot.cardStats.length > 0) await db.cardStats.bulkPut(snapshot.cardStats)
  if (snapshot.deckProgress.length > 0) await db.deckProgress.bulkPut(snapshot.deckProgress)
  if (snapshot.activeSessions.length > 0) await db.activeSessions.bulkPut(snapshot.activeSessions)
}

/** Cookie hint for quick profile restoration; DB remains source-of-truth. */
export function writeProfileHintCookie(userId: string): void {
  try {
    const maxAge = 60 * 60 * 24 * 365 * 3
    const safe = encodeURIComponent(userId)
    document.cookie = `${PROFILE_HINT_COOKIE_KEY}=${safe}; Max-Age=${maxAge}; Path=/; SameSite=Lax`
  } catch {
    // best effort
  }
}
