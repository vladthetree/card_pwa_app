/**
 * AI_CONTEXT:
 * Role: Active-recall quiz after a video; samples cards from the matching objective deck and suggests a video confidence state.
 * Used by: VideosView recall-check modal.
 * Important: It intentionally does not write reviews or alter FSRS/SM2 scheduling; it trains recall and calibrates confidence only.
 */
import { useEffect, useMemo, useState } from 'react'
import { Brain, Check, Eye, Loader2, RotateCcw, X } from 'lucide-react'
import { fetchDeckCards } from '../../db/queries'
import type { Card } from '../../types'
import {
  parseAnyQuestion,
  parseAnyAnswer,
  parseAnswerText,
  stripHtml,
  type MatchingAnswer,
  type OrderingAnswer,
} from '../../utils/cardTextParser'
import { suggestConfidence, type VideoConfidence } from '../../hooks/useMesserVideoProgress'

/**
 * Abruf-Check: aktives Erinnern direkt nach dem Video. Zieht die Karten des
 * zugehörigen Objective-Decks (`MesserVideo.deckId`) und legt sie als
 * Flip-Karten vor — erst erinnern, dann aufdecken, dann ehrlich selbst bewerten.
 *
 * Bewusst NICHT planungswirksam: der Check schreibt keine Reviews und verändert
 * den FSRS-Zeitplan nicht. Sein Nutzen liegt im Abrufakt selbst (Testing-Effekt)
 * und in der Kalibrierung der Selbsteinschätzung — nicht im Logging. Für echte
 * verteilte Wiederholung startet man eine reguläre Lernsession des Decks.
 */

const MAX_CARDS = 7

const COPY = {
  de: {
    title: 'Abruf-Check',
    objective: 'Objective',
    loading: 'Karten werden geladen …',
    emptyTitle: 'Noch keine Karten',
    emptyBody: 'Für dieses Objective gibt es noch keine Lernkarten. Schau das Video, halte rechts Notizen fest und lege später Karten an — dann kannst du hier aktiv abfragen.',
    notScheduling: 'Zählt nicht zur Wiederholung — dient dem aktiven Abruf und deiner Selbsteinschätzung.',
    intro: 'Erinnere dich an die Antwort, bevor du aufdeckst.',
    card: 'Karte',
    reveal: 'Antwort zeigen',
    knew: 'Gewusst',
    missed: 'Nicht gewusst',
    resultTitle: 'Ergebnis',
    resultScore: '{known} von {total} aus dem Gedächtnis gewusst',
    suggestion: 'Vorschlag für deine Selbsteinschätzung:',
    setConfidence: 'Status setzen',
    again: 'Nochmal',
    close: 'Schließen',
    gaps: 'Lücken',
    ok: 'Okay',
    solid: 'Sicher',
  },
  en: {
    title: 'Recall check',
    objective: 'Objective',
    loading: 'Loading cards …',
    emptyTitle: 'No cards yet',
    emptyBody: 'This objective has no flashcards yet. Watch the video, take notes on the right, and create cards later — then you can actively quiz yourself here.',
    notScheduling: 'Does not count as a review — it serves active recall and your self-assessment.',
    intro: 'Try to recall the answer before you reveal it.',
    card: 'Card',
    reveal: 'Show answer',
    knew: 'Knew it',
    missed: 'Missed it',
    resultTitle: 'Result',
    resultScore: 'Recalled {known} of {total} from memory',
    suggestion: 'Suggested self-assessment:',
    setConfidence: 'Set status',
    again: 'Again',
    close: 'Close',
    gaps: 'Gaps',
    ok: 'Okay',
    solid: 'Solid',
  },
} as const

interface Props {
  deckId: string
  objective: string
  videoTitle: string
  language: 'de' | 'en'
  onClose: () => void
  onConfidence: (confidence: VideoConfidence) => void
}

type Phase = 'loading' | 'empty' | 'quiz' | 'result'

