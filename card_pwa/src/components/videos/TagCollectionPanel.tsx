/**
 * AI_CONTEXT:
 * Role: Obsidian-like tag page. Header carries tag meta (label, colour, pin, description, aliases); segmented body shows the tag's video notes, flashcards, timestamps, open questions, card ideas, plus related tags.
 * Used by: VideosView tag clicks / sidebar.
 * Important: Matching uses canonical tag identity, not raw spelling. Derived sections (timestamps/questions/card ideas) come from the pure buildTagPageSections; the note text stays the source of truth.
 */
import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ChevronRight, Clock, Eye, Hash, HelpCircle, Lightbulb, Loader2, Pin, Play, RotateCcw, X } from 'lucide-react'
import { SY0_701_OBJECTIVES } from '../../utils/securityDeckHierarchy'
import { getDeckNameMap, listCardsByTag } from '../../db/queries'
import type { Card } from '../../types'
import { useNotesByTag, useRelatedVideoNoteTags } from '../../hooks/useVideoNotes'
import { useVideoTag } from '../../hooks/useVideoTags'
import { useMesserVideoProgress, resolveVideoStatus, type VideoStatus } from '../../hooks/useMesserVideoProgress'
import { buildTagPageSections } from '../../utils/videoTagPageData'
import { buildRecallCardView } from '../../utils/videoRecallCardView'

/**
 * Tag-Seite (Obsidian-artig): zeigt ALLES zu einem `#tag` mit Verweis auf die
 * Quelle. Kopf mit Tag-Metadaten (Farbe, Pin, Beschreibung, Aliase); Segmente
 * für Video-Notizen, Lernkarten, Zeitmarken, offene Fragen, Kartenideen. Wird im
 * Videomodus (Klick auf Tag/Sidebar) und in den Einstellungen (Tag-Browser)
 * als Overlay genutzt.
 */

const COPY = {
  de: {
    title: 'Tag-Seite',
    segAll: 'Alles',
    segVideos: 'Videos',
    segCards: 'Karten',
    segTimestamps: 'Zeitmarken',
    segQuestions: 'Fragen',
    segCardIdeas: 'Kartenideen',
    videosHeading: 'Video-Notizen',
    cardsHeading: 'Lernkarten',
    timestampsHeading: 'Zeitmarken',
    questionsHeading: 'Offene Fragen',
    cardIdeasHeading: 'Kartenideen',
    relatedHeading: 'Verwandte Tags',
    relatedCount: 'Notizen',
    objective: 'Objective',
    deck: 'Deck',
    answerLabel: 'Antwort',
    cardReveal: 'Tippen: Antwort',
    cardHide: 'Zurück',
    loadingCards: 'Lernkarten werden gesucht …',
    empty: 'Noch keine Inhalte mit diesem Tag.',
    emptyVideos: 'Keine Video-Notizen mit diesem Tag.',
    emptyCards: 'Keine Lernkarten mit diesem Tag.',
    emptyTimestamps: 'Keine Zeitmarken in den Notizen dieses Tags.',
    emptyQuestions: 'Keine offenen Fragen markiert.',
    emptyCardIdeas: 'Keine Kartenideen notiert.',
    aliasesLabel: 'Aliase',
    close: 'Schließen',
    statusGaps: 'LÜCKEN',
    statusOk: 'OKAY',
    statusSolid: 'SICHER',
    statusWatched: 'GESEHEN',
  },
  en: {
    title: 'Tag page',
    segAll: 'All',
    segVideos: 'Videos',
    segCards: 'Cards',
    segTimestamps: 'Timestamps',
    segQuestions: 'Questions',
    segCardIdeas: 'Card ideas',
    videosHeading: 'Video notes',
    cardsHeading: 'Flashcards',
    timestampsHeading: 'Timestamps',
    questionsHeading: 'Open questions',
    cardIdeasHeading: 'Card ideas',
    relatedHeading: 'Related tags',
    relatedCount: 'notes',
    objective: 'Objective',
    deck: 'Deck',
    answerLabel: 'Answer',
    cardReveal: 'Tap: answer',
    cardHide: 'Back',
    loadingCards: 'Searching flashcards …',
    empty: 'No content with this tag yet.',
    emptyVideos: 'No video notes with this tag.',
    emptyCards: 'No flashcards with this tag.',
    emptyTimestamps: 'No timestamps in this tag’s notes.',
    emptyQuestions: 'No open questions flagged.',
    emptyCardIdeas: 'No card ideas noted.',
    aliasesLabel: 'Aliases',
    close: 'Close',
    statusGaps: 'GAPS',
    statusOk: 'OKAY',
    statusSolid: 'SOLID',
    statusWatched: 'SEEN',
  },
} as const

