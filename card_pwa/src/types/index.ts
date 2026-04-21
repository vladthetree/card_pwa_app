export interface CardExtra {
  acronym: string
  examples: string
  port: string
  protocol: string
}

export interface Card {
  id: string
  noteId: string
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
}

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

export type GamificationRarity = 'common' | 'rare' | 'epic'

export interface GamificationAchievement {
  id: string
  title: string
  description: string
  unlocked: boolean
  progress: number
  target: number
  rarity: GamificationRarity
}

export interface GamificationQuest {
  id: string
  title: string
  description: string
  progress: number
  target: number
  rewardXp: number
  isComplete: boolean
}

export interface GamificationProfile {
  level: number
  title: string
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
  achievements: GamificationAchievement[]
  quests: GamificationQuest[]
}

export type Rating = 1 | 2 | 3 | 4  // Again / Hard / Good / Easy

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

export type CardSchedulingState = Pick<
  import('../db').CardRecord,
  'type' | 'queue' | 'due' | 'dueAt' | 'interval' | 'factor' | 'stability' | 'difficulty' | 'reps' | 'lapses' | 'algorithm'
>

export interface ReviewUndoToken {
  cardId: string
  reviewId: number
  previous: CardSchedulingState
}

export type View = 'home' | 'study' | 'import'
