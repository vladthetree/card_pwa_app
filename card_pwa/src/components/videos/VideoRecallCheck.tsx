/**
 * AI_CONTEXT:
 * Role: Active-recall quiz after a video; shows only the finished Messer MC questions mapped to exactly that video and suggests a confidence state.
 * Used by: VideosView recall-check modal.
 * Important: It intentionally does not write reviews or alter FSRS/SM2 scheduling; it trains recall and calibrates confidence only.
 */
import { useEffect, useMemo, useState } from 'react'
import { Brain, Check, Eye, Loader2, RotateCcw, X } from 'lucide-react'
import { listDeckCards } from '../../db/queries'
import type { Card } from '../../types'
import {
  parseQuestion,
  parseAnswer,
  parseMcAnswer,
  stripHtml,
  type MatchingAnswer,
  type OrderingAnswer,
} from '../../utils/cardTextParser'
import { suggestConfidence, type VideoConfidence } from '../../hooks/useMesserVideoProgress'
import { MESSER_VIDEO_BY_QUESTION_ID, normalizeMesserVideoTitle } from '../../data/messerVideoQuestionMap'

/**
 * Abruf-Check: aktives Erinnern direkt nach dem Video. Lädt das zugehörige
 * Objective-Deck (`getSecurityObjectiveDeckId`) und behält davon nur die Fragen, die
 * laut generiertem Mapping (messerVideoQuestionMap) zu GENAU diesem Video
 * gehören — erst erinnern, dann aufdecken, dann ehrlich selbst bewerten.
 *
 * Bewusst NICHT planungswirksam: der Check schreibt keine Reviews und verändert
 * den FSRS-Zeitplan nicht. Sein Nutzen liegt im Abrufakt selbst (Testing-Effekt)
 * und in der Kalibrierung der Selbsteinschätzung — nicht im Logging. Für echte
 * verteilte Wiederholung startet man eine reguläre Lernsession des Decks.
 */

const DEFAULT_MAX_CARDS = 7
const MESSER_RECALL_QUESTION_PATTERN = /^(M([1-5])-\d{3}):\s+\S/
const NON_MESSER_RECALL_TAGS = new Set(['acronyms', 'acronym-bonus', 'pbq', 'drag-drop'])

