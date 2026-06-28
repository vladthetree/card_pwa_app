/**
 * AI_CONTEXT: React hook for use Visual Viewport; encapsulates browser, persistence, sync, layout, or learning state for UI components.
 */
import { useEffect, useState } from 'react'

/**
 * Verfolgt das `visualViewport` (sichtbarer Bereich oberhalb der Tastatur).
 *
 * Auf dem Handy schrumpft beim Öffnen der Tastatur NICHT `window.innerHeight`,
 * sondern nur das visualViewport. Damit der mobile Player-/Notizen-Bereich über
 * der Tastatur sichtbar bleibt (und das Video oben verankert), binden wir die
 * Overlay-Höhe an diese Werte. `keyboardOpen` erkennt eine sichtbare Verkleinerung.
 */

export interface VisualViewportRect {
  /** Versatz des sichtbaren Bereichs von oben (px). */
  top: number
  /** Höhe des sichtbaren Bereichs (px). */
  height: number
  /** Tastatur (o. Ä.) verdeckt einen relevanten Teil des Layout-Viewports. */
  keyboardOpen: boolean
}

const KEYBOARD_THRESHOLD_PX = 120

export function useVisualViewport(): VisualViewportRect | null {
  const [rect, setRect] = useState<VisualViewportRect | null>(null)

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return

    const update = () => {
      setRect({
        top: vv.offsetTop,
        height: vv.height,
        keyboardOpen: window.innerHeight - vv.height > KEYBOARD_THRESHOLD_PX,
      })
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return rect
}
