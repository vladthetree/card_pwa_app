import { useEffect, useRef } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { smoothBacklog } from '../db/queries'

export function useBacklogSmoother() {
  const { settings, isSettingsHydrated } = useSettings()
  const hasSmoothedRef = useRef(false)

  useEffect(() => {
    if (!isSettingsHydrated) return
    if (hasSmoothedRef.current) return

    hasSmoothedRef.current = true
    void smoothBacklog(settings.studyCardLimit, Math.random, settings.nextDayStartsAt)
  }, [isSettingsHydrated, settings.nextDayStartsAt, settings.studyCardLimit])
}
