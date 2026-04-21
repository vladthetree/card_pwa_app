import { useEffect } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { supportsServiceWorker } from '../env'
import { fetchTodayDueFromDecks } from '../db/queries'
import { REVIEW_UPDATED_EVENT } from '../constants/appIdentity'

export function useAppBadge() {
  const { settings } = useSettings()

  useEffect(() => {
    const badgeApi = navigator as Navigator & {
      setAppBadge?: (contents?: number) => Promise<void>
      clearAppBadge?: () => Promise<void>
    }

    if (!badgeApi.setAppBadge && !badgeApi.clearAppBadge) return

    let cancelled = false

    const updateBadge = async () => {
      // Run on both visible and hidden transitions: the home-screen icon badge is
      // most important when the app is closed, so we refresh once when going to
      // background to ensure the count shown on the icon is up to date.
      try {
        const dueToday = await fetchTodayDueFromDecks(
          settings.studyCardLimit,
          settings.nextDayStartsAt
        )
        if (cancelled) return

        if (supportsServiceWorker()) {
          try {
            const registration = await navigator.serviceWorker.ready
            registration.active?.postMessage({
              type: 'KPI_DUE_COUNT',
              dueCount: dueToday,
              threshold: 150,
              language: settings.language,
            })
          } catch {
            // fall back to local badging below
          }
        }

        if (dueToday > 0 && badgeApi.setAppBadge) {
          await badgeApi.setAppBadge(dueToday)
        } else if (badgeApi.clearAppBadge) {
          await badgeApi.clearAppBadge()
        } else if (badgeApi.setAppBadge) {
          await badgeApi.setAppBadge(0)
        }
      } catch {
        // best effort
      }
    }

    const onVisibilityChange = () => {
      // Update on visible (cards reviewed, new cards due) AND on hidden (final
      // refresh so the home-screen icon shows the correct count after closing).
      void updateBadge()
    }

    void updateBadge()
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener(REVIEW_UPDATED_EVENT, onVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener(REVIEW_UPDATED_EVENT, onVisibilityChange)
    }
  }, [settings.language, settings.nextDayStartsAt, settings.studyCardLimit])
}
