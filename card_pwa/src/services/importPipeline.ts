/**
 * AI_CONTEXT:
 * Role: Import planning and execution pipeline; compares parsed cards to IndexedDB, builds duplicate/conflict plans, then writes decks/cards in chunks.
 * Used by: ImportModal after APKG/CSV/TXT parsing.
 * Important: noteId is the stable conflict key; skip/update/add decisions must preserve scheduling history unless the user chooses an overwrite path.
 */
import { db } from '../db'
import { enqueueSyncOperation } from './syncQueue'
import type { ParsedImport, ImportPlan, ImportConflict, ImportedCard } from '../utils/import/types'
import { DAY_MS } from '../utils/time'
import { chunkArray } from '../utils/array'

interface BuildPlanProgress {
  done: number
  total: number
}

interface ExecuteImportProgress {
  stage: 'decks' | 'add' | 'update'
  done: number
  total: number
}

const CHUNK_SIZE = 200

function normalizeImportedCard(card: ImportedCard, fallbackUpdatedAt: number): ImportedCard {
  const normalizedDue = Number.isFinite(Number(card.due))
    ? Math.max(0, Math.floor(Number(card.due)))
    : Math.floor(Date.now() / DAY_MS)

  const normalizedDueAt = Number.isFinite(Number(card.dueAt))
    ? Number(card.dueAt)
    : normalizedDue * DAY_MS

  return {
    ...card,
    due: normalizedDue,
    dueAt: normalizedDueAt,
    updatedAt: card.updatedAt ?? fallbackUpdatedAt,
  }
}

// ─── Duplikat-Prüfung ─────────────────────────────────────────────────────────

/**
 * Vergleicht einen neuen Import mit dem vorhandenen DB-Stand.
 * Gibt einen ImportPlan zurück:
 * - toAdd:      neue Karten (noteId unbekannt)
 * - conflicts:  noteId bekannt, aber Inhalt geändert → User muss entscheiden
 * - toSkip:     exakte Duplikate (kein Handlungsbedarf)
 *
 * CONFLICT RESOLUTION KEY (Issue #9):
 * `noteId` is the authoritative unique identifier for both APKG and CSV imports.
 * – APKG: noteId = Anki's GUID field (stable across Anki exports).
 * – CSV:  noteId is derived from a hash of the `front` text at parse time
 *         (see csvImporter.ts) so that re-importing the same CSV rows is
 *         idempotent and never silently overwrites learning history.
 * Cards that share a noteId but have different front/back are presented to the
 * user as conflicts; existing scheduling data is preserved on skip.
 */
export async function buildImportPlan(
  parsed: ParsedImport,
  onProgress?: (progress: BuildPlanProgress) => void
): Promise<ImportPlan> {
  const noteIds = parsed.cards.map(c => c.noteId)

  // Alle existierenden Karten mit diesen noteIds aus DB laden
  const existing = await db.cards
    .where('noteId')
    .anyOf(noteIds)
    .toArray()
    .then(cards => cards.filter(c => !c.isDeleted))

  const existingByNoteId = new Map(existing.map(c => [c.noteId, c]))

  // Decks prüfen welche neu sind
  const existingDeckIds = new Set(
    (await db.decks.toArray()).map(d => d.id)
  )
  const newDecks = parsed.decks.filter(d => !existingDeckIds.has(d.id))
  const deckNameById = new Map(parsed.decks.map(d => [d.id, d.name]))

  const toAdd: ImportedCard[]       = []
  const conflicts: ImportConflict[] = []
  const toSkip: ImportedCard[]      = []

  for (let index = 0; index < parsed.cards.length; index++) {
    const card = parsed.cards[index]
    const found = existingByNoteId.get(card.noteId)

    if (!found) {
      toAdd.push(card)
    } else {
      const frontChanged     = found.front !== card.front
      const backChanged      = found.back  !== card.back
      const tagsChanged      = JSON.stringify(found.tags ?? []) !== JSON.stringify(card.tags ?? [])
      const algorithmChanged = (found.algorithm ?? 'sm2') !== (card.algorithm ?? 'sm2')

      if (!frontChanged && !backChanged && !tagsChanged && !algorithmChanged) {
        toSkip.push(card)
      } else {
        const deckName = deckNameById.get(card.deckId) ?? card.deckId
        conflicts.push({
          noteId:   card.noteId,
          cardId:   card.id,
          deckName,
          existing: { front: found.front, back: found.back },
          incoming: { front: card.front,  back: card.back  },
          existingTags: found.tags ?? [],
          incomingTags: card.tags ?? [],
        })
      }
    }

    if (onProgress && (index % 50 === 0 || index === parsed.cards.length - 1)) {
      onProgress({ done: index + 1, total: parsed.cards.length })
    }
  }

  if (onProgress && parsed.cards.length === 0) {
    onProgress({ done: 0, total: 0 })
  }

  return {
    toAdd,
    toUpdate:  [],   // wird nach User-Bestätigung befüllt
    toSkip,
    conflicts,
    newDecks,
    sourceName: parsed.sourceName,
  }
}

