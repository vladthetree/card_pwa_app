/**
 * AI_CONTEXT:
 * Role: Pure single-pass aggregation of per-tag stats (notes, cards, timestamps, questions, card ideas, related tags) for video-note tags.
 * Used by: db/queries/videoTagMeta.listVideoTagStats and the tag sidebar/tag-page hooks.
 * Important: DB/React-free so it stays unit-testable; reuses videoNoteSignals + videoTimeAnchors rather than re-parsing note structure, and resolves aliases to a single canonical tagId.
 */
import { normalizeTagId, stripTagPrefix } from './tagIdentity'
import { summarizeVideoNoteSignals } from './videoNoteSignals'
import { extractVideoTimeAnchors } from './videoTimeAnchors'

/** Aggregierte Kennzahlen pro Tag — Grundlage für Sidebar-Counts und Tag-Seite. */
export interface VideoTagStat {
  tagId: string
  label: string
  pinned: boolean
  color: string | null
  noteCount: number
  cardCount: number
  timestampCount: number
  questionCount: number
  cardIdeaCount: number
  relatedCount: number
}

/** Nur die Felder, die die Aggregation tatsächlich liest — entkoppelt von Dexie. */
export interface VideoTagStatsInput {
  notes: Array<{ content: string; tags: string[] }>
  metas: Array<{
    tagId: string
    label: string
    aliases: string[]
    pinned: boolean
    color: string | null
    archived: boolean
  }>
  cards: Array<{ tags: string[] }>
}

interface Accumulator {
  tagId: string
  label: string
  noteCount: number
  cardCount: number
  timestampCount: number
  questionCount: number
  cardIdeaCount: number
  related: Set<string>
}

/**
 * Berechnet alle Tag-Kennzahlen in EINEM Durchlauf über Notizen + Karten (statt
 * pro Tag eine eigene Query abzusetzen — das wäre O(Tags × Karten)). Aliase
 * lösen auf ihren Haupt-Tag auf; archivierte Tags fallen heraus.
 */
export function computeVideoTagStats(input: VideoTagStatsInput): VideoTagStat[] {
  const metaById = new Map(input.metas.map(meta => [meta.tagId, meta]))

  // Alias-ID → Haupt-Tag-ID, damit getaggte Inhalte unter dem Haupt-Tag zählen.
  const aliasToMain = new Map<string, string>()
  for (const meta of input.metas) {
    for (const rawAlias of meta.aliases) {
      const aliasId = normalizeTagId(rawAlias)
      if (aliasId && aliasId !== meta.tagId) aliasToMain.set(aliasId, meta.tagId)
    }
  }
  const resolve = (rawTag: string): string => {
    const id = normalizeTagId(rawTag)
    if (!id) return ''
    return aliasToMain.get(id) ?? id
  }

  const acc = new Map<string, Accumulator>()
  const bucket = (tagId: string, label: string): Accumulator => {
    let entry = acc.get(tagId)
    if (!entry) {
      entry = {
        tagId,
        label: metaById.get(tagId)?.label || label || tagId,
        noteCount: 0,
        cardCount: 0,
        timestampCount: 0,
        questionCount: 0,
        cardIdeaCount: 0,
        related: new Set<string>(),
      }
      acc.set(tagId, entry)
    }
    return entry
  }

  for (const note of input.notes) {
    // Distinct resolved tag IDs in this note (display label = first spelling seen).
    const idsInNote = new Map<string, string>()
    for (const rawTag of note.tags ?? []) {
      const id = resolve(rawTag)
      if (!id || idsInNote.has(id)) continue
      idsInNote.set(id, stripTagPrefix(rawTag) || id)
    }
    if (idsInNote.size === 0) continue

    const timestampCount = extractVideoTimeAnchors(note.content).length
    const signals = summarizeVideoNoteSignals(note.content, Number.MAX_SAFE_INTEGER)
    const questionCount = signals.questions.length
    const cardIdeaCount = signals.cardIdeas.length

    const ids = [...idsInNote.keys()]
    for (const id of ids) {
      const entry = bucket(id, idsInNote.get(id) ?? id)
      entry.noteCount += 1
      entry.timestampCount += timestampCount
      entry.questionCount += questionCount
      entry.cardIdeaCount += cardIdeaCount
      for (const other of ids) if (other !== id) entry.related.add(other)
    }
  }

  for (const card of input.cards) {
    const seen = new Set<string>()
    for (const rawTag of card.tags ?? []) {
      const id = resolve(rawTag)
      if (!id || seen.has(id)) continue
      seen.add(id)
      bucket(id, metaById.get(id)?.label ?? '').cardCount += 1
    }
  }

  // Tags, die nur Metadaten haben (z. B. beschrieben, aber gerade ohne Inhalt),
  // bleiben in der Liste sichtbar — mit Null-Counts.
  for (const meta of input.metas) {
    if (!meta.archived && !acc.has(meta.tagId)) bucket(meta.tagId, meta.label)
  }

  return [...acc.values()]
    .filter(entry => !metaById.get(entry.tagId)?.archived)
    .map(entry => ({
      tagId: entry.tagId,
      label: metaById.get(entry.tagId)?.label || entry.label,
      pinned: metaById.get(entry.tagId)?.pinned ?? false,
      color: metaById.get(entry.tagId)?.color ?? null,
      noteCount: entry.noteCount,
      cardCount: entry.cardCount,
      timestampCount: entry.timestampCount,
      questionCount: entry.questionCount,
      cardIdeaCount: entry.cardIdeaCount,
      relatedCount: entry.related.size,
    }))
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        a.label.localeCompare(b.label) ||
        a.tagId.localeCompare(b.tagId),
    )
}

/**
 * Filtert Tag-Stats nach einem Suchbegriff — teilstring, case-insensitiv, gegen
 * Anzeige-Label UND kanonische Tag-ID (damit "zero trust" auch `zero-trust`
 * findet). Leere Eingabe lässt die Liste unverändert. Rein, damit die Sidebar-
 * Suche ohne DOM getestet werden kann.
 */
export function filterVideoTagStats(stats: VideoTagStat[], query: string): VideoTagStat[] {
  const q = query.trim().toLowerCase()
  if (!q) return stats
  const qId = normalizeTagId(query)
  return stats.filter(
    stat =>
      stat.label.toLowerCase().includes(q) ||
      stat.tagId.includes(q) ||
      (qId !== '' && stat.tagId.includes(qId)),
  )
}
