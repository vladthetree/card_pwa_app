import { db, type VideoNoteRecord } from '../../db'
import { collectRelatedTags, extractTags, type RelatedTagStats } from '../../utils/videoTags'

/**
 * Notizzettel zu Lernvideos. Tags werden direkt im Notiztext als `#tag` gesetzt
 * und beim Speichern aus dem Inhalt abgeleitet; über sie werden Notizen
 * verknüpft. Notizen sind gerätelokal (kein Server-Sync), aber PRO PROFIL
 * getrennt: jede Funktion nimmt den Profil-Scope `profileId` entgegen
 * (Compound-Primary-Key `[profileId+objective]`), damit z. B. „Vlad" eigene
 * Notizen führt, ohne dass andere Profile sie sehen.
 */

function normalizeTag(tag: string): string {
  return tag.trim().replace(/\s+/g, ' ')
}

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of tags) {
    const tag = normalizeTag(raw)
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(tag)
  }
  return result
}

export async function getVideoNote(profileId: string, objective: string): Promise<VideoNoteRecord | null> {
  const record = await db.videoNotes2.get([profileId, objective])
  return record ?? null
}

export async function listVideoNotes(profileId: string): Promise<VideoNoteRecord[]> {
  const rows = await db.videoNotes2.where('profileId').equals(profileId).toArray()
  return rows.sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Alle Notizen des Profils, die einen bestimmten Tag tragen (case-insensitiv).
 *  Nutzt den Multi-Entry-Index `*tags`; Grundlage der Video-Verknüpfung. */
export async function listNotesByTag(profileId: string, tag: string): Promise<VideoNoteRecord[]> {
  const value = tag.trim()
  if (!value) return []
  return db.videoNotes2
    .where('tags')
    .equalsIgnoreCase(value)
    .and(row => row.profileId === profileId)
    .toArray()
}

/** Objectives des Profils mit einer nicht-leeren Notiz oder mindestens einem Tag. */
export async function listObjectivesWithNotes(profileId: string): Promise<Set<string>> {
  const rows = await db.videoNotes2.where('profileId').equals(profileId).toArray()
  const set = new Set<string>()
  for (const row of rows) {
    if (row.content.trim() || row.tags.length > 0) set.add(row.objective)
  }
  return set
}

/** Alle vergebenen Tags des Profils (eindeutig, alphabetisch). */
export async function listAllVideoNoteTags(profileId: string): Promise<string[]> {
  const rows = await db.videoNotes2.where('profileId').equals(profileId).toArray()
  const tags = new Map<string, string>()
  for (const row of rows) {
    for (const tag of row.tags) {
      const key = tag.toLowerCase()
      if (!tags.has(key)) tags.set(key, tag)
    }
  }
  return Array.from(tags.values()).sort((a, b) => a.localeCompare(b))
}

/** Tags, die in denselben Video-Notizen wie `tag` auftauchen — Backlink-Gefühl
 *  für die Tag-Sammlung, ohne ein separates Graph-Modell zu speichern. */
export async function listRelatedVideoNoteTags(
  profileId: string,
  tag: string,
  limit = 8,
): Promise<RelatedTagStats[]> {
  const value = tag.trim()
  if (!value) return []
  const rows = await listNotesByTag(profileId, value)
  return collectRelatedTags(rows, value, limit)
}

/**
 * Notiz speichern (Upsert) im Profil-Scope. Tags werden aus den Inline-`#tags`
 * des Inhalts abgeleitet. Wenn Inhalt UND Tags leer sind, wird ein bestehender
 * Eintrag entfernt, damit keine leeren Datensätze zurückbleiben.
 */
export async function saveVideoNote(input: {
  profileId: string
  objective: string
  videoId: string
  content: string
}): Promise<VideoNoteRecord | null> {
  const profileId = input.profileId.trim()
  const objective = input.objective.trim()
  if (!profileId || !objective) return null

  const content = input.content
  const tags = extractTags(content)
  const now = Date.now()

  if (!content.trim() && tags.length === 0) {
    await db.videoNotes2.delete([profileId, objective])
    return null
  }

  const existing = await db.videoNotes2.get([profileId, objective])
  const record: VideoNoteRecord = {
    profileId,
    objective,
    videoId: input.videoId,
    content,
    tags,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  await db.videoNotes2.put(record)
  return record
}

export async function deleteVideoNote(profileId: string, objective: string): Promise<void> {
  await db.videoNotes2.delete([profileId, objective])
}
