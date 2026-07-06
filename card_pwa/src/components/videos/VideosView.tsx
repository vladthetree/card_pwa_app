/**
 * AI_CONTEXT:
 * Role: Primary video learning workspace; combines local Messer manifest, offline download state, player, objective list, recall check, notes, tags, and tag collections.
 * Used by: App.tsx video view.
 * Important: Objective code is the bridge between videos, decks, recall cards, progress, and video notes; preserve that 1:1 mapping.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  HardDriveDownload,
  Hash,
  Loader2,
  NotebookPen,
  Play,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react'
import { MESSER_DOMAINS, PROF_MESSER_COURSE_URL } from '../../data/professorMesserLinks'
import { getSecurityObjectiveDeckId, SY0_701_OBJECTIVES } from '../../utils/securityDeckHierarchy'
import { useHandsetLayout } from '../../hooks/useHandsetLayout'
import { useVisualViewport } from '../../hooks/useVisualViewport'
import { useVideoNoteIndex } from '../../hooks/useVideoNotes'
import { useSettings } from '../../contexts/SettingsContext'
import { getDeckSuccessRates, type DeckSuccessRate } from '../../db/queries'
import type { Card } from '../../types'
import { profileScopeId } from '../../services/profileService'
import { useMesserVideoProgress, resolveVideoStatus, type MesserVideoProgress, type VideoConfidence } from '../../hooks/useMesserVideoProgress'
import { useLocalMesserVideos, useVideoSource, type LocalVideoItem, type LocalVideoObjectiveGroup } from '../../hooks/useLocalMesserVideos'
import { summarizeDownloads } from '../../utils/videoDownloadQueue'
import MesserVideoPlayer from './MesserVideoPlayer'
import VideoNotesPanel from './VideoNotesPanel'
import VideoRecallCheck from './VideoRecallCheck'
import TagCollectionPanel from './TagCollectionPanel'
import VideoTagSidebar from './VideoTagSidebar'

/**
 * Lernvideos — selbst gehostete Professor-Messer-Videos (kein YouTube-iframe).
 * Der Pi liefert die .mp4 per Range-Streaming; einzelne Videos lassen sich für
 * die Offline-Nutzung (Handy ohne Netz) in IndexedDB herunterladen und werden
 * dann lokal via Object-URL abgespielt.
 *
 * Layout wie zuvor: Handy = Liste + Vollbild-Player; Desktop = geteilt mit
 * Player + Liste links und Notizzettel rechts. Abruf-Check, Notizen und der
 * 3-stufige Status hängen weiterhin am Objective (1:1 zu den Decks).
 */

const COPY = {
  de: {
    title: 'Lernvideos',
    subtitle: 'Professor Messer · CompTIA Security+ SY0-701 · lokal',
    back: 'Zurück',
    close: 'Schließen',
    courseIndex: 'Kompletter Kursindex (YouTube)',
    objective: 'Objective',
    seen: 'GESEHEN',
    open: 'OFFEN',
    pickVideo: 'Wähle links ein Video aus, um es hier abzuspielen.',
    hasNote: 'Notiz vorhanden',
    recall: 'Abruf-Check',
    confidenceLabel: 'Selbsteinschätzung',
    confidenceHint: 'Schau das Video, prüf dich aktiv und setz ehrlich deinen Status — Schauen allein ist noch kein Können.',
    deckRate: 'Deck-Quote: {rate} % ({total} Reviews)',
    calibrationWarning: 'Deine Einschätzung liegt über der tatsächlichen Quote — prüf dich noch mal aktiv.',
    gaps: 'LÜCKEN',
    ok: 'OKAY',
    solid: 'SICHER',
    gapsFull: 'Lücken',
    okFull: 'Okay',
    solidFull: 'Sicher',
    loading: 'Lade Videoliste …',
    unreachableTitle: 'Server nicht erreichbar',
    unreachableHint: 'Ohne Verbindung zum Pi sind nur heruntergeladene Videos verfügbar.',
    noVideos: 'Keine lokalen Videos gefunden.',
    download: 'Offline speichern',
    downloading: 'Lädt',
    offline: 'Offline',
    removeDownload: 'Offline-Kopie entfernen',
    allOffline: 'Alle offline',
    streamOnly: 'Nur online (nicht heruntergeladen)',
    resolving: 'Offline-Kopie wird geladen …',
    storage: '{count} offline · {size}',
    chapterDownload: 'Kapitel laden',
    cancel: 'Abbrechen',
    chapterOffline: 'Kapitel offline',
    queued: 'Wartet',
    quotaError: 'Gerätespeicher voll — nicht alle Videos konnten offline gesichert werden.',
    fullscreen: 'Vollbild',
    exitFullscreen: 'Vollbild verlassen',
    speed: 'Geschwindigkeit',
    noteStats: '{notes} Zettel · {tags} Tags',
    tags: 'Tags',
    course: 'Kurs',
    showCourse: 'Kurs öffnen',
    hideCourse: 'Kurs schließen',
    collapseRecall: 'Abruf-Check einklappen',
    done: 'Fertig',
    backToVideo: 'Video',
  },
  en: {
    title: 'Videos',
    subtitle: 'Professor Messer · CompTIA Security+ SY0-701 · local',
    back: 'Back',
    close: 'Close',
    courseIndex: 'Full course index (YouTube)',
    objective: 'Objective',
    seen: 'SEEN',
    open: 'OPEN',
    pickVideo: 'Pick a video on the left to play it here.',
    hasNote: 'Has note',
    recall: 'Recall check',
    confidenceLabel: 'Self-assessment',
    confidenceHint: 'Watch the video, quiz yourself, and set your status honestly — watching alone is not knowing.',
    deckRate: 'Deck rate: {rate}% ({total} reviews)',
    calibrationWarning: 'Your self-assessment is above your actual rate — quiz yourself again.',
    gaps: 'GAPS',
    ok: 'OKAY',
    solid: 'SOLID',
    gapsFull: 'Gaps',
    okFull: 'Okay',
    solidFull: 'Solid',
    loading: 'Loading video list …',
    unreachableTitle: 'Server unreachable',
    unreachableHint: 'Without a connection to the Pi, only downloaded videos are available.',
    noVideos: 'No local videos found.',
    download: 'Save offline',
    downloading: 'Loading',
    offline: 'Offline',
    removeDownload: 'Remove offline copy',
    allOffline: 'All offline',
    streamOnly: 'Online only (not downloaded)',
    resolving: 'Loading offline copy …',
    storage: '{count} offline · {size}',
    chapterDownload: 'Download chapter',
    cancel: 'Cancel',
    chapterOffline: 'Chapter offline',
    queued: 'Queued',
    quotaError: 'Device storage full — not all videos could be saved offline.',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
    speed: 'Playback speed',
    noteStats: '{notes} notes · {tags} tags',
    tags: 'Tags',
    course: 'Course',
    showCourse: 'Open course',
    hideCourse: 'Close course',
    collapseRecall: 'Collapse recall',
    done: 'Done',
    backToVideo: 'Video',
  },
} as const

