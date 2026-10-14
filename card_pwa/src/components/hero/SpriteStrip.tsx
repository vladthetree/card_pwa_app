/**
 * AI_CONTEXT: Spielt einen waagerechten Sprite-Streifen (n gleich große Frames) per CSS-Hintergrund ab.
 * Bei Reduced Motion oder playing=false steht ein fester Frame. Kein requestAnimationFrame-Loop: ein Intervall
 * läuft nur, solange die Szene sichtbar animiert, und räumt sich beim Unmount/Ende selbst auf.
 */
import { useEffect, useState } from 'react'

interface Props {
  src: string
  frames: number
  /** Breite eines Frames im Streifen (px). */
  frameSize: number
  /** Höhe eines Frames (px); ohne Angabe quadratisch. */
  frameHeight?: number
  /** Anzeigebreite eines Frames in CSS-Pixeln; die Höhe folgt dem Seitenverhältnis. */
  size: number
  fps?: number
  playing: boolean
  loop?: boolean
  /** Frame, der bei Stillstand gezeigt wird (negativ = vom Ende gezählt). */
  restFrame?: number
  onDone?: () => void
  className?: string
}

export function SpriteStrip({ src, frames, frameSize, frameHeight = frameSize, size, fps = 8, playing, loop = false, restFrame = 0, onDone, className = '' }: Props) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (!playing || !src) return undefined
    setFrame(0)
    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      if (index >= frames) {
        if (loop) {
          index = 0
          setFrame(0)
          return
        }
        window.clearInterval(timer)
        onDone?.()
        return
      }
      setFrame(index)
    }, Math.max(30, Math.round(1000 / fps)))
    return () => window.clearInterval(timer)
    // onDone ist absichtlich nicht Teil der Abhängigkeiten: der Streifen soll nicht neu starten, wenn nur der Callback wechselt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, src, frames, fps, loop])

  if (!src) return null
  const shown = playing ? frame : (restFrame < 0 ? frames + restFrame : restFrame)
  const scale = size / frameSize
  const height = Math.round(size * (frameHeight / frameSize))
  return (
    <div
      aria-hidden="true"
      className={`shrink-0 [image-rendering:pixelated] ${className}`}
      style={{
        width: size,
        height,
        backgroundImage: `url(${src})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${frames * size}px ${height}px`,
        backgroundPosition: `${-shown * size}px 0`,
        imageRendering: 'pixelated',
        ['--strip-scale' as string]: scale,
      }}
    />
  )
}
