import { describe, it, expect } from 'vitest'
import { normalizeSettings } from '../../contexts/SettingsContext'

/**
 * Fokus-Modus (rekonstruiert aus den drei Karten-Screenshots vom 8. Juni:
 * Session-Header ausgeblendet, Platz bleibt reserviert). Hier wird die
 * Settings-Normalisierung abgesichert: focusMode persistiert als Boolean,
 * Default bleibt aus, fremde Werte fallen auf false zurück.
 */
describe('normalizeSettings — focusMode', () => {
  it('ist standardmäßig deaktiviert', () => {
    expect(normalizeSettings(undefined).focusMode).toBe(false)
    expect(normalizeSettings({}).focusMode).toBe(false)
  })

  it('übernimmt true aus gespeicherten Settings', () => {
    expect(normalizeSettings({ focusMode: true }).focusMode).toBe(true)
  })

  it('fällt bei nicht-booleschen Werten auf false zurück', () => {
    expect(normalizeSettings({ focusMode: 'yes' as unknown as boolean }).focusMode).toBe(false)
    expect(normalizeSettings({ focusMode: 1 as unknown as boolean }).focusMode).toBe(false)
  })

  it('verändert bestehende Settings-Felder nicht (additiv)', () => {
    const normalized = normalizeSettings({ language: 'en', algorithm: 'sm2', focusMode: true })
    expect(normalized.language).toBe('en')
    expect(normalized.algorithm).toBe('sm2')
    expect(normalized.focusMode).toBe(true)
  })
})
