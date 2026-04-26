import JSZip from 'jszip'
import type { Algorithm, Language } from '../../contexts/SettingsContext'
import type { ParsedImport } from './types'
import { readAnkiSQLite } from './ankiDatabase'

export interface ApkgParserPayload {
  fileBuffer: ArrayBuffer
  fileName: string
  language: Language
  algorithm: Algorithm
}

export async function parseApkgBuffer(payload: ApkgParserPayload): Promise<ParsedImport> {
  const zip = await JSZip.loadAsync(payload.fileBuffer)

  const dbFile =
    zip.file('collection.anki21b') ||
    zip.file('collection.anki21') ||
    zip.file('collection.anki2')

  if (!dbFile) {
    throw new Error(
      payload.language === 'de'
        ? 'Keine Anki-Datenbank gefunden. Erwartet: collection.anki21b, collection.anki21 oder collection.anki2'
        : 'No Anki database found. Expected: collection.anki21b, collection.anki21, or collection.anki2',
    )
  }

  const dbData = await dbFile.async('arraybuffer')
  const { decks, cards } = await readAnkiSQLite(dbData, payload.language, payload.algorithm)

  return {
    decks,
    cards,
    format: payload.fileName.endsWith('.colpkg') ? 'colpkg' : 'apkg',
    sourceName: payload.fileName,
  }
}
