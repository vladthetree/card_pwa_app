#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(appRoot, '..')

const DEFAULT_BACKUP = path.join(repoRoot, 'Project_Restore', 'card-pwa-backup-2026-06-08T21-20-25-967Z.txt')
const backupPath = path.resolve(process.argv[2] ?? DEFAULT_BACKUP)
const labsPath = path.join(appRoot, 'src', 'data', 'labScenarios.ts')

const META_PREFIXES = ['card-pwa-meta:', 'anki-pwa-meta:']
const EXPECTED_CARDS = 779
const EXPECTED_DECKS = 33

const errors = []
const warnings = []

function error(message) {
  errors.push(message)
}

function warning(message) {
  warnings.push(message)
}

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
}

function parseHeader(lines) {
  let separator = '\t'
  let dataStart = 0
  for (; dataStart < lines.length; dataStart += 1) {
    const line = lines[dataStart].trim()
    if (!line.startsWith('#')) break
    if (line.startsWith('#separator:')) {
      const value = line.slice('#separator:'.length).trim().toLowerCase()
      if (value === 'comma') separator = ','
      else if (value === 'semicolon') separator = ';'
      else separator = '\t'
    }
  }
  return { separator, dataStart }
}

function splitPwaBlock(block, separator) {
  const metaCandidates = META_PREFIXES
    .map(prefix => block.lastIndexOf(`${separator}${prefix}`))
    .filter(index => index >= 0)
  if (metaCandidates.length === 0) return null

  const metaIdx = Math.max(...metaCandidates)
  const meta = block.slice(metaIdx + separator.length).trim()
  const beforeMeta = block.slice(0, metaIdx)
  const tagsIdx = beforeMeta.lastIndexOf(separator)
  if (tagsIdx < 0) return null
  const tags = beforeMeta.slice(tagsIdx + separator.length).trim()
  const frontBack = beforeMeta.slice(0, tagsIdx)
  const firstSepIdx = frontBack.indexOf(separator)
  if (firstSepIdx < 0) return null
  return [
    frontBack.slice(0, firstSepIdx).trim(),
    frontBack.slice(firstSepIdx + separator.length).trim(),
    tags,
    meta,
  ]
}

function parsePwaRows(lines, separator) {
  const rows = []
  let current = []
  for (const line of lines) {
    if (current.length === 0 && !line.trim()) continue
    current.push(line)
    if (!META_PREFIXES.some(prefix => line.includes(`${separator}${prefix}`))) continue

    const parsed = splitPwaBlock(current.join('\n'), separator)
    if (parsed) rows.push(parsed)
    else error(`could not split PWA backup block ending with: ${line.slice(0, 80)}`)
    current = []
  }
  if (current.some(line => line.trim())) {
    warning(`ignored trailing non-empty lines after last metadata block: ${current.length}`)
  }
  return rows
}

function decodeMetadata(raw, index) {
  const prefix = META_PREFIXES.find(candidate => raw.startsWith(candidate))
  if (!prefix) {
    error(`row ${index}: missing card-pwa-meta column`)
    return null
  }
  try {
    const json = Buffer.from(raw.slice(prefix.length), 'base64').toString('utf8')
    return JSON.parse(json)
  } catch (err) {
    error(`row ${index}: invalid metadata (${err instanceof Error ? err.message : String(err)})`)
    return null
  }
}

function uniqueByLabel(entries) {
  const seen = new Set()
  const unique = []
  for (const entry of entries) {
    if (seen.has(entry.label)) continue
    seen.add(entry.label)
    unique.push(entry)
  }
  return unique
}

function buildOptionsFromCandidates(candidates) {
  if (candidates.length < 2) return new Map()

  const startCandidate = candidates.find(entry => entry.label === 'A' || entry.label === '1') ?? candidates[0]
  const filtered = candidates.filter(entry => entry.idx >= startCandidate.idx)
  const unique = uniqueByLabel(filtered.map(entry => ({ label: entry.label, value: entry.value })))
  if (unique.length < 2) return new Map()

  const options = new Map()
  unique.forEach((entry, index) => {
    options.set(String.fromCharCode(65 + index), entry.value)
  })

  return options
}

