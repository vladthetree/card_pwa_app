/**
 * AI_CONTEXT: Utility module for backupTxtMetadata; decodes the base64 JSON
 * metadata blob embedded in TXT/Anki-export backup rows (encoded counterpart
 * lives in services/dbBackup.ts, which owns the rest of backup I/O). Pure —
 * used by utils/import/csvImporter.ts, which must not depend on services/.
 */
import type { CardRecord } from '../db'
import { BACKUP_METADATA } from '../constants/appIdentity'

export function decodeTxtMetadata(raw: string): { card: CardRecord; deckName: string } | null {
  if (!raw) return null

  try {
    let encoded = ''
    if (raw.startsWith(BACKUP_METADATA.prefix)) {
      encoded = raw.slice(BACKUP_METADATA.prefix.length)
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
