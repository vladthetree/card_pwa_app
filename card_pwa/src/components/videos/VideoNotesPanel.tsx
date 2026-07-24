/**
 * AI_CONTEXT:
 * Role: Freeform notepad for the selected video objective with autosave, inline #tag extraction, tag suggestions, zettel signal chips, and @time anchors.
 * Used by: VideosView right-side/compact notes pane.
 * Important: Notes stay plain text; structure is derived by videoTags, tagSuggestions, videoNoteSignals, and videoTimeAnchors rather than stored as separate rich blocks.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowUpRight, Check, CircleHelp, Clock, Hash, Lightbulb, Link2, Loader2, NotebookPen, Plus, SquarePen } from 'lucide-react'
import { saveVideoNote } from '../../db/queries/videoNotes'
import { useAllVideoNoteTags, useBacklinks, useVideoNote } from '../../hooks/useVideoNotes'
import { SY0_701_OBJECTIVES } from '../../utils/securityDeckHierarchy'
import { filterTagSuggestions, findTagDraftAtCursor, insertSuggestedTag } from '../../utils/tagSuggestions'
import { countVideoNoteSignals, summarizeVideoNoteSignals } from '../../utils/videoNoteSignals'
import { extractTags, splitTagSegments } from '../../utils/videoTags'
import { extractLinks, splitLinkSegments } from '../../utils/videoLinks'
import { extractVideoTimeAnchors, formatVideoTime } from '../../utils/videoTimeAnchors'

const OBJECTIVE_TITLE = new Map(SY0_701_OBJECTIVES.map(o => [o.code, o.title]))

/** Titel zu einem `[[Ziel]]` — leer, wenn das Ziel kein bekanntes Objective ist. */
function linkTitle(target: string): string {
  return OBJECTIVE_TITLE.get(target.trim()) ?? ''
}

type RenderSegment = { text: string; kind: 'text' | 'tag' | 'link' }

/** Vereint Tag- und Wiki-Link-Hervorhebung zu einer Segmentliste für das
 *  Backdrop-Overlay: erst nach `#tags` trennen, Resttext nach `[[links]]`. */
function buildRenderSegments(content: string): RenderSegment[] {
  const out: RenderSegment[] = []
  for (const seg of splitTagSegments(content)) {
    if (seg.isTag) {
      out.push({ text: seg.text, kind: 'tag' })
      continue
    }
    for (const piece of splitLinkSegments(seg.text)) {
      out.push({ text: piece.text, kind: piece.isLink ? 'link' : 'text' })
    }
  }
  return out
}

const COPY = {
  de: {
    heading: 'Notizzettel',
    forVideo: 'Notizen zu',
    placeholder: 'Notizen, Merksätze, offene Fragen … Tags mit #tag direkt im Text setzen.',
    tags: 'Erkannte Tags',
    tagHint: 'Schreibe #tag im Text — Klick auf einen Tag öffnet seine Sammlung.',
    noTags: 'Noch keine Tags. Schreib z. B. #crypto in den Text.',
    suggestions: 'Bestehende Tags',
    addTag: 'Tag einfügen',
    saving: 'Speichern …',
    saved: 'Gespeichert',
    empty: 'Wähle links ein Video, um Notizen zu erfassen.',
    openTag: 'Sammlung zu',
    zettelTools: 'Zettel',
    insertQuestion: 'Frage',
    insertCue: 'Merksatz',
    insertCard: 'Karte',
    insertTime: 'Zeit',
    insertLink: 'Wiki',
    signals: 'Zettelspuren',
    timeAnchors: 'Zeitmarken',
    questions: 'Fragen',
    cardIdeas: 'Kartenideen',
    cues: 'Merksätze',
    links: 'Verlinkt',
    linkHint: 'Verweise mit [[1.2]] auf ein anderes Objective — Klick öffnet es.',
    backlinks: 'Erwähnt in',
    openLink: 'Öffnen',
  },
  en: {
    heading: 'Notepad',
    forVideo: 'Notes for',
    placeholder: 'Notes, mnemonics, open questions … add tags inline as #tag.',
    tags: 'Detected tags',
    tagHint: 'Write #tag in the text — click a tag to open its collection.',
    noTags: 'No tags yet. Try writing e.g. #crypto in the text.',
    suggestions: 'Existing tags',
    addTag: 'Insert tag',
    saving: 'Saving …',
    saved: 'Saved',
    empty: 'Pick a video on the left to take notes.',
    openTag: 'Collection for',
    zettelTools: 'Notes',
    insertQuestion: 'Question',
    insertCue: 'Cue',
    insertCard: 'Card',
    insertTime: 'Time',
    insertLink: 'Wiki',
    signals: 'Note traces',
    timeAnchors: 'Time anchors',
    questions: 'Questions',
    cardIdeas: 'Card ideas',
    cues: 'Cues',
    links: 'Linked',
    linkHint: 'Reference another objective with [[1.2]] — click to open it.',
    backlinks: 'Mentioned in',
    openLink: 'Open',
  },
} as const

