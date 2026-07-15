/**
 * AI_CONTEXT: Home-screen React component for the "Heute-Paket" guided daily path:
 * one course video → recall check → the objective's cards. One tap starts the next
 * open step; step states come from real learning signals (useTodayPackage).
 */
import { motion } from '../../ui/motion'
import { Check, CloudOff, GraduationCap, Loader2, Play } from 'lucide-react'
import type { Deck } from '../../types'
import type { LocalVideoMeta } from '../../utils/localVideoManifest'
import type { TodayPackageSteps } from '../../hooks/home/useTodayPackage'

const COPY = {
  de: {
    label: 'Aktuelles Paket',
    videoOf: (n: number, total: number) => `Video ${n}/${total}`,
    objective: (code: string) => `Objective ${code}`,
    stepVideo: 'Video ansehen',
    stepRecall: 'Abruf-Check',
    stepCards: (count: number) => count === 1 ? '1 Karte lernen' : `${count} Karten lernen`,
    stepCardsDone: 'Karten gelernt',
    actionVideo: 'Video ansehen',
    actionRecall: 'Abruf-Check starten',
    actionCards: (count: number) => count === 1 ? '1 Karte lernen' : `${count} Karten lernen`,
    completedToday: 'Voriges geschafft · weiter mit diesem Paket',
    courseDone: 'Alle Kurs-Videos durchgearbeitet!',
    courseDoneHint: 'Weiter geht es mit den fälligen Karten in der Daily Quest.',
    loading: 'Lade Heute-Paket',
    offlineTitle: 'Heute-Paket offline nicht verfügbar',
    offlineHint: 'Es sind noch keine Kursdaten auf diesem Gerät gespeichert. Öffne die App einmal mit Verbindung zum Server — danach steht das Heute-Paket auch offline bereit.',
  },
  en: {
    label: 'Current package',
    videoOf: (n: number, total: number) => `Video ${n}/${total}`,
    objective: (code: string) => `Objective ${code}`,
    stepVideo: 'Watch the video',
    stepRecall: 'Recall check',
    stepCards: (count: number) => count === 1 ? 'Study 1 card' : `Study ${count} cards`,
    stepCardsDone: 'Cards studied',
    actionVideo: 'Watch video',
    actionRecall: 'Start recall check',
    actionCards: (count: number) => count === 1 ? 'Study 1 card' : `Study ${count} cards`,
    completedToday: 'Previous one done · continue with this package',
    courseDone: 'All course videos completed!',
    courseDoneHint: 'Keep going with the due cards in the daily quest.',
    loading: "Loading today's package",
    offlineTitle: "Today's package is unavailable offline",
    offlineHint: 'No course data is stored on this device yet. Open the app once while connected to the server — after that the package also works offline.',
  },
} as const

interface Props {
  language: 'de' | 'en'
  loading: boolean
  video: LocalVideoMeta | null
  videoNumber: number
  videoTotal: number
  steps: TodayPackageSteps
  objectiveDeck: Deck | null
  remainingCards: number
  completedToday: boolean
  /** Öffnet das Video in der Lernvideos-Ansicht (openRecall = direkt zum Check). */
  onWatchVideo: (videoIndex: number, openRecall: boolean) => void
  /** Startet die Karten-Session des Objective-Decks. */
  onStartCards: (deck: Deck) => void
}

/** Offline ohne lokal gespeicherten Katalog: erklärt, warum das Heute-Paket
 *  fehlt und wie es offline verfügbar wird. Die Daily Quest bleibt nutzbar. */
export function TodayPackageOfflineNotice({ language }: { language: 'de' | 'en' }) {
  const copy = COPY[language]
  return (
    <section
      data-testid="today-package-offline-notice"
      className="flex min-w-0 items-start gap-2.5 rounded-ds border border-ds-border bg-ds-floor px-3 py-2.5 shadow-card"
    >
      <CloudOff size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ds-muted" />
      <div className="min-w-0">
        <div className="font-sans text-[13px] font-semibold leading-tight text-ds-fg">{copy.offlineTitle}</div>
        <div className="mt-1 font-mono text-[11px] leading-relaxed text-ds-muted">{copy.offlineHint}</div>
      </div>
    </section>
  )
}

