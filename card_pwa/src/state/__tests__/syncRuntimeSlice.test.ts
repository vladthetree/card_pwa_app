import { beforeEach, describe, expect, it } from 'vitest'
import { getAppStoreState, resetAppStoreForTests } from '../appStore'

describe('sync runtime slice', () => {
  beforeEach(() => {
    resetAppStoreForTests()
  })

  it('tracks sync status and counters without storing queue records', () => {
    const store = getAppStoreState()

    store.setSyncStatus('syncing')
    getAppStoreState().setSyncCounters({ pendingCount: 4, deadLetterCount: 1 })

    expect(getAppStoreState()).toMatchObject({
      syncStatus: 'syncing',
      pendingCount: 4,
      deadLetterCount: 1,
    })
  })

  it('records success and error states', () => {
    const store = getAppStoreState()

    store.markSyncError('network down')
    expect(getAppStoreState()).toMatchObject({
      syncStatus: 'error',
      lastError: 'network down',
    })

    getAppStoreState().markSyncSuccess(42)
    expect(getAppStoreState()).toMatchObject({
      syncStatus: 'idle',
      lastSuccessfulSyncAt: 42,
      lastError: null,
    })
  })
})
