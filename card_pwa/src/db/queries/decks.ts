import { db, type CardRecord, type DeckRecord } from '../../db'
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
  r: { id: string; name: string; parentDeckId?: string | null },
  stats: { total: number; new: number; learning: number; due: number }
): Deck {
  return { id: r.id, name: r.name, parentDeckId: r.parentDeckId ?? null, ...stats }
}

function buildDeckChildren(decks: DeckRecord[]): Map<string, DeckRecord[]> {
  const activeIds = new Set(decks.filter(deck => !deck.isDeleted).map(deck => deck.id))
  const children = new Map<string, DeckRecord[]>()

  for (const deck of decks) {
    if (deck.isDeleted) continue
    const parentDeckId = deck.parentDeckId ?? null
    if (!parentDeckId || !activeIds.has(parentDeckId)) continue
    const bucket = children.get(parentDeckId) ?? []
    bucket.push(deck)
    children.set(parentDeckId, bucket)
  }

  return children
}

function collectDescendantDeckIds(deckId: string, childrenByParent: Map<string, DeckRecord[]>): string[] {
  const result = [deckId]
  const stack = [...(childrenByParent.get(deckId) ?? [])]
  const seen = new Set(result)

  while (stack.length > 0) {
    const deck = stack.shift()
    if (!deck || seen.has(deck.id)) continue
    seen.add(deck.id)
    result.push(deck.id)
    stack.push(...(childrenByParent.get(deck.id) ?? []))
  }

  return result
}

async function resolveDeckScopeIds(deckId: string): Promise<string[]> {
  const deckStore = (db as unknown as { decks?: { toArray?: () => Promise<DeckRecord[]> } }).decks
  if (!deckStore?.toArray) return [deckId]

  const decks = (await deckStore.toArray()).filter(deck => !deck.isDeleted)
  const childrenByParent = buildDeckChildren(decks)
  return collectDescendantDeckIds(deckId, childrenByParent)
}

function sumStats(
  own: { total: number; new: number; learning: number; due: number },
  children: Deck[],
): { total: number; new: number; learning: number; due: number } {
  return children.reduce(
    (acc, child) => ({
      total: acc.total + child.total,
      new: acc.new + child.new,
      learning: acc.learning + child.learning,
      due: acc.due + child.due,
    }),
    { ...own },
  )
}

