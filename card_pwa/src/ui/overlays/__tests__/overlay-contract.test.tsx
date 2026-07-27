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
})

