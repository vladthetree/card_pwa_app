/**
 * AI_CONTEXT: Responsive summary + editor for the SY0-701 draft learning plan.
 * Mobile renders the editor as a safe-area-aware bottom sheet; desktop uses a
 * centered dialog. The component is controlled so persistence stays in
 * LearningUnitsView and the exam-date settings/sync path remains authoritative.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, CalendarDays, Check, ChevronDown, Clock3, Layers3, Pencil, X } from 'lucide-react'
import { AnimatePresence, motion } from '../ui/motion'
import { useVisualViewport } from '../hooks/useVisualViewport'
import type { LearningPacingResult } from '../utils/learningUnitRanking'
import type { LearningPlanMappingSummary } from '../utils/learningPlanMapping'

export const EXAM_LANGUAGES = ['en', 'ja', 'pt', 'es', 'th'] as const
export type ExamLanguage = (typeof EXAM_LANGUAGES)[number]

export interface LearningPlanFormValues {
  examDateIso: string
  examLanguage: string
  weeklyHours: string
  learningDays: string
  bufferDays: string
}

export interface NormalizedLearningPlanValues {
  examDateIso: string | null
  examLanguage: ExamLanguage
  weeklyMinutesAvailable: number
  learningDaysPerWeek: number
  bufferDays: number
}

export type LearningPlanField = keyof LearningPlanFormValues

export function buildLearningPlanFormValues(input: {
  examDateIso?: string | null
  examLanguage?: string | null
  weeklyMinutesAvailable?: number | null
  learningDaysPerWeek?: number | null
  bufferDays?: number | null
}): LearningPlanFormValues {
  return {
    examDateIso: input.examDateIso ?? '',
    examLanguage: EXAM_LANGUAGES.includes(input.examLanguage as ExamLanguage) ? input.examLanguage! : 'en',
    weeklyHours: String((input.weeklyMinutesAvailable ?? 300) / 60),
    learningDays: String(input.learningDaysPerWeek ?? 6),
    bufferDays: String(input.bufferDays ?? 7),
  }
}

export function learningPlanFormValuesEqual(a: LearningPlanFormValues, b: LearningPlanFormValues): boolean {
  return (Object.keys(a) as LearningPlanField[]).every(key => a[key] === b[key])
}

export function normalizeLearningPlanFormValues(values: LearningPlanFormValues): NormalizedLearningPlanValues | null {
  const weeklyHours = Number(values.weeklyHours)
  const learningDays = Number(values.learningDays)
  const bufferDays = Number(values.bufferDays)
  const dateValid = values.examDateIso === '' || /^\d{4}-\d{2}-\d{2}$/.test(values.examDateIso)
  const languageValid = EXAM_LANGUAGES.includes(values.examLanguage as ExamLanguage)
  if (
    !dateValid || !languageValid ||
    !Number.isFinite(weeklyHours) || weeklyHours < 0.5 || weeklyHours > 80 ||
    !Number.isInteger(learningDays) || learningDays < 1 || learningDays > 7 ||
    !Number.isInteger(bufferDays) || bufferDays < 0 || bufferDays > 60
  ) return null

  return {
    examDateIso: values.examDateIso || null,
    examLanguage: values.examLanguage as ExamLanguage,
    weeklyMinutesAvailable: Math.round(weeklyHours * 60),
    learningDaysPerWeek: learningDays,
    bufferDays,
  }
}

const COPY = {
  de: {
    title: 'Lernplan',
    draft: 'Entwurf',
    edit: 'Plan bearbeiten',
    editorTitle: 'Lernplan bearbeiten',
    editorSubtitle: 'Termin und Zeitbudget steuern die Empfehlungen der Lerneinheiten.',
    examDate: 'Prüfungstermin',
    noExamDate: 'Noch kein Prüfungstermin',
    language: 'Prüfungssprache',
    weeklyHours: 'Stunden pro Woche',
    learningDays: 'Lerntage pro Woche',
    bufferDays: 'Puffertage',
    hoursShort: 'Std./Woche',
    daysShort: 'Lerntage',
    bufferShort: 'Puffer',
    mappedDecks: (roots: number, subDecks: number, videos: number) =>
      `${roots} Decks · ${subDecks} Subdecks · ${videos} Videos`,
    cardProgress: (reviewed: number, total: number) => `${reviewed}/${total} Karten bearbeitet`,
    cardProgressLabel: 'Fortschritt der gemappten Lernkarten',
    cancel: 'Abbrechen',
    save: 'Plan speichern',
    saving: 'Speichert …',
    invalid: 'Bitte gültige Werte eingeben: 0,5–80 Stunden, 1–7 Lerntage und 0–60 Puffertage.',
    close: 'Lernplan schließen',
    discardTitle: 'Änderungen verwerfen?',
    discardText: 'Die Eingaben wurden noch nicht gespeichert.',
    keepEditing: 'Weiter bearbeiten',
    discard: 'Verwerfen',
    pacing: {
      'missing-plan': 'Termin und Zeitbudget vervollständigen.',
      'past-exam': 'Der Termin ist überschritten. Bitte aktualisieren.',
      'missing-estimates': 'Noch keine vollständige Machbarkeitsaussage möglich.',
      'capacity-shortfall': 'Das aktuelle Zeitbudget reicht voraussichtlich nicht.',
      'on-track': 'Der Plan ist mit dem aktuellen Zeitbudget machbar.',
    } satisfies Record<LearningPacingResult['reason'], string>,
    perDay: (minutes: number) => `Etwa ${minutes} Min. je Lerntag`,
    workloadTitle: 'Aktuell erfasste Restarbeit',
    workloadSource: 'Kurs/Labs: Planwerte · Reviews bis Termin: Scheduler + deine gemessene Kartenzeit',
    courseWork: (units: number, duration: string) => `Kurs: ${units} Einheiten · ${duration} Planwert`,
    labWork: (units: number, duration: string) => `Labs: ${units} offen · ${duration} Planwert (alle offenen Labs)`,
    reviewWork: (cards: number, duration: string) => `Wiederholung: ${cards} Karten · etwa ${duration}`,
    scheduledReviewWork: (cards: number, duration: string) => `Bis Termin bereits fällig geplant: ${cards} Karten · etwa ${duration}`,
    futureReviewsOpen: (cards: number) => `${cards} neue Karten: spätere FSRS-Reviews erst nach der ersten Antwort berechenbar`,
    reviewSplit: (due: number, errors: number) => `${due} fällig · ${errors} ungelöste Fehler`,
    reviewTiming: (seconds: number, samples: number) => `Ø ${seconds} Sek./Karte aus ${samples} Messungen`,
    reviewTimingMissing: (cards: number) => `${cards} Karten offen · noch keine verwertbare Zeitmessung`,
    reserveWork: (percent: number, duration: string) => `Reserve ${percent} %: ${duration}`,
    totalWork: (duration: string) => `Prognostizierter Umfang: ${duration}`,
    minimumWork: (duration: string) => `Bekannte Untergrenze inkl. Reserve: ${duration}`,
    missingUnitEstimates: (count: number) => `${count} Einheiten ohne Zeitwert`,
    totalWorkOpen: 'Der aktuelle Umfang bleibt offen, weil Mess- oder Schätzwerte fehlen.',
  },
  en: {
    title: 'Study plan',
    draft: 'Draft',
    edit: 'Edit plan',
    editorTitle: 'Edit study plan',
    editorSubtitle: 'Your date and time budget drive the learning-unit recommendations.',
    examDate: 'Exam date',
    noExamDate: 'No exam date yet',
    language: 'Exam language',
    weeklyHours: 'Hours per week',
    learningDays: 'Study days per week',
    bufferDays: 'Buffer days',
    hoursShort: 'hrs/week',
    daysShort: 'study days',
    bufferShort: 'buffer',
    mappedDecks: (roots: number, subDecks: number, videos: number) =>
      `${roots} decks · ${subDecks} subdecks · ${videos} videos`,
    cardProgress: (reviewed: number, total: number) => `${reviewed}/${total} cards reviewed`,
    cardProgressLabel: 'Mapped flashcard progress',
    cancel: 'Cancel',
    save: 'Save plan',
    saving: 'Saving …',
    invalid: 'Enter valid values: 0.5–80 hours, 1–7 study days, and 0–60 buffer days.',
    close: 'Close study plan',
    discardTitle: 'Discard changes?',
    discardText: 'Your changes have not been saved yet.',
    keepEditing: 'Keep editing',
    discard: 'Discard',
    pacing: {
      'missing-plan': 'Complete the date and time budget.',
      'past-exam': 'The exam date has passed. Please update it.',
      'missing-estimates': 'A complete feasibility estimate is not available yet.',
      'capacity-shortfall': 'The current time budget is probably insufficient.',
      'on-track': 'The plan is feasible with the current time budget.',
    } satisfies Record<LearningPacingResult['reason'], string>,
    perDay: (minutes: number) => `About ${minutes} min per study day`,
    workloadTitle: 'Currently recorded remaining work',
    workloadSource: 'Course/labs: plan values · reviews through the date: scheduler + your measured card time',
    courseWork: (units: number, duration: string) => `Course: ${units} units · ${duration} plan value`,
    labWork: (units: number, duration: string) => `Labs: ${units} open · ${duration} plan value (all open labs)`,
    reviewWork: (cards: number, duration: string) => `Review: ${cards} cards · about ${duration}`,
    scheduledReviewWork: (cards: number, duration: string) => `Already scheduled through the date: ${cards} cards · about ${duration}`,
    futureReviewsOpen: (cards: number) => `${cards} new cards: later FSRS reviews become predictable after the first answer`,
    reviewSplit: (due: number, errors: number) => `${due} due · ${errors} unresolved errors`,
    reviewTiming: (seconds: number, samples: number) => `Avg ${seconds} sec/card from ${samples} measurements`,
    reviewTimingMissing: (cards: number) => `${cards} cards open · no usable timing data yet`,
    reserveWork: (percent: number, duration: string) => `${percent}% reserve: ${duration}`,
    totalWork: (duration: string) => `Projected scope: ${duration}`,
    minimumWork: (duration: string) => `Known lower bound incl. reserve: ${duration}`,
    missingUnitEstimates: (count: number) => `${count} units without a time value`,
    totalWorkOpen: 'The current scope remains open because measurement or estimate values are missing.',
  },
} as const

const LANGUAGE_LABELS: Record<ExamLanguage, { de: string; en: string }> = {
  en: { de: 'Englisch', en: 'English' },
  ja: { de: 'Japanisch', en: 'Japanese' },
  pt: { de: 'Portugiesisch', en: 'Portuguese' },
  es: { de: 'Spanisch', en: 'Spanish' },
  th: { de: 'Thailändisch', en: 'Thai' },
}

function formatExamDate(iso: string, language: 'de' | 'en'): string {
  if (!iso) return COPY[language].noExamDate
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (!Number.isFinite(date.getTime())) return iso
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(date)
}

function formatDuration(minutes: number, language: 'de' | 'en'): string {
  const rounded = Math.max(0, Math.round(minutes))
  const hours = Math.floor(rounded / 60)
  const rest = rounded % 60
  if (hours === 0) return `${rest} ${language === 'de' ? 'Min.' : 'min'}`
  if (rest === 0) return `${hours} ${language === 'de' ? 'Std.' : 'hr'}`
  return `${hours} ${language === 'de' ? 'Std.' : 'hr'} ${rest} ${language === 'de' ? 'Min.' : 'min'}`
}

function pacingTone(pacing: LearningPacingResult): string {
  if (pacing.reason === 'past-exam' || pacing.reason === 'capacity-shortfall') {
    return 'border-amber-400/35 bg-amber-400/10 text-amber-200'
  }
  if (pacing.reason === 'on-track') {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
  }
  return 'border-ds-border bg-ds-card text-ds-muted'
}

interface Props {
  language: 'de' | 'en'
  summaryValues: LearningPlanFormValues
  values: LearningPlanFormValues
  pacing: LearningPacingResult
  previewPacing: LearningPacingResult
  contentProgress: LearningPlanMappingSummary
  open: boolean
  dirty: boolean
  saving: boolean
  saveError: string | null
  configured: boolean
  collapseSignal: number
  onOpen: () => void
  onChange: (field: LearningPlanField, value: string) => void
  onSave: () => void
  onClose: () => void
}

export function LearningPlanPanel({
  language,
  summaryValues,
  values,
  pacing,
  previewPacing,
  contentProgress,
  open,
  dirty,
  saving,
  saveError,
  configured,
  collapseSignal,
  onOpen,
  onChange,
  onSave,
  onClose,
}: Props) {
  const copy = COPY[language]
  const titleId = useId()
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [summaryCollapsed, setSummaryCollapsed] = useState(configured)
  const viewport = useVisualViewport()
  const keyboardOpen = viewport?.keyboardOpen ?? false
  const normalized = normalizeLearningPlanFormValues(values)
  const summaryLanguage = EXAM_LANGUAGES.includes(summaryValues.examLanguage as ExamLanguage)
    ? summaryValues.examLanguage as ExamLanguage
    : 'en'
  const cardProgressPercent = contentProgress.cardCount > 0
    ? Math.round((contentProgress.reviewedCardCount / contentProgress.cardCount) * 100)
    : 0

  useEffect(() => {
    if (configured) setSummaryCollapsed(true)
  }, [collapseSignal, configured])

  useEffect(() => {
    if (!open) {
      setConfirmDiscard(false)
      return
    }
    // Auf Handys soll sich das native Datums-Picker/Keyboard nicht ungefragt
    // öffnen. Desktop bekommt weiterhin einen sinnvollen Startfokus.
    const focusTimer = window.setTimeout(() => {
      if (window.matchMedia('(min-width: 640px)').matches) {
        dateInputRef.current?.focus({ preventScroll: true })
      }
    }, 180)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (dirty) setConfirmDiscard(true)
      else onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [dirty, onClose, open])

  const requestClose = () => {
    if (saving) return
    if (dirty) {
      setConfirmDiscard(true)
      return
    }
    onClose()
  }

  const pacingLabel = (result: LearningPacingResult) => (
    <>
      {copy.pacing[result.reason]}
      {result.reason === 'on-track' && result.requiredMinutesPerLearningDay !== null
        ? ` ${copy.perDay(result.requiredMinutesPerLearningDay)}.`
        : ''}
    </>
  )

  const workloadDetails = (result: LearningPacingResult) => {
    const workload = result.workload
    if (!workload) return null
    return (
      <div className="mt-2 rounded-ds border border-ds-border bg-ds-card px-2.5 py-2.5" data-testid="learning-workload-metrics">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[--brand-secondary]">
          {copy.workloadTitle}
        </div>
        <div className="mt-1 font-mono text-[9px] leading-relaxed text-ds-muted">
          {copy.workloadSource}
        </div>
        <div className="mt-1.5 grid gap-1 font-mono text-[10px] leading-relaxed text-ds-muted">
          <span>{copy.courseWork(workload.remainingCourseUnitCount, formatDuration(workload.remainingCourseMinutes, language))}</span>
          <span>{copy.labWork(workload.remainingLabUnitCount, formatDuration(workload.remainingLabMinutes, language))}</span>
          {workload.estimatedScheduledReviewMinutes === null
            ? <span className="text-amber-200">{copy.reviewTimingMissing(workload.scheduledReviewCardCount)}</span>
            : (
                <>
                  <span>{copy.scheduledReviewWork(workload.scheduledReviewCardCount, formatDuration(workload.estimatedScheduledReviewMinutes, language))}</span>
                  {workload.averageReviewSeconds !== null && (
                    <span>{copy.reviewTiming(Math.round(workload.averageReviewSeconds), workload.timedReviewSampleCount)}</span>
                  )}
                </>
              )}
          <span>{copy.reviewSplit(workload.dueReviewCardCount, workload.unresolvedErrorCardCount)}</span>
          {workload.unintroducedCardCount > 0 && (
            <span className="text-amber-200">{copy.futureReviewsOpen(workload.unintroducedCardCount)}</span>
          )}
          {workload.missingEstimateUnitIds.length > 0 && (
            <span className="text-amber-200">{copy.missingUnitEstimates(workload.missingEstimateUnitIds.length)}</span>
          )}
          {workload.reserveMinutes !== null && (
            <span>{copy.reserveWork(workload.reservePercent, formatDuration(workload.reserveMinutes, language))}</span>
          )}
          {workload.totalMinutes === null ? (
            <>
              {workload.minimumTotalMinutes !== null && (
                <span className="font-semibold text-ds-fg">{copy.minimumWork(formatDuration(workload.minimumTotalMinutes, language))}</span>
              )}
              <span className="text-amber-200">{copy.totalWorkOpen}</span>
            </>
          ) : (
            <span className="font-semibold text-ds-fg">{copy.totalWork(formatDuration(workload.totalMinutes, language))}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <section
        className="rounded-ds border border-ds-border bg-ds-floor p-3 sm:p-4"
        data-testid="learning-plan-summary"
        aria-labelledby={`${titleId}-summary`}
      >
        <div className="flex items-stretch justify-between gap-2">
          <button
            type="button"
            onClick={() => setSummaryCollapsed(value => !value)}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-ds text-left"
            aria-expanded={!summaryCollapsed}
            aria-controls={`${titleId}-details`}
            data-testid="learning-plan-toggle"
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span id={`${titleId}-summary`} className="font-mono text-[11px] uppercase tracking-[0.14em] text-[--brand-primary]">
                  {copy.title}
                </span>
                <span className="rounded-full border border-ds-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-ds-muted">
                  {copy.draft}
                </span>
              </span>
              <span className="mt-1 flex min-w-0 items-center gap-2 text-ds-fg">
                <CalendarDays size={15} strokeWidth={1.75} className="shrink-0 text-[--brand-secondary]" />
                <span className="font-sans text-[14px] font-semibold leading-tight">
                  {formatExamDate(summaryValues.examDateIso, language)}
                </span>
              </span>
            </span>
            <ChevronDown
              size={16}
              strokeWidth={1.75}
              className={`shrink-0 text-ds-muted transition-transform ${summaryCollapsed ? '-rotate-90' : 'rotate-0'}`}
            />
          </button>
          <button
            type="button"
            onClick={onOpen}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-ds border border-ds-border bg-ds-card px-3 font-sans text-[13px] text-ds-fg transition hover:border-[--brand-primary-50] active:scale-[0.98] sm:min-h-9"
            data-testid="learning-plan-edit"
          >
            <Pencil size={14} strokeWidth={1.75} />
            <span className="hidden min-[360px]:inline">{copy.edit}</span>
          </button>
        </div>

        {contentProgress.cardCount > 0 && (
          <div className="mt-2.5 border-t border-ds-border pt-2.5">
            <div className="flex min-w-0 items-center justify-between gap-2 font-mono text-[10px] leading-tight text-ds-muted">
              <span className="flex min-w-0 items-center gap-1.5">
                <Layers3 size={13} strokeWidth={1.75} className="shrink-0 text-[--brand-secondary]" />
                <span className="truncate">
                  {copy.mappedDecks(contentProgress.rootDeckCount, contentProgress.deckCount, contentProgress.unitCount)}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-ds-fg">
                {copy.cardProgress(contentProgress.reviewedCardCount, contentProgress.cardCount)}
              </span>
            </div>
            <div
              className="mt-2 h-1 overflow-hidden rounded-full bg-ds-border"
              role="progressbar"
              aria-label={copy.cardProgressLabel}
              aria-valuemin={0}
              aria-valuemax={contentProgress.cardCount}
              aria-valuenow={contentProgress.reviewedCardCount}
            >
              <div
                className="h-full rounded-full bg-[--brand-secondary] transition-[width] duration-300"
                style={{ width: `${cardProgressPercent}%` }}
              />
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {!summaryCollapsed && (
            <motion.div
              id={`${titleId}-details`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-ds-muted">
                <span>{summaryValues.weeklyHours} {copy.hoursShort}</span>
                <span>{summaryValues.learningDays} {copy.daysShort}</span>
                <span>{summaryValues.bufferDays} {copy.bufferShort}</span>
                <span>{LANGUAGE_LABELS[summaryLanguage][language]}</span>
              </div>
              <div className={`mt-2 flex items-start gap-2 rounded-ds border px-2.5 py-2 font-mono text-[11px] leading-relaxed ${pacingTone(pacing)}`}>
                {pacing.reason === 'on-track'
                  ? <Check size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
                  : pacing.reason === 'capacity-shortfall' || pacing.reason === 'past-exam'
                    ? <AlertTriangle size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                    : <Clock3 size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />}
                <span>{pacingLabel(pacing)}</span>
              </div>
              {workloadDetails(pacing)}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <AnimatePresence>
        {open && (
          <div
            className="fixed left-0 right-0 z-[1000] flex items-end justify-center px-safe pt-safe-2 sm:items-center sm:p-4"
            style={viewport
              ? { top: `${viewport.top}px`, height: `${viewport.height}px` }
              : { top: 0, height: '100dvh' }}
          >
            <motion.div
              className="absolute inset-0 bg-black/[0.82] backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={requestClose}
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              data-testid="learning-plan-editor"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative flex max-h-full w-full flex-col overflow-hidden rounded-t-ds-sheet border border-b-0 border-ds-border bg-ds-bg shadow-modal sm:max-h-[min(760px,calc(100dvh-2rem))] sm:max-w-2xl sm:rounded-ds-xl sm:border-b"
            >
              <div className="shrink-0 border-b border-ds-border bg-ds-bg/95 px-4 pb-3 pt-3 backdrop-blur-xl sm:px-5 sm:py-4">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ds-border-hover sm:hidden" aria-hidden="true" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 id={titleId} className="font-sans text-[19px] font-semibold leading-tight text-ds-fg">
                      {copy.editorTitle}
                    </h2>
                    <p className="mt-1 font-mono text-[11px] leading-relaxed text-ds-muted">
                      {copy.editorSubtitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={requestClose}
                    aria-label={copy.close}
                    className="ds-icon-button flex h-11 w-11 shrink-0 sm:h-9 sm:w-9"
                  >
                    <X size={16} strokeWidth={1.75} />
                  </button>
                </div>
              </div>

              <form
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5"
                data-study-scroll="allow"
                onSubmit={event => {
                  event.preventDefault()
                  if (normalized && dirty && !saving) onSave()
                }}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <label className="col-span-2 grid gap-1.5 font-mono text-[11px] text-ds-muted sm:col-span-2">
                    {copy.examDate}
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={values.examDateIso}
                      onChange={event => onChange('examDateIso', event.target.value)}
                      className="min-h-11 w-full rounded-ds border border-ds-border bg-ds-card px-3 font-sans text-[16px] text-ds-fg [color-scheme:dark]"
                    />
                  </label>
                  <label className="col-span-2 grid gap-1.5 font-mono text-[11px] text-ds-muted sm:col-span-2">
                    {copy.language}
                    <select
                      value={values.examLanguage}
                      onChange={event => onChange('examLanguage', event.target.value)}
                      className="min-h-11 w-full rounded-ds border border-ds-border bg-ds-card px-3 font-sans text-[16px] text-ds-fg"
                    >
                      {EXAM_LANGUAGES.map(code => (
                        <option key={code} value={code}>{LANGUAGE_LABELS[code][language]} ({code.toUpperCase()})</option>
                      ))}
                    </select>
                  </label>
                  <label className="col-span-2 grid gap-1.5 font-mono text-[11px] text-ds-muted sm:col-span-2">
                    {copy.weeklyHours}
                    <input
                      type="number"
                      min={0.5}
                      max={80}
                      step={0.5}
                      inputMode="decimal"
                      enterKeyHint="next"
                      value={values.weeklyHours}
                      onChange={event => onChange('weeklyHours', event.target.value)}
                      className="min-h-11 w-full rounded-ds border border-ds-border bg-ds-card px-3 font-sans text-[16px] tabular-nums text-ds-fg"
                    />
                  </label>
                  <label className="grid gap-1.5 font-mono text-[11px] text-ds-muted">
                    {copy.learningDays}
                    <input
                      type="number"
                      min={1}
                      max={7}
                      step={1}
                      inputMode="numeric"
                      enterKeyHint="next"
                      value={values.learningDays}
                      onChange={event => onChange('learningDays', event.target.value)}
                      className="min-h-11 w-full rounded-ds border border-ds-border bg-ds-card px-3 font-sans text-[16px] tabular-nums text-ds-fg"
                    />
                  </label>
                  <label className="grid gap-1.5 font-mono text-[11px] text-ds-muted">
                    {copy.bufferDays}
                    <input
                      type="number"
                      min={0}
                      max={60}
                      step={1}
                      inputMode="numeric"
                      enterKeyHint="done"
                      value={values.bufferDays}
                      onChange={event => onChange('bufferDays', event.target.value)}
                      className="min-h-11 w-full rounded-ds border border-ds-border bg-ds-card px-3 font-sans text-[16px] tabular-nums text-ds-fg"
                    />
                  </label>
                </div>

                {!normalized && (
                  <p className="mt-3 rounded-ds border border-amber-400/35 bg-amber-400/10 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-amber-200" role="alert">
                    {copy.invalid}
                  </p>
                )}

                <div className={`mt-4 flex items-start gap-2 rounded-ds border px-3 py-3 font-mono text-[11px] leading-relaxed ${pacingTone(previewPacing)}`}>
                  <Clock3 size={15} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                  <span>{pacingLabel(previewPacing)}</span>
                </div>
                {workloadDetails(previewPacing)}

                {saveError && (
                  <p className="mt-3 rounded-ds border border-red-400/35 bg-red-400/10 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-red-200" role="alert" aria-live="assertive">
                    {saveError}
                  </p>
                )}
              </form>

              {confirmDiscard ? (
                <div className={`shrink-0 border-t border-amber-400/30 bg-amber-400/10 px-4 pt-3 sm:px-5 sm:pb-4 ${keyboardOpen ? 'pb-3' : 'pb-safe-4'}`}>
                  <div className="font-sans text-[14px] font-semibold text-amber-100">{copy.discardTitle}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-amber-200/75">{copy.discardText}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setConfirmDiscard(false)} className="min-h-11 rounded-ds border border-ds-border bg-ds-card px-3 text-[14px] text-ds-fg">
                      {copy.keepEditing}
                    </button>
                    <button type="button" onClick={onClose} className="min-h-11 rounded-ds border border-red-400/35 bg-red-400/10 px-3 text-[14px] font-semibold text-red-200">
                      {copy.discard}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`grid shrink-0 grid-cols-2 gap-2 border-t border-ds-border bg-ds-bg/95 px-4 pt-3 backdrop-blur-xl sm:px-5 sm:pb-4 ${keyboardOpen ? 'pb-3' : 'pb-safe-4'}`}>
                  <button type="button" onClick={requestClose} disabled={saving} className="min-h-11 rounded-ds border border-ds-border bg-ds-card px-3 font-sans text-[14px] text-ds-fg disabled:opacity-50">
                    {copy.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={!normalized || !dirty || saving}
                    className="min-h-11 rounded-ds bg-[--brand-primary] px-3 font-sans text-[14px] font-semibold text-black transition active:scale-[0.98] disabled:opacity-45"
                    data-testid="learning-plan-save"
                  >
                    {saving ? copy.saving : copy.save}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
