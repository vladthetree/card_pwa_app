import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronDown, ExternalLink, Play, WifiOff, X } from 'lucide-react'
import {
  MESSER_DOMAINS,
  MESSER_VIDEOS,
  PROF_MESSER_COURSE_URL,
  messerEmbedUrl,
  messerWatchUrl,
  type MesserVideo,
} from '../../data/professorMesserLinks'

/**
 * Lernvideos — verweist je SY0-701-Objective auf das passende kostenlose
 * Professor-Messer-Video und spielt es per eingebettetem Player INNERHALB der
 * App ab (youtube-nocookie). Die Objective-Struktur deckt sich 1:1 mit den
 * Decks (`sy0-701-objective-D-O`). NEU GENERIERTE Ansicht (kein Screenshot-Beleg);
 * Stil an Labs angelehnt.
 */

const COPY = {
  de: {
    title: 'Lernvideos',
    subtitle: 'Professor Messer · CompTIA Security+ SY0-701',
    back: 'Zurück',
    close: 'Schließen',
    watchOnYoutube: 'Auf YouTube öffnen',
    courseIndex: 'Kompletter Kursindex',
    offlineTitle: 'Offline',
    offlineHint: 'Für die Videowiedergabe ist eine Internetverbindung nötig.',
    objective: 'Objective',
    seen: 'GESEHEN',
    open: 'OFFEN',
  },
  en: {
    title: 'Videos',
    subtitle: 'Professor Messer · CompTIA Security+ SY0-701',
    back: 'Back',
    close: 'Close',
    watchOnYoutube: 'Open on YouTube',
    courseIndex: 'Full course index',
    offlineTitle: 'Offline',
    offlineHint: 'Playing videos requires an internet connection.',
    objective: 'Objective',
    seen: 'SEEN',
    open: 'OPEN',
  },
} as const

const VIDEO_STATUS_STORAGE_KEY = 'card-pwa-messer-video-status'

interface Props {
  language: 'de' | 'en'
  onExit: () => void
}

function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

