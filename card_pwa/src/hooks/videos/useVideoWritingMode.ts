/**
 * AI_CONTEXT:
 * Role: Handy-Schreibmodus-Erkennung — Textfeld fokussiert ODER Tastatur sichtbar
 * schaltet auf den vergrößerten Notizzettel (Video ausgeblendet) um. Blur wird
 * entprellt, damit Zettel-Tool-Taps (die neu fokussieren) nicht flackern.
 * Used by: VideosView.
 * Important: kein automatischer Ausstieg über Tastatur-Erkennung allein — echte
 * iPhones liefern kurze visualViewport-Ausreißer beim Tippen, die sonst das Video
 * mitten im Schreiben zurückbrächten. Verlassen nur über exitWriting oder ein
 * echtes Blur (handleNoteFocusChange(false)).
 */
import { useEffect, useRef, useState } from 'react'

export function useVideoWritingMode(input: { isHandsetLayout: boolean; keyboardOpen: boolean }): {
  writingMode: boolean
  handleNoteFocusChange: (focused: boolean) => void
  exitWriting: () => void
} {
  const { isHandsetLayout, keyboardOpen } = input
  const [noteFocused, setNoteFocused] = useState(false)
  const noteBlurTimer = useRef<number | undefined>(undefined)

  const handleNoteFocusChange = (focused: boolean) => {
    if (focused) {
      if (noteBlurTimer.current) window.clearTimeout(noteBlurTimer.current)
      setNoteFocused(true)
    } else {
      noteBlurTimer.current = window.setTimeout(() => setNoteFocused(false), 250)
    }
  }
  useEffect(() => () => { if (noteBlurTimer.current) window.clearTimeout(noteBlurTimer.current) }, [])

  // Zurück zur normalen Videoansicht: Tastatur schließen (Textfeld blur).
  const exitWriting = () => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    if (noteBlurTimer.current) window.clearTimeout(noteBlurTimer.current)
    setNoteFocused(false)
  }

  const writingMode = isHandsetLayout && (noteFocused || keyboardOpen)

  return { writingMode, handleNoteFocusChange, exitWriting }
}
