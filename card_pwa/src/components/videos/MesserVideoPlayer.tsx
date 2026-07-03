/**
 * AI_CONTEXT:
 * Role: Encapsulated HTML video player for self-hosted Professor Messer MP4s with resume, playback-rate persistence, fullscreen, time reporting, and seek requests.
 * Used by: VideosView as the media surface for online and IndexedDB offline sources.
 * Important: Resume state is per file, while learning progress is per objective in useMesserVideoProgress; keep those models separate.
 */
import { useEffect, useRef, useState } from 'react'
import { Maximize, Minimize } from 'lucide-react'
import { isFullscreenActive, toggleVideoFullscreen } from '../../hooks/useFullscreen'
import {
  PLAYBACK_RATES,
  clearResumePosition,
  computeResume,
  getPlaybackRate,
  getResumePosition,
  savePlaybackRate,
  saveResumePosition,
} from '../../utils/videoPlayback'

/**
 * Gekapselter Player für die selbst gehosteten Messer-Videos. Kümmert sich um
 *  - Resume: merkt sich gerätelokal die Position pro Datei und springt zurück,
 *  - Geschwindigkeit: persistente Abspielrate (für Vorlesungsmaterial wichtig),
 *  - Vollbild: Element-/iOS-Video-Fullscreen.
 * Das Remount via `key={file}` setzt den Player bei Videowechsel sauber zurück.
 */

const SAVE_INTERVAL_SEC = 5

function formatRate(rate: number): string {
  return `${rate}×`
}

export interface PlayerLabels {
  fullscreen: string
  exitFullscreen: string
  speed: string
}

interface Props {
  file: string
  src: string
  variant: 'compact' | 'full'
  keyboardOpen?: boolean
  onEnded?: () => void
  onTimeChange?: (seconds: number) => void
  seekRequest?: { id: number; seconds: number } | null
  labels: PlayerLabels
}

