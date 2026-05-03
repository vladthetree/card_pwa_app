import { db, type DeckRecord } from '../db'
import { enqueueSyncOperation } from './syncQueue'
import { buildSecurityDeckHierarchyPlan } from '../utils/securityDeckHierarchy'

export async function ensureCompTIA701DeckHierarchy(): Promise<void> {
  const decks = await db.decks.toArray()
  const plan = buildSecurityDeckHierarchyPlan<DeckRecord>(decks)
  if (plan.upserts.length === 0 && plan.updates.length === 0) return

  await db.transaction('rw', db.decks, async () => {
    if (plan.upserts.length > 0) {
      await db.decks.bulkPut(plan.upserts)
    }

    for (const update of plan.updates) {
      await db.decks.update(update.id, update.changes)
    }
  })

  await Promise.all([
    ...plan.upserts.map(deck =>
      enqueueSyncOperation('deck.create', {
        id: deck.id,
        name: deck.name,
        parentDeckId: deck.parentDeckId ?? null,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt ?? deck.createdAt,
        source: deck.source,
      }),
    ),
    ...plan.updates.map(async update => {
      const deck = await db.decks.get(update.id)
      if (!deck) return
      await enqueueSyncOperation('deck.create', {
        id: deck.id,
        name: deck.name,
        parentDeckId: deck.parentDeckId ?? null,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt ?? deck.createdAt,
        source: deck.source,
      })
    }),
  ])
}
