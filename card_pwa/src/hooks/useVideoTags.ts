/**
 * AI_CONTEXT:
 * Role: React liveQuery hooks for profile-scoped video-tag metadata, aggregated tag stats, single-tag lookup, and alias resolution.
 * Used by: the tag sidebar, the tag page, and tag edit/merge UI.
 * Important: These mirror db/queries/videoTagMeta without owning rules; every query path stays scoped to profileId and re-emits when notes, cards, or tag meta change.
 */
import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { type VideoTagMetaRecord } from '../db'
import {
  getVideoTagMeta,
  listVideoTagMeta,
  listVideoTagStats,
  resolveVideoTagId,
} from '../db/queries/videoTagMeta'
import type { VideoTagStat } from '../utils/videoTagStats'

/**
 * Live-aktualisierte Tag-Metadaten und -Kennzahlen für den Videomodus. Alle Hooks
 * sind auf das aktive Profil (`profileId`) eingeschränkt.
 */

/** Alle nicht-archivierten Tag-Metadaten des Profils (gepinnt zuerst). */
export function useVideoTagMeta(profileId: string): VideoTagMetaRecord[] {
  const [metas, setMetas] = useState<VideoTagMetaRecord[]>([])

  useEffect(() => {
    const subscription = liveQuery(() => listVideoTagMeta(profileId)).subscribe({
      next: rows => setMetas(rows),
      error: () => setMetas([]),
    })
    return () => subscription.unsubscribe()
  }, [profileId])

  return metas
}

/** Kennzahlen pro Tag (Notizen/Karten/Zeitmarken/Fragen/Kartenideen/verwandt). */
export function useVideoTagStats(profileId: string): VideoTagStat[] {
  const [stats, setStats] = useState<VideoTagStat[]>([])

  useEffect(() => {
    const subscription = liveQuery(() => listVideoTagStats(profileId)).subscribe({
      next: rows => setStats(rows),
      error: () => setStats([]),
    })
    return () => subscription.unsubscribe()
  }, [profileId])

  return stats
}

/** Meta eines einzelnen Tags (per ID oder Alias), reaktiv. */
export function useVideoTag(profileId: string, tag: string | null): VideoTagMetaRecord | null {
  const [meta, setMeta] = useState<VideoTagMetaRecord | null>(null)

  useEffect(() => {
    if (!tag) {
      setMeta(null)
      return
    }
    const subscription = liveQuery(() => getVideoTagMeta(profileId, tag)).subscribe({
      next: record => setMeta(record),
      error: () => setMeta(null),
    })
    return () => subscription.unsubscribe()
  }, [profileId, tag])

  return meta
}

/** Kanonische Tag-ID zu `rawTag` (folgt Aliassen), reaktiv. Leerer Tag ⇒ `''`. */
export function useResolvedVideoTag(profileId: string, rawTag: string | null): string {
  const [resolved, setResolved] = useState('')

  useEffect(() => {
    if (!rawTag) {
      setResolved('')
      return
    }
    const subscription = liveQuery(() => resolveVideoTagId(profileId, rawTag)).subscribe({
      next: id => setResolved(id),
      error: () => setResolved(''),
    })
    return () => subscription.unsubscribe()
  }, [profileId, rawTag])

  return resolved
}
