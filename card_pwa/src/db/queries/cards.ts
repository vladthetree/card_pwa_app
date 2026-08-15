/**
 * AI_CONTEXT:
 * Role: Card mutation query layer for create/update/delete and due-date normalization; enqueues sync operations for card and deck dependencies.
 * Used by: CardFormModal, import pipeline, study repair actions, and home/card management flows.
 * Important: Do not bypass this module for user-facing card writes, or sync and review-updated events can fall out of date.
 */
import { db, type CardAnswerTimingStats, type CardRecord, type DeckRecord } from '../../db'
import { SM2 } from '../../utils/sm2'
import { enqueueSyncOperation } from '../../services/syncQueue'
import { REVIEW_UPDATED_EVENT } from '../../constants/appIdentity'
import { buildCardSessionAppearance, buildFirstCardAnswerTiming } from '../../utils/cardAnswerTiming'
import { DAY_MS } from '../../utils/time'
import { clamp } from '../../utils/numeric'

/**
 * Caps all overdue cards' due date to today so a long absence doesn't create
 * an unmanageable backlog.  Only touches non-deleted review-type cards whose
 * due date lies in the past.
 */
export async function normalizeDueDates(): Promise<{ updated: number }> {
  const nowMs = Date.now()
  const daysSinceEpoch = Math.floor(nowMs / DAY_MS)

  const overdue = await db.cards
    .filter(c => {
      if (c.isDeleted) return false
      if (c.type === SM2.CARD_TYPE_REVIEW) {
        if (Number.isFinite(c.dueAt)) return (c.dueAt as number) < nowMs
        return c.due < daysSinceEpoch
      }
      if (c.type === SM2.CARD_TYPE_LEARNING || c.type === SM2.CARD_TYPE_RELEARNING) {
        return Number.isFinite(c.dueAt) && (c.dueAt as number) < nowMs
      }
      return false
    })
    .toArray()

  if (overdue.length === 0) return { updated: 0 }

  await db.transaction('rw', db.cards, async () => {
    for (const card of overdue) {
      if (card.type === SM2.CARD_TYPE_REVIEW) {
        await db.cards.update(card.id, { due: daysSinceEpoch, dueAt: nowMs })
      } else {
        await db.cards.update(card.id, { dueAt: nowMs })
      }
    }
  })

  if (typeof window !== 'undefined') {
    try { window.dispatchEvent(new Event(REVIEW_UPDATED_EVENT)) } catch { /* best-effort */ }
  }
  return { updated: overdue.length }
}

