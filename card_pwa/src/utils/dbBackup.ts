import { db } from '../db'
import type { CardRecord, DeckRecord, ReviewRecord } from '../db'
import { BACKUP_METADATA, STORAGE_KEYS } from '../constants/appIdentity'

const SETTINGS_STORAGE_KEY = STORAGE_KEYS.settings
const META_PREFIX = BACKUP_METADATA.prefix

interface BackupMeta {
  app: 'card-pwa'
  version: 1
  exportedAt: number
  tableCounts: {
    decks: number
    cards: number
    reviews: number
  }
}

export interface DbBackupPayload {
  meta: BackupMeta
  settings: unknown
  data: {
    decks: DeckRecord[]
    cards: CardRecord[]
    reviews: ReviewRecord[]
  }
}

interface ExportOptions {
  deckIds?: string[]
}

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const raw = typeof value === 'string' ? value : JSON.stringify(value)
  const escaped = raw.replace(/"/g, '""')
  return `"${escaped}"`
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function createDbBackupPayload(options: ExportOptions = {}): Promise<DbBackupPayload> {
  const selectedDeckIds = options.deckIds?.length ? new Set(options.deckIds) : null

  const decksAll = await db.decks.toArray()
  const decks = selectedDeckIds
    ? decksAll.filter(deck => selectedDeckIds.has(deck.id))
    : decksAll

  const deckIdSet = new Set(decks.map(deck => deck.id))
  const cardsAll = await db.cards.toArray()
  const cards = selectedDeckIds
    ? cardsAll.filter(card => deckIdSet.has(card.deckId))
    : cardsAll

  const cardIdSet = new Set(cards.map(card => card.id))
  const reviewsAll = await db.reviews.toArray()
  const reviews = selectedDeckIds
    ? reviewsAll.filter(review => cardIdSet.has(review.cardId))
    : reviewsAll

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
      version: 1,
      exportedAt: Date.now(),
      tableCounts: {
        decks: decks.length,
        cards: cards.length,
        reviews: reviews.length,
      },
    },
    settings,
    data: {
      decks,
      cards,
      reviews,
    },
  }
}

export function downloadDbBackup(payload: DbBackupPayload) {
  const stamp = new Date(payload.meta.exportedAt).toISOString().replace(/[:.]/g, '-')
  const filename = `card-pwa-backup-${stamp}.json`
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  triggerDownload(blob, filename)
}

export function downloadDbBackupAsTxt(payload: DbBackupPayload) {
  const stamp = new Date(payload.meta.exportedAt).toISOString().replace(/[:.]/g, '-')
  const filename = `card-pwa-backup-${stamp}.txt`
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
  const stamp = new Date(payload.meta.exportedAt).toISOString().replace(/[:.]/g, '-')
  const filename = `card-pwa-backup-${stamp}.csv`
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

export async function exportDbBackup() {
  const payload = await createDbBackupPayload()
  downloadDbBackup(payload)
}

export async function exportDbBackupAsTxt(options: ExportOptions = {}) {
  const payload = await createDbBackupPayload(options)
  downloadDbBackupAsTxt(payload)
}

export async function exportDbBackupAsCsv(options: ExportOptions = {}) {
  const payload = await createDbBackupPayload(options)
  downloadDbBackupAsCsv(payload)
}

export async function listDecksForBackup(): Promise<Array<Pick<DeckRecord, 'id' | 'name'>>> {
  const decks = await db.decks.toArray()
  return decks.map(deck => ({ id: deck.id, name: deck.name }))
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

export function decodeTxtMetadata(raw: string): { card: CardRecord; deckName: string } | null {
  if (!raw) return null

  try {
    let encoded = ''
    if (raw.startsWith(META_PREFIX)) {
      encoded = raw.slice(META_PREFIX.length)
    } else if (raw.startsWith(BACKUP_METADATA.legacyPrefix)) {
      encoded = raw.slice(BACKUP_METADATA.legacyPrefix.length)
    } else {
      return null
    }
    const json = decodeURIComponent(escape(atob(encoded)))
    return JSON.parse(json) as { card: CardRecord; deckName: string }
  } catch {
    return null
  }
}
