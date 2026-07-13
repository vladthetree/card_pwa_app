/**
 * AI_CONTEXT: Application service for session Recovery; owns business logic outside React components for learning, sync, profile, update, or session flows.
 */
export interface RecoveryState {
  lowRatingCounts: Record<string, number>
  relearnSuccessCounts: Record<string, number>
  againCounts: Record<string, number>
  /** Review-Karten, die nach einem regulären Hard als reine Session-
   * Verstärkung wiederholt werden. Diese Durchläufe terminieren nicht neu. */
  hardPracticeCardIds: string[]
  hardPracticePassCounts: Record<string, number>
}

export interface ApplyRatingResult {
  nextState: RecoveryState
  requeue: boolean
}

function withoutCardId(values: string[], cardId: string): string[] {
  return values.filter(value => value !== cardId)
}

function withCardId(values: string[], cardId: string): string[] {
  return values.includes(cardId) ? values : [...values, cardId]
}

export function applyRating(
  state: RecoveryState,
  cardId: string,
  rating: 1 | 2 | 3 | 4,
  options: {
    forcedTomorrow: boolean
    /** Der Durchlauf war eine Session-Übung und kein Scheduler-Review. */
    practiceOnly: boolean
    /** Kartentyp vor der Bewertung. */
    previousType: 'new' | 'learning' | 'review' | 'relearning'
    /** Vom Scheduler gelieferter Kartentyp nach der Bewertung. */
    nextType: 'new' | 'learning' | 'review' | 'relearning'
    hardPracticeEnabled?: boolean
    hardPracticeGoodStreak?: number
    hardPracticeMaxPasses?: number
  },
): ApplyRatingResult {
  const lowRatingCounts = { ...state.lowRatingCounts }
  const relearnSuccessCounts = { ...state.relearnSuccessCounts }
  const againCounts = { ...state.againCounts }
  let hardPracticeCardIds = [...state.hardPracticeCardIds]
  const hardPracticePassCounts = { ...state.hardPracticePassCounts }
  const goodStreakRequired = Math.max(1, Math.min(5, Math.round(options.hardPracticeGoodStreak ?? 2)))
  const maxPasses = Math.max(0, Math.min(20, Math.round(options.hardPracticeMaxPasses ?? 0)))

  if (options.hardPracticeEnabled === false) {
    hardPracticeCardIds = withoutCardId(hardPracticeCardIds, cardId)
    delete relearnSuccessCounts[cardId]
    delete hardPracticePassCounts[cardId]
  }

  if (rating === 1) {
    againCounts[cardId] = (againCounts[cardId] ?? 0) + 1
  }

  if (options.forcedTomorrow) {
    delete againCounts[cardId]
    delete lowRatingCounts[cardId]
    delete relearnSuccessCounts[cardId]
    hardPracticeCardIds = withoutCardId(hardPracticeCardIds, cardId)
    delete hardPracticePassCounts[cardId]
    return {
      nextState: { lowRatingCounts, relearnSuccessCounts, againCounts, hardPracticeCardIds, hardPracticePassCounts },
      requeue: false,
    }
  }

  if (rating <= 2) {
    lowRatingCounts[cardId] = (lowRatingCounts[cardId] ?? 0) + 1
  }

  // Ein echtes Again während einer Hard-Übung ist ein regulärer Lapse:
  // die View hat ihn persistiert, FSRS/SM2 liefert einen Relearning-Zustand.
  if (rating === 1) {
    delete relearnSuccessCounts[cardId]
    hardPracticeCardIds = withoutCardId(hardPracticeCardIds, cardId)
    delete hardPracticePassCounts[cardId]
  } else if (options.practiceOnly) {
    hardPracticePassCounts[cardId] = (hardPracticePassCounts[cardId] ?? 0) + 1
    if (rating === 4) {
      delete relearnSuccessCounts[cardId]
      hardPracticeCardIds = withoutCardId(hardPracticeCardIds, cardId)
      delete hardPracticePassCounts[cardId]
    } else if (rating === 3) {
      const successes = (relearnSuccessCounts[cardId] ?? 0) + 1
      if (successes >= goodStreakRequired) {
        delete relearnSuccessCounts[cardId]
        hardPracticeCardIds = withoutCardId(hardPracticeCardIds, cardId)
        delete hardPracticePassCounts[cardId]
      } else {
        relearnSuccessCounts[cardId] = successes
      }
    } else {
      // Hard hält die Karte in der Verstärkungsrunde und setzt die
      // benötigte Good-Serie zurück.
      relearnSuccessCounts[cardId] = 0
      hardPracticeCardIds = withCardId(hardPracticeCardIds, cardId)
    }
    if (maxPasses > 0 && (hardPracticePassCounts[cardId] ?? 0) >= maxPasses) {
      delete relearnSuccessCounts[cardId]
      delete hardPracticePassCounts[cardId]
      hardPracticeCardIds = withoutCardId(hardPracticeCardIds, cardId)
    }
  } else if (
    options.hardPracticeEnabled !== false
    &&
    rating === 2
    && options.previousType === 'review'
    && options.nextType === 'review'
  ) {
    // Nur ein reguläres Review-Hard startet die terminierungsfreie Runde.
    // Hard in Learning/Relearning bleibt ein normaler Scheduler-Schritt.
    relearnSuccessCounts[cardId] = 0
    hardPracticeCardIds = withCardId(hardPracticeCardIds, cardId)
    hardPracticePassCounts[cardId] = 0
  }

  const schedulerNeedsAnotherStep = options.nextType === 'learning' || options.nextType === 'relearning'
  const practiceNeedsAnotherPass = hardPracticeCardIds.includes(cardId)
  const requeue = schedulerNeedsAnotherStep || practiceNeedsAnotherPass

  return {
    nextState: { lowRatingCounts, relearnSuccessCounts, againCounts, hardPracticeCardIds, hardPracticePassCounts },
    requeue,
  }
}
