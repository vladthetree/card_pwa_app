import { useEffect } from 'react'
import { setupUnifiedSyncRuntime } from '../services/syncCoordinator'

export function useSyncRuntime(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    return setupUnifiedSyncRuntime()
  }, [enabled])
}
