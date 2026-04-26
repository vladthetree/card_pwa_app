import type { Algorithm, Language } from '../../contexts/SettingsContext'
import type { ParsedImport } from './types'
import { createWorker } from '../workers/workerPool'
import type { ApkgParserPayload } from './apkgParserCore'

const apkgWorker = createWorker<ApkgParserPayload, ParsedImport>(
  () => new Worker(new URL('../workers/apkg-parser.worker.ts', import.meta.url), { type: 'module' }),
  async (payload) => {
    const { parseApkgBuffer } = await import('./apkgParserCore')
    return parseApkgBuffer(payload)
  },
)

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
  const fileBuffer = await file.arrayBuffer()
  return apkgWorker.run(
    {
      fileBuffer,
      fileName: file.name,
      language,
      algorithm,
    },
    [fileBuffer],
  )
}
