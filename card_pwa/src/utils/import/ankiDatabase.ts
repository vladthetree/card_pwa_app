/**
 * AI_CONTEXT: Import utility for anki Database; parses or normalizes external Anki/CSV/APKG data into app card structures.
 */
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { decompress as zstdDecompress } from '../../vendor/fzstd'
import type { Algorithm, Language } from '../../contexts/SettingsContext'
import type { ImportedCard, ImportedDeck } from './types'
import { SM2 } from '../sm2'
import { normalizeImportedMcCard } from './mcNormalizer'
import { buildFieldMap, extractExtra, extractFrontBack } from './ankiFields'

interface AnkiDeckOld {
  id: string | number
  name: string
}

interface AnkiFieldOld {
  name: string
  ord: number
}

interface AnkiModelOld {
  id: string | number
  name: string
  flds: AnkiFieldOld[]
}

const DAY_MS = 86_400_000

export interface NormalizedAnkiSchedule {
  type: number
  queue: number
  due: number
  dueAt: number
  interval: number
  learningStep: number
}

/** Translate Anki's queue-dependent overloaded `cards.due` into app time. */
export function normalizeAnkiSchedule(input: {
  type: number
  queue: number
  due: number
  interval: number
  collectionCreatedAtMs: number
  nowMs: number
}): NormalizedAnkiSchedule {
  const ankiType = Math.max(0, Math.min(3, Math.round(Number(input.type) || 0)))
  const ankiQueue = Math.round(Number(input.queue) || 0)
  const rawDue = Math.max(0, Math.floor(Number(input.due) || 0))
  // Only -1 is suspended. -2/-3 are temporary buried queues and should become
  // studyable again after import because this app has no day-bury state.
  const suspended = ankiQueue === -1
  let type = ankiType
  let queue = suspended ? -1 : Math.max(0, Math.min(2, ankiType))
  let dueAt = input.nowMs
  let interval = Math.max(0, Math.floor(Number(input.interval) || 0))

  if (ankiQueue === 1 || ankiQueue === 4) {
    // Intraday learning/preview queues store Unix epoch seconds.
    type = ankiType === 3 ? 3 : 1
    queue = suspended ? -1 : 1
    dueAt = rawDue > 0 ? rawDue * 1000 : input.nowMs
    interval = 0
  } else if (ankiQueue === 2 || ankiQueue === 3 || ankiType === 2 || ankiType === 3) {
    // Review and interday learning store scheduler days since col.crt.
    type = ankiQueue === 3 || ankiType === 1 ? 1 : ankiType === 3 ? 3 : 2
    queue = suspended ? -1 : type === 2 ? 2 : 1
    dueAt = Math.max(0, input.collectionCreatedAtMs + rawDue * DAY_MS)
    interval = type === 2 ? Math.max(1, interval) : interval
  } else {
    // New-card `due` is a queue position, not a timestamp. Preserve its order
    // as a tiny offset while making the card immediately available.
    type = 0
    queue = suspended ? -1 : 0
    dueAt = input.nowMs + Math.min(rawDue, DAY_MS - 1)
    interval = 0
  }

  return {
    type,
    queue,
    due: Math.max(0, Math.floor(dueAt / DAY_MS)),
    dueAt,
    interval,
    learningStep: 0,
  }
}

function isZstd(data: ArrayBuffer): boolean {
  const view = new DataView(data)
  return view.byteLength >= 4 && view.getUint32(0, true) === 0xFD2FB528
}

function decompressZstd(data: ArrayBuffer): ArrayBuffer {
  const input = new Uint8Array(data)
  const output = zstdDecompress(input, null)
  return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength)
}

async function initSqlJs() {
  const sqlModule = await import('sql.js')
  const initFn = (sqlModule as { default?: unknown }).default ?? sqlModule
  const SQL = await (initFn as CallableFunction)({
    locateFile: () => sqlWasmUrl,
  })
  return SQL
}

