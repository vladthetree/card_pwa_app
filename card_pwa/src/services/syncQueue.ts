/**
 * AI_CONTEXT:
 * Role: Durable outgoing sync queue stored in its own Dexie DB with retry/backoff and optional Background Sync delivery.
 * Used by: card/deck/review/shuffle mutation queries and syncCoordinator push phase.
 * Important: This is operation-log sync, not table mirroring; enqueue every user-facing mutation that should reach the server.
 */
import Dexie, { type Table } from 'dexie'
import { BACKUP_METADATA, DATABASE_NAMES } from '../constants/appIdentity'
import { supportsServiceWorker } from '../env'
import { db } from '../db'
import { logError } from './errorLog'
import { readSelectedDeckIds } from './profileService'
import {
  isReviewDeck,
  isReviewDeckId,
  readReviewDecksEnabledFromStorage,
} from '../utils/reviewDecks'
import { collectDeckIdsWithActiveCardsOrDescendants } from '../utils/deckContentScope'
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
  | 'videoNote.upsert'
  | 'videoNote.delete'

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

async function readSyncApiResponseError(response: Response): Promise<string | null> {
  try {
    const json = (await response.json()) as { ok?: boolean; error?: string }
    if (json?.ok === false) return json.error ?? 'api_not_ok'
  } catch {
    // Some successful sync responses do not need a JSON body.
  }
  return null
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
    const decks = (await db.decks.toArray()).filter(deck => !deck.isDeleted)
    const showReviewDecks = readReviewDecksEnabledFromStorage()
    if (selected === null) {
      return null
    }
    if (selected.length === 0) return new Set()
    const visibleSelected = showReviewDecks
      ? selected
      : selected.filter(id => {
          const deck = decks.find(item => item.id === id)
          return deck ? !isReviewDeck(deck) : !isReviewDeckId(id)
        })
    return expandDeckIdsWithDescendants(decks, new Set(visibleSelected))
  } catch {
    return null
  }
}

function expandDeckIdsWithDescendants(
  decks: Array<{ id: string; parentDeckId?: string | null }>,
  selectedDeckIds: Set<string>,
): Set<string> {
  const childrenByParent = new Map<string, Array<{ id: string }>>()
  const activeIds = new Set(decks.map(deck => deck.id))
  for (const deck of decks) {
    if (!deck.parentDeckId || !activeIds.has(deck.parentDeckId)) continue
    const bucket = childrenByParent.get(deck.parentDeckId) ?? []
    bucket.push(deck)
    childrenByParent.set(deck.parentDeckId, bucket)
  }

  const expanded = new Set<string>()
  const stack = Array.from(selectedDeckIds)
  while (stack.length > 0) {
    const deckId = stack.pop()
    if (!deckId || expanded.has(deckId)) continue
    expanded.add(deckId)
    for (const child of childrenByParent.get(deckId) ?? []) stack.push(child.id)
  }
  return expanded
}

async function shouldSyncOperation(type: SyncOperationType, payload: unknown): Promise<boolean> {
  const selectedDecks = await getSelectedDeckFilter()
  if (!readReviewDecksEnabledFromStorage() && await operationTargetsReviewDeck(type, payload)) return false
  if (type === 'deck.create') {
    const deckId = readPayloadString(payload, 'id')
    if (!deckId) return false
    if (selectedDecks && !selectedDecks.has(deckId)) return false
    return deckCreateHasSyncableContent(deckId)
  }
  if (!selectedDecks) return true
  if (type === 'shuffleCollection.upsert' || type === 'shuffleCollection.delete') return true
  if (type === 'videoNote.upsert' || type === 'videoNote.delete') return true
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

function readPayloadString(payload: unknown, key: string): string | null {
  if (!payload || typeof payload !== 'object') return null
  const value = (payload as Record<string, unknown>)[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

async function deckCreateHasSyncableContent(deckId: string): Promise<boolean> {
  const [decks, cards] = await Promise.all([
    db.decks.filter(deck => !deck.isDeleted).toArray(),
    db.cards.toArray(),
  ])
  return collectDeckIdsWithActiveCardsOrDescendants(decks, cards).has(deckId)
}

async function operationTargetsReviewDeck(type: SyncOperationType, payload: unknown): Promise<boolean> {
  if (!payload || typeof payload !== 'object') return false

  const value = payload as Record<string, unknown>
  const directDeckId = value.deckId
  if (typeof directDeckId === 'string' && isReviewDeckId(directDeckId)) return true

  const id = value.id
  if (type === 'deck.create' && typeof id === 'string' && isReviewDeckId(id)) return true

  const cardId = value.cardId ?? value.id
  if (typeof cardId === 'string' && cardId) {
    const card = await db.cards.get(cardId)
    return card ? isReviewDeckId(card.deckId) : false
  }

  return false
}

export async function enqueueSyncOperation(
  type: SyncOperationType,
  payload: unknown,
  opId = makeOpId(),
): Promise<void> {
  const ts = now()
  await syncDb.queue.add({
    opId,
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

  const apiError = await readSyncApiResponseError(response)

  if (!response.ok) {
    logError(
      'sync-api',
      `Sync push failed: ${record.type}`,
      [
        `target: ${endpoint.replace(/^https?:\/\/[^/]+/i, '')}`,
        `status: ${response.status}`,
        `reason: ${apiError ?? `http_${response.status}`}`,
        `opId: ${record.opId}`,
        `retry: ${record.retries}`,
      ].join('\n'),
    )
    return 'failed'
  }

  if (apiError) {
    logError(
      'sync-api',
      `Sync push failed: ${record.type}`,
      [
        `target: ${endpoint.replace(/^https?:\/\/[^/]+/i, '')}`,
        `status: ${response.status}`,
        `reason: ${apiError}`,
        `opId: ${record.opId}`,
        `retry: ${record.retries}`,
      ].join('\n'),
    )
    return 'failed'
  }

  return 'sent'
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
    } catch (error) {
      logError(
        'sync-api',
        `Sync push exception: ${item.type}`,
        [
          `opId: ${item.opId}`,
          `retry: ${item.retries}`,
          error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        ].join('\n'),
      )
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
