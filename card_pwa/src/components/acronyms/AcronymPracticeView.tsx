/**
 * AI_CONTEXT:
 * Role: Self-assessment MC practice for the 336-pair SY0-701 acronym crosswalk ("Wofür steht X?").
 * Used by: HomeView as the 'acronyms' Home-Modus.
 * Important: Bewusst NICHT planungswirksam — schreibt keine Reviews, verändert kein FSRS/SM2-Scheduling
 * (analog zum Video-Recall-Check). Reiner Übungslauf, Score nur für die aktuelle Runde im Speicher.
 */
import { useMemo, useState } from 'react'
import { ArrowLeft, Check, Hash, Info, RotateCcw, X } from 'lucide-react'
import { SY0701_ACRONYMS } from '../../data/sy0701Acronyms'
import { ACRONYM_DEFINITIONS } from '../../data/acronymDefinitions'
import { buildAcronymQuestions, pickAcronymQuestions } from '../../utils/acronymQuiz'
import AcronymDetailPanel from './AcronymDetailPanel'

const ROUND_SIZE = 20

const COPY = {
  de: {
    title: 'Akronyme',
    subtitle: `${SY0701_ACRONYMS.length} Paare aus dem offiziellen SY0-701-Crosswalk`,
    back: 'Zurück',
    question: 'Wofür steht',
    next: 'Weiter',
    finish: 'Runde abschließen',
    restart: 'Neue Runde',
    scoreLabel: 'Ergebnis dieser Runde',
    of: 'von',
    whatIsThis: 'Was ist das genau?',
  },
  en: {
    title: 'Acronyms',
    subtitle: `${SY0701_ACRONYMS.length} pairs from the official SY0-701 crosswalk`,
    back: 'Back',
    question: 'What does',
    next: 'Next',
    finish: 'Finish round',
    restart: 'New round',
    scoreLabel: 'Result for this round',
    of: 'of',
    whatIsThis: 'What is this, exactly?',
  },
} as const

interface Props {
  language: 'de' | 'en'
  /** Als Home-Modus unter der Homebar gerendert: Header ohne Zurück-Pfeil. */
  embedded?: boolean
  onExit?: () => void
}

