/**
 * AI_CONTEXT: Application service for sync Reachability; owns business logic outside React components for learning, sync, profile, update, or session flows.
 */
import {
  fetchWithTimeout,
  getSyncBaseEndpoint,
  isSyncActive,
  SYNC_RUNTIME_CONFIG_CHANGED_EVENT,
} from './syncConfig'

export type SyncReachabilityState = 'connected' | 'disconnected'

const REACHABILITY_INTERVAL_MS = 20_000
const REACHABILITY_CACHE_MS = 20_000
const REACHABILITY_TIMEOUT_MS = 4_000
// Backoff bei nicht erreichbarem Server: verdoppelt das Cache-Fenster pro
// Fehlschlag (20 s → 40 s → … → 5 min), damit die App unterwegs nicht alle
// 20 s in ein TCP-Timeout läuft. Erzwungene Checks (online/visibility) und
// ein Erfolg setzen den Streak zurück.
const REACHABILITY_BACKOFF_MAX_MS = 5 * 60_000

let currentState: SyncReachabilityState = 'disconnected'
let lastReachabilityCheckAt = 0
let lastReachabilityResult = false
let reachabilityFailureStreak = 0
let runtimeRefCount = 0
let disposeRuntime: (() => void) | null = null

const listeners = new Set<(state: SyncReachabilityState) => void>()

function setReachabilityState(nextState: SyncReachabilityState): void {
  if (currentState === nextState) return
  currentState = nextState

  for (const listener of listeners) {
    try {
      listener(nextState)
    } catch {
      // best effort
    }
  }
}

function resetReachabilityCache(): void {
  lastReachabilityCheckAt = 0
  lastReachabilityResult = false
  reachabilityFailureStreak = 0
}

function effectiveReachabilityCacheMs(): number {
  if (reachabilityFailureStreak === 0) return REACHABILITY_CACHE_MS
  return Math.min(
    REACHABILITY_CACHE_MS * 2 ** reachabilityFailureStreak,
    REACHABILITY_BACKOFF_MAX_MS,
  )
}

export function getSyncHealthUrl(): string | null {
  const baseEndpoint = getSyncBaseEndpoint()
  if (!baseEndpoint) return null

  try {
    const base = typeof window === 'undefined' ? undefined : window.location.origin
    const url = new URL(baseEndpoint, base)
    url.pathname = '/health'
    url.search = ''
    url.hash = ''

    if (base && url.origin === base) {
      return url.pathname
    }

    return url.toString()
  } catch {
    return null
  }
}

export function getSyncReachabilityState(): SyncReachabilityState {
  return currentState
}

export function subscribeToSyncReachability(
  listener: (state: SyncReachabilityState) => void,
): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export async function checkSyncServerReachable(force = false): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.onLine || !isSyncActive()) {
    resetReachabilityCache()
    setReachabilityState('disconnected')
    return false
  }

  const now = Date.now()
  if (!force && now - lastReachabilityCheckAt < effectiveReachabilityCacheMs()) {
    return lastReachabilityResult
  }

  lastReachabilityCheckAt = now

  const healthUrl = getSyncHealthUrl()
  if (!healthUrl) {
    lastReachabilityResult = false
    setReachabilityState('disconnected')
    return false
  }

  try {
    const response = await fetchWithTimeout(
      healthUrl,
      { method: 'GET', cache: 'no-store' },
      REACHABILITY_TIMEOUT_MS,
    )
    lastReachabilityResult = response.ok
    reachabilityFailureStreak = response.ok ? 0 : reachabilityFailureStreak + 1
    setReachabilityState(response.ok ? 'connected' : 'disconnected')
    return response.ok
  } catch {
    lastReachabilityResult = false
    reachabilityFailureStreak += 1
    setReachabilityState('disconnected')
    return false
  }
}

function requestServiceWorkerHeartbeatCheck(): void {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: 'FORCE_HEARTBEAT_CHECK' })
  } catch {
    // best effort
  }
}

