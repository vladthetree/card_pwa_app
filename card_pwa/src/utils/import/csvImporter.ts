import Papa from 'papaparse'
import type { Algorithm, Language } from '../../contexts/SettingsContext'
import type { ParsedImport, ImportedCard, ImportedDeck } from './types'
import { SM2 } from '../sm2'
import { decodeTxtMetadata } from '../dbBackup'
import { normalizeImportedMcCard } from './mcNormalizer'
import { generateUuidV7 } from '../id'

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const CSV_WORKER_THRESHOLD_BYTES = 500 * 1024

function generateId(): string {
  return generateUuidV7()
}

async function parseCsvInWorker(
  fileName: string,
  text: string,
  language: Language,
  algorithm: Algorithm,
): Promise<ParsedImport> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/csv-import.worker.ts', import.meta.url), {
      type: 'module',
    })

    const cleanup = () => {
      worker.onmessage = null
      worker.onerror = null
      worker.terminate()
    }

    worker.onmessage = (event: MessageEvent<{ ok: boolean; result?: ParsedImport; error?: string }>) => {
      cleanup()
      if (event.data.ok && event.data.result) {
        resolve(event.data.result)
        return
      }
      reject(new Error(event.data.error || 'CSV worker parsing failed'))
    }

    worker.onerror = () => {
      cleanup()
      reject(new Error('CSV worker parsing failed'))
    }

    worker.postMessage({ fileName, text, language, algorithm })
  })
}

