/**
 * AI_CONTEXT: Covers ADR 001's "Escape und Backdrop treffen nur das oberste
 * Overlay" criterion — previously unimplemented (overlaySlice had zero call
 * sites) even though Dialog/AlertDialog/ConfirmModal were already in production.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { getAppStoreState, resetAppStoreForTests } from '../../../state/appStore'
import { computeShouldHandleOverlayClose } from '../useCloseGuard'

describe('computeShouldHandleOverlayClose', () => {
  it('ignores escape/backdrop unless the overlay is topmost', () => {
    expect(computeShouldHandleOverlayClose('escape', true, false)).toBe(false)
    expect(computeShouldHandleOverlayClose('backdrop', true, false)).toBe(false)
    expect(computeShouldHandleOverlayClose('escape', true, true)).toBe(true)
    expect(computeShouldHandleOverlayClose('backdrop', true, true)).toBe(true)
  })

  it('ignores escape/backdrop on non-dismissible overlays even when topmost', () => {
    expect(computeShouldHandleOverlayClose('escape', false, true)).toBe(false)
    expect(computeShouldHandleOverlayClose('backdrop', false, true)).toBe(false)
  })

  it('never gates explicit close reasons on stack position', () => {
    for (const reason of ['close-button', 'cancel', 'submit', 'programmatic'] as const) {
      expect(computeShouldHandleOverlayClose(reason, true, false)).toBe(true)
      expect(computeShouldHandleOverlayClose(reason, false, false)).toBe(true)
    }
  })
})

describe('overlay stack drives close-guard decisions (ADR 001)', () => {
  beforeEach(() => {
    resetAppStoreForTests()
  })

  it('SettingsModal + ConfirmModal: Escape only reaches the confirmation on top', () => {
    const store = getAppStoreState()
    store.openOverlay({ id: 'settings' })
    store.openOverlay({ id: 'confirm-reset' })

    const isSettingsTopmost = getAppStoreState().topOverlayId() === 'settings'
    const isConfirmTopmost = getAppStoreState().topOverlayId() === 'confirm-reset'

    expect(computeShouldHandleOverlayClose('escape', true, isSettingsTopmost)).toBe(false)
    expect(computeShouldHandleOverlayClose('backdrop', true, isSettingsTopmost)).toBe(false)
    expect(computeShouldHandleOverlayClose('escape', true, isConfirmTopmost)).toBe(true)
  })

  it('closing the top overlay hands Escape back to the one underneath', () => {
    const store = getAppStoreState()
    store.openOverlay({ id: 'settings' })
    store.openOverlay({ id: 'confirm-reset' })
    store.closeOverlay('confirm-reset')

    const isSettingsTopmost = getAppStoreState().topOverlayId() === 'settings'
    expect(computeShouldHandleOverlayClose('escape', true, isSettingsTopmost)).toBe(true)
  })
})
