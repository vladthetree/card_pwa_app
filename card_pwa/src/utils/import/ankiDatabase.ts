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
    locateFile: () => '/sql-wasm.wasm',
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

      cards.push({
        id: String(id),
        noteId: note.guid,
        deckId,
        front,
        back,
        tags: (note.tags || '').trim().split(/\s+/).filter(Boolean),
        extra: extractExtra(fieldMap),
        type,
        queue,
        due,
        interval: ivl,
        factor: algorithm === 'fsrs' ? Math.round(fsrsDifficulty * 500) : baseFactor,
        stability: algorithm === 'fsrs' ? fsrsStability : undefined,
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
