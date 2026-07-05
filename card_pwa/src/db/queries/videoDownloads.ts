/**
 * AI_CONTEXT:
 * Role: IndexedDB persistence for offline video copies; stores large blobs separately from lightweight download metadata.
 * Used by: useLocalMesserVideos and the VideosView offline download controls.
 * Important: These records are device-local and intentionally not synced; metadata reads should avoid touching Blob rows unless playback needs them.
 */
import { db } from '../../db'

/**
 * Offline-Kopien der selbst gehosteten Lernvideos. Der große Blob liegt in
 * `videoBlobs`, die schlanken Metadaten in `videoDownloads` — Listen/Status lesen
 * nur Letzteres. Rein gerätelokal (kein Server-Sync); Wiedergabe offline über
 * `URL.createObjectURL(blob)`.
 */

export interface SaveVideoBlobInput {
  file: string
  objective: string
  title: string
  blob: Blob
}

export async function saveVideoBlob(input: SaveVideoBlobInput): Promise<void> {
  const file = input.file.trim()
  if (!file) return
  const now = Date.now()
  await db.transaction('rw', db.videoDownloads, db.videoBlobs, async () => {
    await db.videoBlobs.put({ file, blob: input.blob })
    await db.videoDownloads.put({
      file,
      objective: input.objective,
      title: input.title,
      size: input.blob.size,
      createdAt: now,
    })
  })
}

export async function getVideoBlob(file: string): Promise<Blob | null> {
  const record = await db.videoBlobs.get(file)
  return record?.blob ?? null
}

export async function deleteVideoDownload(file: string): Promise<void> {
  await db.transaction('rw', db.videoDownloads, db.videoBlobs, async () => {
    await db.videoBlobs.delete(file)
    await db.videoDownloads.delete(file)
  })
}
