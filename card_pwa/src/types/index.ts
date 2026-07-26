/**
 * AI_CONTEXT:
 * Role: Public UI/domain TypeScript contracts for cards, decks, stats, gamification, scheduling summaries, views, ratings, and session events.
 * Used by: components, hooks, services, and query mappers across the app.
 * Important: DB record types live in db/index.ts; this file represents app-facing shapes after query mapping.
 */
export interface CardExtra {
  acronym: string
  examples: string
  port: string
  protocol: string
}

export interface Card {
  id: string
  noteId: string
  /** Ursprungs-Deck — für Metriken und Deck-Interleaving in Misch-Sessions. */
  deckId?: string
  type: 'new' | 'learning' | 'review' | 'relearning'
  front: string
  back: string
  extra: CardExtra
  tags: string[]
  sm2Ease?: number
  fsrsDifficulty?: number
  interval: number
  due: number
  dueAt?: number
  learningStep?: number
  lastReviewedAt?: number
  reps: number
  lapses: number
  queue: number
  stability?: number
  difficulty?: number
  algorithm?: 'sm2' | 'fsrs'
}

export interface DeckStats {
  total: number
  new: number
  learning: number
  due: number
}

export interface Deck extends DeckStats {
  id: string
  name: string
  parentDeckId?: string | null
  subDecks?: Deck[]
}

export type ShuffleCollection = import('../db').ShuffleCollectionRecord

export interface DeckDaySchedule {
  total: number
  new: number
  review: number
}

export interface DeckScheduleOverview {
  today: DeckDaySchedule
  tomorrow: DeckDaySchedule
}

export interface GlobalStats {
  total: number
  new: number
  learning: number
  review: number
  nowDue: number
  overdueGt2Days: number
  deckCount: number
  reviewedToday: number
  successfulToday: number
  successToday: number
}

export type GamificationRankTier = 'cadet' | 'pilot' | 'builder' | 'engineer' | 'strategist' | 'architect'

/** Anzeige-Texte kommen aus STRINGS (DE/EN) über die Quest-ID, nicht aus dem Modell. */
export interface GamificationQuest {
  id: string
  progress: number
  target: number
  rewardXp: number
  isComplete: boolean
}

export interface GamificationProfile {
  level: number
  rankTier: GamificationRankTier
  totalXp: number
  currentLevelXp: number
  nextLevelXp: number
  levelProgress: number
  totalReviews: number
  successRate: number
  reviewedToday: number
  successToday: number
  todayXp: number
  currentStreak: number
  longestStreak: number
  streakAtRisk: boolean
  activeCardCount: number
  quests: GamificationQuest[]
}

export type Rating = 1 | 2 | 3 | 4  // Again / Hard / Good / Easy

export interface SessionReviewEvent {
  cardId: string
  rating: Rating
  elapsedMs: number
}

/**
 * Konkrete Antwort einer interaktiven Karte (MC, Drag-Match, Reihenfolge,
 * Zuordnung): was der Nutzer gewählt hat und was richtig gewesen wäre —
 * für richtige wie falsche Antworten identisch aufgebaut. Karten ohne
 * Auswahl (klassisches Umdrehen, Free Recall) haben keine Details.
 */
export interface ReviewAnswerDetails {
  /** Vom Nutzer gewählte Antwort (kanonischer Options-Schlüssel + Text bzw.
   *  serialisierte Reihenfolge/Zuordnung). */
  selected: string
  /** Die korrekte Antwort in derselben Darstellung. */
  correct: string
  /** true = Antwort war richtig. */
  wasCorrect: boolean
}

/** Callback der Kartenkomponenten nach einer Antwort: Score (1.0 = richtig)
 *  plus die konkrete Auswahl; `wasCorrect` leitet die View aus dem Score ab. */
export type AnswerEvaluatedHandler = (
  score: number,
  answer?: Pick<ReviewAnswerDetails, 'selected' | 'correct'>,
) => void

export type MetricsPeriod = 'all' | '7d'

export interface DeckMetricsSnapshot {
  deckId: string
  period: MetricsPeriod
  cardCount: number
  reviewedCardCount: number
  totalReviews: number
  successRate: number
  ratingCounts: Record<Rating, number>
  lastRatingAt: Record<Rating, number | null>
  trendDelta: number
}

export interface ShuffleCollectionDeckMetricsMember {
  deckId: string
  cardCount: number
  reviewedCardCount: number
  totalReviews: number
  successRate: number
  trendDelta: number
}

export interface ShuffleCollectionMetricsSnapshot {
  period: MetricsPeriod
  deckCount: number
  cardCount: number
  reviewedCardCount: number
  totalReviews: number
  successRate: number
  ratingCounts: Record<Rating, number>
  lastRatingAt: Record<Rating, number | null>
  trendDelta: number
  decks: ShuffleCollectionDeckMetricsMember[]
}

export type CardSchedulingState = Pick<
  import('../db').CardRecord,
  'type' | 'queue' | 'due' | 'dueAt' | 'learningStep' | 'lastReviewedAt' | 'interval' | 'factor' | 'stability' | 'difficulty' | 'reps' | 'lapses' | 'algorithm'
>

export interface ReviewUndoToken {
  cardId: string
  reviewId: number
  previous: CardSchedulingState
}

// 'learning-units' und 'labs' sind seit 2026-07-19 keine eigenen Views mehr,
// sondern Home-Modi (HomeTab) unter der unveränderten Homebar.
export type View = 'home' | 'study' | 'shuffle-study' | 'shuffle-manage' | 'videos'

/** Home-Modi unter „Ansichten"; kanonische Quelle für HomeView, HomeBottomBar und HomeDeckToolbar. */
export type HomeTab = 'dashboard' | 'decks' | 'tags' | 'learning-units' | 'daily-quest' | 'labs' | 'acronyms'

export const HOME_TABS: readonly HomeTab[] = ['dashboard', 'decks', 'tags', 'learning-units', 'daily-quest', 'labs', 'acronyms']
