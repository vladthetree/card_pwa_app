import type { HomeDashboardMode } from '../../components/home/HomeStatsSection'
import { STORAGE_KEYS } from '../../constants/appIdentity'

export interface HomeDeckCreateStrings {
  deck_name_empty: string
  deck_name_exists: string
  save_failed: string
}

export type CreateDeckForHome = (name: string) => Promise<{
  ok: boolean
  error?: string | null
}>

export function readInitialDashboardMode(): HomeDashboardMode {
  if (typeof window === 'undefined') return 'today'
  const stored = window.localStorage.getItem(STORAGE_KEYS.homeDashboardMode)
  if (stored === 'today' || stored === 'kpi' || stored === 'heatmap' || stored === 'quests' || stored === 'clean') return stored
  if (stored === 'pilot') {
    if (window.localStorage.getItem(STORAGE_KEYS.homeDashboardTodayMigration) === '1') return 'pilot'
    window.localStorage.setItem(STORAGE_KEYS.homeDashboardTodayMigration, '1')
    window.localStorage.setItem(STORAGE_KEYS.homeDashboardMode, 'today')
    return 'today'
  }
  if (stored === 'life') {
    window.localStorage.setItem(STORAGE_KEYS.homeDashboardMode, 'today')
    window.localStorage.setItem(STORAGE_KEYS.homeShowHeatmap, '0')
    return 'today'
  }
  return window.localStorage.getItem(STORAGE_KEYS.homeShowHeatmap) === '1' ? 'heatmap' : 'today'
}

export function persistDashboardMode(mode: HomeDashboardMode): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEYS.homeDashboardMode, mode)
  window.localStorage.setItem(STORAGE_KEYS.homeShowHeatmap, mode === 'heatmap' ? '1' : '0')
}

export function readInitialShuffleOnlyMode(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEYS.homeShuffleOnlyMode) === '1'
}

export function persistShuffleOnlyMode(value: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEYS.homeShuffleOnlyMode, value ? '1' : '0')
}

export async function submitHomeDeckCreation(
  deckName: string,
  strings: HomeDeckCreateStrings,
  createDeck: CreateDeckForHome,
): Promise<{ ok: boolean; error: string | null }> {
  const trimmed = deckName.trim()
  if (!trimmed) {
    return { ok: false, error: strings.deck_name_empty }
  }

  const result = await createDeck(trimmed)
  if (!result.ok) {
    const isDuplicate = result.error?.toLowerCase().includes('already exists') ?? false
    return {
      ok: false,
      error: isDuplicate ? strings.deck_name_exists : (result.error ?? strings.save_failed),
    }
  }

  return { ok: true, error: null }
}