function shuffle<T>(input: T[]): T[] {
  const arr = [...input]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Reduziert eine Karte beliebigen Typs auf eine schlichte Frage/Antwort-Ansicht. */
export function describeCard(card: Card): { prompt: string; answer: string } {
  const question = parseAnyQuestion(card.front)
  const prompt = (question.question || stripHtml(card.front)).trim()

  let answer = ''
  if (question.type === 'ordering') {
    const parsed = parseAnyAnswer(card.back, 'ordering') as OrderingAnswer
    const ordered = parsed.correctOrder
      .map((idx, position) => `${position + 1}. ${question.items[idx] ?? ''}`.trim())
      .filter(Boolean)
      .join('\n')
    answer = [ordered, parsed.explanation].filter(Boolean).join('\n\n')
  } else if (question.type === 'matching') {
    const parsed = parseAnyAnswer(card.back, 'matching') as MatchingAnswer
    answer = parsed.pairs.map(pair => `${pair.left} = ${pair.right}`).join('\n')
  } else {
    const parsed = parseAnswerText(card.back)
    const parts: string[] = []
    if (parsed.correct && question.options[parsed.correct]) {
      parts.push(`${parsed.correct}: ${question.options[parsed.correct]}`)
    }
    if (parsed.answer) parts.push(parsed.answer)
    answer = parts.join('\n\n')
  }

  const cleanPrompt = stripHtml(prompt).trim()
  const cleanAnswer = stripHtml(answer).trim()
  return {
    prompt: cleanPrompt || '—',
    answer: cleanAnswer || stripHtml(card.back).trim() || '—',
  }
}

const CONFIDENCE_META: Record<VideoConfidence, { key: 'gaps' | 'ok' | 'solid'; cls: string; activeCls: string }> = {
  gaps: {
    key: 'gaps',
    cls: 'border-amber-500/30 bg-amber-500/5 text-amber-200 hover:border-amber-400/60',
    activeCls: 'border-amber-400/70 bg-amber-500/20 text-amber-100',
  },
  ok: {
    key: 'ok',
    cls: 'border-sky-500/30 bg-sky-500/5 text-sky-200 hover:border-sky-400/60',
    activeCls: 'border-sky-400/70 bg-sky-500/20 text-sky-100',
  },
  solid: {
    key: 'solid',
    cls: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200 hover:border-emerald-400/60',
    activeCls: 'border-emerald-400/70 bg-emerald-500/20 text-emerald-100',
  },
}

export default function VideoRecallCheck({ deckId, objective, videoTitle, language, onClose, onConfidence }: Props) {
  const copy = COPY[language]
  const [phase, setPhase] = useState<Phase>('loading')
  const [cards, setCards] = useState<Card[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [knownCount, setKnownCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    setPhase('loading')
    void fetchDeckCards(deckId).then(all => {
      if (cancelled) return
      const usable = all.filter(card => card.front?.trim())
      if (usable.length === 0) {
        setPhase('empty')
        return
      }
      setCards(shuffle(usable).slice(0, MAX_CARDS))
      setIndex(0)
      setRevealed(false)
      setKnownCount(0)
      setPhase('quiz')
    }).catch(() => {
      if (!cancelled) setPhase('empty')
    })
    return () => {
      cancelled = true
    }
  }, [deckId])

  const current = cards[index]
  const view = useMemo(() => (current ? describeCard(current) : null), [current])
  const total = cards.length

  const grade = (known: boolean) => {
    const nextKnown = knownCount + (known ? 1 : 0)
    if (index + 1 >= total) {
      setKnownCount(nextKnown)
      setPhase('result')
      return
    }
    setKnownCount(nextKnown)
    setIndex(index + 1)
    setRevealed(false)
  }

  const restart = () => {
    setCards(prev => shuffle(prev))
    setIndex(0)
    setRevealed(false)
    setKnownCount(0)
    setPhase('quiz')
  }

  const suggested = suggestConfidence(knownCount, total)

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-sm pt-safe-2 pb-safe-4"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
    >
      <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-ds-sheet border border-[#1f1f23] bg-[#0a0a0a] shadow-2xl">
        {/* Kopf */}
        <div className="flex items-center gap-2 border-b border-[#18181b] px-4 py-3">
          <Brain size={16} strokeWidth={1.5} className="shrink-0 text-sky-300" />
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[14px] font-bold text-white">{copy.title}</div>
            <div className="truncate font-mono text-[11px] text-zinc-500">
              {copy.objective} {objective} · {videoTitle}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ds-icon-button flex h-9 w-9 shrink-0"
            aria-label={copy.close}
            data-testid="recall-check-close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-4">
          {phase === 'loading' && (
            <div className="flex items-center justify-center gap-2 py-12 font-mono text-[12px] text-zinc-500">
              <Loader2 size={16} className="animate-spin" />
              {copy.loading}
            </div>
          )}

          {phase === 'empty' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Brain size={26} strokeWidth={1.5} className="text-zinc-600" />
              <div className="font-mono text-[14px] font-bold text-zinc-200">{copy.emptyTitle}</div>
              <p className="max-w-sm font-mono text-[12px] leading-relaxed text-zinc-500">{copy.emptyBody}</p>
            </div>
          )}

          {phase === 'quiz' && view && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                <span>{copy.card} {index + 1}/{total}</span>
                <span>{copy.intro}</span>
              </div>

              <div className="min-h-[140px] rounded-ds-2xl border border-[#1f1f23] bg-[#0c0c0c] p-4">
                <div className="whitespace-pre-line font-mono text-[15px] leading-relaxed text-zinc-100">
                  {view.prompt}
                </div>
                {revealed && (
                  <div className="mt-4 border-t border-[#18181b] pt-4">
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-400/80">
                      {language === 'de' ? 'Antwort' : 'Answer'}
                    </div>
                    <div className="whitespace-pre-line font-mono text-[14px] leading-relaxed text-emerald-100">
                      {view.answer}
                    </div>
                  </div>
                )}
              </div>

              {!revealed ? (
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  data-testid="recall-check-reveal"
                  className="flex items-center justify-center gap-2 rounded-ds-xl border border-[#3f3f46] bg-[#111] py-3 font-mono text-[13px] font-bold text-zinc-100 transition-colors hover:border-sky-500/50"
                >
                  <Eye size={15} strokeWidth={1.5} />
                  {copy.reveal}
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => grade(false)}
                    data-testid="recall-check-missed"
                    className="flex items-center justify-center gap-2 rounded-ds-xl border border-rose-500/40 bg-rose-500/10 py-3 font-mono text-[13px] font-bold text-rose-200 transition-colors hover:border-rose-400/70"
                  >
                    <X size={15} strokeWidth={1.5} />
                    {copy.missed}
                  </button>
                  <button
                    type="button"
                    onClick={() => grade(true)}
                    data-testid="recall-check-knew"
                    className="flex items-center justify-center gap-2 rounded-ds-xl border border-emerald-500/40 bg-emerald-500/10 py-3 font-mono text-[13px] font-bold text-emerald-200 transition-colors hover:border-emerald-400/70"
                  >
                    <Check size={15} strokeWidth={1.5} />
                    {copy.knew}
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === 'result' && (
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-500">{copy.resultTitle}</div>
                <div className="mt-1 font-mono text-[20px] font-bold text-white">
                  {copy.resultScore.replace('{known}', String(knownCount)).replace('{total}', String(total))}
                </div>
              </div>

              <div>
                <div className="mb-2 font-mono text-[11px] text-zinc-500">{copy.suggestion}</div>
                <div className="grid grid-cols-3 gap-2">
                  {(['gaps', 'ok', 'solid'] as const).map(level => {
                    const meta = CONFIDENCE_META[level]
                    const isSuggested = level === suggested
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => onConfidence(level)}
                        data-testid={`recall-check-confidence-${level}`}
                        className={`flex flex-col items-center gap-1 rounded-ds-xl border py-3 font-mono text-[12px] font-bold transition-colors ${
                          isSuggested ? meta.activeCls : meta.cls
                        }`}
                      >
                        {copy[meta.key]}
                        {isSuggested && (
                          <span className="text-[9px] font-normal uppercase tracking-[0.12em] opacity-80">
                            {language === 'de' ? 'Vorschlag' : 'suggested'}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={restart}
                className="flex items-center justify-center gap-2 rounded-ds-xl border border-[#1f1f23] py-2.5 font-mono text-[12px] text-zinc-400 transition-colors hover:border-[#3f3f46] hover:text-zinc-200"
              >
                <RotateCcw size={14} strokeWidth={1.5} />
                {copy.again}
              </button>
            </div>
          )}
        </div>

        {/* Fuß: Hinweis zur Nicht-Planungswirksamkeit */}
        <div className="border-t border-[#18181b] px-4 py-2.5">
          <p className="font-mono text-[10px] leading-relaxed text-zinc-600">{copy.notScheduling}</p>
        </div>
      </div>
    </div>
  )
}
