/**
 * AI_CONTEXT:
 * Role: Primary video learning workspace; combines local Messer manifest, offline download state, player, objective list, recall check, notes, tags, and tag collections.
 * Used by: App.tsx video view.
 * Important: Objective code is the bridge between videos, decks, recall cards, progress, and video notes; preserve that 1:1 mapping.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HardDriveDownload,
  Hash,
  Loader2,
  NotebookPen,
  Play,
  WifiOff,
  X,
} from 'lucide-react'
import { MESSER_DOMAINS, PROF_MESSER_COURSE_URL } from '../../data/professorMesserLinks'
import { getSecurityObjectiveDeckId, SY0_701_OBJECTIVES } from '../../utils/securityDeckHierarchy'
import { useHandsetLayout } from '../../hooks/useHandsetLayout'
import { useVisualViewport } from '../../hooks/useVisualViewport'
import { useVideoNoteIndex } from '../../hooks/useVideoNotes'
import { useSettings } from '../../contexts/SettingsContext'
import type { Card } from '../../types'
import { profileScopeId } from '../../services/profileService'
import { useMesserVideoProgress, resolveVideoStatus, type MesserVideoProgress, type VideoConfidence } from '../../hooks/useMesserVideoProgress'
import { useVideoRecallScores, computeRecallVerdict, videoScoreKey, type VideoRecallVerdict } from '../../hooks/useVideoRecallScores'
import { useLocalMesserVideos, useVideoSource, type LocalVideoItem, type LocalVideoObjectiveGroup } from '../../hooks/useLocalMesserVideos'
import { markVideoOpened, markVideoWatched, setVideoConfidence } from '../../db/queries/learningUnits'
import {
  getActiveCourseExecutionForVideo,
  recordCourseRecallRun,
} from '../../services/learningUnitRunner'
import { usePersistentBool } from '../../hooks/videos/usePersistentBool'
import { useVideoTagPanels } from '../../hooks/videos/useVideoTagPanels'
import { useVideoWritingMode } from '../../hooks/videos/useVideoWritingMode'
import { useObjectiveDeckSuccessRates } from '../../hooks/videos/useObjectiveDeckSuccessRates'
import MesserVideoPlayer from './MesserVideoPlayer'
import VideoNotesPanel from './VideoNotesPanel'
import VideoRecallCheck from './VideoRecallCheck'
import VideoTranscriptPanel from './VideoTranscriptPanel'
import TagCollectionPanel from './TagCollectionPanel'
import VideoTagSidebar from './VideoTagSidebar'
import { COPY, type Copy } from './videosCopy'
import { VideoStudyBar } from './VideoStudyBar'
import { VideoDownloadControl } from './VideoDownloadControl'
import { ChapterDownloadButton, domainDownloadStats } from './ChapterDownloadButton'

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

const OBJECTIVE_TITLE = new Map(SY0_701_OBJECTIVES.map(o => [o.code, o.title]))

interface Props {
  language: 'de' | 'en'
  onExit: () => void
  /** Abruf-Check-Handoff: startet eine reguläre Lernsession des Objective-Decks
   *  mit den „Nicht gewusst"-Karten (verlässt die Video-Ansicht). */
  onStartObjectiveStudy?: (input: { deckId: string; deckName: string; cards: Card[] }) => void
  /** Heute-Paket: dieses Kurs-Video (Playlist-Index) nach dem Laden direkt öffnen. */
  initialVideoIndex?: number | null
  /** Heute-Paket: zusätzlich direkt den Abruf-Check zum Video öffnen. */
  initialRecallOpen?: boolean
  /** Lerneinheiten-Deep-Link: Schließen des direkt geöffneten Videos kehrt zum
   *  Aufrufer (Lerneinheiten-Screen) zurück statt in die Videoliste. */
  onCloseInitialVideo?: () => void
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
      return { label: copy.ok, cls: 'border-[--brand-secondary-25] bg-[--brand-secondary-12] text-[--brand-secondary]' }
    case 'gaps':
      return { label: copy.gaps, cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' }
    case 'watched':
      return { label: copy.seen, cls: 'border-zinc-600/40 bg-zinc-500/10 text-zinc-300' }
    default:
      return { label: copy.open, cls: 'border-[--brand-secondary-25] bg-[--brand-secondary-12] text-[--brand-secondary]' }
  }
}