function buildDeckTree(
  deckRecords: DeckRecord[],
  statsByDeck: Record<string, { total: number; new: number; learning: number; due: number }>,
): Deck[] {
  const activeDecks = deckRecords.filter(deck => !deck.isDeleted)
  const activeIds = new Set(activeDecks.map(deck => deck.id))
  const childrenByParent = buildDeckChildren(activeDecks)
  const byId = new Map(activeDecks.map(deck => [deck.id, deck]))

  const build = (deckRecord: DeckRecord, seen = new Set<string>()): Deck => {
    if (seen.has(deckRecord.id)) {
      return mapDeck(deckRecord, statsByDeck[deckRecord.id] ?? { total: 0, new: 0, learning: 0, due: 0 })
    }

    const nextSeen = new Set(seen)
    nextSeen.add(deckRecord.id)
    const subDecks = (childrenByParent.get(deckRecord.id) ?? [])
      .filter(child => byId.has(child.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(child => build(child, nextSeen))
    const stats = sumStats(statsByDeck[deckRecord.id] ?? { total: 0, new: 0, learning: 0, due: 0 }, subDecks)

    return {
      ...mapDeck(deckRecord, stats),
      subDecks,
    }
  }

  return activeDecks
    .filter(deck => !deck.parentDeckId || !activeIds.has(deck.parentDeckId))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(deck => build(deck))
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

  return buildDeckTree(deckRecords, statsByDeck)
}

export async function fetchDeckCards(deckId: string): Promise<Card[]> {
  const deckIds = await resolveDeckScopeIds(deckId)
  const rows = (
    deckIds.length === 1
      ? await db.cards.where('deckId').equals(deckIds[0]).toArray()
      : await db.cards.where('deckId').anyOf(deckIds).toArray()
  ).filter(r => !r.isDeleted)
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

export interface DeckHomeMetadata {
  deckScheduleOverview: Record<string, DeckScheduleOverview>
  deckTagIndex: Record<string, string[]>
}

export async function getDeckHomeMetadata(
  deckIds: string[],
  dailyCardLimit: number,
  nextDayStartsAt = 0,
): Promise<DeckHomeMetadata> {
  if (deckIds.length === 0) {
    return {
      deckScheduleOverview: {},
      deckTagIndex: {},
    }
  }

  const dayMs = 86_400_000
  const todayStartMs = getDayStartMs(Date.now(), nextDayStartsAt)
  const tomorrowStartMs = todayStartMs + dayMs
  const dayAfterTomorrowStartMs = tomorrowStartMs + dayMs
  const normalizedDailyLimit = Number.isFinite(dailyCardLimit)
    ? Math.max(1, Math.floor(dailyCardLimit))
    : 50

  const deckRecords = (await db.decks.toArray()).filter(deck => !deck.isDeleted)
  const childrenByParent = buildDeckChildren(deckRecords)
  const scopeByDeckId: Record<string, string[]> = Object.fromEntries(
    deckIds.map(deckId => [deckId, collectDescendantDeckIds(deckId, childrenByParent)])
  )
  const ownerDeckIdsByCardDeckId = new Map<string, string[]>()
  for (const [ownerDeckId, scopedDeckIds] of Object.entries(scopeByDeckId)) {
    for (const scopedDeckId of scopedDeckIds) {
      const owners = ownerDeckIdsByCardDeckId.get(scopedDeckId) ?? []
      owners.push(ownerDeckId)
      ownerDeckIdsByCardDeckId.set(scopedDeckId, owners)
    }
  }
  const allScopedDeckIds = Array.from(new Set(Object.values(scopeByDeckId).flat()))

  const deckScheduleOverview: Record<string, DeckScheduleOverview> = Object.fromEntries(
    deckIds.map(deckId => [
      deckId,
      {
        today: { total: 0, new: 0, review: 0 },
        tomorrow: { total: 0, new: 0, review: 0 },
      } satisfies DeckScheduleOverview,
    ])
  )
  const tagsByDeck = new Map<string, Set<string>>()
  const newByDeck: Record<string, number> = Object.fromEntries(deckIds.map(deckId => [deckId, 0]))

  for (const deckId of deckIds) {
    tagsByDeck.set(deckId, new Set<string>())
  }

  const rows = (await db.cards.where('deckId').anyOf(allScopedDeckIds).toArray()).filter(r => !r.isDeleted)

  for (const row of rows) {
    const ownerDeckIds = ownerDeckIdsByCardDeckId.get(row.deckId) ?? []
    if (ownerDeckIds.length === 0) continue

    for (const ownerDeckId of ownerDeckIds) {
      const tagBucket = tagsByDeck.get(ownerDeckId)
      if (tagBucket) {
        for (const tag of row.tags) {
          const normalized = tag.trim().toLowerCase()
          if (normalized) tagBucket.add(normalized)
        }
      }

      const deckSchedule = deckScheduleOverview[ownerDeckId]
      if (!deckSchedule) continue

      if (row.type === SM2.CARD_TYPE_NEW) {
        newByDeck[ownerDeckId] += 1
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
  }

  for (const deckId of deckIds) {
    const schedule = deckScheduleOverview[deckId]
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

  const deckTagIndex = Object.fromEntries(
    deckIds.map(deckId => [deckId, Array.from(tagsByDeck.get(deckId) ?? []).sort()]),
  )

  return {
    deckScheduleOverview,
    deckTagIndex,
  }
}

export async function fetchDeckStudyCandidates(deckId: string, nextDayStartsAt = 0): Promise<Card[]> {
  const todayStartMs = getDayStartMs(Date.now(), nextDayStartsAt)
  const tomorrowStartMs = todayStartMs + 86_400_000
  const deckIds = await resolveDeckScopeIds(deckId)

  const rows = deckIds.length === 1
    ? await db.cards.where('deckId').equals(deckIds[0]).toArray()
    : await db.cards.where('deckId').anyOf(deckIds).toArray()

  const inStudyWindow = (row: CardRecord) => resolveDueAtMs(row) < tomorrowStartMs
  const candidates = rows.filter(row => {
    if (row.isDeleted) return false
    if (row.type === SM2.CARD_TYPE_NEW) return true
    if (row.type === SM2.CARD_TYPE_LEARNING || row.type === SM2.CARD_TYPE_RELEARNING) {
      return inStudyWindow(row)
    }
    return row.type === SM2.CARD_TYPE_REVIEW && inStudyWindow(row)
  })

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
  return (await getDeckHomeMetadata(deckIds, dailyCardLimit, nextDayStartsAt)).deckScheduleOverview
}

export async function fetchTodayDueFromDecks(
  dailyCardLimit: number,
  nextDayStartsAt = 0
): Promise<number> {
  const decks = (await db.decks.toArray()).filter(deck => !deck.isDeleted)
  const activeIds = new Set(decks.map(deck => deck.id))
  const deckIds = decks
    .filter(deck => !deck.parentDeckId || !activeIds.has(deck.parentDeckId))
    .map(deck => deck.id)

  if (deckIds.length === 0) return 0

  const overview = await getDeckScheduleOverview(deckIds, dailyCardLimit, nextDayStartsAt)
  return deckIds.reduce((sum, deckId) => sum + (overview[deckId]?.today.total ?? 0), 0)
}

export async function createDeck(
  name: string,
  options: { parentDeckId?: string | null } = {},
): Promise<{ ok: boolean; error?: string; deckId?: string }> {
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
      parentDeckId: options.parentDeckId ?? null,
      createdAt,
      updatedAt,
      source: 'manual',
    })

    await enqueueSyncOperation('deck.create', {
      id: deckId,
      name: normalizedName,
      parentDeckId: options.parentDeckId ?? null,
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
  let deckIds: string[] = [deckId]
  await db.transaction('rw', db.decks, db.cards, db.reviews, async () => {
    deckIds = await resolveDeckScopeIds(deckId)
    cardIds = (await db.cards.where('deckId').anyOf(deckIds).toArray()).map(c => c.id)
    // Hard-delete all reviews for the deck's cards (cascading delete, Issue #10)
    if (cardIds.length > 0) {
      await db.reviews.where('cardId').anyOf(cardIds).delete()
    }
    // Soft-delete all cards (tombstone prevents zombie resurrection on sync, Issue #3)
    await db.cards.where('deckId').anyOf(deckIds).modify({ isDeleted: true, deletedAt: now, updatedAt: now })
    // Soft-delete the deck and all descendants.
    for (const id of deckIds) {
      await db.decks.update(id, { isDeleted: true, deletedAt: now, updatedAt: now })
    }
  })
  await enqueueSyncOperation('deck.delete', {
    deckId,
    deckIds,
    cardIds,
    timestamp: now,
  })
}
