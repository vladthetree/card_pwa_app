import Dexie, { type Table } from 'dexie'
import { DATABASE_NAMES } from '../constants/appIdentity'

// ─── Record Types (IndexedDB Storage Format) ────────────────────────────────

/** Snapshot of scheduling parameters saved before an algorithm migration so the
 *  migration can be reversed without data loss (Issue #7). */
export interface CardMigrationMetadata {
  preMigrationAlgorithm: 'sm2' | 'fsrs'
  preMigrationFactor?: number        // SM-2 ease × 1000
  preMigrationInterval?: number      // SM-2 interval in days
  preMigrationStability?: number     // FSRS stability
  preMigrationDifficulty?: number    // FSRS difficulty
  migratedAt: number                 // epoch ms
}

export interface DeckRecord {
  id: string
  name: string
  createdAt: number
  updatedAt?: number
  source: 'anki-import' | 'manual'
  /** Tombstone: set to true on soft-delete; filters the deck from all active queries. */
  isDeleted?: boolean
  deletedAt?: number
}

export interface CardRecord {
  id: string        // Anki card ID or UUID for manual cards
  noteId: string    // Anki note GUID — used for duplicate detection
  deckId: string
  front: string
  back: string
  tags: string[]
  extra: {
    acronym: string
    examples: string
    port: string
    protocol: string
  }
  // SM-2 scheduling (Anki integer format)
  type: number      // 0=new, 1=learning, 2=review, 3=relearning
  queue: number     // 0=new, 1=learning, 2=review, -1=suspended
  due: number       // days since epoch (review) or steps (learning)
  dueAt?: number    // unix ms timestamp for intraday scheduling
  interval: number  // days
  factor: number    // ease × 1000 internally (e.g. 2500 = 2.5×)
  stability?: number
  difficulty?: number
  reps: number
  lapses: number
  createdAt: number
  updatedAt?: number
  algorithm?: 'sm2' | 'fsrs'
  /** Tombstone: set to true on soft-delete; filters the card from all active queries. */
  isDeleted?: boolean
  deletedAt?: number
  /** Pre-migration snapshot for non-destructive algorithm switching (Issue #7). */
  metadata?: CardMigrationMetadata
}

export interface ReviewRecord {
  id?: number       // auto-increment primary key
  cardId: string
  rating: 1 | 2 | 3 | 4
  timeMs: number
  timestamp: number
}

/** Active study session state persisted in IndexedDB so it survives across
 *  page reloads without relying on localStorage. Primary key is deckId. */
export interface ActiveSessionRecord {
  id: string        // deckId
  payload: string   // JSON-stringified PersistedStudySession
  updatedAt: number
}

/** Key-value store for sync runtime state (cursor, applied op IDs). */
export interface SyncMetaRecord {
  key: string
  value: unknown
  updatedAt: number
}

/** Local profile state stored in IndexedDB. Single row with id='current'. */
export interface ProfileRecord {
  id: 'current'
  mode: 'local' | 'linked'
  deviceId: string
  userId?: string
  profileToken?: string
  displayName?: string
  linkedAt?: number
  recoveryCodeShown?: boolean
  endpoint?: string
  createdAt: number
  updatedAt: number
}

/** Aggregated per-card statistics derived from reviews. Sync-relevant. */
export interface CardStatsRecord {
  cardId: string
  deckId: string
  totalReviews: number
  totalEdits: number
  lastReviewedAt?: number
  lastEditedAt?: number
  correctStreak: number
  ratingHistogram: [number, number, number, number]
  updatedAt: number
}

/** Aggregated per-deck progress snapshot for fast HomeView reads. */
export interface DeckProgressRecord {
  deckId: string
  newCount: number
  learningCount: number
  reviewCount: number
  dueCount: number
  totalReviews: number
  avgRating: number
  lastStudiedAt?: number
  updatedAt: number
}

/**
 * A user-defined logical grouping of multiple decks for cross-deck study
 * sessions (Shuffle Mode). Cards are never copied here — deckIds are soft
 * references; the source of truth for each card's origin remains Card.deckId.
 * Tombstone convention mirrors DeckRecord (isDeleted / updatedAt).
 */
export interface ShuffleCollectionRecord {
  /** e.g. "shuffle_<uuid>" — never collides with a deckId */
  id: string
  name: string
  /** Ordered list of member deck IDs (soft references). */
  deckIds: string[]
  createdAt: number
  updatedAt: number
  /** Tombstone: set true on soft-delete so future sync can reconstruct. */
  isDeleted?: boolean
  deletedAt?: number
}

// ─── Dexie Database Class ────────────────────────────────────────────────────

export class CardPwaDB extends Dexie {
  decks!: Table<DeckRecord, string>
  cards!: Table<CardRecord, string>
  reviews!: Table<ReviewRecord, number>
  activeSessions!: Table<ActiveSessionRecord, string>
  syncMeta!: Table<SyncMetaRecord, string>
  profile!: Table<ProfileRecord, string>
  cardStats!: Table<CardStatsRecord, string>
  deckProgress!: Table<DeckProgressRecord, string>
  shuffleCollections!: Table<ShuffleCollectionRecord, string>

