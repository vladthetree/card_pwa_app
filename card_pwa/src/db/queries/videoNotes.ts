/**
 * AI_CONTEXT:
 * Role: Profile-scoped persistence for video notepads; derives tags from inline #tags, lists notes by tag, all tags, objectives with notes, and related tags.
 * Used by: useVideoNotes hooks, VideoNotesPanel, TagCollectionPanel, backup/restore.
 * Important: Notes are partitioned by profileId; content is plain text and tags are derived, deduped by normalizeTagId, and mutations enqueue server sync.
 */
import { db, type VideoNoteRecord } from '../../db'
import { enqueueSyncOperation } from '../../services/syncQueue'
import { collectRelatedTags, extractTags, type RelatedTagStats } from '../../utils/videoTags'
import { extractLinks, normalizeLinkTarget } from '../../utils/videoLinks'
import { normalizeTagId, normalizeTags } from '../../utils/tagIdentity'
import { ensureVideoTagMetaForNote } from './videoTagMeta'

export { normalizeTags }

/**
 * Notizzettel zu Lernvideos. Tags werden direkt im Notiztext als `#tag` gesetzt
 * und beim Speichern aus dem Inhalt abgeleitet; über sie werden Notizen
 * verknüpft. Notizen werden PRO PROFIL getrennt: jede Funktion nimmt den
 * Profil-Scope `profileId` entgegen
 * (Compound-Primary-Key `[profileId+objective]`), damit z. B. „Vlad" eigene
 * Notizen führt, ohne dass andere Profile sie sehen.
 */

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
  const tagId = normalizeTagId(tag)
  if (!tagId) return []
  const rows = await db.videoNotes2.where('profileId').equals(profileId).toArray()
  return rows.filter(row => row.tags.some(rowTag => normalizeTagId(rowTag) === tagId))
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
      const key = normalizeTagId(tag)
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
  const tagId = normalizeTagId(tag)
  if (!tagId) return []
  const rows = await listNotesByTag(profileId, tag)
  return collectRelatedTags(rows, tag, limit)
}

/** Notizen des Profils, deren Text per `[[Ziel]]` auf `target` verweist
 *  (Backlinks, Obsidian-artig „Erwähnt in"). Die eigene Notiz von `target`
 *  zählt nicht als Backlink. Ziel-Vergleich kanonisch über normalizeLinkTarget. */
export async function listNotesLinkingTo(profileId: string, target: string): Promise<VideoNoteRecord[]> {
  const wanted = normalizeLinkTarget(target)
  if (!wanted) return []
  const rows = await db.videoNotes2.where('profileId').equals(profileId).toArray()
  return rows
    .filter(
      row =>
        normalizeLinkTarget(row.objective) !== wanted &&
        extractLinks(row.content).some(link => normalizeLinkTarget(link) === wanted),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)
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
    await enqueueSyncOperation('videoNote.delete', {
      profileId,
      objective,
      videoId: input.videoId,
      deletedAt: now,
      updatedAt: now,
    })
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
  // Tag-Metadaten anlegen, falls neue Inline-Tags hinzukamen (bestehende Metas
  // mit Farbe/Pin/Beschreibung bleiben unangetastet). Der Notiztext bleibt die
  // Quelle der Tags; die Meta ergänzt nur deren Bedeutung.
  await ensureVideoTagMetaForNote(profileId, tags)
  await enqueueSyncOperation('videoNote.upsert', {
    profileId: record.profileId,
    objective: record.objective,
    videoId: record.videoId,
    content: record.content,
    tags: record.tags,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  })
  return record
}

export async function deleteVideoNote(profileId: string, objective: string): Promise<void> {
  const normalizedProfileId = profileId.trim()
  const normalizedObjective = objective.trim()
  if (!normalizedProfileId || !normalizedObjective) return

  const existing = await db.videoNotes2.get([normalizedProfileId, normalizedObjective])
  const now = Date.now()
  await db.videoNotes2.delete([normalizedProfileId, normalizedObjective])
  await enqueueSyncOperation('videoNote.delete', {
    profileId: normalizedProfileId,
    objective: normalizedObjective,
    videoId: existing?.videoId ?? '',
    deletedAt: now,
    updatedAt: now,
  })
}
