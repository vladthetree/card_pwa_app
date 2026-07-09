/**
 * AI_CONTEXT:
 * Role: Dev-time generator that copies the clean professormesser.com transcripts into compact per-video app assets.
 * Used by: manually on the Pi (node scripts/build-messer-transcripts.mjs) after transcripts change.
 * Important: Output feeds useMesserVideoTranscript and the video transcript panel; keyed by the 3-digit playlist index.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Quelle: die auf dem Pi gebauten, redaktionellen Transkripte (siehe deren tools/).
const TRANSCRIPTS_DIR =
  process.env.MESSER_TRANSCRIPTS_DIR ??
  '/home/_vb/youtube-playlists/CompTIA SY0-701 Security+ Training Course [PLG49S3nxzAnl4QDVqK-hOnoqcSKEIDDuv]/transcripts/json'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'messer-transcripts')

mkdirSync(OUT_DIR, { recursive: true })

let count = 0
for (const file of readdirSync(TRANSCRIPTS_DIR).sort()) {
  if (!file.endsWith('.json')) continue
  const doc = JSON.parse(readFileSync(join(TRANSCRIPTS_DIR, file), 'utf-8'))
  const compact = {
    index: doc.index,
    objective: doc.objective,
    title: doc.title,
    paragraphs: doc.paragraphs.map(p => p.text),
  }
  writeFileSync(join(OUT_DIR, `${doc.index}.json`), JSON.stringify(compact), 'utf-8')
  count += 1
}

console.log(`messer-transcripts: ${count} Dateien nach ${OUT_DIR}`)
