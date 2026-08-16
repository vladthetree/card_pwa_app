/**
 * AI_CONTEXT:
 * Role: Pure card selection and ordering logic for study sessions, including due filtering, learning-step exemption, failure weighting, and seeded ordering.
 * Used by: StudyView, shuffle selection, deck queries, and session tests.
 * Important: This decides what the learner sees next; keep scheduling writes elsewhere and keep ordering deterministic under the same seed.
 */
import type { Card } from '../types'
import { DAY_MS, getDayStartMs, resolveDueAtMs } from './time'
import { compareByDueRank, getCardTypePriority, seededRank } from './cardOrdering'
import { isStudyableCard } from './sm2'

interface SortStudyCardsOptions {
  maxCards?: number
  /** Tagesdosis-Kappe für neue Karten in dieser Auswahl (Infinity = keine).
   *  Fällige/Lern-Karten sind davon unberührt. */
  maxNewCards?: number
  nowMs?: number
  nextDayStartsAt?: number
  runSeed?: string | number
  learnAheadMinutes?: number
}

/** Anki-Standard: Wenn sonst nichts mehr ansteht, dürfen kurze Lernschritte
 * bis zu 20 Minuten vorgezogen werden. */
export const DEFAULT_LEARN_AHEAD_MINUTES = 20

/** Verbleibende Neu-Karten-Dosis für heute (0 in der Einstellung = unbegrenzt). */
export function resolveNewCardAllowance(newCardsPerDay: number, introducedToday: number): number {
  if (!Number.isFinite(newCardsPerDay) || newCardsPerDay <= 0) return Number.POSITIVE_INFINITY
  return Math.max(0, Math.floor(newCardsPerDay) - Math.max(0, introducedToday))
}

export function getCardWeight(card: Card): number {
  const reps = Math.max(0, card.reps || 0)
  const lapses = Math.max(0, card.lapses || 0)
  const incorrectRatio = lapses / Math.max(1, reps)

  // All cards start with the same base weight; repeated failures increase urgency.
  return 1 + lapses * 2.5 + incorrectRatio * 3
}

export function sortStudyCards(cards: Card[], options: SortStudyCardsOptions = {}): Card[] {
  const nowMs = options.nowMs ?? Date.now()
  const nextDayStartsAt = Number.isInteger(options.nextDayStartsAt)
    ? Math.max(0, Math.min(23, Number(options.nextDayStartsAt)))
    : 0
  const todayStartMs = getDayStartMs(nowMs, nextDayStartsAt)
  const tomorrowStartMs = todayStartMs + DAY_MS
  const learnAheadMs = Math.max(0, Math.min(60, options.learnAheadMinutes ?? DEFAULT_LEARN_AHEAD_MINUTES)) * 60_000

  const resolveDueAt = resolveDueAtMs

  const dueCards = cards.filter(card => {
    if (!isStudyableCard(card)) return false
    if (card.type === 'new') return true
    if (card.type === 'learning' || card.type === 'relearning') {
      // Exakte Intraday-Schritte respektieren; nur Ankis 20-Minuten-
      // Learn-ahead-Fenster darf sie in eine jetzt gestartete Session ziehen.
      return resolveDueAt(card) <= nowMs + learnAheadMs
    }
    // review: due today means dueAt before tomorrow 00:00 local
    return resolveDueAt(card) < tomorrowStartMs
  })

  const maxCards = Number.isFinite(options.maxCards)
    ? Math.max(1, Math.floor(options.maxCards as number))
    : dueCards.length

  const useFreshRunOrder = options.runSeed !== undefined

  const compareCards = (a: Card, b: Card): number => {
    const aIsLearnAhead = (a.type === 'learning' || a.type === 'relearning') && resolveDueAt(a) > nowMs
    const bIsLearnAhead = (b.type === 'learning' || b.type === 'relearning') && resolveDueAt(b) > nowMs
    if (aIsLearnAhead !== bIsLearnAhead) return aIsLearnAhead ? 1 : -1

    const dueRankDiff = compareByDueRank(a, b, nowMs)
    if (dueRankDiff !== 0) return dueRankDiff

    const typeDiff = getCardTypePriority(a.type) - getCardTypePriority(b.type)
    if (typeDiff !== 0) return typeDiff

    // Earlier due cards first inside same type. For fresh runs, keep exact
    // timing for learning/relearning steps but vary review/new cards so aborting
    // and starting again does not recreate the same batch.
    const keepExactDueOrder = !useFreshRunOrder || a.type === 'learning' || a.type === 'relearning' || b.type === 'learning' || b.type === 'relearning'
    if (keepExactDueOrder) {
      const dueDiff = resolveDueAt(a) - resolveDueAt(b)
      if (dueDiff !== 0) return dueDiff
    }

    // For equal due cards, prioritize cards with higher failure pressure.
    const weightDiff = getCardWeight(b) - getCardWeight(a)
    if (weightDiff !== 0) return weightDiff

    if (useFreshRunOrder) {
      const seedDiff = seededRank(options.runSeed as string | number, a) - seededRank(options.runSeed as string | number, b)
      if (seedDiff !== 0) return seedDiff
    }

    return a.id.localeCompare(b.id)
  }

  // Learning and relearning are limit-exempt: they must complete their intraday
  // steps regardless of the session cap to avoid breaking spaced-repetition intervals.
  const exemptCards = dueCards.filter(c => c.type === 'learning' || c.type === 'relearning')
  const limitedCards = dueCards.filter(c => c.type !== 'learning' && c.type !== 'relearning')

  const maxNewCards = Number.isFinite(options.maxNewCards)
    ? Math.max(0, Math.floor(options.maxNewCards as number))
    : Number.POSITIVE_INFINITY

  const sortedLimited = [...limitedCards].sort(compareCards)
  const cappedLimited: Card[] = []
  let newTaken = 0
  for (const card of sortedLimited) {
    if (cappedLimited.length >= maxCards) break
    if (card.type === 'new') {
      if (newTaken >= maxNewCards) continue
      newTaken += 1
    }
    cappedLimited.push(card)
  }

  return [...exemptCards, ...cappedLimited].sort(compareCards)
}

