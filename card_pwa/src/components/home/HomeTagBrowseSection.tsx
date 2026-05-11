import { useState } from 'react'
import { Tag, ChevronRight, ChevronDown, BookOpen, Loader2 } from 'lucide-react'
import type { Card } from '../../types'

interface Props {
  language: 'de' | 'en'
  tagIndex: Record<string, Card[]>
  allTags: string[]
  loading: boolean
  onStartTagStudy: (tag: string, cards: Card[]) => void
}

function cardTypeDot(card: Card): { color: string; label: string } {
  if (card.queue === -1) return { color: 'bg-zinc-600', label: 'suspended' }
  if (card.type === 'new') return { color: 'bg-blue-500', label: 'new' }
  if (card.type === 'learning' || card.type === 'relearning') return { color: 'bg-amber-400', label: 'learning' }
  return { color: 'bg-emerald-500', label: 'review' }
}

function CardTile({ card }: { card: Card }) {
  const dot = cardTypeDot(card)
  return (
    <div className="flex flex-col gap-1.5 rounded-[12px] border border-[#1f1f23] bg-[#0a0a0a] p-2.5 min-h-[80px]">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot.color}`} aria-label={dot.label} />
        <span className="text-[10px] uppercase tracking-[0.1em] text-white/30 truncate">{dot.label}</span>
      </div>
      <p className="text-xs text-white/80 leading-[1.45] line-clamp-3 break-words">
        {card.front || '—'}
      </p>
    </div>
  )
}

function tagStats(cards: Card[], language: 'de' | 'en') {
  const newCount = cards.filter(c => c.type === 'new' && c.queue !== -1).length
  const learningCount = cards.filter(c => (c.type === 'learning' || c.type === 'relearning') && c.queue !== -1).length
  const reviewCount = cards.filter(c => c.type === 'review' && c.queue !== -1).length
  const parts: string[] = []
  if (newCount > 0) parts.push(`${newCount} ${language === 'de' ? 'neu' : 'new'}`)
  if (learningCount > 0) parts.push(`${learningCount} lernen`)
  if (reviewCount > 0) parts.push(`${reviewCount} ${language === 'de' ? 'Wdh.' : 'review'}`)
  return parts.join(' · ')
}

function TagSection({
  tag,
  cards,
  language,
  onStartTagStudy,
}: {
  tag: string
  cards: Card[]
  language: 'de' | 'en'
  onStartTagStudy: (tag: string, cards: Card[]) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const stats = tagStats(cards, language)
  const displayTag = tag === '(untagged)'
    ? (language === 'de' ? '(ohne Tag)' : '(untagged)')
    : tag

  const studyableCards = cards.filter(c => c.queue !== -1)

  return (
    <div className="rounded-[14px] border border-[#1f1f23] bg-[#080808] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={expanded}
        >
          <Tag size={13} className="shrink-0 text-[--brand-primary] opacity-75" />
          <span className="truncate text-sm font-semibold text-white">{displayTag}</span>
          <span className="shrink-0 text-[11px] text-white/40">{cards.length}</span>
          {expanded
            ? <ChevronDown size={13} className="ml-auto shrink-0 text-white/40" />
            : <ChevronRight size={13} className="ml-auto shrink-0 text-white/40" />}
        </button>

        <button
          type="button"
          onClick={() => onStartTagStudy(tag, studyableCards)}
          disabled={studyableCards.length === 0}
          className="shrink-0 flex items-center gap-1.5 rounded-[9px] border border-[--brand-primary-50] bg-[--brand-primary-10] px-2.5 py-1.5 text-[11px] font-semibold text-[--brand-primary] transition hover:bg-[--brand-primary-20] disabled:opacity-35 active:scale-95"
        >
          <BookOpen size={12} />
          {language === 'de' ? 'Lernen' : 'Study'}
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="px-3 pb-2.5 -mt-1">
          <span className="text-[10px] text-white/35">{stats}</span>
        </div>
      )}

      {/* Card grid */}
      {expanded && (
        <div className="border-t border-[#1a1a1a] px-3 pb-3 pt-2.5">
          <div className="grid grid-cols-2 gap-2">
            {cards.map(card => (
              <CardTile key={card.id} card={card} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function HomeTagBrowseSection({ language, tagIndex, allTags, loading, onStartTagStudy }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-white/40">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm">{language === 'de' ? 'Lade Tags…' : 'Loading tags…'}</span>
      </div>
    )
  }

  if (allTags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <Tag size={28} className="text-white/20" />
        <p className="text-sm text-white/40">
          {language === 'de'
            ? 'Noch keine Tags vorhanden. Füge Tags zu deinen Karten hinzu.'
            : 'No tags yet. Add tags to your cards to browse them here.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 pb-safe-4">
      {allTags.map(tag => (
        <TagSection
          key={tag}
          tag={tag}
          cards={tagIndex[tag] ?? []}
          language={language}
          onStartTagStudy={onStartTagStudy}
        />
      ))}
    </div>
  )
}
