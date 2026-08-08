/**
 * AI_CONTEXT:
 * Role: Separates server-curated card content from learner scheduling state during sync.
 * Used by: Both direct and worker sync-pull paths.
 * Important: Maintenance publications may repair wording after a learner reviewed the
 * card locally. Apply only authoring fields authoritatively; never roll back reps,
 * due dates, FSRS state, or timestamps.
 */
import type { CardRecord } from '../../db'

interface OperationSource {
  source?: string
  sourceClient?: string
}

const AUTHORITATIVE_CONTENT_CLIENTS = new Set([
  'server-maintenance-publisher',
  'card-qa-audit-v1',
])

const AUTHORING_FIELDS = [
  'noteId',
  'deckId',
  'front',
  'back',
  'tags',
  'extra',
  'metadata',
] as const satisfies readonly (keyof CardRecord)[]

export function isAuthoritativeCardContentOperation(op: OperationSource): boolean {
  return op.source === 'server-maintenance-publish'
    && typeof op.sourceClient === 'string'
    && AUTHORITATIVE_CONTENT_CLIENTS.has(op.sourceClient)
}

export function pickAuthoritativeCardContentUpdates(
  incoming: Partial<CardRecord>,
): Partial<CardRecord> {
  const updates: Partial<CardRecord> = {}
  for (const field of AUTHORING_FIELDS) {
    if (!(field in incoming)) continue
    ;(updates as Record<string, unknown>)[field] = incoming[field]
  }
  return updates
}