export default function MesserVideoPlayer({
  file,
  src,
  variant,
  keyboardOpen = false,
  onEnded,
  onTimeChange,
  seekRequest,
  labels,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  // Seek, der beim Setzen noch keine Metadaten hatte (z. B. Sprung aus der
  // Tag-Seite in ein ANDERES Video): wird in handleLoadedMetadata nachgeholt und
  // hat dort Vorrang vor der Resume-Position.
  const pendingSeekRef = useRef<{ id: number; seconds: number } | null>(null)
  const lastSavedRef = useRef(0)
  // Laufend mitgeschriebene Position/Dauer — der Cleanup darf NICHT videoRef
  // lesen, weil das `<video key={file}>`-Remount die Ref beim Wechsel schon auf
  // das neue Element (Zeit ≈ 0) umsetzt und sonst die alte Position überschriebe.
  const lastPositionRef = useRef(0)
  const lastDurationRef = useRef(0)
  const [rate, setRate] = useState(() => getPlaybackRate())
  const [isFs, setIsFs] = useState(false)

  // Fullscreen-Status spiegeln (Desktop/Android; iOS-Video dismisst nativ).
  useEffect(() => {
    const sync = () => setIsFs(isFullscreenActive())
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync as EventListener)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync as EventListener)
    }
  }, [])

  // Rate live anwenden — auch nach Remount bei Datei-/Quellenwechsel.
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = rate
  }, [rate, src])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !seekRequest) return
    // Noch keine Metadaten (frisch remountetes Video) → Seek vormerken und in
    // handleLoadedMetadata anwenden; sofortiges Setzen würde ins Leere laufen.
    if (video.readyState < 1 /* HAVE_METADATA */) {
      pendingSeekRef.current = seekRequest
      return
    }
    video.currentTime = Math.max(0, seekRequest.seconds)
    onTimeChange?.(video.currentTime)
  }, [seekRequest?.id])

  // Beim Verlassen / Dateiwechsel die zuletzt mitgeschriebene Position sichern.
  // Reset im Setup gilt dem NEUEN Video; der Cleanup läuft davor mit den Werten
  // des alten und sichert dessen Position korrekt.
  useEffect(() => {
    lastSavedRef.current = 0
    lastPositionRef.current = 0
    lastDurationRef.current = 0
    return () => {
      saveResumePosition(file, lastPositionRef.current, lastDurationRef.current)
    }
  }, [file])

  // App im Hintergrund (Tab-Wechsel / PWA backgrounded): Position sofort sichern,
  // solange das Element noch hängt — fängt den Fall ab, dass kein Unmount kommt.
  useEffect(() => {
    const persistOnHide = () => {
      const video = videoRef.current
      if (video) saveResumePosition(file, video.currentTime, video.duration)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persistOnHide()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', persistOnHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', persistOnHide)
    }
  }, [file])

  const handleLoadedMetadata = () => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = rate
    // Vorgemerkter Seek (Sprung aus der Tag-Seite) gewinnt gegen Resume.
    const pending = pendingSeekRef.current
    if (pending) {
      pendingSeekRef.current = null
      video.currentTime = Math.max(0, pending.seconds)
      onTimeChange?.(video.currentTime)
      return
    }
    const resume = computeResume(getResumePosition(file), video.duration)
    if (resume > 0) video.currentTime = resume
    onTimeChange?.(video.currentTime)
  }

  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (!video) return
    const now = video.currentTime
    lastPositionRef.current = now
    lastDurationRef.current = video.duration
    onTimeChange?.(now)
    if (Math.abs(now - lastSavedRef.current) < SAVE_INTERVAL_SEC) return
    lastSavedRef.current = now
    saveResumePosition(file, now, video.duration)
  }

  // Pause persistiert sofort (auch innerhalb des Throttle-Fensters).
  const handlePause = () => {
    const video = videoRef.current
    if (!video) return
    lastPositionRef.current = video.currentTime
    lastDurationRef.current = video.duration
    lastSavedRef.current = video.currentTime
    onTimeChange?.(video.currentTime)
    saveResumePosition(file, video.currentTime, video.duration)
  }

  const handleEnded = () => {
    clearResumePosition(file)
    lastPositionRef.current = 0
    onTimeChange?.(0)
    onEnded?.()
  }

  const changeRate = (next: number) => {
    setRate(next)
    savePlaybackRate(next)
    if (videoRef.current) videoRef.current.playbackRate = next
  }

  const handleFullscreen = () => {
    if (videoRef.current) void toggleVideoFullscreen(videoRef.current)
  }

  const compact = variant === 'compact'
  const showControls = !(compact && keyboardOpen)

  return (
    <div className={`flex w-full flex-col ${compact ? 'max-w-3xl shrink-0 gap-1.5' : 'max-w-4xl gap-2'}`}>
      <div className={`overflow-hidden rounded-ds-2xl border border-[#1f1f23] bg-black ${compact ? '' : 'aspect-video w-full'}`}>
        <video
          ref={videoRef}
          key={file}
          src={src}
          controls
          autoPlay
          playsInline
          preload="metadata"
          controlsList="nodownload"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPause={handlePause}
          onEnded={handleEnded}
          className={
            compact
              ? `w-full bg-black object-contain ${keyboardOpen ? 'max-h-[26vh]' : 'max-h-[52vh]'}`
              : 'h-full w-full object-contain'
          }
        />
      </div>

      {showControls && (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-1" role="group" aria-label={labels.speed}>
            {PLAYBACK_RATES.map(r => {
              const active = rate === r
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => changeRate(r)}
                  data-testid={`video-rate-${r}`}
                  aria-pressed={active}
                  className={`rounded-[7px] border px-2 py-1 font-mono text-[11px] font-bold tabular-nums transition-colors ${
                    active
                      ? 'border-sky-400/70 bg-sky-500/20 text-sky-100'
                      : 'border-[#1f1f23] bg-[#0c0c0c] text-zinc-400 hover:border-[#3f3f46]'
                  }`}
                >
                  {formatRate(r)}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={handleFullscreen}
            data-testid="video-fullscreen"
            aria-label={isFs ? labels.exitFullscreen : labels.fullscreen}
            title={isFs ? labels.exitFullscreen : labels.fullscreen}
            className="flex shrink-0 items-center justify-center rounded-[7px] border border-[#1f1f23] bg-[#0c0c0c] px-2 py-1 text-zinc-400 transition-colors hover:border-sky-500/40 hover:text-sky-300"
          >
            {isFs ? <Minimize size={14} strokeWidth={1.5} /> : <Maximize size={14} strokeWidth={1.5} />}
          </button>
        </div>
      )}
    </div>
  )
}
