/**
 * AI_CONTEXT: Guards the appStore action-reference-stability fix. Before this,
 * getAppStoreState() rebuilt every action closure on each call, so any selector
 * that returned an action (useAppStore(s => s.openOverlay)) would fail
 * useSyncExternalStore's Object.is snapshot comparison on every read — not yet
 * hit in production only because no call site selected an action directly.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { getAppStoreState, resetAppStoreForTests } from '../appStore'

describe('appStore action reference stability', () => {
  beforeEach(() => {
    resetAppStoreForTests()
  })

  it('returns the same action function identity across repeated reads', () => {
    const first = getAppStoreState()
    const second = getAppStoreState()

    expect(second.openOverlay).toBe(first.openOverlay)
    expect(second.closeOverlay).toBe(first.closeOverlay)
    expect(second.topOverlayId).toBe(first.topOverlayId)
    expect(second.setActiveView).toBe(first.setActiveView)
    expect(second.setSyncStatus).toBe(first.setSyncStatus)
  })

  it('keeps action identity stable across a state change, while state itself updates', () => {
    const before = getAppStoreState()

    before.openOverlay({ id: 'settings' })

    const after = getAppStoreState()
    expect(after.openOverlay).toBe(before.openOverlay)
    expect(after.overlayStack.map(o => o.id)).toEqual(['settings'])
  })
})
