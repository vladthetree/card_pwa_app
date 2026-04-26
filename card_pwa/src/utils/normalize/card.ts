import type { CardRecord } from '../../db'

function parseMaybeNumber(input: unknown): number {
  if (input === null || input === undefined) return Number.NaN
  return Number(input)
}

export function normalizeCard(raw: unknown): CardRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>

  const id = value.id
  const noteId = value.noteId ?? value.note_id
  const deckId = value.deckId ?? value.deck_id
  const front = value.front
  const back = value.back

  if (
    typeof id !== 'string'
    || typeof noteId !== 'string'
    || typeof deckId !== 'string'
    || typeof front !== 'string'
    || typeof back !== 'string'
  ) {
    return null
  }

  const tagsRaw = value.tags
  const tags = Array.isArray(tagsRaw) ? tagsRaw.map(tag => String(tag)) : []

  const extraRaw = value.extra
  const extraObj = extraRaw && typeof extraRaw === 'object' ? extraRaw as Record<string, unknown> : {}

  const due = parseMaybeNumber(value.due)
  const dueAt = parseMaybeNumber(value.dueAt ?? value.due_at)
  const deletedAt = parseMaybeNumber(value.deletedAt ?? value.deleted_at)
  const createdAt = parseMaybeNumber(value.createdAt ?? value.created_at)
  const updatedAt = parseMaybeNumber(value.updatedAt ?? value.updated_at ?? value.createdAt ?? value.created_at)
  const rawType = Number(value.type)
  const rawQueue = Number(value.queue)
  const normalizedType = Number.isFinite(rawType) ? Math.max(0, Math.min(3, Math.round(rawType))) : 0
  const normalizedQueue = Number.isFinite(rawQueue) ? Math.max(-1, Math.min(2, Math.round(rawQueue))) : normalizedType
  const algorithmRaw = value.algorithm
  const normalizedAlgorithm = algorithmRaw === 'fsrs' ? 'fsrs' : 'sm2'
  const deletedFlag = Boolean(value.isDeleted ?? value.is_deleted)
  const hasDeletedAt = Number.isFinite(deletedAt)

  const card: CardRecord = {
    id,
    noteId,
    deckId,
    front,
    back,
    tags,
    extra: {
      acronym: typeof extraObj.acronym === 'string' ? extraObj.acronym : '',
      examples: typeof extraObj.examples === 'string' ? extraObj.examples : '',
      port: typeof extraObj.port === 'string' ? extraObj.port : '',
      protocol: typeof extraObj.protocol === 'string' ? extraObj.protocol : '',
    },
    type: normalizedType,
    queue: normalizedQueue,
    due: Number.isFinite(due) ? due : Math.floor(Date.now() / 86_400_000),
    dueAt: Number.isFinite(dueAt) ? dueAt : undefined,
    interval: Number.isFinite(Number(value.interval)) ? Number(value.interval) : 0,
    factor: Number.isFinite(Number(value.factor)) ? Number(value.factor) : 2500,
    stability: Number.isFinite(Number(value.stability)) ? Number(value.stability) : undefined,
    difficulty: Number.isFinite(Number(value.difficulty)) ? Number(value.difficulty) : undefined,
    reps: Number.isFinite(Number(value.reps)) ? Number(value.reps) : 0,
    lapses: Number.isFinite(Number(value.lapses)) ? Number(value.lapses) : 0,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : (Number.isFinite(createdAt) ? createdAt : Date.now()),
    algorithm: normalizedAlgorithm,
    isDeleted: deletedFlag || hasDeletedAt,
    deletedAt: Number.isFinite(deletedAt) ? deletedAt : undefined,
    metadata: value.metadata && typeof value.metadata === 'object'
      ? value.metadata as CardRecord['metadata']
      : undefined,
  }

  if (!Number.isFinite(card.dueAt)) {
    card.dueAt = Math.max(0, Math.floor(card.due)) * 86_400_000
  }

  return card
}

