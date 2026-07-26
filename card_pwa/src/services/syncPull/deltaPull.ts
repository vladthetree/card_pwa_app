/**
 * AI_CONTEXT:
 * Role: The delta-pull loop — the exported entry point that syncCoordinator calls
 * once local pushes are flushed. Runs handshake/bootstrap first, then pages through
 * `/pull` and applies each operation exactly once (or a worker-resolved batch when
 * enabled).
 * Used by: syncCoordinator, after pending local operations are flushed.
 * Important: Pull must respect selected deck scope, applied op IDs, local sync meta,
 * and worker fallbacks for heavy resolution. The pending-queue re-check below is a
 * deliberate TOCTOU guard, not leftover duplication — see the inline comment.
 */
import { db } from '../../db'
import { getSyncBaseEndpoint, fetchWithTimeout, getOrCreateSyncClientId } from '../syncConfig'
import { flushSyncQueue, getSyncQueuePendingCount } from '../syncQueue'
import { getSelectedDeckFilter } from '../syncedDeckScope'
import { isReviewDeckId, readReviewDecksEnabledFromStorage } from '../../utils/reviewDecks'
import { supportsWorkerResolution } from '../../utils/sync/operationResolver'
import {
  getSyncAuthHeaders,
  logSyncApiFailure,
  stringifySyncException,
  syncResponseError,
  readCursor,
  writeCursor,
  readAppliedOpIds,
  writeAppliedOpIds,
  writeSyncMetaTimestamp,
  SYNC_META_LAST_PULL_KEY,
  SYNC_META_LAST_PUSH_KEY,
} from './shared'
import { bootstrapSyncIfNeeded } from './handshake'
import { applyOperation, applyOperationsWithWorker, isSyncWorkerEnabled, type PulledOperation } from './apply'

interface PullResponse {
  ok?: boolean
  operations?: PulledOperation[]
  nextCursor?: number
  hasMore?: boolean
}

function getPullEndpoint() {
  const base = getSyncBaseEndpoint()
  return base ? `${base}/pull` : null
}

function operationTargetsReviewDeck(op: PulledOperation): boolean {
  if (!op.payload || typeof op.payload !== 'object') return false
  const payload = op.payload as Record<string, unknown>
  const directDeckId = payload.deckId
  if (typeof directDeckId === 'string' && isReviewDeckId(directDeckId)) return true

  const id = payload.id
  if (op.type === 'deck.create' && typeof id === 'string' && isReviewDeckId(id)) return true

  return false
}

async function shouldApplyOperationForSelectedDecks(op: PulledOperation, selectedDecks: Set<string> | null): Promise<boolean> {
  if (!readReviewDecksEnabledFromStorage() && operationTargetsReviewDeck(op)) return false
  if (!selectedDecks) return true
  if (op.type === 'deck.create') {
    const id = (op.payload as Record<string, unknown>)?.id
    return typeof id !== 'string' || !id || selectedDecks.has(id)
  }
  if (op.type === 'shuffleCollection.upsert' || op.type === 'shuffleCollection.delete') return true
  if (op.type === 'videoNote.upsert' || op.type === 'videoNote.delete') return true
  if (!op.payload || typeof op.payload !== 'object') return true

  const payload = op.payload as Record<string, unknown>
  const directDeckId = payload.deckId
  if (typeof directDeckId === 'string' && directDeckId) {
    return selectedDecks.has(directDeckId)
  }

  const cardId = payload.cardId ?? payload.id
  if (typeof cardId === 'string' && cardId) {
    const existing = await db.cards.get(cardId)
    return !existing || selectedDecks.has(existing.deckId)
  }

  return true
}

export async function pullAndApplySyncDeltas(limit = 200) {
  const endpoint = getPullEndpoint()
  if (!endpoint) return

  // syncCoordinator already gates this call on an empty push queue, but a new
  // local mutation can be enqueued in the gap between that check and this
  // network call. Re-checking here (rather than trusting the caller) closes
  // that race window instead of duplicating it — do not remove.
  const pendingBeforeFlush = await getSyncQueuePendingCount()
  if (pendingBeforeFlush > 0 && navigator.onLine) {
    const flushResult = await flushSyncQueue({ limit: 200 })
    if (flushResult.processed > 0) {
      await writeSyncMetaTimestamp(SYNC_META_LAST_PUSH_KEY)
    }
  }

  const pendingAfterFlush = await getSyncQueuePendingCount()
  if (pendingAfterFlush > 0) {
    return
  }

  const clientId = getOrCreateSyncClientId()
  const bootstrapReady = await bootstrapSyncIfNeeded(clientId)
  if (!bootstrapReady) return

  let cursor = await readCursor()
  const appliedOpIds = await readAppliedOpIds()
  const selectedDecks = await getSelectedDeckFilter()

  try {
    for (let page = 0; page < 20; page += 1) {
      const query = `${endpoint}?since=${cursor}&limit=${limit}&clientId=${encodeURIComponent(clientId)}`
      const response = await fetchWithTimeout(query, {
        headers: {
          ...getSyncAuthHeaders(),
        },
      })
      if (!response.ok) {
        logSyncApiFailure('pull deltas', query, `http_${response.status}`, `status: ${response.status}`)
        break
      }

      const data = (await response.json()) as PullResponse & { error?: string }
      const apiError = syncResponseError(data)
      if (apiError) {
        logSyncApiFailure('pull deltas', query, apiError, `status: ${response.status}`)
        break
      }
      const operations = Array.isArray(data.operations) ? data.operations : []

      if (operations.length === 0) {
        if (typeof data.nextCursor === 'number' && Number.isFinite(data.nextCursor)) {
          cursor = data.nextCursor
        }
        break
      }

      const operationsToApply: PulledOperation[] = []

      for (const operation of operations) {
        if (!operation?.opId) continue
        if (appliedOpIds.has(operation.opId)) continue

        const shouldApply = await shouldApplyOperationForSelectedDecks(operation, selectedDecks)
        if (!shouldApply) {
          appliedOpIds.add(operation.opId)
          continue
        }

        operationsToApply.push(operation)
      }

      const useSyncWorker = isSyncWorkerEnabled()
      const canUseSyncWorker = useSyncWorker && operationsToApply.every(op => supportsWorkerResolution(op))

      if (operationsToApply.length > 0) {
        if (canUseSyncWorker) {
          await applyOperationsWithWorker(operationsToApply, Number(data.nextCursor ?? cursor ?? 0))
        } else {
          for (const operation of operationsToApply) {
            await applyOperation(operation)
          }
        }

        for (const operation of operationsToApply) {
          appliedOpIds.add(operation.opId)
        }
      }

      if (typeof data.nextCursor === 'number' && Number.isFinite(data.nextCursor)) {
        cursor = data.nextCursor
      } else {
        const maxSeen = operations.reduce((max, op) => Math.max(max, op.id || 0), cursor)
        cursor = maxSeen
      }

      if (!data.hasMore) break
    }
  } catch (error: unknown) {
    logSyncApiFailure('pull deltas', endpoint, stringifySyncException(error))
    // Network/transient errors should not crash sync runtime.
  }

  await writeCursor(cursor)
  await writeAppliedOpIds(appliedOpIds)
  await writeSyncMetaTimestamp(SYNC_META_LAST_PULL_KEY)
}
