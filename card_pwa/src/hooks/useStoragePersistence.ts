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
