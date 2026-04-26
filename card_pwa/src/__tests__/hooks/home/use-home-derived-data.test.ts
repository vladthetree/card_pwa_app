import { beforeEach, describe, expect, it, vi } from 'vitest'

const runtime = vi.hoisted(() => ({
  getDeckHomeMetadata: vi.fn(),
  getFutureDueForecast: vi.fn(),
  listDecksForBackup: vi.fn(),
  buildSelectedShuffleCards: vi.fn(),
  getSyncedDeckIds: vi.fn(),
}))

vi.mock('../../../db/queries', () => ({
  getDeckHomeMetadata: runtime.getDeckHomeMetadata,
  getFutureDueForecast: runtime.getFutureDueForecast,
}))

vi.mock('../../../utils/dbBackup', () => ({
  listDecksForBackup: runtime.listDecksForBackup,
}))

vi.mock('../../../services/ShuffleSessionManager', () => ({
  buildSelectedShuffleCards: runtime.buildSelectedShuffleCards,
}))

vi.mock('../../../services/syncedDeckScope', () => ({
  getSyncedDeckIds: runtime.getSyncedDeckIds,
}))

describe('useHomeDerivedData helpers', () => {
  beforeEach(() => {
    runtime.getDeckHomeMetadata.mockReset()
    runtime.getFutureDueForecast.mockReset()
    runtime.listDecksForBackup.mockReset()
    runtime.buildSelectedShuffleCards.mockReset()
    runtime.getSyncedDeckIds.mockReset()
  })

  it('returns empty structures without touching queries when there is no input data', async () => {
    const {
      loadHomeDeckOptions,
      loadHomeFutureForecast,
      loadHomeSyncedDeckIds,
      loadHomeShuffleSummaries,
      loadHomeDeckScheduleOverview,
      loadHomeDeckTagIndex,
      loadHomeDeckMetadata,
    } = await import('../../../hooks/home/useHomeDerivedData')

    await expect(loadHomeDeckOptions(false)).resolves.toEqual([])
    await expect(loadHomeFutureForecast(false, 4)).resolves.toEqual([])
    await expect(loadHomeSyncedDeckIds('local')).resolves.toEqual([])
    await expect(loadHomeShuffleSummaries({
      shuffleCollections: [],
      profileMode: 'local',
      studyCardLimit: 50,
      nextDayStartsAt: 4,
    })).resolves.toEqual({})
    await expect(loadHomeDeckScheduleOverview([], 50, 4)).resolves.toEqual({})
    await expect(loadHomeDeckTagIndex([])).resolves.toEqual({})
    await expect(loadHomeDeckMetadata([], 50, 4)).resolves.toEqual({
      deckScheduleOverview: {},
      deckTagIndex: {},
    })

    expect(runtime.listDecksForBackup).not.toHaveBeenCalled()
    expect(runtime.getFutureDueForecast).not.toHaveBeenCalled()
    expect(runtime.buildSelectedShuffleCards).not.toHaveBeenCalled()
    expect(runtime.getDeckHomeMetadata).not.toHaveBeenCalled()
  })

  it('builds shuffle summaries with synced scope and selected cards', async () => {
    runtime.getSyncedDeckIds.mockResolvedValue(['deck-1'])
    runtime.buildSelectedShuffleCards.mockResolvedValue([{ id: 'card-1' }, { id: 'card-2' }])

    const { loadHomeShuffleSummaries } = await import('../../../hooks/home/useHomeDerivedData')
    const result = await loadHomeShuffleSummaries({
      shuffleCollections: [
        {
          id: 'shuffle-1',
          name: 'Mixed',
          deckIds: ['deck-1', 'deck-2'],
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      profileMode: 'linked',
      profileUserId: 'profile-1',
      studyCardLimit: 50,
      nextDayStartsAt: 4,
    })

    expect(runtime.getSyncedDeckIds).toHaveBeenCalledWith('profile-1')
    expect(runtime.buildSelectedShuffleCards).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'shuffle-1' }),
      expect.objectContaining({
        userId: 'profile-1',
        maxCards: 50,
        nextDayStartsAt: 4,
      }),
    )
    expect(result).toEqual({
      'shuffle-1': {
        selectedCount: 2,
        inScopeDecks: 1,
        outOfScopeDecks: 1,
      },
    })
  })
})
