import { describe, expect, it } from 'vitest'
import { overlayTokens } from '../overlayTokens'

describe('overlay contract tokens', () => {
  it('defines the z-index ladder required by the overlay plan', () => {
    expect(Object.keys(overlayTokens.zIndex).sort()).toEqual([
      'base',
      'dropdown',
      'overlay',
      'overlayNested',
      'splash',
      'toast',
    ])
  })

  it('defines every supported sheet placement', () => {
    expect(Object.keys(overlayTokens.sheetPlacement).sort()).toEqual(['bottom', 'left', 'right'])
    expect(overlayTokens.sheetPlacement.bottom).toContain('bottom-0')
    expect(overlayTokens.sheetPlacement.left).toContain('left-0')
    expect(overlayTokens.sheetPlacement.right).toContain('right-0')
  })
})
