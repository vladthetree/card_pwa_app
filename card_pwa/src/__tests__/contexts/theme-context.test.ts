/**
 * AI_CONTEXT: Guards the embedded theme set (Neo-Brutalismus + Newsprint + Dopamine)
 * and the saved-theme-key normalization used to hydrate ThemeProvider from localStorage.
 */
import { describe, expect, it } from 'vitest'
import { THEMES, normalizeSavedThemeKey, themeScopeClass } from '../../contexts/ThemeContext'

describe('ThemeContext', () => {
  it('exposes Neo-Brutalismus, Newsprint, and Dopamine as the embedded designs', () => {
    expect(Object.keys(THEMES)).toEqual(['default', 'newsprint', 'dopamine'])
    expect(THEMES.default).toMatchObject({
      name: 'Neo-Brutalismus',
      primary: '#FF6B6B',
      accent: '#FFD93D',
      background: '#FFFDF5',
      text: '#000000',
    })
    expect(THEMES.newsprint).toMatchObject({
      name: 'Newsprint',
      primary: '#CC0000',
      background: '#F9F9F7',
      text: '#111111',
    })
    expect(THEMES.dopamine).toMatchObject({
      name: 'Dopamine',
      primary: '#FF3AF2',
      background: '#0D0D1A',
      text: '#FFFFFF',
    })
  })

  it('normalizeSavedThemeKey round-trips known keys', () => {
    expect(normalizeSavedThemeKey('default')).toBe('default')
    expect(normalizeSavedThemeKey('newsprint')).toBe('newsprint')
    expect(normalizeSavedThemeKey('dopamine')).toBe('dopamine')
  })

  it('normalizeSavedThemeKey falls back to default for unknown/missing values', () => {
    expect(normalizeSavedThemeKey(null)).toBe('default')
    expect(normalizeSavedThemeKey('')).toBe('default')
    expect(normalizeSavedThemeKey('garbage')).toBe('default')
    expect(normalizeSavedThemeKey('neo')).toBe('default')
  })

  it('themeScopeClass maps default to the historical -neo suffix and others to their key', () => {
    expect(themeScopeClass('default', 'learning-units')).toBe('learning-units-neo')
    expect(themeScopeClass('newsprint', 'learning-units')).toBe('learning-units-newsprint')
    expect(themeScopeClass('dopamine', 'learning-units')).toBe('learning-units-dopamine')
  })
})
