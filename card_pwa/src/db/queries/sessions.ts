import { db } from '../../db'
import { STORAGE_KEYS } from '../../constants/appIdentity'

/**
 * Reads the persisted session payload for a deck from IndexedDB.
 * Falls back to the legacy localStorage key on first access (one-time migration).
 */
export async function readActiveSession(deckId: string): Promise<string | null> {
  try {
    const record = await db.activeSessions.get(deckId)
    if (record) return record.payload

    // One-time migration: promote existing localStorage data to IndexedDB.
    if (typeof window !== 'undefined') {
      const legacy = window.localStorage.getItem(STORAGE_KEYS.studySession)
      if (legacy) {
        await db.activeSessions.put({ id: deckId, payload: legacy, updatedAt: Date.now() })
        window.localStorage.removeItem(STORAGE_KEYS.studySession)
        window.localStorage.removeItem(STORAGE_KEYS.legacyStudySession)
        return legacy
      }
    }
    return null
  } catch {
    return null
  }
}

/** Writes session payload to IndexedDB (upsert). */
export async function writeActiveSession(deckId: string, payload: string): Promise<void> {
  try {
    await db.activeSessions.put({ id: deckId, payload, updatedAt: Date.now() })
  } catch {
    // best effort
  }
}

/** Removes the active session record for a deck from IndexedDB. */
export async function clearActiveSession(deckId: string): Promise<void> {
  try {
    await db.activeSessions.delete(deckId)
  } catch {
    // best effort
  }
}
