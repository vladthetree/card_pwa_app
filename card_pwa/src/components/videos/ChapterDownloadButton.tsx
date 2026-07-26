/**
 * AI_CONTEXT: "Kapitel offline laden" — aggregierter Download-Status/-Trigger für
 * alle Videos einer Domain (Kapitel), plus domainDownloadStats-Berechnung.
 * Used by: VideosView.
 */
import { Check, HardDriveDownload, Loader2, X } from 'lucide-react'
import type { LocalVideoItem, LocalVideoObjectiveGroup } from '../../hooks/useLocalMesserVideos'
import { summarizeDownloads } from '../../utils/videoDownloadQueue'
import type { Copy } from './videosCopy'

export interface DomainDownloadStats {
  total: number
  done: number
  pending: LocalVideoItem[]
  active: boolean
}

/** Aggregierter Offline-Status eines Kapitels (Domain). */
export function domainDownloadStats(groups: LocalVideoObjectiveGroup[]): DomainDownloadStats {
  const videos = groups.flatMap(group => group.videos)
  const summary = summarizeDownloads(videos)
  return {
    total: summary.total,
    done: summary.done,
    active: summary.active,
    pending: videos.filter(video => !video.downloaded && video.progress === undefined && !video.queued),
  }
}

export function ChapterDownloadButton({
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
      <span className="flex shrink-0 items-center gap-1.5 rounded-ds border border-[--brand-secondary-50] bg-[--brand-secondary-12] px-2 py-1 font-mono text-[10px] font-bold text-[--brand-secondary]">
        <Loader2 size={12} className="animate-spin" />
        {stats.done}/{stats.total}
        <button
          type="button"
          onClick={onCancel}
          aria-label={copy.cancel}
          title={copy.cancel}
          data-testid="chapter-cancel"
          className="ml-0.5 text-[--brand-secondary-80] transition-colors hover:text-rose-300"
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
        className="flex shrink-0 items-center gap-1.5 rounded-ds border border-[#1f1f23] bg-[#0c0c0c] px-2 py-1 font-mono text-[10px] font-bold text-zinc-300 transition-colors hover:border-[--brand-secondary-50] hover:text-[--brand-secondary]"
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