type Copy = (typeof COPY)[keyof typeof COPY]
type Segment = 'all' | 'videos' | 'cards' | 'timestamps' | 'questions' | 'cardIdeas'

interface Props {
  profileId: string
  tag: string
  language: 'de' | 'en'
  onClose: () => void
  /** Optional: nur im Videomodus — springt zum Video des Objectives. */
  onOpenObjective?: (objective: string) => void
  /** Optional: nur im Videomodus — öffnet das Video und springt zur Zeitmarke.
   *  `videoIndex` wenn die Marke bei einem Mehr-Video-Objective an ein
   *  bestimmtes Video gebunden ist (siehe videoTimeAnchors.ts). */
  onOpenObjectiveAtTime?: (objective: string, seconds: number, videoIndex?: number) => void
  /** Optional: öffnet einen verwandten Tag in derselben Sammlung. */
  onOpenTag?: (tag: string) => void
}

const OBJECTIVE_TITLE = new Map(SY0_701_OBJECTIVES.map(o => [o.code, o.title]))

function objectiveTitle(objective: string): string {
  return OBJECTIVE_TITLE.get(objective) ?? ''
}

/** Objective-Codes wie "1.2", "1.10" numerisch korrekt sortieren. */
function compareObjective(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  return (pa[0] - pb[0]) || ((pa[1] ?? 0) - (pb[1] ?? 0)) || a.localeCompare(b)
}

