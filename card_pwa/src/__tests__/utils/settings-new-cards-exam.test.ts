/**
 * AI_CONTEXT: Vitest coverage for settings normalization of the new-cards daily
 * dose and the exam date; protects utils behavior from regressions in the learning PWA.
 */
import { describe, it, expect } from 'vitest'
import { normalizeSettings } from '../../contexts/SettingsContext'

describe('normalizeSettings — newCardsPerDay', () => {
  it('Default ist 10', () => {
    expect(normalizeSettings(undefined).newCardsPerDay).toBe(10)
    expect(normalizeSettings({}).newCardsPerDay).toBe(10)
  })

  it('übernimmt gültige Werte und klemmt auf 0–100', () => {
    expect(normalizeSettings({ newCardsPerDay: 8 }).newCardsPerDay).toBe(8)
    expect(normalizeSettings({ newCardsPerDay: 0 }).newCardsPerDay).toBe(0)
    expect(normalizeSettings({ newCardsPerDay: 500 }).newCardsPerDay).toBe(100)
    expect(normalizeSettings({ newCardsPerDay: -5 }).newCardsPerDay).toBe(0)
  })

  it('fällt bei Unsinn auf den Default zurück', () => {
    expect(normalizeSettings({ newCardsPerDay: 'viele' as unknown as number }).newCardsPerDay).toBe(10)
  })
})

describe('normalizeSettings — examDateIso', () => {
  it('Default ist null', () => {
    expect(normalizeSettings(undefined).examDateIso).toBeNull()
    expect(normalizeSettings({}).examDateIso).toBeNull()
  })

  it('übernimmt nur gültige ISO-Daten (YYYY-MM-DD)', () => {
    expect(normalizeSettings({ examDateIso: '2026-08-09' }).examDateIso).toBe('2026-08-09')
    expect(normalizeSettings({ examDateIso: '2028-02-29' }).examDateIso).toBe('2028-02-29')
    expect(normalizeSettings({ examDateIso: '09.08.2026' }).examDateIso).toBeNull()
    expect(normalizeSettings({ examDateIso: '2026-13-40' }).examDateIso).toBeNull()
    expect(normalizeSettings({ examDateIso: '2026-02-29' }).examDateIso).toBeNull()
    expect(normalizeSettings({ examDateIso: '2026-02-31' }).examDateIso).toBeNull()
    expect(normalizeSettings({ examDateIso: '2026-04-31' }).examDateIso).toBeNull()
    expect(normalizeSettings({ examDateIso: '0000-01-01' }).examDateIso).toBeNull()
    expect(normalizeSettings({ examDateIso: 42 as unknown as string }).examDateIso).toBeNull()
  })
})

describe('normalizeSettings — examDateUpdatedAt (Profil-Sync-Basis)', () => {
  it('Default ist null', () => {
    expect(normalizeSettings(undefined).examDateUpdatedAt).toBeNull()
    expect(normalizeSettings({}).examDateUpdatedAt).toBeNull()
  })

  it('übernimmt gültige Zeitstempel', () => {
    expect(normalizeSettings({ examDateUpdatedAt: 1784000000000 }).examDateUpdatedAt).toBe(1784000000000)
    expect(normalizeSettings({ examDateUpdatedAt: 0 }).examDateUpdatedAt).toBe(0)
  })

  it('fällt bei negativen/ungültigen Werten auf null zurück', () => {
    expect(normalizeSettings({ examDateUpdatedAt: -5 }).examDateUpdatedAt).toBeNull()
    expect(normalizeSettings({ examDateUpdatedAt: 'gestern' as unknown as number }).examDateUpdatedAt).toBeNull()
    expect(normalizeSettings({ examDateUpdatedAt: undefined }).examDateUpdatedAt).toBeNull()
  })
})