export async function readAnkiSQLite(rawData: ArrayBuffer, language: Language, algorithm: Algorithm): Promise<{
  decks: ImportedDeck[]
  cards: ImportedCard[]
}> {
  const data = isZstd(rawData) ? decompressZstd(rawData) : rawData

  const SQL = await initSqlJs()
  const db = new SQL.Database(new Uint8Array(data))

  const tableResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='notetypes'")
  const hasNewSchema = tableResult.length > 0 && tableResult[0].values.length > 0

  let deckMap: Record<string, ImportedDeck>
  let modelFields: Record<string, string[]>

  if (hasNewSchema) {
    const decksResult = db.exec('SELECT id, name FROM decks')
    deckMap = {}
    const excluded = new Set(['Default', 'Standard'])
    if (decksResult.length) {
      for (const row of decksResult[0].values) {
        const [id, name] = row as [number, string]
        if (excluded.has(name)) continue
        deckMap[String(id)] = {
          id: String(id),
          name,
          createdAt: Date.now(),
          source: 'anki-import',
        }
      }
    }

    const fieldsResult = db.exec('SELECT ntid, ord, name FROM fields ORDER BY ntid, ord')
    modelFields = {}
    if (fieldsResult.length) {
      for (const row of fieldsResult[0].values) {
        const [ntid, , name] = row as [number, number, string]
        const key = String(ntid)
        if (!modelFields[key]) modelFields[key] = []
        modelFields[key].push(name)
      }
    }
  } else {
    const colResult = db.exec('SELECT decks, models FROM col LIMIT 1')
    if (!colResult.length || !colResult[0].values.length) {
      throw new Error(language === 'de' ? 'Ungültige Anki-Datenbank: col-Tabelle fehlt' : 'Invalid Anki database: col table is missing')
    }

    const [decksJson, modelsJson] = colResult[0].values[0] as [string, string]
    if (!decksJson || !modelsJson) {
      throw new Error(language === 'de' ? 'Anki-Datenbank: col.decks oder col.models ist leer' : 'Anki database: col.decks or col.models is empty')
    }

    const rawDecks: Record<string, AnkiDeckOld> = JSON.parse(decksJson)
    const rawModels: Record<string, AnkiModelOld> = JSON.parse(modelsJson)

    deckMap = {}
    const excluded = new Set(['Default', 'Standard'])
    for (const [, deck] of Object.entries(rawDecks)) {
      if (excluded.has(deck.name)) continue
      const id = String(deck.id)
      deckMap[id] = { id, name: deck.name, createdAt: Date.now(), source: 'anki-import' }
    }

    modelFields = {}
    for (const [mid, model] of Object.entries(rawModels)) {
      const sorted = (model.flds || []).sort((a, b) => a.ord - b.ord)
      modelFields[mid] = sorted.map(f => f.name)
    }
  }

  const notesResult = db.exec('SELECT id, guid, mid, flds, tags FROM notes')
  const noteMap: Record<number, { id: number; guid: string; mid: number; flds: string; tags: string }> = {}
  if (notesResult.length) {
    for (const row of notesResult[0].values) {
      const [id, guid, mid, flds, tags] = row as [number, string, number, string, string]
      noteMap[id] = { id, guid, mid, flds, tags }
    }
  }

  const collectionResult = db.exec('SELECT crt FROM col LIMIT 1')
  const collectionCreatedAtMs = collectionResult.length && collectionResult[0].values.length
    ? Math.max(0, Number(collectionResult[0].values[0][0]) * 1000)
    : Date.now()
  const lastReviewByCard = new Map<number, number>()
  const revlogResult = db.exec('SELECT cid, MAX(id) FROM revlog GROUP BY cid')
  if (revlogResult.length) {
    for (const row of revlogResult[0].values) {
      const [cardId, timestamp] = row as [number, number]
      if (Number.isFinite(timestamp)) lastReviewByCard.set(cardId, timestamp)
    }
  }

  const cardsResult = db.exec('SELECT id, nid, did, type, queue, due, ivl, factor, reps, lapses FROM cards')
  const cards: ImportedCard[] = []
  const now = Date.now()

  if (cardsResult.length) {
    for (const row of cardsResult[0].values) {
      const [id, nid, did, type, queue, due, ivl, factor, reps, lapses] =
        row as [number, number, number, number, number, number, number, number, number, number]

      const note = noteMap[nid]
      if (!note) continue

      const deckId = String(did)
      if (!deckMap[deckId]) continue

      const fieldNames = modelFields[String(note.mid)] || []
      const fieldMap = buildFieldMap(fieldNames, note.flds)
      const values = note.flds.split('\x1f')
      const { front: rawFront, back: rawBack } = extractFrontBack(fieldMap, values)
      const { front, back } = normalizeImportedMcCard(rawFront, rawBack)

      if (!front && !back) continue

      const baseFactor = factor > 0 ? factor : SM2.DEFAULT_EASE
      const fsrsDifficulty = Math.max(1, Math.min(10, baseFactor / 500))
      const fsrsStability = Math.max(0.5, ivl || 1)
      const schedule = normalizeAnkiSchedule({
        type,
        queue,
        due,
        interval: ivl,
        collectionCreatedAtMs,
        nowMs: now,
      })

      cards.push({
        id: String(id),
        noteId: note.guid,
        deckId,
        front,
        back,
        tags: (note.tags || '').trim().split(/\s+/).filter(Boolean),
        extra: extractExtra(fieldMap),
        type: schedule.type,
        queue: schedule.queue,
        due: schedule.due,
        dueAt: schedule.dueAt,
        learningStep: schedule.learningStep,
        lastReviewedAt: lastReviewByCard.get(id),
        interval: schedule.interval,
        factor: algorithm === 'fsrs' ? Math.round(fsrsDifficulty * 500) : baseFactor,
        stability: algorithm === 'fsrs' ? Math.max(0.5, schedule.interval || fsrsStability) : undefined,
        difficulty: algorithm === 'fsrs' ? fsrsDifficulty : undefined,
        reps,
        lapses,
        algorithm,
        createdAt: now,
      })
    }
  }

  db.close()

  return {
    decks: Object.values(deckMap),
    cards,
  }
}
