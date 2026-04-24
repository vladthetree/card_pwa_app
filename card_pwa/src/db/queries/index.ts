// Re-exports the public query API. Import paths that previously pointed to
// '../db/queries' continue to work via the re-export in queries.ts.

export type { AlgorithmDiagnosticsEntry } from './diagnostics'
export { getAlgorithmDiagnostics, clearAlgorithmDiagnostics } from './diagnostics'

export {
  fetchDecks,
  fetchDeckCards,
  getDeckTagIndex,
  fetchDeckStudyCandidates,
  getDeckScheduleOverview,
  fetchTodayDueFromDecks,
  createDeck,
  deleteDeck,
} from './decks'

export { normalizeDueDates, createCard, updateCard, deleteCard } from './cards'

export {
  fetchGlobalStats,
  getFutureDueForecast,
  getDeckSuccessRates,
  getDeckMetricsSnapshot,
  getShuffleCollectionMetricsSnapshot,
  recordReview,
  undoReview,
  forceCardReviewTomorrow,
  smoothBacklog,
} from './reviews'

export { fetchGamificationProfile } from './gamification'

export {
  readActiveSession,
  writeActiveSession,
  clearActiveSession,
  readShuffleSession,
  writeShuffleSession,
  clearShuffleSession,
} from './sessions'

export {
  listShuffleCollections,
  getShuffleCollection,
  createShuffleCollection,
  updateShuffleCollection,
  deleteShuffleCollection,
} from './shuffleCollections'