function StepRow({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  return (
    <li className="flex min-w-0 items-center gap-2">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
          done
            ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-300'
            : active
              ? 'border-[--brand-primary-50] bg-[--brand-primary-08] text-[--brand-primary]'
              : 'border-ds-border text-ds-muted'
        }`}
      >
        {done ? <Check size={12} strokeWidth={2.5} /> : null}
      </span>
      <span className={`min-w-0 truncate font-mono text-[12px] ${done ? 'text-ds-muted line-through' : active ? 'text-ds-fg' : 'text-ds-muted'}`}>
        {label}
      </span>
    </li>
  )
}

export function HomeTodayPackageTile({
  language, loading, video, videoNumber, videoTotal, steps, objectiveDeck,
  remainingCards, completedToday, onWatchVideo, onStartCards,
}: Props) {
  const copy = COPY[language]

  let body: React.ReactNode
  if (loading) {
    body = (
      <div className="flex min-h-[72px] items-center gap-3 text-ds-muted">
        <Loader2 size={16} className="animate-spin" />
        <span className="font-mono text-[12px]">{copy.loading}…</span>
      </div>
    )
  } else if (!video) {
    body = (
      <div className="min-w-0">
        <div className="font-sans text-base font-semibold leading-tight text-ds-fg">{copy.courseDone}</div>
        <div className="mt-1 font-mono text-[12px] text-ds-muted">{copy.courseDoneHint}</div>
      </div>
    )
  } else {
    const showCardsStep = objectiveDeck !== null
    const nextAction: 'video' | 'recall' | 'cards' = !steps.video ? 'video' : !steps.recall ? 'recall' : 'cards'

    body = (
      <>
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[7px] border border-[--brand-primary-25] bg-[--brand-primary-08] text-[--brand-primary]">
            <GraduationCap size={20} strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[--brand-primary]">
              {copy.label}
            </div>
            {completedToday && (
              <div
                className="mt-0.5 font-mono text-[10px] leading-tight text-emerald-300"
                data-testid="today-package-current-notice"
              >
                ✓ {copy.completedToday}
              </div>
            )}
            <div className="mt-0.5 break-words font-sans text-base font-semibold leading-tight text-ds-fg min-[420px]:text-lg">
              {video.title}
            </div>
            <div className="mt-0.5 truncate font-mono text-[12px] text-ds-muted">
              {copy.videoOf(videoNumber, videoTotal)} · {copy.objective(video.objective)}
            </div>
          </div>
        </div>

        <ul className="mt-3 grid min-w-0 gap-1.5">
          <StepRow done={steps.video} active={nextAction === 'video'} label={copy.stepVideo} />
          <StepRow done={steps.recall} active={nextAction === 'recall'} label={copy.stepRecall} />
          {showCardsStep && (
            <StepRow
              done={steps.cards}
              active={nextAction === 'cards'}
              label={steps.cards ? copy.stepCardsDone : copy.stepCards(remainingCards)}
            />
          )}
        </ul>

        <div className="mt-3 grid min-w-0 gap-2">
          <button
            type="button"
            data-testid="today-package-action"
            onClick={() => {
              if (nextAction === 'cards' && objectiveDeck) onStartCards(objectiveDeck)
              else onWatchVideo(video.index, nextAction === 'recall')
            }}
            className="flex min-h-[48px] min-w-0 items-center justify-center gap-2 rounded-ds border border-[--brand-primary-50] bg-[--brand-primary] px-3 font-sans text-[14px] font-semibold text-[#150b08] transition-all duration-150 hover:brightness-110 active:scale-[0.98] sm:px-4"
          >
            <Play size={16} strokeWidth={2} />
            <span className="min-w-0 truncate">
              {nextAction === 'video' ? copy.actionVideo : nextAction === 'recall' ? copy.actionRecall : copy.actionCards(remainingCards)}
            </span>
          </button>
        </div>
      </>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      data-testid="today-package-tile"
      className="min-w-0 overflow-hidden rounded-ds border border-transparent bg-ds-card p-3 shadow-card card-gradient-border sm:p-4"
    >
      {body}
    </motion.section>
  )
}
