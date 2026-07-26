/**
 * AI_CONTEXT: Download-/Offline-Steuerung für ein einzelnes Video (Download-Button,
 * Fortschritt, Warteschlange, Offline-Badge mit Entfernen-Hover).
 * Used by: VideosView.
 */
import { Check, Clock, Download, Loader2, Trash2 } from 'lucide-react'
import type { LocalVideoItem } from '../../hooks/useLocalMesserVideos'
import type { Copy } from './videosCopy'

export function VideoDownloadControl({
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
      <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] font-bold text-[--brand-secondary]" aria-label={`${copy.downloading} ${pct}%`}>
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
      className="flex shrink-0 items-center justify-center rounded-[6px] border border-[#1f1f23] bg-[#0c0c0c] px-2 py-1 text-zinc-400 transition-colors hover:border-[--brand-secondary-50] hover:text-[--brand-secondary]"
    >
      <Download size={13} strokeWidth={1.5} />
    </button>
  )
}
