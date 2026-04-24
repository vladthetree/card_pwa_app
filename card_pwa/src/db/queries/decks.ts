import Dexie from 'dexie'
import { db, type CardRecord } from '../../db'
import { SM2 } from '../../utils/sm2'
import { factorToDifficulty } from '../../utils/algorithmParams'
import { getDayStartMs } from '../../utils/time'
import { generateUuidV7 } from '../../utils/id'
import { enqueueSyncOperation } from '../../services/syncQueue'
import type { Deck, Card, DeckScheduleOverview } from '../../types'

function mapCard(r: CardRecord): Card {
  const algorithm = r.algorithm ?? 'sm2'

  return {
    id: r.id,
    noteId: r.noteId,
    type: (['new', 'learning', 'review', 'relearning'] as const)[r.type] ?? 'new',
    front: r.front,
    back: r.back,
    extra: r.extra,
    tags: r.tags,
    interval: r.interval,
    sm2Ease: algorithm === 'sm2' ? Number((r.factor / 1000).toFixed(2)) : undefined,
    fsrsDifficulty: algorithm === 'fsrs'
      ? Number((r.difficulty ?? factorToDifficulty(r.factor)).toFixed(2))
      : undefined,
    due: r.due,
    dueAt: r.dueAt,
    reps: r.reps,
    lapses: r.lapses,
    queue: r.queue,
    stability: r.stability,
    difficulty: r.difficulty,
    algorithm,
  }
}

function mapDeck(
  r: { id: string; name: string },
  stats: { total: number; new: number; learning: number; due: number }
): Deck {
  return { id: r.id, name: r.name, ...stats }
}

function resolveDueAtMs(row: Pick<CardRecord, 'due' | 'dueAt'>): number {
  if (Number.isFinite(row.dueAt)) return Math.round(row.dueAt as number)
  return Math.max(0, Math.floor(row.due)) * 86_400_000
}

async function computeAllDeckStats(
  deckIds: string[],
  nowMs: number,
): Promise<Record<string, { total: number; new: number; learning: number; due: number }>> {
  const statsByDeck: Record<string, { total: number; new: number; learning: number; due: number }> = Object.fromEntries(
    deckIds.map(deckId => [deckId, { total: 0, new: 0, learning: 0, due: 0 }])
  )

  const rows = await db.cards.where('deckId').anyOf(deckIds).and(c => !c.isDeleted).toArray()

  for (const row of rows) {
    const stats = statsByDeck[row.deckId]
    if (!stats) continue

    stats.total += 1

    if (row.type === SM2.CARD_TYPE_NEW) {
      stats.new += 1
      continue
    }

    if (row.type === SM2.CARD_TYPE_LEARNING || row.type === SM2.CARD_TYPE_RELEARNING) {
      stats.learning += 1
      continue
    }

    if (row.type === SM2.CARD_TYPE_REVIEW) {
      const dueAtMs = Number.isFinite(row.dueAt)
        ? Number(row.dueAt)
        : Math.max(0, Math.floor(row.due)) * 86_400_000
      if (dueAtMs <= nowMs) {
        stats.due += 1
      }
    }
  }

  return statsByDeck
}

export async function fetchDecks(): Promise<Deck[]> {
  const deckRecords = (await db.decks.orderBy('name').toArray()).filter(d => !d.isDeleted)
  if (deckRecords.length === 0) return []

  const nowMs = Date.now()
  const deckIds = deckRecords.map(deck => deck.id)
  const statsByDeck = await computeAllDeckStats(deckIds, nowMs)

  return deckRecords.map(deck => mapDeck(deck, statsByDeck[deck.id] ?? { total: 0, new: 0, learning: 0, due: 0 }))
}

export async function fetchDeckCards(deckId: string): Promise<Card[]> {
  const rows = (await db.cards.where('deckId').equals(deckId).toArray()).filter(r => !r.isDeleted)
  return rows.map(mapCard)
}

