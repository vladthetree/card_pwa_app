import { db, type ShuffleCollectionRecord } from '../../db'
import { enqueueSyncOperation } from '../../services/syncQueue'
import { generateUuidV7 } from '../../utils/id'

function normalizeCollectionName(name: string): string {
  return name.trim()
}

function normalizeDeckIds(deckIds: string[]): string[] {
  return Array.from(new Set(deckIds.map(id => id.trim()).filter(Boolean)))
}

export async function listShuffleCollections(): Promise<ShuffleCollectionRecord[]> {
  const rows = await db.shuffleCollections.orderBy('updatedAt').reverse().toArray()
  return rows.filter(row => !row.isDeleted)
}

export async function getShuffleCollection(collectionId: string): Promise<ShuffleCollectionRecord | null> {
  const record = await db.shuffleCollections.get(collectionId)
  if (!record || record.isDeleted) return null
  return record
}

export async function createShuffleCollection(
  name: string,
  deckIds: string[],
): Promise<{ ok: boolean; error?: string; collectionId?: string }> {
  const normalizedName = normalizeCollectionName(name)
  if (!normalizedName) {
    return { ok: false, error: 'Collection name must not be empty.' }
  }

  const normalizedDeckIds = normalizeDeckIds(deckIds)
  if (normalizedDeckIds.length === 0) {
    return { ok: false, error: 'Shuffle collection must contain at least one deck.' }
  }

  try {
    const now = Date.now()
    const collectionId = `shuffle_${generateUuidV7()}`

    await db.shuffleCollections.add({
      id: collectionId,
      name: normalizedName,
      deckIds: normalizedDeckIds,
      createdAt: now,
      updatedAt: now,
    })

    await enqueueSyncOperation('shuffleCollection.upsert', {
      id: collectionId,
      name: normalizedName,
      deckIds: normalizedDeckIds,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
    })
    return { ok: true, collectionId }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function updateShuffleCollection(
  collectionId: string,
  updates: Partial<Pick<ShuffleCollectionRecord, 'name' | 'deckIds'>>,
): Promise<{ ok: boolean; error?: string }> {
  const normalizedUpdates: Partial<ShuffleCollectionRecord> = {
    updatedAt: Date.now(),
  }

  if (typeof updates.name === 'string') {
    const normalizedName = normalizeCollectionName(updates.name)
    if (!normalizedName) {
      return { ok: false, error: 'Collection name must not be empty.' }
    }
    normalizedUpdates.name = normalizedName
  }

  if (Array.isArray(updates.deckIds)) {
    const normalizedDeckIds = normalizeDeckIds(updates.deckIds)
    if (normalizedDeckIds.length === 0) {
      return { ok: false, error: 'Shuffle collection must contain at least one deck.' }
    }
    normalizedUpdates.deckIds = normalizedDeckIds
  }

  try {
    const updatedCount = await db.shuffleCollections.update(collectionId, normalizedUpdates)
    if (updatedCount === 0) {
      return { ok: false, error: 'Shuffle collection not found or no rows updated.' }
    }

    const persisted = await db.shuffleCollections.get(collectionId)
    if (persisted && !persisted.isDeleted) {
      await enqueueSyncOperation('shuffleCollection.upsert', {
        id: persisted.id,
        name: persisted.name,
        deckIds: persisted.deckIds,
        createdAt: persisted.createdAt,
        updatedAt: persisted.updatedAt,
        isDeleted: false,
        deletedAt: persisted.deletedAt ?? null,
      })
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function deleteShuffleCollection(collectionId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const now = Date.now()
    const existing = await db.shuffleCollections.get(collectionId)
    const updatedCount = await db.shuffleCollections.update(collectionId, {
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    })

    if (updatedCount === 0) {
      return { ok: false, error: 'Shuffle collection not found or no rows updated.' }
    }

    await enqueueSyncOperation('shuffleCollection.delete', {
      id: collectionId,
      name: existing?.name ?? '',
      deckIds: existing?.deckIds ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      isDeleted: true,
      deletedAt: now,
    })

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
