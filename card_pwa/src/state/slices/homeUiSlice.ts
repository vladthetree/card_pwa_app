/**
 * AI_CONTEXT:
 * Role: Home-screen UI preferences only. Decks, cards, due counts, and learning
 * package data stay in query/liveQuery hooks.
 */
export type HomeActiveTab = 'decks' | 'shuffle' | 'tags' | 'stats'

export interface HomeUiSlice {
  homeActiveTab: HomeActiveTab
  dashboardMode: boolean
  shuffleOnlyMode: boolean
  expandedSubdeckIds: string[]
  setHomeActiveTab: (tab: HomeActiveTab) => void
  setDashboardMode: (enabled: boolean) => void
  setShuffleOnlyMode: (enabled: boolean) => void
  toggleExpandedSubdeck: (deckId: string) => void
}

export interface HomeUiSliceState {
  homeActiveTab: HomeActiveTab
  dashboardMode: boolean
  shuffleOnlyMode: boolean
  expandedSubdeckIds: string[]
}

export const initialHomeUiState: HomeUiSliceState = {
  homeActiveTab: 'decks',
  dashboardMode: false,
  shuffleOnlyMode: false,
  expandedSubdeckIds: [],
}

