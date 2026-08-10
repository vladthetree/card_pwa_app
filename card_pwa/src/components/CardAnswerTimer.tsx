/** Desktop-only visual clock for one card presentation. */
import { Pause, Play } from 'lucide-react'

export function CardAnswerTimer({
  elapsedSeconds,
  isPaused,
  isStopped,
  language,
  onTogglePaused,
}: {
  elapsedSeconds: number
  isPaused: boolean
  isStopped: boolean
  language: 'de' | 'en'
  onTogglePaused: () => void
}) {
  const pauseLabel = language === 'de' ? 'Timer pausieren' : 'Pause timer'
  const resumeLabel = language === 'de' ? 'Timer fortsetzen' : 'Resume timer'

  return (
    <div
      className="inline-flex items-end gap-3 font-mono tabular-nums text-white/75"
      role="timer"
      aria-label={`${elapsedSeconds} ${language === 'de' ? 'Sekunden' : 'seconds'}`}
      data-testid="card-answer-timer"
    >
      <span className="min-w-[3ch] text-right text-[3.25rem] font-light leading-[0.82] tracking-[-0.075em]">
        {elapsedSeconds}
      </span>
      <button
        type="button"
        onClick={onTogglePaused}
        disabled={isStopped}
        className="mb-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.035] text-white/25 transition duration-200 hover:bg-white/[0.07] hover:text-white/60 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white/40 disabled:cursor-default disabled:opacity-[0.15]"
        aria-label={isPaused ? resumeLabel : pauseLabel}
        title={isPaused ? resumeLabel : pauseLabel}
        data-testid="card-answer-timer-pause"
      >
        {isPaused ? <Play size={10} strokeWidth={1.5} fill="currentColor" /> : <Pause size={10} strokeWidth={1.5} fill="currentColor" />}
      </button>
    </div>
  )
}
