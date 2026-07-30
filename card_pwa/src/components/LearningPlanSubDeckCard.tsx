/**
 * AI_CONTEXT:
 * Role: Presentation-only learning-plan projection for real SY0-701 subdecks
 *       and Card.id references from the real acronym deck.
 * Important: The green/orange state is local to this view. Study actions pass
 *            canonical Card.ids into the normal StudyView/review pipeline.
 */
import { useEffect, useRef } from 'react'
import { Info, Play, X } from 'lucide-react'
import {
  SY0701_ACRONYM_DECK_NAME,
} from '../data/sy0701LearningPlanAcronymMap'
import type {
  LearningPlanAcronymCardMapping,
  LearningPlanSubDeckReadModel,
} from '../utils/learningPlanMapping'

const COPY = {
  de: {
    type: 'Sub-Deck',
    cards: (count: number) => `${count} Karten`,
    availability: (installed: number, mapped: number) => `${installed}/${mapped} installiert`,
    noRatings: 'Noch keine Bewertungen',
    successRate: (rate: number, total: number) => `${rate} % Erfolgsrate · ${total} Bewertungen`,
    threshold: 'Im Lernplan erfüllt ab 90 % Erfolgsrate',
    status: {
      open: 'Offen',
      inProgress: 'In Bearbeitung',
      fulfilled: 'Erfüllt',
    },
    open: (name: string) => `Sub-Deck ${name} öffnen`,
    info: (name: string) => `Information zum Lernplanstatus von ${name}`,
    dialogTitle: 'Sub-Deck im Lernplan',
    criterion: 'Abschlusskriterium',
    criterionValue: 'Mindestens 90 % kanonische Erfolgsrate und mindestens eine Bewertung.',
    currentRate: 'Aktuelle Erfolgsrate',
    currentStatus: 'Lernplanstatus',
    source: 'Der Wert stammt aus allen Reviews der echten Karten-IDs. Der Deckstatus und der Scheduler werden dadurch nicht verändert.',
    missing: 'Fehlende gemappte Karten verhindern den Status „Erfüllt“.',
    close: 'Dialog schließen',
    acronymTitle: 'Acronym-Karten',
    acronymHint: `Einzelne Referenzen aus „${SY0701_ACRONYM_DECK_NAME}“ · Fortschritt bleibt an der echten Card-ID.`,
    reviewed: 'Bewertet',
    unreviewed: 'Offen',
    unavailable: 'Nicht installiert',
    studyAcronym: (label: string) => `${label} als echte Karte lernen`,
  },
  en: {
    type: 'Sub-deck',
    cards: (count: number) => `${count} cards`,
    availability: (installed: number, mapped: number) => `${installed}/${mapped} installed`,
    noRatings: 'No ratings yet',
    successRate: (rate: number, total: number) => `${rate}% success rate · ${total} ratings`,
    threshold: 'Completed in the learning plan at a 90% success rate',
    status: {
      open: 'Open',
      inProgress: 'In progress',
      fulfilled: 'Completed',
    },
    open: (name: string) => `Open sub-deck ${name}`,
    info: (name: string) => `Learning-plan status information for ${name}`,
    dialogTitle: 'Sub-deck in the learning plan',
    criterion: 'Completion criterion',
    criterionValue: 'At least a 90% canonical success rate and at least one rating.',
    currentRate: 'Current success rate',
    currentStatus: 'Learning-plan status',
    source: 'The value comes from all reviews of the real card IDs. It does not change deck status or scheduling.',
    missing: 'Missing mapped cards prevent the “Completed” status.',
    close: 'Close dialog',
    acronymTitle: 'Acronym cards',
    acronymHint: `Individual references from “${SY0701_ACRONYM_DECK_NAME}” · progress stays on the real Card.id.`,
    reviewed: 'Rated',
    unreviewed: 'Open',
    unavailable: 'Not installed',
    studyAcronym: (label: string) => `Study ${label} as the real card`,
  },
} as const

interface SubDeckCardProps {
  language: 'de' | 'en'
  deck: LearningPlanSubDeckReadModel
  onStudy: (deck: LearningPlanSubDeckReadModel) => void
  onOpenInfo: (deck: LearningPlanSubDeckReadModel) => void
}

export function LearningPlanSubDeckCard({
  language,
  deck,
  onStudy,
  onOpenInfo,
}: SubDeckCardProps) {
  const copy = COPY[language]
  const rateLabel = deck.successRate.total === 0
    ? copy.noRatings
    : copy.successRate(deck.successRate.rate, deck.successRate.total)
  const tone = deck.status === 'fulfilled'
    ? 'bg-[#86EFAC]'
    : deck.status === 'inProgress'
      ? 'bg-[#FDBA74]'
      : 'neo-learning-hover-yellow bg-white'

  return (
    <article
      data-testid={`learning-plan-subdeck-${deck.objectiveId}`}
      data-learning-plan-status={deck.status}
      className={`neo-learning-press relative min-w-0 flex-1 text-black ${tone}`}
    >
      <button
        type="button"
        data-testid={`learning-plan-subdeck-open-${deck.objectiveId}`}
        disabled={deck.installedCardIds.length === 0}
        onClick={() => onStudy(deck)}
        aria-label={copy.open(deck.subDeckName)}
        className="grid min-h-14 w-full min-w-0 grid-cols-[auto,minmax(0,1fr)] items-start gap-2.5 px-3 py-3 pr-14 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="border-2 border-black bg-white px-1.5 py-1 font-sans text-[10px] font-black uppercase tracking-[0.06em] text-black">
          {copy.type}
        </span>
        <span className="min-w-0">
          <span className="block break-words font-sans text-[14px] font-black leading-snug">
            {deck.subDeckName}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5 font-sans text-[10px] font-bold">
            <span>{copy.cards(deck.installedCardIds.length)}</span>
            {deck.missingCardIds.length > 0 && (
              <span>{copy.availability(deck.installedCardIds.length, deck.cardIds.length)}</span>
            )}
            <span data-testid={`learning-plan-subdeck-rate-${deck.objectiveId}`}>{rateLabel}</span>
            <span className={`rounded-full border-2 border-black px-2 py-0.5 leading-4 ${
              deck.status === 'fulfilled'
                ? 'bg-[#86EFAC]'
                : deck.status === 'inProgress'
                  ? 'bg-[#FDBA74]'
                  : 'bg-white'
            }`}>
              {copy.status[deck.status]}
            </span>
            <span className="basis-full leading-relaxed">
              {copy.threshold}
            </span>
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onOpenInfo(deck)}
        aria-label={copy.info(deck.subDeckName)}
        title={copy.info(deck.subDeckName)}
        className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center border-2 border-black bg-white text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
      >
        <Info size={16} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </article>
  )
}

