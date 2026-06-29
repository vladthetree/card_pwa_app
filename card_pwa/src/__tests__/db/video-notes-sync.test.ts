/**
 * AI_CONTEXT: Verifies that video note mutations persist locally and enqueue server sync operations.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VideoNoteRecord } from '../../db'

const state = vi.hoisted(() => ({
  notes: new Map<string, VideoNoteRecord>(),
  enqueueSyncOperation: vi.fn(async () => undefined),
}))

function noteKey(profileId: string, objective: string): string {
  return `${profileId}\u0000${objective}`
}

vi.mock('../../db', () => ({
  db: {
    videoNotes2: {
      get: vi.fn(async ([profileId, objective]: [string, string]) => state.notes.get(noteKey(profileId, objective))),
      put: vi.fn(async (note: VideoNoteRecord) => {
        state.notes.set(noteKey(note.profileId, note.objective), note)
      }),
      delete: vi.fn(async ([profileId, objective]: [string, string]) => {
        state.notes.delete(noteKey(profileId, objective))
      }),
      where: vi.fn(() => ({
        equals: vi.fn((profileId: string) => ({
          toArray: vi.fn(async () => Array.from(state.notes.values()).filter(note => note.profileId === profileId)),
        })),
      })),
    },
  },
}))

vi.mock('../../services/syncQueue', () => ({
  enqueueSyncOperation: state.enqueueSyncOperation,
}))

describe('video note sync queue', () => {
  beforeEach(() => {
    state.notes.clear()
    state.enqueueSyncOperation.mockClear()
    vi.restoreAllMocks()
  })

  it('enqueues an upsert when a video note is saved', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234)

    const { saveVideoNote } = await import('../../db/queries/videoNotes')
    const record = await saveVideoNote({
      profileId: 'user-1',
      objective: '1.1',
      videoId: 'video-1.mp4',
      content: 'Meine Notiz #tag',
    })

    expect(record).toMatchObject({
      profileId: 'user-1',
      objective: '1.1',
      videoId: 'video-1.mp4',
      content: 'Meine Notiz #tag',
      tags: ['tag'],
      createdAt: 1234,
      updatedAt: 1234,
    })
    expect(state.enqueueSyncOperation).toHaveBeenCalledWith('videoNote.upsert', {
      profileId: 'user-1',
      objective: '1.1',
      videoId: 'video-1.mp4',
      content: 'Meine Notiz #tag',
      tags: ['tag'],
      createdAt: 1234,
      updatedAt: 1234,
    })
  })

  it('enqueues a delete when a video note is cleared', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(2000)

    const { saveVideoNote } = await import('../../db/queries/videoNotes')
    await saveVideoNote({
      profileId: 'user-1',
      objective: '1.1',
      videoId: 'video-1.mp4',
      content: '',
    })

    expect(state.enqueueSyncOperation).toHaveBeenCalledWith('videoNote.delete', {
      profileId: 'user-1',
      objective: '1.1',
      videoId: 'video-1.mp4',
      deletedAt: 2000,
      updatedAt: 2000,
    })
  })
})
