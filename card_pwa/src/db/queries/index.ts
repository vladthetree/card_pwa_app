/**
 * AI_CONTEXT:
 * Role: Public database query barrel for decks, cards, reviews, sessions, shuffle collections, gamification, video notes, and video downloads.
 * Used by: components/hooks that import from ../db/queries.
 * Important: Keep exports stable; db/queries.ts exists as a compatibility re-export for older import paths.
 */
// Re-exports the public query API. Import paths that previously pointed to
// '../db/queries' continue to work via the re-export in queries.ts.

export type { AlgorithmDiagnosticsEntry } from './diagnostics'
export { getAlgorithmDiagnostics, clearAlgorithmDiagnostics } from './diagnostics'

export {
  fetchDecks,
  fetchDeckCards,
  fetchAllCards,
  listCardsByTag,
  getDeckNameMap,
  fetchDailyQuestCards,
  getDeckHomeMetadata,
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

export { fetchGamificationProfile, fetchCardSuccessStats } from './gamification'

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

export {
  normalizeTags,
  getVideoNote,
  listVideoNotes,
  listObjectivesWithNotes,
  listAllVideoNoteTags,
  listRelatedVideoNoteTags,
  listNotesLinkingTo,
  saveVideoNote,
  deleteVideoNote,
} from './videoNotes'

export {
  saveVideoBlob,
  getVideoBlob,
  deleteVideoDownload,
  listVideoDownloads,
  getDownloadsTotalSize,
  type SaveVideoBlobInput,
} from './videoDownloads'