const SNIPPETS = {
  de: {
    question: '? ',
    cue: 'Merke: ',
    card: 'Karte: ',
  },
  en: {
    question: '? ',
    cue: 'Remember: ',
    card: 'Card: ',
  },
} as const

interface Props {
  /** Aktives Profil — Notizen sind pro Profil getrennt. */
  profileId: string
  objective: string | null
  videoId: string | null
  videoTitle: string | null
  language: 'de' | 'en'
  /** Öffnet die Tag-Ansicht (verbundene Videos) für den geklickten Tag. */
  onOpenTag: (tag: string) => void
  /** Öffnet ein per `[[Ziel]]` verlinktes oder rückverweisendes Objective. */
  onOpenObjective?: (objective: string) => void
  /** Aktuelle Player-Zeit; wird fuer `@MM:SS`-Zeitmarken genutzt. */
  currentTimeSec?: number | null
  /** Springt im Player zu einer angeklickten Zeitmarke. */
  onSeekToTime?: (seconds: number) => void
  /** Schreibmodus (Handy): blendet die unteren Extras aus → mehr Platz fürs Textfeld. */
  writing?: boolean
  /** Meldet Fokuswechsel des Textfelds (Handy-Schreibmodus). */
  onFocusChange?: (focused: boolean) => void
}

const SAVE_DEBOUNCE_MS = 600

