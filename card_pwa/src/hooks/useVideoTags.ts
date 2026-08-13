/**
 * AI_CONTEXT:
 * Role: React liveQuery hooks for profile-scoped video-tag metadata, aggregated tag stats, single-tag lookup, and alias resolution.
 * Used by: the tag sidebar, the tag page, and tag edit/merge UI.
 * Important: These mirror db/queries/videoTagMeta without owning rules; every query path stays scoped to profileId and re-emits when notes, cards, or tag meta change.
 */
import { type VideoTagMetaRecord } from '../db'
import { getVideoTagMeta, listVideoTagStats } from '../db/queries/videoTagMeta'
import type { VideoTagStat } from '../utils/videoTagStats'
import { useLiveQueryValue } from './useLiveQueryValue'

/**
 * Live-aktualisierte Tag-Metadaten und -Kennzahlen für den Videomodus. Alle Hooks
 * sind auf das aktive Profil (`profileId`) eingeschränkt.
 */

/** Kennzahlen pro Tag (Notizen/Karten/Zeitmarken/Fragen/Kartenideen/verwandt). */
export function useVideoTagStats(profileId: string): VideoTagStat[] {
  return useLiveQueryValue(() => listVideoTagStats(profileId), [profileId], [] as VideoTagStat[])
}

/** Meta eines einzelnen Tags (per ID oder Alias), reaktiv. */
export function useVideoTag(profileId: string, tag: string | null): VideoTagMetaRecord | null {
  return useLiveQueryValue(() => getVideoTagMeta(profileId, tag as string), [profileId, tag], null as VideoTagMetaRecord | null, { skip: !tag })
}