export function normalizeCardUpdates(raw: unknown): Partial<CardRecord> {
  if (!raw || typeof raw !== 'object') return {}

  const value = raw as Record<string, unknown>
  const updates: Partial<CardRecord> = {}

  const setString = (key: keyof CardRecord, altKey?: string) => {
    const source = key as string
    const hasPrimary = source in value
    const hasAlt = Boolean(altKey && altKey in value)
    if (!hasPrimary && !hasAlt) return
    const rawValue = value[source] ?? (altKey ? value[altKey] : undefined)
    if (typeof rawValue === 'string') {
      ;(updates as Record<string, unknown>)[source] = rawValue
    }
  }

  setString('noteId', 'note_id')
  setString('deckId', 'deck_id')
  setString('front')
  setString('back')

  if ('tags' in value) {
    updates.tags = Array.isArray(value.tags) ? value.tags.map(tag => String(tag)) : []
  }

  if ('extra' in value) {
    const extraRaw = value.extra
    const extraObj = extraRaw && typeof extraRaw === 'object' ? extraRaw as Record<string, unknown> : {}
    updates.extra = {
      acronym: typeof extraObj.acronym === 'string' ? extraObj.acronym : '',
      examples: typeof extraObj.examples === 'string' ? extraObj.examples : '',
      port: typeof extraObj.port === 'string' ? extraObj.port : '',
      protocol: typeof extraObj.protocol === 'string' ? extraObj.protocol : '',
    }
  }

  if ('type' in value) {
    const rawType = Number(value.type)
    if (Number.isFinite(rawType)) {
      updates.type = Math.max(0, Math.min(3, Math.round(rawType)))
    }
  }

  if ('queue' in value) {
    const rawQueue = Number(value.queue)
    if (Number.isFinite(rawQueue)) {
      updates.queue = Math.max(-1, Math.min(2, Math.round(rawQueue)))
    }
  }

  if ('due' in value) {
    const rawDue = Number(value.due)
    if (Number.isFinite(rawDue)) {
      updates.due = Math.max(0, Math.floor(rawDue))
    }
  }

  const dueAtRaw = parseMaybeNumber(value.dueAt ?? value.due_at)
  if ('dueAt' in value || 'due_at' in value) {
    if (Number.isFinite(dueAtRaw)) {
      updates.dueAt = dueAtRaw
    }
  }

  if (!Number.isFinite(updates.dueAt)) {
    const baseDue = Number.isFinite(updates.due)
      ? (updates.due as number)
      : Number.isFinite(parseMaybeNumber(value.due))
        ? Math.max(0, Math.floor(parseMaybeNumber(value.due)))
        : undefined
    if (baseDue !== undefined) {
      updates.dueAt = baseDue * 86_400_000
    }
  }

  const numericFields: Array<keyof CardRecord> = ['interval', 'factor', 'stability', 'difficulty', 'reps', 'lapses', 'createdAt', 'updatedAt']
  for (const field of numericFields) {
    const rawValue = parseMaybeNumber(value[field as string])
    if (!Number.isFinite(rawValue)) continue
    ;(updates as Record<string, unknown>)[field as string] = rawValue
  }

  if ('algorithm' in value) {
    updates.algorithm = value.algorithm === 'fsrs' ? 'fsrs' : 'sm2'
  }

  const deletedAt = parseMaybeNumber(value.deletedAt ?? value.deleted_at)
  const hasDeletedAt = Number.isFinite(deletedAt)
  const hasDeletedFlag = 'isDeleted' in value || 'is_deleted' in value
  if (hasDeletedFlag) {
    updates.isDeleted = Boolean(value.isDeleted ?? value.is_deleted)
  }
  if (hasDeletedAt) {
    updates.deletedAt = deletedAt
    updates.isDeleted = true
  }

  if ('metadata' in value && value.metadata && typeof value.metadata === 'object') {
    updates.metadata = value.metadata as CardRecord['metadata']
  }

  return updates
}
