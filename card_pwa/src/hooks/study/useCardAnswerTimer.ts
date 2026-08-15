/**
 * AI_CONTEXT:
 * Role: Per-card answer timer with pause/resume and first-per-session
 * persistence. A new presentation always gets a fresh visible clock, while the
 * DB aggregation deduplicates repeated presentations by sessionRunId/cardId.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  recordCardStudySessionAppearance,
  recordFirstCardAnswerTime,
} from '../../db/queries'

interface TimerRuntime {
  presentationKey: string
  startedAt: number
  accumulatedMs: number
  isPaused: boolean
  isStopped: boolean
}

interface CardAnswerTimerState {
  elapsedSeconds: number
  isPaused: boolean
  isStopped: boolean
  togglePaused: () => void
  stop: () => number | null
}

function resolveElapsedMs(runtime: TimerRuntime, now: number): number {
  if (runtime.isPaused || runtime.isStopped) return runtime.accumulatedMs
  return runtime.accumulatedMs + Math.max(0, now - runtime.startedAt)
}

export function useCardAnswerTimer(input: {
  enabled: boolean
  cardId: string | null
  sessionRunId: string
  presentationKey: string
}): CardAnswerTimerState {
  const { enabled, cardId, sessionRunId, presentationKey } = input
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isStopped, setIsStopped] = useState(false)
  const runtimeRef = useRef<TimerRuntime | null>(null)
  const appearancePromiseRef = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    if (!enabled || !cardId || !sessionRunId) {
      runtimeRef.current = null
      appearancePromiseRef.current = Promise.resolve()
      setElapsedSeconds(0)
      setIsPaused(false)
      setIsStopped(false)
      return
    }

    const runtime: TimerRuntime = {
      presentationKey,
      startedAt: performance.now(),
      accumulatedMs: 0,
      isPaused: false,
      isStopped: false,
    }
    runtimeRef.current = runtime
    setElapsedSeconds(0)
    setIsPaused(false)
    setIsStopped(false)
    appearancePromiseRef.current = recordCardStudySessionAppearance(cardId, sessionRunId)

    const intervalId = window.setInterval(() => {
      if (runtimeRef.current !== runtime || runtime.isStopped || runtime.isPaused) return
      setElapsedSeconds(Math.floor(resolveElapsedMs(runtime, performance.now()) / 1000))
    }, 250)

    return () => window.clearInterval(intervalId)
  }, [cardId, enabled, presentationKey, sessionRunId])

  const togglePaused = useCallback(() => {
    const runtime = runtimeRef.current
    if (!enabled || !runtime || runtime.presentationKey !== presentationKey || runtime.isStopped) return

    const now = performance.now()
    if (runtime.isPaused) {
      runtime.startedAt = now
      runtime.isPaused = false
      setIsPaused(false)
      return
    }

    runtime.accumulatedMs = resolveElapsedMs(runtime, now)
    runtime.isPaused = true
    setElapsedSeconds(Math.floor(runtime.accumulatedMs / 1000))
    setIsPaused(true)
  }, [enabled, presentationKey])

  const stop = useCallback((): number | null => {
    const runtime = runtimeRef.current
    if (!enabled || !cardId || !sessionRunId || !runtime || runtime.presentationKey !== presentationKey || runtime.isStopped) {
      return null
    }

    const now = performance.now()
    runtime.accumulatedMs = resolveElapsedMs(runtime, now)
    runtime.isStopped = true
    const roundedSeconds = Math.max(0, Math.round(runtime.accumulatedMs / 1000))
    setElapsedSeconds(roundedSeconds)
    setIsStopped(true)

    const appearancePromise = appearancePromiseRef.current
    void appearancePromise.finally(() => {
      void recordFirstCardAnswerTime(cardId, sessionRunId, roundedSeconds)
    })
    return roundedSeconds
  }, [cardId, enabled, presentationKey, sessionRunId])

  return { elapsedSeconds, isPaused, isStopped, togglePaused, stop }
}