  constructor() {
    super(DATABASE_NAMES.app)

    this.version(1).stores({
      decks: 'id, name, createdAt',
      cards: 'id, noteId, deckId, type, due, createdAt',
      reviews: '++id, cardId, timestamp',
    })

    this.version(2).stores({
      decks: 'id, name, createdAt',
      cards: 'id, noteId, deckId, type, due, createdAt, [deckId+due]',
      reviews: '++id, cardId, timestamp',
    })

    this.version(3).stores({
      decks: 'id, name, createdAt',
      cards: 'id, noteId, deckId, type, due, createdAt, [deckId+due]',
      reviews: '++id, cardId, timestamp, rating, [cardId+timestamp], [timestamp+rating]',
    })

    this.version(4)
      .stores({
        decks: 'id, name, createdAt',
        cards: 'id, noteId, deckId, type, due, createdAt, algorithm, [deckId+due], [deckId+algorithm]',
        reviews: '++id, cardId, timestamp, rating, [cardId+timestamp], [timestamp+rating]',
      })
      .upgrade(async tx => {
        await tx
          .table('cards')
          .toCollection()
          .modify((card: CardRecord) => {
            if (!card.algorithm) {
              card.algorithm = card.stability !== undefined || card.difficulty !== undefined ? 'fsrs' : 'sm2'
            }
          })
      })

    this.version(5).stores({
      decks: 'id, name, createdAt',
      cards: 'id, noteId, deckId, type, due, createdAt, algorithm, [deckId+due], [deckId+algorithm], [deckId+type]',
      reviews: '++id, cardId, timestamp, rating, [cardId+timestamp], [timestamp+rating]',
    })

    this.version(6).stores({
      decks: 'id, name, createdAt',
      cards: 'id, noteId, deckId, type, due, createdAt, algorithm, stability, difficulty, [deckId+due], [deckId+algorithm], [deckId+type], [deckId+stability], [deckId+difficulty]',
      reviews: '++id, cardId, timestamp, rating, [cardId+timestamp], [timestamp+rating]',
    })

    this.version(7)
      .stores({
        decks: 'id, name, createdAt',
        cards: 'id, noteId, deckId, type, due, dueAt, createdAt, algorithm, stability, difficulty, [deckId+due], [deckId+dueAt], [deckId+algorithm], [deckId+type], [deckId+stability], [deckId+difficulty]',
        reviews: '++id, cardId, timestamp, rating, [cardId+timestamp], [timestamp+rating]',
      })
      .upgrade(async tx => {
        await tx
          .table('cards')
          .toCollection()
          .modify((card: CardRecord) => {
            if (!Number.isFinite(card.dueAt)) {
              card.dueAt = Math.max(0, Math.floor(card.due)) * 86_400_000
            }
          })
      })

    // Version 8: Add isDeleted tombstone index for soft-deletes (Issues #3, #10)
    this.version(8).stores({
      decks: 'id, name, createdAt, isDeleted',
      cards: 'id, noteId, deckId, type, due, dueAt, createdAt, algorithm, stability, difficulty, isDeleted, [deckId+due], [deckId+dueAt], [deckId+algorithm], [deckId+type], [deckId+stability], [deckId+difficulty]',
      reviews: '++id, cardId, timestamp, rating, [cardId+timestamp], [timestamp+rating]',
    })

    // Version 9: Add activeSessions table for IndexedDB-backed session persistence
    this.version(9).stores({
      decks: 'id, name, createdAt, isDeleted',
      cards: 'id, noteId, deckId, type, due, dueAt, createdAt, algorithm, stability, difficulty, isDeleted, [deckId+due], [deckId+dueAt], [deckId+algorithm], [deckId+type], [deckId+stability], [deckId+difficulty]',
      reviews: '++id, cardId, timestamp, rating, [cardId+timestamp], [timestamp+rating]',
      activeSessions: 'id, updatedAt',
    })

    this.version(10).stores({
      decks: 'id, name, createdAt, isDeleted',
      cards: 'id, noteId, deckId, type, due, dueAt, createdAt, algorithm, stability, difficulty, isDeleted, [deckId+due], [deckId+dueAt], [deckId+algorithm], [deckId+type], [deckId+stability], [deckId+difficulty]',
      reviews: '++id, cardId, timestamp, rating, [cardId+timestamp], [timestamp+rating]',
      activeSessions: 'id, updatedAt',
      syncMeta: 'key',
    })

    // Version 11: Add profile, cardStats, deckProgress stores for profile/sync features.
    this.version(11).stores({
      decks: 'id, name, createdAt, isDeleted',
      cards: 'id, noteId, deckId, type, due, dueAt, createdAt, algorithm, stability, difficulty, isDeleted, [deckId+due], [deckId+dueAt], [deckId+algorithm], [deckId+type], [deckId+stability], [deckId+difficulty]',
      reviews: '++id, cardId, timestamp, rating, [cardId+timestamp], [timestamp+rating]',
      activeSessions: 'id, updatedAt',
      syncMeta: 'key',
      profile: 'id',
      cardStats: 'cardId, deckId, updatedAt, [deckId+updatedAt]',
      deckProgress: 'deckId, updatedAt',
    })

    // Version 12: Add logical multi-deck shuffle collections.
    this.version(12).stores({
      decks: 'id, name, createdAt, isDeleted',
      cards: 'id, noteId, deckId, type, due, dueAt, createdAt, algorithm, stability, difficulty, isDeleted, [deckId+due], [deckId+dueAt], [deckId+algorithm], [deckId+type], [deckId+stability], [deckId+difficulty]',
      reviews: '++id, cardId, timestamp, rating, [cardId+timestamp], [timestamp+rating]',
      activeSessions: 'id, updatedAt',
      syncMeta: 'key',
      profile: 'id',
      cardStats: 'cardId, deckId, updatedAt, [deckId+updatedAt]',
      deckProgress: 'deckId, updatedAt',
      shuffleCollections: 'id, updatedAt, isDeleted',
    })
  }
}

export const db = new CardPwaDB()
