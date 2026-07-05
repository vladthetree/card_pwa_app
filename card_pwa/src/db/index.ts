/**
 * AI_CONTEXT:
 * Role: Dexie IndexedDB schema, record interfaces, table declarations, and migrations for the offline-first learning database.
 * Used by: all db/queries modules, profile/sync services, hooks, backup, imports, and video offline storage.
 * Important: Data model changes must be expressed as Dexie version migrations and kept compatible with sync, backup, and import normalization.
 */
import Dexie, { type Table } from 'dexie'
import { DATABASE_NAMES } from '../constants/appIdentity'
import { buildSecurityDeckHierarchyPlan } from '../utils/securityDeckHierarchy'
import { extractTags } from '../utils/videoTags'
import { normalizeTagId, stripTagPrefix } from '../utils/tagIdentity'

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
  parentDeckId?: string | null
  createdAt: number
  updatedAt?: number
  source: 'anki-import' | 'manual' | 'system'
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
  opId?: string
  cardId: string
  rating: 1 | 2 | 3 | 4
  timeMs: number
  timestamp: number
  sourceClient?: string
  createdAt?: number
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

/**
 * Freitext-Notizzettel zu einem Lernvideo (Desktop-Videomodus). Über `objective`
 * /`videoId` mit dem jeweiligen Professor-Messer-Video verbunden; `tags` werden
 * aus den Inline-`#tags` des Inhalts abgeleitet und verknüpfen Notizen.
 *
 * Notizen sind PRO PROFIL getrennt: der Primary Key ist das Paar
 * `[profileId+objective]`, damit z. B. das Profil „Vlad" eigene Notizen pro
 * Objective führt, ohne dass andere Profile sie sehen.
 * `profileId` ist der Profil-Scope (verlinkt: userId, sonst 'local').
 */
export interface VideoNoteRecord {
  profileId: string   // Profil-Scope (Teil des Compound-Primary-Keys)
  objective: string   // SY0-701-Objective-Code (z. B. "1.2"), vgl. LocalVideoMeta.objective
  videoId: string
  content: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

/**
 * Offline-Kopie eines selbst gehosteten Lernvideos. Metadaten und der (große)
 * Blob liegen bewusst getrennt: Listen/Statusanzeigen lesen nur `videoDownloads`
 * (klein), die eigentliche Datei kommt erst beim Abspielen aus `videoBlobs`.
 */
export interface VideoDownloadRecord {
  file: string        // Primary key — Originaldateiname der .mp4
  objective: string
  title: string
  size: number        // Bytes
  createdAt: number
}

export interface VideoBlobRecord {
  file: string        // Primary key — Originaldateiname der .mp4
  blob: Blob
}

/**
 * Tag-Metadaten für Video-Notiz-Tags (Obsidian-artige Tag-Pflege). Der Notiztext
 * bleibt die QUELLE der Inline-`#tags`; dieser Record ergänzt nur Bedeutung pro
 * Tag: Anzeige-Label, Beschreibung, Farbe, Pin, Aliase, Archiv-Status. Pro Profil
 * getrennt (Compound-Primary-Key `[profileId+tagId]`); `tagId` ist immer eine
 * kanonische `normalizeTagId(...)`, `aliases` sind ebenfalls normalisierte IDs.
 */
export interface VideoTagMetaRecord {
  profileId: string   // Profil-Scope (Teil des Compound-Primary-Keys)
  tagId: string       // kanonische Tag-ID (normalizeTagId)
  label: string       // Anzeigeform, z. B. "Zero Trust"
  aliases: string[]   // normalisierte Tag-IDs, die auf diesen Tag auflösen
  description: string
  color: string | null
  icon: string | null
  pinned: boolean
  archived: boolean   // nicht mehr aktiv anzeigen, Inhalte bleiben erhalten
  createdAt: number
  updatedAt: number
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
  videoNotes2!: Table<VideoNoteRecord, [string, string]>
  videoDownloads!: Table<VideoDownloadRecord, string>
  videoBlobs!: Table<VideoBlobRecord, string>
  videoTagMeta!: Table<VideoTagMetaRecord, [string, string]>

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

