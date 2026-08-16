/**
 * AI_CONTEXT: Enforces the non-sliding four-hour lifetime of an active study
 * run. Browser timers may be throttled in the background, so focus, pageshow,
 * and visibility restoration all perform the same immediate deadline check.
 */
import { useEffect, useRef } from 'react'
import { getStudySessionExpiresAt, isStudySessionExpired } from '../../utils/studySessionPersistence'

interface Options {
  active: boolean
  startedAt: number
  onExpire: () => void
}

export function useStudySessionExpiry({ active, startedAt, onExpire }: Options): void {
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    if (!active || !Number.isFinite(startedAt)) return

    let expired = false
    let timer: number | null = null

    const check = () => {
      if (expired || !isStudySessionExpired(startedAt)) return
      expired = true
      if (timer !== null) window.clearTimeout(timer)
      onExpireRef.current()
    }

    const remainingMs = Math.max(0, getStudySessionExpiresAt(startedAt) - Date.now())
    timer = window.setTimeout(check, remainingMs)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') check()
    }

    window.addEventListener('focus', check)
    window.addEventListener('pageshow', check)
    document.addEventListener('visibilitychange', onVisibilityChange)
    check()

    return () => {
      if (timer !== null) window.clearTimeout(timer)
      window.removeEventListener('focus', check)
      window.removeEventListener('pageshow', check)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [active, startedAt])
}
