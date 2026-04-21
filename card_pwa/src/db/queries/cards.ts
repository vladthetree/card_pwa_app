import { db, type CardRecord } from '../../db'
import { SM2 } from '../../utils/sm2'
import { enqueueSyncOperation } from '../../services/syncQueue'
import { REVIEW_UPDATED_EVENT } from '../../constants/appIdentity'

/**
 * Caps all overdue cards' due date to today so a long absence doesn't create
 * an unmanageable backlog.  Only touches non-deleted review-type cards whose
 * due date lies in the past.
 */
export async function normalizeDueDates(): Promise<{ updated: number }> {
  const nowMs = Date.now()
  const daysSinceEpoch = Math.floor(nowMs / 86_400_000)

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
      dueAt: card.dueAt ?? (Math.max(0, Math.floor(card.due ?? Math.floor(Date.now() / 86_400_000))) * 86_400_000),
      stability: derivedAlgorithm === 'fsrs' ? Math.max(0.5, card.stability ?? card.interval ?? 1) : card.stability,
      difficulty: derivedAlgorithm === 'fsrs' ? Math.max(1, Math.min(10, card.difficulty ?? (card.factor ?? 2500) / 500)) : card.difficulty,
    })
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