export async function createCard(card: Omit<CardRecord, 'createdAt'>): Promise<{ ok: boolean; error?: string }> {
  try {
    const createdAt = Date.now()
    const updatedAt = createdAt
    const derivedAlgorithm: 'sm2' | 'fsrs' = card.algorithm
      ?? (card.stability !== undefined || card.difficulty !== undefined ? 'fsrs' : 'sm2')

    await db.cards.add({
      ...card,
      createdAt,
      updatedAt,
      algorithm: derivedAlgorithm,
      dueAt: card.dueAt ?? (Math.max(0, Math.floor(card.due ?? Math.floor(Date.now() / DAY_MS))) * DAY_MS),
      stability: derivedAlgorithm === 'fsrs' ? Math.max(0.5, card.stability ?? card.interval ?? 1) : card.stability,
      difficulty: derivedAlgorithm === 'fsrs' ? clamp(card.difficulty ?? (card.factor ?? 2500) / 500, 1, 10) : card.difficulty,
    })
    await enqueueDeckCreateChain(card.deckId)
    await enqueueSyncOperation('card.create', {
      ...card,
      createdAt,
      updatedAt,
      algorithm: derivedAlgorithm,
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function enqueueDeckCreateChain(deckId: string): Promise<void> {
  const chain: DeckRecord[] = []
  const seen = new Set<string>()
  let currentId: string | null | undefined = deckId

  while (currentId && !seen.has(currentId)) {
    seen.add(currentId)
    const deck: DeckRecord | undefined = await db.decks.get(currentId)
    if (!deck || deck.isDeleted) break
    chain.unshift(deck)
    currentId = deck.parentDeckId
  }

  for (const deck of chain) {
    await enqueueSyncOperation('deck.create', {
      id: deck.id,
      name: deck.name,
      parentDeckId: deck.parentDeckId ?? null,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt ?? deck.createdAt,
      source: deck.source,
    })
  }
}

export async function updateCard(
  cardId: string,
  updates: Partial<Omit<CardRecord, 'id' | 'createdAt'>>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const updatedAt = Date.now()
    const updatesWithTs = { ...updates, updatedAt }
    const updatedCount = await db.cards.update(cardId, updatesWithTs)
    if (updatedCount === 0) {
      return { ok: false, error: 'Card not found or no rows updated.' }
    }
    await enqueueSyncOperation('card.update', {
      cardId,
      updates: updatesWithTs,
      timestamp: updatedAt,
    })
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[updateCard]', message)
    return { ok: false, error: message }
  }
}

async function persistCardAnswerTiming(
  cardId: string,
  buildNext: (current: CardAnswerTimingStats | undefined) => { changed: boolean; stats: CardAnswerTimingStats },
): Promise<{ ok: boolean; changed: boolean; stats?: CardAnswerTimingStats; error?: string }> {
  try {
    let nextMetadata: CardRecord['metadata'] | undefined
    let nextStats: CardAnswerTimingStats | undefined
    let updatedAt = 0

    await db.transaction('rw', db.cards, async () => {
      const card = await db.cards.get(cardId)
      if (!card || card.isDeleted) return

      const next = buildNext(card.metadata?.answerTiming)
      nextStats = next.stats
      if (!next.changed) return

      updatedAt = Date.now()
      nextMetadata = {
        ...(card.metadata ?? {}),
        answerTiming: next.stats,
      }
      await db.cards.update(cardId, { metadata: nextMetadata, updatedAt })
    })

    if (!nextStats) {
      return { ok: false, changed: false, error: 'Card not found.' }
    }
    if (!nextMetadata) {
      return { ok: true, changed: false, stats: nextStats }
    }

    await enqueueSyncOperation('card.update', {
      cardId,
      updates: { metadata: nextMetadata, updatedAt },
      timestamp: updatedAt,
    })
    return { ok: true, changed: true, stats: nextStats }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[persistCardAnswerTiming]', message)
    return { ok: false, changed: false, error: message }
  }
}

/** Count a card once when it appears in a study-session run, regardless of how
 * often it is requeued in that same run. */
export function recordCardStudySessionAppearance(
  cardId: string,
  sessionRunId: string,
): Promise<{ ok: boolean; changed: boolean; stats?: CardAnswerTimingStats; error?: string }> {
  return persistCardAnswerTiming(cardId, current => buildCardSessionAppearance(current, sessionRunId))
}

/** Persist the first answer duration for this card/session pair. A repeated
 * attempt in the same run is a no-op, including after an incorrect answer. */
export function recordFirstCardAnswerTime(
  cardId: string,
  sessionRunId: string,
  elapsedSeconds: number,
): Promise<{ ok: boolean; changed: boolean; stats?: CardAnswerTimingStats; error?: string }> {
  return persistCardAnswerTiming(
    cardId,
    current => buildFirstCardAnswerTiming(current, sessionRunId, elapsedSeconds),
  )
}

export async function deleteCard(cardId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const now = Date.now()
    await db.transaction('rw', db.cards, db.reviews, async () => {
      // Hard-delete the reviews (cascading delete, Issue #10)
      await db.reviews.where('cardId').equals(cardId).delete()
      // Soft-delete the card (tombstone prevents zombie resurrection on sync, Issue #3)
      await db.cards.update(cardId, { isDeleted: true, deletedAt: now, updatedAt: now })
    })
    await enqueueSyncOperation('card.delete', {
      cardId,
      timestamp: now,
    })
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[deleteCard]', message)
    return { ok: false, error: message }
  }
}