function parseOptions(front) {
  const candidates = []
  const lines = front.split('\n')

  for (let idx = 0; idx < lines.length; idx += 1) {
    const match = lines[idx].trim().match(/^([A-Z]|[0-9]{1,2})\s*[:)]\s*(.+)$/)
    if (!match) continue
    candidates.push({
      idx,
      label: match[1].toUpperCase(),
      value: match[2].trim(),
    })
  }

  return buildOptionsFromCandidates(candidates)
}

function parseCorrectOptions(back) {
  const marker = back.match(/(?:>>\s*)?(?:CORRECT|RICHTIG)\s*:\s*([^\n|]+)/i)
  if (!marker) return []
  return marker[1]
    .split(/[\s,;/|]+/)
    .map(token => token.trim().toUpperCase())
    .filter(token => /^[A-Z]+$/.test(token))
}

function validateBackup() {
  if (!fs.existsSync(backupPath)) {
    error(`backup file not found: ${backupPath}`)
    return
  }

  const lines = readText(backupPath).split('\n')
  const { separator, dataStart } = parseHeader(lines)
  const rows = parsePwaRows(lines.slice(dataStart), separator)
  const cardIds = new Set()
  const noteIds = new Set()
  const deckNames = new Set()
  const modeCounts = { m1: 0, m2: 0, m3: 0, pbq: 0, malformedMc: 0 }
  let decoded = 0

  rows.forEach((cols, index) => {
    const rowNumber = index + 1
    const metadata = decodeMetadata(cols[3] ?? '', rowNumber)
    if (!metadata?.card) return
    decoded += 1
    const card = metadata.card
    const front = String(card.front ?? cols[0] ?? '').trim()
    const back = String(card.back ?? cols[1] ?? '').trim()
    const deckName = String(metadata.deckName ?? '').trim()

    if (!front) error(`row ${rowNumber}: empty front`)
    if (!back) error(`row ${rowNumber}: empty back`)
    if (!card.id) error(`row ${rowNumber}: missing card id`)
    if (!card.noteId) error(`row ${rowNumber}: missing note id`)
    if (card.id && cardIds.has(card.id)) error(`row ${rowNumber}: duplicate card id ${card.id}`)
    if (card.noteId && noteIds.has(card.noteId)) warning(`row ${rowNumber}: duplicate note id ${card.noteId}`)
    if (card.id) cardIds.add(card.id)
    if (card.noteId) noteIds.add(card.noteId)
    if (deckName) deckNames.add(deckName)

    const options = parseOptions(front)
    const correctOptions = parseCorrectOptions(back)
    const isPbq = /^(ORDERING|MATCHING):/i.test(front.trim())
    const isFreeRecall = /^RECALL:/i.test(front) || (Array.isArray(card.tags) && card.tags.some(tag => String(tag).toLowerCase().replace(/[\s_]+/g, '-') === 'free-recall'))

    if (isPbq) {
      modeCounts.pbq += 1
    } else if (isFreeRecall) {
      modeCounts.m3 += 1
    } else if (options.size === 4) {
      modeCounts.m2 += 1
      if (correctOptions.length !== 1) {
        error(`row ${rowNumber} (${card.id}): M2 shape needs exactly one Correct marker, got ${correctOptions.length}`)
      } else if (!options.has(correctOptions[0])) {
        error(`row ${rowNumber} (${card.id}): Correct marker ${correctOptions[0]} has no matching option label`)
      }
      if (/\b(?:Antwort|Option|answer|option)\s+[A-D]\b/i.test(back.replace(/^\s*(?:>>\s*)?(?:CORRECT|RICHTIG)\s*:[^\n]+/i, ''))) {
        warning(`row ${rowNumber} (${card.id}): explanation may reference a display letter`)
      }
    } else if (options.size > 0) {
      modeCounts.malformedMc += 1
      warning(`row ${rowNumber} (${card.id}): MC-like card has ${options.size} options`)
    } else {
      modeCounts.m1 += 1
    }
  })

  if (decoded !== EXPECTED_CARDS) error(`expected ${EXPECTED_CARDS} decoded cards, got ${decoded}`)
  if (deckNames.size !== EXPECTED_DECKS) error(`expected ${EXPECTED_DECKS} decks, got ${deckNames.size}`)

  return { rows: rows.length, decoded, decks: deckNames.size, modeCounts }
}

