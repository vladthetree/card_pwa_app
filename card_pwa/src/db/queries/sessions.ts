/**
 * AI_CONTEXT:
 * Role: IndexedDB persistence helpers for active deck/shuffle study sessions so interrupted sessions survive reloads.
 * Used by: StudyView, ShuffleStudyView, and useSessionPersistence.
 * Important: Session payload shape is versioned in studySessionPersistence; keep this layer storage-focused.
 */
import { db } from '../../db'
import { STORAGE_KEYS } from '../../constants/appIdentity'
import {
  buildShuffleSessionId,
  parsePersistedStudySession,
  type PersistedStudySession,
} from '../../services/studySessionPersistence'

export interface ResumableStudySession {
  sessionId: string
  snapshot: PersistedStudySession
}

/**
 * Jüngste wiederaufnehmbare Deck-/Quest-/Tag-Session (nicht abgelaufen, nicht
 * fertig). Shuffle-Sessions haben ihren eigenen Wiedereinstieg und bleiben außen
 * vor. Grundlage der „Weiterlernen“-Kachel auf Home und des ?view=study-Starts.
 */
export async function getResumableStudySession(nowMs = Date.now()): Promise<ResumableStudySession | null> {
  try {
    const records = await db.activeSessions.toArray()
    const candidates = records
      .filter(record => !record.id.startsWith('shuffle:'))
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))

    for (const record of candidates) {
      const snapshot = parsePersistedStudySession(record.payload, record.id, nowMs)
      if (!snapshot || snapshot.isDone || snapshot.cardIds.length === 0) continue
      return { sessionId: record.id, snapshot }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Karten-IDs aus tatsaechlich laufenden, noch gueltigen Study-Sessions.
 * Eine lediglich vorbereitete Auswahl (z. B. der Heute-Paket-Pointer) ist
 * bewusst keine Reservierung: Erst der persistierte Session-Snapshot zeigt,
 * dass der Nutzer diese Karten wirklich begonnen hat.
 */
export async function listReservedStudySessionCardIds(nowMs = Date.now()): Promise<Set<string>> {
  try {
    const records = await db.activeSessions.toArray()
    const reserved = new Set<string>()
    for (const record of records) {
      const snapshot = parsePersistedStudySession(record.payload, record.id, nowMs)
      if (!snapshot || snapshot.isDone) continue
      for (const cardId of snapshot.cardIds) reserved.add(cardId)
    }
    return reserved
  } catch {
    return new Set()
  }
}

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
