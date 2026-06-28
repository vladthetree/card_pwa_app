/**
 * AI_CONTEXT: React hook for use Storage Persistence; encapsulates browser, persistence, sync, layout, or learning state for UI components.
 */
import { useEffect } from 'react'

export function useStoragePersistence() {
  useEffect(() => {
    if (!navigator.storage?.persist) return

    void navigator.storage.persist().then(granted => {
      console.info('Persistent storage granted:', granted)
    }).catch(() => {
      // best effort only
    })
  }, [])
}
