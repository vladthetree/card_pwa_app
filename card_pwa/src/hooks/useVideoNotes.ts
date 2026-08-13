/**
 * AI_CONTEXT:
 * Role: React liveQuery hooks for profile-scoped video notes, tag lists, related tags, and objective note indexes.
 * Used by: VideosView, VideoNotesPanel, and TagCollectionPanel.
 * Important: These hooks intentionally mirror db/queries/videoNotes without owning parsing rules; keep profileId in every query path.
 */
import { useEffect, useMemo, useState } from 'react'
import { liveQuery } from 'dexie'
import { type VideoNoteRecord } from '../db'
import {
  getVideoNote,
  listAllVideoNoteTags,
  listNotesByTag,
  listNotesLinkingTo,
  listObjectivesWithNotes,
  listRelatedVideoNoteTags,
} from '../db/queries/videoNotes'
import type { RelatedTagStats } from '../utils/videoTags'
import { useLiveQueryValue } from './useLiveQueryValue'

/**
 * Live-aktualisierte Notizzettel zu Lernvideos (Desktop-Videomodus). Alle Hooks
 * sind auf das aktive Profil (`profileId`) eingeschränkt — so sieht jedes Profil
 * nur die eigenen Notizen/Tags.
 */

/** Notiz für ein einzelnes Objective im Profil, reaktiv aktualisiert. */
export function useVideoNote(profileId: string, objective: string | null): {
  note: VideoNoteRecord | null
  loading: boolean
  /**
   * Objective, zu dem `note` zuletzt tatsächlich aufgelöst wurde. Entkoppelt vom
   * gerade angefragten `objective`: solange die Live-Query für ein neues Objective
   * noch nicht emittiert hat, hält `note` den Stand des vorherigen — Verbraucher
   * dürfen erst übernehmen, wenn `resolvedObjective === objective`.
   */
  resolvedObjective: string | null
} {
  const [state, setState] = useState<{ note: VideoNoteRecord | null; resolvedObjective: string | null; loading: boolean }>(
    () => ({ note: null, resolvedObjective: null, loading: true }),
  )

  useEffect(() => {
    if (!objective) {
      setState({ note: null, resolvedObjective: null, loading: false })
      return
    }
    setState(prev => ({ ...prev, loading: true }))
    const subscription = liveQuery(() => getVideoNote(profileId, objective)).subscribe({
      next: record => setState({ note: record ?? null, resolvedObjective: objective, loading: false }),
      error: () => setState(prev => ({ ...prev, loading: false })),
    })
    return () => subscription.unsubscribe()
  }, [profileId, objective])

  return { note: state.note, loading: state.loading, resolvedObjective: state.resolvedObjective }
}

/** Alle Notizen des Profils mit einem bestimmten Tag, reaktiv — für die
 *  Tag-Ansicht (verbundene Videos). Leerer/`null`-Tag ⇒ leere Liste. */
export function useNotesByTag(profileId: string, tag: string | null): VideoNoteRecord[] {
  return useLiveQueryValue(() => listNotesByTag(profileId, tag as string), [profileId, tag], [] as VideoNoteRecord[], { skip: !tag })
}

/** Set aller Objectives des Profils mit einer nicht-leeren Notiz (Inhalt/Tags). */
export function useObjectivesWithNotes(profileId: string): Set<string> {
  return useLiveQueryValue(() => listObjectivesWithNotes(profileId), [profileId], new Set<string>(), { resetOnError: false })
}

/** Alle vergebenen Tags des Profils (eindeutig, alphabetisch). */
export function useAllVideoNoteTags(profileId: string): string[] {
  return useLiveQueryValue(() => listAllVideoNoteTags(profileId), [profileId], [] as string[], { resetOnError: false })
}

/** Backlinks: Notizen des Profils, die per `[[target]]` auf ein Ziel
 *  (i. d. R. Objective-Code) verweisen, reaktiv. Leerer/`null`-Ziel ⇒ leer. */
export function useBacklinks(profileId: string, target: string | null): VideoNoteRecord[] {
  return useLiveQueryValue(() => listNotesLinkingTo(profileId, target as string), [profileId, target], [] as VideoNoteRecord[], { skip: !target })
}

/** Verwandte Video-Notiz-Tags zu einem aktiven Tag, reaktiv aktualisiert. */
export function useRelatedVideoNoteTags(profileId: string, tag: string | null): RelatedTagStats[] {
  return useLiveQueryValue(() => listRelatedVideoNoteTags(profileId, tag as string), [profileId, tag], [] as RelatedTagStats[], { skip: !tag })
}

/** Bequemer kombinierter Index für die Videoliste. */
export function useVideoNoteIndex(profileId: string): { withNotes: Set<string>; allTags: string[] } {
  const withNotes = useObjectivesWithNotes(profileId)
  const allTags = useAllVideoNoteTags(profileId)
  return useMemo(() => ({ withNotes, allTags }), [withNotes, allTags])
}
