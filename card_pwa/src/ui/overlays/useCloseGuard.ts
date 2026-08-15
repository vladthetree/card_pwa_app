/**
 * AI_CONTEXT:
 * Role: Close-policy helper shared by overlay primitives. Registers the calling
 * overlay in the app-wide overlay stack (state/appStore) so Escape/backdrop only
 * close the topmost overlay (ADR 001 "Muss-Kriterien"), and non-dismissible
 * overlays keep ignoring both regardless of stack position.
 * Important: Explicit close reasons (close-button/cancel/submit/programmatic)
 * are never stack-gated — only escape/backdrop are, per the ADR wording.
 */
import { useCallback, useEffect, useId } from 'react'
import { getAppStoreState, useAppStore } from '../../state/appStore'
import type { CloseReason } from './overlayTypes'

export function computeShouldHandleOverlayClose(
  reason: CloseReason,
  dismissible: boolean,
  isTopmost: boolean,
): boolean {
  if ((reason === 'escape' || reason === 'backdrop') && !isTopmost) return false
  if (!dismissible && (reason === 'escape' || reason === 'backdrop')) return false
  return true
}

export function useCloseGuard(input: {
  dismissible?: boolean
  onClose: (reason: CloseReason) => void
}) {
  const dismissible = input.dismissible ?? true
  const overlayId = useId()

  useEffect(() => {
    getAppStoreState().openOverlay({ id: overlayId, dismissible })
    return () => getAppStoreState().closeOverlay(overlayId)
    // dismissible is captured for the lifetime of this overlay instance; these
    // primitives do not support toggling it while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayId])

  const isTopmost = useAppStore(store => store.topOverlayId() === overlayId)
  const { onClose } = input

  return useCallback((reason: CloseReason) => {
    if (!computeShouldHandleOverlayClose(reason, dismissible, isTopmost)) return
    onClose(reason)
  }, [dismissible, isTopmost, onClose])
}
