import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ChevronRight, Hash, Loader2, Play, X } from 'lucide-react'
import { SY0_701_OBJECTIVES } from '../../utils/securityDeckHierarchy'
import { getDeckNameMap, listCardsByTag } from '../../db/queries'
import type { Card } from '../../types'
import { useNotesByTag, useRelatedVideoNoteTags } from '../../hooks/useVideoNotes'
import { describeCard } from './VideoRecallCheck'

/**
 * Tag-Sammlung (Obsidian-artig): zeigt ALLE Informationen zu einem `#tag` mit
 * Verweis auf die Quelle — Video-Notizen und/oder Lernkarten, die denselben Tag
 * tragen. Die Quelle ist umschaltbar (beides / nur Videos / nur Karten). Wird
 * sowohl im Videomodus (Klick auf einen Tag) als auch in den Einstellungen
 * (Tag-Browser) als Overlay genutzt.
 */

const COPY = {
  de: {
    title: 'Tag-Sammlung',
    subtitle: 'Alles zu',
    sourceBoth: 'Beides',
    sourceVideos: 'Videos',
    sourceCards: 'Lernkarten',
    videosHeading: 'Video-Notizen',
    cardsHeading: 'Lernkarten',
    relatedHeading: 'Verwandte Tags',
    relatedCount: 'Notizen',
    objective: 'Objective',
    deck: 'Deck',
    loadingCards: 'Lernkarten werden gesucht …',
    empty: 'Noch keine Inhalte mit diesem Tag.',
    emptyVideos: 'Keine Video-Notizen mit diesem Tag.',
    emptyCards: 'Keine Lernkarten mit diesem Tag.',
    close: 'Schließen',
  },
  en: {
    title: 'Tag collection',
    subtitle: 'Everything tagged',
    sourceBoth: 'Both',
    sourceVideos: 'Videos',
    sourceCards: 'Flashcards',
    videosHeading: 'Video notes',
    cardsHeading: 'Flashcards',
    relatedHeading: 'Related tags',
    relatedCount: 'notes',
    objective: 'Objective',
    deck: 'Deck',
    loadingCards: 'Searching flashcards …',
    empty: 'No content with this tag yet.',
    emptyVideos: 'No video notes with this tag.',
    emptyCards: 'No flashcards with this tag.',
    close: 'Close',
  },
} as const

type Source = 'both' | 'videos' | 'cards'

interface Props {
  profileId: string
  tag: string
  language: 'de' | 'en'
  onClose: () => void
  /** Optional: nur im Videomodus — springt zum Video des Objectives. */
  onOpenObjective?: (objective: string) => void
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

export default function TagCollectionPanel({ profileId, tag, language, onClose, onOpenObjective, onOpenTag }: Props) {
  const copy = COPY[language]
  const notes = useNotesByTag(profileId, tag)
  const relatedTags = useRelatedVideoNoteTags(profileId, tag)
  const [source, setSource] = useState<Source>('both')
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

  const showVideos = source !== 'cards'
  const showCards = source !== 'videos'
  const nothing = sortedNotes.length === 0 && cards.length === 0 && !cardsLoading

  const sources: Array<{ key: Source; label: string }> = [
    { key: 'both', label: copy.sourceBoth },
    { key: 'videos', label: copy.sourceVideos },
    { key: 'cards', label: copy.sourceCards },
  ]

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-sm pt-safe-2 pb-safe-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${copy.title} #${tag}`}
    >
      <div className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-[16px] border border-[#1f1f23] bg-[#0a0a0a] shadow-2xl">
        {/* Kopf */}
        <div className="flex items-center gap-2 border-b border-[#18181b] px-4 py-3">
          <Hash size={16} strokeWidth={1.5} className="shrink-0 text-sky-300" />
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[14px] font-bold text-white">{copy.title}</div>
            <div className="truncate font-mono text-[11px] text-zinc-500">
              {copy.subtitle} <span className="text-sky-300">#{tag}</span>
            </div>
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

        {/* Quellen-Auswahl */}
        <div className="flex shrink-0 gap-1.5 border-b border-[#18181b] px-4 py-2.5">
          {sources.map(s => {
            const active = source === s.key
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSource(s.key)}
                data-testid={`tag-source-${s.key}`}
                aria-pressed={active}
                className={`rounded-[8px] border px-3 py-1.5 font-mono text-[11px] font-bold transition-colors ${
                  active
                    ? 'border-sky-400/70 bg-sky-500/20 text-sky-100'
                    : 'border-[#1f1f23] bg-[#0c0c0c] text-zinc-400 hover:border-[#3f3f46]'
                }`}
              >
                {s.label}
              </button>
            )
          })}
        </div>

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
                  className="flex items-center gap-1.5 rounded-[8px] border border-[#1f1f23] bg-[#0c0c0c] px-2 py-1 font-mono text-[11px] text-zinc-300 transition-colors hover:border-sky-500/40 hover:text-sky-200"
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

        {/* Inhalte */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {nothing && <div className="py-10 text-center font-mono text-[12px] text-zinc-500">{copy.empty}</div>}

          {/* Video-Notizen */}
          {showVideos && (
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
                    const inner = (
                      <>
                        <span className="mt-0.5 shrink-0 font-mono text-[12px] font-bold text-sky-300">{note.objective}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-[13px] text-zinc-100">{objectiveTitle(note.objective)}</span>
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
                        className="group flex items-start gap-3 rounded-[12px] border border-[#1f1f23] bg-[#0c0c0c] px-3 py-2.5 text-left transition-colors hover:border-sky-500/40 hover:bg-sky-500/5"
                      >
                        {inner}
                        <ChevronRight size={15} className="mt-0.5 shrink-0 text-zinc-600 transition-colors group-hover:text-sky-300" />
                      </button>
                    ) : (
                      <div
                        key={note.objective}
                        className="flex items-start gap-3 rounded-[12px] border border-[#1f1f23] bg-[#0c0c0c] px-3 py-2.5"
                      >
                        {inner}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {/* Lernkarten */}
          {showCards && (
            <section>
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
                  {cards.map(({ deckId, card }) => {
                    const view = describeCard(card)
                    return (
                      <div
                        key={card.id}
                        className="rounded-[12px] border border-[#1f1f23] bg-[#0c0c0c] px-3 py-2.5"
                      >
                        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                          {copy.deck}: {deckNames[deckId] ?? deckId}
                        </div>
                        <div className="whitespace-pre-line font-mono text-[12px] leading-relaxed text-zinc-100">{view.prompt}</div>
                        <div className="mt-1 whitespace-pre-line font-mono text-[11px] leading-relaxed text-emerald-200/90">{view.answer}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