export function notifyServiceWorkerAppVisible(): void {
  if (!isSyncActive()) return

  const payload = { type: 'APP_VISIBLE' }

  try {
    navigator.serviceWorker?.controller?.postMessage(payload)
  } catch {
    // best effort
  }

  void navigator.serviceWorker?.ready
    ?.then(registration => {
      registration.active?.postMessage(payload)
    })
    .catch(() => {
      // best effort
    })
}

function handleServiceWorkerHeartbeatMessage(event: MessageEvent): void {
  if (event.data?.type !== 'SERVER_HEARTBEAT' || !isSyncActive()) {
    if (!isSyncActive()) {
      resetReachabilityCache()
      setReachabilityState('disconnected')
    }
    return
  }

  const nextState = event.data?.state
  if (nextState !== 'connected' && nextState !== 'disconnected') return

  lastReachabilityCheckAt = Date.now()
  lastReachabilityResult = nextState === 'connected'
  reachabilityFailureStreak = nextState === 'connected' ? 0 : Math.max(1, reachabilityFailureStreak)
  setReachabilityState(nextState)
}

export function startSyncReachabilityRuntime(): () => void {
  runtimeRefCount += 1

  if (runtimeRefCount === 1) {
    const refreshReachability = (force = false) => {
      requestServiceWorkerHeartbeatCheck()
      void checkSyncServerReachable(force)
    }

    const onOnlineStatusChange = () => {
      if (navigator.onLine) {
        notifyServiceWorkerAppVisible()
        refreshReachability(true)
        return
      }

      resetReachabilityCache()
      setReachabilityState('disconnected')
    }

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      notifyServiceWorkerAppVisible()
      refreshReachability(true)
    }

    const onSyncConfigChanged = () => {
      if (!isSyncActive()) {
        resetReachabilityCache()
        setReachabilityState('disconnected')
        return
      }

      refreshReachability(true)
    }

    window.addEventListener('online', onOnlineStatusChange)
    window.addEventListener('offline', onOnlineStatusChange)
    window.addEventListener(SYNC_RUNTIME_CONFIG_CHANGED_EVENT, onSyncConfigChanged)
    document.addEventListener('visibilitychange', onVisibilityChange)
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerHeartbeatMessage)

    const interval = window.setInterval(() => {
      // Hidden → kein Polling; beim Sichtbarwerden erzwingt onVisibilityChange
      // ohnehin einen frischen Check.
      if (document.visibilityState === 'hidden') return
      if (!navigator.onLine || !isSyncActive()) return

      // Mit aktivem SW ist dessen sichtbarkeits-gegateter Heartbeat (20 s) die
      // Quelle: der Broadcast füllt unseren Cache. Nur wenn der Cache auffällig
      // alt ist (SW eingeschlafen), wird ein Check angestoßen; ohne SW prüft
      // die App selbst (mit Backoff über effectiveReachabilityCacheMs).
      if (navigator.serviceWorker?.controller) {
        if (Date.now() - lastReachabilityCheckAt > REACHABILITY_INTERVAL_MS * 2) {
          requestServiceWorkerHeartbeatCheck()
        }
        return
      }

      void checkSyncServerReachable(false)
    }, REACHABILITY_INTERVAL_MS)

    if (navigator.onLine && isSyncActive()) {
      notifyServiceWorkerAppVisible()
      refreshReachability(true)
    } else {
      setReachabilityState('disconnected')
    }

    disposeRuntime = () => {
      window.removeEventListener('online', onOnlineStatusChange)
      window.removeEventListener('offline', onOnlineStatusChange)
      window.removeEventListener(SYNC_RUNTIME_CONFIG_CHANGED_EVENT, onSyncConfigChanged)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerHeartbeatMessage)
      window.clearInterval(interval)
      disposeRuntime = null
    }
  }

  let disposed = false
  return () => {
    if (disposed) return
    disposed = true
    runtimeRefCount = Math.max(0, runtimeRefCount - 1)

    if (runtimeRefCount === 0) {
      disposeRuntime?.()
    }
  }
}
