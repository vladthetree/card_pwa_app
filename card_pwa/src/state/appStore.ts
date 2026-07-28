/**
 * AI_CONTEXT:
 * Role: Small UI/runtime state store based on useSyncExternalStore. Persistent
 * learning data remains in Dexie; this store is intentionally not a domain cache.
 */
import { useSyncExternalStore } from 'react'
import {
  initialHomeUiState,
  type HomeActiveTab,
  type HomeUiSlice,
  type HomeUiSliceState,
} from './slices/homeUiSlice'
import {
  initialNavigationState,
  type NavigationSlice,
  type NavigationSliceState,
} from './slices/navigationSlice'
import type { View } from '../types'
import {
  initialOverlayState,
  type CloseReason,
  type OverlayEntry,
  type OverlaySlice,
  type OverlaySliceState,
} from './slices/overlaySlice'
import {
  initialPwaRuntimeState,
  type PwaRuntimeSlice,
  type PwaRuntimeSliceState,
} from './slices/pwaRuntimeSlice'
import {
  initialSyncRuntimeState,
  type SyncRuntimeSlice,
  type SyncRuntimeSliceState,
  type SyncRuntimeStatus,
} from './slices/syncRuntimeSlice'

export type AppStoreState =
  & OverlaySliceState
  & SyncRuntimeSliceState
  & NavigationSliceState
  & HomeUiSliceState
  & PwaRuntimeSliceState

export type AppStore = AppStoreState
  & OverlaySlice
  & SyncRuntimeSlice
  & NavigationSlice
  & HomeUiSlice
  & PwaRuntimeSlice

type Listener = () => void

const initialState: AppStoreState = {
  ...initialOverlayState,
  ...initialSyncRuntimeState,
  ...initialNavigationState,
  ...initialHomeUiState,
  ...initialPwaRuntimeState,
}

let state: AppStoreState = { ...initialState }
const listeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) listener()
}

function setState(updater: Partial<AppStoreState> | ((current: AppStoreState) => AppStoreState)): void {
  state = typeof updater === 'function'
    ? updater(state)
    : { ...state, ...updater }
  emit()
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAppStoreState(): AppStore {
  return {
    ...state,
    openOverlay: entry => {
      const dismissible = entry.dismissible ?? true
      setState(current => ({
        ...current,
        overlayStack: [
          ...current.overlayStack.filter(overlay => overlay.id !== entry.id),
          { ...entry, dismissible, openedAt: Date.now() },
        ],
        lastCloseReason: null,
      }))
    },
    closeOverlay: (id?: string, reason: CloseReason = 'programmatic') => {
      setState(current => {
        const targetId = id ?? current.overlayStack[current.overlayStack.length - 1]?.id
        return {
          ...current,
          overlayStack: targetId
            ? current.overlayStack.filter(overlay => overlay.id !== targetId)
            : current.overlayStack,
          lastCloseReason: reason,
        }
      })
    },
    setActivePayload: (id: string, payload: unknown) => {
      setState(current => ({
        ...current,
        overlayStack: current.overlayStack.map(overlay => (
          overlay.id === id ? { ...overlay, payload } : overlay
        )),
      }))
    },
    topOverlayId: () => state.overlayStack[state.overlayStack.length - 1]?.id ?? null,
    setSyncStatus: (syncStatus: SyncRuntimeStatus) => setState({ syncStatus }),
    setSyncCounters: counters => setState(current => ({
      ...current,
      pendingCount: counters.pendingCount ?? current.pendingCount,
      deadLetterCount: counters.deadLetterCount ?? current.deadLetterCount,
    })),
    markSyncSuccess: timestamp => setState({
      syncStatus: 'idle',
      lastSuccessfulSyncAt: timestamp,
      lastError: null,
    }),
    markSyncError: message => setState({
      syncStatus: 'error',
      lastError: message,
    }),
    setActiveView: (activeView: View) => setState(current => ({
      ...current,
      activeView,
      previousView: current.activeView === activeView ? current.previousView : current.activeView,
    })),
    setHomeActiveTab: (homeActiveTab: HomeActiveTab) => setState({ homeActiveTab }),
    setDashboardMode: (dashboardMode: boolean) => setState({ dashboardMode }),
    setShuffleOnlyMode: (shuffleOnlyMode: boolean) => setState({ shuffleOnlyMode }),
    toggleExpandedSubdeck: (deckId: string) => {
      setState(current => ({
        ...current,
        expandedSubdeckIds: current.expandedSubdeckIds.includes(deckId)
          ? current.expandedSubdeckIds.filter(id => id !== deckId)
          : [...current.expandedSubdeckIds, deckId],
      }))
    },
    setInstallPromptAvailable: (installPromptAvailable: boolean) => setState({ installPromptAvailable }),
    setServiceWorkerUpdateAvailable: (serviceWorkerUpdateAvailable: boolean) => setState({ serviceWorkerUpdateAvailable }),
    setNotificationsEnabled: (notificationsEnabled: boolean) => setState({ notificationsEnabled }),
  }
}

export function useAppStore<T>(selector: (store: AppStore) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getAppStoreState()),
    () => selector(getAppStoreState()),
  )
}

export function resetAppStoreForTests(): void {
  state = { ...initialState, expandedSubdeckIds: [] }
  emit()
}

export type { CloseReason, OverlayEntry }
