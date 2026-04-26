import type { ShuffleCollectionRecord } from '../../db'

export function normalizeShuffleCollection(raw: unknown): ShuffleCollectionRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const id = value.id
  const name = value.name
  const deckIdsRaw = value.deckIds ?? value.deck_ids

  if (typeof id !== 'string' || typeof name !== 'string' || !id || !name) {
    return null
  }

  const deckIds = Array.isArray(deckIdsRaw)
    ? Array.from(new Set(deckIdsRaw.map(entry => String(entry).trim()).filter(Boolean)))
    : []

  const createdAt = Number(value.createdAt ?? value.created_at)
  const updatedAt = Number(value.updatedAt ?? value.updated_at ?? value.createdAt ?? value.created_at)
  const deletedAt = Number(value.deletedAt ?? value.deleted_at)
  const deletedFlag = Boolean(value.isDeleted ?? value.is_deleted)

  return {
    id,
    name,
    deckIds,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : (Number.isFinite(createdAt) ? createdAt : Date.now()),
    isDeleted: deletedFlag || Number.isFinite(deletedAt),
    deletedAt: Number.isFinite(deletedAt) ? deletedAt : undefined,
  }
}
