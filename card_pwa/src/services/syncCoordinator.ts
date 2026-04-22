/**
 * SyncCoordinator – serialises all push/pull sync work through a single
 * async mutex so that flushSyncQueue and pullAndApplySyncDeltas never
 * overlap.  Both the push-runtime and the pull-runtime call into this
 * module instead of executing sync directly.
 */

import { flushSyncQueue } from './syncQueue'
import { pullAndApplySyncDeltas } from './syncPull'
import { isSyncActive } from './syncConfig'

let running = false
let queued = false
let activeRunPromise: Promise<boolean> | null = null
let lastSuccessfulSyncAt = 0

const SYNC_FRESH_WINDOW_MS = 10_000

function notifyServiceWorkerAppVisible(): void {
  const payload = { type: 'APP_VISIBLE' }

  try {
    navigator.serviceWorker?.controller?.postMessage(payload)
  } catch {
    // no-op best effort
  }

  void navigator.serviceWorker?.ready
    ?.then(registration => {
      registration.active?.postMessage(payload)
    })
    .catch(() => {
      // no-op best effort
    })
}

async function executeSyncCycle(): Promise<void> {
  if (!isSyncActive()) return

  // Phase 1: push all pending local operations
  let pendingAfterFlush = 0
  if (navigator.onLine) {
    const flushResult = await flushSyncQueue({ limit: 200 })
    pendingAfterFlush = flushResult.pending
  }

  // Phase 2: pull remote deltas only when local push backlog is drained.
  if (navigator.onLine && pendingAfterFlush === 0) {
    await pullAndApplySyncDeltas()
  }
}

async function executeSyncCycleSafe(): Promise<boolean> {
  try {
    await executeSyncCycle()
    lastSuccessfulSyncAt = Date.now()
    return true
  } catch {
    return false
  }
}

function scheduleCycleIfNeeded(): void {
  if (running) {
    queued = true
    return
  }

  running = true
  activeRunPromise = executeSyncCycleSafe().finally(() => {
    running = false
    if (queued) {
      queued = false
      scheduleCycleIfNeeded()
    }
  })
}

/**
 * Run one full sync cycle and wait for completion.
 * Uses the same internal lock as background runtime to avoid overlap.
 */
export async function runSyncCycleNow(options?: { force?: boolean }): Promise<boolean> {
  if (!navigator.onLine) return false
  if (!isSyncActive()) return false

  const force = options?.force === true
  const isFresh = Date.now() - lastSuccessfulSyncAt < SYNC_FRESH_WINDOW_MS
  if (!force && isFresh && !running) {
    return true
  }

  scheduleCycleIfNeeded()
  return (await activeRunPromise) ?? false
}

/**
 * Request a full push-then-pull sync cycle.
 * If a cycle is already running, the request is coalesced – at most one
 * additional cycle will run after the current one finishes.
 */
export function requestSyncCycle(): void {
  scheduleCycleIfNeeded()
}

/**
 * Sets up the unified sync runtime (replaces both setupSyncRuntime and
 * setupSyncPullRuntime).  Listens to online, visibility-change, and
 * Service-Worker messages, plus a periodic 60 s interval.
 */
export function setupUnifiedSyncRuntime(): () => void {
  const handleOnline = () => {
    notifyServiceWorkerAppVisible()
    requestSyncCycle()
  }

  const handleVisibility = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      notifyServiceWorkerAppVisible()
      requestSyncCycle()
    }
  }

  const handleSwMessage = (event: MessageEvent) => {
    if (event.data?.type === 'SYNC_NOW') {
      requestSyncCycle()
    }
  }

  window.addEventListener('online', handleOnline)
  document.addEventListener('visibilitychange', handleVisibility)
  navigator.serviceWorker?.addEventListener('message', handleSwMessage)

  const interval = window.setInterval(() => {
    if (navigator.onLine) {
      requestSyncCycle()
    }
  }, 60_000)

  // Kick off an initial sync immediately
  if (navigator.onLine) {
    notifyServiceWorkerAppVisible()
    requestSyncCycle()
  }

  return () => {
    window.removeEventListener('online', handleOnline)
    document.removeEventListener('visibilitychange', handleVisibility)
    navigator.serviceWorker?.removeEventListener('message', handleSwMessage)
    window.clearInterval(interval)
  }
}
