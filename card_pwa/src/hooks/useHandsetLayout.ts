import { useEffect, useState } from 'react'

export function useHandsetLayout(): { isHandsetLayout: boolean; isHandsetLandscape: boolean } {
  const [isHandsetLayout, setIsHandsetLayout] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(pointer: coarse) and (max-width: 1024px)').matches
  })
  const [isHandsetLandscape, setIsHandsetLandscape] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(pointer: coarse) and (max-width: 1024px) and (orientation: landscape)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(pointer: coarse) and (max-width: 1024px)')
    const mediaLandscape = window.matchMedia('(pointer: coarse) and (max-width: 1024px) and (orientation: landscape)')
    const update = () => {
      setIsHandsetLayout(media.matches)
      setIsHandsetLandscape(mediaLandscape.matches)
    }

    update()
    media.addEventListener('change', update)
    mediaLandscape.addEventListener('change', update)
    window.addEventListener('resize', update)

    return () => {
      media.removeEventListener('change', update)
      mediaLandscape.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return { isHandsetLayout, isHandsetLandscape }
}