const COPY = {
  de: {
    title: 'Abruf-Check',
    objective: 'Objective',
    loading: 'Karten werden geladen …',
    emptyTitle: 'Noch keine Fragen',
    emptyBody: 'Zu diesem Video gibt es noch keine fertigen Abruf-Fragen. Schau das Video, halte rechts Notizen fest — sobald Fragen zu diesem Video vorliegen, erscheinen sie hier.',
    notScheduling: 'Zählt nicht zur Wiederholung — dient dem aktiven Abruf und deiner Selbsteinschätzung.',
    intro: 'Erinnere dich an die Antwort, bevor du aufdeckst.',
    card: 'Karte',
    reveal: 'Antwort zeigen',
    knew: 'Gewusst',
    missed: 'Nicht gewusst',
    answer: 'Antwort',
    explanation: 'Erklärung',
    mnemonic: 'Merkhilfe',
    resultTitle: 'Ergebnis',
    resultScore: '{known} von {total} aus dem Gedächtnis gewusst',
    studyMissed: 'Diese {count} Karten regulär lernen',
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
    emptyTitle: 'No questions yet',
    emptyBody: 'This video has no finished recall questions yet. Watch the video and take notes on the right — questions will show up here once they exist for this video.',
    notScheduling: 'Does not count as a review — it serves active recall and your self-assessment.',
    intro: 'Try to recall the answer before you reveal it.',
    card: 'Card',
    reveal: 'Show answer',
    knew: 'Knew it',
    missed: 'Missed it',
    answer: 'Answer',
    explanation: 'Explanation',
    mnemonic: 'Mnemonic',
    resultTitle: 'Result',
    resultScore: 'Recalled {known} of {total} from memory',
    studyMissed: 'Study these {count} cards for real',
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
  /** Fragenanzahl pro Check (Einstellung „Abruf-Check-Umfang"). */
  maxCards?: number
  onClose: () => void
  onConfidence: (confidence: VideoConfidence) => void
  /** Handoff: „Nicht gewusst“-Karten als reguläre (planungswirksame) Lernsession
   *  des Objective-Decks starten. Der Check selbst bleibt non-scheduling. */
  onStudyMissed?: (cards: Card[]) => void
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

/**
 * Karte gehört genau dann in den Abruf-Check, wenn sie eine fertige
 * Messer-MC-Frage ist UND laut generiertem Mapping zu genau diesem Video
 * gehört. Fragen ohne Mapping-Eintrag werden bewusst ausgeschlossen —
 * lieber weniger Fragen als Fragen aus dem falschen Video (in dem Fall das
 * Mapping neu generieren, siehe messerVideoQuestionMap.ts).
 */
export function isProfessorMesserRecallCard(card: Card, objective?: string, videoTitle?: string): boolean {
  const match = MESSER_RECALL_QUESTION_PATTERN.exec(card.front.trim())
  if (!match) return false
  const [, questionId, domain] = match

  const objectiveDomain = objective?.split('.')[0]
  if (objectiveDomain && domain !== objectiveDomain) return false

  if (card.tags.some(tag => NON_MESSER_RECALL_TAGS.has(tag.trim().toLowerCase()))) return false

  if (videoTitle) {
    const mappedTitle = MESSER_VIDEO_BY_QUESTION_ID[questionId]
    if (!mappedTitle) return false
    return normalizeMesserVideoTitle(mappedTitle) === normalizeMesserVideoTitle(videoTitle)
  }
  return true
}

export interface RecallCardView {
  prompt: string
  /** MC-Optionen in Anzeigereihenfolge; leer bei Ordering/Matching/Plain. */
  options: Array<{ label: string; text: string; correct: boolean }>
  answer: string
  merkhilfe: string | null
}

/**
 * Bereitet eine Karte für die Abruf-Ansicht auf: MC-Fragen strukturiert
 * (Optionen einzeln, korrekte markiert, Erklärung/Merkhilfe getrennt),
 * alle anderen Typen als schlichte Frage/Antwort-Ansicht.
 */
export function buildRecallCardView(card: Card): RecallCardView {
  const question = parseQuestion(card.front)
  const prompt = (question.question || stripHtml(card.front))
    .replace(/^M[1-5]-\d{3}:\s*/, '') // interne Fragen-ID, für Lernende nur Rauschen
    .trim()

  let answer = ''
  let options: RecallCardView['options'] = []
  let merkhilfe: string | null = null

  if (question.type === 'ordering') {
    const parsed = parseAnswer(card.back, 'ordering') as OrderingAnswer
    const ordered = parsed.correctOrder
      .map((idx, position) => `${position + 1}. ${question.items[idx] ?? ''}`.trim())
      .filter(Boolean)
      .join('\n')
    answer = [ordered, parsed.explanation].filter(Boolean).join('\n\n')
    merkhilfe = parsed.merkhilfe
  } else if (question.type === 'matching') {
    const parsed = parseAnswer(card.back, 'matching') as MatchingAnswer
    answer = parsed.pairs.map(pair => `${pair.left} = ${pair.right}`).join('\n')
    merkhilfe = parsed.merkhilfe
  } else {
    const parsed = parseMcAnswer(card.back)
    options = Object.entries(question.options).map(([label, text]) => ({
      label,
      text: stripHtml(text).trim(),
      correct: parsed.correctOptions.includes(label),
    }))
    merkhilfe = parsed.merkhilfe
    // Ohne erkannte korrekte Option gäbe die Optionsliste beim Aufdecken keine
    // Antwort preis — dann lieber die schlichte Text-Ansicht.
    if (options.length > 0 && !options.some(option => option.correct)) options = []
    if (options.length > 0) {
      // Optionen samt Markierung übernehmen die Antwort-Rolle; übrig bleibt die
      // Erklärung. Wiederholt sie eingangs nur den Text der korrekten Option
      // (Kartenformat "C | Confidentiality\n\nErklärung…"), fällt das weg.
      answer = parsed.answer
      const correctText = options.find(option => option.correct)?.text
      const answerLines = stripHtml(answer).trim().split('\n')
      if (correctText && answerLines[0]?.trim() === correctText) {
        answer = answerLines.slice(1).join('\n').trim()
      }
    } else {
      answer = [
        parsed.correct && question.options[parsed.correct]
          ? `${parsed.correct}: ${question.options[parsed.correct]}`
          : '',
        parsed.answer,
      ].filter(Boolean).join('\n\n')
    }
  }

  const cleanPrompt = stripHtml(prompt).trim()
  const cleanAnswer = stripHtml(answer).trim()
  return {
    prompt: cleanPrompt || '—',
    options,
    answer: cleanAnswer || (options.length > 0 ? '' : stripHtml(card.back).trim() || '—'),
    merkhilfe: merkhilfe ? stripHtml(merkhilfe).trim() || null : null,
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
    cls: 'border-[--brand-secondary-25] bg-[--brand-secondary-08] text-[--brand-secondary] hover:border-[--brand-secondary-80]',
    activeCls: 'border-[--brand-secondary-80] bg-[--brand-secondary-20] text-ds-fg',
  },
  solid: {
    key: 'solid',
    cls: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200 hover:border-emerald-400/60',
    activeCls: 'border-emerald-400/70 bg-emerald-500/20 text-emerald-100',
  },
}

export default function VideoRecallCheck({ deckId, objective, videoTitle, language, maxCards = DEFAULT_MAX_CARDS, onClose, onConfidence, onStudyMissed }: Props) {
  const copy = COPY[language]
  const [phase, setPhase] = useState<Phase>('loading')
  const [cards, setCards] = useState<Card[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [knownCount, setKnownCount] = useState(0)
  const [missedCards, setMissedCards] = useState<Card[]>([])

  useEffect(() => {
    let cancelled = false
    setPhase('loading')
    void listDeckCards(deckId).then(all => {
      if (cancelled) return
      const usable = all.filter(card => card.front?.trim() && isProfessorMesserRecallCard(card, objective, videoTitle))
      if (usable.length === 0) {
        setPhase('empty')
        return
      }
      setCards(shuffle(usable).slice(0, maxCards))
      setIndex(0)
      setRevealed(false)
      setKnownCount(0)
      setMissedCards([])
      setPhase('quiz')
    }).catch(() => {
      if (!cancelled) setPhase('empty')
    })
    return () => {
      cancelled = true
    }
  }, [deckId, objective, videoTitle, maxCards])

  const current = cards[index]
  const view = useMemo(() => (current ? buildRecallCardView(current) : null), [current])
  const total = cards.length

  const grade = (known: boolean) => {
    const nextKnown = knownCount + (known ? 1 : 0)
    if (!known && current) {
      setMissedCards(prev => (prev.some(card => card.id === current.id) ? prev : [...prev, current]))
    }
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
    setMissedCards([])
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
      <div className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-ds-sheet border border-[#1f1f23] bg-[#0a0a0a] shadow-2xl">
        {/* Kopf */}
        <div className="flex items-center gap-2 border-b border-[#18181b] px-4 py-3">
          <Brain size={16} strokeWidth={1.5} className="shrink-0 text-[--brand-secondary]" />
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

        {/* Inhalt scrollt; die Aktionsleiste darunter bleibt immer erreichbar (Mobil-Fix). */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
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
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                <span className="shrink-0">{copy.card} {index + 1}/{total}</span>
                <span>{copy.intro}</span>
              </div>

              <div className="min-h-[140px] rounded-ds-2xl border border-[#1f1f23] bg-[#0c0c0c] p-4">
                <div className="whitespace-pre-line font-mono text-[15px] leading-relaxed text-zinc-100">
                  {view.prompt}
                </div>

                {/* MC-Optionen als schlichte Textzeilen: vor dem Aufdecken neutral,
                    danach die korrekte grün, die übrigen abgedimmt. */}
                {view.options.length > 0 && (
                  <div className="mt-4 flex flex-col gap-1" data-testid="recall-check-options">
                    {view.options.map(option => {
                      const highlight = revealed && option.correct
                      const dimmed = revealed && !option.correct
                      return (
                        <div
                          key={option.label}
                          className={`flex items-start gap-2.5 py-0.5 font-mono text-[13px] leading-relaxed transition-colors ${
                            highlight ? 'text-emerald-200' : dimmed ? 'text-zinc-600' : 'text-zinc-300'
                          }`}
                        >
                          <span className={`shrink-0 font-bold ${
                            highlight ? 'text-emerald-300' : dimmed ? 'text-zinc-700' : 'text-zinc-500'
                          }`}>
                            {option.label}
                          </span>
                          <span className="min-w-0 flex-1">{option.text}</span>
                          {highlight && <Check size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-emerald-300" />}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Aufgedeckt: alles flach als Fließtext — die grüne Option oben ist
                    die einzige farbige Markierung, Merkhilfe nur eine Zeile mit Label. */}
                {revealed && (view.options.length === 0 || view.answer || view.merkhilfe) && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-[#18181b] pt-4">
                    {view.options.length === 0 && (
                      <div>
                        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-400/80">
                          {copy.answer}
                        </div>
                        <div className="whitespace-pre-line font-mono text-[14px] leading-relaxed text-emerald-100">
                          {view.answer || '—'}
                        </div>
                      </div>
                    )}
                    {view.options.length > 0 && view.answer && (
                      <p className="whitespace-pre-line font-mono text-[13px] leading-relaxed text-zinc-400">
                        {view.answer}
                      </p>
                    )}
                    {view.merkhilfe && (
                      <p className="whitespace-pre-line font-mono text-[13px] leading-relaxed text-zinc-400">
                        <span className="font-bold text-amber-300/90">{copy.mnemonic}: </span>
                        {view.merkhilfe}
                      </p>
                    )}
                  </div>
                )}
              </div>

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

              {/* Handoff statt Versickern: die Misses landen in einer regulären,
                  planungswirksamen Session des Objective-Decks. */}
              {onStudyMissed && missedCards.length > 0 && (
                <button
                  type="button"
                  onClick={() => onStudyMissed(missedCards)}
                  data-testid="recall-check-study-missed"
                  className="flex items-center justify-center gap-2 rounded-ds-xl border border-[--brand-secondary-50] bg-[--brand-secondary-12] py-3 font-mono text-[13px] font-bold text-[--brand-secondary] transition-colors hover:border-[--brand-secondary-80]"
                >
                  <Brain size={15} strokeWidth={1.5} />
                  {copy.studyMissed.replace('{count}', String(missedCards.length))}
                </button>
              )}

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

        {/* Aktionsleiste: fest unter dem scrollenden Inhalt, damit Aufdecken und
            Bewerten auch bei langen Karten auf kleinen Displays erreichbar bleiben. */}
        {phase === 'quiz' && (
          <div className="shrink-0 border-t border-[#18181b] px-4 py-3">
            {!revealed ? (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                data-testid="recall-check-reveal"
                className="flex w-full items-center justify-center gap-2 rounded-ds-xl border border-[#3f3f46] bg-[#111] py-3 font-mono text-[13px] font-bold text-zinc-100 transition-colors hover:border-[--brand-secondary-50]"
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
                  className="flex items-center justify-center gap-2 rounded-ds-xl border border-rose-500/40 bg-rose-500/10 py-4 font-mono text-[13px] font-bold text-rose-200 transition-colors hover:border-rose-400/70"
                >
                  <X size={15} strokeWidth={1.5} />
                  {copy.missed}
                </button>
                <button
                  type="button"
                  onClick={() => grade(true)}
                  data-testid="recall-check-knew"
                  className="flex items-center justify-center gap-2 rounded-ds-xl border border-emerald-500/40 bg-emerald-500/10 py-4 font-mono text-[13px] font-bold text-emerald-200 transition-colors hover:border-emerald-400/70"
                >
                  <Check size={15} strokeWidth={1.5} />
                  {copy.knew}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Fuß: Hinweis zur Nicht-Planungswirksamkeit */}
        <div className="border-t border-[#18181b] px-4 py-2.5">
          <p className="font-mono text-[10px] leading-relaxed text-zinc-600">{copy.notScheduling}</p>
        </div>
      </div>
    </div>
  )
}
