import type { DeckRecord } from '../../db'

export function normalizeDeck(raw: unknown): DeckRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>

  const id = value.id
  const name = value.name
  if (typeof id !== 'string' || typeof name !== 'string' || !id || !name) {
    return null
  }

  const createdAt = Number(value.createdAt ?? value.created_at)
  const updatedAt = Number(value.updatedAt ?? value.updated_at ?? value.createdAt ?? value.created_at)
  const parentDeckIdRaw = value.parentDeckId ?? value.parent_deck_id
  const parentDeckId = typeof parentDeckIdRaw === 'string' && parentDeckIdRaw.trim()
    ? parentDeckIdRaw.trim()
    : null
  const deletedAtRaw = value.deletedAt ?? value.deleted_at
  const deletedAt = Number(deletedAtRaw)
  const sourceRaw = value.source
  const source = sourceRaw === 'anki-import' || sourceRaw === 'system' ? sourceRaw : 'manual'

  return {
    id,
    name,
    parentDeckId,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : (Number.isFinite(createdAt) ? createdAt : Date.now()),
    source,
    isDeleted: Boolean(value.isDeleted) || Number.isFinite(deletedAt),
    deletedAt: Number.isFinite(deletedAt) ? deletedAt : undefined,
  }
}
