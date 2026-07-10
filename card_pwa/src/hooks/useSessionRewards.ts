/**
 * AI_CONTEXT: React hook for use Session Rewards; encapsulates browser, persistence, sync, layout, or learning state for UI components.
 * Gemeinsame XP-Toast-Logik von StudyView und ShuffleStudyView. Das Combo-
 * Momentum wird aus dem Lerntag geseedet (getTodayTrailingCombo), damit das
 * angezeigte Toast-XP exakt dem entspricht, was buildGamificationProfile
 * deterministisch aus der Review-Historie gutschreibt.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { getTodayTrailingCombo } from '../db/queries'
import { getComboBonusXp, getReviewXp } from '../utils/gamification'
import type { RewardHint } from '../components/StudyHeaderProgress'
import type { Rating } from '../types'

export function useSessionRewards({ language, nextDayStartsAt, resetKey }: {
  language: 'de' | 'en'
  nextDayStartsAt: number
  resetKey: string
}): {
  rewardToast: RewardHint | null
  registerSessionReward: (rating: Rating, elapsedMs: number) => void
} {
  const [rewardToast, setRewardToast] = useState<RewardHint | null>(null)
  const momentumRef = useRef(0)
  // Verwirft verspätete Seeds, sobald eine neuere Bewertung oder ein neuer
  // resetKey das Momentum bereits weitergeschrieben hat.
  const momentumEpochRef = useRef(0)
  const toastTimerRef = useRef<number | null>(null)

  useEffect(() => {
    momentumRef.current = 0
    setRewardToast(null)
    const epoch = ++momentumEpochRef.current
    void getTodayTrailingCombo(nextDayStartsAt).then(combo => {
      if (momentumEpochRef.current === epoch) momentumRef.current = combo
    }).catch(() => {})
  }, [resetKey, nextDayStartsAt])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  const registerSessionReward = useCallback((rating: Rating, elapsedMs: number) => {
    momentumEpochRef.current += 1
    const isSuccess = rating >= 3
    const nextCombo = isSuccess ? momentumRef.current + 1 : 0
    momentumRef.current = nextCombo

    const xp = getReviewXp(rating, elapsedMs) + getComboBonusXp(nextCombo)
    const comboLabel = nextCombo >= 2
      ? `${nextCombo}x ${language === 'de' ? 'Combo' : 'combo'}`
      : (isSuccess ? (language === 'de' ? 'Sicher erinnert' : 'Recall locked') : (language === 'de' ? 'Trainingspunkt' : 'Practice point'))

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current)
    }

    setRewardToast({
      id: `${Date.now()}-${rating}-${nextCombo}`,
      xp,
      combo: nextCombo,
      label: comboLabel,
      tone: isSuccess ? 'success' : 'practice',
    })

    toastTimerRef.current = window.setTimeout(() => {
      setRewardToast(null)
      toastTimerRef.current = null
    }, 1600)
  }, [language])

  return { rewardToast, registerSessionReward }
}
