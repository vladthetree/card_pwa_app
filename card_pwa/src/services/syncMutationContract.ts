/**
 * AI_CONTEXT:
 * Role: Machine-readable contract for every outbound/inbound sync operation.
 * Used by: architecture tests and future sync changes that need one canonical
 * mutation matrix instead of scattered comments.
 * Important: Keep this exhaustive with SyncOperationType; a new operation type
 * should fail TypeScript here until its local write, queue, pull, idempotency,
 * and scope behavior are documented.
 */
import type { SyncOperationType } from './syncQueue'

type SyncQueueSource = 'direct-queue' | 'transactional-outbox' | 'derived-dependency'
type SyncScopeRule = 'selected-deck' | 'selected-deck-or-existing-card' | 'global' | 'always'
type PullEffect =
  | 'deck-upsert'
  | 'deck-tombstone'
  | 'card-upsert'
  | 'card-tombstone'
  | 'review-append'
  | 'review-compensation'
  | 'progress-reset'
  | 'shuffle-upsert'
  | 'shuffle-tombstone'
  | 'video-note-upsert'
  | 'video-note-tombstone'
  | 'settings-upsert'

export interface SyncMutationContractEntry {
  readonly localMutation: string
  readonly queueSource: SyncQueueSource
  readonly queueProducer: readonly string[]
  readonly pullEffect: PullEffect
  readonly idempotency: string
  readonly scopeRule: SyncScopeRule
  readonly notes?: string
}

export const SYNC_MUTATION_CONTRACT = {
  review: {
    localMutation: 'Record one study review and update card scheduling state.',
    queueSource: 'transactional-outbox',
    queueProducer: ['db/queries/reviews.ts:recordReview'],
    pullEffect: 'review-append',
    idempotency: 'Review opId is persisted and remote opIds are tracked as applied.',
    scopeRule: 'selected-deck-or-existing-card',
  },
  'review.undo': {
    localMutation: 'Delete one review and restore the previous card scheduling state.',
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/reviews.ts:undoReview'],
    pullEffect: 'review-compensation',
    idempotency: 'Compensation is keyed by reviewId/cardId and protected by applied remote opIds.',
    scopeRule: 'selected-deck-or-existing-card',
  },
  'card.create': {
    localMutation: 'Create a card in a deck.',
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/cards.ts:createCard', 'utils/import/importPipeline.ts:executeImport'],
    pullEffect: 'card-upsert',
    idempotency: 'Card id is stable; remote application upserts by id.',
    scopeRule: 'selected-deck',
  },
  'card.update': {
    localMutation: 'Update card content or scheduling fields.',
    queueSource: 'direct-queue',
    queueProducer: [
      'db/queries/cards.ts:updateCard',
      'services/algorithmMigration.ts:migrateCardsForAlgorithm',
      'utils/import/importPipeline.ts:executeImport',
    ],
    pullEffect: 'card-upsert',
    idempotency: 'Card id is stable; conflict resolution compares scheduling/content timestamps.',
    scopeRule: 'selected-deck-or-existing-card',
  },
  'card.delete': {
    localMutation: 'Soft-delete a card and hard-delete its local reviews.',
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/cards.ts:deleteCard'],
    pullEffect: 'card-tombstone',
    idempotency: 'Card tombstone is timestamped and can be re-applied safely.',
    scopeRule: 'selected-deck-or-existing-card',
  },
  'card.schedule.forceTomorrow': {
    localMutation: 'Force one card to be due tomorrow.',
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/reviews.ts:forceCardReviewTomorrow'],
    pullEffect: 'card-upsert',
    idempotency: 'Card id is stable; operation carries timestamped scheduling updates.',
    scopeRule: 'selected-deck-or-existing-card',
  },
  'deck.create': {
    localMutation: 'Create or announce a deck that has syncable card content.',
    queueSource: 'derived-dependency',
    queueProducer: [
      'db/queries/cards.ts:enqueueDeckCreateChain',
      'utils/import/importPipeline.ts:executeImport',
      'services/deckHierarchy.ts',
    ],
    pullEffect: 'deck-upsert',
    idempotency: 'Deck id is stable; remote application upserts by id.',
    scopeRule: 'selected-deck',
    notes: 'createDeck() intentionally creates an empty local deck without enqueueing; tests cover that behavior.',
  },
  'deck.delete': {
    localMutation: 'Soft-delete a deck subtree and affected cards.',
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/decks.ts:deleteDeck'],
    pullEffect: 'deck-tombstone',
    idempotency: 'Deck/card tombstones carry timestamps and can be re-applied safely.',
    scopeRule: 'selected-deck',
  },
  'shuffleCollection.upsert': {
    localMutation: 'Create or update a shuffle collection.',
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/shuffleCollections.ts:createShuffleCollection/updateShuffleCollection'],
    pullEffect: 'shuffle-upsert',
    idempotency: 'Shuffle collection id is stable; remote application upserts by id.',
    scopeRule: 'always',
  },
  'shuffleCollection.delete': {
    localMutation: 'Soft-delete a shuffle collection.',
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/shuffleCollections.ts:deleteShuffleCollection'],
    pullEffect: 'shuffle-tombstone',
    idempotency: 'Shuffle collection tombstone is timestamped and can be re-applied safely.',
    scopeRule: 'always',
  },
  'videoNote.upsert': {
    localMutation: 'Create or update a profile-scoped video note.',
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/videoNotes.ts:saveVideoNote'],
    pullEffect: 'video-note-upsert',
    idempotency: 'Compound profileId/objective key is stable; remote application upserts by key.',
    scopeRule: 'global',
  },
  'videoNote.delete': {
    localMutation: 'Delete a profile-scoped video note.',
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/videoNotes.ts:saveVideoNote/deleteVideoNote'],
    pullEffect: 'video-note-tombstone',
    idempotency: 'Compound profileId/objective delete is timestamped and can be re-applied safely.',
    scopeRule: 'global',
  },
  'progress.reset': {
    localMutation: 'Reset all card scheduling state and clear review-derived history.',
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/reviews.ts:resetLearningProgress'],
    pullEffect: 'progress-reset',
    idempotency: 'Global timestamped reset is applied as a dedicated operation, not as normal card.update.',
    scopeRule: 'global',
  },
  'examDate.upsert': {
    localMutation: 'Update the profile-scoped exam date setting.',
    queueSource: 'direct-queue',
    queueProducer: ['contexts/SettingsContext.tsx:setExamDate'],
    pullEffect: 'settings-upsert',
    idempotency: 'Exam date update carries updatedAt and refreshes local settings state.',
    scopeRule: 'global',
  },
} as const satisfies Record<SyncOperationType, SyncMutationContractEntry>

export const SYNC_OPERATION_TYPES = Object.keys(SYNC_MUTATION_CONTRACT) as SyncOperationType[]
