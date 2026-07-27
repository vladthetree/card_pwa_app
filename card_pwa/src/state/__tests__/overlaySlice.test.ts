import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAppStoreState, resetAppStoreForTests } from '../appStore'

describe('overlay slice', () => {
  beforeEach(() => {
    resetAppStoreForTests()
  })

  it('opens overlays as a stack and reports the top overlay id', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123)
    const store = getAppStoreState()

    store.openOverlay({ id: 'settings' })
    store.openOverlay({ id: 'confirm-delete', payload: { cardId: 'c1' } })

    const next = getAppStoreState()
    expect(next.overlayStack).toHaveLength(2)
    expect(next.overlayStack[1]).toMatchObject({
      id: 'confirm-delete',
      payload: { cardId: 'c1' },
      dismissible: true,
      openedAt: 123,
    })
    expect(next.topOverlayId()).toBe('confirm-delete')
  })

  it('closes the top overlay by default and records the close reason', () => {
    const store = getAppStoreState()
    store.openOverlay({ id: 'settings' })
    store.openOverlay({ id: 'confirm-delete' })

    getAppStoreState().closeOverlay(undefined, 'escape')

    const next = getAppStoreState()
    expect(next.overlayStack.map(overlay => overlay.id)).toEqual(['settings'])
    expect(next.lastCloseReason).toBe('escape')
  })

  it('updates active payload without replacing the stack', () => {
    const store = getAppStoreState()
    store.openOverlay({ id: 'edit-card', payload: { cardId: 'old' } })

    getAppStoreState().setActivePayload('edit-card', { cardId: 'new' })

    expect(getAppStoreState().overlayStack[0]?.payload).toEqual({ cardId: 'new' })
  })
})

