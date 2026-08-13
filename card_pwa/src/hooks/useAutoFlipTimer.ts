import { useEffect, useRef } from 'react'

/**
 * Shared auto-flip-timer bookkeeping for PBQ card renderers (Ordering, Matching):
 * resets the submitted-guard on card change, and cancels a pending auto-flip
 * timeout if the user manually flips the card first.
 */
export function useAutoFlipTimer(cardId: string, flipped: boolean) {
  const submittedRef = useRef(false)
  const flipTimerRef = useRef<number | null>(null)
  const prevFlippedRef = useRef(false)

  useEffect(() => {
    submittedRef.current = false

    return () => {
      if (flipTimerRef.current !== null) {
        window.clearTimeout(flipTimerRef.current)
        flipTimerRef.current = null
      }
    }
  }, [cardId])

  // Manueller Flip auf die Rückseite verwirft den pending Auto-Flip —
  // sonst togglet der Timer die Karte zurück auf die Vorderseite.
  useEffect(() => {
    const was = prevFlippedRef.current
    prevFlippedRef.current = flipped
    if (flipped && !was && flipTimerRef.current !== null) {
      window.clearTimeout(flipTimerRef.current)
      flipTimerRef.current = null
    }
  }, [flipped])

  return { submittedRef, flipTimerRef }
}
