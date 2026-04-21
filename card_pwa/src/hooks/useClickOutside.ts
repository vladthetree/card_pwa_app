import { useEffect, useRef, type RefObject } from 'react'

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  enabled: boolean,
  onClickOutside: (event: MouseEvent) => void
): void {
  const callbackRef = useRef(onClickOutside)

  useEffect(() => {
    callbackRef.current = onClickOutside
  }, [onClickOutside])

  useEffect(() => {
    if (!enabled) return

    const handler = (event: MouseEvent) => {
      const node = ref.current
      if (node && !node.contains(event.target as Node)) {
        callbackRef.current(event)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
    }
  }, [enabled, ref])
}
