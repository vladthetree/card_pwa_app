/**
 * AI_CONTEXT:
 * Role: Prefetches the secondary lazy view chunks (Study/Videos/Shuffle) once
 * service-worker startup readiness has settled, so the first navigation into
 * them skips the Suspense chunk-loading flash. Fires after startupReady
 * rather than immediately on mount, so it never competes with HomeView's own
 * chunk/data fetch on the critical startup path — by then the SW's own
 * update check is done and, on repeat launches, these chunks already sit in
 * the SW's precache from the chunk-graph crawl at install time.
 * Used by: AppShell (src/App.tsx) only.
 */
import { useEffect } from 'react'
import type { ServiceWorkerStartupReadiness } from '../../runtime/swRegistration'

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void) => number
  cancelIdleCallback?: (handle: number) => void
}

// iOS Safari has no requestIdleCallback, so a short setTimeout is the
// portable fallback rather than the primary path.
const IDLE_FALLBACK_DELAY_MS = 300

function schedulePreload(run: () => void): () => void {
  const idleWindow = window as IdleWindow

  if (typeof idleWindow.requestIdleCallback === 'function') {
    const handle = idleWindow.requestIdleCallback(run)
    return () => idleWindow.cancelIdleCallback?.(handle)
  }

  const timerId = window.setTimeout(run, IDLE_FALLBACK_DELAY_MS)
  return () => window.clearTimeout(timerId)
}

export function useSecondaryViewPreload(
  startupReady: Promise<ServiceWorkerStartupReadiness>,
  preloaders: ReadonlyArray<() => Promise<unknown>>,
): void {
  useEffect(() => {
    let cancelled = false
    let cancelSchedule: (() => void) | null = null

    void startupReady.catch(() => undefined).then(() => {
      if (cancelled) return

      cancelSchedule = schedulePreload(() => {
        // Sequenziell statt parallel geladen: teilt sich Netz/Cache-Zugriff
        // nicht mit dem gerade erst angelaufenen Home-Start.
        void preloaders.reduce(
          (chain, preload) => chain.then(() => preload()).catch(() => undefined),
          Promise.resolve() as Promise<unknown>,
        )
      })
    })

    return () => {
      cancelled = true
      cancelSchedule?.()
    }
  }, [startupReady, preloaders])
}