/**
 * Round-Robin über die Ursprungs-Decks einer bereits sortierten Auswahl:
 * WELCHE Karten in der Session landen, entscheidet weiterhin sortStudyCards
 * (Fälligkeit/Priorität) — hier wird nur die REIHENFOLGE innerhalb der Auswahl
 * gemischt, damit in Misch-Sessions (Daily Quest) kein Deck einen Block bildet
 * (Interleaving-Effekt). Stabil: Reihenfolge innerhalb eines Decks bleibt,
 * Deck-Rotation folgt dem ersten Auftreten. Karten ohne deckId zählen als
 * ein gemeinsames Pseudo-Deck.
 */
export function interleaveCardsByDeck(cards: Card[]): Card[] {
  const queues = new Map<string, Card[]>()
  for (const card of cards) {
    const key = card.deckId ?? ''
    const queue = queues.get(key)
    if (queue) queue.push(card)
    else queues.set(key, [card])
  }
  if (queues.size <= 1) return cards

  const deckQueues = [...queues.values()]
  const result: Card[] = []
  while (result.length < cards.length) {
    for (const queue of deckQueues) {
      const next = queue.shift()
      if (next) result.push(next)
    }
  }
  return result
}

export interface DailyQuestSelectionOptions {
  maxCards: number
  nextDayStartsAt?: number
  learnAheadMinutes?: number
  nowMs?: number
  runSeed?: string | number
  /** Karten des aktuell laufenden Lernpakets bleiben aus der Daily Quest. */
  excludeCardIds?: readonly string[]
}

/**
 * Baut die eigenstaendige Daily-Quest-Auswahl:
 *
 * 1. jetzt faellige Reviews/Lernschritte,
 * 2. spaeter am Lerntag faellige Schritte,
 * 3. neue Karten zum Auffuellen.
 *
 * Innerhalb jeder Prioritaetsstufe sorgt ein frischer Seed fuer Abwechslung;
 * Round-Robin ueber die Ursprungsdecks verhindert Deck-Bloecke. Anders als
 * normale Sessions hat die Quest ihre eigene, exakte Groesse und kein
 * `newCardsPerDay`-Budget. Nur ein zu kleiner verfuegbarer Pool darf sie kuerzen.
 */
export function buildDailyQuestSelection(
  cards: Card[],
  options: DailyQuestSelectionOptions,
): Card[] {
  const maxCards = Number.isFinite(options.maxCards)
    ? Math.max(1, Math.floor(options.maxCards))
    : 1
  const nowMs = options.nowMs ?? Date.now()
  const excluded = new Set(options.excludeCardIds ?? [])
  const available = cards.filter(card => !excluded.has(card.id))
  if (available.length === 0) return []

  // sortStudyCards filtert Zukunftskarten aus und behaelt die Scheduler-
  // Prioritaeten. Das eigentliche Quest-Limit wird erst nach den Stufen gesetzt,
  // damit Learning-Karten die gewuenschte Quest-Groesse nicht ueberschreiten.
  const ordered = sortStudyCards(available, {
    maxCards: available.length,
    maxNewCards: Number.POSITIVE_INFINITY,
    nowMs,
    nextDayStartsAt: options.nextDayStartsAt,
    learnAheadMinutes: options.learnAheadMinutes,
    runSeed: options.runSeed,
  })

  const dueNow: Card[] = []
  const dueLaterToday: Card[] = []
  const newCards: Card[] = []
  for (const card of ordered) {
    if (card.type === 'new') newCards.push(card)
    else if (resolveDueAtMs(card) <= nowMs) dueNow.push(card)
    else dueLaterToday.push(card)
  }

  return [
    ...interleaveCardsByDeck(dueNow),
    ...interleaveCardsByDeck(dueLaterToday),
    ...interleaveCardsByDeck(newCards),
  ].slice(0, maxCards)
}

