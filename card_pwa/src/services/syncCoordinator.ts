/**
 * SyncCoordinator – serialises all push/pull sync work through a single
 * async mutex so that flushSyncQueue and pullAndApplySyncDeltas never
 * overlap.  Both the push-runtime and the pull-runtime call into this
 * module instead of executing sync directly.
 */

import { flushSyncQueue } from './syncQueue'
import { pullAndApplySyncDeltas } from './syncPull'
import { isSyncActive, SYNC_RUNTIME_CONFIG_CHANGED_EVENT } from './syncConfig'
import {
  checkSyncServerReachable,
  startSyncReachabilityRuntime,
} from './syncReachability'

let running = false
let queued = false
let activeRunPromise: Promise<boolean> | null = null
let lastSuccessfulSyncAt = 0

const SYNC_FRESH_WINDOW_MS = 10_000

async function executeSyncCycle(): Promise<boolean> {
  if (!isSyncActive()) return false
  if (!(await checkSyncServerReachable())) return false

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

  return true
}

async function executeSyncCycleSafe(): Promise<boolean> {
  try {
    const didSync = await executeSyncCycle()
    if (didSync) {
      lastSuccessfulSyncAt = Date.now()
    }
    return didSync
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
  if (!(await checkSyncServerReachable(options?.force === true))) return false

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
 * Service-Worker messages, plus a periodic 30 s interval.
 */
export function setupUnifiedSyncRuntime(): () => void {
  const stopReachabilityRuntime = startSyncReachabilityRuntime()

  const handleOnline = () => {
    requestSyncCycle()
  }

  const handleVisibility = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      requestSyncCycle()
    }
  }

  const handleRuntimeConfigChanged = () => {
    if (navigator.onLine) {
      requestSyncCycle()
    }
  }

  const handleSwMessage = (event: MessageEvent) => {
    if (event.data?.type === 'SYNC_NOW') {
      requestSyncCycle()
    }
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener(SYNC_RUNTIME_CONFIG_CHANGED_EVENT, handleRuntimeConfigChanged)
  document.addEventListener('visibilitychange', handleVisibility)
  navigator.serviceWorker?.addEventListener('message', handleSwMessage)

  const interval = window.setInterval(() => {
    if (navigator.onLine) {
      void checkSyncServerReachable(true).then(reachable => {
        if (reachable) {
          requestSyncCycle()
        }
      })
    }
  }, 30_000)

  // Kick off an initial sync immediately
  if (navigator.onLine) {
    requestSyncCycle()
  }

  return () => {
    stopReachabilityRuntime()
    window.removeEventListener('online', handleOnline)
    window.removeEventListener(SYNC_RUNTIME_CONFIG_CHANGED_EVENT, handleRuntimeConfigChanged)
    document.removeEventListener('visibilitychange', handleVisibility)
    navigator.serviceWorker?.removeEventListener('message', handleSwMessage)
    window.clearInterval(interval)
  }
}
