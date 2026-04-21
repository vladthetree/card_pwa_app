import { useEffect } from 'react'
import { setupUnifiedSyncRuntime } from '../services/syncCoordinator'

export function useSyncRuntime() {
  useEffect(() => {
    return setupUnifiedSyncRuntime()
  }, [])
}
