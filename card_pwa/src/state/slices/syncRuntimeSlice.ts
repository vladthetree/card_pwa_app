/**
 * AI_CONTEXT:
 * Role: UI-only sync runtime state for banners, diagnostics, and settings
 * surfaces. The durable sync queue remains the source of truth.
 */
export type SyncRuntimeStatus = 'idle' | 'syncing' | 'blocked' | 'offline' | 'error'

export interface SyncRuntimeSlice {
  syncStatus: SyncRuntimeStatus
  pendingCount: number
  deadLetterCount: number
  lastSuccessfulSyncAt: number | null
  lastError: string | null
  setSyncStatus: (status: SyncRuntimeStatus) => void
  setSyncCounters: (counters: { pendingCount?: number; deadLetterCount?: number }) => void
  markSyncSuccess: (timestamp: number) => void
  markSyncError: (message: string) => void
}

export interface SyncRuntimeSliceState {
  syncStatus: SyncRuntimeStatus
  pendingCount: number
  deadLetterCount: number
  lastSuccessfulSyncAt: number | null
  lastError: string | null
}

export const initialSyncRuntimeState: SyncRuntimeSliceState = {
  syncStatus: 'idle',
  pendingCount: 0,
  deadLetterCount: 0,
  lastSuccessfulSyncAt: null,
  lastError: null,
}

