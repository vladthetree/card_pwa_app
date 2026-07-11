/**
 * AI_CONTEXT: Vitest coverage for use home view controller; protects hooks behavior from regressions in the learning PWA.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('useHomeViewController helpers', () => {
  beforeEach(() => {
    const storage = new Map<string, string>()
    Object.defineProperty(globalThis, 'window', {
      value: {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => {
            storage.set(key, value)
          },
          removeItem: (key: string) => {
            storage.delete(key)
          },
        },
      },
      configurable: true,
    })
  })

  it('reads and persists dashboard mode preferences', async () => {
    const {
      readInitialDashboardMode,
      persistDashboardMode,
      readInitialShuffleOnlyMode,
      persistShuffleOnlyMode,
    } = await import('../../../hooks/home/useHomeViewController')

    expect(readInitialDashboardMode()).toBe('today')
    expect(readInitialShuffleOnlyMode()).toBe(false)

    persistDashboardMode('pilot')
    persistShuffleOnlyMode(true)

    expect(window.localStorage.getItem('card-pwa-home-dashboard-mode')).toBe('pilot')
    expect(window.localStorage.getItem('card-pwa-home-heatmap')).toBe('0')
    expect(window.localStorage.getItem('card-pwa-home-shuffle-only-mode')).toBe('1')
  })

  it('migrates removed life dashboard mode to the Today package mode', async () => {
    window.localStorage.setItem('card-pwa-home-dashboard-mode', 'life')
    window.localStorage.setItem('card-pwa-home-heatmap', '1')

    const { readInitialDashboardMode } = await import('../../../hooks/home/useHomeViewController')

    expect(readInitialDashboardMode()).toBe('today')
    expect(window.localStorage.getItem('card-pwa-home-dashboard-mode')).toBe('today')
    expect(window.localStorage.getItem('card-pwa-home-heatmap')).toBe('0')
  })

  it('migrates the old pilot default to the Today package mode exactly once', async () => {
    window.localStorage.setItem('card-pwa-home-dashboard-mode', 'pilot')

    const { readInitialDashboardMode } = await import('../../../hooks/home/useHomeViewController')

    // Erste Lesung: einmalige Migration auf das Heute-Paket.
    expect(readInitialDashboardMode()).toBe('today')
    expect(window.localStorage.getItem('card-pwa-home-dashboard-mode')).toBe('today')

    // Bewusste spätere Pilot-Wahl bleibt dank Migrations-Flag bestehen.
    window.localStorage.setItem('card-pwa-home-dashboard-mode', 'pilot')
    expect(readInitialDashboardMode()).toBe('pilot')
  })

  it('validates deck creation input and maps duplicate errors', async () => {
    const { submitHomeDeckCreation } = await import('../../../hooks/home/useHomeViewController')
    const createDeckMock = vi.fn()

    await expect(submitHomeDeckCreation('   ', {
      deck_name_empty: 'empty',
      deck_name_exists: 'exists',
      save_failed: 'failed',
    }, createDeckMock as never)).resolves.toEqual({ ok: false, error: 'empty' })
    expect(createDeckMock).not.toHaveBeenCalled()

    createDeckMock.mockResolvedValueOnce({ ok: false, error: 'A deck with this name already exists.' })
    await expect(submitHomeDeckCreation('Alpha', {
      deck_name_empty: 'empty',
      deck_name_exists: 'exists',
      save_failed: 'failed',
    }, createDeckMock as never)).resolves.toEqual({ ok: false, error: 'exists' })

    createDeckMock.mockResolvedValueOnce({ ok: true, deckId: 'deck-1' })
    await expect(submitHomeDeckCreation(' Alpha ', {
      deck_name_empty: 'empty',
      deck_name_exists: 'exists',
      save_failed: 'failed',
    }, createDeckMock as never)).resolves.toEqual({ ok: true, error: null })
    expect(createDeckMock).toHaveBeenLastCalledWith('Alpha')
  })
})
