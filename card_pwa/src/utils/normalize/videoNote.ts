/**
 * AI_CONTEXT: Normalizes video note payloads from sync/snapshot/bootstrap into
 * the local VideoNoteRecord shape.
 */
import type { VideoNoteRecord } from '../../db'
import { normalizeTagId } from '../tagIdentity'
import { extractTags } from '../videoTags'

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function readLooseString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function readTimestamp(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function normalizeTags(rawTags: unknown, content: string): string[] {
  const input = Array.isArray(rawTags)
    ? rawTags
    : typeof rawTags === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(rawTags)
            return Array.isArray(parsed) ? parsed : []
          } catch {
            return []
          }
        })()
      : []

  const source = input.length > 0 ? input : extractTags(content)
  const seen = new Set<string>()
  const tags: string[] = []

  for (const entry of source) {
    const tag = String(entry ?? '').trim()
    const key = normalizeTagId(tag)
    if (!tag || !key || seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
  }

  return tags
}

export function normalizeVideoNote(raw: unknown, fallbackProfileId?: string): VideoNoteRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>

  const profileId = readString(value.profileId ?? value.profile_id ?? fallbackProfileId)
  const objective = readString(value.objective)
  if (!profileId || !objective) return null

  const content = readLooseString(value.content)
  const createdAt = readTimestamp(value.createdAt ?? value.created_at)
  const updatedAt = readTimestamp(value.updatedAt ?? value.updated_at ?? value.timestamp)
  const now = Date.now()

  return {
    profileId,
    objective,
    videoId: readString(value.videoId ?? value.video_id),
    content,
    tags: normalizeTags(value.tags ?? value.tags_json, content),
    createdAt: createdAt ?? updatedAt ?? now,
    updatedAt: updatedAt ?? createdAt ?? now,
  }
}
