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
type SyncServerOperation = 'POST /sync'
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
  readonly requiresTransactionalOutbox: boolean
  readonly queueSource: SyncQueueSource
  readonly queueProducer: readonly string[]
  readonly serverOperation: SyncServerOperation
  readonly pullEffect: PullEffect
  readonly idempotency: string
  readonly scopeRule: SyncScopeRule
  readonly tests: readonly string[]
  readonly notes?: string
}

export const SYNC_MUTATION_CONTRACT = {
  review: {
    localMutation: 'Record one study review and update card scheduling state.',
    requiresTransactionalOutbox: true,
    queueSource: 'transactional-outbox',
    queueProducer: ['db/queries/reviews.ts:recordReview'],
    serverOperation: 'POST /sync',
    pullEffect: 'review-append',
    idempotency: 'Review opId is persisted and remote opIds are tracked as applied.',
    scopeRule: 'selected-deck-or-existing-card',
    tests: [
      'src/__tests__/services/sync-mutation-contract.test.ts',
      'src/__tests__/integration/record-review-flow.test.ts',
    ],
  },
  'review.undo': {
    localMutation: 'Delete one review and restore the previous card scheduling state.',
    requiresTransactionalOutbox: false,
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/reviews.ts:undoReview'],
    serverOperation: 'POST /sync',
    pullEffect: 'review-compensation',
    idempotency: 'Compensation is keyed by reviewId/cardId and protected by applied remote opIds.',
    scopeRule: 'selected-deck-or-existing-card',
    tests: [
      'src/__tests__/services/sync-mutation-contract.test.ts',
      'src/__tests__/db/reset-learning-progress.test.ts',
    ],
  },
  'card.create': {
    localMutation: 'Create a card in a deck.',
    requiresTransactionalOutbox: false,
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/cards.ts:createCard', 'utils/import/importPipeline.ts:executeImport'],
    serverOperation: 'POST /sync',
    pullEffect: 'card-upsert',
    idempotency: 'Card id is stable; remote application upserts by id.',
    scopeRule: 'selected-deck',
    tests: [
      'src/__tests__/services/sync-mutation-contract.test.ts',
      'src/__tests__/db/card-create-sync-deck.test.ts',
    ],
  },
  'card.update': {
    localMutation: 'Update card content or scheduling fields.',
    requiresTransactionalOutbox: false,
    queueSource: 'direct-queue',
    queueProducer: [
      'db/queries/cards.ts:updateCard',
      'db/queries/cards.ts:recordCardStudySessionAppearance/recordFirstCardAnswerTime',
      'services/algorithmMigration.ts:migrateCardsForAlgorithm',
      'utils/import/importPipeline.ts:executeImport',
    ],
    serverOperation: 'POST /sync',
    pullEffect: 'card-upsert',
    idempotency: 'Card id is stable; conflict resolution compares scheduling/content timestamps.',
    scopeRule: 'selected-deck-or-existing-card',
    tests: [
      'src/__tests__/services/sync-mutation-contract.test.ts',
      'src/__tests__/db/card-save-local.test.ts',
    ],
  },
  'card.delete': {
    localMutation: 'Soft-delete a card and hard-delete its local reviews.',
    requiresTransactionalOutbox: false,
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/cards.ts:deleteCard'],
    serverOperation: 'POST /sync',
    pullEffect: 'card-tombstone',
    idempotency: 'Card tombstone is timestamped and can be re-applied safely.',
    scopeRule: 'selected-deck-or-existing-card',
    tests: [
      'src/__tests__/services/sync-mutation-contract.test.ts',
      'src/__tests__/db/card-save-local.test.ts',
    ],
  },
  'card.schedule.forceTomorrow': {
    localMutation: 'Force one card to be due tomorrow.',
    requiresTransactionalOutbox: false,
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/reviews.ts:forceCardReviewTomorrow'],
    serverOperation: 'POST /sync',
    pullEffect: 'card-upsert',
    idempotency: 'Card id is stable; operation carries timestamped scheduling updates.',
    scopeRule: 'selected-deck-or-existing-card',
    tests: [
      'src/__tests__/services/sync-mutation-contract.test.ts',
      'src/__tests__/integration/record-review-flow.test.ts',
    ],
  },
  'deck.create': {
    localMutation: 'Create or announce a deck that has syncable card content.',
    requiresTransactionalOutbox: false,
    queueSource: 'derived-dependency',
    queueProducer: [
      'db/queries/cards.ts:enqueueDeckCreateChain',
      'utils/import/importPipeline.ts:executeImport',
      'services/deckHierarchy.ts',
    ],
    serverOperation: 'POST /sync',
    pullEffect: 'deck-upsert',
    idempotency: 'Deck id is stable; remote application upserts by id.',
    scopeRule: 'selected-deck',
    tests: [
      'src/__tests__/services/sync-mutation-contract.test.ts',
      'src/__tests__/db/deck-create.test.ts',
    ],
    notes: 'createDeck() intentionally creates an empty local deck without enqueueing; tests cover that behavior.',
  },
  'deck.delete': {
    localMutation: 'Soft-delete a deck subtree and affected cards.',
    requiresTransactionalOutbox: false,
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/decks.ts:deleteDeck'],
    serverOperation: 'POST /sync',
    pullEffect: 'deck-tombstone',
    idempotency: 'Deck/card tombstones carry timestamps and can be re-applied safely.',
    scopeRule: 'selected-deck',
    tests: [
      'src/__tests__/services/sync-mutation-contract.test.ts',
      'src/__tests__/db/deck-create.test.ts',
    ],
  },
  'shuffleCollection.upsert': {
    localMutation: 'Create or update a shuffle collection.',
    requiresTransactionalOutbox: false,
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/shuffleCollections.ts:createShuffleCollection/updateShuffleCollection'],
    serverOperation: 'POST /sync',
    pullEffect: 'shuffle-upsert',
    idempotency: 'Shuffle collection id is stable; remote application upserts by id.',
    scopeRule: 'always',
    tests: [
      'src/__tests__/services/sync-mutation-contract.test.ts',
      'src/__tests__/db/shuffle-collections.test.ts',
    ],
  },
  'shuffleCollection.delete': {
    localMutation: 'Soft-delete a shuffle collection.',
    requiresTransactionalOutbox: false,
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/shuffleCollections.ts:deleteShuffleCollection'],
    serverOperation: 'POST /sync',
    pullEffect: 'shuffle-tombstone',
    idempotency: 'Shuffle collection tombstone is timestamped and can be re-applied safely.',
    scopeRule: 'always',
    tests: [
      'src/__tests__/services/sync-mutation-contract.test.ts',
      'src/__tests__/db/shuffle-collections.test.ts',
    ],
  },
  'videoNote.upsert': {
    localMutation: 'Create or update a profile-scoped video note.',
    requiresTransactionalOutbox: false,
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/videoNotes.ts:saveVideoNote'],
    serverOperation: 'POST /sync',
    pullEffect: 'video-note-upsert',
    idempotency: 'Compound profileId/objective key is stable; remote application upserts by key.',
    scopeRule: 'global',
    tests: [
      'src/__tests__/services/sync-mutation-contract.test.ts',
      'src/__tests__/db/video-notes-sync.test.ts',
    ],
  },
  'videoNote.delete': {
    localMutation: 'Delete a profile-scoped video note.',
    requiresTransactionalOutbox: false,
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/videoNotes.ts:saveVideoNote/deleteVideoNote'],
    serverOperation: 'POST /sync',
    pullEffect: 'video-note-tombstone',
    idempotency: 'Compound profileId/objective delete is timestamped and can be re-applied safely.',
    scopeRule: 'global',
    tests: [
      'src/__tests__/services/sync-mutation-contract.test.ts',
      'src/__tests__/db/video-notes-sync.test.ts',
    ],
  },
  'progress.reset': {
    localMutation: 'Reset all card scheduling state and clear review-derived history.',
    requiresTransactionalOutbox: false,
    queueSource: 'direct-queue',
    queueProducer: ['db/queries/reviews.ts:resetLearningProgress'],
    serverOperation: 'POST /sync',
    pullEffect: 'progress-reset',
    idempotency: 'Global timestamped reset is applied as a dedicated operation, not as normal card.update.',
    scopeRule: 'global',
    tests: [
      'src/__tests__/services/sync-mutation-contract.test.ts',
      'src/__tests__/db/reset-learning-progress.test.ts',
    ],
  },
  'examDate.upsert': {
    localMutation: 'Update the complete profile-scoped learning plan, including its exam date.',
    requiresTransactionalOutbox: false,
    queueSource: 'direct-queue',
    queueProducer: [
      'contexts/SettingsContext.tsx:setExamDate',
      'components/settings/SettingsLearningSection.tsx:handleSavePlan',
    ],
    serverOperation: 'POST /sync',
    pullEffect: 'settings-upsert',
    idempotency: 'Learning-plan update carries updatedAt; pull applies profile-scoped last-write-wins.',
    scopeRule: 'global',
    tests: [
      'src/__tests__/services/sync-mutation-contract.test.ts',
      'src/__tests__/utils/settings-new-cards-exam.test.ts',
    ],
  },
} as const satisfies Record<SyncOperationType, SyncMutationContractEntry>

export const SYNC_OPERATION_TYPES = Object.keys(SYNC_MUTATION_CONTRACT) as SyncOperationType[]
