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

/**
 * Request a full push-then-pull sync cycle.
 * If a cycle is already running, the request is coalesced – at most one
 * additional cycle will run after the current one finishes.
 */
export function requestSyncCycle(): void {
  if (running) {
    queued = true
    return
  }

  running = true
  void executeSyncCycle()
    .catch(() => {
      // Network / transient errors must not crash the runtime.
    })
    .finally(() => {
      running = false
      if (queued) {
        queued = false
        requestSyncCycle()
      }
    })
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
