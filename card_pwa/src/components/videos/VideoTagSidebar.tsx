/**
 * AI_CONTEXT:
 * Role: Permanent tag list for the video workspace — desktop side column and mobile bottom-sheet. Shows every video-note tag with live note/card counts, search, pinned-first ordering, colour dot, and click-to-open.
 * Used by: VideosView. Opening a tag routes to TagCollectionPanel; include/exclude filtering is a later phase (kept out to stay "ruhig").
 * Important: Tag identity is canonical (normalizeTagId) and counts come from the pure useVideoTagStats aggregation — never ad-hoc per-tag queries. Label/dot/count/active-outline all work without relying on colour alone.
 */
import { useMemo, useState } from 'react'
import { BookOpen, Hash, NotebookPen, PanelLeftClose, Pin, Search, X } from 'lucide-react'
import { useVideoTagStats } from '../../hooks/useVideoTags'
import { normalizeTagId } from '../../utils/tagIdentity'
import { filterVideoTagStats, type VideoTagStat } from '../../utils/videoTagStats'

const COPY = {
  de: {
    title: 'Tags',
    search: 'Tags suchen …',
    pinned: 'Angeheftet',
    all: 'Alle Tags',
    empty: 'Noch keine Tags.',
    emptyHint: 'Schreib #tag in eine Video-Notiz, dann erscheint er hier.',
    noMatch: 'Kein Tag passt zur Suche.',
    notesTitle: 'Notizen',
    cardsTitle: 'Karten',
    clear: 'Suche leeren',
    close: 'Schließen',
    collapse: 'Tags einklappen',
  },
  en: {
    title: 'Tags',
    search: 'Search tags …',
    pinned: 'Pinned',
    all: 'All tags',
    empty: 'No tags yet.',
    emptyHint: 'Write #tag in a video note and it shows up here.',
    noMatch: 'No tag matches your search.',
    notesTitle: 'Notes',
    cardsTitle: 'Cards',
    clear: 'Clear search',
    close: 'Close',
    collapse: 'Collapse tags',
  },
} as const

type Copy = (typeof COPY)[keyof typeof COPY]

interface Props {
  profileId: string
  language: 'de' | 'en'
  /** Aktuell geöffneter Tag (roh) — für die aktive Umrandung. */
  activeTag: string | null
  /** Öffnet die Tag-Seite (Primäraktion). Erhält die kanonische Tag-ID. */
  onOpenTag: (tag: string) => void
  /** `panel` = permanente Desktop-Spalte, `sheet` = mobiles Bottom-Sheet. */
  variant?: 'panel' | 'sheet'
  /** Nur im `sheet`-Modus: schließt das Sheet. */
  onClose?: () => void
  /** Nur im `panel`-Modus: klappt die Desktop-Spalte ein. */
  onCollapse?: () => void
}

/** Eine Tag-Zeile: Farbpunkt/Hash, Label, Pin, Notiz-/Karten-Count. */
function TagRow({
  stat,
  active,
  onOpen,
  copy,
}: {
  stat: VideoTagStat
  active: boolean
  onOpen: () => void
  copy: Copy
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={`video-tag-row-${stat.tagId}`}
      aria-current={active ? 'true' : undefined}
      className={`group flex w-full items-center gap-2 rounded-ds-lg border px-2.5 py-2 text-left transition-colors ${
        active ? 'border-[--brand-secondary-80] bg-[--brand-secondary-12]' : 'border-transparent hover:border-[#1f1f23] hover:bg-[#0c0c0c]'
      }`}
    >
      {stat.color ? (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/10"
          style={{ backgroundColor: stat.color }}
          aria-hidden
        />
      ) : (
        <Hash size={12} strokeWidth={2} className="shrink-0 text-zinc-600" aria-hidden />
      )}
      <span className={`min-w-0 flex-1 truncate font-mono text-[12px] ${active ? 'text-ds-fg' : 'text-zinc-200'}`}>
        {stat.label}
      </span>
      {stat.pinned && <Pin size={11} strokeWidth={1.5} className="shrink-0 text-amber-300/80" aria-hidden />}
      <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] text-zinc-500">
        <span className="flex items-center gap-0.5" title={copy.notesTitle}>
          <NotebookPen size={10} strokeWidth={1.5} />
          {stat.noteCount}
        </span>
        {stat.cardCount > 0 && (
          <span className="flex items-center gap-0.5 text-zinc-600" title={copy.cardsTitle}>
            <BookOpen size={10} strokeWidth={1.5} />
            {stat.cardCount}
          </span>
        )}
      </span>
    </button>
  )
}

