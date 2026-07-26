/**
 * AI_CONTEXT:
 * Role: Coordinates the service-worker update UI (update-installed notice, full-screen
 * update splash) and the four timers that drive it from "new SW waiting" to reload.
 * Used by: AppShell (src/App.tsx) only.
 *
 * Timeout cascade — read this fully before touching a duration or a guard condition,
 * the four timers are independent but chained through state/refs:
 *
 * 1. `onUpdate` (SW_CHANNELS.updateEvent — a waiting worker was found) sets
 *    updateInstalledNotice=true. If the user is not mid-study, it also shows the
 *    full-screen update splash immediately and arms an 8s FALLBACK timer
 *    (updateActivationFallbackRef) that force-hides the splash if the browser never
 *    follows through with `controllerchange` (guards against a stuck/ignored
 *    SKIP_WAITING so the splash can't get stuck forever). It then posts SKIP_WAITING
 *    to the waiting worker.
 * 2. Once the new SW actually activates, the browser fires `controllerchange` →
 *    `onControllerChange` clears the 8s fallback timer (the real activation beat it,
 *    so the fallback is no longer needed) and re-asserts updateInstalledNotice=true.
 *    If the user is mid-study, this defers the reload: pendingReloadAfterStudy=true,
 *    and it returns without reloading (never interrupt an in-progress answer).
 *    Otherwise it shows the splash and reloads after a 180ms REPAINT delay (enough
 *    time for the splash to paint before the page unloads).
 * 3. The `pendingReloadAfterStudy` effect watches for the user leaving the study view
 *    while a reload is still pending, and then runs the same show-splash +
 *    180ms-reload sequence as step 2.
 * 4. Independently of the splash, a 5s NOTICE timer (updateNoticeTimerRef) auto-hides
 *    updateInstalledNotice whenever it becomes true. That notice only renders as a
 *    banner while the full-screen splash is not already covering it (see the
 *    `!showUpdateSplash` render guard in AppShell) — the 5s and 8s timers can both be
 *    pending at once and do not clear each other.
 */
import { useEffect, useRef, useState } from 'react'
import { SW_CHANNELS } from '../../constants/appIdentity'

export function useServiceWorkerUpdateFlow(input: {
  swSupported: boolean
  isStudyView: boolean
}): {
  updateInstalledNotice: boolean
  showUpdateSplash: boolean
} {
  const { swSupported, isStudyView } = input
  const [updateInstalledNotice, setUpdateInstalledNotice] = useState(false)
  const [showUpdateSplash, setShowUpdateSplash] = useState(false)
  const [pendingReloadAfterStudy, setPendingReloadAfterStudy] = useState(false)
  const updateNoticeTimerRef = useRef<number | null>(null)
  const updateActivationFallbackRef = useRef<number | null>(null)

  useEffect(() => {
    if (!swSupported) return

    const onUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ waitingWorker: ServiceWorker | null }>
      const waitingWorker = customEvent.detail?.waitingWorker ?? null
      if (!waitingWorker) return

      setUpdateInstalledNotice(true)
      if (!isStudyView) {
        setShowUpdateSplash(true)
        if (updateActivationFallbackRef.current !== null) {
          window.clearTimeout(updateActivationFallbackRef.current)
        }
        updateActivationFallbackRef.current = window.setTimeout(() => {
          setShowUpdateSplash(false)
          updateActivationFallbackRef.current = null
        }, 8000)
      }
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }

    window.addEventListener(SW_CHANNELS.updateEvent, onUpdate)
    return () => window.removeEventListener(SW_CHANNELS.updateEvent, onUpdate)
  }, [isStudyView, swSupported])

  useEffect(() => {
    if (!updateInstalledNotice) return

    if (updateNoticeTimerRef.current !== null) {
      window.clearTimeout(updateNoticeTimerRef.current)
    }

    updateNoticeTimerRef.current = window.setTimeout(() => {
      setUpdateInstalledNotice(false)
      updateNoticeTimerRef.current = null
    }, 5000)

    return () => {
      if (updateNoticeTimerRef.current !== null) {
        window.clearTimeout(updateNoticeTimerRef.current)
        updateNoticeTimerRef.current = null
      }
    }
  }, [updateInstalledNotice])

  useEffect(() => {
    if (!swSupported) return

    let reloadTimer: number | null = null

    const onControllerChange = () => {
      if (updateActivationFallbackRef.current !== null) {
        window.clearTimeout(updateActivationFallbackRef.current)
        updateActivationFallbackRef.current = null
      }
      setUpdateInstalledNotice(true)

      if (isStudyView) {
        setPendingReloadAfterStudy(true)
        return
      }

      setShowUpdateSplash(true)
      reloadTimer = window.setTimeout(() => {
        window.location.reload()
      }, 180)
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      if (reloadTimer !== null) {
        window.clearTimeout(reloadTimer)
      }
    }
  }, [isStudyView, swSupported])

  useEffect(() => {
    if (!pendingReloadAfterStudy) return
    if (isStudyView) return

    setShowUpdateSplash(true)
    const reloadTimer = window.setTimeout(() => {
      window.location.reload()
    }, 180)

    return () => window.clearTimeout(reloadTimer)
  }, [isStudyView, pendingReloadAfterStudy])

  return { updateInstalledNotice, showUpdateSplash }
}
