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
    const safeWidth = Math.min(width, Math.max(180, viewportWidth - margin * 2))
    const availableBelow = viewportHeight - rect.bottom - margin
    const availableAbove = rect.top - margin
    const safeHeight = Math.min(
      maxHeight,
      Math.max(96, viewportHeight - margin * 2),
      Math.max(96, availableBelow, availableAbove),
    )
    const opensBelow = availableBelow >= Math.min(safeHeight, 220) || availableBelow >= availableAbove
    const left = Math.min(
      Math.max(margin, rect.right - safeWidth),
      Math.max(margin, viewportWidth - safeWidth - margin),
    )
    const top = opensBelow
      ? Math.min(rect.bottom + 8, viewportHeight - margin - safeHeight)
      : Math.max(margin, rect.top - safeHeight - 8)

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
