import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'

interface UseFloatingMenuOptions {
  isOpen: boolean
  onClose: () => void
  width: number
  margin?: number
  maxHeight?: number
}

interface FloatingMenuPosition {
  left: number
  top: number
  width: number
  maxHeight: number
  transformOrigin: string
}

function readSafeInset(variableName: '--safe-top' | '--safe-bottom' | '--safe-left' | '--safe-right'): number {
  if (typeof window === 'undefined') return 0
  const raw = window.getComputedStyle(document.documentElement).getPropertyValue(variableName).trim()
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

export function useFloatingMenu<TAnchor extends HTMLElement, TMenu extends HTMLElement>({
  isOpen,
  onClose,
  width,
  margin = 12,
  maxHeight = 320,
}: UseFloatingMenuOptions) {
  const anchorRef = useRef<TAnchor>(null)
  const menuRef = useRef<TMenu>(null)
  const [position, setPosition] = useState<FloatingMenuPosition | null>(null)

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor || typeof window === 'undefined') return

    const rect = anchor.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const safeTopInset = readSafeInset('--safe-top')
    const safeBottomInset = readSafeInset('--safe-bottom')
    const safeLeftInset = readSafeInset('--safe-left')
    const safeRightInset = readSafeInset('--safe-right')
    const minLeft = safeLeftInset + margin
    const minTop = safeTopInset + margin
    const maxRight = viewportWidth - safeRightInset - margin
    const maxBottom = viewportHeight - safeBottomInset - margin
    const safeWidth = Math.min(width, Math.max(180, viewportWidth - safeLeftInset - safeRightInset - margin * 2))
    const availableBelow = maxBottom - rect.bottom
    const availableAbove = rect.top - minTop
    const safeHeight = Math.min(
      maxHeight,
      Math.max(96, viewportHeight - safeTopInset - safeBottomInset - margin * 2),
      Math.max(96, availableBelow, availableAbove),
    )
    const opensBelow = availableBelow >= Math.min(safeHeight, 220) || availableBelow >= availableAbove
    const left = Math.min(
      Math.max(minLeft, rect.right - safeWidth),
      Math.max(minLeft, maxRight - safeWidth),
    )
    const top = opensBelow
      ? Math.min(rect.bottom + 8, maxBottom - safeHeight)
      : Math.max(minTop, rect.top - safeHeight - 8)

    setPosition({
      left,
      top,
      width: safeWidth,
      maxHeight: safeHeight,
      transformOrigin: `${Math.max(16, rect.right - left - 18)}px ${opensBelow ? '0px' : '100%'}`,
    })
  }, [margin, maxHeight, width])

  useEffect(() => {
    if (!isOpen) return
    updatePosition()

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (anchorRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      onClose()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, onClose, updatePosition])

  const floatingStyle: CSSProperties | undefined = position
    ? {
        left: position.left,
        top: position.top,
        width: position.width,
        maxHeight: position.maxHeight,
        transformOrigin: position.transformOrigin,
      }
    : undefined

  return {
    anchorRef,
    menuRef,
    floatingStyle,
    updatePosition,
  }
}