export interface StudySessionSelectionOptions {
  sessionId: string
  maxCards: number
  nextDayStartsAt?: number
  learnAheadMinutes?: number
  runSeed?: string | number
}

export const MIN_RANDOM_SESSION_TARGET_RATIO = 0.8

/**
 * Chooses one workload target for a genuinely new session. The configured
 * limit remains the hard maximum; persistence stores the result so reloads
 * and resumes never reroll the learner's workload.
 */
export function chooseRandomSessionCardTarget(
  configuredLimit: unknown,
  rng: () => number = Math.random,
): number {
  const parsedLimit = Number(configuredLimit)
  if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) return 0
  const maximum = Math.max(1, Math.floor(parsedLimit))
  const minimum = Math.max(1, Math.ceil(maximum * MIN_RANDOM_SESSION_TARGET_RATIO))
  const sample = Math.min(0.999999999999, Math.max(0, Number(rng()) || 0))
  return minimum + Math.floor(sample * (maximum - minimum + 1))
}

export function hasFixedStudySessionSize(sessionId: string): boolean {
  return sessionId === 'daily-quest' || sessionId.startsWith('today-package:')
}

/**
 * Letzte defensive Schranke fuer normale Decks. Der uebergebene Wert ist immer
 * der aktuelle Reglerwert aus `settings.studyCardLimit`; kleinere Kartenpools
 * bleiben unveraendert, groessere werden exakt daran gekappt. Ein ungueltiger
 * Wert startet aus Sicherheitsgruenden keine unlimitierte Session.
 */
export function enforceDailyDeckCardLimit(
  cards: Card[],
  configuredDeckLimit: unknown,
): Card[] {
  const parsedLimit = Number(configuredDeckLimit)
  if (!Number.isFinite(parsedLimit)) return []
  return cards.filter(isStudyableCard).slice(0, Math.max(0, Math.floor(parsedLimit)))
}

/**
 * Letzte Auswahlgrenze vor dem Mount einer StudyView-Session. Die Daily Quest
 * ist bereits vollstaendig ausgewaehlt und bleibt deshalb unveraendert. Dasselbe
 * gilt fuer ein fest zusammengestelltes Heute-Paket. Normale Deck-Sessions
 * folgen allein dem konfigurierten Deck-Limit.
 */
export function buildStudySessionSelection(
  cards: Card[],
  options: StudySessionSelectionOptions,
): Card[] {
  if (hasFixedStudySessionSize(options.sessionId)) {
    return cards.filter(isStudyableCard)
  }
  const configuredDeckLimit = Number(options.maxCards)
  if (!Number.isFinite(configuredDeckLimit) || configuredDeckLimit <= 0) return []
  const ordered = sortStudyCards(cards, {
    maxCards: configuredDeckLimit,
    maxNewCards: Number.POSITIVE_INFINITY,
    nextDayStartsAt: options.nextDayStartsAt,
    learnAheadMinutes: options.learnAheadMinutes,
    runSeed: options.runSeed,
  })
  // sortStudyCards darf Lernschritte allgemein ueber sein internes Limit hinaus
  // aufnehmen. Bei normalen Decks ist der Regler jedoch die exakte Obergrenze
  // fuer die gesamte gestartete Session, unabhaengig vom Kartentyp.
  return enforceDailyDeckCardLimit(ordered, configuredDeckLimit)
}

/** Feste Kartenauswahl fuer ein Heute-Paket. 0 bedeutet unbegrenzt. Das
 * Paket-Limit ist absichtlich ein eigener Wert und kennt das Deck-Limit nicht. */
export function buildTodayPackageSelection(
  cards: Card[],
  packageCardLimit: number,
  options: Pick<SortStudyCardsOptions, 'nextDayStartsAt' | 'nowMs' | 'learnAheadMinutes' | 'runSeed'> = {},
): Card[] {
  const normalizedLimit = Number.isFinite(packageCardLimit)
    ? Math.max(0, Math.floor(packageCardLimit))
    : 0
  const ordered = sortStudyCards(cards, {
    ...options,
    maxCards: normalizedLimit === 0 ? Number.POSITIVE_INFINITY : normalizedLimit,
    maxNewCards: Number.POSITIVE_INFINITY,
  })
  return normalizedLimit === 0 ? ordered : ordered.slice(0, normalizedLimit)
}