    // Version 13: Add deck hierarchy support (parentDeckId) and seed the
    // Security+ SY0-701 objective subdecks under the five default domains.
    this.version(13)
      .stores({
        decks: 'id, name, parentDeckId, createdAt, isDeleted',
        cards: 'id, noteId, deckId, type, due, dueAt, createdAt, algorithm, stability, difficulty, isDeleted, [deckId+due], [deckId+dueAt], [deckId+algorithm], [deckId+type], [deckId+stability], [deckId+difficulty]',
        reviews: '++id, cardId, timestamp, rating, [cardId+timestamp], [timestamp+rating]',
        activeSessions: 'id, updatedAt',
        syncMeta: 'key',
        profile: 'id',
        cardStats: 'cardId, deckId, updatedAt, [deckId+updatedAt]',
        deckProgress: 'deckId, updatedAt',
        shuffleCollections: 'id, updatedAt, isDeleted',
      })
      .upgrade(async tx => {
        const deckTable = tx.table<DeckRecord, string>('decks')
        const decks = await deckTable.toArray()
        const plan = buildSecurityDeckHierarchyPlan(decks)

        if (plan.upserts.length > 0) {
          await deckTable.bulkPut(plan.upserts)
        }

        for (const update of plan.updates) {
          await deckTable.update(update.id, update.changes)
        }
      })

    // Version 14: Add videoNotes table — per-video notepad with tags for the
    // desktop video mode. Multi-entry index on tags enables tag-based lookup.
    this.version(14).stores({
      decks: 'id, name, parentDeckId, createdAt, isDeleted',
      cards: 'id, noteId, deckId, type, due, dueAt, createdAt, algorithm, stability, difficulty, isDeleted, [deckId+due], [deckId+dueAt], [deckId+algorithm], [deckId+type], [deckId+stability], [deckId+difficulty]',
      reviews: '++id, cardId, timestamp, rating, [cardId+timestamp], [timestamp+rating]',
      activeSessions: 'id, updatedAt',
      syncMeta: 'key',
      profile: 'id',
      cardStats: 'cardId, deckId, updatedAt, [deckId+updatedAt]',
      deckProgress: 'deckId, updatedAt',
      shuffleCollections: 'id, updatedAt, isDeleted',
      videoNotes: 'objective, videoId, updatedAt, *tags',
    })

    // Version 15: Offline-Kopien selbst gehosteter Lernvideos. Metadaten und
    // Blob getrennt, damit Listen die großen Blobs nicht laden müssen.
    this.version(15).stores({
      decks: 'id, name, parentDeckId, createdAt, isDeleted',
      cards: 'id, noteId, deckId, type, due, dueAt, createdAt, algorithm, stability, difficulty, isDeleted, [deckId+due], [deckId+dueAt], [deckId+algorithm], [deckId+type], [deckId+stability], [deckId+difficulty]',
      reviews: '++id, cardId, timestamp, rating, [cardId+timestamp], [timestamp+rating]',
      activeSessions: 'id, updatedAt',
      syncMeta: 'key',
      profile: 'id',
      cardStats: 'cardId, deckId, updatedAt, [deckId+updatedAt]',
      deckProgress: 'deckId, updatedAt',
      shuffleCollections: 'id, updatedAt, isDeleted',
      videoNotes: 'objective, videoId, updatedAt, *tags',
      videoDownloads: 'file, objective, createdAt',
      videoBlobs: 'file',
    })

    // Version 16: Index-Pruning. Ein Audit zeigte, dass keine Query je die
    // Compound-Indizes oder die Felder stability/difficulty/algorithm/due/dueAt/
    // createdAt als Index-Einstieg nutzt — Filter laufen in JS nach einem
    // where('deckId')-Fetch. Diese Indizes waren reiner Schreib-Overhead (jede
    // Kartenschreibung pflegte 17 statt 4 Index-Bäume; teuer bei Anki-Importen).
    // Entfernt werden sie auf den drei schreibintensiven Tabellen; `isDeleted`
    // (cards) und `updatedAt` (cardStats) bleiben als Reserve für künftige
    // Purge-/Delta-Sync-Queries. Korrektheits-neutral: kein genutzter Index
    // entfällt, kein Daten-Transform nötig — Dexie baut nur die Indexmenge neu.
    // Nicht aufgeführte Tabellen behalten ihr v15-Schema unverändert.
    this.version(16).stores({
      cards: 'id, noteId, deckId, type, isDeleted',
      reviews: '++id, cardId, timestamp',
      cardStats: 'cardId, updatedAt',
    })