export default function AcronymPracticeView({ language, embedded = false, onExit }: Props) {
  const copy = COPY[language]
  const allQuestions = useMemo(() => buildAcronymQuestions(SY0701_ACRONYMS, Date.now()), [])
  const [roundSeed, setRoundSeed] = useState(() => Date.now())
  const round = useMemo(() => pickAcronymQuestions(allQuestions, ROUND_SIZE, roundSeed), [allQuestions, roundSeed])

  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [detailOpen, setDetailOpen] = useState(false)

  const current = round[index]
  const done = index >= round.length

  const pickOption = (opt: string) => {
    if (picked) return
    setPicked(opt)
    if (opt === current.correctMeaning) setCorrectCount(c => c + 1)
  }

  const next = () => {
    setPicked(null)
    setDetailOpen(false)
    setIndex(i => i + 1)
  }

  const restart = () => {
    setRoundSeed(Date.now())
    setIndex(0)
    setPicked(null)
    setDetailOpen(false)
    setCorrectCount(0)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-[#18181b] bg-[#050505] px-4 pb-3 pt-safe-2">
        <div className="flex items-center gap-3">
          {!embedded && (
            <button type="button" onClick={onExit} className="ds-icon-button flex h-11 w-11 shrink-0" aria-label={copy.back}>
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 font-mono text-[22px] font-bold leading-tight text-white">
              <Hash size={18} strokeWidth={1.5} className="text-[--brand-secondary]" />
              {copy.title}
            </div>
            <div className="truncate font-mono text-[12px] text-zinc-500">{copy.subtitle}</div>
          </div>
          {!done && (
            <span
              data-testid="acronym-progress"
              className="flex shrink-0 items-center gap-1.5 rounded-ds-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 font-mono text-[12px] font-bold text-emerald-300"
            >
              {index + 1} / {round.length}
            </span>
          )}
        </div>
      </div>

      {/* Inhalt */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" data-study-scroll="allow">
        <div className="mx-auto w-full max-w-2xl">
          {!done && current && (
            <div data-testid="acronym-question">
              <p className="font-mono text-[13px] uppercase tracking-[0.18em] text-zinc-500">
                {copy.question}
              </p>
              <p className="mt-1 font-mono text-[32px] font-bold leading-tight text-white">
                {current.abbr}
                <span className="text-zinc-500">?</span>
              </p>
              {current.contextHint && (
                <p className="mt-2 rounded-ds-lg border-l-2 border-amber-400/60 bg-amber-500/8 px-3 py-2 font-mono text-[12.5px] leading-snug text-amber-100/85">
                  {current.contextHint}
                </p>
              )}

              <div className="mt-5 flex flex-col gap-2" data-testid="acronym-options">
                {current.options.map(opt => {
                  const isPicked = picked === opt
                  const isCorrect = opt === current.correctMeaning
                  const highlight = picked !== null && isCorrect
                  const wrongPick = picked !== null && isPicked && !isCorrect
                  const dimmed = picked !== null && !isCorrect && !isPicked
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={picked !== null}
                      onClick={() => pickOption(opt)}
                      data-testid="acronym-option"
                      className={`flex items-center gap-2.5 rounded-ds-xl border px-3.5 py-3 text-left font-mono text-[14px] leading-snug transition-colors ${
                        highlight
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                          : wrongPick
                            ? 'border-rose-500/50 bg-rose-500/10 text-rose-200'
                            : dimmed
                              ? 'border-transparent text-zinc-600'
                              : 'border-[#1f1f23] bg-[#0f0f0f] text-zinc-200 hover:border-[--brand-secondary-50] hover:text-white'
                      }`}
                    >
                      <span className="min-w-0 flex-1">{opt}</span>
                      {highlight && <Check size={15} strokeWidth={2} className="shrink-0 text-emerald-300" />}
                      {wrongPick && <X size={15} strokeWidth={2} className="shrink-0 text-rose-300" />}
                    </button>
                  )
                })}
              </div>

              {picked !== null && (
                <button
                  type="button"
                  onClick={() => setDetailOpen(true)}
                  data-testid="acronym-detail-open"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-ds-xl border border-[#1f1f23] bg-[#0f0f0f] px-3.5 py-2.5 font-mono text-[12.5px] text-zinc-300 transition-colors hover:border-[--brand-secondary-50] hover:text-[--brand-secondary]"
                >
                  <Info size={14} strokeWidth={1.5} />
                  {copy.whatIsThis}
                </button>
              )}
            </div>
          )}

          {done && (
            <div data-testid="acronym-summary" className="rounded-ds-2xl border border-[#1f1f23] bg-[#0c0c0c] px-4 py-5 text-center">
              <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-zinc-500">{copy.scoreLabel}</p>
              <p className="mt-2 font-mono text-[36px] font-bold text-white">
                {correctCount} <span className="text-zinc-500">{copy.of}</span> {round.length}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fixe Aktionsleiste */}
      <div className="shrink-0 border-t border-[#18181b] bg-[#050505] px-4 pb-safe-3 pt-3">
        {!done ? (
          <button
            type="button"
            data-testid="acronym-next"
            onClick={next}
            disabled={picked === null}
            className={`w-full min-h-[52px] rounded-ds-2xl border px-4 font-mono text-[15px] transition-all duration-150 ${
              picked !== null
                ? 'border-violet-500/60 bg-violet-500/10 text-zinc-100 hover:bg-violet-500/20 active:scale-[0.99]'
                : 'border-[#1f1f23] bg-[#0c0c0c] text-zinc-600'
            }`}
          >
            {index === round.length - 1 ? copy.finish : copy.next}
          </button>
        ) : (
          <button
            type="button"
            data-testid="acronym-restart"
            onClick={restart}
            className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-ds-2xl border border-violet-500/60 bg-violet-500/10 px-4 font-mono text-[15px] text-zinc-100 transition-all duration-150 hover:bg-violet-500/20 active:scale-[0.99]"
          >
            <RotateCcw size={15} strokeWidth={1.5} />
            {copy.restart}
          </button>
        )}
      </div>

      {detailOpen && current && (
        <AcronymDetailPanel
          abbr={current.abbr}
          meaning={current.correctMeaning}
          definition={ACRONYM_DEFINITIONS[current.id]}
          language={language}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </div>
  )
}
