/**
 * AI_CONTEXT:
 * Role: Profile-scoped persistence for video-note tag metadata (label, description, color, pin, aliases, archive) and aggregated per-tag stats.
 * Used by: saveVideoNote (ensure-on-write), useVideoTags hooks, the tag sidebar/tag-page, and tag edit/merge flows.
 * Important: The note text stays the source of inline #tags; this layer only augments meaning. tagId is always canonical (normalizeTagId); aggregation is delegated to the pure computeVideoTagStats.
 */
import { db, type VideoTagMetaRecord } from '../../db'
import { normalizeTagId, stripTagPrefix } from '../../utils/tagIdentity'
import { computeVideoTagStats, type VideoTagStat } from '../../utils/videoTagStats'
import { listAllCards } from './decks'

/**
 * Tag-Metadaten zu Video-Notiz-Tags. Die Inline-`#tags` im Notiztext bleiben die
 * Quelle der Verknüpfung; diese Datensätze ergänzen pro Tag nur Bedeutung
 * (Label, Beschreibung, Farbe, Pin, Aliase). Pro Profil getrennt
 * (Compound-Primary-Key `[profileId+tagId]`).
 */

/** Felder, die über `updateVideoTagMeta` verändert werden dürfen. */
export interface VideoTagMetaPatch {
  label?: string
  description?: string
  color?: string | null
  icon?: string | null
  pinned?: boolean
  archived?: boolean
  aliases?: string[]
}

