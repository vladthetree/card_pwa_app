/**
 * AI_CONTEXT: Guards the embedded theme set (Neo-Brutalismus + Newsprint)
 * and the saved-theme-key normalization used to hydrate ThemeProvider from localStorage.
 */
import { describe, expect, it } from 'vitest'
import { THEMES, normalizeSavedThemeKey, themeScopeClass } from '../../contexts/ThemeContext'

describe('ThemeContext', () => {
  it('exposes Neo-Brutalismus, Newsprint, and Newsprint Dark as the embedded designs', () => {
    expect(Object.keys(THEMES)).toEqual(['default', 'newsprint', 'newsprintDark'])
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
    expect(THEMES.newsprintDark).toMatchObject({
      name: 'Newsprint Dark',
      primary: '#FF6166',
      background: '#141413',
      text: '#E8E8E3',
    })
  })

  it('normalizeSavedThemeKey round-trips known keys', () => {
    expect(normalizeSavedThemeKey('default')).toBe('default')
    expect(normalizeSavedThemeKey('newsprint')).toBe('newsprint')
    expect(normalizeSavedThemeKey('newsprintDark')).toBe('newsprintDark')
  })

  it('normalizeSavedThemeKey falls back to default for unknown/missing values', () => {
    expect(normalizeSavedThemeKey(null)).toBe('default')
    expect(normalizeSavedThemeKey('')).toBe('default')
    expect(normalizeSavedThemeKey('garbage')).toBe('default')
    expect(normalizeSavedThemeKey('neo')).toBe('default')
    // Dopamine wurde am 2026-08-07 auf Nutzerwunsch entfernt — gespeicherte
    // Keys müssen sauber auf das Default-Theme zurückfallen.
    expect(normalizeSavedThemeKey('dopamine')).toBe('default')
  })

  it('themeScopeClass maps default to the historical -neo suffix and others to their key', () => {
    expect(themeScopeClass('default', 'learning-units')).toBe('learning-units-neo')
    expect(themeScopeClass('newsprint', 'learning-units')).toBe('learning-units-newsprint')
    // Newsprint Dark teilt den Newsprint-Scope; dunkel wird er über die
    // Body-Modifier-Klasse `newsprint-dark`, nicht über einen eigenen Scope.
    expect(themeScopeClass('newsprintDark', 'learning-units')).toBe('learning-units-newsprint')
  })
})
