import Dexie, { type Table } from 'dexie'
import { BACKUP_METADATA, DATABASE_NAMES } from '../constants/appIdentity'
import { supportsServiceWorker } from '../env'
import { db } from '../db'
import { logError } from './errorLog'
import { readSelectedDeckIds } from './profileService'
import {
  isSyncActive,
  getSyncConfig,
  getSyncBaseEndpoint,
  makeOpId,
  getOrCreateSyncClientId,
  fetchWithTimeout,
  SYNC_MAX_RETRIES,
  makeAuthHeaders,
} from './syncConfig'

export type SyncOperationType =
  | 'review'
  | 'review.undo'
  | 'card.create'
  | 'card.update'
  | 'card.delete'
  | 'card.schedule.forceTomorrow'
  | 'deck.create'
  | 'deck.delete'
  | 'shuffleCollection.upsert'
  | 'shuffleCollection.delete'

export interface SyncQueueRecord {
  id?: number
  opId: string
  type: SyncOperationType
  payload: string
  createdAt: number
  updatedAt: number
  retries: number
  nextRetryAt: number
}

export interface FlushOptions {
  limit?: number
}

type SendResult = 'sent' | 'deferred' | 'failed'

class SyncQueueDB extends Dexie {
  queue!: Table<SyncQueueRecord, number>

  constructor() {
    super(DATABASE_NAMES.syncQueue)
    this.version(1).stores({
      queue: '++id, opId, type, nextRetryAt, createdAt',
    })
  }
}

const syncDb = new SyncQueueDB()

function now() {
  return Date.now()
}

function nextBackoffMs(retries: number) {
  const base = 2_000
  const max = 5 * 60_000
  return Math.min(max, base * 2 ** retries)
}

function supportsServiceWorkerController() {
  return supportsServiceWorker() && !!navigator.serviceWorker?.controller
}

function supportsBackgroundSync() {
  return supportsServiceWorker() && typeof window !== 'undefined' && 'SyncManager' in window
}

function requestBackgroundDelivery() {
  if (!supportsServiceWorkerController()) return

  if (supportsBackgroundSync()) {
    navigator.serviceWorker.controller?.postMessage({ type: 'REGISTER_SYNC' })
    return
  }

  navigator.serviceWorker.controller?.postMessage({ type: 'FORCE_SYNC_NOW' })
}

async function getSelectedDeckFilter(): Promise<Set<string> | null> {
  try {
    const profile = await db.profile.get('current')
    if (!profile || profile.mode !== 'linked' || !profile.userId) return null
    const selected = readSelectedDeckIds(profile.userId)
    return selected.length > 0 ? new Set(selected) : null
  } catch {
    return null
  }
}

async function shouldSyncOperation(type: SyncOperationType, payload: unknown): Promise<boolean> {
  const selectedDecks = await getSelectedDeckFilter()
  if (!selectedDecks) return true
  if (type === 'deck.create') return true
  if (type === 'shuffleCollection.upsert' || type === 'shuffleCollection.delete') return true
  if (!payload || typeof payload !== 'object') return true

  const value = payload as Record<string, unknown>
  const directDeckId = value.deckId

  if (typeof directDeckId === 'string' && directDeckId) {
    return selectedDecks.has(directDeckId)
  }

  const cardId = value.cardId ?? value.id
  if (typeof cardId === 'string' && cardId) {
    const card = await db.cards.get(cardId)
    return !card || selectedDecks.has(card.deckId)
  }

  return true
}

export async function enqueueSyncOperation(type: SyncOperationType, payload: unknown): Promise<void> {
  const ts = now()
  await syncDb.queue.add({
    opId: makeOpId(),
    type,
    payload: JSON.stringify(payload),
    createdAt: ts,
    updatedAt: ts,
    retries: 0,
    nextRetryAt: ts,
  })

  if (isSyncActive()) {
    requestBackgroundDelivery()
  }
}