function readViewedVideos(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const parsed = JSON.parse(window.localStorage.getItem(VIDEO_STATUS_STORAGE_KEY) ?? '[]')
    return new Set(Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

export default function VideosView({ language, onExit }: Props) {
  const copy = COPY[language]
  const online = useOnline()
  const [active, setActive] = useState<MesserVideo | null>(null)
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [viewedVideos, setViewedVideos] = useState<Set<string>>(readViewedVideos)

  const byDomain = useMemo(() => {
    const map = new Map<number, MesserVideo[]>()
    for (const domain of MESSER_DOMAINS) map.set(domain.domain, [])
    for (const video of MESSER_VIDEOS) map.get(video.domain)?.push(video)
    return map
  }, [])

  const toggleDomain = (domain: number) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(domain)) next.delete(domain)
      else next.add(domain)
      return next
    })
  }

  const openVideo = (video: MesserVideo) => {
    setViewedVideos(prev => {
      const next = new Set(prev)
      next.add(video.objective)
      window.localStorage.setItem(VIDEO_STATUS_STORAGE_KEY, JSON.stringify(Array.from(next)))
      return next
    })
    setActive(video)
  }

  // Body-Scroll sperren, solange der Player offen ist.
  useEffect(() => {
    if (!active) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [active])

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-[#18181b] bg-[#050505] px-4 pb-3 pt-safe-2">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onExit} className="ds-icon-button flex h-11 w-11 shrink-0" aria-label={copy.back}>
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[22px] font-bold leading-tight text-white">{copy.title}</div>
            <div className="truncate font-mono text-[12px] text-zinc-500">{copy.subtitle}</div>
          </div>
          {!online && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 font-mono text-[11px] font-bold text-amber-300">
              <WifiOff size={13} strokeWidth={1.5} />
              {copy.offlineTitle}
            </span>
          )}
        </div>
      </div>

      {/* Domains */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3" data-study-scroll="allow">
        <div className="flex flex-col gap-3">
          {MESSER_DOMAINS.map(domain => {
            const videos = byDomain.get(domain.domain) ?? []
            if (videos.length === 0) return null
            const isCollapsed = collapsed.has(domain.domain)
            return (
              <section key={domain.domain} className="rounded-[14px] border border-[#18181b] bg-[#0a0a0a] p-3">
                <button
                  type="button"
                  onClick={() => toggleDomain(domain.domain)}
                  className="flex w-full items-center gap-3 text-left"
                  aria-expanded={!isCollapsed}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-[#1f1f23] bg-[#0c0c0c] font-mono text-[15px] font-bold text-zinc-300">
                    {domain.domain}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate font-mono text-[16px] font-bold text-white">{domain.title}</span>
                      <span className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-sky-400">
                        {videos.length}
                      </span>
                    </span>
                    <span className="block truncate font-mono text-[12px] text-zinc-500">
                      {copy.objective} {videos[0].objective}–{videos[videos.length - 1].objective}
                    </span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-zinc-500 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>

                {!isCollapsed && (
                  <div className="mt-3 flex flex-col gap-2">
                    {videos.map(video => (
                      <button
                        key={video.objective}
                        type="button"
                        data-testid={`messer-video-${video.objective}`}
                        onClick={() => openVideo(video)}
                        className="flex w-full items-center gap-3 rounded-[12px] border border-[#1f1f23] bg-[#0c0c0c] px-3 py-3 text-left transition-colors hover:border-[#3f3f46]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-sky-500/30 bg-sky-500/10 text-sky-300">
                          <Play size={15} strokeWidth={1.5} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-[14px] text-zinc-100">{video.title}</span>
                          <span className="mt-0.5 block truncate font-mono text-[11px] text-zinc-500">
                            {copy.objective} {video.objective}
                          </span>
                        </span>
                        <span className={`shrink-0 rounded-[6px] border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${
                          viewedVideos.has(video.objective)
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                        }`}>
                          {viewedVideos.has(video.objective) ? copy.seen : copy.open}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )
          })}

          <a
            href={PROF_MESSER_COURSE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#1f1f23] px-3 py-3 font-mono text-[12px] text-zinc-500 transition-colors hover:border-[#3f3f46] hover:text-zinc-300"
          >
            <ExternalLink size={13} strokeWidth={1.5} />
            {copy.courseIndex}
          </a>
        </div>
      </div>

      {/* In-App-Player */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
        >
          <div className="flex items-center gap-3 px-4 pb-3 pt-safe-2">
            <div className="min-w-0 flex-1">
              <div className="truncate font-mono text-[15px] font-bold text-white">{active.title}</div>
              <div className="truncate font-mono text-[11px] text-zinc-500">
                {copy.objective} {active.objective} · Professor Messer
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="ds-icon-button flex h-11 w-11 shrink-0"
              aria-label={copy.close}
              data-testid="messer-player-close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 pb-safe-4">
            {online ? (
              <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-[14px] border border-[#1f1f23] bg-black">
                <iframe
                  key={active.videoId}
                  className="h-full w-full"
                  src={messerEmbedUrl(active.videoId)}
                  title={active.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="flex w-full max-w-3xl flex-col items-center gap-3 rounded-[14px] border border-amber-500/30 bg-amber-500/5 px-4 py-10 text-center">
                <WifiOff size={28} strokeWidth={1.5} className="text-amber-300" />
                <div className="font-mono text-[14px] font-bold text-amber-200">{copy.offlineTitle}</div>
                <div className="font-mono text-[12px] text-zinc-400">{copy.offlineHint}</div>
              </div>
            )}

            <a
              href={messerWatchUrl(active.videoId)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 font-mono text-[12px] text-zinc-500 transition-colors hover:text-zinc-300"
            >
              <ExternalLink size={13} strokeWidth={1.5} />
              {copy.watchOnYoutube}
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
