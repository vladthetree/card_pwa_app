import Dexie, { type Table } from 'dexie'
import { BACKUP_METADATA, DATABASE_NAMES, STORAGE_KEYS } from '../constants/appIdentity'

interface LegacyDeckRecord {
  id: string
  name: string
  createdAt: number
  source: 'anki-import' | 'manual'
}

interface LegacyCardRecord {
  id: string
  noteId: string
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
  type: number
  queue: number
  due: number
  interval: number
  factor: number
  stability?: number
  difficulty?: number
  reps: number
  lapses: number
  createdAt: number
}

interface LegacyReviewRecord {
  id?: number
  cardId: string
  rating: 1 | 2 | 3 | 4
  timeMs: number
  timestamp: number
}

interface SyncQueueRecord {
  id?: number
  opId: string
  type: string
  payload: string
  createdAt: number
  updatedAt: number
  retries: number
  nextRetryAt: number
}

class LegacyMainDb extends Dexie {
  decks!: Table<LegacyDeckRecord, string>
  cards!: Table<LegacyCardRecord, string>
  reviews!: Table<LegacyReviewRecord, number>

  constructor(name: string) {
    super(name)

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
  }
}

class MainDb extends Dexie {
  decks!: Table<LegacyDeckRecord, string>
  cards!: Table<LegacyCardRecord, string>
  reviews!: Table<LegacyReviewRecord, number>

  constructor(name: string) {
    super(name)

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
  }
}

class LegacySyncDb extends Dexie {
  queue!: Table<SyncQueueRecord, number>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      queue: '++id, opId, type, nextRetryAt, createdAt',
    })
  }
}

function migrateLocalStorageKey(target: string, source: string): void {
  const targetValue = localStorage.getItem(target)
  if (targetValue !== null) return

  const sourceValue = localStorage.getItem(source)
  if (sourceValue === null) return

  localStorage.setItem(target, sourceValue)
}

async function migrateMainDatabase(): Promise<void> {
  const hasNew = await Dexie.exists(DATABASE_NAMES.app)
  const hasLegacy = await Dexie.exists(DATABASE_NAMES.legacyApp)

  if (hasNew || !hasLegacy) return

  const source = new LegacyMainDb(DATABASE_NAMES.legacyApp)
  const target = new MainDb(DATABASE_NAMES.app)

  try {
    const [decks, cards, reviews] = await Promise.all([
      source.decks.toArray(),
      source.cards.toArray(),
      source.reviews.toArray(),
    ])

    await target.transaction('rw', target.decks, target.cards, target.reviews, async () => {
      if (decks.length > 0) await target.decks.bulkPut(decks)
      if (cards.length > 0) await target.cards.bulkPut(cards)
      if (reviews.length > 0) await target.reviews.bulkPut(reviews)
    })
  } finally {
    await source.close()
    await target.close()
  }
}

async function migrateSyncQueueDatabase(): Promise<void> {
  const hasNew = await Dexie.exists(DATABASE_NAMES.syncQueue)
  const hasLegacy = await Dexie.exists(DATABASE_NAMES.legacySyncQueue)

  if (hasNew || !hasLegacy) return

  const source = new LegacySyncDb(DATABASE_NAMES.legacySyncQueue)
  const target = new LegacySyncDb(DATABASE_NAMES.syncQueue)

  try {
    const rows = await source.queue.toArray()
    if (rows.length > 0) {
      await target.queue.bulkPut(rows)
    }
  } finally {
    await source.close()
    await target.close()
  }
}

function migrateBackupMetadataCompatibilityFlags(): void {
  const oldMarker = localStorage.getItem(BACKUP_METADATA.legacyMarker)
  if (oldMarker && !localStorage.getItem(BACKUP_METADATA.marker)) {
    localStorage.setItem(BACKUP_METADATA.marker, oldMarker)
  }
}

export async function migrateCardPwaBrandingData(): Promise<void> {
  if (localStorage.getItem(STORAGE_KEYS.brandingMigration) === 'done') return

  migrateLocalStorageKey(STORAGE_KEYS.settings, STORAGE_KEYS.legacySettings)
  migrateLocalStorageKey(STORAGE_KEYS.theme, STORAGE_KEYS.legacyTheme)
  migrateLocalStorageKey(STORAGE_KEYS.studySession, STORAGE_KEYS.legacyStudySession)
  migrateLocalStorageKey(STORAGE_KEYS.algorithmMigration, STORAGE_KEYS.legacyAlgorithmMigration)
  migrateBackupMetadataCompatibilityFlags()

  await migrateMainDatabase()
  await migrateSyncQueueDatabase()

  localStorage.setItem(STORAGE_KEYS.brandingMigration, 'done')
}