function validateLabs() {
  if (!fs.existsSync(labsPath)) {
    warning(`labs source not found: ${labsPath}`)
    return null
  }
  const text = readText(labsPath)
  const scenarioStart = text.indexOf('export const LAB_SCENARIOS')
  // Block-Ende an die Code-Deklaration ankern, nicht an den Kommentar darueber:
  // der JSDoc-Marker wurde schon einmal umformatiert und hat den Parser gebrochen.
  const scenarioEnd = text.indexOf('export const LAB_TARGET_INVENTORY')
  if (scenarioStart < 0 || scenarioEnd < 0) {
    error('could not locate LAB_SCENARIOS body')
    return null
  }

  const scenarioBody = text.slice(scenarioStart, scenarioEnd)
  const scenarioIds = [...scenarioBody.matchAll(/\n\s+id:\s*'([^']+)'/g)].map(match => match[1])
  const targetMatch = text.match(/LAB_TARGET_INVENTORY\s*=\s*(\d+)/)
  const target = targetMatch ? Number(targetMatch[1]) : null
  const refsBody = text.slice(text.indexOf('export const LAB_SCENARIO_SOURCE_REFS'))
  const refs = new Map([...refsBody.matchAll(/^\s+'([^']+)':\s*\[([^\]]*)\]/gm)].map(match => [
    match[1],
    [...match[2].matchAll(/'([^']+)'|SY0_701/g)].map(sourceMatch => sourceMatch[0] === 'SY0_701' ? 'comptia-sy0-701-objectives' : sourceMatch[1]),
  ]))

  if (target !== null && scenarioIds.length !== target) error(`labs target ${target} does not match scenario count ${scenarioIds.length}`)
  if (new Set(scenarioIds).size !== scenarioIds.length) error('duplicate lab scenario ids found')

  for (const id of scenarioIds) {
    const sourceRefs = refs.get(id) ?? []
    if (sourceRefs.length < 2) error(`lab ${id}: fewer than two source refs`)
    if (!sourceRefs.includes('comptia-sy0-701-objectives')) error(`lab ${id}: missing CompTIA source ref`)
  }
  for (const id of refs.keys()) {
    if (!scenarioIds.includes(id)) error(`source refs exist for unknown lab scenario ${id}`)
  }

  return { scenarios: scenarioIds.length, target, refs: refs.size }
}

const backupSummary = validateBackup()
const labSummary = validateLabs()

console.log('Card PWA content validation')
console.log(`Backup: ${backupPath}`)
if (backupSummary) {
  console.log(`Cards: ${backupSummary.decoded}/${EXPECTED_CARDS}`)
  console.log(`Decks: ${backupSummary.decks}/${EXPECTED_DECKS}`)
  console.log(`Modes: M1=${backupSummary.modeCounts.m1} M2=${backupSummary.modeCounts.m2} M3=${backupSummary.modeCounts.m3} PBQ=${backupSummary.modeCounts.pbq} malformedMC=${backupSummary.modeCounts.malformedMc}`)
}
if (labSummary) {
  console.log(`Labs: ${labSummary.scenarios}/${labSummary.target ?? '?'} scenarios, ${labSummary.refs} source-ref entries`)
}
console.log(`Warnings: ${warnings.length}`)
for (const message of warnings.slice(0, 20)) console.log(`WARN ${message}`)
if (warnings.length > 20) console.log(`WARN ... ${warnings.length - 20} more`)
console.log(`Errors: ${errors.length}`)
for (const message of errors.slice(0, 50)) console.error(`ERROR ${message}`)
if (errors.length > 50) console.error(`ERROR ... ${errors.length - 50} more`)

if (errors.length > 0) process.exit(1)
