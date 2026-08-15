/**
 * AI_CONTEXT:
 * Role: Small UI/runtime state store based on useSyncExternalStore. Persistent
 * learning data remains in Dexie; this store is intentionally not a domain cache.
 */
import { useSyncExternalStore } from 'react'
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
  initialSyncRuntimeState,
  type SyncRuntimeSlice,
  type SyncRuntimeSliceState,
  type SyncRuntimeStatus,
} from './slices/syncRuntimeSlice'

export type AppStoreState =
  & OverlaySliceState
  & SyncRuntimeSliceState
  & NavigationSliceState

export type AppStore = AppStoreState
  & OverlaySlice
  & SyncRuntimeSlice
  & NavigationSlice

type Listener = () => void

const initialState: AppStoreState = {
  ...initialOverlayState,
  ...initialSyncRuntimeState,
  ...initialNavigationState,
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

// Built once at module load, not per getAppStoreState() call: every action here
// closes over the `state`/`setState` module bindings rather than a function
// parameter, so there is nothing to recreate on each read. This keeps action
// references stable across calls — required for useAppStore(store => store.someAction)
// to work with useSyncExternalStore's Object.is snapshot comparison; rebuilding
// these closures per call previously made any such selector "always changed".
const actions: Omit<AppStore, keyof AppStoreState> = {
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
}

export function getAppStoreState(): AppStore {
  return { ...state, ...actions }
}

export function useAppStore<T>(selector: (store: AppStore) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getAppStoreState()),
    () => selector(getAppStoreState()),
  )
}

export function resetAppStoreForTests(): void {
  state = { ...initialState }
  emit()
}

export type { CloseReason, OverlayEntry }