    // Version 17: Tags wandern in den Notiztext (Inline-`#tag`). Das frühere
    // separate Tag-Eingabefeld entfällt; damit bestehende Chip-Tags nicht
    // verloren gehen, werden sie als `#tag` an den Inhalt angehängt (Leerzeichen
    // → `-`) und `tags` anschließend aus dem Inhalt neu abgeleitet. Primary Key
    // unverändert — nur Datentransform.
    this.version(17)
      .stores({
        videoNotes: 'objective, videoId, updatedAt, *tags',
      })
      .upgrade(async tx => {
        await tx.table('videoNotes').toCollection().modify((note: VideoNoteRecord) => {
          if (!note.tags || note.tags.length === 0) return
          const inlineKeys = new Set(extractTags(note.content).map(tag => tag.toLowerCase()))
          const missing = note.tags
            .map(tag => tag.trim())
            .filter(tag => tag && !inlineKeys.has(tag.toLowerCase()))
          if (missing.length === 0) return
          const appended = missing.map(tag => `#${tag.replace(/\s+/g, '-')}`).join(' ')
          note.content = note.content ? `${note.content}\n\n${appended}` : appended
          note.tags = extractTags(note.content)
        })
      })

    // Version 18: Notizen werden PRO PROFIL getrennt. Dexie kann den Primary Key
    // einer bestehenden Tabelle NICHT ändern ("Not yet support for changing
    // primary key"), daher wird eine NEUE Tabelle `videoNotes2` mit
    // Compound-Primary-Key `[profileId+objective]` angelegt und der Bestand aus
    // der alten `videoNotes` hineinkopiert (dem aktuell aktiven Profil
    // zugeordnet: verlinkt → userId, sonst 'local'). Die alte Tabelle bleibt in
    // v18 lesbar und wird erst in v19 verworfen.
    this.version(18)
      .stores({
        videoNotes2: '[profileId+objective], videoId, updatedAt, *tags, profileId',
      })
      .upgrade(async tx => {
        const oldRows = await tx.table('videoNotes').toArray()
        if (oldRows.length === 0) return
        const profile = await tx.table('profile').get('current')
        const scope = profile?.mode === 'linked' && profile.userId ? profile.userId : 'local'
        const migrated = oldRows.map(row => {
          // Alt-Chip-Tags defensiv in den Content falten (falls v17 nicht lief).
          let content: string = row.content ?? ''
          const inlineKeys = new Set(extractTags(content).map(tag => tag.toLowerCase()))
          const missing: string[] = (row.tags ?? [])
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag && !inlineKeys.has(tag.toLowerCase()))
          if (missing.length > 0) {
            const appended = missing.map(tag => `#${tag.replace(/\s+/g, '-')}`).join(' ')
            content = content ? `${content}\n\n${appended}` : appended
          }
          return {
            profileId: scope,
            objective: row.objective,
            videoId: row.videoId,
            content,
            tags: extractTags(content),
            createdAt: row.createdAt ?? Date.now(),
            updatedAt: row.updatedAt ?? Date.now(),
          }
        })
        await tx.table('videoNotes2').bulkPut(migrated)
      })

    // Version 19: alte (profilübergreifende) `videoNotes`-Tabelle verwerfen — der
    // Bestand liegt seit v18 in `videoNotes2`.
    this.version(19).stores({
      videoNotes: null,
    })

    // Version 20: Tag-Metadaten für Video-Notiz-Tags. Bewusst SCHLANKER Index als
    // ein „alles indexieren"-Schema: Primary Key `[profileId+tagId]`, dazu nur
    // `profileId` (Profil-Scope-Scans) und der Multi-Entry-Index `*aliases`
    // (Alias-Auflösung). label/pinned/archived bleiben uneindiziert — sie werden
    // ohnehin in JS gefiltert/sortiert, und v16 hat genau solche reinen
    // Schreib-Overhead-Indizes absichtlich entfernt. Migration: bestehende
    // Inline-Tags aus `videoNotes2` PRO PROFIL als Meta-Datensätze backfillen
    // (label = erste gefundene Schreibweise); Notiztexte bleiben unverändert.
    this.version(20)
      .stores({
        videoTagMeta: '[profileId+tagId], profileId, *aliases',
      })
      .upgrade(async tx => {
        const notes = await tx.table('videoNotes2').toArray()
        if (notes.length === 0) return
        const now = Date.now()
        const seen = new Set<string>()
        const records: VideoTagMetaRecord[] = []
        for (const note of notes) {
          const profileId: string = note.profileId
          for (const rawTag of (note.tags ?? []) as string[]) {
            const tagId = normalizeTagId(rawTag)
            if (!tagId) continue
            const key = `${profileId}\u0000${tagId}`
            if (seen.has(key)) continue
            seen.add(key)
            records.push({
              profileId,
              tagId,
              label: stripTagPrefix(rawTag) || tagId,
              aliases: [],
              description: '',
              color: null,
              icon: null,
              pinned: false,
              archived: false,
              createdAt: now,
              updatedAt: now,
            })
          }
        }
        if (records.length > 0) await tx.table('videoTagMeta').bulkPut(records)
      })
  }
}

export const db = new CardPwaDB()