function buildMeta(profileId: string, tagId: string, label: string, now: number): VideoTagMetaRecord {
  return {
    profileId,
    tagId,
    label: label || tagId,
    aliases: [],
    description: '',
    color: null,
    icon: null,
    pinned: false,
    archived: false,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Liefert die Meta zu `rawTag`, legt sie bei Bedarf an (label = Schreibweise von
 * `rawTag`). `null` bei leerem Profil/Tag.
 */
export async function ensureVideoTagMeta(profileId: string, rawTag: string): Promise<VideoTagMetaRecord | null> {
  const pid = profileId.trim()
  const tagId = normalizeTagId(rawTag)
  if (!pid || !tagId) return null

  const existing = await db.videoTagMeta.get([pid, tagId])
  if (existing) return existing

  const record = buildMeta(pid, tagId, stripTagPrefix(rawTag), Date.now())
  await db.videoTagMeta.put(record)
  return record
}

/**
 * Legt Meta-Datensätze für alle Tags einer gerade gespeicherten Notiz an, falls
 * noch nicht vorhanden. Wird nach `saveVideoNote` aufgerufen; bestehende Metas
 * (mit Farbe/Pin/Beschreibung) bleiben unangetastet.
 */
export async function ensureVideoTagMetaForNote(profileId: string, tags: string[]): Promise<void> {
  const pid = profileId.trim()
  if (!pid || tags.length === 0) return

  const now = Date.now()
  await db.transaction('rw', db.videoTagMeta, async () => {
    for (const rawTag of tags) {
      const tagId = normalizeTagId(rawTag)
      if (!tagId) continue
      const existing = await db.videoTagMeta.get([pid, tagId])
      if (existing) continue
      await db.videoTagMeta.put(buildMeta(pid, tagId, stripTagPrefix(rawTag), now))
    }
  })
}

/** Alle nicht-archivierten Tags des Profils, sortiert: gepinnt zuerst, dann Label. */
export async function listVideoTagMeta(profileId: string): Promise<VideoTagMetaRecord[]> {
  const pid = profileId.trim()
  if (!pid) return []
  const rows = await db.videoTagMeta.where('profileId').equals(pid).toArray()
  return rows
    .filter(row => !row.archived)
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        a.label.localeCompare(b.label) ||
        a.tagId.localeCompare(b.tagId),
    )
}

/** Meta per kanonischer Tag-ID ODER über einen Alias finden. */
export async function getVideoTagMeta(profileId: string, tag: string): Promise<VideoTagMetaRecord | null> {
  const pid = profileId.trim()
  const tagId = normalizeTagId(tag)
  if (!pid || !tagId) return null

  const direct = await db.videoTagMeta.get([pid, tagId])
  if (direct) return direct

  const rows = await db.videoTagMeta.where('profileId').equals(pid).toArray()
  return rows.find(row => row.aliases.some(alias => normalizeTagId(alias) === tagId)) ?? null
}

/**
 * Aktualisiert erlaubte Felder eines Tags. Legt die Meta an, falls sie noch
 * fehlt (lazy). `profileId`/`tagId`/`createdAt` bleiben unveränderlich.
 */
export async function updateVideoTagMeta(
  profileId: string,
  tag: string,
  patch: VideoTagMetaPatch,
): Promise<VideoTagMetaRecord | null> {
  const pid = profileId.trim()
  const tagId = normalizeTagId(tag)
  if (!pid || !tagId) return null

  const now = Date.now()
  const existing = (await db.videoTagMeta.get([pid, tagId])) ?? buildMeta(pid, tagId, stripTagPrefix(tag), now)

  const next: VideoTagMetaRecord = {
    ...existing,
    ...(patch.label !== undefined ? { label: patch.label.trim() || existing.label } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.color !== undefined ? { color: patch.color } : {}),
    ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
    ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
    ...(patch.archived !== undefined ? { archived: patch.archived } : {}),
    ...(patch.aliases !== undefined
      ? { aliases: dedupeAliases(patch.aliases, tagId) }
      : {}),
    updatedAt: now,
  }
  await db.videoTagMeta.put(next)
  return next
}

/** Normalisiert Aliase, entfernt Leere/Duplikate und den eigenen Haupt-Tag. */
function dedupeAliases(aliases: string[], mainTagId: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of aliases) {
    const id = normalizeTagId(raw)
    if (!id || id === mainTagId || seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}

/** Markiert einen Tag als archiviert (Inhalte/Notizen bleiben erhalten). */
export async function archiveVideoTag(profileId: string, tag: string): Promise<void> {
  await updateVideoTagMeta(profileId, tag, { archived: true })
}

/**
 * Löst `rawTag` auf seine kanonische ID auf: ist `rawTag` der Alias eines anderen
 * Tags, wird dessen Haupt-`tagId` zurückgegeben, sonst die eigene `tagId`.
 */
export async function resolveVideoTagId(profileId: string, rawTag: string): Promise<string> {
  const pid = profileId.trim()
  const tagId = normalizeTagId(rawTag)
  if (!pid || !tagId) return ''

  const direct = await db.videoTagMeta.get([pid, tagId])
  if (direct) return tagId

  const rows = await db.videoTagMeta.where('profileId').equals(pid).toArray()
  const owner = rows.find(row => row.aliases.some(alias => normalizeTagId(alias) === tagId))
  return owner ? owner.tagId : tagId
}

/**
 * Kennzahlen pro Tag (Notizen, Karten, Zeitmarken, offene Fragen, Kartenideen,
 * verwandte Tags) — in EINEM Durchlauf über Notizen + Karten berechnet.
 */
export async function listVideoTagStats(profileId: string): Promise<VideoTagStat[]> {
  const pid = profileId.trim()
  if (!pid) return []

  const [notes, metas, cards] = await Promise.all([
    db.videoNotes2.where('profileId').equals(pid).toArray(),
    db.videoTagMeta.where('profileId').equals(pid).toArray(),
    listAllCards(),
  ])

  return computeVideoTagStats({
    notes: notes.map(note => ({ content: note.content, tags: note.tags })),
    metas: metas.map(meta => ({
      tagId: meta.tagId,
      label: meta.label,
      aliases: meta.aliases,
      pinned: meta.pinned,
      color: meta.color,
      archived: meta.archived,
    })),
    cards: cards.map(card => ({ tags: card.tags })),
  })
}
