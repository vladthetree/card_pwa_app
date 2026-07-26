/**
 * AI_CONTEXT:
 * Role: Handshake with the sync server (compares local/server cursor and record
 * counts) and the bootstrap decision it drives: upload-first for a fresh server,
 * a full snapshot when the local cursor is behind or the server demands one,
 * otherwise a no-op (the caller proceeds straight to delta-pull).
 * Used by: deltaPull.ts, once per pull cycle before paging through `/pull`.
 */
import { getSyncBaseEndpoint, fetchWithTimeout } from '../syncConfig'
import {
  getSyncAuthHeaders,
  getLocalCounts,
  logSyncApiFailure,
  stringifySyncException,
  syncResponseError,
  readCursor,
  writeCursor,
  clearAppliedOpIds,
  writeSyncMetaTimestamp,
  SYNC_META_BOOTSTRAP_KEY,
} from './shared'
import { fetchAndApplySnapshot } from './snapshot'
import { runBootstrapUpload } from './bootstrapUpload'

interface HandshakeResponse {
  ok?: boolean
  needsSnapshot?: boolean
  needsClientBootstrapUpload?: boolean
  serverCursor?: number
  bootstrapUploadCapabilities?: {
    reviews?: boolean
    videoNotes?: boolean
  }
  serverCounts?: {
    decks?: number
    cards?: number
    reviews?: number
    videoNotes?: number
  }
}

function getHandshakeEndpoint() {
  const base = getSyncBaseEndpoint()
  return base ? `${base}/handshake` : null
}

export async function runHandshake(clientId: string): Promise<HandshakeResponse | null> {
  const endpoint = getHandshakeEndpoint()
  if (!endpoint) return null

  try {
    const localCounts = await getLocalCounts()

    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getSyncAuthHeaders(),
      },
      body: JSON.stringify({
        clientId,
        lastCursor: await readCursor(),
        localCounts,
      }),
    })

    if (!response.ok) {
      logSyncApiFailure('handshake', endpoint, `http_${response.status}`, `status: ${response.status}`)
      return null
    }
    const data = (await response.json()) as HandshakeResponse & { error?: string }
    const apiError = syncResponseError(data)
    if (apiError) {
      logSyncApiFailure('handshake', endpoint, apiError, `status: ${response.status}`)
      return null
    }
    return data
  } catch (error: unknown) {
    logSyncApiFailure('handshake', endpoint, stringifySyncException(error))
    return null
  }
}

function supportsBootstrapReviewUpload(handshake: HandshakeResponse): boolean {
  return Boolean(handshake.bootstrapUploadCapabilities?.reviews)
}

export async function bootstrapSyncIfNeeded(clientId: string): Promise<boolean> {
  const handshake = await runHandshake(clientId)
  if (!handshake) return true

  if (Boolean(handshake.needsClientBootstrapUpload)) {
    const localCounts = await getLocalCounts()
    const includeReviews = localCounts.reviews > 0

    if (includeReviews && !supportsBootstrapReviewUpload(handshake)) {
      console.warn('[syncPull] bootstrap upload aborted because the server does not advertise review-history support')
      return false
    }

    const upload = await runBootstrapUpload(clientId, { includeReviews })
    if (!upload?.ok) return false

    if (typeof upload.serverCursor === 'number' && Number.isFinite(upload.serverCursor)) {
      await writeCursor(upload.serverCursor)
    }

    await writeSyncMetaTimestamp(SYNC_META_BOOTSTRAP_KEY)
    return true
  }

  if (Boolean(handshake.needsSnapshot)) {
    return fetchAndApplySnapshot(clientId)
  }

  if (typeof handshake.serverCursor === 'number' && Number.isFinite(handshake.serverCursor)) {
    const localCursor = await readCursor()
    if (handshake.serverCursor < localCursor) {
      await clearAppliedOpIds()
      return fetchAndApplySnapshot(clientId)
    }
  }

  return true
}
