/**
 * AI_CONTEXT:
 * Role: Small close-policy helper shared by overlay primitives.
 */
import type { CloseReason } from './overlayTypes'

export function useCloseGuard(input: {
  dismissible?: boolean
  onClose: (reason: CloseReason) => void
}) {
  const dismissible = input.dismissible ?? true

  return (reason: CloseReason) => {
    if (!dismissible && (reason === 'escape' || reason === 'backdrop')) return
    input.onClose(reason)
  }
}

