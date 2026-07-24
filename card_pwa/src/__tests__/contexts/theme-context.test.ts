/**
 * AI_CONTEXT: Guards the intentionally single-theme Neo-Brutalist setup.
 */
import { describe, expect, it } from 'vitest'
import { THEMES } from '../../contexts/ThemeContext'

describe('ThemeContext', () => {
  it('exposes Neo-Brutalism as the only embedded design', () => {
    expect(Object.keys(THEMES)).toEqual(['default'])
    expect(THEMES.default).toMatchObject({
      name: 'Neo-Brutalismus',
      primary: '#FF6B6B',
      accent: '#FFD93D',
      background: '#FFFDF5',
      text: '#000000',
    })
  })
})