/**
 * Permanente Tag-Liste des Videomodus. Tags sind ständig sichtbar (nicht erst
 * nach Klick), gepinnte zuerst, mit Live-Counts und Suche. Klick öffnet die
 * Tag-Seite; kombinierte Filter kommen in einer späteren Phase.
 */
export default function VideoTagSidebar({ profileId, language, activeTag, onOpenTag, variant = 'panel', onClose, onCollapse }: Props) {
  const copy = COPY[language]
  const stats = useVideoTagStats(profileId)
  const [query, setQuery] = useState('')

  const activeId = activeTag ? normalizeTagId(activeTag) : ''
  const filtered = useMemo(() => filterVideoTagStats(stats, query), [stats, query])
  const searching = query.trim().length > 0
  const pinned = useMemo(() => filtered.filter(stat => stat.pinned), [filtered])
  const rest = useMemo(() => filtered.filter(stat => !stat.pinned), [filtered])

  const row = (stat: VideoTagStat) => (
    <TagRow
      key={stat.tagId}
      stat={stat}
      active={stat.tagId === activeId}
      onOpen={() => onOpenTag(stat.tagId)}
      copy={copy}
    />
  )

  const header = (
    <div className="flex shrink-0 items-center gap-2 border-b border-[#18181b] px-3 py-2.5">
      <Hash size={14} strokeWidth={1.5} className="shrink-0 text-[--brand-secondary]" />
      <span className="flex-1 font-mono text-[12px] font-bold text-white">{copy.title}</span>
      {stats.length > 0 && <span className="font-mono text-[10px] text-zinc-600">{stats.length}</span>}
      {variant === 'sheet' && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ds-icon-button flex h-8 w-8"
          aria-label={copy.close}
          data-testid="video-tag-sidebar-close"
        >
          <X size={15} />
        </button>
      )}
      {variant === 'panel' && onCollapse && (
        <button
          type="button"
          onClick={onCollapse}
          className="ds-icon-button flex h-8 w-8"
          aria-label={copy.collapse}
          title={copy.collapse}
          data-testid="video-tag-sidebar-collapse"
        >
          <PanelLeftClose size={15} />
        </button>
      )}
    </div>
  )

  const search = (
    <div className="shrink-0 px-2.5 py-2">
      <div className="flex items-center gap-2 rounded-ds-lg border border-[#1f1f23] bg-[#0c0c0c] px-2.5 py-1.5">
        <Search size={13} strokeWidth={1.5} className="shrink-0 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={copy.search}
          data-testid="video-tag-search"
          className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={copy.clear}
            className="shrink-0 text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  )

  const list = (
    <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
      {stats.length === 0 ? (
        <div className="px-2 py-8 text-center">
          <Hash size={20} strokeWidth={1.5} className="mx-auto mb-2 text-zinc-700" />
          <div className="font-mono text-[12px] text-zinc-500">{copy.empty}</div>
          <div className="mt-1 font-mono text-[10px] leading-relaxed text-zinc-600">{copy.emptyHint}</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-2 py-8 text-center font-mono text-[12px] text-zinc-600">{copy.noMatch}</div>
      ) : searching ? (
        <div className="flex flex-col gap-0.5">{filtered.map(row)}</div>
      ) : (
        <>
          {pinned.length > 0 && (
            <div className="mb-2">
              <div className="mb-1 flex items-center gap-1 px-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">
                <Pin size={9} strokeWidth={1.5} />
                {copy.pinned}
              </div>
              <div className="flex flex-col gap-0.5">{pinned.map(row)}</div>
            </div>
          )}
          <div>
            {pinned.length > 0 && (
              <div className="mb-1 px-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">{copy.all}</div>
            )}
            <div className="flex flex-col gap-0.5">{rest.map(row)}</div>
          </div>
        </>
      )}
    </div>
  )

  const inner = (
    <>
      {header}
      {stats.length > 0 && search}
      {list}
    </>
  )

  if (variant === 'sheet') {
    return (
      <div
        className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/70 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label={copy.title}
        onClick={onClose}
      >
        <div
          className="flex max-h-[75dvh] flex-col overflow-hidden rounded-t-ds-sheet border-t border-[#1f1f23] bg-[#0a0a0a] pb-safe-2"
          onClick={event => event.stopPropagation()}
        >
          {inner}
        </div>
      </div>
    )
  }

  return <div className="flex h-full min-h-0 flex-col">{inner}</div>
}
