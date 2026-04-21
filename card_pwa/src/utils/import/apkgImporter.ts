import JSZip from 'jszip'
import { decompress as zstdDecompress } from '../../vendor/fzstd'
import type { Algorithm, Language } from '../../contexts/SettingsContext'
import type { ParsedImport, ImportedCard, ImportedDeck } from './types'
import { SM2 } from '../sm2'
import { normalizeImportedMcCard } from './mcNormalizer'

// ─── Anki Internal Types ─────────────────────────────────────────────────────

// Old schema (anki2 / anki21): decks + models stored as JSON in col table
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

// ─── HTML / Text Utilities ───────────────────────────────────────────────────

function stripHtml(str: string): string {
  if (!str) return ''
  try {
    // Preserve structural whitespace before handing off to the parser
    const pre = str
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, '[img:$1]')
    const doc = new DOMParser().parseFromString(pre, 'text/html')
    return (doc.body.textContent ?? '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  } catch {
    // Fallback for non-browser environments (e.g. unit tests via jsdom without DOMParser)
    return str.replace(/<[^>]*>/g, '').trim()
  }
}

function extractExtra(fieldMap: Record<string, string>) {
  return {
    acronym:  stripHtml(fieldMap['Acronym']  || ''),
    examples: stripHtml(fieldMap['Examples'] || ''),
    port:     stripHtml(fieldMap['Port']     || ''),
    protocol: stripHtml(fieldMap['Protocol'] || ''),
  }
}

function buildFieldMap(fieldNames: string[], flds: string): Record<string, string> {
  const values = flds.split('\x1f')
  const map: Record<string, string> = {}
  fieldNames.forEach((name, i) => { map[name] = values[i] || '' })
  return map
}

function pickFirstNonEmptyField(fieldMap: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = fieldMap[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }
  return ''
}

function getNonEmptyValues(values: string[]): string[] {
  return values.map(v => v.trim()).filter(Boolean)
}

function extractFrontBack(fieldMap: Record<string, string>, values: string[]) {
  const nonEmptyValues = getNonEmptyValues(values)

  const frontRaw = pickFirstNonEmptyField(fieldMap, [
    'Front',
    'Vorderseite',
    'Question',
    'Frage',
    'Keyword',
    'Prompt',
    'Text', // Cloze note type
  ]) || nonEmptyValues[0] || ''

  const backRaw = pickFirstNonEmptyField(fieldMap, [
    'Back',
    'Rückseite',
    'Answer',
    'Antwort',
    'Definition',
    'Back Extra',
    'Extra', // Cloze note type
    'Explanation',
  ]) || nonEmptyValues[1] || ''

  const front = stripHtml(frontRaw)
  const back = stripHtml(backRaw)
  return { front, back }
}

// ─── zstd Decompression ──────────────────────────────────────────────────────

// Magic bytes: 0x28B52FFD (little-endian in file = FD 2F B5 28)
function isZstd(data: ArrayBuffer): boolean {
  const view = new DataView(data)
  // zstd frame magic = 0xFD2FB528 stored as little-endian → bytes: 28 B5 2F FD
  return view.byteLength >= 4 && view.getUint32(0, true) === 0xFD2FB528
}

function decompressZstd(data: ArrayBuffer): ArrayBuffer {
  const input = new Uint8Array(data)
  const output = zstdDecompress(input, null)
  return output.buffer
}

async function decompressZstdInWorker(data: ArrayBuffer): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/decompression.worker.ts', import.meta.url), {
      type: 'module',
    })

    const cleanup = () => {
      worker.onmessage = null
      worker.onerror = null
      worker.terminate()
    }

    worker.onmessage = (event: MessageEvent<{ ok: boolean; buffer?: ArrayBuffer; error?: string }>) => {
      if (event.data.ok && event.data.buffer) {
        const result = event.data.buffer
        cleanup()
        resolve(result)
        return
      }

      cleanup()
      reject(new Error(event.data.error || 'Worker decompression failed'))
    }

    worker.onerror = () => {
      cleanup()
      reject(new Error('Worker decompression failed'))
    }

    // Do not transfer ownership of the original buffer.
    // Some mobile browsers can fail worker startup, and fallback needs the original data intact.
    worker.postMessage(data)
  })
}

async function decompressZstdSafe(data: ArrayBuffer): Promise<ArrayBuffer> {
  if (typeof Worker === 'undefined') {
    return decompressZstd(data)
  }

  try {
    return await decompressZstdInWorker(data)
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[APKG] Worker decompression unavailable, using main-thread fallback.', error)
    }
    return decompressZstd(data)
  }
}

// ─── SQLite → Structured Data ────────────────────────────────────────────────

async function initSqlJs() {
  const sqlModule = await import('sql.js')
  const initFn = (sqlModule as { default?: unknown }).default ?? sqlModule
  const SQL = await (initFn as CallableFunction)({
    locateFile: () => '/sql-wasm.wasm',
  })
  return SQL
}

