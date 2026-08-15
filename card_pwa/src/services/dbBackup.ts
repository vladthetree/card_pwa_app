/**
 * AI_CONTEXT:
 * Role: Local export/backup and restore I/O for decks, cards, reviews, settings, and video notes (Dexie reads/writes, localStorage, download trigger).
 * Used by: Home export modal/controller and tests for backup compatibility.
 * Important: Backup payload version 2 includes videoNotes; restore must tolerate old payloads and preserve inline-tag identity across display variants.
 *            The pure encode/decode counterpart for TXT metadata (decodeTxtMetadata) lives in utils/backupTxtMetadata.ts,
 *            since utils/import/csvImporter.ts (a pure utils module) must not depend on this I/O-heavy services module.
 */
import { db } from '../db'
import type { CardRecord, DeckRecord, ReviewRecord, VideoNoteRecord } from '../db'
import {
  listLearningUnitsBackup,
  restoreLearningUnitsBackup,
  type RestoreLearningUnitsResult,
} from '../db/queries/learningUnits'
import { BACKUP_METADATA, STORAGE_KEYS } from '../constants/appIdentity'
import { extractTags } from '../utils/videoTags'
import { normalizeTagId, normalizeTags } from '../utils/tagIdentity'
import type { DbBackupPayload } from '../utils/dbBackupPayload'
import { triggerDownload } from './downloadFile'
import { expandDeckIdsWithDescendants } from './syncedDeckScope'
import { finiteOr } from '../utils/numeric'

export type { DbBackupPayload }

const SETTINGS_STORAGE_KEY = STORAGE_KEYS.settings
const META_PREFIX = BACKUP_METADATA.prefix

interface ExportOptions {
  deckIds?: string[]
}

export interface RestoreVideoNotesResult {
  added: number
  updated: number
  skipped: number
}

export interface RestoreVideoNotesOptions {
  strategy?: 'newer' | 'overwrite'
}

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const raw = typeof value === 'string' ? value : JSON.stringify(value)
  const escaped = raw.replace(/"/g, '""')
  return `"${escaped}"`
}

function backupFilename(payload: DbBackupPayload, ext: string): string {
  const stamp = new Date(payload.meta.exportedAt).toISOString().replace(/[:.]/g, '-')
  return `card-pwa-backup-${stamp}.${ext}`
}

export async function buildDbBackupPayload(options: ExportOptions = {}): Promise<DbBackupPayload> {
  const selectedDeckIds = options.deckIds?.length ? new Set(options.deckIds) : null

  // Vier unabhängige Volltabellen-Reads — parallel statt sequenziell, die
  // Filterung unten braucht ohnehin alle vier Rohdaten gleichzeitig.
  const [decksAll, cardsAll, reviewsAll, videoNotes, learningUnits] = await Promise.all([
    db.decks.toArray(),
    db.cards.toArray(),
    db.reviews.toArray(),
    db.videoNotes2.toArray(),
    listLearningUnitsBackup(),
  ])

  const activeDecks = decksAll.filter(deck => !deck.isDeleted)
  const selectedDecksWithDescendants = selectedDeckIds
    ? expandDeckIdsWithDescendants(activeDecks, selectedDeckIds)
    : null
  const decks = selectedDeckIds
    ? activeDecks.filter(deck => selectedDecksWithDescendants?.has(deck.id))
    : activeDecks

  const deckIdSet = new Set(decks.map(deck => deck.id))
  const cards = cardsAll.filter(card => !card.isDeleted && deckIdSet.has(card.deckId))

  const cardIdSet = new Set(cards.map(card => card.id))
  const reviews = reviewsAll.filter(review => cardIdSet.has(review.cardId))
  const learningUnitsCount = Object.values(learningUnits).reduce((sum, rows) => sum + rows.length, 0)

  const settingsRaw = localStorage.getItem(SETTINGS_STORAGE_KEY)
  const parsedSettings = settingsRaw ? JSON.parse(settingsRaw) as Record<string, unknown> : null
  const settings = parsedSettings
    ? {
        language: parsedSettings.language,
        algorithm: parsedSettings.algorithm,
      }
    : null

  return {
    meta: {
      app: BACKUP_METADATA.app,
      version: 3,
      exportedAt: Date.now(),
      tableCounts: {
        decks: decks.length,
        cards: cards.length,
        reviews: reviews.length,
        videoNotes: videoNotes.length,
        learningUnits: learningUnitsCount,
      },
    },
    settings,
    data: {
      decks,
      cards,
      reviews,
      videoNotes,
      learningUnits,
    },
  }
}

