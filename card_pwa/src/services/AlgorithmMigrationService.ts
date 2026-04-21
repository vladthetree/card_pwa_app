/**
 * AlgorithmMigrationService
 * Migriert Kartendaten wenn der Lernalgorithmus wechselt
 * SM2 ↔ FSRS Konvertierung für bestehende Kartendaten
 */

import { db, type CardRecord, type CardMigrationMetadata } from '../db'
import { SM2 } from '../utils/sm2'
import { difficultyToFactor, factorToDifficulty } from '../utils/algorithmParams'
import { STORAGE_KEYS } from '../constants/appIdentity'
import { enqueueSyncOperation } from './syncQueue'

const MIGRATION_KEY = STORAGE_KEYS.algorithmMigration
const CURRENT_MIGRATION_VERSION = 1
const MIGRATION_BATCH_SIZE = 250
const IS_DEV = import.meta.env.DEV

interface MigrationLog {
  version: number
  algorithm: 'sm2' | 'fsrs'
  timestamp: number
  cardsProcessed: number
}

// ─── SM2 → FSRS Konvertierung ───────────────────────────────────────────────

/**
 * Konvertiere SM2 Daten (factor, interval) zu FSRS Daten (stability, difficulty)
 * Esta ist eine Approximation, da FSRS andere Metriken verwendet
 */
function convertSM2ToFSRS(card: CardRecord): Partial<CardRecord> {
  // Factor in FSRS-Difficulty konvertieren (factor ist 1000-5000, skaliert auf 1-10)
  const difficulty = factorToDifficulty(card.factor ?? 2500)

  // Für den initialen FSRS-Start kann stability näherungsweise als aktuelles Intervall genutzt werden.
  const stability = Math.max(0.5, card.interval ?? 1)

  return {
    // Backwards-kompatibel zu bestehenden Pfaden
    factor: difficultyToFactor(difficulty),
    interval: Math.max(1, Math.round(stability)),
    dueAt: Number.isFinite(card.dueAt) ? card.dueAt : Math.max(0, Math.floor(card.due)) * 86_400_000,
    stability,
    difficulty,
    algorithm: 'fsrs',
  }
}

/**
 * Konvertiere FSRS Daten zurück zu SM2 (Fallback)
 */
function convertFSRSToSM2(card: CardRecord): Partial<CardRecord> {
  // Primär dedizierte FSRS-Felder nutzen, sonst fallback auf Legacy-Felder.
  const difficulty = card.difficulty ?? factorToDifficulty(card.factor ?? 2500)
  const interval = Math.max(1, Math.round(card.interval ?? card.stability ?? 1))
  const today = Math.floor(Date.now() / 86_400_000)

  // Konvertiere zu SM2-Factor (Ease Factor)
  const factor = difficultyToFactor(difficulty, SM2.MIN_EASE, SM2.MAX_EASE)

  return {
    factor,
    interval,
    due: today + interval,
    dueAt: (today + interval) * 86_400_000,
    algorithm: 'sm2',
  }
}

function shouldSkipMigration(card: CardRecord, targetAlgorithm: 'sm2' | 'fsrs'): boolean {
  if (targetAlgorithm === 'fsrs') {
    return card.algorithm === 'fsrs'
      && Number.isFinite(card.stability)
      && Number.isFinite(card.difficulty)
  }

  return card.algorithm === 'sm2'
    && Number.isFinite(card.factor)
    && Number.isFinite(card.interval)
}

function toMigrationUpdate(card: CardRecord, algorithm: 'sm2' | 'fsrs', nowMs: number): Partial<CardRecord> {
  const converted = algorithm === 'fsrs' ? convertSM2ToFSRS(card) : convertFSRSToSM2(card)

  // Preserve pre-migration values so the switch can be reversed without
  // losing the original scheduling data (non-destructive migration, Issue #7).
  // Only write a new snapshot if none exists yet; subsequent toggles must not
  // overwrite the original values (SM2→FSRS→SM2 would lose the true SM2 state).
  const metadata: CardMigrationMetadata = card.metadata?.migratedAt
    ? card.metadata
    : {
        preMigrationAlgorithm: card.algorithm ?? 'sm2',
        preMigrationFactor: card.factor,
        preMigrationInterval: card.interval,
        preMigrationStability: card.stability,
        preMigrationDifficulty: card.difficulty,
        migratedAt: nowMs,
      }

  return {
    ...converted,
    algorithm,
    updatedAt: nowMs,
    metadata,
  }
}

async function yieldToMainThread(): Promise<void> {
  await new Promise<void>(resolve => {
    setTimeout(resolve, 0)
  })
}

