import { db } from '../../db'
import { STORAGE_KEYS } from '../../constants/appIdentity'
import { buildShuffleSessionId } from '../../services/studySessionPersistence'

interface ReadSessionOptions {
  migrateLegacyLocalStorage?: boolean
}

async function readActiveSessionById(
  sessionId: string,
  options: ReadSessionOptions = {},
): Promise<string | null> {
  const { migrateLegacyLocalStorage = false } = options

  try {
    const record = await db.activeSessions.get(sessionId)
    if (record) return record.payload

    // One-time migration: promote existing localStorage data to IndexedDB.
    if (migrateLegacyLocalStorage && typeof window !== 'undefined') {
      const legacy = window.localStorage.getItem(STORAGE_KEYS.studySession)
      if (legacy) {
        await db.activeSessions.put({ id: sessionId, payload: legacy, updatedAt: Date.now() })
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

async function writeActiveSessionById(sessionId: string, payload: string): Promise<void> {
  try {
    await db.activeSessions.put({ id: sessionId, payload, updatedAt: Date.now() })
  } catch {
    // best effort
  }
}

async function clearActiveSessionById(sessionId: string): Promise<void> {
  try {
    await db.activeSessions.delete(sessionId)
  } catch {
    // best effort
  }
}

/**
 * Reads the persisted session payload for a deck from IndexedDB.
 * Falls back to the legacy localStorage key on first access (one-time migration).
 */
export async function readActiveSession(deckId: string): Promise<string | null> {
  return readActiveSessionById(deckId, { migrateLegacyLocalStorage: true })
}

/** Writes session payload to IndexedDB (upsert). */
export async function writeActiveSession(deckId: string, payload: string): Promise<void> {
  await writeActiveSessionById(deckId, payload)
}

/** Removes the active session record for a deck from IndexedDB. */
export async function clearActiveSession(deckId: string): Promise<void> {
  await clearActiveSessionById(deckId)
}

export async function readShuffleSession(collectionId: string): Promise<string | null> {
  return readActiveSessionById(buildShuffleSessionId(collectionId))
}

export async function writeShuffleSession(collectionId: string, payload: string): Promise<void> {
  await writeActiveSessionById(buildShuffleSessionId(collectionId), payload)
}

export async function clearShuffleSession(collectionId: string): Promise<void> {
  await clearActiveSessionById(buildShuffleSessionId(collectionId))
}
