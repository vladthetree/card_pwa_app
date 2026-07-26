/**
 * AI_CONTEXT:
 * Role: Drives the startup splash's two independent gates — service-worker readiness
 * and a minimum read time for the launch motivation quote — and exposes when the
 * splash may be dismissed by a tap.
 * Used by: AppShell (src/App.tsx) only.
 */
import { useEffect, useState } from 'react'
import type { ServiceWorkerStartupReadiness } from '../../runtime/swRegistration'

// Der Start-Splash bleibt stehen, bis der Nutzer tippt — der Motivationsspruch
// soll in Ruhe lesbar sein. Der Tap wird erst nach dieser Zeit scharf, damit
// ein hastiger Doppel-Tap beim Öffnen den Spruch nicht sofort wegwischt.
const INITIAL_SPLASH_TAP_ENABLE_MS = 3000

export function useStartupSplash(startupReady: Promise<ServiceWorkerStartupReadiness>): {
  showInitialSplash: boolean
  splashContinueReady: boolean
  dismissInitialSplash: () => void
} {
  const [showInitialSplash, setShowInitialSplash] = useState(true)
  // Beide müssen wahr sein, bevor der Tap den Splash schließt: die App ist
  // startbereit UND die Mindest-Lesezeit ist vorbei.
  const [splashStartupDone, setSplashStartupDone] = useState(false)
  const [splashTapEnabled, setSplashTapEnabled] = useState(false)

  useEffect(() => {
    let cancelled = false

    const tapTimer = window.setTimeout(() => {
      if (!cancelled) setSplashTapEnabled(true)
    }, INITIAL_SPLASH_TAP_ENABLE_MS)

    void startupReady
      .catch(() => ({ status: 'error', activatedUpdate: false }) satisfies ServiceWorkerStartupReadiness)
      .then(readiness => {
        if (cancelled) return

        if (readiness.activatedUpdate) {
          window.location.reload()
          return
        }

        setSplashStartupDone(true)
      })

    return () => {
      cancelled = true
      window.clearTimeout(tapTimer)
    }
  }, [startupReady])

  const splashContinueReady = splashStartupDone && splashTapEnabled

  const dismissInitialSplash = () => {
    if (!splashContinueReady) return
    setShowInitialSplash(false)
  }

  return { showInitialSplash, splashContinueReady, dismissInitialSplash }
}