async function sendOperation(record: SyncQueueRecord): Promise<SendResult> {
  const config = getSyncConfig()
  const endpoint = getSyncBaseEndpoint()
  if (!isSyncActive() || !endpoint) {
    return 'failed'
  }

  let payload: unknown
  try {
    payload = JSON.parse(record.payload)
  } catch (error) {
    logError(
      'sync-queue',
      `Ungültige Sync-Queue-Payload für ${record.type}`,
      error instanceof Error ? `${record.opId}\n${error.message}` : record.opId,
    )
    if (record.id !== undefined) {
      await syncDb.queue.update(record.id, {
        retries: Math.max(record.retries, SYNC_MAX_RETRIES),
        updatedAt: now(),
        nextRetryAt: Number.MAX_SAFE_INTEGER,
      })
    }
    return 'deferred'
  }

  if (!await shouldSyncOperation(record.type, payload)) {
    if (record.id !== undefined) {
      await syncDb.queue.update(record.id, {
        updatedAt: now(),
        nextRetryAt: Number.MAX_SAFE_INTEGER,
      })
    }
    return 'deferred'
  }

  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': record.opId,
      ...makeAuthHeaders(config),
    },
    body: JSON.stringify({
      opId: record.opId,
      type: record.type,
      payload,
      clientTimestamp: record.createdAt,
      source: BACKUP_METADATA.app,
      clientId: getOrCreateSyncClientId(),
    }),
  })

  return response.ok ? 'sent' : 'failed'
}

export async function flushSyncQueue(options: FlushOptions = {}): Promise<{ processed: number; pending: number }> {
  const limit = options.limit ?? 20
  const ts = now()

  if (!isSyncActive()) {
    return { processed: 0, pending: await syncDb.queue.count() }
  }

  const candidates = await syncDb.queue.where('nextRetryAt').belowOrEqual(ts).limit(limit).toArray()
  let processed = 0

  for (const item of candidates) {
    if (!navigator.onLine) {
      break
    }

    // Move permanently-failing operations to dead-letter state instead of deleting.
    if (item.retries >= SYNC_MAX_RETRIES) {
      console.warn(`[SyncQueue] dead-letter op ${item.opId} (type=${item.type}) after ${item.retries} retries`)
      logError('sync-queue', `Op ${item.type} nach ${item.retries} Versuchen in Dead-Letter verschoben`, item.opId)
      await syncDb.queue.update(item.id!, {
        retries: Math.max(item.retries, SYNC_MAX_RETRIES),
        updatedAt: now(),
        // Keep out of normal retry scans; user can clear/replay via diagnostics flows.
        nextRetryAt: Number.MAX_SAFE_INTEGER,
      })
      continue
    }

    try {
      const result = await sendOperation(item)

      if (result === 'sent') {
        if (item.id !== undefined) {
          await syncDb.queue.delete(item.id)
        }
        processed += 1
      } else if (result === 'deferred') {
        continue
      } else {
        const retries = item.retries + 1
        await syncDb.queue.update(item.id!, {
          retries,
          updatedAt: now(),
          nextRetryAt: now() + nextBackoffMs(retries),
        })
      }
    } catch {
      const retries = item.retries + 1
      await syncDb.queue.update(item.id!, {
        retries,
        updatedAt: now(),
        nextRetryAt: now() + nextBackoffMs(retries),
      })
    }
  }

  const pending = await getSyncQueuePendingCount()
  return { processed, pending }
}

export async function getSyncQueuePendingCount(): Promise<number> {
  // Dead-letter entries are preserved for diagnostics/replay but must not block pull.
  return syncDb.queue
    .filter(item => item.retries < SYNC_MAX_RETRIES && item.nextRetryAt < Number.MAX_SAFE_INTEGER)
    .count()
}

export async function wakeDeferredSyncQueue(): Promise<void> {
  const ts = now()
  await syncDb.queue
    .filter(item => item.retries < SYNC_MAX_RETRIES && item.nextRetryAt === Number.MAX_SAFE_INTEGER)
    .modify({ nextRetryAt: ts, updatedAt: ts })

  if (isSyncActive()) {
    requestBackgroundDelivery()
  }
}

export async function clearSyncQueue(): Promise<void> {
  await syncDb.queue.clear()
}

export function closeSyncQueueDatabase(): void {
  syncDb.close()
}

/**
 * @deprecated Use setupUnifiedSyncRuntime() from syncCoordinator instead.
 * Kept temporarily so existing call-sites still compile.
 */
export function setupSyncRuntime(): () => void {
  // no-op: the coordinator now owns the runtime loop
  return () => {}
}
