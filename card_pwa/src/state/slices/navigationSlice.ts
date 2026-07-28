/**
 * AI_CONTEXT:
 * Role: UI navigation state slice. Domain data continues to live in Dexie and
 * route/query adapters.
 */
import type { View } from '../../types'

function readInitialView(): View {
  if (typeof window === 'undefined') return 'home'
  const value = new URLSearchParams(window.location.search).get('view')
  return value === 'shuffle' || value === 'shuffle-manage' ? 'shuffle-manage' : 'home'
}

export interface NavigationSlice {
  activeView: View
  previousView: View | null
  setActiveView: (view: View) => void
}

export interface NavigationSliceState {
  activeView: View
  previousView: View | null
}

export const initialNavigationState: NavigationSliceState = {
  activeView: readInitialView(),
  previousView: null,
}