// ─── Import ausführen ─────────────────────────────────────────────────────────

export interface ImportResult {
  added:   number
  updated: number
  skipped: number
}

/**
 * Bestätigte Konflikt-Updates übernehmen NUR Inhalt (front/back/tags/extra) —
 * nie den Lernzustand: queue/due/interval/reps/lapses/… bleiben unangetastet,
 * sonst setzt ein Re-Import einer überarbeiteten Quelle den Fortschritt zurück.
 */
function buildContentOnlyCardUpdate(card: ImportedCard, importedAt: number) {
  return {
    front: card.front,
    back:  card.back,
    tags:  card.tags,
    extra: card.extra,
    updatedAt: importedAt,
  }
}

/**
 * Sync-Ops für einen ausgeführten ImportPlan einqueuen (außerhalb der Dexie-
 * Transaktion – eigene syncQueue-DB). Fehler beim Enqueue dürfen den Import
 * nicht rückgängig machen – Karten sind bereits in IndexedDB. Der Sync wird
 * beim nächsten Flush-Zyklus nachgeholt.
 */
async function enqueueImportSyncOps(
  plan: ImportPlan,
  importedAt: number,
  normalizedToAdd: ImportedCard[],
  normalizedToUpdate: ImportedCard[],
): Promise<void> {
  try {
    await Promise.all([
      ...plan.newDecks.map(deck =>
        enqueueSyncOperation('deck.create', {
          id: deck.id,
          name: deck.name,
          parentDeckId: deck.parentDeckId ?? null,
          createdAt: deck.createdAt,
          updatedAt: deck.updatedAt ?? importedAt,
          source: deck.source ?? 'import',
        })
      ),
      ...normalizedToAdd.map(card => enqueueSyncOperation('card.create', { ...card })),
      ...normalizedToUpdate.map(card =>
        enqueueSyncOperation('card.update', {
          cardId: card.id,
          updates: buildContentOnlyCardUpdate(card, importedAt),
          timestamp: importedAt,
        })
      ),
    ])
  } catch (e) {
    console.warn('[ImportPipeline] Sync-Enqueue fehlgeschlagen, wird beim nächsten Flush wiederholt:', e)
  }
}

export async function executeImportWithProgress(
  plan: ImportPlan,
  onProgress?: (progress: ExecuteImportProgress) => void
): Promise<ImportResult> {
  const importedAt = Date.now()
  const normalizedToAdd = plan.toAdd.map(card => normalizeImportedCard(card, importedAt))
  const normalizedToUpdate = plan.toUpdate.map(card => normalizeImportedCard(card, importedAt))

  await db.transaction('rw', db.decks, db.cards, async () => {
    if (plan.newDecks.length) {
      await db.decks.bulkPut(plan.newDecks)
      onProgress?.({ stage: 'decks', done: plan.newDecks.length, total: plan.newDecks.length })
    } else {
      onProgress?.({ stage: 'decks', done: 0, total: 0 })
    }

    if (normalizedToAdd.length) {
      let done = 0
      for (const chunk of chunkArray(normalizedToAdd, CHUNK_SIZE)) {
        await db.cards.bulkAdd(chunk)
        done += chunk.length
        onProgress?.({ stage: 'add', done, total: normalizedToAdd.length })
      }
    } else {
      onProgress?.({ stage: 'add', done: 0, total: 0 })
    }

    if (normalizedToUpdate.length) {
      let done = 0
      for (const chunk of chunkArray(normalizedToUpdate, CHUNK_SIZE)) {
        await Promise.all(
          chunk.map(card =>
            db.cards.where('noteId').equals(card.noteId).modify(
              buildContentOnlyCardUpdate(card, importedAt)
            )
          )
        )
        done += chunk.length
        onProgress?.({ stage: 'update', done, total: normalizedToUpdate.length })
      }
    } else {
      onProgress?.({ stage: 'update', done: 0, total: 0 })
    }
  })

  await enqueueImportSyncOps(plan, importedAt, normalizedToAdd, normalizedToUpdate)

  return {
    added: plan.toAdd.length,
    updated: plan.toUpdate.length,
    skipped: plan.toSkip.length,
  }
}
