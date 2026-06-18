import { afterEach, describe, expect, it, vi } from 'vitest'
import { readInitialDashboardMode, persistDashboardMode } from '../../hooks/home/useHomeViewController'
import { STORAGE_KEYS } from '../../constants/appIdentity'

/**
 * Dashboard-Modus "Clean" (Beleg `…23.40.53.jpeg`): vierte Option neben
 * KPI/Heatmap/Pilot, blendet die Dashboard-Kachel komplett aus. Hier wird die
 * Persistenz (localStorage round-trip) abgesichert.
 */

function stubWindowWithStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial))
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
  }
  vi.stubGlobal('window', { localStorage } as unknown as Window & typeof globalThis)
  return store
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Dashboard-Modus clean — Persistenz', () => {
  it('liest einen gespeicherten clean-Modus', () => {
    stubWindowWithStorage({ [STORAGE_KEYS.homeDashboardMode]: 'clean' })
    expect(readInitialDashboardMode()).toBe('clean')
  })

  it('persistiert clean und liest ihn zurück (round-trip)', () => {
    stubWindowWithStorage()
    persistDashboardMode('clean')
    expect(readInitialDashboardMode()).toBe('clean')
  })

  it('fällt bei unbekannten Werten auf den Daily-Quest-Modus zurück', () => {
    stubWindowWithStorage({ [STORAGE_KEYS.homeDashboardMode]: 'bogus' })
    expect(readInitialDashboardMode()).toBe('pilot')
  })
})
