import { useEffect, useState } from 'react'
import { db } from '../db'
import { getSyncQueuePendingCount } from '../services/syncQueue'
import { isSyncActive } from '../services/syncConfig'

const SYNC_META_LAST_PULL_KEY = 'sync-last-pull-at'
const SYNC_META_LAST_PUSH_KEY = 'sync-last-push-at'
const SYNC_META_LAST_ERROR_KEY = 'sync-last-error'

export interface SyncStatus {
  mode: 'local' | 'linked'
  lastPullAt: number | null
  lastPushAt: number | null
  pendingCount: number
  inFlight: boolean
  lastError: string | null
}

async function readSyncMeta<T>(key: string): Promise<T | null> {
  try {
    const entry = await db.syncMeta.get(key)
    return (entry?.value as T) ?? null
  } catch {
    return null
  }
}

export async function writeSyncMetaTimestamp(key: string): Promise<void> {
  try {
    await db.syncMeta.put({ key, value: Date.now(), updatedAt: Date.now() })
  } catch {
    // best effort
  }
}

export async function writeSyncMetaError(error: string | null): Promise<void> {
  try {
    if (error) {
      await db.syncMeta.put({ key: SYNC_META_LAST_ERROR_KEY, value: error, updatedAt: Date.now() })
    } else {
      await db.syncMeta.delete(SYNC_META_LAST_ERROR_KEY)
    }
  } catch {
    // best effort
  }
}

export function useSyncStatus(refreshIntervalMs = 5_000): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({
    mode: 'local',
    lastPullAt: null,
    lastPushAt: null,
    pendingCount: 0,
    inFlight: false,
    lastError: null,
  })

  useEffect(() => {
    let cancelled = false

    async function refresh() {
      if (cancelled) return
      const active = isSyncActive()
      const [lastPullAt, lastPushAt, lastError, pendingCount] = await Promise.all([
        readSyncMeta<number>(SYNC_META_LAST_PULL_KEY),
        readSyncMeta<number>(SYNC_META_LAST_PUSH_KEY),
        readSyncMeta<string>(SYNC_META_LAST_ERROR_KEY),
        getSyncQueuePendingCount(),
      ])
      if (!cancelled) {
        setStatus({
          mode: active ? 'linked' : 'local',
          lastPullAt,
          lastPushAt,
          pendingCount,
          inFlight: false,
          lastError,
        })
      }
    }

    void refresh()
    const id = setInterval(() => void refresh(), refreshIntervalMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [refreshIntervalMs])

  return status
}

export { SYNC_META_LAST_PULL_KEY, SYNC_META_LAST_PUSH_KEY, SYNC_META_LAST_ERROR_KEY }
