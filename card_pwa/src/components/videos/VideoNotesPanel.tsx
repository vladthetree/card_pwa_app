import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Hash, Loader2, NotebookPen } from 'lucide-react'
import { saveVideoNote } from '../../db/queries/videoNotes'
import { useAllVideoNoteTags, useVideoNote } from '../../hooks/useVideoNotes'
import { filterTagSuggestions, findTagDraftAtCursor, insertSuggestedTag } from '../../utils/tagSuggestions'
import { extractTags, splitTagSegments } from '../../utils/videoTags'

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
}

const SAVE_DEBOUNCE_MS = 600

export default function VideoNotesPanel({ profileId, objective, videoId, videoTitle, language, onOpenTag }: Props) {
  const copy = COPY[language]
  const { note, resolvedObjective } = useVideoNote(profileId, objective)
  const allTags = useAllVideoNoteTags(profileId)

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
  // Segmente für die farbige Hervorhebung der #tags im Notizfeld (Obsidian-Stil).
  const segments = useMemo(() => splitTagSegments(content), [content])
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
      <div className="flex items-center gap-2 border-b border-[#18181b] px-4 py-3">
        <NotebookPen size={15} strokeWidth={1.5} className="shrink-0 text-sky-300" />
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

      {/* Freitext mit Inline-Tag-Hervorhebung: farbiger Backdrop hinter einem
          texttransparenten Textfeld (Caret/Selektion bleiben sichtbar). */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={backdropRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-4 py-3 font-mono text-[13px] leading-relaxed text-zinc-100"
        >
          {segments.map((seg, i) =>
            seg.isTag ? (
              <span key={i} className="rounded-[4px] bg-sky-500/15 font-semibold text-sky-300">
                {seg.text}
              </span>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
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
          onFocus={updateCursorFromTextarea}
          placeholder={copy.placeholder}
          data-testid="video-note-content"
          className="absolute inset-0 resize-none whitespace-pre-wrap break-words bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed text-transparent caret-zinc-100 placeholder:text-zinc-600 focus:outline-none"
        />
      </div>

      {/* Erkannte Tags — anklickbar → verbundene Videos */}
      <div className="shrink-0 border-t border-[#18181b] px-4 py-3">
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
                className="flex items-center gap-1 rounded-[8px] border border-sky-500/30 bg-sky-500/10 px-2 py-1 font-mono text-[11px] text-sky-200 transition-colors hover:border-sky-400/70 hover:text-sky-100"
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
                  className="flex items-center gap-1 rounded-[8px] border border-[#1f1f23] bg-[#0c0c0c] px-2 py-1 font-mono text-[11px] text-zinc-300 transition-colors hover:border-sky-500/40 hover:text-sky-200"
                >
                  <Hash size={10} strokeWidth={2} className="text-zinc-600" />
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-1.5 font-mono text-[10px] text-zinc-600">{copy.tagHint}</div>
      </div>
    </div>
  )
}