function stripHtml(str: string): string {
  if (!str) return ''
  return str.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

// ─── Anki Text/CSV Export Format ─────────────────────────────────────────────
//
// Anki exportiert TXT als Tab-separiert, mit optionalem Header:
//   #separator:tab
//   #html:true
//   #deck:Mein Deck
//   #notetype:Basic
// Danach folgen Zeilen: front\tback[\ttags]
//
// CSV (mit Komma oder Semikolon) wird von PapaParse auto-erkannt.

interface AnkiTxtMeta {
  separator: string
  deckName: string | null
  htmlEnabled: boolean
}

interface ParsedMcBlock {
  front: string
  back: string
}

function indexToLabel(index: number): string {
  let n = index
  let result = ''
  do {
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return result
}

function splitTxtIntoBlocks(lines: string[]): string[] {
  const blocks: string[] = []
  let current: string[] = []
  let blankStreak = 0

  const flush = () => {
    const block = current.join('\n').trim()
    if (block) blocks.push(block)
    current = []
    blankStreak = 0
  }

  for (const line of lines) {
    if (!line.trim()) {
      blankStreak += 1
      if (blankStreak >= 2) {
        if (current.length > 0) flush()
      } else if (current.length > 0) {
        // Eine einzelne Leerzeile bleibt innerhalb derselben Karte erlaubt.
        current.push('')
      }
      continue
    }
    blankStreak = 0
    current.push(line)
  }

  flush()
  return blocks
}

function normalizeMcOptionLine(line: string): { label: string; text: string } | null {
  const match = line.trim().match(/^([A-Za-z])\s*[:\)\.\->]\s*(.+)$/)
  if (!match) return null
  return {
    label: match[1].toUpperCase(),
    text: match[2].trim(),
  }
}

function parseCorrectTokens(raw: string): string[] {
  return raw
    .split(/[\s,;/|]+/)
    .map(token => token.trim().toUpperCase())
    .filter(Boolean)
}

function parseLooseMcBlock(input: string): ParsedMcBlock | null {
  const rawLines = input
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  if (rawLines.length < 3) return null

  const optionMap = new Map<string, string>()
  let questionLines: string[] = []
  let correctTokens: string[] = []
  let wrongHint: string | null = null
  let reminder: string | null = null
  let freeBackLines: string[] = []

  for (const line of rawLines) {
    const opt = normalizeMcOptionLine(line)
    if (opt) {
      optionMap.set(opt.label, opt.text)
      continue
    }

    const correctMatch = line.match(/^\s*(?:Richtig|Correct)\s*[:>]\s*(.+)$/i)
    if (correctMatch) {
      correctTokens = parseCorrectTokens(correctMatch[1])
      continue
    }

    if (/^\s*Back\s*:/i.test(line)) {
      continue
    }

    const wrongMatch = line.match(/^(?:False|Falsch|Wrong|Nicht)\s*[:>]\s*(.+)$/i)
    if (wrongMatch) {
      wrongHint = wrongMatch[1].trim()
      continue
    }

    const reminderMatch = line.match(/^\s*(?:\(optional\)\s*)?(?:Merkhilfe(?:\s*\/\s*(?:Reminder|Remidner))?|Reminder|Remidner)\s*[:>]\s*(.+)$/i)
    if (reminderMatch) {
      reminder = reminderMatch[1].trim()
      continue
    }

    if (optionMap.size > 0) {
      freeBackLines.push(line)
    } else {
      questionLines.push(line)
    }
  }

  if (optionMap.size < 2) return null

  const orderedLabels = Array.from(optionMap.keys())
  const normalizedLabels = orderedLabels.map((_, idx) => indexToLabel(idx))
  const relabelMap = new Map<string, string>()
  orderedLabels.forEach((oldLabel, idx) => {
    relabelMap.set(oldLabel, normalizedLabels[idx])
  })

  const frontLines = [
    questionLines.join('\n').trim(),
    ...orderedLabels.map(oldLabel => `${relabelMap.get(oldLabel)}: ${optionMap.get(oldLabel)}`),
  ].filter(Boolean)

  const mappedCorrect = new Set<string>()
  for (const token of correctTokens) {
    if (relabelMap.has(token)) {
      mappedCorrect.add(relabelMap.get(token) as string)
      continue
    }
    if (/^[0-9]+$/.test(token)) {
      const idx = Number(token) - 1
      if (idx >= 0 && idx < normalizedLabels.length) {
        mappedCorrect.add(normalizedLabels[idx])
      }
    }
  }

  const normalizedCorrect = Array.from(mappedCorrect)
  const backParts: string[] = []
  if (normalizedCorrect.length > 0) {
    const originalLabel = orderedLabels[normalizedLabels.indexOf(normalizedCorrect[0])]
    const correctAnswer = (originalLabel && optionMap.get(originalLabel)) || ''
    backParts.push(`>> CORRECT: ${normalizedCorrect.join(',')} | ${correctAnswer || ' '}`)
  }
  if (freeBackLines.length > 0) backParts.push(freeBackLines.join('\n').trim())
  if (reminder) backParts.push(`Merkhilfe: ${reminder}`)
  if (wrongHint) backParts.push(`Nicht: ${wrongHint}`)

  return {
    front: frontLines.join('\n').trim(),
    back: backParts.join('\n').trim() || ' ',
  }
}

function parseTxtRows(dataLines: string[], separator: string): string[][] {
  const rows: string[][] = []
  let frontLines: string[] = []
  let backLines: string[] = []
  let hasSeparator = false

  const flush = () => {
    const front = frontLines.join('\n').trim()
    const back = backLines.join('\n').trim()
    if (front || back) {
      rows.push([front, back])
    }
    frontLines = []
    backLines = []
    hasSeparator = false
  }

  for (const line of dataLines) {
    if (line.includes(separator)) {
      if (hasSeparator) {
        flush()
      }

      const idx = line.indexOf(separator)
      const left = line.slice(0, idx)
      const right = line.slice(idx + separator.length)
      frontLines.push(left)
      if (right.length > 0) {
        backLines.push(right)
      }
      hasSeparator = true
      continue
    }

    if (hasSeparator) {
      backLines.push(line)
    } else {
      frontLines.push(line)
    }
  }

  flush()
  return rows
}

function parseAnkiHeader(lines: string[]): { meta: AnkiTxtMeta; dataStart: number } {
  const meta: AnkiTxtMeta = { separator: '\t', deckName: null, htmlEnabled: false }
  let i = 0

  for (; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line.startsWith('#')) break

    if (line.startsWith('#separator:')) {
      const val = line.slice('#separator:'.length).toLowerCase()
      if (val === 'comma') meta.separator = ','
      else if (val === 'semicolon') meta.separator = ';'
      else meta.separator = '\t'
    } else if (line.startsWith('#deck:')) {
      meta.deckName = line.slice('#deck:'.length).trim() || null
    } else if (line.startsWith('#html:')) {
      meta.htmlEnabled = line.slice('#html:'.length).trim().toLowerCase() === 'true'
    }
  }

  return { meta, dataStart: i }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parst eine .txt oder .csv Datei im Anki-Exportformat.
 *
 * Anki-TXT Format:
 *   [#separator:tab]  [#deck:Deck Name]
 *   front\tback[\ttags]
 *
 * Anki-CSV Format:
 *   front,back[,tags]
 */
export async function parseCsvText(
  fileName: string,
  text: string,
  language: Language = 'de',
  algorithm: Algorithm = 'sm2'
): Promise<ParsedImport> {
  const lines = text.split('\n')
  const isTxt = fileName.endsWith('.txt')
  const now = Date.now()

  let deckName = fileName.replace(/\.(txt|csv)$/, '') || (language === 'de' ? 'Importiertes Deck' : 'Imported deck')
  let rowsToProcess: string[][]

  if (isTxt) {
    const { meta, dataStart } = parseAnkiHeader(lines)
    if (meta.deckName) deckName = meta.deckName

    const dataLines = lines.slice(dataStart)
    const hasSeparatedRows = dataLines.some(line => line.includes(meta.separator))
    rowsToProcess = hasSeparatedRows
      ? parseTxtRows(dataLines.filter(l => l.trim()), meta.separator)
      : splitTxtIntoBlocks(dataLines).map(block => [block, ''])
  } else {
    // CSV mit PapaParse auto-detect
    const result = Papa.parse<string[]>(text, {
      skipEmptyLines: true,
      delimiter: '',      // auto-detect
    })
    rowsToProcess = result.data
  }

  if (!rowsToProcess.length) {
    throw new Error(language === 'de' ? 'Die Datei enthält keine verwertbaren Zeilen.' : 'The file contains no usable rows.')
  }

  // Deck erstellen
  const deckByName = new Map<string, ImportedDeck>()
  const ensureDeck = (name: string) => {
    const normalized = name.trim() || deckName
    const existing = deckByName.get(normalized)
    if (existing) return existing

    const created: ImportedDeck = {
      id: generateId(),
      name: normalized,
      createdAt: now,
      source: 'anki-import',
    }
    deckByName.set(normalized, created)
    return created
  }

  const defaultDeck = ensureDeck(deckName)

  // Karten erstellen
  const cards: ImportedCard[] = []
  const daysSinceEpoch = Math.floor(now / 86_400_000)

  for (const cols of rowsToProcess) {
    let rawFront = stripHtml((cols[0] || '').trim())
    let rawBack = stripHtml((cols[1] || '').trim())

    if (!rawBack) {
      const parsedLooseBlock = parseLooseMcBlock(rawFront)
      if (parsedLooseBlock) {
        rawFront = parsedLooseBlock.front
        rawBack = parsedLooseBlock.back
      }
    }

    if (!rawFront && !rawBack) continue

    const { front, back } = normalizeImportedMcCard(rawFront, rawBack)

    // Tags (Spalte 3, space-separated falls vorhanden)
    const tags = cols[2]
      ? cols[2].trim().split(' ').filter(Boolean)
      : []

    const metadata = decodeTxtMetadata((cols[3] || '').trim())
    const targetDeck = metadata ? ensureDeck(metadata.deckName) : defaultDeck
    const base = metadata?.card
    const sourceFactor = base?.factor ?? SM2.DEFAULT_EASE
    const sourceInterval = base?.interval ?? 0
    const fsrsDifficulty = Math.max(1, Math.min(10, base?.difficulty ?? (sourceFactor / 500)))
    const fsrsStability = Math.max(0.5, base?.stability ?? (sourceInterval || 1))

    cards.push({
      id:       base?.id ?? generateId(),
      noteId:   base?.noteId ?? generateId(),
      deckId:   targetDeck.id,
      front,
      back,
      tags,
      extra:    base?.extra ?? { acronym: '', examples: '', port: '', protocol: '' },
      type:     base?.type ?? SM2.CARD_TYPE_NEW,
      queue:    base?.queue ?? SM2.QUEUE_NEW,
      due:      base?.due ?? daysSinceEpoch,
      interval: sourceInterval,
      factor:   algorithm === 'fsrs' ? Math.round(fsrsDifficulty * 500) : sourceFactor,
      stability: algorithm === 'fsrs' ? fsrsStability : base?.stability,
      difficulty: algorithm === 'fsrs' ? fsrsDifficulty : base?.difficulty,
      reps:     base?.reps ?? 0,
      lapses:   base?.lapses ?? 0,
      algorithm,
      createdAt: base?.createdAt ?? now,
    })
  }

  if (!cards.length) {
    throw new Error(language === 'de' ? 'Keine gültigen Karten in der Datei gefunden (Front oder Back leer).' : 'No valid cards were found in the file (front or back is empty).')
  }

  const format = fileName.endsWith('.csv') ? 'csv' : 'txt'

  return {
    decks: Array.from(deckByName.values()),
    cards,
    format,
    sourceName: fileName,
  }
}

export async function parseCsv(
  file: File,
  language: Language = 'de',
  algorithm: Algorithm = 'sm2'
): Promise<ParsedImport> {
  const text = await file.text()

  if (file.size >= CSV_WORKER_THRESHOLD_BYTES && typeof Worker !== 'undefined') {
    try {
      return await parseCsvInWorker(file.name, text, language, algorithm)
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[CSV] Worker parsing unavailable, using main-thread fallback.', error)
      }
    }
  }

  return parseCsvText(file.name, text, language, algorithm)
}