/** Stellt das dedizierte Lerneinheiten-System aus einem Backup wieder her;
 *  Backups vor Version 3 (ohne `learningUnits`) sind ein No-op. */
export async function restoreLearningUnitsFromBackupPayload(
  payload: Pick<DbBackupPayload, 'data'>,
): Promise<RestoreLearningUnitsResult> {
  if (!payload.data?.learningUnits) return { added: 0, updated: 0, skipped: 0 }
  return restoreLearningUnitsBackup(payload.data.learningUnits)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function inlineTag(tag: string): string {
  return tag.trim().replace(/^#+/, '').replace(/\s+/g, '-')
}

function normalizeVideoNoteForRestore(value: unknown, now = Date.now()): VideoNoteRecord | null {
  if (!isRecord(value)) return null

  const profileId = typeof value.profileId === 'string' ? value.profileId.trim() : ''
  const objective = typeof value.objective === 'string' ? value.objective.trim() : ''
  if (!profileId || !objective) return null

  const videoId = typeof value.videoId === 'string' ? value.videoId : ''
  let content = typeof value.content === 'string' ? value.content : ''
  const rawTags = Array.isArray(value.tags) ? value.tags.map(tag => String(tag)) : []
  const contentTagIds = new Set(extractTags(content).map(normalizeTagId).filter(Boolean))
  const missingTags = normalizeTags(rawTags).filter(tag => !contentTagIds.has(normalizeTagId(tag)))

  if (missingTags.length > 0) {
    const appended = missingTags
      .map(tag => inlineTag(tag))
      .filter(Boolean)
      .map(tag => `#${tag}`)
      .join(' ')
    if (appended) content = content ? `${content}\n\n${appended}` : appended
  }

  const tags = extractTags(content)
  if (!content.trim() && tags.length === 0) return null

  const updatedAt = finiteOr(value.updatedAt, now)
  return {
    profileId,
    objective,
    videoId,
    content,
    tags,
    createdAt: finiteOr(value.createdAt, updatedAt),
    updatedAt,
  }
}

export async function restoreVideoNotesFromBackupPayload(
  payload: Pick<DbBackupPayload, 'data'> | { data?: { videoNotes?: unknown; [key: string]: unknown } },
  options: RestoreVideoNotesOptions = {},
): Promise<RestoreVideoNotesResult> {
  const strategy = options.strategy ?? 'newer'
  const rawRows = isRecord(payload.data) && Array.isArray(payload.data.videoNotes)
    ? payload.data.videoNotes
    : []

  const result: RestoreVideoNotesResult = { added: 0, updated: 0, skipped: 0 }
  if (rawRows.length === 0) return result

  for (const raw of rawRows) {
    const note = normalizeVideoNoteForRestore(raw)
    if (!note) {
      result.skipped += 1
      continue
    }

    const existing = await db.videoNotes2.get([note.profileId, note.objective])
    if (!existing) {
      await db.videoNotes2.put(note)
      result.added += 1
      continue
    }

    if (strategy === 'newer' && existing.updatedAt > note.updatedAt) {
      result.skipped += 1
      continue
    }

    await db.videoNotes2.put({
      ...note,
      createdAt: Math.min(existing.createdAt, note.createdAt),
    })
    result.updated += 1
  }

  return result
}

/** Verlustfreies JSON-Vollbackup: Decks, Karten (inkl. Scheduling), Reviews,
 *  Video Notes und Settings — Roundtrip-Format für restore via ImportModal. */
export function downloadDbBackupAsJson(payload: DbBackupPayload) {
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json;charset=utf-8' })
  triggerDownload(blob, backupFilename(payload, 'json'))
}

export async function exportDbBackupAsJson(options: ExportOptions = {}) {
  const payload = await buildDbBackupPayload(options)
  downloadDbBackupAsJson(payload)
}

export interface RestoreReviewsResult {
  added: number
  skipped: number
}

/** Stellt Reviews aus einem JSON-Backup lokal wieder her. Dedupe über opId
 *  bzw. (cardId, timestamp, rating); es werden keine Sync-Ops erzeugt —
 *  serverbekannte Reviews kommen ohnehin über den Pull zurück. */
export async function restoreReviewsFromBackupPayload(
  payload: Pick<DbBackupPayload, 'data'>,
): Promise<RestoreReviewsResult> {
  const rows = Array.isArray(payload.data?.reviews) ? payload.data.reviews : []
  const result: RestoreReviewsResult = { added: 0, skipped: 0 }
  if (rows.length === 0) return result

  const existing = await db.reviews.toArray()
  const knownOpIds = new Set(existing.map(review => review.opId).filter(Boolean))
  const knownComposite = new Set(existing.map(review => `${review.cardId}|${review.timestamp}|${review.rating}`))
  const knownCardIds = new Set((await db.cards.toArray()).map(card => card.id))

  for (const raw of rows) {
    if (!isRecord(raw) || typeof raw.cardId !== 'string') {
      result.skipped += 1
      continue
    }
    const compositeKey = `${raw.cardId}|${raw.timestamp}|${raw.rating}`
    if (
      (typeof raw.opId === 'string' && knownOpIds.has(raw.opId)) ||
      knownComposite.has(compositeKey) ||
      !knownCardIds.has(raw.cardId)
    ) {
      result.skipped += 1
      continue
    }

    const { id: _autoIncrementId, ...review } = raw as ReviewRecord
    await db.reviews.add(review)
    knownComposite.add(compositeKey)
    result.added += 1
  }

  return result
}

export function downloadDbBackupAsTxt(payload: DbBackupPayload) {
  const filename = backupFilename(payload, 'txt')
  const deckNameById = buildDeckNameById(payload.data.decks)

  const lines = [
    '#separator:tab',
    '#html:true',
    '#notetype:Basic',
    BACKUP_METADATA.marker,
    `#card-pwa-exportedAt:${new Date(payload.meta.exportedAt).toISOString()}`,
    `#card-pwa-settings:${JSON.stringify(payload.settings ?? {})}`,
  ]

  for (const card of payload.data.cards) {
    const deckName = deckNameById.get(card.deckId) ?? card.deckId
    const tags = card.tags.join(' ')
    const meta = encodeTxtMetadata(card, deckName)
    lines.push([card.front, card.back, tags, meta].join('\t'))
  }

  const body = lines.join('\n')

  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
  triggerDownload(blob, filename)
}

export function downloadDbBackupAsCsv(payload: DbBackupPayload) {
  const filename = backupFilename(payload, 'csv')
  const deckNameById = buildDeckNameById(payload.data.decks)
  const lines = [
    'card_id,note_id,deck_id,deck_name,front,back,tags,acronym,examples,port,protocol,type,queue,due,interval,factor,reps,lapses,created_at',
  ]

  for (const row of payload.data.cards) {
    lines.push([
      row.id,
      row.noteId,
      row.deckId,
      deckNameById.get(row.deckId) ?? row.deckId,
      row.front,
      row.back,
      row.tags.join(' '),
      row.extra.acronym,
      row.extra.examples,
      row.extra.port,
      row.extra.protocol,
      row.type,
      row.queue,
      row.due,
      row.interval,
      row.factor,
      row.reps,
      row.lapses,
      row.createdAt,
    ].map(toCsvValue).join(','))
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  triggerDownload(blob, filename)
}

export async function exportDbBackupAsTxt(options: ExportOptions = {}) {
  const payload = await buildDbBackupPayload(options)
  downloadDbBackupAsTxt(payload)
}

export async function exportDbBackupAsCsv(options: ExportOptions = {}) {
  const payload = await buildDbBackupPayload(options)
  downloadDbBackupAsCsv(payload)
}

export async function listDecksForBackup(): Promise<Array<Pick<DeckRecord, 'id' | 'name'>>> {
  const decks = await db.decks.toArray()
  return decks
    .filter(deck => !deck.isDeleted)
    .map(deck => ({ id: deck.id, name: deck.name }))
}

function buildDeckNameById(decks: DeckRecord[]): Map<string, string> {
  return new Map(decks.map(deck => [deck.id, deck.name]))
}

function encodeTxtMetadata(card: CardRecord, deckName: string) {
  const metadata = {
    card,
    deckName,
  }
  const json = JSON.stringify(metadata)
  const encoded = btoa(unescape(encodeURIComponent(json)))
  return `${META_PREFIX}${encoded}`
}