/** Chip-Stile für die Verstanden-Empfehlung aus dem Abruf-Check (pro Video). */
const VERDICT_CHIP: Record<Exclude<VideoRecallVerdict, 'unknown'>, { labelKey: 'verdictUnderstood' | 'verdictAlmost' | 'verdictReview'; cls: string }> = {
  understood: { labelKey: 'verdictUnderstood', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  almost: { labelKey: 'verdictAlmost', cls: 'border-[--brand-secondary-25] bg-[--brand-secondary-12] text-[--brand-secondary]' },
  review: { labelKey: 'verdictReview', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
}

export default function VideosView({ language, onExit, onStartObjectiveStudy, initialVideoIndex = null, initialRecallOpen = false, onCloseInitialVideo }: Props) {
  const copy = COPY[language]
  const { isHandsetLayout } = useHandsetLayout()
  const isDesktop = !isHandsetLayout
  const { profile, settings } = useSettings()
  const profileId = profileScopeId(profile)
  const { withNotes: objectivesWithNotes, allTags } = useVideoNoteIndex(profileId)
  const { progress, markWatched, setConfidence } = useMesserVideoProgress()
  const { scores: recallScores, recordRun: recordRecallRun } = useVideoRecallScores()

  // Echte Erfolgsquoten der Objective-Decks als Kalibrierungs-Anker neben der Selbsteinschätzung.
  const deckSuccessRates = useObjectiveDeckSuccessRates()
  const { status, groups, totalBytes, downloadedCount, downloadVideo, enqueueDownloads, cancelDownloads, removeVideo, downloadError } = useLocalMesserVideos()

  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [recallOpen, setRecallOpen] = useState(false)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const { activeTag, setActiveTag, showTagSidebar, setShowTagSidebar, tagSheetOpen, setTagSheetOpen, openTagFromSidebar } = useVideoTagPanels()
  const [studyBarOpen, setStudyBarOpen] = usePersistentBool('card-pwa-video-studybar-open-v2', false)
  const [coursePanelOpen, setCoursePanelOpen] = usePersistentBool('card-pwa-video-course-panel-open', false)
  const [currentVideoTime, setCurrentVideoTime] = useState(0)
  const [seekRequest, setSeekRequest] = useState<{ id: number; seconds: number } | null>(null)
  const viewport = useVisualViewport()
  const keyboardOpen = viewport?.keyboardOpen ?? false
  const { writingMode, handleNoteFocusChange, exitWriting } = useVideoWritingMode({ isHandsetLayout, keyboardOpen })

  const activeItem = useMemo(
    () => groups.flatMap(group => group.videos).find(video => video.file === activeFile) ?? null,
    [groups, activeFile],
  )

  // Aktive Kurs-Ausführung (Lerneinheiten-System) zum geöffneten Video: friert
  // den Abruf-Check auf die Ausführungsfragen ein und bindet Läufe an sie.
  type ActiveCourseExecution = NonNullable<Awaited<ReturnType<typeof getActiveCourseExecutionForVideo>>>
  const [activeCourseExecution, setActiveCourseExecution] = useState<ActiveCourseExecution | null>(null)
  const activeVideoIndex = activeItem?.index ?? null
  useEffect(() => {
    let cancelled = false
    if (activeVideoIndex === null) {
      setActiveCourseExecution(null)
      return
    }
    getActiveCourseExecutionForVideo(profileId, activeVideoIndex)
      .then(execution => {
        if (!cancelled) setActiveCourseExecution(execution)
      })
      .catch(() => {
        if (!cancelled) setActiveCourseExecution(null)
      })
    return () => {
      cancelled = true
    }
  }, [profileId, activeVideoIndex])

  /** Selbsteinschätzung: legacy objective-weit UND dediziert pro Profil/Video;
   *  als expliziter Nutzerbefehl zählt sie zugleich als „gesehen“ (§8.2).
   *  `null` (Abwahl) löscht nur legacy — watchedAt bleibt bewusst bestehen. */
  const applyConfidence = (item: LocalVideoItem, next: VideoConfidence | null) => {
    setConfidence(item.objective, next)
    if (next === null) return
    const now = Date.now()
    void setVideoConfidence({ profileId, videoIndex: item.index, objectiveId: item.objective, confidence: next, now })
      .catch(error => console.error('[VideosView] setVideoConfidence', error))
    void markVideoWatched({ profileId, videoIndex: item.index, objectiveId: item.objective, method: 'manual', now })
      .catch(error => console.error('[VideosView] markVideoWatched', error))
  }
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
    // Dediziert zählt Öffnen NICHT als gesehen (§8.2) — nur als openedAt.
    void markVideoOpened({ profileId, videoIndex: item.index, objectiveId: item.objective, now: Date.now() })
      .catch(error => console.error('[VideosView] markVideoOpened', error))
    setRecallOpen(false)
    setTranscriptOpen(false)
    setCurrentVideoTime(0)
    setSeekRequest(null)
    if (isDesktop) setCoursePanelOpen(false)
    setActiveFile(item.file)
  }

  const seekToTime = (seconds: number) => {
    setSeekRequest({ id: Date.now(), seconds })
    setCurrentVideoTime(seconds)
  }

  // Heute-Paket-Sprungziel: das angeforderte Kurs-Video einmalig öffnen, sobald
  // der Katalog geladen ist (optional direkt mit Abruf-Check).
  const initialTargetConsumedRef = useRef(false)
  useEffect(() => {
    if (initialTargetConsumedRef.current) return
    if (initialVideoIndex === null || initialVideoIndex === undefined) return
    if (groups.length === 0) return
    initialTargetConsumedRef.current = true
    const target = groups.flatMap(group => group.videos).find(item => item.index === initialVideoIndex)
    if (!target) return
    openVideo(target)
    if (initialRecallOpen) setRecallOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, initialVideoIndex, initialRecallOpen])

  // Aus der Tag-Ansicht zu einem verbundenen Video springen.
  const openObjectiveFromTag = (objective: string) => {
    const video = groups.find(group => group.objective === objective)?.videos[0]
    if (video) openVideo(video)
    setActiveTag(null)
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
    recallOpen ? null : activeItem ? (
      videoSrc ? (
        <MesserVideoPlayer
          file={activeItem.file}
          src={videoSrc}
          variant={compact ? 'compact' : 'full'}
          paused={recallOpen}
          keyboardOpen={keyboardOpen || writingMode}
          pauseForKeyboardInput={false}
          onTimeChange={setCurrentVideoTime}
          seekRequest={seekRequest}
          onEnded={() => {
            // Zu Ende geschaut → dediziertes watchedAt (Methode 'ended', §8.2).
            void markVideoWatched({ profileId, videoIndex: activeItem.index, objectiveId: activeItem.objective, method: 'ended', now: Date.now() })
              .catch(error => console.error('[VideosView] markVideoWatched(ended)', error))
          }}
          labels={{ fullscreen: copy.fullscreen, exitFullscreen: copy.exitFullscreen, speed: copy.speed }}
        />
      ) : resolving ? (
        <div className="neo-keep-dark flex aspect-video w-full max-w-6xl flex-col items-center justify-center gap-3 rounded-ds-2xl border border-[#1f1f23] bg-black text-center">
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
              className="flex shrink-0 items-center gap-1 rounded-[6px] border border-[#1f1f23] bg-[#0c0c0c] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400 transition-colors hover:border-[--brand-secondary-50] hover:text-[--brand-secondary]"
            >
              <HardDriveDownload size={11} strokeWidth={1.5} />
              {pending.length}
            </button>
          )}
        </div>

        <div className="mt-1 flex flex-col gap-1">
          {group.videos.map(video => {
            const isActive = activeItem?.file === video.file
            const verdict = computeRecallVerdict(recallScores[videoScoreKey(video.index)])
            return (
              <div
                key={video.file}
                className={`flex items-center gap-2 rounded-ds-lg border px-2 py-2 transition-colors ${
                  isActive
                    ? 'border-[--brand-secondary-80] bg-[--brand-secondary-12]'
                    : 'border-transparent hover:border-black hover:bg-[#FFD93D]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => openVideo(video)}
                  data-testid={`local-video-${video.file}`}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-ds border border-[--brand-secondary-25] bg-[--brand-secondary-12] text-[--brand-secondary]">
                    <Play size={13} strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-zinc-100">{video.title}</span>
                  {/* Verstanden-Empfehlung aus dem letzten Abruf-Check dieses Videos */}
                  {verdict !== 'unknown' && (
                    <span
                      data-testid={`video-verdict-${video.index}`}
                      className={`shrink-0 rounded-[6px] border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${VERDICT_CHIP[verdict].cls}`}
                    >
                      {copy[VERDICT_CHIP[verdict].labelKey]}
                    </span>
                  )}
                </button>
                <VideoDownloadControl
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
                    <span className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[--brand-secondary]">{videoCount}</span>
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
        onOpenTranscript={() => setTranscriptOpen(true)}
        onSetConfidence={next => applyConfidence(activeItem, next)}
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
                  ? 'border-[--brand-secondary-80] bg-[--brand-secondary-15] text-ds-fg'
                  : 'border-[--brand-secondary-25] bg-[--brand-secondary-12] text-[--brand-secondary] hover:border-[--brand-secondary-80]'
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
              className={`neo-keep-dark flex flex-col items-center overflow-y-auto bg-black ${
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
          className="neo-keep-dark fixed inset-0 z-50 flex min-h-[100dvh] flex-col bg-black"
          style={(keyboardOpen || writingMode) && viewport
            ? { top: `${viewport.top}px`, right: 0, bottom: 'auto', left: 0, height: `${viewport.height}px`, minHeight: 0 }
            : { inset: 0, height: '100dvh' }}
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
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-ds-lg border border-[--brand-secondary-50] bg-[--brand-secondary-12] px-3 font-mono text-[13px] font-bold text-[--brand-secondary] transition-colors hover:border-[--brand-secondary-80]"
                data-testid="messer-writing-done"
              >
                <ArrowLeft size={16} strokeWidth={1.5} />
                {copy.backToVideo}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  // Deep-Link aus dem Lerneinheiten-Screen: Schließen des dafür
                  // geöffneten Videos kehrt dorthin zurück, nicht in die Liste.
                  if (onCloseInitialVideo && activeItem.index === initialVideoIndex) {
                    onCloseInitialVideo()
                    return
                  }
                  setActiveFile(null)
                }}
                className="ds-icon-button flex h-11 w-11 shrink-0"
                aria-label={copy.close}
                data-testid="messer-player-close"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Schreibmodus: Video komplett ausblenden (nicht nur verkleinern),
              damit der Notizzettel den freigewordenen Platz oben übernimmt und
              die Tastatur ihn nicht verdeckt. */}
          {!writingMode && (
            <>
              <div className="flex shrink-0 justify-center px-3">
                {renderPlayer(true)}
              </div>
              <div className="flex shrink-0 justify-center px-3">{renderStudyBar(true)}</div>
            </>
          )}

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

      {/* Transkript zum aktiven Video (reine Anzeige, redaktioneller Text) */}
      {transcriptOpen && activeItem && (
        <VideoTranscriptPanel
          videoIndex={activeItem.index}
          objective={activeItem.objective}
          videoTitle={activeItem.title}
          language={language}
          onClose={() => setTranscriptOpen(false)}
        />
      )}

      {/* Abruf-Check (aktives Erinnern, nicht planungswirksam) */}
      {recallOpen && activeItem && (
        <VideoRecallCheck
          deckId={getSecurityObjectiveDeckId(activeItem.objective)}
          objective={activeItem.objective}
          videoTitle={activeItem.title}
          videoIndex={activeItem.index}
          language={language}
          maxCards={settings.recallCheckSize}
          previousRuns={recallScores[videoScoreKey(activeItem.index)]}
          frozenQuestionIds={activeCourseExecution?.recallQuestionIds}
          frozenRecallCardIds={activeCourseExecution?.recallCardIds}
          onResult={(known, total, questionIds) => {
            recordRecallRun(activeItem.index, known, total)
            // Dedizierter Lauf (append-only): mit executionId nur, wenn er die
            // eingefrorene Auswahl beantwortet hat — sonst freier Lauf.
            const execution = activeCourseExecution
            const matchesExecution = execution !== null && questionIds.length > 0
            void recordCourseRecallRun({
              profileId,
              videoIndex: activeItem.index,
              objectiveId: activeItem.objective,
              executionId: matchesExecution ? execution.executionId : null,
              questionIds,
              questionVersionById: Object.fromEntries(
                questionIds.map(id => [id, execution?.recallQuestionVersions[id] ?? 'v1']),
              ),
              correct: known,
              total,
            }).catch(error => console.error('[VideosView] recordCourseRecallRun', error))
          }}
          onClose={() => setRecallOpen(false)}
          onConfidence={next => {
            applyConfidence(activeItem, next)
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
