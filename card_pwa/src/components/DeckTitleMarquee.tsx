import { useEffect, useRef, useState, type CSSProperties } from 'react'

export function DeckTitleMarquee({ title }: { title: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const measureRef = useRef<HTMLSpanElement | null>(null)
  const [marquee, setMarquee] = useState({ active: false, distance: 120, duration: 10 })

  useEffect(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return

    const update = () => {
      const containerWidth = container.clientWidth
      const textWidth = measure.scrollWidth
      const shouldAnimate = textWidth > containerWidth + 6
      if (!shouldAnimate) {
        setMarquee((prev) => (prev.active ? { ...prev, active: false } : prev))
        return
      }

      const gap = 28
      const distance = textWidth + gap
      const duration = Math.max(7.5, distance / 24)
      setMarquee({ active: true, distance, duration })
    }

    update()

    const observer = new ResizeObserver(update)
    observer.observe(container)
    observer.observe(measure)
    window.addEventListener('resize', update)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [title])

  const marqueeStyle = {
    '--deck-title-distance': `${marquee.distance}px`,
    '--deck-title-duration': `${marquee.duration}s`,
  } as CSSProperties

  return (
    <div ref={containerRef} className="relative min-w-0 w-full overflow-hidden">
      <span
        ref={measureRef}
        className="pointer-events-none absolute -z-10 whitespace-nowrap opacity-0 text-[14px] font-bold font-sans uppercase tracking-widest"
      >
        {title}
      </span>
      {marquee.active ? (
        <div className="deck-title-marquee__track" style={marqueeStyle}>
          <span className="deck-title-marquee__item text-[14px] font-bold font-sans text-zinc-200 uppercase tracking-widest">
            {title}
          </span>
          <span className="deck-title-marquee__item text-[14px] font-bold font-sans text-zinc-200 uppercase tracking-widest" aria-hidden="true">
            {title}
          </span>
        </div>
      ) : (
        <span className="block truncate text-[14px] font-bold font-sans text-zinc-200 uppercase tracking-widest">
          {title}
        </span>
      )}
    </div>
  )
}
