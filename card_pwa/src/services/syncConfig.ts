import { STORAGE_KEYS } from '../constants/appIdentity'
import { generateUuidV7 } from '../utils/id'

const ENV_SYNC_ENDPOINT = import.meta.env.VITE_SYNC_ENDPOINT as string | undefined
const ENV_PROFILE_SYNC_ENDPOINT = import.meta.env.VITE_PROFILE_SYNC_ENDPOINT as string | undefined
const SYNC_CLIENT_ID_KEY = 'card-pwa-sync-client-id'

export interface PersistedSettings {
  sync?: {
    enabled?: boolean
    endpoint?: string
    mode?: 'local' | 'vpn-placeholder'
    authToken?: string
  }
}

export interface SyncConfig {
  enabled: boolean
  endpoint: string
  mode: 'local' | 'vpn-placeholder'
  authToken: string
}

export function getPersistedSettings(): PersistedSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings)
    return raw ? (JSON.parse(raw) as PersistedSettings) : null
  } catch {
    return null
  }
}

export function getSyncConfig(): SyncConfig {
  const persisted = getPersistedSettings()
  const enabled = persisted?.sync?.enabled ?? Boolean(ENV_SYNC_ENDPOINT)
  const endpoint = persisted?.sync?.endpoint?.trim() || ENV_SYNC_ENDPOINT || ''
  const mode = persisted?.sync?.mode ?? 'local'
  const authToken = persisted?.sync?.authToken?.trim() || ''

  return { enabled, endpoint, mode, authToken }
}

export function getDefaultProfileSyncEndpoint(): string {
  return (ENV_PROFILE_SYNC_ENDPOINT?.trim() || ENV_SYNC_ENDPOINT?.trim() || '')
}

// ─── Profile-aware auth helpers ───────────────────────────────────────────────

/** Read the active profile token from the profile store synchronously via a
 *  cached in-memory reference that is refreshed by the SettingsContext. */
let _cachedProfileToken: string | null = null
let _cachedProfileEndpoint: string | null = null

export function setCachedProfile(token: string | null, endpoint: string | null): void {
  _cachedProfileToken = token
  _cachedProfileEndpoint = endpoint
}

/** Returns the auth token to use for sync requests.
 *  Profile device-token takes priority over legacy authToken. */
function getActiveAuthToken(): string {
  if (_cachedProfileToken) return _cachedProfileToken
  return getSyncConfig().authToken
}

/** Returns the sync base endpoint, preferring the cached profile endpoint. */
function getActiveEndpoint(): string {
  if (_cachedProfileEndpoint) return _cachedProfileEndpoint
  return getSyncConfig().endpoint
}

export function isSyncActive(): boolean {
  // Profile-linked mode: device token + endpoint must be set.
  if (_cachedProfileToken && _cachedProfileEndpoint) return true

  // Legacy fallback: existing manual sync config.
  const { enabled, endpoint, mode } = getSyncConfig()
  return enabled && mode === 'local' && !!endpoint
}

export function getSyncBaseEndpoint(): string | null {
  const endpoint = getActiveEndpoint().trim()
  if (!endpoint) {
    // Legacy fallback check
    const { enabled, mode } = getSyncConfig()
    if (!enabled || mode !== 'local') return null
  }
  if (!endpoint) return null

  const normalized = endpoint.replace(/\/$/, '')
  return normalized.endsWith('/sync') ? normalized : `${normalized}/sync`
}

export function makeOpId(): string {
  return generateUuidV7()
}

export function getOrCreateSyncClientId(): string {
  try {
    const existing = localStorage.getItem(SYNC_CLIENT_ID_KEY)
    if (existing) return existing

    const next = makeOpId()
    localStorage.setItem(SYNC_CLIENT_ID_KEY, next)
    return next
  } catch {
    return makeOpId()
  }
}

/** Default fetch timeout for sync operations (ms) */
export const SYNC_FETCH_TIMEOUT_MS = 15_000

/** Maximum retries before a queued operation is discarded */
export const SYNC_MAX_RETRIES = 20

/**
 * Wraps fetch with an AbortController timeout.
 */
export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = SYNC_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timer)
  })
}

/**
 * Returns auth headers for sync requests.
 * Uses profile device-token when available, falls back to legacy authToken.
 */
export function makeAuthHeaders(_config?: SyncConfig): Record<string, string> {
  const token = getActiveAuthToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export function readSyncAuthTokenFromSettings(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings)
    if (!raw) return ''
    const parsed = JSON.parse(raw) as { sync?: { authToken?: string } }
    return parsed?.sync?.authToken?.trim() ?? ''
  } catch {
    return ''
  }
}

export function writeSyncAuthTokenToSettings(token: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings)
    const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {}
    const sync = (parsed.sync && typeof parsed.sync === 'object')
      ? parsed.sync as Record<string, unknown>
      : {}

    const normalized = token.trim()
    if (normalized) {
      sync.authToken = normalized
    } else {
      delete sync.authToken
    }

    parsed.sync = sync
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(parsed))
  } catch {
    // best effort
  }
}
