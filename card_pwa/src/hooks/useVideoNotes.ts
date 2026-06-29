/**
 * AI_CONTEXT:
 * Role: React liveQuery hooks for profile-scoped video notes, tag lists, related tags, and objective note indexes.
 * Used by: VideosView, VideoNotesPanel, TagCollectionPanel, and TagBrowserSection.
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
  const [notes, setNotes] = useState<VideoNoteRecord[]>([])

  useEffect(() => {
    if (!tag) {
      setNotes([])
      return
    }
    const subscription = liveQuery(() => listNotesByTag(profileId, tag)).subscribe({
      next: rows => setNotes(rows),
      error: () => setNotes([]),
    })
    return () => subscription.unsubscribe()
  }, [profileId, tag])

  return notes
}

/** Set aller Objectives des Profils mit einer nicht-leeren Notiz (Inhalt/Tags). */
export function useObjectivesWithNotes(profileId: string): Set<string> {
  const [objectives, setObjectives] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    const subscription = liveQuery(() => listObjectivesWithNotes(profileId)).subscribe({
      next: set => setObjectives(set),
      error: () => {},
    })
    return () => subscription.unsubscribe()
  }, [profileId])

  return objectives
}

/** Alle vergebenen Tags des Profils (eindeutig, alphabetisch). */
export function useAllVideoNoteTags(profileId: string): string[] {
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    const subscription = liveQuery(() => listAllVideoNoteTags(profileId)).subscribe({
      next: rows => setTags(rows),
      error: () => {},
    })
    return () => subscription.unsubscribe()
  }, [profileId])

  return tags
}

/** Backlinks: Notizen des Profils, die per `[[target]]` auf ein Ziel
 *  (i. d. R. Objective-Code) verweisen, reaktiv. Leerer/`null`-Ziel ⇒ leer. */
export function useBacklinks(profileId: string, target: string | null): VideoNoteRecord[] {
  const [notes, setNotes] = useState<VideoNoteRecord[]>([])

  useEffect(() => {
    if (!target) {
      setNotes([])
      return
    }
    const subscription = liveQuery(() => listNotesLinkingTo(profileId, target)).subscribe({
      next: rows => setNotes(rows),
      error: () => setNotes([]),
    })
    return () => subscription.unsubscribe()
  }, [profileId, target])

  return notes
}

/** Verwandte Video-Notiz-Tags zu einem aktiven Tag, reaktiv aktualisiert. */
export function useRelatedVideoNoteTags(profileId: string, tag: string | null): RelatedTagStats[] {
  const [related, setRelated] = useState<RelatedTagStats[]>([])

  useEffect(() => {
    if (!tag) {
      setRelated([])
      return
    }
    const subscription = liveQuery(() => listRelatedVideoNoteTags(profileId, tag)).subscribe({
      next: rows => setRelated(rows),
      error: () => setRelated([]),
    })
    return () => subscription.unsubscribe()
  }, [profileId, tag])

  return related
}

/** Bequemer kombinierter Index für die Videoliste. */
export function useVideoNoteIndex(profileId: string): { withNotes: Set<string>; allTags: string[] } {
  const withNotes = useObjectivesWithNotes(profileId)
  const allTags = useAllVideoNoteTags(profileId)
  return useMemo(() => ({ withNotes, allTags }), [withNotes, allTags])
}
