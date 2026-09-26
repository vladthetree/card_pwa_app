/**
 * AI_CONTEXT:
 * Role: Shared focus trap, initial-focus, focus-restore and Escape handling for
 * overlay primitives. Only the topmost overlay handles keyboard input.
 */
import { useEffect, useRef, type RefObject } from 'react'
import type { CloseReason } from './overlayTypes'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusableChildren(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(element => element.getAttribute('aria-hidden') !== 'true' && !element.hasAttribute('inert'))
}

export function useOverlayFocusAndEscape(
  panelRef: RefObject<HTMLElement | null>,
  requestClose: (reason: CloseReason) => void,
  options: {
    initialFocusRef?: RefObject<HTMLElement | null>
    isTopmost: boolean
  },
): void {
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    return () => {
      const previous = previousFocusRef.current
      // OverlayPortal restores background inertness in its own cleanup. Restore
      // focus one frame later so an external trigger is focusable again; nested
      // overlays still return to their trigger inside the shared portal root.
      window.requestAnimationFrame(() => {
        if (previous?.isConnected) previous.focus({ preventScroll: true })
      })
    }
  }, [])

  useEffect(() => {
    if (!options.isTopmost) return
    const frame = window.requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel || panel.contains(document.activeElement)) return
      const target = options.initialFocusRef?.current ?? focusableChildren(panel)[0] ?? panel
      target.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [options.initialFocusRef, options.isTopmost, panelRef])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!options.isTopmost) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        requestClose('escape')
        return
      }
      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return
      const focusable = focusableChildren(panel)
      if (focusable.length === 0) {
        event.preventDefault()
        panel.focus({ preventScroll: true })
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault()
        last.focus({ preventScroll: true })
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault()
        first.focus({ preventScroll: true })
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [options.isTopmost, panelRef, requestClose])
}
