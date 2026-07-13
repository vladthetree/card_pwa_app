/**
 * AI_CONTEXT:
 * Role: Async derived-data loaders for HomeView: deck options, schedule overview, tag index, forecasts, sync scope, and shuffle summaries.
 * Used by: HomeView to keep expensive dashboard derivations out of render logic.
 * Important: This layer composes query/services results; avoid adding UI state or modal actions here.
 */
import { useEffect, useState } from 'react'
import {
  getDeckHomeMetadata,
  getFutureDueForecast,
} from '../../db/queries'
import type { Deck, DeckScheduleOverview, ShuffleCollection } from '../../types'
import { buildSelectedShuffleCards } from '../../services/shuffleSession'
import { getSyncedDeckIds } from '../../services/syncedDeckScope'
import { listDecksForBackup } from '../../utils/dbBackup'
import { flattenDeckTree } from '../../utils/securityDeckHierarchy'

export interface HomeShuffleSummary {
  selectedCount: number
  inScopeDecks: number
  outOfScopeDecks: number
}

export interface HomeDerivedData {
  deckOptions: Array<{ id: string; name: string }>
  deckScheduleOverview: Record<string, DeckScheduleOverview>
  deckTagIndex: Record<string, string[]>
  futureForecast: Array<{ dayStartMs: number; count: number }>
  futureForecastLoading: boolean
  syncedDeckIds: string[]
  shuffleSummaries: Record<string, HomeShuffleSummary>
}

export async function listHomeDeckOptions(showExportModal: boolean): Promise<Array<{ id: string; name: string }>> {
  if (!showExportModal) return []
  return listDecksForBackup()
}

export async function getHomeFutureForecast(
  showFutureForecast: boolean,
  nextDayStartsAt: number,
): Promise<Array<{ dayStartMs: number; count: number }>> {
  if (!showFutureForecast) return []
  return getFutureDueForecast(15, nextDayStartsAt)
}

export async function listHomeSyncedDeckIds(profileMode: 'local' | 'linked' | undefined, profileUserId?: string): Promise<string[]> {
  const resolveUserId = profileMode === 'linked' ? profileUserId : undefined
  const syncedDeckIds = await getSyncedDeckIds(resolveUserId)
  return Array.isArray(syncedDeckIds) ? syncedDeckIds : []
}

export async function listHomeShuffleSummaries(input: {
  shuffleCollections: ShuffleCollection[]
  profileMode: 'local' | 'linked' | undefined
  profileUserId?: string
  studyCardLimit: number
  nextDayStartsAt: number
}): Promise<Record<string, HomeShuffleSummary>> {
  const { shuffleCollections, profileMode, profileUserId, studyCardLimit, nextDayStartsAt } = input
  if (shuffleCollections.length === 0) return {}

  const resolveUserId = profileMode === 'linked' ? profileUserId : undefined
  const syncedScope = new Set(await listHomeSyncedDeckIds(profileMode, profileUserId))
  const entries = await Promise.all(
    shuffleCollections.map(async collection => {
      const selectedCards = await buildSelectedShuffleCards(collection, {
        userId: resolveUserId,
        maxCards: studyCardLimit,
        nextDayStartsAt,
      })
      const inScopeDecks = collection.deckIds.filter(deckId => syncedScope.has(deckId)).length
      return [
        collection.id,
        {
          selectedCount: selectedCards.length,
          inScopeDecks,
          outOfScopeDecks: Math.max(0, collection.deckIds.length - inScopeDecks),
        },
      ] as const
    }),
  )

  return Object.fromEntries(entries)
}

export async function getHomeDeckScheduleOverview(
  decks: Deck[],
  studyCardLimit: number,
  nextDayStartsAt: number,
  newCardsPerDay = 0,
): Promise<Record<string, DeckScheduleOverview>> {
  if (decks.length === 0) return {}
  const allDecks = flattenDeckTree(decks)
  const metadata = await getDeckHomeMetadata(
    allDecks.map(deck => deck.id),
    studyCardLimit,
    nextDayStartsAt,
    newCardsPerDay,
  )
  return metadata.deckScheduleOverview
}

export async function getHomeDeckTagIndex(
  decks: Deck[],
  studyCardLimit = 50,
  nextDayStartsAt = 0,
): Promise<Record<string, string[]>> {
  if (decks.length === 0) return {}
  const allDecks = flattenDeckTree(decks)
  const metadata = await getDeckHomeMetadata(
    allDecks.map(deck => deck.id),
    studyCardLimit,
    nextDayStartsAt,
  )
  return metadata.deckTagIndex
}