// ─── Migration Functions ────────────────────────────────────────────────────

export async function migrateCardsForAlgorithm(algorithm: 'sm2' | 'fsrs'): Promise<MigrationLog> {
  const migrationTs = Date.now()
  const rollbackSnapshots = new Map<string, Pick<CardRecord, 'factor' | 'interval' | 'due' | 'dueAt' | 'stability' | 'difficulty' | 'algorithm' | 'updatedAt'>>()
  const syncUpdates: Array<{ cardId: string; update: Partial<CardRecord> }> = []

  async function rollbackMigration(): Promise<void> {
    if (rollbackSnapshots.size === 0) return

    await db.transaction('rw', db.cards, async () => {
      for (const [cardId, snapshot] of rollbackSnapshots.entries()) {
        await db.cards.update(cardId, snapshot)
      }
    })
  }

  try {
    const cards = await db.cards.toArray()

    let processed = 0

    for (let i = 0; i < cards.length; i += MIGRATION_BATCH_SIZE) {
      const batch = cards.slice(i, i + MIGRATION_BATCH_SIZE)

      await db.transaction('rw', db.cards, async () => {
        for (const card of batch) {
          if (shouldSkipMigration(card, algorithm)) continue

          const update = toMigrationUpdate(card, algorithm, migrationTs)
          if (Object.keys(update).length === 0) continue

          if (!rollbackSnapshots.has(card.id)) {
            rollbackSnapshots.set(card.id, {
              factor: card.factor,
              interval: card.interval,
              due: card.due,
              dueAt: card.dueAt,
              stability: card.stability,
              difficulty: card.difficulty,
              algorithm: card.algorithm,
              updatedAt: card.updatedAt,
            })
          }

          await db.cards.update(card.id, update)
          syncUpdates.push({ cardId: card.id, update })
          processed += 1
        }
      })

      await yieldToMainThread()
    }

    const log: MigrationLog = {
      version: CURRENT_MIGRATION_VERSION,
      algorithm,
      timestamp: migrationTs,
      cardsProcessed: processed,
    }

    // Speichere Migration-Log im LocalStorage
    localStorage.setItem(MIGRATION_KEY, JSON.stringify(log))

    // Sync card updates so other devices receive the migration
    for (const { cardId, update } of syncUpdates) {
      await enqueueSyncOperation('card.update', {
        cardId,
        updates: update,
        // algorithmVersion lets the server enforce monotonic algorithm progression
        // so a stale SM-2 payload from another device never overwrites a card that
        // has already been migrated to FSRS (Issue #2).
        algorithmVersion: algorithm === 'fsrs' ? 2 : 1,
        timestamp: migrationTs,
      })
    }

    if (IS_DEV) {
      console.log(`[AlgorithmMigration] Migrated ${processed} cards to ${algorithm}`)
    }

    return log
  } catch (error) {
    try {
      await rollbackMigration()
      console.error('[AlgorithmMigration] Migration failed and changes were rolled back.')
    } catch (rollbackError) {
      console.error('[AlgorithmMigration] Rollback failed after migration error:', rollbackError)
    }
    console.error('[AlgorithmMigration] Error during migration:', error)
    throw error
  }
}

/**
 * Prüfe ob Migration nötig ist (beim App-Start)
 */
export function getMigrationLog(): MigrationLog | null {
  const stored = localStorage.getItem(MIGRATION_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored) as MigrationLog
  } catch {
    return null
  }
}

/**
 * Initialisierung beim App-Start
 * Prüft ob der Algorithmus sich geändert hat und migriert falls nötig
 */
export async function initializeAlgorithmMigration(currentAlgorithm: 'sm2' | 'fsrs'): Promise<void> {
  const lastLog = getMigrationLog()

  // Falls nie migriert oder Algorithmus hat sich geändert
  if (!lastLog || lastLog.algorithm !== currentAlgorithm) {
    if (IS_DEV) {
      console.log(
        `[AlgorithmMigration] Algorithm changed from ${lastLog?.algorithm ?? 'none'} to ${currentAlgorithm}, starting migration...`
      )
    }
    await migrateCardsForAlgorithm(currentAlgorithm)
    try {
      localStorage.setItem('card-pwa-migration-notice-pending', currentAlgorithm)
    } catch {
      // best effort
    }
  }
}

export function consumeMigrationNotice(): 'sm2' | 'fsrs' | null {
  try {
    const value = localStorage.getItem('card-pwa-migration-notice-pending')
    if (value === 'sm2' || value === 'fsrs') {
      localStorage.removeItem('card-pwa-migration-notice-pending')
      return value
    }
  } catch {
    // best effort
  }
  return null
}

