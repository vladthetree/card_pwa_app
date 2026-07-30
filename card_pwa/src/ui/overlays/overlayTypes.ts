/**
 * AI_CONTEXT:
 * Role: Shared overlay behavior types. These are UI contracts only; persistent
 * form or domain data belongs in component state or Dexie.
 * Important: CloseReason is re-exported from state/slices/overlaySlice.ts (the
 * overlay stack's canonical definition) instead of being declared here a second
 * time — the two had drifted (this file was missing 'programmatic').
 */
export type { CloseReason } from '../../state/slices/overlaySlice'
export type OverlaySize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen'
export type SheetPlacement = 'bottom' | 'left' | 'right'