export async function getHomeDeckScheduleAndTagIndex(
  decks: Deck[],
  studyCardLimit: number,
  nextDayStartsAt: number,
  newCardsPerDay = 0,
): Promise<Pick<HomeDerivedData, 'deckScheduleOverview' | 'deckTagIndex'>> {
  if (decks.length === 0) {
    return {
      deckScheduleOverview: {},
      deckTagIndex: {},
    }
  }

  const allDecks = flattenDeckTree(decks)
  return getDeckHomeMetadata(
    allDecks.map(deck => deck.id),
    studyCardLimit,
    nextDayStartsAt,
    newCardsPerDay,
  )
}

export function useHomeDerivedData(input: {
  decks: Deck[]
  shuffleCollections: ShuffleCollection[]
  profileMode: 'local' | 'linked' | undefined
  profileUserId?: string
  studyCardLimit: number
  nextDayStartsAt: number
  /** Tagesdosis neuer Karten (0 = unbegrenzt) — hält die Heute-Vorschau
   *  deckungsgleich mit der tatsächlichen Session-Auswahl. */
  newCardsPerDay?: number
  showFutureForecast: boolean
  showExportModal: boolean
}): HomeDerivedData {
  const {
    decks,
    shuffleCollections,
    profileMode,
    profileUserId,
    studyCardLimit,
    nextDayStartsAt,
    newCardsPerDay = 0,
    showFutureForecast,
    showExportModal,
  } = input
  const [deckOptions, setDeckOptions] = useState<Array<{ id: string; name: string }>>([])
  const [deckScheduleOverview, setDeckScheduleOverview] = useState<Record<string, DeckScheduleOverview>>({})
  const [deckTagIndex, setDeckTagIndex] = useState<Record<string, string[]>>({})
  const [futureForecast, setFutureForecast] = useState<Array<{ dayStartMs: number; count: number }>>([])
  const [futureForecastLoading, setFutureForecastLoading] = useState(false)
  const [syncedDeckIds, setSyncedDeckIds] = useState<string[]>([])
  const [shuffleSummaries, setShuffleSummaries] = useState<Record<string, HomeShuffleSummary>>({})

  useEffect(() => {
    let cancelled = false

    const loadDeckOptions = async () => {
      const next = await listHomeDeckOptions(showExportModal)
      if (!cancelled) {
        setDeckOptions(next)
      }
    }

    void loadDeckOptions()
    return () => {
      cancelled = true
    }
  }, [showExportModal])

  useEffect(() => {
    if (!showFutureForecast) {
      setFutureForecast([])
      setFutureForecastLoading(false)
      return
    }

    let cancelled = false
    setFutureForecastLoading(true)

    const loadForecast = async () => {
      try {
        const next = await getHomeFutureForecast(showFutureForecast, nextDayStartsAt)
        if (!cancelled) {
          setFutureForecast(next)
        }
      } finally {
        if (!cancelled) {
          setFutureForecastLoading(false)
        }
      }
    }

    void loadForecast()
    return () => {
      cancelled = true
    }
  }, [showFutureForecast, nextDayStartsAt])

  useEffect(() => {
    let cancelled = false

    const loadSyncedScope = async () => {
      const next = await listHomeSyncedDeckIds(profileMode, profileUserId)
      if (!cancelled) {
        setSyncedDeckIds(next)
      }
    }

    void loadSyncedScope()
    return () => {
      cancelled = true
    }
  }, [decks, profileMode, profileUserId])

  useEffect(() => {
    let cancelled = false

    const loadSummaries = async () => {
      const next = await listHomeShuffleSummaries({
        shuffleCollections,
        profileMode,
        profileUserId,
        studyCardLimit,
        nextDayStartsAt,
      })
      if (!cancelled) {
        setShuffleSummaries(next)
      }
    }

    void loadSummaries()
    return () => {
      cancelled = true
    }
  }, [profileMode, profileUserId, studyCardLimit, nextDayStartsAt, shuffleCollections])

  useEffect(() => {
    let cancelled = false

    const loadDeckMetadata = async () => {
      const next = await getHomeDeckScheduleAndTagIndex(decks, studyCardLimit, nextDayStartsAt, newCardsPerDay)
      if (!cancelled) {
        setDeckScheduleOverview(next.deckScheduleOverview)
        setDeckTagIndex(next.deckTagIndex)
      }
    }

    void loadDeckMetadata()
    return () => {
      cancelled = true
    }
  }, [decks, studyCardLimit, nextDayStartsAt, newCardsPerDay])

  return {
    deckOptions,
    deckScheduleOverview,
    deckTagIndex,
    futureForecast,
    futureForecastLoading,
    syncedDeckIds,
    shuffleSummaries,
  }
}
