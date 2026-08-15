/**
 * AI_CONTEXT:
 * Role: Shared focus-restore + Escape-key handling for overlay primitives
 * (Dialog, AlertDialog): focuses `initialFocusRef` on mount and restores the
 * previously focused element on unmount; routes Escape through `requestClose`.
 */
import { useEffect, type RefObject } from 'react'
import type { CloseReason } from './overlayTypes'

export function useOverlayFocusAndEscape(
  initialFocusRef: RefObject<HTMLElement>,
  requestClose: (reason: CloseReason) => void,
): void {
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    initialFocusRef.current?.focus()
    return () => previous?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose('escape')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [requestClose])
}
