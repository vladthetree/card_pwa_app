/**
 * AI_CONTEXT:
 * Role: Announces service-worker updates that finish after the initial startup
 * gate. Late updates deliberately remain waiting until the current app session
 * ends, so an already visible dashboard is never covered or reloaded.
 * Used by: AppShell (src/App.tsx) only.
 */
import { useEffect, useRef, useState } from 'react'
import { SW_CHANNELS } from '../../constants/appIdentity'

const UPDATE_NOTICE_DURATION_MS = 5000

export function useServiceWorkerUpdateFlow(input: {
  swSupported: boolean
}): {
  updateInstalledNotice: boolean
} {
  const { swSupported } = input
  const [updateInstalledNotice, setUpdateInstalledNotice] = useState(false)
  const updateNoticeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!swSupported) return

    const onUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ waitingWorker: ServiceWorker | null }>
      if (!customEvent.detail?.waitingWorker) return

      // Kein SKIP_WAITING und kein Reload an dieser Stelle: Der neue Worker
      // bleibt bis zum Schliessen dieser App-Session in "waiting". So kann ein
      // spaet fertig gewordenes Update das Dashboard nicht mit einem zweiten
      // Vollbild-Lader ueberblenden. Beim naechsten echten Start wird es durch
      // den Startup-Flow aktiviert, solange der Start-Splash ohnehin sichtbar ist.
      setUpdateInstalledNotice(true)
    }

    window.addEventListener(SW_CHANNELS.updateEvent, onUpdate)
    return () => window.removeEventListener(SW_CHANNELS.updateEvent, onUpdate)
  }, [swSupported])

  useEffect(() => {
    if (!updateInstalledNotice) return

    if (updateNoticeTimerRef.current !== null) {
      window.clearTimeout(updateNoticeTimerRef.current)
    }

    updateNoticeTimerRef.current = window.setTimeout(() => {
      setUpdateInstalledNotice(false)
      updateNoticeTimerRef.current = null
    }, UPDATE_NOTICE_DURATION_MS)

    return () => {
      if (updateNoticeTimerRef.current !== null) {
        window.clearTimeout(updateNoticeTimerRef.current)
        updateNoticeTimerRef.current = null
      }
    }
  }, [updateInstalledNotice])

  return { updateInstalledNotice }
}
