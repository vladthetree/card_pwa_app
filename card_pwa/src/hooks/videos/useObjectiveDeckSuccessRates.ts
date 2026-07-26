/**
 * AI_CONTEXT:
 * Role: Fetches the real success rate of every SY0-701 objective deck once per
 * mount — the calibration anchor shown next to the video self-assessment chips.
 * Used by: VideosView (VideoStudyBar's deckStats prop).
 * Important: one batch read instead of ~35 individual per-objective queries.
 */
import { useEffect, useState } from 'react'
import { SY0_701_OBJECTIVES } from '../../utils/securityDeckHierarchy'
import { getSecurityObjectiveDeckId } from '../../utils/securityDeckHierarchy'
import { getDeckSuccessRates, type DeckSuccessRate } from '../../db/queries'

export function useObjectiveDeckSuccessRates(): Record<string, DeckSuccessRate> {
  const [deckSuccessRates, setDeckSuccessRates] = useState<Record<string, DeckSuccessRate>>({})

  useEffect(() => {
    let cancelled = false
    const deckIds = SY0_701_OBJECTIVES.map(objective => getSecurityObjectiveDeckId(objective.code))
    void getDeckSuccessRates(deckIds).then(rates => {
      if (!cancelled) setDeckSuccessRates(rates)
    }).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return deckSuccessRates
}