async function readAnkiSQLite(rawData: ArrayBuffer, language: Language, algorithm: Algorithm): Promise<{
  decks: ImportedDeck[]
  cards: ImportedCard[]
}> {
  // Decompress if zstd-compressed (collection.anki21b format)
  const data = isZstd(rawData) ? await decompressZstdSafe(rawData) : rawData

  const SQL = await initSqlJs()
  const db = new SQL.Database(new Uint8Array(data))

  // ── Detect schema: new (separate tables) vs old (JSON in col) ──────────────
  const tableResult = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='notetypes'"
  )
  const hasNewSchema = tableResult.length > 0 && tableResult[0].values.length > 0

  let deckMap: Record<string, ImportedDeck>
  let modelFields: Record<string, string[]>  // mid → ordered field names

  if (hasNewSchema) {
    // ── NEW SCHEMA (Anki 2.1.x / anki21b) ────────────────────────────────────
    // Decks from dedicated table
    const decksResult = db.exec('SELECT id, name FROM decks')
    deckMap = {}
    const EXCLUDED = new Set(['Default', 'Standard'])
    if (decksResult.length) {
      for (const row of decksResult[0].values) {
        const [id, name] = row as [number, string]
        if (EXCLUDED.has(name)) continue
        deckMap[String(id)] = {
          id: String(id),
          name,
          createdAt: Date.now(),
          source: 'anki-import',
        }
      }
    }

    // Fields from dedicated table: ntid + ord + name
    const fieldsResult = db.exec('SELECT ntid, ord, name FROM fields ORDER BY ntid, ord')
    modelFields = {}
    if (fieldsResult.length) {
      for (const row of fieldsResult[0].values) {
        const [ntid, , name] = row as [number, number, string]
        const key = String(ntid)
        if (!modelFields[key]) modelFields[key] = []
        modelFields[key].push(name as string)
      }
    }
  } else {
    // ── OLD SCHEMA (anki2 / anki21) ───────────────────────────────────────────
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
    const EXCLUDED = new Set(['Default', 'Standard'])
    for (const [, deck] of Object.entries(rawDecks)) {
      if (EXCLUDED.has(deck.name)) continue
      const id = String(deck.id)
      deckMap[id] = { id, name: deck.name, createdAt: Date.now(), source: 'anki-import' }
    }

    modelFields = {}
    for (const [mid, model] of Object.entries(rawModels)) {
      const sorted = (model.flds || []).sort((a, b) => a.ord - b.ord)
      modelFields[mid] = sorted.map(f => f.name)
    }
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  const notesResult = db.exec('SELECT id, guid, mid, flds, tags FROM notes')
  const noteMap: Record<number, { id: number; guid: string; mid: number; flds: string; tags: string }> = {}
  if (notesResult.length) {
    for (const row of notesResult[0].values) {
      const [id, guid, mid, flds, tags] = row as [number, string, number, string, string]
      noteMap[id] = { id, guid, mid, flds, tags }
    }
  }

  // ── Cards ─────────────────────────────────────────────────────────────────
  const cardsResult = db.exec(
    'SELECT id, nid, did, type, queue, due, ivl, factor, reps, lapses FROM cards'
  )

  const cards: ImportedCard[] = []
  const now = Date.now()

  if (cardsResult.length) {
    for (const row of cardsResult[0].values) {
      const [id, nid, did, type, queue, due, ivl, factor, reps, lapses] =
        row as [number, number, number, number, number, number, number, number, number, number]

      const note = noteMap[nid]
      if (!note) continue

      const deckId = String(did)
      if (!deckMap[deckId]) continue  // skip cards from excluded/unknown decks

      const fieldNames = modelFields[String(note.mid)] || []
      const fieldMap = buildFieldMap(fieldNames, note.flds)
      const values = note.flds.split('\x1f')
      const { front: rawFront, back: rawBack } = extractFrontBack(fieldMap, values)
      const { front, back } = normalizeImportedMcCard(rawFront, rawBack)

      if (!front && !back) continue  // skip empty cards

      const baseFactor = factor > 0 ? factor : SM2.DEFAULT_EASE
      const fsrsDifficulty = Math.max(1, Math.min(10, baseFactor / 500))
      const fsrsStability = Math.max(0.5, ivl || 1)

      cards.push({
        id:       String(id),
        noteId:   note.guid,
        deckId,
        front,
        back,
        tags:     (note.tags || '').trim().split(/\s+/).filter(Boolean),
        extra:    extractExtra(fieldMap),
        type,
        queue,
        due,
        interval: ivl,
        factor:   algorithm === 'fsrs' ? Math.round(fsrsDifficulty * 500) : baseFactor,
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

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parst eine .apkg oder .colpkg Datei und gibt strukturierte Daten zurück.
 *
 * Unterstützte Formate:
 *  - collection.anki21b  (Anki 2.1.50+, zstd-komprimiert, neue Schema-Version)
 *  - collection.anki21   (Anki 2.1.x, plain SQLite, altes Schema)
 *  - collection.anki2    (Anki 2.0, plain SQLite, altes Schema)
 */
export async function parseApkg(
  file: File,
  language: Language = 'de',
  algorithm: Algorithm = 'sm2'
): Promise<ParsedImport> {
  const zip = await JSZip.loadAsync(file)

  // Priority: anki21b > anki21 > anki2
  const dbFile =
    zip.file('collection.anki21b') ||
    zip.file('collection.anki21') ||
    zip.file('collection.anki2')

  if (!dbFile) {
    throw new Error(
      language === 'de'
        ? 'Keine Anki-Datenbank gefunden. Erwartet: collection.anki21b, collection.anki21 oder collection.anki2'
        : 'No Anki database found. Expected: collection.anki21b, collection.anki21, or collection.anki2'
    )
  }

  const dbData = await dbFile.async('arraybuffer')
  const { decks, cards } = await readAnkiSQLite(dbData, language, algorithm)

  const format = file.name.endsWith('.colpkg') ? 'colpkg' : 'apkg'

  return {
    decks,
    cards,
    format,
    sourceName: file.name,
  }
}
