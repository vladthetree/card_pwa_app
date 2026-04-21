export interface RecoveryState {
  lowRatingCounts: Record<string, number>
  relearnSuccessCounts: Record<string, number>
  againCounts: Record<string, number>
}

export interface ApplyRatingResult {
  nextState: RecoveryState
  requeue: boolean
}

export function applyRating(
  state: RecoveryState,
  cardId: string,
  rating: 1 | 2 | 3 | 4,
  forcedTomorrow: boolean,
): ApplyRatingResult {
  const lowRatingCounts = { ...state.lowRatingCounts }
  const relearnSuccessCounts = { ...state.relearnSuccessCounts }
  const againCounts = { ...state.againCounts }

  if (rating === 1) {
    againCounts[cardId] = (againCounts[cardId] ?? 0) + 1
  }

  if (forcedTomorrow) {
    delete againCounts[cardId]
    delete lowRatingCounts[cardId]
    delete relearnSuccessCounts[cardId]
    return {
      nextState: { lowRatingCounts, relearnSuccessCounts, againCounts },
      requeue: false,
    }
  }

  const hadPendingRecovery = (lowRatingCounts[cardId] ?? 0) > 0

  if (rating <= 2) {
    lowRatingCounts[cardId] = (lowRatingCounts[cardId] ?? 0) + 1
    relearnSuccessCounts[cardId] = 0
  } else if (hadPendingRecovery) {
    if (rating === 4) {
      delete lowRatingCounts[cardId]
      delete relearnSuccessCounts[cardId]
    } else {
      const nextSuccessCount = (relearnSuccessCounts[cardId] ?? 0) + 1
      if (nextSuccessCount >= 2) {
        delete lowRatingCounts[cardId]
        delete relearnSuccessCounts[cardId]
      } else {
        relearnSuccessCounts[cardId] = nextSuccessCount
      }
    }
  }

  const stillNeedsRecovery = (lowRatingCounts[cardId] ?? 0) > 0
  const requeue = rating <= 2 || stillNeedsRecovery

  return {
    nextState: { lowRatingCounts, relearnSuccessCounts, againCounts },
    requeue,
  }
}