export async function getDeckTagIndex(deckIds: string[]): Promise<Record<string, string[]>> {
  if (deckIds.length === 0) return {}

  const rows = (await db.cards.where('deckId').anyOf(deckIds).toArray()).filter(row => !row.isDeleted)
  const tagsByDeck = new Map<string, Set<string>>()

  for (const deckId of deckIds) {
    tagsByDeck.set(deckId, new Set<string>())
  }

  for (const row of rows) {
    const bucket = tagsByDeck.get(row.deckId)
    if (!bucket) continue
    for (const tag of row.tags) {
      const normalized = tag.trim().toLowerCase()
      if (normalized) {
        bucket.add(normalized)
      }
    }
  }

  return Object.fromEntries(
    deckIds.map(deckId => [deckId, Array.from(tagsByDeck.get(deckId) ?? []).sort()]),
  )
}

export async function fetchDeckStudyCandidates(deckId: string, nextDayStartsAt = 0): Promise<Card[]> {
  const todayStartMs = getDayStartMs(Date.now(), nextDayStartsAt)
  const tomorrowStartMs = todayStartMs + 86_400_000

  const [newRows, learningRows, relearningRows, reviewDueRows] = await Promise.all([
    db.cards.where('[deckId+type]').equals([deckId, SM2.CARD_TYPE_NEW]).toArray(),
    db.cards.where('[deckId+type]').equals([deckId, SM2.CARD_TYPE_LEARNING]).toArray(),
    db.cards.where('[deckId+type]').equals([deckId, SM2.CARD_TYPE_RELEARNING]).toArray(),
    db.cards.where('[deckId+dueAt]').between([deckId, Dexie.minKey], [deckId, tomorrowStartMs - 1]).toArray(),
  ])

  const inStudyWindow = (row: CardRecord) => resolveDueAtMs(row) < tomorrowStartMs
  const candidates = [
    ...newRows.filter(row => !row.isDeleted),
    ...learningRows.filter(row => !row.isDeleted && inStudyWindow(row)),
    ...relearningRows.filter(row => !row.isDeleted && inStudyWindow(row)),
    ...reviewDueRows.filter(row => !row.isDeleted && row.type === SM2.CARD_TYPE_REVIEW),
  ]

  const deduped = new Map<string, CardRecord>()
  for (const row of candidates) {
    if (!deduped.has(row.id)) {
      deduped.set(row.id, row)
    }
  }

  return Array.from(deduped.values()).map(mapCard)
}

export async function getDeckScheduleOverview(
  deckIds: string[],
  dailyCardLimit: number,
  nextDayStartsAt = 0
): Promise<Record<string, DeckScheduleOverview>> {
  if (deckIds.length === 0) return {}

  const dayMs = 86_400_000
  const todayStartMs = getDayStartMs(Date.now(), nextDayStartsAt)
  const tomorrowStartMs = todayStartMs + dayMs
  const dayAfterTomorrowStartMs = tomorrowStartMs + dayMs
  const normalizedDailyLimit = Number.isFinite(dailyCardLimit)
    ? Math.max(1, Math.floor(dailyCardLimit))
    : 50

  const rows = (await db.cards.where('deckId').anyOf(deckIds).toArray()).filter(r => !r.isDeleted)

  const result: Record<string, DeckScheduleOverview> = Object.fromEntries(
    deckIds.map(deckId => [
      deckId,
      {
        today: { total: 0, new: 0, review: 0 },
        tomorrow: { total: 0, new: 0, review: 0 },
      } satisfies DeckScheduleOverview,
    ])
  )

  const newByDeck: Record<string, number> = Object.fromEntries(deckIds.map(deckId => [deckId, 0]))

  for (const row of rows) {
    const deckSchedule = result[row.deckId]
    if (!deckSchedule) continue

    if (row.type === SM2.CARD_TYPE_NEW) {
      newByDeck[row.deckId] += 1
      continue
    }

    const dueAtMs = Number.isFinite(row.dueAt)
      ? Math.round(row.dueAt as number)
      : Math.max(0, Math.floor(row.due)) * dayMs

    const isLearningQueue = row.type === SM2.CARD_TYPE_LEARNING || row.type === SM2.CARD_TYPE_RELEARNING

    if (isLearningQueue) {
      if (dueAtMs < tomorrowStartMs) {
        deckSchedule.today.review += 1
      } else if (dueAtMs >= tomorrowStartMs && dueAtMs < dayAfterTomorrowStartMs) {
        deckSchedule.tomorrow.review += 1
      }
      continue
    }

    if (row.type === SM2.CARD_TYPE_REVIEW) {
      if (dueAtMs < tomorrowStartMs) {
        deckSchedule.today.review += 1
      } else if (dueAtMs >= tomorrowStartMs && dueAtMs < dayAfterTomorrowStartMs) {
        deckSchedule.tomorrow.review += 1
      }
    }
  }

  for (const deckId of deckIds) {
    const schedule = result[deckId]
    const newCards = newByDeck[deckId] ?? 0
    const cappedTodayReview = Math.min(schedule.today.review, normalizedDailyLimit)
    const cappedTomorrowReview = Math.min(schedule.tomorrow.review, normalizedDailyLimit)

    const todayNewCapacity = Math.max(0, normalizedDailyLimit - cappedTodayReview)
    const todayNew = Math.min(newCards, todayNewCapacity)

    const remainingNewAfterToday = Math.max(0, newCards - todayNew)
    const tomorrowNewCapacity = Math.max(0, normalizedDailyLimit - cappedTomorrowReview)
    const tomorrowNew = Math.min(remainingNewAfterToday, tomorrowNewCapacity)

    schedule.today.review = cappedTodayReview
    schedule.tomorrow.review = cappedTomorrowReview
    schedule.today.new = todayNew
    schedule.tomorrow.new = tomorrowNew
    schedule.today.total = schedule.today.review + schedule.today.new
    schedule.tomorrow.total = schedule.tomorrow.review + schedule.tomorrow.new
  }

  return result
}

