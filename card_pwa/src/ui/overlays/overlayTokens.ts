/**
 * AI_CONTEXT:
 * Role: Single source for new overlay surface tokens, especially z-index values.
 */
import { UI_TOKENS } from '../../constants/ui'
import type { OverlaySize, SheetPlacement } from './overlayTypes'

export const overlayTokens = {
  zIndex: UI_TOKENS.zIndex,
  size: {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    fullscreen: 'max-w-none',
  } satisfies Record<OverlaySize, string>,
  sheetPlacement: {
    bottom: 'inset-x-0 bottom-0 items-end',
    left: 'inset-y-0 left-0 items-stretch justify-start',
    right: 'inset-y-0 right-0 items-stretch justify-end',
  } satisfies Record<SheetPlacement, string>,
} as const

