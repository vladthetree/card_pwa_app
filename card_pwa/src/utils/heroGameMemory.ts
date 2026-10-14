/**
 * AI_CONTEXT: "Spielgedächtnis" der Heldenwirtschaft — ein deterministischer Replay aller Reviews,
 * getrennt vom echten FSRS-Zustand. Es zählt nur, was Wissen belegt: fällige Abrufe ab 1,0 s;
 * Easy wirkt wie Good; Vorgezogenes/Blindklicks bewegen nichts; neue Karten sind je Lerntag gedeckelt.
 * Warum: In FSRS-6 hebt tägliches Vorziehen die echte Stabilität ohne Wissen — das darf kein Gold
 * und keine Etage kaufen. Reine Funktion (build*), schreibt nie in Dexie/FSRS.
 */
import { createEmptyCard, fsrs, generatorParameters, State, type Card, type Grade } from 'ts-fsrs'
import { getDayStartMs } from './time'
import {
  DEEP_STABILITY,
  MATURE_STABILITY,
  RETRIEVAL_MS,
  type HeroRating,
  type ReviewGoldInput,
} from './heroEconomy'

/** Höchstens so viele neue Karten je Lerntag übernimmt das Spielgedächtnis. */
export const GAME_NEW_CARD_DAILY_CAP = 12
/** Je reifer Karte zählen höchstens so viele pünktliche Folge-Erfolge als "gehalten". */
export const GAME_KEPT_PER_CARD_CAP = 3

export interface GameReviewInput {
  reviewKey: string
  cardId: string
  rating: HeroRating
  timeMs: number
  timestamp: number
}

export interface GameCardSummary {
  cardId: string
  /** Höchste qualifizierende Stabilität; fällt bei späteren Lapses nicht ("Hochwasser"). */
  peakStability: number
  stability: number
  lapses: number
  /** Wie oft ein Lapse wieder auf Reife geheilt wurde. */
  healed: number
  kept: number
}

export interface GameMemoryReplay {
  goldInputs: ReviewGoldInput[]
  cards: Map<string, GameCardSummary>
}

interface GameCardState {
  fsrsCard: Card
  introduced: boolean
  recovering: boolean
  summary: GameCardSummary
}

const scheduler = fsrs(generatorParameters({
  enable_fuzz: false,
  enable_short_term: false,
  learning_steps: [],
  relearning_steps: [],
}))

function toGrade(rating: HeroRating): Grade {
  // Easy überholt Good im Spiel nicht.
  return (rating >= 3 ? 3 : rating) as Grade
}

export function buildGameMemoryReplay(
  reviews: readonly GameReviewInput[],
  nextDayStartsAt = 0,
): GameMemoryReplay {
  const ordered = [...reviews].sort((a, b) => a.timestamp - b.timestamp || a.reviewKey.localeCompare(b.reviewKey))
  const states = new Map<string, GameCardState>()
  const newIntroducedByDay = new Map<number, number>()
  const goldInputs: ReviewGoldInput[] = []

  for (const review of ordered) {
    const dayStart = getDayStartMs(review.timestamp, nextDayStartsAt)
    const dayKey = String(dayStart)
    let state = states.get(review.cardId)
    if (!state) {
      state = {
        fsrsCard: createEmptyCard(new Date(review.timestamp)),
        introduced: false,
        recovering: false,
        summary: { cardId: review.cardId, peakStability: 0, stability: 0, lapses: 0, healed: 0, kept: 0 },
      }
      states.set(review.cardId, state)
    }

    const preStability = state.introduced ? state.fsrsCard.stability : 0
    const preMature = state.introduced && state.fsrsCard.state === State.Review && preStability >= MATURE_STABILITY
    const fastEnough = Number.isFinite(review.timeMs) && review.timeMs >= RETRIEVAL_MS
    const dueDayStart = state.introduced ? getDayStartMs(state.fsrsCard.due.getTime(), nextDayStartsAt) : dayStart
    const wasDue = !state.introduced || dayStart >= dueDayStart

    // Neue Karte: Einführung gedeckelt. Alle anderen: nur fällige, nicht blind geklickte Abrufe.
    let counts = fastEnough && wasDue
    if (counts && !state.introduced) {
      const introducedToday = newIntroducedByDay.get(dayStart) ?? 0
      if (introducedToday >= GAME_NEW_CARD_DAILY_CAP) counts = false
      else newIntroducedByDay.set(dayStart, introducedToday + 1)
    }

    let healedNow = false
    if (counts) {
      const grade = toGrade(review.rating)
      const lapsedBefore = state.fsrsCard.lapses
      const next = scheduler.next(state.fsrsCard, new Date(review.timestamp), grade).card
      state.fsrsCard = next
      state.introduced = true
      state.summary.stability = next.stability
      state.summary.lapses = next.lapses
      if (next.lapses > lapsedBefore) state.recovering = true
      if (next.state === State.Review) {
        state.summary.peakStability = Math.max(state.summary.peakStability, next.stability)
        if (state.recovering && grade >= 3 && next.stability >= MATURE_STABILITY) {
          state.recovering = false
          state.summary.healed += 1
          healedNow = true
        }
      }
      if (preMature && grade >= 3 && state.summary.kept < GAME_KEPT_PER_CARD_CAP) {
        state.summary.kept += 1
      }
    }

    goldInputs.push({
      reviewKey: review.reviewKey,
      cardId: review.cardId,
      dayKey,
      rating: review.rating,
      timeMs: review.timeMs,
      wasDue: counts,
      preGameStability: preStability,
      healedNow,
    })
  }

  const cards = new Map<string, GameCardSummary>()
  for (const [cardId, state] of states) cards.set(cardId, state.summary)
  return { goldInputs, cards }
}

export function isGameMature(summary: Pick<GameCardSummary, 'peakStability'> | undefined): boolean {
  return (summary?.peakStability ?? 0) >= MATURE_STABILITY
}

export function isGameDeep(summary: Pick<GameCardSummary, 'peakStability'> | undefined): boolean {
  return (summary?.peakStability ?? 0) >= DEEP_STABILITY
}