interface InfoModalProps {
  language: 'de' | 'en'
  deck: LearningPlanSubDeckReadModel
  onClose: () => void
}

export function LearningPlanSubDeckInfoModal({ language, deck, onClose }: InfoModalProps) {
  const copy = COPY[language]
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    closeRef.current?.focus()
    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onDocumentKeyDown)
    return () => {
      document.removeEventListener('keydown', onDocumentKeyDown)
      previouslyFocused?.focus()
    }
  }, [onClose])

  const keepFocusInDialog = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? [])]
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const rateLabel = deck.successRate.total === 0
    ? copy.noRatings
    : copy.successRate(deck.successRate.rate, deck.successRate.total)

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 px-4 py-6"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="learning-plan-subdeck-dialog-title"
        aria-describedby="learning-plan-subdeck-dialog-description"
        onKeyDown={keepFocusInDialog}
        className="w-full max-w-md border-[3px] border-black bg-[#FFFDF5] p-4 text-black shadow-[6px_6px_0_0_#000]"
      >
        <div className="flex items-start gap-3">
          <Info size={22} strokeWidth={3} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 id="learning-plan-subdeck-dialog-title" className="font-sans text-[18px] font-black uppercase leading-tight">
              {copy.dialogTitle}
            </h2>
            <p className="mt-1 break-words font-sans text-[14px] font-bold leading-snug">
              {deck.subDeckName}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="neo-learning-press flex h-10 w-10 shrink-0 items-center justify-center bg-white"
            aria-label={copy.close}
          >
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        <dl className="mt-4 grid gap-2 font-sans">
          <div className="border-2 border-black bg-white px-3 py-2.5">
            <dt className="text-[10px] font-black uppercase tracking-wide">{copy.criterion}</dt>
            <dd className="mt-1 text-[13px] font-bold leading-relaxed">{copy.criterionValue}</dd>
          </div>
          <div className="border-2 border-black bg-white px-3 py-2.5">
            <dt className="text-[10px] font-black uppercase tracking-wide">{copy.currentRate}</dt>
            <dd className="mt-1 text-[15px] font-black" data-testid="learning-plan-subdeck-dialog-rate">
              {rateLabel}
            </dd>
          </div>
          <div className={`border-2 border-black px-3 py-2.5 ${
            deck.status === 'fulfilled' ? 'bg-[#86EFAC]' : 'bg-[#FDBA74]'
          }`}>
            <dt className="text-[10px] font-black uppercase tracking-wide">{copy.currentStatus}</dt>
            <dd className="mt-1 text-[15px] font-black">{copy.status[deck.status]}</dd>
          </div>
        </dl>

        <p id="learning-plan-subdeck-dialog-description" className="mt-4 font-sans text-[12px] font-bold leading-relaxed">
          {copy.source}
        </p>
        {deck.missingCardIds.length > 0 && (
          <p className="mt-2 font-sans text-[12px] font-black leading-relaxed">{copy.missing}</p>
        )}
      </section>
    </div>
  )
}

interface AcronymReferencesProps {
  language: 'de' | 'en'
  cards: readonly LearningPlanAcronymCardMapping[]
  onStudy: (card: LearningPlanAcronymCardMapping) => void
}

export function LearningPlanAcronymReferences({
  language,
  cards,
  onStudy,
}: AcronymReferencesProps) {
  if (cards.length === 0) return null
  const copy = COPY[language]

  return (
    <section
      data-testid="learning-plan-acronym-references"
      className="border-2 border-black bg-[#C4B5FD] p-3 text-black"
    >
      <h4 className="font-sans text-[13px] font-black uppercase tracking-wide">{copy.acronymTitle}</h4>
      <p className="mt-1 font-sans text-[10px] font-bold leading-relaxed">{copy.acronymHint}</p>
      <ul className="mt-2 grid gap-1.5">
        {cards.map(card => (
          <li
            key={card.cardId}
            data-card-id={card.cardId}
            className="flex min-w-0 items-center gap-2 border-2 border-black bg-white px-2.5 py-2"
          >
            <span className="min-w-0 flex-1">
              <span className="block break-words font-sans text-[12px] font-black">{card.label}</span>
              <span className="block font-sans text-[10px] font-bold">
                {!card.installed ? copy.unavailable : card.reviewed ? copy.reviewed : copy.unreviewed}
              </span>
            </span>
            <button
              type="button"
              disabled={!card.installed}
              onClick={() => onStudy(card)}
              aria-label={copy.studyAcronym(card.label)}
              title={card.rationale}
              className="neo-learning-press flex h-10 w-10 shrink-0 items-center justify-center bg-[#FFD93D] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play size={14} fill="currentColor" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