/** Confidence-Badge zum Objective (nur wenn es ein Signal gibt). */
function statusBadge(status: VideoStatus, copy: Copy): { label: string; cls: string } | null {
  switch (status) {
    case 'solid':
      return { label: copy.statusSolid, cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' }
    case 'ok':
      return { label: copy.statusOk, cls: 'border-[--brand-secondary-25] bg-[--brand-secondary-12] text-[--brand-secondary]' }
    case 'gaps':
      return { label: copy.statusGaps, cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' }
    case 'watched':
      return { label: copy.statusWatched, cls: 'border-zinc-600/40 bg-zinc-500/10 text-zinc-300' }
    default:
      return null
  }
}

/**
 * Antippbare Flip-Karte: Frage → (Tap/Klick) → Antwort. Ersetzt das gleichzeitige
 * Zeigen beider Seiten, damit man sich beim Durchstöbern selbst testen kann.
 * Echte 3D-Drehung; als `<button>` klick- UND tastaturbedienbar (kein Hover, damit
 * es auf dem Handy funktioniert). Feste Höhe mit Innen-Scroll für lange Inhalte.
 */
function FlipCardTile({ deckName, view, copy }: { deckName: string; view: { prompt: string; answer: string }; copy: Copy }) {
  const [flipped, setFlipped] = useState(false)
  const faceBase = 'absolute inset-0 flex flex-col overflow-hidden rounded-ds-xl border px-3 py-2.5'
  const hidden = { backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' } as const
  return (
    <button
      type="button"
      onClick={() => setFlipped(prev => !prev)}
      data-testid="tag-card-flip"
      aria-pressed={flipped}
      className="relative block h-[150px] w-full text-left"
      style={{ perspective: '1000px' }}
    >
      <div
        className="relative h-full w-full transition-transform duration-500 ease-out"
        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {/* Vorderseite: Frage */}
        <div className={`${faceBase} border-[#1f1f23] bg-[#0c0c0c]`} style={hidden}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-600">{copy.deck}: {deckName}</span>
            <span className="flex shrink-0 items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[--brand-secondary-80]">
              <Eye size={11} strokeWidth={1.5} />
              {copy.cardReveal}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-line font-mono text-[12px] leading-relaxed text-zinc-100">{view.prompt}</div>
        </div>
        {/* Rückseite: Antwort */}
        <div className={`${faceBase} border-emerald-500/25 bg-[#0c0c0c]`} style={{ ...hidden, transform: 'rotateY(180deg)' }}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-300/70">{copy.answerLabel}</span>
            <span className="flex shrink-0 items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-500">
              <RotateCcw size={11} strokeWidth={1.5} />
              {copy.cardHide}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-line font-mono text-[12px] leading-relaxed text-emerald-200/90">{view.answer}</div>
        </div>
      </div>
    </button>
  )
}

export default function TagCollectionPanel({
  profileId,
  tag,
  language,
  onClose,
  onOpenObjective,
  onOpenObjectiveAtTime,
  onOpenTag,
}: Props) {
  const copy = COPY[language]
  const notes = useNotesByTag(profileId, tag)
  const relatedTags = useRelatedVideoNoteTags(profileId, tag)
  const meta = useVideoTag(profileId, tag)
  const { progress } = useMesserVideoProgress()
  const [segment, setSegment] = useState<Segment>('all')
  const [cards, setCards] = useState<Array<{ deckId: string; card: Card }>>([])
  const [deckNames, setDeckNames] = useState<Record<string, string>>({})
  const [cardsLoading, setCardsLoading] = useState(true)

  useEffect(() => {
    let active = true
    setCardsLoading(true)
    Promise.all([listCardsByTag(tag), getDeckNameMap()])
      .then(([rows, names]) => {
        if (!active) return
        setCards(rows)
        setDeckNames(names)
        setCardsLoading(false)
      })
      .catch(() => {
        if (!active) return
        setCards([])
        setCardsLoading(false)
      })
    return () => {
      active = false
    }
  }, [tag])

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => compareObjective(a.objective, b.objective)),
    [notes],
  )
  const sections = useMemo(
    () => buildTagPageSections(sortedNotes.map(note => ({ objective: note.objective, content: note.content }))),
    [sortedNotes],
  )

  const label = meta?.label || tag
  const aliases = meta?.aliases ?? []

  const segments: Array<{ key: Segment; label: string; count: number | null }> = [
    { key: 'all', label: copy.segAll, count: null },
    { key: 'videos', label: copy.segVideos, count: sortedNotes.length },
    { key: 'cards', label: copy.segCards, count: cards.length },
    { key: 'timestamps', label: copy.segTimestamps, count: sections.timestamps.length },
    { key: 'questions', label: copy.segQuestions, count: sections.questions.length },
    { key: 'cardIdeas', label: copy.segCardIdeas, count: sections.cardIdeas.length },
  ]

  const showVideos = segment === 'all' || segment === 'videos'
  const showCards = segment === 'all' || segment === 'cards'
  const nothing =
    segment === 'all' && sortedNotes.length === 0 && cards.length === 0 && !cardsLoading

  const videosSection = (
    <section className="mb-4">
      <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
        <Play size={11} strokeWidth={1.5} />
        {copy.videosHeading} · {sortedNotes.length}
      </div>
      {sortedNotes.length === 0 ? (
        <div className="font-mono text-[11px] text-zinc-600">{copy.emptyVideos}</div>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedNotes.map(note => {
            const badge = statusBadge(resolveVideoStatus(progress[note.objective]), copy)
            const inner = (
              <>
                <span className="mt-0.5 shrink-0 font-mono text-[12px] font-bold text-[--brand-secondary]">{note.objective}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-zinc-100">{objectiveTitle(note.objective)}</span>
                    {badge && (
                      <span className={`shrink-0 rounded-[6px] border px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.12em] ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}
                  </span>
                  {note.content.trim() && (
                    <span className="mt-0.5 line-clamp-2 block whitespace-pre-line font-mono text-[11px] leading-relaxed text-zinc-500">
                      {note.content.trim()}
                    </span>
                  )}
                </span>
              </>
            )
            return onOpenObjective ? (
              <button
                key={note.objective}
                type="button"
                onClick={() => onOpenObjective(note.objective)}
                data-testid={`tag-panel-objective-${note.objective}`}
                className="group flex items-start gap-3 rounded-ds-xl border border-[#1f1f23] bg-[#0c0c0c] px-3 py-2.5 text-left transition-colors hover:border-[--brand-secondary-50] hover:bg-[--brand-secondary-08]"
              >
                {inner}
                <ChevronRight size={15} className="mt-0.5 shrink-0 text-zinc-600 transition-colors group-hover:text-[--brand-secondary]" />
              </button>
            ) : (
              <div key={note.objective} className="flex items-start gap-3 rounded-ds-xl border border-[#1f1f23] bg-[#0c0c0c] px-3 py-2.5">
                {inner}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )

  const cardsSection = (
    <section className="mb-4">
      <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
        <BookOpen size={11} strokeWidth={1.5} />
        {copy.cardsHeading} · {cards.length}
      </div>
      {cardsLoading ? (
        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
          <Loader2 size={13} className="animate-spin" />
          {copy.loadingCards}
        </div>
      ) : cards.length === 0 ? (
        <div className="font-mono text-[11px] text-zinc-600">{copy.emptyCards}</div>
      ) : (
        <div className="flex flex-col gap-2">
          {cards.map(({ deckId, card }) => (
            <FlipCardTile key={card.id} deckName={deckNames[deckId] ?? deckId} view={buildRecallCardView(card)} copy={copy} />
          ))}
        </div>
      )}
    </section>
  )

  const timestampsSection = (
    <section>
      <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
        <Clock size={11} strokeWidth={1.5} />
        {copy.timestampsHeading} · {sections.timestamps.length}
      </div>
      {sections.timestamps.length === 0 ? (
        <div className="font-mono text-[11px] text-zinc-600">{copy.emptyTimestamps}</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {sections.timestamps.map((ts, i) => {
            const inner = (
              <>
                <span className="shrink-0 font-mono text-[11px] font-bold text-[--brand-secondary]">{ts.objective}</span>
                <span className="shrink-0 rounded-[6px] border border-[--brand-secondary-25] bg-[--brand-secondary-12] px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-[--brand-secondary]">
                  {ts.token}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-zinc-300">{ts.label || objectiveTitle(ts.objective)}</span>
              </>
            )
            return onOpenObjectiveAtTime ? (
              <button
                key={`${ts.objective}-${ts.seconds}-${i}`}
                type="button"
                onClick={() => onOpenObjectiveAtTime(ts.objective, ts.seconds, ts.videoIndex)}
                data-testid={`tag-panel-timestamp-${ts.objective}-${ts.seconds}`}
                className="group flex items-center gap-2 rounded-ds-lg border border-[#1f1f23] bg-[#0c0c0c] px-3 py-2 text-left transition-colors hover:border-[--brand-secondary-50] hover:bg-[--brand-secondary-08]"
              >
                {inner}
                <ChevronRight size={14} className="shrink-0 text-zinc-600 transition-colors group-hover:text-[--brand-secondary]" />
              </button>
            ) : (
              <div key={`${ts.objective}-${ts.seconds}-${i}`} className="flex items-center gap-2 rounded-ds-lg border border-[#1f1f23] bg-[#0c0c0c] px-3 py-2">
                {inner}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )

  const signalsSection = (
    kind: 'questions' | 'cardIdeas',
  ) => {
    const list = sections[kind]
    const heading = kind === 'questions' ? copy.questionsHeading : copy.cardIdeasHeading
    const empty = kind === 'questions' ? copy.emptyQuestions : copy.emptyCardIdeas
    const Icon = kind === 'questions' ? HelpCircle : Lightbulb
    return (
      <section>
        <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
          <Icon size={11} strokeWidth={1.5} />
          {heading} · {list.length}
        </div>
        {list.length === 0 ? (
          <div className="font-mono text-[11px] text-zinc-600">{empty}</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {list.map((item, i) => (
              <div
                key={`${item.objective}-${i}`}
                className="flex items-start gap-2 rounded-ds-lg border border-[#1f1f23] bg-[#0c0c0c] px-3 py-2"
              >
                <span className="mt-0.5 shrink-0 font-mono text-[11px] font-bold text-[--brand-secondary]">{item.objective}</span>
                <span className="min-w-0 flex-1 whitespace-pre-line font-mono text-[12px] leading-relaxed text-zinc-200">{item.text}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-sm pt-safe-2 pb-safe-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${copy.title} #${label}`}
    >
      <div className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-ds-sheet border border-[#1f1f23] bg-[#0a0a0a] shadow-2xl">
        {/* Kopf mit Tag-Metadaten */}
        <div className="flex items-start gap-2 border-b border-[#18181b] px-4 py-3">
          {meta?.color ? (
            <span className="mt-1 h-3 w-3 shrink-0 rounded-full ring-1 ring-white/10" style={{ backgroundColor: meta.color }} aria-hidden />
          ) : (
            <Hash size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[--brand-secondary]" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-mono text-[15px] font-bold text-white">#{label}</span>
              {meta?.pinned && <Pin size={13} strokeWidth={1.5} className="shrink-0 text-amber-300/80" aria-hidden />}
            </div>
            {meta?.description?.trim() && (
              <div className="mt-0.5 whitespace-pre-line font-mono text-[11px] leading-relaxed text-zinc-400">{meta.description.trim()}</div>
            )}
            {aliases.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">{copy.aliasesLabel}:</span>
                {aliases.map(alias => (
                  <span key={alias} className="rounded-[6px] border border-[#1f1f23] bg-[#0c0c0c] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    {alias}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ds-icon-button flex h-9 w-9 shrink-0"
            aria-label={copy.close}
            data-testid="tag-panel-close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Segmente */}
        <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-[#18181b] px-4 py-2.5">
          {segments.map(seg => {
            const active = segment === seg.key
            return (
              <button
                key={seg.key}
                type="button"
                onClick={() => setSegment(seg.key)}
                data-testid={`tag-segment-${seg.key}`}
                aria-pressed={active}
                className={`flex shrink-0 items-center gap-1 rounded-ds border px-2.5 py-1.5 font-mono text-[11px] font-bold transition-colors ${
                  active ? 'border-[--brand-secondary-80] bg-[--brand-secondary-20] text-ds-fg' : 'border-[#1f1f23] bg-[#0c0c0c] text-zinc-400 hover:border-[#3f3f46]'
                }`}
              >
                {seg.label}
                {seg.count !== null && <span className={active ? 'text-[--brand-secondary-80]' : 'text-zinc-600'}>{seg.count}</span>}
              </button>
            )
          })}
        </div>

        {/* Verwandte Tags (immer sichtbar) */}
        {relatedTags.length > 0 && (
          <div className="shrink-0 border-b border-[#18181b] px-4 py-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
              <Hash size={11} strokeWidth={1.5} />
              {copy.relatedHeading}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {relatedTags.map(related => (
                <button
                  key={related.tag}
                  type="button"
                  onClick={() => onOpenTag?.(related.tag)}
                  data-testid={`tag-panel-related-${related.tag}`}
                  className="flex items-center gap-1.5 rounded-ds border border-[#1f1f23] bg-[#0c0c0c] px-2 py-1 font-mono text-[11px] text-zinc-300 transition-colors hover:border-[--brand-secondary-50] hover:text-[--brand-secondary]"
                >
                  <Hash size={10} strokeWidth={2} className="text-zinc-600" />
                  {related.tag}
                  <span className="text-[10px] text-zinc-600">
                    {related.count} {copy.relatedCount}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Inhalt je Segment */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {nothing && <div className="py-10 text-center font-mono text-[12px] text-zinc-500">{copy.empty}</div>}
          {showVideos && videosSection}
          {showCards && cardsSection}
          {segment === 'timestamps' && timestampsSection}
          {segment === 'questions' && signalsSection('questions')}
          {segment === 'cardIdeas' && signalsSection('cardIdeas')}
        </div>
      </div>
    </div>
  )
}
