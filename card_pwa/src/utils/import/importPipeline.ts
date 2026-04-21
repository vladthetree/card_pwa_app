import { db } from '../../db'
import { enqueueSyncOperation } from '../../services/syncQueue'
import type { ParsedImport, ImportPlan, ImportConflict, ImportedCard } from './types'

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
const DAY_MS = 86_400_000

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
        const deckName = parsed.decks.find(d => d.id === card.deckId)?.name ?? card.deckId
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
 * Schreibt den bestätigten ImportPlan in IndexedDB.
 * Neue Decks werden angelegt, Karten werden bulk-inserted / updated.
 */
export async function executeImport(plan: ImportPlan): Promise<ImportResult> {
  const importedAt = Date.now()
  const normalizedToAdd = plan.toAdd.map(card => normalizeImportedCard(card, importedAt))
  const normalizedToUpdate = plan.toUpdate.map(card => normalizeImportedCard(card, importedAt))

  await db.transaction('rw', db.decks, db.cards, async () => {
    // Neue Decks anlegen
    if (plan.newDecks.length) {
      await db.decks.bulkPut(plan.newDecks)
    }

    // Neue Karten hinzufügen
    if (normalizedToAdd.length) {
      await db.cards.bulkAdd(normalizedToAdd)
    }

    // Aktualisierungen (vom User bestätigt)
    for (const card of normalizedToUpdate) {
      await db.cards.where('noteId').equals(card.noteId).modify({
        front:    card.front,
        back:     card.back,
        tags:     card.tags,
        extra:    card.extra,
        type:     card.type,
        queue:    card.queue,
        due:      card.due,
        dueAt:    card.dueAt,
        interval: card.interval,
        factor:   card.factor,
        stability: card.stability,
        difficulty: card.difficulty,
        reps:     card.reps,
        lapses:   card.lapses,
        algorithm: card.algorithm,
      })
    }
  })

  // Sync-Ops einqueueen (außerhalb der Dexie-Transaktion – eigene syncQueue-DB).
  // Fehler beim Enqueue dürfen den Import nicht rückgängig machen – Karten sind
  // bereits in IndexedDB. Der Sync wird beim nächsten Flush-Zyklus nachgeholt.
  try {
    await Promise.all([
      ...plan.newDecks.map(deck =>
        enqueueSyncOperation('deck.create', {
          id: deck.id,
          name: deck.name,
          createdAt: deck.createdAt,
          updatedAt: deck.updatedAt ?? importedAt,
          source: deck.source ?? 'import',
        })
      ),
      ...normalizedToAdd.map(card => enqueueSyncOperation('card.create', { ...card })),
      ...normalizedToUpdate.map(card =>
        enqueueSyncOperation('card.update', {
          cardId: card.id,
          updates: {
            front: card.front,
            back: card.back,
            tags: card.tags,
            extra: card.extra,
            type: card.type,
            queue: card.queue,
            due: card.due,
            dueAt: card.dueAt,
            interval: card.interval,
            factor: card.factor,
            stability: card.stability,
            difficulty: card.difficulty,
            reps: card.reps,
            lapses: card.lapses,
            algorithm: card.algorithm,
            updatedAt: importedAt,
          },
          timestamp: importedAt,
        })
      ),
    ])
  } catch (e) {
    console.warn('[ImportPipeline] Sync-Enqueue fehlgeschlagen, wird beim nächsten Flush wiederholt:', e)
  }

  return {
    added:   plan.toAdd.length,
    updated: plan.toUpdate.length,
    skipped: plan.toSkip.length,
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
      for (let i = 0; i < normalizedToAdd.length; i += CHUNK_SIZE) {
        const chunk = normalizedToAdd.slice(i, i + CHUNK_SIZE)
        await db.cards.bulkAdd(chunk)
        onProgress?.({
          stage: 'add',
          done: Math.min(i + chunk.length, normalizedToAdd.length),
          total: normalizedToAdd.length,
        })
      }
    } else {
      onProgress?.({ stage: 'add', done: 0, total: 0 })
    }

    if (normalizedToUpdate.length) {
      for (let i = 0; i < normalizedToUpdate.length; i += CHUNK_SIZE) {
        const chunk = normalizedToUpdate.slice(i, i + CHUNK_SIZE)
        await Promise.all(
          chunk.map(card =>
            db.cards.where('noteId').equals(card.noteId).modify({
              front: card.front,
              back: card.back,
              tags: card.tags,
              extra: card.extra,
              type: card.type,
              queue: card.queue,
              due: card.due,
              dueAt: card.dueAt,
              interval: card.interval,
              factor: card.factor,
              stability: card.stability,
              difficulty: card.difficulty,
              reps: card.reps,
              lapses: card.lapses,
              algorithm: card.algorithm,
            })
          )
        )
        onProgress?.({
          stage: 'update',
          done: Math.min(i + chunk.length, normalizedToUpdate.length),
          total: normalizedToUpdate.length,
        })
      }
    } else {
      onProgress?.({ stage: 'update', done: 0, total: 0 })
    }
  })

  // Sync-Ops einqueueen (außerhalb der Dexie-Transaktion – eigene syncQueue-DB).
  // Fehler beim Enqueue dürfen den Import nicht rückgängig machen – Karten sind
  // bereits in IndexedDB. Der Sync wird beim nächsten Flush-Zyklus nachgeholt.
  try {
    await Promise.all([
      ...plan.newDecks.map(deck =>
        enqueueSyncOperation('deck.create', {
          id: deck.id,
          name: deck.name,
          createdAt: deck.createdAt,
          updatedAt: deck.updatedAt ?? importedAt,
          source: deck.source ?? 'import',
        })
      ),
      ...normalizedToAdd.map(card => enqueueSyncOperation('card.create', { ...card })),
      ...normalizedToUpdate.map(card =>
        enqueueSyncOperation('card.update', {
          cardId: card.id,
          updates: {
            front: card.front,
            back: card.back,
            tags: card.tags,
            extra: card.extra,
            type: card.type,
            queue: card.queue,
            due: card.due,
            dueAt: card.dueAt,
            interval: card.interval,
            factor: card.factor,
            stability: card.stability,
            difficulty: card.difficulty,
            reps: card.reps,
            lapses: card.lapses,
            algorithm: card.algorithm,
            updatedAt: importedAt,
          },
          timestamp: importedAt,
        })
      ),
    ])
  } catch (e) {
    console.warn('[ImportPipeline] Sync-Enqueue fehlgeschlagen, wird beim nächsten Flush wiederholt:', e)
  }

  return {
    added: plan.toAdd.length,
    updated: plan.toUpdate.length,
    skipped: plan.toSkip.length,
  }
}
