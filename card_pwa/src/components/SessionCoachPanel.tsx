import type { Card } from '../types'
import type { LearningCoachSummary } from '../services/learningCoach'

interface Props {
  language: 'de' | 'en'
  summary: LearningCoachSummary
  onEditCard?: (card: Card) => void
}

function formatElapsed(ms: number): string {
  if (ms <= 0) return '0s'
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

function clampText(value: string, fallback: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized || fallback
}

export default function SessionCoachPanel({ language, summary, onEditCard }: Props) {
  const isDE = language === 'de'
  const focusCopy = {
    repair: {
      badge: '!',
      title: isDE ? 'Problemkarten zuerst klaeren' : 'Repair weak cards first',
      body: isDE
        ? 'Starte den naechsten Block mit diesen Karten und bearbeite unklare Fragen sofort.'
        : 'Start the next block with these cards and edit unclear prompts immediately.',
    },
    slow_down: {
      badge: 'T',
      title: isDE ? 'Tempo senken' : 'Slow the next pass down',
      body: isDE
        ? 'Mehrere Antworten waren langsam. Weniger neue Karten und bewusstes Lesen sind hier wirksamer.'
        : 'Several answers were slow. Fewer new cards and deliberate reading will help more here.',
    },
    short_break: {
      badge: 'P',
      title: isDE ? 'Kurze Pause einplanen' : 'Take a short reset',
      body: isDE
        ? 'Der Block war lang genug. Eine kurze Pause schuetzt die naechste Runde vor Ermuedung.'
        : 'This block was long enough. A short reset protects the next round from fatigue.',
    },
    continue: {
      badge: 'OK',
      title: isDE ? 'Naechster Block ist stabil' : 'Next block is stable',
      body: isDE
        ? 'Die Session war kontrolliert. Du kannst mit faelligen Karten fortsetzen.'
        : 'The session was controlled. Continue with due cards.',
    },
  }[summary.focus]

  if (summary.reviewedCount === 0) return null

  return (
    <div className="mt-5 rounded-[14px] border border-[#18181b] bg-[#0c0c0c] p-4 text-left shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-amber-300/25 bg-amber-400/10 text-amber-100">
          <span className="font-mono text-xs font-bold" aria-hidden="true">{focusCopy.badge}</span>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
            {isDE ? 'Lerncoach' : 'Learning coach'}
          </div>
          <h3 className="mt-1 text-sm font-semibold text-white">{focusCopy.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-white/50">{focusCopy.body}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-[12px] border border-[#18181b] bg-[#0a0a0a] p-3 text-center">
          <div className="font-mono text-base font-bold text-white">{summary.successRate}%</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-white/40">
            {isDE ? 'Treffer' : 'Recall'}
          </div>
        </div>
        <div className="rounded-[12px] border border-[#18181b] bg-[#0a0a0a] p-3 text-center">
          <div className="font-mono text-base font-bold text-white">{formatElapsed(summary.averageElapsedMs)}</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-white/40">
            {isDE ? 'Tempo' : 'Pace'}
          </div>
        </div>
        <div className="rounded-[12px] border border-[#18181b] bg-[#0a0a0a] p-3 text-center">
          <div className={`font-mono text-base font-bold ${summary.problemCards.length > 0 ? 'text-amber-200' : 'text-emerald-200'}`}>
            {summary.problemCards.length}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-white/40">
            {isDE ? 'Problem' : 'Weak'}
          </div>
        </div>
      </div>

      {summary.problemCards.length > 0 && (
        <div className="mt-4 space-y-2">
          {summary.problemCards.slice(0, 3).map(problem => (
            <div key={problem.card.id} className="flex items-center gap-2 rounded-[12px] border border-[#18181b] bg-[#0a0a0a] px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-white/85">
                  {clampText(problem.card.front, isDE ? 'Leere Frage' : 'Empty prompt')}
                </div>
                <div className="mt-0.5 text-[11px] text-white/40">
                  {problem.againCount > 0
                    ? `${problem.againCount}x Again`
                    : `${problem.lowRatingCount}x Hard`}
                  {problem.forcedTomorrow ? ` - ${isDE ? 'morgen' : 'tomorrow'}` : ''}
                </div>
              </div>
              {onEditCard && (
                <button
                  type="button"
                  onClick={() => onEditCard(problem.card)}
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-[12px] border border-[#18181b] bg-[#0c0c0c] px-2 text-[11px] font-semibold text-white/55 transition hover:border-[#3f3f46] hover:text-white"
                  aria-label={isDE ? 'Karte bearbeiten' : 'Edit card'}
                  title={isDE ? 'Karte bearbeiten' : 'Edit card'}
                >
                  {isDE ? 'Edit' : 'Edit'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
