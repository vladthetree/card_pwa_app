import { db, type CardRecord } from '../../db'
import { STORAGE_KEYS } from '../../constants/appIdentity'

const SCHEDULING_FIELDS = [
  'type',
  'queue',
  'due',
  'dueAt',
  'interval',
  'factor',
  'stability',
  'difficulty',
  'reps',
  'lapses',
  'algorithm',
] as const

type SchedulingField = (typeof SCHEDULING_FIELDS)[number]

export interface AlgorithmDiagnosticsEntry {
  timestamp: number
  cardId: string
  algorithm: 'sm2' | 'fsrs'
  mismatches: Array<{ field: SchedulingField; expected: unknown; actual: unknown }>
}

function readAlgorithmDiagnostics(): AlgorithmDiagnosticsEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.algorithmDiagnostics)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as AlgorithmDiagnosticsEntry[] : []
  } catch {
    return []
  }
}

function writeAlgorithmDiagnostics(entries: AlgorithmDiagnosticsEntry[]): void {
  localStorage.setItem(STORAGE_KEYS.algorithmDiagnostics, JSON.stringify(entries.slice(-30)))
}

export function getAlgorithmDiagnostics(): AlgorithmDiagnosticsEntry[] {
  return readAlgorithmDiagnostics()
}

export function clearAlgorithmDiagnostics(): void {
  localStorage.removeItem(STORAGE_KEYS.algorithmDiagnostics)
}

// Exported for internal use by reviews.ts; not part of the public query API.
export async function verifySchedulingPersistence(
  cardId: string,
  algorithm: 'sm2' | 'fsrs',
  expected: Partial<CardRecord>
): Promise<void> {
  if (!import.meta.env.DEV) return
  const persisted = await db.cards.get(cardId)
  if (!persisted) {
    console.warn('[recordReview][verify] card missing after update', { cardId })
    return
  }

  const mismatches: Array<{ field: SchedulingField; expected: unknown; actual: unknown }> = []
  for (const field of SCHEDULING_FIELDS) {
    if (!(field in expected)) continue
    const expectedValue = expected[field]
    const actualValue = persisted[field]
    if (expectedValue !== actualValue) {
      mismatches.push({ field, expected: expectedValue, actual: actualValue })
    }
  }

  if (mismatches.length > 0) {
    const previous = readAlgorithmDiagnostics()
    writeAlgorithmDiagnostics([
      ...previous,
      {
        timestamp: Date.now(),
        cardId,
        algorithm,
        mismatches,
      },
    ])
    console.warn('[recordReview][verify] scheduling persistence mismatch', {
      cardId,
      mismatches,
    })
  }
}