function SignalList({
  icon,
  label,
  items,
}: {
  icon: ReactNode
  label: string
  items: string[]
}) {
  if (items.length === 0) return null

  return (
    <div className="rounded-ds-lg border border-[#1f1f23] bg-[#0c0c0c] p-2">
      <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="space-y-1">
        {items.map(item => (
          <div key={item} className="line-clamp-2 font-mono text-[11px] leading-relaxed text-zinc-300">
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function VideoNotesPanel({
  profileId,
  objective,
  videoId,
  videoTitle,
  language,
  onOpenTag,
  onOpenObjective,
  currentTimeSec = null,
  onSeekToTime,
  writing = false,
  onFocusChange,
}: Props) {
  const copy = COPY[language]
  const { note, resolvedObjective } = useVideoNote(profileId, objective)
  const allTags = useAllVideoNoteTags(profileId)
  const backlinks = useBacklinks(profileId, objective)

  const [content, setContent] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  const hydratedForRef = useRef<string | null>(null)
  const timerRef = useRef<number | undefined>(undefined)
  const pendingRef = useRef<{ profileId: string; objective: string; videoId: string; content: string } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const backdropRef = useRef<HTMLDivElement | null>(null)

  // Tags werden live aus dem Inhalt erkannt („sofort erkennen").
  const tags = useMemo(() => extractTags(content), [content])
  // Ausgehende `[[Ziel]]`-Wiki-Links, live aus dem Inhalt.
  const links = useMemo(() => extractLinks(content), [content])
  // Segmente für die farbige Hervorhebung von #tags UND [[links]] (Obsidian-Stil).
  const segments = useMemo(() => buildRenderSegments(content), [content])
  const signals = useMemo(() => summarizeVideoNoteSignals(content), [content])
  const signalCount = useMemo(() => countVideoNoteSignals(signals), [signals])
  const timeAnchors = useMemo(() => extractVideoTimeAnchors(content), [content])
  const tagDraft = useMemo(() => findTagDraftAtCursor(content, cursorPosition), [content, cursorPosition])
  const suggestedTags = useMemo(
    () => filterTagSuggestions(allTags, tags, tagDraft?.query ?? '', 6),
    [allTags, tags, tagDraft],
  )

  // Backdrop-Scroll mit dem Textfeld synchron halten (Overlay-Technik).
  const syncScroll = () => {
    const ta = textareaRef.current
    const bd = backdropRef.current
    if (ta && bd) {
      bd.scrollTop = ta.scrollTop
      bd.scrollLeft = ta.scrollLeft
    }
  }

  const updateCursorFromTextarea = () => {
    const cursor = textareaRef.current?.selectionStart
    if (typeof cursor === 'number') setCursorPosition(cursor)
  }

  const flush = useCallback(() => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
    const payload = pendingRef.current
    if (!payload) return
    pendingRef.current = null
    void saveVideoNote(payload).then(() => setSaveState('saved'))
  }, [])

  // Entwurf aus der DB übernehmen, wenn ein (anderes) Video aktiv wird.
  useEffect(() => {
    if (!objective) {
      hydratedForRef.current = null
      setContent('')
      setSaveState('idle')
      return
    }
    if (hydratedForRef.current === objective) return
    // Erst übernehmen, wenn die Live-Query WIRKLICH fürs aktuelle Objective
    // aufgelöst hat. Sonst würde ein veralteter (ggf. leerer) Stand des vorherigen
    // Objectives übernommen — und der nächste Tastendruck überschriebe dessen Notiz.
    if (resolvedObjective !== objective) return
    hydratedForRef.current = objective
    const nextContent = note?.content ?? ''
    setContent(nextContent)
    setCursorPosition(nextContent.length)
    setSaveState('idle')
  }, [objective, note, resolvedObjective])

  // Ausstehende Speicherung beim Video-Wechsel / Unmount sichern.
  useEffect(() => () => flush(), [objective, flush])

  const scheduleSave = useCallback(
    (nextContent: string) => {
      if (!objective || !videoId) return
      pendingRef.current = { profileId, objective, videoId, content: nextContent }
      setSaveState('saving')
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        timerRef.current = undefined
        const payload = pendingRef.current
        if (!payload) return
        pendingRef.current = null
        void saveVideoNote(payload).then(() => setSaveState('saved'))
      }, SAVE_DEBOUNCE_MS)
    },
    [profileId, objective, videoId],
  )

  const handleContentChange = (value: string, cursor: number) => {
    setContent(value)
    setCursorPosition(cursor)
    scheduleSave(value)
  }

  const applySuggestedTag = (tag: string) => {
    const cursor = textareaRef.current?.selectionStart ?? cursorPosition
    const next = insertSuggestedTag(content, cursor, tag)
    setContent(next.content)
    setCursorPosition(next.cursor)
    scheduleSave(next.content)
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(next.cursor, next.cursor)
      syncScroll()
    })
  }

  const insertSnippet = (snippet: string) => {
    const cursor = textareaRef.current?.selectionStart ?? cursorPosition
    const before = content.slice(0, cursor)
    const after = content.slice(cursor)
    const needsLeadingBreak = before.length > 0 && !before.endsWith('\n')
    const needsTrailingBreak = after.length > 0 && !after.startsWith('\n')
    const prefix = needsLeadingBreak ? '\n' : ''
    const suffix = needsTrailingBreak ? '\n' : ''
    const nextContent = `${before}${prefix}${snippet}${suffix}${after}`
    const nextCursor = before.length + prefix.length + snippet.length

    setContent(nextContent)
    setCursorPosition(nextCursor)
    scheduleSave(nextContent)
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor)
      syncScroll()
    })
  }

  const insertTimeAnchor = () => {
    insertSnippet(`@${formatVideoTime(currentTimeSec ?? 0)} `)
  }

  // `[[]]` einfügen und den Cursor zwischen die Klammern setzen (Obsidian-artig).
  const insertWikiLink = () => {
    const cursor = textareaRef.current?.selectionStart ?? cursorPosition
    const before = content.slice(0, cursor)
    const after = content.slice(cursor)
    const nextContent = `${before}[[]]${after}`
    const nextCursor = before.length + 2
    setContent(nextContent)
    setCursorPosition(nextCursor)
    scheduleSave(nextContent)
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor)
      syncScroll()
    })
  }

  if (!objective) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <NotebookPen size={26} strokeWidth={1.5} className="text-zinc-600" />
        <div className="font-mono text-[12px] leading-relaxed text-zinc-500">{copy.empty}</div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Kopf */}
      <div className={`${writing ? 'hidden' : 'flex'} items-center gap-2 border-b border-[#18181b] px-4 py-3`}>
        <NotebookPen size={15} strokeWidth={1.5} className="shrink-0 text-[--brand-secondary]" />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[13px] font-bold text-white">{copy.heading}</div>
          {videoTitle && (
            <div className="truncate font-mono text-[11px] text-zinc-500">
              {copy.forVideo} {objective} · {videoTitle}
            </div>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
          {saveState === 'saving' && <Loader2 size={11} className="animate-spin" />}
          {saveState === 'saving' && copy.saving}
          {saveState === 'saved' && <Check size={11} className="text-emerald-400" />}
          {saveState === 'saved' && <span className="text-emerald-400">{copy.saved}</span>}
        </span>
      </div>

      <div className={`${writing ? 'hidden' : 'flex'} shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[#18181b] px-4 py-2`}>
        <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-600">{copy.zettelTools}</span>
        <button
          type="button"
          onClick={() => insertSnippet(SNIPPETS[language].question)}
          className="inline-flex h-8 items-center gap-1 rounded-ds border border-[#1f1f23] bg-[#0c0c0c] px-2 font-mono text-[11px] text-zinc-300 transition-colors hover:border-[--brand-secondary-50] hover:text-[--brand-secondary]"
        >
          <CircleHelp size={12} strokeWidth={1.5} />
          {copy.insertQuestion}
        </button>
        <button
          type="button"
          onClick={() => insertSnippet(SNIPPETS[language].cue)}
          className="inline-flex h-8 items-center gap-1 rounded-ds border border-[#1f1f23] bg-[#0c0c0c] px-2 font-mono text-[11px] text-zinc-300 transition-colors hover:border-amber-500/40 hover:text-amber-200"
        >
          <Lightbulb size={12} strokeWidth={1.5} />
          {copy.insertCue}
        </button>
        <button
          type="button"
          onClick={() => insertSnippet(SNIPPETS[language].card)}
          className="inline-flex h-8 items-center gap-1 rounded-ds border border-[#1f1f23] bg-[#0c0c0c] px-2 font-mono text-[11px] text-zinc-300 transition-colors hover:border-emerald-500/40 hover:text-emerald-200"
        >
          <Plus size={12} strokeWidth={1.5} />
          {copy.insertCard}
        </button>
        <button
          type="button"
          onClick={insertTimeAnchor}
          className="inline-flex h-8 items-center gap-1 rounded-ds border border-[#1f1f23] bg-[#0c0c0c] px-2 font-mono text-[11px] text-zinc-300 transition-colors hover:border-violet-500/40 hover:text-violet-200"
        >
          <Clock size={12} strokeWidth={1.5} />
          {copy.insertTime}
        </button>
        <button
          type="button"
          onClick={insertWikiLink}
          data-testid="video-note-insert-link"
          className="inline-flex h-8 items-center gap-1 rounded-ds border border-[#1f1f23] bg-[#0c0c0c] px-2 font-mono text-[11px] text-zinc-300 transition-colors hover:border-fuchsia-500/40 hover:text-fuchsia-200"
        >
          <Link2 size={12} strokeWidth={1.5} />
          {copy.insertLink}
        </button>
      </div>

      {/* Freitext mit Inline-Tag-Hervorhebung: farbiger Backdrop hinter einem
          texttransparenten Textfeld (Caret/Selektion bleiben sichtbar). */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={backdropRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-4 py-3 font-mono text-[13px] leading-relaxed text-zinc-100"
        >
          {segments.map((seg, i) => {
            if (seg.kind === 'tag') {
              return (
                <span key={i} className="rounded-[4px] bg-[--brand-secondary-15] font-semibold text-[--brand-secondary]">
                  {seg.text}
                </span>
              )
            }
            if (seg.kind === 'link') {
              return (
                <span key={i} className="rounded-[4px] bg-fuchsia-500/15 font-semibold text-fuchsia-300">
                  {seg.text}
                </span>
              )
            }
            return <span key={i}>{seg.text}</span>
          })}
          {/* Letzte Zeile sichtbar halten, wenn der Inhalt mit \n endet. */}
          {'​'}
        </div>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={event => handleContentChange(event.currentTarget.value, event.currentTarget.selectionStart)}
          onScroll={syncScroll}
          onSelect={updateCursorFromTextarea}
          onClick={updateCursorFromTextarea}
          onKeyUp={updateCursorFromTextarea}
          onFocus={() => { updateCursorFromTextarea(); onFocusChange?.(true) }}
          onBlur={() => onFocusChange?.(false)}
          placeholder={copy.placeholder}
          data-testid="video-note-content"
          className="neo-video-note-input absolute inset-0 resize-none whitespace-pre-wrap break-words bg-white px-4 py-3 font-mono text-[13px] leading-relaxed text-black caret-black placeholder:text-black/55 focus:outline-none"
        />
      </div>

      {/* Erkannte Tags — anklickbar → verbundene Videos. Im Schreibmodus (Handy,
          Tastatur offen) ausgeblendet, damit das Textfeld über der Tastatur bleibt. */}
      <div className={`max-h-[46%] shrink-0 overflow-y-auto border-t border-[#18181b] px-4 py-3 ${writing ? 'hidden' : ''}`}>
        {timeAnchors.length > 0 && (
          <div className="mb-3">
            <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
              <Clock size={11} strokeWidth={1.5} />
              {copy.timeAnchors}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {timeAnchors.map(anchor => (
                <button
                  key={`${anchor.start}-${anchor.token}`}
                  type="button"
                  onClick={() => onSeekToTime?.(anchor.seconds)}
                  data-testid={`video-note-time-${anchor.seconds}`}
                  className="flex items-center gap-1 rounded-ds border border-violet-500/30 bg-violet-500/10 px-2 py-1 font-mono text-[11px] text-violet-200 transition-colors hover:border-violet-400/70 hover:text-violet-100"
                >
                  <Clock size={10} strokeWidth={1.5} className="opacity-70" />
                  {anchor.token}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ausgehende [[Wiki-Links]] — anklickbar → verlinktes Objective */}
        {links.length > 0 && (
          <div className="mb-3">
            <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
              <Link2 size={11} strokeWidth={1.5} />
              {copy.links}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {links.map(target => {
                const title = linkTitle(target)
                return (
                  <button
                    key={target}
                    type="button"
                    onClick={() => onOpenObjective?.(target)}
                    title={`${copy.openLink} [[${target}]]`}
                    aria-label={`${copy.openLink} [[${target}]]`}
                    data-testid={`video-note-link-${target}`}
                    className="flex items-center gap-1 rounded-ds border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-1 font-mono text-[11px] text-fuchsia-200 transition-colors hover:border-fuchsia-400/70 hover:text-fuchsia-100"
                  >
                    <span className="font-bold">{target}</span>
                    {title && <span className="max-w-[160px] truncate text-fuchsia-300/70">{title}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Backlinks — andere Notizen, die per [[…]] hierher verweisen */}
        {backlinks.length > 0 && (
          <div className="mb-3">
            <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
              <ArrowUpRight size={11} strokeWidth={1.5} />
              {copy.backlinks}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {backlinks.map(back => {
                const title = linkTitle(back.objective)
                return (
                  <button
                    key={back.objective}
                    type="button"
                    onClick={() => onOpenObjective?.(back.objective)}
                    title={`${copy.openLink} ${back.objective}`}
                    aria-label={`${copy.openLink} ${back.objective}`}
                    data-testid={`video-note-backlink-${back.objective}`}
                    className="flex items-center gap-1 rounded-ds border border-[#1f1f23] bg-[#0c0c0c] px-2 py-1 font-mono text-[11px] text-zinc-300 transition-colors hover:border-fuchsia-500/40 hover:text-fuchsia-200"
                  >
                    <ArrowUpRight size={10} strokeWidth={1.5} className="text-zinc-600" />
                    <span className="font-bold">{back.objective}</span>
                    {title && <span className="max-w-[160px] truncate text-zinc-500">{title}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {signalCount > 0 && (
          <div className="mb-3">
            <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
              <SquarePen size={11} strokeWidth={1.5} />
              {copy.signals}
            </div>
            <div className="grid grid-cols-1 gap-2">
              <SignalList icon={<CircleHelp size={11} strokeWidth={1.5} />} label={copy.questions} items={signals.questions} />
              <SignalList icon={<Plus size={11} strokeWidth={1.5} />} label={copy.cardIdeas} items={signals.cardIdeas} />
              <SignalList icon={<Lightbulb size={11} strokeWidth={1.5} />} label={copy.cues} items={signals.cues} />
            </div>
          </div>
        )}

        <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
          <Hash size={11} strokeWidth={1.5} />
          {copy.tags}
        </div>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => onOpenTag(tag)}
                title={`${copy.openTag} #${tag}`}
                aria-label={`${copy.openTag} #${tag}`}
                data-testid={`video-note-tag-${tag}`}
                className="flex items-center gap-1 rounded-ds border border-[--brand-secondary-25] bg-[--brand-secondary-12] px-2 py-1 font-mono text-[11px] text-[--brand-secondary] transition-colors hover:border-[--brand-secondary-80] hover:text-ds-fg"
              >
                <Hash size={10} strokeWidth={2} className="opacity-60" />
                {tag}
              </button>
            ))}
          </div>
        ) : (
          <div className="font-mono text-[11px] text-zinc-600">{copy.noTags}</div>
        )}
        {suggestedTags.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-600">{copy.suggestions}</div>
            <div className="flex flex-wrap gap-1.5">
              {suggestedTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => applySuggestedTag(tag)}
                  title={`${copy.addTag} #${tag}`}
                  aria-label={`${copy.addTag} #${tag}`}
                  data-testid={`video-note-suggestion-${tag}`}
                  className="flex items-center gap-1 rounded-ds border border-[#1f1f23] bg-[#0c0c0c] px-2 py-1 font-mono text-[11px] text-zinc-300 transition-colors hover:border-[--brand-secondary-50] hover:text-[--brand-secondary]"
                >
                  <Hash size={10} strokeWidth={2} className="text-zinc-600" />
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-1.5 font-mono text-[10px] text-zinc-600">{copy.tagHint}</div>
        <div className="mt-1 font-mono text-[10px] text-zinc-600">{copy.linkHint}</div>
      </div>
    </div>
  )
}
