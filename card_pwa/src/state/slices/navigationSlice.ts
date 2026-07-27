/**
 * AI_CONTEXT:
 * Role: UI navigation state slice. Domain data continues to live in Dexie and
 * route/query adapters.
 */
export type AppView = 'home' | 'study' | 'shuffle' | 'settings' | 'import' | 'videos' | 'labs'

export interface NavigationSlice {
  activeView: AppView
  previousView: AppView | null
  setActiveView: (view: AppView) => void
}

export interface NavigationSliceState {
  activeView: AppView
  previousView: AppView | null
}

export const initialNavigationState: NavigationSliceState = {
  activeView: 'home',
  previousView: null,
}

