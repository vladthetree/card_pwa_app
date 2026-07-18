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
  listDecks,
  listDeckCards,
  listAllCards,
  listCardsByDeckIdsDirect,
  listCardsByIds,
  listCardsByTag,
  getDeckNameMap,
  pickDailyQuestCards,
  getDeckHomeMetadata,
  listDeckStudyCandidates,
  getDeckScheduleOverview,
  countTodayDueFromDecks,
  createDeck,
  deleteDeck,
} from './decks'

export { normalizeDueDates, createCard, updateCard, deleteCard } from './cards'

export {
  getGlobalStats,
  countNewCardsIntroducedToday,
  listDeckCardIdsReviewedToday,
  listDeckCardIdsReviewedSince,
  listCardIdsReviewedSince,
  getFutureDueForecast,
  getDeckSuccessRates,
  type DeckSuccessRate,
  getYoungCardLapseRate,
  type YoungCardLapseStats,
  getDeckMetricsSnapshot,
  getShuffleCollectionMetricsSnapshot,
  recordReview,
  undoReview,
  forceCardReviewTomorrow,
  resetLearningProgress,
  smoothBacklog,
} from './reviews'

export { getGamificationProfile, getTodayTrailingCombo } from './gamification'

export {
  readActiveSession,
  writeActiveSession,
  clearActiveSession,
  getResumableStudySession,
  type ResumableStudySession,
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
  type SaveVideoBlobInput,
} from './videoDownloads'

export {
  ensureVideoTagMeta,
  ensureVideoTagMetaForNote,
  listVideoTagMeta,
  getVideoTagMeta,
  updateVideoTagMeta,
  archiveVideoTag,
  resolveVideoTagId,
  listVideoTagStats,
  type VideoTagMetaPatch,
} from './videoTagMeta'
