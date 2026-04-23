/**
 * syncedDeckScope.ts
 *
 * Provides the authoritative set of deck IDs that are eligible for study
 * (and shuffle) in the current profile mode.
 *
 * - Linked profile: intersection of readSelectedDeckIds(userId) and all local,
 *   non-deleted decks.
 * - Local-only profile: all local, non-deleted decks.
 *
 * No Shuffle-specific logic lives here — this module is a pure helper that
 * anything (Shuffle or future features) can consume.
 */

import { db } from '../db'
import { isSyncActive } from './syncConfig'
import { readSelectedDeckIds } from './profileService'

/**
 * Returns the IDs of all decks that are currently "in scope" for study.
 *
 * @param userId  The userId of the linked profile (required when the profile
 *                is in linked mode; ignored in local-only mode).
 */
export async function getSyncedDeckIds(userId?: string): Promise<string[]> {
  const localDecks = await db.decks.filter(d => !d.isDeleted).toArray()
  const localIds = localDecks.map(d => d.id)

  if (isSyncActive() && userId) {
    const serverSelected = readSelectedDeckIds(userId)
    // Empty serverSelected means "all synced decks" (user never narrowed down).
    if (serverSelected.length === 0) return localIds
    const serverSet = new Set(serverSelected)
    return localIds.filter(id => serverSet.has(id))
  }

  // Local-only: all non-deleted decks are in scope.
  return localIds
}
