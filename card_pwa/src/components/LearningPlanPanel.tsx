/**
 * AI_CONTEXT: Responsive summary + editor for the SY0-701 draft learning plan.
 * Mobile renders the editor as a safe-area-aware bottom sheet; desktop uses a
 * centered dialog. The component is controlled so the profile-scoped learning
 * plan remains the authoritative source and Settings is only a compatibility
 * projection for countdown/sync.
 */
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, ArrowLeft, CalendarDays, Check, ChevronDown, Clock3, Layers3, Minus, Pencil, Plus, X } from 'lucide-react'
import { AnimatePresence, motion } from '../ui/motion'
import { UI_TOKENS } from '../constants/ui'
import { useVisualViewport } from '../hooks/useVisualViewport'
import type { LearningPacingResult } from '../utils/learningUnitRanking'
import type { LearningPlanMappingSummary } from '../utils/learningPlanMapping'
import { isValidExamDateIso } from '../utils/examDate'

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
  const dateValid = values.examDateIso === '' || isValidExamDateIso(values.examDateIso)
  const languageValid = EXAM_LANGUAGES.includes(values.examLanguage as ExamLanguage)
  if (
    !dateValid || !languageValid ||
    !Number.isFinite(weeklyHours) || weeklyHours < 0.5 || weeklyHours > 80 ||
    !Number.isInteger(learningDays) || learningDays < 1 || learningDays > 7 ||
    values.bufferDays.trim() === '' ||
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
    examDatePreset: (days: number) => `+${days} Tage`,
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
    wizard: {
      stepTitles: {
        examDateIso: 'Wann ist deine Prüfung?',
        examLanguage: 'In welcher Sprache?',
        weeklyHours: 'Wie viele Stunden pro Woche?',
        learningDays: 'Wie viele Lerntage pro Woche?',
        bufferDays: 'Wie viele Puffertage?',
      } satisfies Record<LearningPlanField, string>,
      summaryTitle: 'Dein Lernplan',
      back: 'Zurück',
      next: 'Weiter',
    },
  },
  en: {
    title: 'Study plan',
    draft: 'Draft',
    edit: 'Edit plan',
    editorTitle: 'Edit study plan',
    editorSubtitle: 'Your date and time budget drive the learning-unit recommendations.',
    examDate: 'Exam date',
    examDatePreset: (days: number) => `+${days} days`,
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
    wizard: {
      stepTitles: {
        examDateIso: 'When is your exam?',
        examLanguage: 'In which language?',
        weeklyHours: 'How many hours per week?',
        learningDays: 'How many study days per week?',
        bufferDays: 'How many buffer days?',
      } satisfies Record<LearningPlanField, string>,
      summaryTitle: 'Your study plan',
      back: 'Back',
      next: 'Next',
    },
  },
} as const

const LANGUAGE_LABELS: Record<ExamLanguage, { de: string; en: string }> = {
  en: { de: 'Englisch', en: 'English' },
  ja: { de: 'Japanisch', en: 'Japanese' },
  pt: { de: 'Portugiesisch', en: 'Portuguese' },
  es: { de: 'Spanisch', en: 'Spanish' },
  th: { de: 'Thailändisch', en: 'Thai' },
}

const EXAM_DATE_PRESET_DAYS = [30, 60, 90] as const

const WIZARD_FIELDS: readonly LearningPlanField[] = ['examDateIso', 'examLanguage', 'weeklyHours', 'learningDays', 'bufferDays']

const STEPPER_FIELD_CONFIG: Record<'weeklyHours' | 'learningDays' | 'bufferDays', {
  min: number
  max: number
  step: number
  unitKey: 'hoursShort' | 'daysShort' | 'bufferShort'
}> = {
  weeklyHours: { min: 0.5, max: 80, step: 0.5, unitKey: 'hoursShort' },
  learningDays: { min: 1, max: 7, step: 1, unitKey: 'daysShort' },
  bufferDays: { min: 0, max: 60, step: 1, unitKey: 'bufferShort' },
}

/** Lokales Kalenderdatum in N Tagen als YYYY-MM-DD (bewusst lokale
 *  Tagesarithmetik, konsistent mit parseLocalExamDate). */
function isoDateInDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
    return 'border-black bg-[#FFD93D] text-black'
  }
  if (pacing.reason === 'on-track') {
    return 'border-black bg-[#C4B5FD] text-black'
  }
  return 'border-black bg-white text-black'
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
  const formId = useId()
  const dateInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
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

  // Erst-Setup (noch kein gespeicherter Plan): minimalistischer Ein-Feld-pro-
  // Screen-Wizard. Sobald ein Plan existiert, bleibt es beim kompakten
  // Formular — sonst müsste man sich für eine einzelne Änderung erneut durch
  // alle Schritte klicken.
  const useWizard = !configured
  const [wizardStep, setWizardStep] = useState(0)
  const [wizardDirection, setWizardDirection] = useState(1)
  const advanceTimerRef = useRef<number | null>(null)
  const currentField: LearningPlanField | null = useWizard && wizardStep < WIZARD_FIELDS.length
    ? WIZARD_FIELDS[wizardStep]
    : null

  useEffect(() => {
    if (open) {
      setWizardStep(0)
      setWizardDirection(1)
    }
  }, [open])

  useEffect(() => () => {
    if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current)
  }, [])

  const goToStep = (next: number) => {
    const clamped = Math.max(0, Math.min(WIZARD_FIELDS.length, next))
    setWizardDirection(clamped >= wizardStep ? 1 : -1)
    setWizardStep(clamped)
  }
  const goNext = () => goToStep(wizardStep + 1)
  const goPrev = () => {
    if (wizardStep === 0) {
      requestClose()
      return
    }
    goToStep(wizardStep - 1)
  }
  // Diskrete Auswahl (Sprache, Termin-Preset) fühlt sich wie Typeform an: kurz
  // sichtbar markieren, dann automatisch weiter — kein Doppelklick auf "Weiter".
  const scheduleAutoAdvance = () => {
    if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = window.setTimeout(() => {
      advanceTimerRef.current = null
      goNext()
    }, 220)
  }
  const handleWizardSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!normalized) return
    if (currentField) {
      goNext()
      return
    }
    if (dirty && !saving) onSave()
  }

  useEffect(() => {
    if (configured) setSummaryCollapsed(true)
  }, [collapseSignal, configured])

  useEffect(() => {
    if (!open) return
    const activeElement = document.activeElement
    returnFocusRef.current = activeElement instanceof HTMLElement && activeElement !== document.body
      ? activeElement
      : document.querySelector<HTMLElement>('[data-testid="learning-plan-edit"]')
    // Auf Handys soll sich das native Datums-Picker/Keyboard nicht ungefragt
    // öffnen. Desktop bekommt weiterhin einen sinnvollen Startfokus.
    const focusTimer = window.setTimeout(() => {
      if (window.matchMedia('(min-width: 640px)').matches) {
        dateInputRef.current?.focus({ preventScroll: true })
      }
    }, 180)
    return () => {
      window.clearTimeout(focusTimer)
      const returnTarget = returnFocusRef.current
      window.setTimeout(() => {
        if (returnTarget?.isConnected) returnTarget.focus({ preventScroll: true })
      }, 0)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setConfirmDiscard(false)
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (dirty) setConfirmDiscard(true)
        else onClose()
        return
      }
      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = [...dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )].filter(element => element.getClientRects().length > 0)
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus({ preventScroll: true })
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault()
        last.focus({ preventScroll: true })
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault()
        first.focus({ preventScroll: true })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
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
        <div className="font-sans text-[10px] font-black uppercase tracking-[0.12em] text-black">
          {copy.workloadTitle}
        </div>
        <div className="mt-1 font-mono text-[9px] leading-relaxed text-ds-muted">
          {copy.workloadSource}
        </div>
        <div className="mt-1.5 grid gap-1 font-mono text-[10px] leading-relaxed text-ds-muted">
          <span>{copy.courseWork(workload.remainingCourseUnitCount, formatDuration(workload.remainingCourseMinutes, language))}</span>
          <span>{copy.labWork(workload.remainingLabUnitCount, formatDuration(workload.remainingLabMinutes, language))}</span>
          {workload.estimatedScheduledReviewMinutes === null
            ? <span className="font-bold text-black">{copy.reviewTimingMissing(workload.scheduledReviewCardCount)}</span>
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
            <span className="font-bold text-black">{copy.futureReviewsOpen(workload.unintroducedCardCount)}</span>
          )}
          {workload.missingEstimateUnitIds.length > 0 && (
            <span className="font-bold text-black">{copy.missingUnitEstimates(workload.missingEstimateUnitIds.length)}</span>
          )}
          {workload.reserveMinutes !== null && (
            <span>{copy.reserveWork(workload.reservePercent, formatDuration(workload.reserveMinutes, language))}</span>
          )}
          {workload.totalMinutes === null ? (
            <>
              {workload.minimumTotalMinutes !== null && (
                <span className="font-semibold text-ds-fg">{copy.minimumWork(formatDuration(workload.minimumTotalMinutes, language))}</span>
              )}
              <span className="font-bold text-black">{copy.totalWorkOpen}</span>
            </>
          ) : (
            <span className="font-semibold text-ds-fg">{copy.totalWork(formatDuration(workload.totalMinutes, language))}</span>
          )}
        </div>
      </div>
    )
  }

  const summaryRowLabel = (field: LearningPlanField): string => {
    if (field === 'examDateIso') return copy.examDate
    if (field === 'examLanguage') return copy.language
    if (field === 'weeklyHours') return copy.weeklyHours
    if (field === 'learningDays') return copy.learningDays
    return copy.bufferDays
  }

  const summaryRowValue = (field: LearningPlanField): string => {
    if (field === 'examDateIso') return formatExamDate(values.examDateIso, language)
    if (field === 'examLanguage') {
      const code = EXAM_LANGUAGES.includes(values.examLanguage as ExamLanguage) ? values.examLanguage as ExamLanguage : 'en'
      return LANGUAGE_LABELS[code][language]
    }
    if (field === 'weeklyHours') return `${values.weeklyHours} ${copy.hoursShort}`
    if (field === 'learningDays') return `${values.learningDays} ${copy.daysShort}`
    return `${values.bufferDays} ${copy.bufferShort}`
  }

  const renderWizardSummary = () => (
    <div className="flex flex-col gap-4">
      <h3 className="text-center font-sans text-[20px] font-semibold leading-snug text-ds-fg sm:text-[22px]">
        {copy.wizard.summaryTitle}
      </h3>
      <div className="grid gap-1 rounded-ds border border-ds-border bg-ds-card p-1.5" data-testid="learning-plan-wizard-summary">
        {WIZARD_FIELDS.map((field, index) => (
          <button
            key={field}
            type="button"
            onClick={() => goToStep(index)}
            className="flex min-h-11 items-center justify-between gap-3 rounded-ds px-2.5 py-2 text-left transition hover:bg-ds-floor"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ds-muted">{summaryRowLabel(field)}</span>
            <span className="flex items-center gap-1.5 font-sans text-[13px] font-semibold text-ds-fg">
              {summaryRowValue(field)}
              <Pencil size={12} strokeWidth={1.75} className="shrink-0 text-ds-muted" />
            </span>
          </button>
        ))}
      </div>
      <div className={`flex items-start gap-2 rounded-ds border px-3 py-3 font-mono text-[11px] leading-relaxed ${pacingTone(previewPacing)}`}>
        <Clock3 size={15} strokeWidth={1.75} className="mt-0.5 shrink-0" />
        <span>{pacingLabel(previewPacing)}</span>
      </div>
      {workloadDetails(previewPacing)}
      {saveError && (
        <p className="border-2 border-black bg-[#FF6B6B] px-3 py-2.5 font-sans text-[11px] font-bold leading-relaxed text-black" role="alert" aria-live="assertive">
          {saveError}
        </p>
      )}
    </div>
  )

  const renderWizardStep = () => {
    if (!currentField) return renderWizardSummary()
    return (
      <div className="flex flex-col items-center gap-6 py-2 text-center" data-testid={`learning-plan-wizard-step-${currentField}`}>
        <h3 className="font-sans text-[20px] font-semibold leading-snug text-ds-fg sm:text-[22px]">
          {copy.wizard.stepTitles[currentField]}
        </h3>

        {currentField === 'examDateIso' && (
          <div className="w-full max-w-xs">
            <div className="transition-transform duration-200 ease-out focus-within:scale-[1.04]">
              <input
                ref={dateInputRef}
                type="date"
                value={values.examDateIso}
                onChange={event => onChange('examDateIso', event.target.value)}
                className="min-h-14 w-full rounded-ds border border-ds-border bg-ds-card px-4 text-center font-sans text-[20px] text-ds-fg [color-scheme:dark]"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              {EXAM_DATE_PRESET_DAYS.map(days => (
                <button
                  key={days}
                  type="button"
                  onClick={() => {
                    onChange('examDateIso', isoDateInDays(days))
                    scheduleAutoAdvance()
                  }}
                  className="min-h-9 rounded-full border border-ds-border bg-ds-card px-3 font-mono text-[12px] text-ds-muted transition hover:border-[--brand-primary-50] hover:text-ds-fg active:scale-[0.98]"
                >
                  {copy.examDatePreset(days)}
                </button>
              ))}
            </div>
          </div>
        )}

        {currentField === 'examLanguage' && (
          <div className="grid w-full max-w-xs gap-2">
            {EXAM_LANGUAGES.map(code => {
              const active = values.examLanguage === code
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    onChange('examLanguage', code)
                    scheduleAutoAdvance()
                  }}
                  className={`flex min-h-14 items-center justify-between rounded-ds border px-4 font-sans text-[15px] transition-transform duration-200 ease-out ${
                    active
                      ? 'scale-[1.03] border-black bg-[#FFD93D] text-black'
                      : 'border-ds-border bg-ds-card text-ds-fg hover:border-ds-border-hover'
                  }`}
                >
                  <span>{LANGUAGE_LABELS[code][language]}</span>
                  {active && <Check size={16} strokeWidth={2} />}
                </button>
              )
            })}
          </div>
        )}

        {(currentField === 'weeklyHours' || currentField === 'learningDays' || currentField === 'bufferDays') && (() => {
          const config = STEPPER_FIELD_CONFIG[currentField]
          const field = currentField
          const raw = values[field]
          const numeric = Number(raw)
          const base = Number.isFinite(numeric) ? numeric : config.min
          const step = (delta: number) => {
            const next = Math.min(config.max, Math.max(config.min, base + delta))
            onChange(field, config.step < 1 ? String(Math.round(next * 10) / 10) : String(Math.round(next)))
          }
          return (
            <div className="flex flex-col items-center gap-2">
              <div className="flex w-full max-w-xs items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => step(-config.step)}
                  aria-label="−"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ds-border bg-ds-card text-ds-fg transition hover:border-[--brand-primary-50] active:scale-[0.95]"
                >
                  <Minus size={18} strokeWidth={2} />
                </button>
                <div className="transition-transform duration-200 ease-out focus-within:scale-[1.05]">
                  <input
                    type="number"
                    inputMode={config.step < 1 ? 'decimal' : 'numeric'}
                    min={config.min}
                    max={config.max}
                    step={config.step}
                    value={raw}
                    onChange={event => onChange(field, event.target.value)}
                    className="h-16 w-28 rounded-ds border border-ds-border bg-ds-card text-center font-sans text-[32px] tabular-nums text-ds-fg"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => step(config.step)}
                  aria-label="+"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ds-border bg-ds-card text-ds-fg transition hover:border-[--brand-primary-50] active:scale-[0.95]"
                >
                  <Plus size={18} strokeWidth={2} />
                </button>
              </div>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ds-muted">{copy[config.unitKey]}</span>
            </div>
          )
        })()}

        {!normalized && (
          <p className="border-2 border-black bg-[#FFD93D] px-3 py-2.5 font-sans text-[11px] font-bold leading-relaxed text-black" role="alert">
            {copy.invalid}
          </p>
        )}
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
                <span id={`${titleId}-summary`} className="font-sans text-[11px] font-black uppercase tracking-[0.14em] text-black">
                  {copy.title}
                </span>
                <span className="rounded-full border border-ds-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-ds-muted">
                  {copy.draft}
                </span>
              </span>
              <span className="mt-1 flex min-w-0 items-center gap-2 text-ds-fg">
                <CalendarDays size={16} strokeWidth={2.5} className="shrink-0 text-black" />
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
                <Layers3 size={14} strokeWidth={2.5} className="shrink-0 text-black" />
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
                className="h-full rounded-full bg-black transition-[width] duration-300"
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

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <div
              className={`learning-plan-neo fixed left-0 right-0 ${UI_TOKENS.zIndex.splash} flex items-end justify-center px-safe pt-safe-2 sm:items-center sm:p-4`}
              style={viewport
                ? { top: `${viewport.top}px`, height: `${viewport.height}px` }
                : { top: 0, height: '100dvh' }}
            >
              <motion.div
                className="absolute inset-0 bg-black/75"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={requestClose}
                aria-hidden="true"
              />
              <motion.div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                data-testid="learning-plan-editor"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative flex max-h-full w-full flex-col overflow-hidden rounded-t-ds-sheet border-4 border-b-0 border-black bg-ds-bg shadow-modal sm:max-h-[min(760px,calc(100dvh-2rem))] sm:max-w-2xl sm:rounded-ds-xl sm:border-b-4"
              >
                <div className="shrink-0 border-b-4 border-black bg-[#FFD93D] px-4 pb-3 pt-3 sm:px-5 sm:py-4">
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ds-border-hover sm:hidden" aria-hidden="true" />
                  {useWizard ? (
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={goPrev}
                      aria-label={copy.wizard.back}
                      className={`ds-icon-button flex h-9 w-9 shrink-0 ${wizardStep === 0 ? 'invisible' : ''}`}
                    >
                      <ArrowLeft size={16} strokeWidth={1.75} />
                    </button>
                    <h2 id={titleId} className="sr-only">
                      {currentField ? copy.wizard.stepTitles[currentField] : copy.wizard.summaryTitle}
                    </h2>
                    <div className="flex items-center gap-1.5" aria-hidden="true">
                      {WIZARD_FIELDS.map((_, index) => (
                        <span
                          key={index}
                          className={`h-1.5 rounded-full transition-all ${
                            index === wizardStep
                              ? 'w-5 bg-[--brand-primary]'
                              : index < wizardStep || currentField === null
                                ? 'w-1.5 bg-[--brand-primary-50]'
                                : 'w-1.5 bg-ds-border-hover'
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={requestClose}
                      aria-label={copy.close}
                      className="ds-icon-button flex h-9 w-9 shrink-0"
                    >
                      <X size={16} strokeWidth={1.75} />
                    </button>
                  </div>
                  ) : (
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
                  )}
                </div>

                {useWizard ? (
                <form
                  id={formId}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-8 sm:px-8 sm:py-10"
                  data-study-scroll="allow"
                  onSubmit={handleWizardSubmit}
                >
                  <motion.div
                    key={wizardStep}
                    initial={{ opacity: 0, x: wizardDirection >= 0 ? 24 : -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    {renderWizardStep()}
                  </motion.div>
                </form>
                ) : (
                <form
                  id={formId}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5"
                  data-study-scroll="allow"
                  onSubmit={event => {
                    event.preventDefault()
                    if (normalized && dirty && !saving) onSave()
                  }}
                >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="col-span-2 grid gap-1.5 sm:col-span-2">
                    <label className="grid gap-1.5 font-mono text-[11px] text-ds-muted">
                      {copy.examDate}
                      <input
                        ref={dateInputRef}
                        type="date"
                        value={values.examDateIso}
                        onChange={event => onChange('examDateIso', event.target.value)}
                        className="min-h-11 w-full rounded-ds border border-ds-border bg-ds-card px-3 font-sans text-[16px] text-ds-fg [color-scheme:dark]"
                      />
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {EXAM_DATE_PRESET_DAYS.map(days => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => onChange('examDateIso', isoDateInDays(days))}
                          className="min-h-8 rounded-full border border-ds-border bg-ds-card px-2.5 font-mono text-[11px] text-ds-muted transition hover:border-[--brand-primary-50] hover:text-ds-fg active:scale-[0.98]"
                        >
                          {copy.examDatePreset(days)}
                        </button>
                      ))}
                    </div>
                  </div>
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
                  <p className="mt-3 border-2 border-black bg-[#FFD93D] px-3 py-2.5 font-sans text-[11px] font-bold leading-relaxed text-black" role="alert">
                    {copy.invalid}
                  </p>
                )}

                <div className={`mt-4 flex items-start gap-2 rounded-ds border px-3 py-3 font-mono text-[11px] leading-relaxed ${pacingTone(previewPacing)}`}>
                  <Clock3 size={15} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                  <span>{pacingLabel(previewPacing)}</span>
                </div>
                {workloadDetails(previewPacing)}

                {saveError && (
                  <p className="mt-3 border-2 border-black bg-[#FF6B6B] px-3 py-2.5 font-sans text-[11px] font-bold leading-relaxed text-black" role="alert" aria-live="assertive">
                    {saveError}
                  </p>
                )}
                </form>
                )}

                {confirmDiscard ? (
                <div className={`shrink-0 border-t-4 border-black bg-[#FFD93D] px-4 pt-3 sm:px-5 sm:pb-4 ${keyboardOpen ? 'pb-3' : 'pb-safe-4'}`}>
                  <div className="font-sans text-[14px] font-black text-black">{copy.discardTitle}</div>
                  <div className="mt-0.5 font-sans text-[11px] font-bold text-black">{copy.discardText}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setConfirmDiscard(false)} className="min-h-12 border-2 border-black bg-white px-3 text-[14px] font-bold text-black shadow-[3px_3px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none">
                      {copy.keepEditing}
                    </button>
                    <button type="button" onClick={onClose} className="min-h-12 border-2 border-black bg-[#FF6B6B] px-3 text-[14px] font-bold text-black shadow-[3px_3px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none">
                      {copy.discard}
                    </button>
                  </div>
                </div>
              ) : useWizard ? (
                <div className={`grid shrink-0 grid-cols-2 gap-2 border-t-4 border-black bg-[#FFFDF5] px-4 pt-3 sm:px-5 sm:pb-4 ${keyboardOpen ? 'pb-3' : 'pb-safe-4'}`}>
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={saving}
                    data-testid="learning-plan-wizard-back"
                    className="min-h-12 border-2 border-black bg-white px-3 font-sans text-[14px] font-bold text-black shadow-[3px_3px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50"
                  >
                    {wizardStep === 0 ? copy.cancel : copy.wizard.back}
                  </button>
                  <button
                    type="submit"
                    form={formId}
                    disabled={currentField ? !normalized : (!normalized || !dirty || saving)}
                    className="min-h-12 border-2 border-black bg-[--brand-primary] px-3 font-sans text-[14px] font-bold text-black shadow-[3px_3px_0_0_#000] transition active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-45"
                    data-testid={currentField ? 'learning-plan-wizard-next' : 'learning-plan-save'}
                  >
                    {currentField ? copy.wizard.next : (saving ? copy.saving : copy.save)}
                  </button>
                </div>
              ) : (
                <div className={`grid shrink-0 grid-cols-2 gap-2 border-t-4 border-black bg-[#FFFDF5] px-4 pt-3 sm:px-5 sm:pb-4 ${keyboardOpen ? 'pb-3' : 'pb-safe-4'}`}>
                  <button type="button" onClick={requestClose} disabled={saving} className="min-h-12 border-2 border-black bg-white px-3 font-sans text-[14px] font-bold text-black shadow-[3px_3px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50">
                    {copy.cancel}
                  </button>
                  <button
                    type="submit"
                    form={formId}
                    disabled={!normalized || !dirty || saving}
                    className="min-h-12 border-2 border-black bg-[--brand-primary] px-3 font-sans text-[14px] font-bold text-black shadow-[3px_3px_0_0_#000] transition active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-45"
                    data-testid="learning-plan-save"
                  >
                    {saving ? copy.saving : copy.save}
                  </button>
                </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