type Copy = (typeof COPY)[keyof typeof COPY]

const OBJECTIVE_TITLE = new Map(SY0_701_OBJECTIVES.map(o => [o.code, o.title]))

/** Gerätelokal gemerkter Boolean (Panel auf/zu) — überlebt Reloads. */
function usePersistentBool(key: string, fallback: boolean): [boolean, (next: boolean | ((prev: boolean) => boolean)) => void] {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? fallback : raw === '1'
    } catch {
      return fallback
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, value ? '1' : '0')
    } catch {
      /* privater Modus o. Ä. — Zustand bleibt für die Session erhalten */
    }
  }, [key, value])
  return [value, setValue]
}

interface Props {
  language: 'de' | 'en'
  onExit: () => void
  /** Abruf-Check-Handoff: startet eine reguläre Lernsession des Objective-Decks
   *  mit den „Nicht gewusst"-Karten (verlässt die Video-Ansicht). */
  onStartObjectiveStudy?: (input: { deckId: string; deckName: string; cards: Card[] }) => void
}

function formatBytes(n: number): string {
  if (n <= 0) return '0 MB'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = n
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value < 10 && unit > 1 ? 1 : 0)} ${units[unit]}`
}

/**
 * Statusbadge je Objective. Bloßes Schauen liefert nur ein neutrales „GESEHEN";
 * das grüne „SICHER" ist der Selbsteinschätzung nach aktivem Abruf vorbehalten.
 */
function statusBadge(entry: MesserVideoProgress | undefined, copy: Copy): { label: string; cls: string } {
  switch (resolveVideoStatus(entry)) {
    case 'solid':
      return { label: copy.solid, cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' }
    case 'ok':
      return { label: copy.ok, cls: 'border-sky-500/30 bg-sky-500/10 text-sky-300' }
    case 'gaps':
      return { label: copy.gaps, cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' }
    case 'watched':
      return { label: copy.seen, cls: 'border-zinc-600/40 bg-zinc-500/10 text-zinc-300' }
    default:
      return { label: copy.open, cls: 'border-sky-500/30 bg-sky-500/10 text-sky-300' }
  }
}

const CONFIDENCE_CHIPS: Array<{ level: VideoConfidence; labelKey: 'gapsFull' | 'okFull' | 'solidFull'; activeCls: string }> = [
  { level: 'gaps', labelKey: 'gapsFull', activeCls: 'border-amber-400/70 bg-amber-500/20 text-amber-100' },
  { level: 'ok', labelKey: 'okFull', activeCls: 'border-sky-400/70 bg-sky-500/20 text-sky-100' },
  { level: 'solid', labelKey: 'solidFull', activeCls: 'border-emerald-400/70 bg-emerald-500/20 text-emerald-100' },
]

function VideoStudyBar({
  confidence,
  deckStats,
  onStartRecall,
  onSetConfidence,
  copy,
  compact = false,
  open,
  onToggle,
}: {
  confidence: VideoConfidence | null
  /** Tatsächliche Erfolgsquote des Objective-Decks (Kalibrierungs-Anker). */
  deckStats?: { rate: number; total: number } | null
  onStartRecall: () => void
  onSetConfidence: (next: VideoConfidence | null) => void
  copy: Copy
  compact?: boolean
  open: boolean
  onToggle: () => void
}) {
  // Eingeklappt: schlanke Leiste zum Ausklappen → mehr Platz fürs Video.
  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        data-testid="video-studybar-toggle"
        aria-expanded={false}
        className={`mt-2 flex w-full max-w-3xl items-center justify-center gap-2 rounded-ds-lg border border-[#18181b] bg-[#080808] font-mono font-bold text-zinc-400 transition-colors hover:border-sky-500/40 hover:text-sky-200 ${
          compact ? 'py-1.5 text-[11px]' : 'py-2 text-[12px]'
        }`}
      >
        <Brain size={14} strokeWidth={1.5} />
        {copy.recall}
        <ChevronDown size={13} strokeWidth={1.5} />
      </button>
    )
  }

  const chips = (
    <div className="flex gap-1.5">
      {CONFIDENCE_CHIPS.map(chip => {
        const active = confidence === chip.level
        return (
          <button
            key={chip.level}
            type="button"
            onClick={() => onSetConfidence(active ? null : chip.level)}
            data-testid={`video-confidence-${chip.level}`}
            aria-pressed={active}
            className={`rounded-ds border font-mono font-bold transition-colors ${compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1 text-[11px]'} ${
              active ? chip.activeCls : 'border-[#1f1f23] bg-[#0c0c0c] text-zinc-400 hover:border-[#3f3f46]'
            }`}
          >
            {copy[chip.labelKey]}
          </button>
        )
      })}
    </div>
  )

  const collapseBtn = (
    <button
      type="button"
      onClick={onToggle}
      data-testid="video-studybar-toggle"
      aria-expanded={true}
      aria-label={copy.collapseRecall}
      title={copy.collapseRecall}
      className="ds-icon-button flex h-7 w-7 shrink-0"
    >
      <ChevronUp size={14} strokeWidth={1.5} />
    </button>
  )

  // Kompakt (Handy): eine Zeile + Einklapp-Pfeil.
  if (compact) {
    return (
      <div className="mt-2 flex w-full max-w-3xl items-center gap-2">
        <button
          type="button"
          onClick={onStartRecall}
          data-testid="video-recall-start"
          className="flex shrink-0 items-center gap-1.5 rounded-ds-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 font-mono text-[12px] font-bold text-sky-200 transition-colors hover:border-sky-400/70"
        >
          <Brain size={14} strokeWidth={1.5} />
          {copy.recall}
        </button>
        <div className="flex flex-1 justify-end">{chips}</div>
        {collapseBtn}
      </div>
    )
  }

  return (
    <div className="mt-3 w-full max-w-3xl rounded-ds-2xl border border-[#18181b] bg-[#080808] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">{copy.recall}</span>
        {collapseBtn}
      </div>
      <button
        type="button"
        onClick={onStartRecall}
        data-testid="video-recall-start"
        className="flex w-full items-center justify-center gap-2 rounded-ds-xl border border-sky-500/40 bg-sky-500/10 py-3 font-mono text-[13px] font-bold text-sky-200 transition-colors hover:border-sky-400/70"
      >
        <Brain size={16} strokeWidth={1.5} />
        {copy.recall}
      </button>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">{copy.confidenceLabel}</span>
        {chips}
      </div>

      {/* Metakognitive Kalibrierung: Einschätzung neben der echten Deck-Quote.
          Erst ab ~10 Reviews — davor ist die Quote kein belastbarer Anker. */}
      {deckStats && deckStats.total >= 10 && (() => {
        const overconfident =
          (confidence === 'solid' && deckStats.rate < 75) ||
          (confidence === 'ok' && deckStats.rate < 55)
        return (
          <p
            data-testid="video-calibration"
            className={`mt-2 font-mono text-[10px] leading-relaxed ${overconfident ? 'text-amber-300/90' : 'text-zinc-500'}`}
          >
            {copy.deckRate.replace('{rate}', String(deckStats.rate)).replace('{total}', String(deckStats.total))}
            {overconfident ? ` — ${copy.calibrationWarning}` : ''}
          </p>
        )
      })()}

      <p className="mt-2 font-mono text-[10px] leading-relaxed text-zinc-600">{copy.confidenceHint}</p>
    </div>
  )
}

/** Download-/Offline-Steuerung für ein einzelnes Video. */
function DownloadControl({
  item,
  copy,
  onDownload,
  onRemove,
}: {
  item: LocalVideoItem
  copy: Copy
  onDownload: () => void
  onRemove: () => void
}) {
  if (item.progress !== undefined) {
    const pct = Math.round(item.progress * 100)
    return (
      <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] font-bold text-sky-300" aria-label={`${copy.downloading} ${pct}%`}>
        <Loader2 size={13} className="animate-spin" />
        {pct}%
      </span>
    )
  }
  if (item.queued) {
    return (
      <span className="flex shrink-0 items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-500" aria-label={copy.queued}>
        <Clock size={12} strokeWidth={1.5} />
        {copy.queued}
      </span>
    )
  }
  if (item.downloaded) {
    return (
      <button
        type="button"
        onClick={onRemove}
        title={copy.removeDownload}
        aria-label={copy.removeDownload}
        data-testid={`video-remove-${item.file}`}
        className="group/dl flex shrink-0 items-center gap-1 rounded-[6px] border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
      >
        <Check size={12} strokeWidth={2} className="group-hover/dl:hidden" />
        <Trash2 size={12} strokeWidth={1.5} className="hidden group-hover/dl:block" />
        {copy.offline}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onDownload}
      title={copy.download}
      aria-label={copy.download}
      data-testid={`video-download-${item.file}`}
      className="flex shrink-0 items-center justify-center rounded-[6px] border border-[#1f1f23] bg-[#0c0c0c] px-2 py-1 text-zinc-400 transition-colors hover:border-sky-500/40 hover:text-sky-300"
    >
      <Download size={13} strokeWidth={1.5} />
    </button>
  )
}

interface DomainDownloadStats {
  total: number
  done: number
  pending: LocalVideoItem[]
  active: boolean
}

/** Aggregierter Offline-Status eines Kapitels (Domain). */
function domainDownloadStats(groups: LocalVideoObjectiveGroup[]): DomainDownloadStats {
  const videos = groups.flatMap(group => group.videos)
  const summary = summarizeDownloads(videos)
  return {
    total: summary.total,
    done: summary.done,
    active: summary.active,
    pending: videos.filter(video => !video.downloaded && video.progress === undefined && !video.queued),
  }
}

/** „Kapitel offline laden" — lädt alle noch fehlenden Videos einer Domain. */
function ChapterDownloadButton({
  stats,
  copy,
  onDownload,
  onCancel,
}: {
  stats: DomainDownloadStats
  copy: Copy
  onDownload: () => void
  onCancel: () => void
}) {
  if (stats.total === 0) return null

  if (stats.active) {
    return (
      <span className="flex shrink-0 items-center gap-1.5 rounded-ds border border-sky-500/40 bg-sky-500/10 px-2 py-1 font-mono text-[10px] font-bold text-sky-200">
        <Loader2 size={12} className="animate-spin" />
        {stats.done}/{stats.total}
        <button
          type="button"
          onClick={onCancel}
          aria-label={copy.cancel}
          title={copy.cancel}
          data-testid="chapter-cancel"
          className="ml-0.5 text-sky-300/80 transition-colors hover:text-rose-300"
        >
          <X size={12} />
        </button>
      </span>
    )
  }

  if (stats.pending.length > 0) {
    return (
      <button
        type="button"
        onClick={onDownload}
        data-testid="chapter-download"
        title={copy.chapterDownload}
        className="flex shrink-0 items-center gap-1.5 rounded-ds border border-[#1f1f23] bg-[#0c0c0c] px-2 py-1 font-mono text-[10px] font-bold text-zinc-300 transition-colors hover:border-sky-500/40 hover:text-sky-300"
      >
        <HardDriveDownload size={12} strokeWidth={1.5} />
        {copy.chapterDownload}
      </button>
    )
  }

  return (
    <span
      className="flex shrink-0 items-center gap-1 rounded-ds border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-[10px] font-bold text-emerald-300"
      title={copy.chapterOffline}
    >
      <Check size={12} strokeWidth={2} />
      {copy.chapterOffline}
    </span>
  )
}

export default function VideosView({ language, onExit, onStartObjectiveStudy }: Props) {
  const copy = COPY[language]
  const { isHandsetLayout } = useHandsetLayout()
  const isDesktop = !isHandsetLayout
  const { profile, settings } = useSettings()
  const profileId = profileScopeId(profile)
  const { withNotes: objectivesWithNotes, allTags } = useVideoNoteIndex(profileId)
  const { progress, markWatched, setConfidence } = useMesserVideoProgress()

  // Echte Erfolgsquoten der Objective-Decks als Kalibrierungs-Anker neben der
  // Selbsteinschätzung (einmal pro Mount; ein Batch-Read statt 35 Einzelqueries).
  const [deckSuccessRates, setDeckSuccessRates] = useState<Record<string, DeckSuccessRate>>({})
  useEffect(() => {
    let cancelled = false
    const deckIds = SY0_701_OBJECTIVES.map(objective => getSecurityObjectiveDeckId(objective.code))
    void getDeckSuccessRates(deckIds).then(rates => {
      if (!cancelled) setDeckSuccessRates(rates)
    }).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  const { status, groups, totalBytes, downloadedCount, downloadVideo, enqueueDownloads, cancelDownloads, removeVideo, downloadError } = useLocalMesserVideos()

  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [recallOpen, setRecallOpen] = useState(false)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [showTagSidebar, setShowTagSidebar] = usePersistentBool('card-pwa-video-tags-open-v2', false)
  const [studyBarOpen, setStudyBarOpen] = usePersistentBool('card-pwa-video-studybar-open-v2', false)
  const [coursePanelOpen, setCoursePanelOpen] = usePersistentBool('card-pwa-video-course-panel-open', false)
  const [tagSheetOpen, setTagSheetOpen] = useState(false)
  const [noteFocused, setNoteFocused] = useState(false)
  const noteBlurTimer = useRef<number | undefined>(undefined)
  const [currentVideoTime, setCurrentVideoTime] = useState(0)
  const [seekRequest, setSeekRequest] = useState<{ id: number; seconds: number } | null>(null)
  const viewport = useVisualViewport()
  const keyboardOpen = viewport?.keyboardOpen ?? false

  const activeItem = useMemo(
    () => groups.flatMap(group => group.videos).find(video => video.file === activeFile) ?? null,
    [groups, activeFile],
  )
  const { src: videoSrc, resolving } = useVideoSource(activeItem?.file ?? null, activeItem?.downloaded ?? false)
  const noteStatsLabel = copy.noteStats
    .replace('{notes}', String(objectivesWithNotes.size))
    .replace('{tags}', String(allTags.length))

  const groupsByDomain = useMemo(() => {
    const map = new Map<number, LocalVideoObjectiveGroup[]>()
    for (const domain of MESSER_DOMAINS) map.set(domain.domain, [])
    for (const group of groups) map.get(group.domain)?.push(group)
    return map
  }, [groups])

  const toggleDomain = (domain: number) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(domain)) next.delete(domain)
      else next.add(domain)
      return next
    })
  }

  const openVideo = (item: LocalVideoItem) => {
    markWatched(item.objective)
    setRecallOpen(false)
    setCurrentVideoTime(0)
    setSeekRequest(null)
    if (isDesktop) setCoursePanelOpen(false)
    setActiveFile(item.file)
  }

  const seekToTime = (seconds: number) => {
    setSeekRequest({ id: Date.now(), seconds })
    setCurrentVideoTime(seconds)
  }

  // Aus der Tag-Ansicht zu einem verbundenen Video springen.
  const openObjectiveFromTag = (objective: string) => {
    const video = groups.find(group => group.objective === objective)?.videos[0]
    if (video) openVideo(video)
    setActiveTag(null)
  }

  // Tag aus der Sidebar öffnen → Tag-Seite; auf Handy das Bottom-Sheet schließen.
  const openTagFromSidebar = (tag: string) => {
    setActiveTag(tag)
    setTagSheetOpen(false)
  }

  // Von einer Zeitmarke der Tag-Seite ins Video springen (evtl. anderes Video):
  // Video öffnen und Seek anfordern; der Player holt den Seek nach dem Laden nach.
  const openObjectiveAtTime = (objective: string, seconds: number) => {
    const video = groups.find(group => group.objective === objective)?.videos[0]
    if (video) {
      openVideo(video)
      seekToTime(seconds)
    }
    setActiveTag(null)
  }

  // Handy-Schreibmodus: Textfeld fokussiert ODER Tastatur sichtbar → Notizzettel
  // groß/oben, Video ausgeblendet, damit die Tastatur nichts verdeckt. Blur wird
  // kurz entprellt, damit Zettel-Tool-Taps (die neu fokussieren) nicht flackern.
  const handleNoteFocusChange = (focused: boolean) => {
    if (focused) {
      if (noteBlurTimer.current) window.clearTimeout(noteBlurTimer.current)
      setNoteFocused(true)
    } else {
      noteBlurTimer.current = window.setTimeout(() => setNoteFocused(false), 250)
    }
  }
  useEffect(() => () => { if (noteBlurTimer.current) window.clearTimeout(noteBlurTimer.current) }, [])

  useEffect(() => {
    if (!isHandsetLayout || keyboardOpen || !noteFocused) return
    const timer = window.setTimeout(() => {
      const active = document.activeElement
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
        active.blur()
      }
      setNoteFocused(false)
    }, 450)
    return () => window.clearTimeout(timer)
  }, [isHandsetLayout, keyboardOpen, noteFocused])

  // Zurück zur normalen Videoansicht: Tastatur schließen (Textfeld blur).
  const exitWriting = () => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    if (noteBlurTimer.current) window.clearTimeout(noteBlurTimer.current)
    setNoteFocused(false)
  }

  const writingMode = isHandsetLayout && (noteFocused || keyboardOpen)

  const hasTagActivity = objectivesWithNotes.size > 0 || allTags.length > 0

  // Body-Scroll nur für den mobilen Vollbild-Player sperren.
  useEffect(() => {
    if (!activeItem || !isHandsetLayout) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [activeItem, isHandsetLayout])

  const renderPlayer = (compact = false) =>
    activeItem ? (
      videoSrc ? (
        <MesserVideoPlayer
          file={activeItem.file}
          src={videoSrc}
          variant={compact ? 'compact' : 'full'}
          keyboardOpen={keyboardOpen}
          pauseForKeyboardInput={compact && writingMode}
          onTimeChange={setCurrentVideoTime}
          seekRequest={seekRequest}
          labels={{ fullscreen: copy.fullscreen, exitFullscreen: copy.exitFullscreen, speed: copy.speed }}
        />
      ) : resolving ? (
        <div className="flex aspect-video w-full max-w-6xl flex-col items-center justify-center gap-3 rounded-ds-2xl border border-[#1f1f23] bg-black text-center">
          <Loader2 size={26} className="animate-spin text-zinc-500" />
          <div className="font-mono text-[12px] text-zinc-500">{copy.resolving}</div>
        </div>
      ) : (
        <div className="flex aspect-video w-full max-w-6xl flex-col items-center justify-center gap-3 rounded-ds-2xl border border-amber-500/30 bg-amber-500/5 text-center">
          <WifiOff size={26} strokeWidth={1.5} className="text-amber-300" />
          <div className="px-6 font-mono text-[12px] text-amber-200">{copy.streamOnly}</div>
        </div>
      )
    ) : (
      <div className="flex aspect-video w-full max-w-6xl flex-col items-center justify-center gap-3 rounded-ds-2xl border border-dashed border-[#1f1f23] bg-[#070707] text-center">
        <Play size={28} strokeWidth={1.5} className="text-zinc-600" />
        <div className="px-6 font-mono text-[12px] text-zinc-500">{copy.pickVideo}</div>
      </div>
    )

  const objectiveSection = (group: LocalVideoObjectiveGroup) => {
    const title = OBJECTIVE_TITLE.get(group.objective) ?? ''
    const badge = statusBadge(progress[group.objective], copy)
    const hasNote = objectivesWithNotes.has(group.objective)
    const pending = group.videos.filter(video => !video.downloaded && video.progress === undefined && !video.queued)
    return (
      <div key={group.objective} className="rounded-ds-xl border border-[#1f1f23] bg-[#0a0a0a] p-2">
        <div className="flex items-center gap-2 px-1 py-1">
          <span className="font-mono text-[12px] font-bold text-zinc-200">{group.objective}</span>
          <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-zinc-400">{title}</span>
          {hasNote && (
            <span className="shrink-0 text-emerald-400" title={copy.hasNote} aria-label={copy.hasNote}>
              <NotebookPen size={13} strokeWidth={1.5} />
            </span>
          )}
          <span className={`shrink-0 rounded-[6px] border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${badge.cls}`}>
            {badge.label}
          </span>
          {pending.length > 0 && (
            <button
              type="button"
              onClick={() => enqueueDownloads(pending)}
              title={copy.allOffline}
              aria-label={copy.allOffline}
              data-testid={`objective-download-all-${group.objective}`}
              className="flex shrink-0 items-center gap-1 rounded-[6px] border border-[#1f1f23] bg-[#0c0c0c] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400 transition-colors hover:border-sky-500/40 hover:text-sky-300"
            >
              <HardDriveDownload size={11} strokeWidth={1.5} />
              {pending.length}
            </button>
          )}
        </div>

        <div className="mt-1 flex flex-col gap-1">
          {group.videos.map(video => {
            const isActive = activeItem?.file === video.file
            return (
              <div
                key={video.file}
                className={`flex items-center gap-2 rounded-ds-lg border px-2 py-2 transition-colors ${
                  isActive ? 'border-sky-500/60 bg-sky-500/10' : 'border-transparent hover:border-[#1f1f23] hover:bg-[#0c0c0c]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => openVideo(video)}
                  data-testid={`local-video-${video.file}`}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-ds border border-sky-500/30 bg-sky-500/10 text-sky-300">
                    <Play size={13} strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-zinc-100">{video.title}</span>
                </button>
                <DownloadControl
                  item={video}
                  copy={copy}
                  onDownload={() => { void downloadVideo(video) }}
                  onRemove={() => { void removeVideo(video.file) }}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const domainList = (
    <div className="flex flex-col gap-3">
      {status === 'loading' && groups.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-10 font-mono text-[12px] text-zinc-500">
          <Loader2 size={16} className="animate-spin" />
          {copy.loading}
        </div>
      )}

      {status === 'unreachable' && (
        <div className="flex w-full flex-col items-center gap-2 rounded-ds-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-5 text-center">
          <WifiOff size={24} strokeWidth={1.5} className="text-amber-300" />
          <div className="font-mono text-[13px] font-bold text-amber-200">{copy.unreachableTitle}</div>
          <div className="font-mono text-[11px] text-zinc-400">{copy.unreachableHint}</div>
        </div>
      )}

      {status !== 'loading' && groups.length === 0 && (
        <div className="py-10 text-center font-mono text-[12px] text-zinc-500">{copy.noVideos}</div>
      )}

      {downloadError === 'quota' && (
        <div className="rounded-ds-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2.5 font-mono text-[11px] text-rose-200">
          {copy.quotaError}
        </div>
      )}

      {MESSER_DOMAINS.map(domain => {
        const domainGroups = groupsByDomain.get(domain.domain) ?? []
        if (domainGroups.length === 0) return null
        const isCollapsed = collapsed.has(domain.domain)
        const videoCount = domainGroups.reduce((sum, group) => sum + group.videos.length, 0)
        const chapterStats = domainDownloadStats(domainGroups)
        return (
          <section key={domain.domain} className="rounded-ds-2xl border border-[#18181b] bg-[#0a0a0a] p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleDomain(domain.domain)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                aria-expanded={!isCollapsed}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ds-xl border border-[#1f1f23] bg-[#0c0c0c] font-mono text-[15px] font-bold text-zinc-300">
                  {domain.domain}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate font-mono text-[16px] font-bold text-white">{domain.title}</span>
                    <span className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-sky-400">{videoCount}</span>
                  </span>
                  <span className="block truncate font-mono text-[12px] text-zinc-500">
                    {domainGroups.length} {copy.objective}
                  </span>
                </span>
                <ChevronDown size={16} className={`shrink-0 text-zinc-500 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>
              <ChapterDownloadButton
                stats={chapterStats}
                copy={copy}
                onDownload={() => enqueueDownloads(chapterStats.pending)}
                onCancel={cancelDownloads}
              />
            </div>

            {!isCollapsed && <div className="mt-3 flex flex-col gap-2">{domainGroups.map(objectiveSection)}</div>}
          </section>
        )
      })}

      <a
        href={PROF_MESSER_COURSE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-ds-2xl border border-dashed border-[#1f1f23] px-3 py-3 font-mono text-[12px] text-zinc-500 transition-colors hover:border-[#3f3f46] hover:text-zinc-300"
      >
        <ExternalLink size={13} strokeWidth={1.5} />
        {copy.courseIndex}
      </a>
    </div>
  )

  const renderStudyBar = (compact = false) =>
    activeItem ? (
      <VideoStudyBar
        confidence={progress[activeItem.objective]?.confidence ?? null}
        deckStats={deckSuccessRates[getSecurityObjectiveDeckId(activeItem.objective)] ?? null}
        onStartRecall={() => setRecallOpen(true)}
        onSetConfidence={next => setConfidence(activeItem.objective, next)}
        copy={copy}
        compact={compact}
        open={studyBarOpen}
        onToggle={() => setStudyBarOpen(prev => !prev)}
      />
    ) : null

  const coursePanelExpanded = !activeItem || coursePanelOpen
  const coursePanelLabel = coursePanelOpen ? copy.hideCourse : copy.showCourse

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
          {hasTagActivity && (
            <button
              type="button"
              onClick={() => (isDesktop ? setShowTagSidebar(prev => !prev) : setTagSheetOpen(true))}
              aria-label={copy.tags}
              aria-pressed={isDesktop ? showTagSidebar : undefined}
              data-testid="video-tags-toggle"
              className={`flex shrink-0 items-center gap-1.5 rounded-ds-lg border px-2.5 py-1.5 font-mono text-[11px] font-bold transition-colors ${
                isDesktop && showTagSidebar
                  ? 'border-sky-400/60 bg-sky-500/15 text-sky-100'
                  : 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:border-sky-400/60'
              }`}
            >
              <Hash size={13} strokeWidth={1.5} />
              <span className="hidden sm:inline">{noteStatsLabel}</span>
            </button>
          )}
          {downloadedCount > 0 && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-ds-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 font-mono text-[11px] font-bold text-emerald-300">
              <HardDriveDownload size={13} strokeWidth={1.5} />
              {copy.storage.replace('{count}', String(downloadedCount)).replace('{size}', formatBytes(totalBytes))}
            </span>
          )}
          {status === 'unreachable' && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-ds-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 font-mono text-[11px] font-bold text-amber-300">
              <WifiOff size={13} strokeWidth={1.5} />
              {copy.unreachableTitle}
            </span>
          )}
        </div>
      </div>

      {isDesktop ? (
        /* ── Desktop: Fokus auf Player + Notizzettel; Kursliste als Ablage ── */
        <div className="flex min-h-0 flex-1">
          {showTagSidebar && hasTagActivity && (
            <aside className="flex min-h-0 w-56 shrink-0 flex-col border-r border-[#18181b] bg-[#070707]">
              <VideoTagSidebar
                profileId={profileId}
                language={language}
                activeTag={activeTag}
                onOpenTag={openTagFromSidebar}
                variant="panel"
                onCollapse={() => setShowTagSidebar(false)}
              />
            </aside>
          )}
          <div className="flex min-h-0 flex-[5] flex-col border-r border-[#18181b]">
            <div
              className={`flex flex-col items-center overflow-y-auto bg-black ${
                activeItem
                  ? 'min-h-0 flex-1 justify-center px-5 py-5'
                  : 'shrink-0 border-b border-[#18181b] px-4 py-4'
              }`}
              data-study-scroll="allow"
            >
              {renderPlayer()}
              {renderStudyBar()}
            </div>
            <div className={`${activeItem ? 'shrink-0' : 'min-h-0 flex-1'} flex flex-col border-t border-[#18181b] bg-[#060606]`}>
              {activeItem ? (
                <button
                  type="button"
                  onClick={() => setCoursePanelOpen(prev => !prev)}
                  aria-expanded={coursePanelOpen}
                  aria-label={coursePanelLabel}
                  title={coursePanelLabel}
                  className="flex min-h-[48px] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-[#0a0a0a]"
                >
                  <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{copy.course}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-zinc-300">
                    {activeItem.objective} · {activeItem.title}
                  </span>
                  {coursePanelOpen ? (
                    <ChevronDown size={15} strokeWidth={1.5} className="shrink-0 text-zinc-500" />
                  ) : (
                    <ChevronUp size={15} strokeWidth={1.5} className="shrink-0 text-zinc-500" />
                  )}
                </button>
              ) : (
                <div className="flex min-h-[44px] items-center px-3">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{copy.course}</span>
                </div>
              )}
              {coursePanelExpanded && (
                <div
                  className={`${activeItem ? 'max-h-[28vh]' : 'min-h-0 flex-1'} overflow-y-auto px-3 py-3`}
                  data-study-scroll="allow"
                >
                  {domainList}
                </div>
              )}
            </div>
          </div>

          <aside className="flex min-h-0 w-[34%] min-w-[340px] max-w-[560px] flex-col bg-[#070707]">
            <VideoNotesPanel
              profileId={profileId}
              objective={activeItem?.objective ?? null}
              videoId={activeItem?.file ?? null}
              videoTitle={activeItem?.title ?? null}
              language={language}
              onOpenTag={setActiveTag}
              onOpenObjective={openObjectiveFromTag}
              currentTimeSec={activeItem ? currentVideoTime : null}
              onSeekToTime={seekToTime}
            />
          </aside>
        </div>
      ) : (
        /* ── Handy: Liste + Vollbild-Player ── */
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3" data-study-scroll="allow">
          {domainList}
        </div>
      )}

      {/* Mobiler In-App-Player (Vollbild): Video OBEN verankert, darunter der
          Notizzettel. Höhe an das visualViewport gekoppelt, damit bei offener
          Tastatur das Textfeld sichtbar bleibt und das Video oben stehen bleibt. */}
      {isHandsetLayout && activeItem && (
        <div
          className="fixed left-0 right-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm"
          style={viewport ? { top: `${viewport.top}px`, height: `${viewport.height}px` } : { top: 0, height: '100dvh' }}
          role="dialog"
          aria-modal="true"
          aria-label={activeItem.title}
        >
          <div className={`flex shrink-0 items-center gap-3 px-4 pb-2 ${keyboardOpen || writingMode ? 'pt-2' : 'pt-safe-2'}`}>
            <div className="min-w-0 flex-1">
              <div className="truncate font-mono text-[15px] font-bold text-white">{activeItem.title}</div>
              <div className="truncate font-mono text-[11px] text-zinc-500">
                {copy.objective} {activeItem.objective} · {activeItem.downloaded ? copy.offline : 'Stream'}
              </div>
            </div>
            {writingMode ? (
              /* Schreibmodus: zurück zur normalen Videoansicht (schließt Tastatur). */
              <button
                type="button"
                onClick={exitWriting}
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-ds-lg border border-sky-500/40 bg-sky-500/10 px-3 font-mono text-[13px] font-bold text-sky-200 transition-colors hover:border-sky-400/70"
                data-testid="messer-writing-done"
              >
                <ArrowLeft size={16} strokeWidth={1.5} />
                {copy.backToVideo}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveFile(null)}
                className="ds-icon-button flex h-11 w-11 shrink-0"
                aria-label={copy.close}
                data-testid="messer-player-close"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Video + Lernleiste: im Schreibmodus ausgeblendet → Notizzettel bekommt
              den ganzen Platz über der Tastatur. Der Player bleibt gemountet,
              damit er kontrolliert pausieren und danach weiterlaufen kann. */}
          <div className={writingMode ? 'hidden' : 'flex shrink-0 justify-center px-3'}>
            {renderPlayer(true)}
          </div>
          {!writingMode && !keyboardOpen && <div className="flex shrink-0 justify-center px-3">{renderStudyBar(true)}</div>}

          {/* Notizzettel: EINE Instanz (kein Remount beim Moduswechsel → Fokus bleibt).
              Im Schreibmodus füllt er den ganzen sichtbaren Bereich über der Tastatur. */}
          <div className={`min-h-0 flex-1 border-t border-[#18181b] bg-[#070707] ${writingMode ? '' : 'mt-2'}`}>
            <VideoNotesPanel
              profileId={profileId}
              objective={activeItem.objective}
              videoId={activeItem.file}
              videoTitle={activeItem.title}
              language={language}
              onOpenTag={setActiveTag}
              onOpenObjective={openObjectiveFromTag}
              currentTimeSec={currentVideoTime}
              onSeekToTime={seekToTime}
              writing={writingMode}
              onFocusChange={handleNoteFocusChange}
            />
          </div>
        </div>
      )}

      {/* Handy: Tag-Liste als Bottom-Sheet (statt Dauer-Spalte) */}
      {isHandsetLayout && tagSheetOpen && (
        <VideoTagSidebar
          profileId={profileId}
          language={language}
          activeTag={activeTag}
          onOpenTag={openTagFromSidebar}
          variant="sheet"
          onClose={() => setTagSheetOpen(false)}
        />
      )}

      {/* Tag-Sammlung: alle Inhalte (Videos + Karten) zu diesem Tag */}
      {activeTag && (
        <TagCollectionPanel
          profileId={profileId}
          tag={activeTag}
          language={language}
          onClose={() => setActiveTag(null)}
          onOpenObjective={openObjectiveFromTag}
          onOpenObjectiveAtTime={openObjectiveAtTime}
          onOpenTag={setActiveTag}
        />
      )}

      {/* Abruf-Check (aktives Erinnern, nicht planungswirksam) */}
      {recallOpen && activeItem && (
        <VideoRecallCheck
          deckId={getSecurityObjectiveDeckId(activeItem.objective)}
          objective={activeItem.objective}
          videoTitle={activeItem.title}
          language={language}
          maxCards={settings.recallCheckSize}
          onClose={() => setRecallOpen(false)}
          onConfidence={next => {
            setConfidence(activeItem.objective, next)
            setRecallOpen(false)
          }}
          onStudyMissed={onStartObjectiveStudy
            ? cards => {
                setRecallOpen(false)
                onStartObjectiveStudy({
                  deckId: getSecurityObjectiveDeckId(activeItem.objective),
                  deckName: `${activeItem.objective} · ${OBJECTIVE_TITLE.get(activeItem.objective) ?? activeItem.title}`,
                  cards,
                })
              }
            : undefined}
        />
      )}
    </div>
  )
}
