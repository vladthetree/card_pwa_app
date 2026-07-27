/**
 * AI_CONTEXT:
 * Role: Shared overlay behavior types. These are UI contracts only; persistent
 * form or domain data belongs in component state or Dexie.
 */
export type CloseReason = 'escape' | 'backdrop' | 'close-button' | 'cancel' | 'submit'
export type OverlaySize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen'
export type SheetPlacement = 'bottom' | 'left' | 'right'