export async function fetchTodayDueFromDecks(
  dailyCardLimit: number,
  nextDayStartsAt = 0
): Promise<number> {
  const deckIds = (await db.decks.toArray())
    .filter(deck => !deck.isDeleted)
    .map(deck => deck.id)

  if (deckIds.length === 0) return 0

  const overview = await getDeckScheduleOverview(deckIds, dailyCardLimit, nextDayStartsAt)
  return deckIds.reduce((sum, deckId) => sum + (overview[deckId]?.today.total ?? 0), 0)
}

export async function createDeck(name: string): Promise<{ ok: boolean; error?: string; deckId?: string }> {
  const normalizedName = name.trim()
  if (!normalizedName) {
    return { ok: false, error: 'Deck name must not be empty.' }
  }

  try {
    const existingDecks = await db.decks.toArray()
    const duplicate = existingDecks.some(deck => deck.name.trim().toLowerCase() === normalizedName.toLowerCase())
    if (duplicate) {
      return { ok: false, error: 'A deck with this name already exists.' }
    }

    const deckId = generateUuidV7()
    const createdAt = Date.now()
    const updatedAt = createdAt

    await db.decks.add({
      id: deckId,
      name: normalizedName,
      createdAt,
      updatedAt,
      source: 'manual',
    })

    await enqueueSyncOperation('deck.create', {
      id: deckId,
      name: normalizedName,
      createdAt,
      updatedAt,
      source: 'manual',
    })

    return { ok: true, deckId }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function deleteDeck(deckId: string): Promise<void> {
  const now = Date.now()
  let cardIds: string[] = []
  await db.transaction('rw', db.decks, db.cards, db.reviews, async () => {
    cardIds = (await db.cards.where('deckId').equals(deckId).toArray()).map(c => c.id)
    // Hard-delete all reviews for the deck's cards (cascading delete, Issue #10)
    if (cardIds.length > 0) {
      await db.reviews.where('cardId').anyOf(cardIds).delete()
    }
    // Soft-delete all cards (tombstone prevents zombie resurrection on sync, Issue #3)
    await db.cards.where('deckId').equals(deckId).modify({ isDeleted: true, deletedAt: now, updatedAt: now })
    // Soft-delete the deck itself
    await db.decks.update(deckId, { isDeleted: true, deletedAt: now, updatedAt: now })
  })
  await enqueueSyncOperation('deck.delete', {
    deckId,
    cardIds,
    timestamp: now,
  })
}
