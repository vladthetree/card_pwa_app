/**
 * AI_CONTEXT:
 * Role: Tiny React bridge that starts/stops the unified background sync runtime from the component tree.
 * Used by: App-level initialization when sync is enabled.
 * Important: Sync logic belongs in services/syncCoordinator; this hook should remain lifecycle glue.
 */
import { useEffect } from 'react'
import { setupUnifiedSyncRuntime } from '../services/syncCoordinator'

export function useSyncRuntime(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    return setupUnifiedSyncRuntime()
  }, [enabled])
}
