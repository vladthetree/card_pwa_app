import { useEffect } from 'react'

export function useWakeLock(): void {
  useEffect(() => {
    if (typeof document === 'undefined' || typeof navigator === 'undefined') return
    const wakeLockApi = (navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> }
    }).wakeLock
    if (!wakeLockApi?.request) return

    let wakeLock: { release: () => Promise<void> } | null = null
    let disposed = false

    const acquireWakeLock = async () => {
      if (disposed) return
      try {
        wakeLock = await wakeLockApi.request('screen')
      } catch {
        // unsupported, blocked, or temporarily unavailable
      }
    }

    const releaseWakeLock = async () => {
      if (!wakeLock) return
      try {
        await wakeLock.release()
      } catch {
        // best effort
      } finally {
        wakeLock = null
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void acquireWakeLock()
      } else {
        void releaseWakeLock()
      }
    }

    void acquireWakeLock()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void releaseWakeLock()
    }
  }, [])
}
