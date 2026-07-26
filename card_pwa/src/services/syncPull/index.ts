/**
 * AI_CONTEXT:
 * Role: Public entry point for the pull/bootstrap engine — re-exports the delta-pull
 * loop and the state-reset helper. Internals split by phase: handshake.ts,
 * snapshot.ts, bootstrapUpload.ts, apply.ts, deltaPull.ts, shared.ts (cross-phase
 * endpoint/error-logging/sync-meta helpers).
 * Used by: syncCoordinator (pullAndApplySyncDeltas), SettingsModal/
 * ProfileSyncSection (resetSyncPullState).
 * Important: keep this file a thin re-export — put logic in the phase modules.
 */
export { pullAndApplySyncDeltas } from './deltaPull'
export { resetSyncPullState } from './shared'
