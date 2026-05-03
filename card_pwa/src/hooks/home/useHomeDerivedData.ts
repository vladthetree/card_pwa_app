import { useEffect, useState } from 'react'
import {
  getDeckHomeMetadata,
  getFutureDueForecast,
} from '../../db/queries'
import type { Deck, DeckScheduleOverview, ShuffleCollection } from '../../types'
import { buildSelectedShuffleCards } from '../../services/ShuffleSessionManager'
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

export async function loadHomeDeckOptions(showExportModal: boolean): Promise<Array<{ id: string; name: string }>> {
  if (!showExportModal) return []
  return listDecksForBackup()
}

export async function loadHomeFutureForecast(
  showFutureForecast: boolean,
  nextDayStartsAt: number,
): Promise<Array<{ dayStartMs: number; count: number }>> {
  if (!showFutureForecast) return []
  return getFutureDueForecast(15, nextDayStartsAt)
}

export async function loadHomeSyncedDeckIds(profileMode: 'local' | 'linked' | undefined, profileUserId?: string): Promise<string[]> {
  const resolveUserId = profileMode === 'linked' ? profileUserId : undefined
  const syncedDeckIds = await getSyncedDeckIds(resolveUserId)
  return Array.isArray(syncedDeckIds) ? syncedDeckIds : []
}

export async function loadHomeShuffleSummaries(input: {
  shuffleCollections: ShuffleCollection[]
  profileMode: 'local' | 'linked' | undefined
  profileUserId?: string
  studyCardLimit: number
  nextDayStartsAt: number
}): Promise<Record<string, HomeShuffleSummary>> {
  const { shuffleCollections, profileMode, profileUserId, studyCardLimit, nextDayStartsAt } = input
  if (shuffleCollections.length === 0) return {}

  const resolveUserId = profileMode === 'linked' ? profileUserId : undefined
  const syncedScope = new Set(await loadHomeSyncedDeckIds(profileMode, profileUserId))
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

export async function loadHomeDeckScheduleOverview(
  decks: Deck[],
  studyCardLimit: number,
  nextDayStartsAt: number,
): Promise<Record<string, DeckScheduleOverview>> {
  if (decks.length === 0) return {}
  const allDecks = flattenDeckTree(decks)
  const metadata = await getDeckHomeMetadata(
    allDecks.map(deck => deck.id),
    studyCardLimit,
    nextDayStartsAt,
  )
  return metadata.deckScheduleOverview
}

export async function loadHomeDeckTagIndex(
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

export async function loadHomeDeckMetadata(
  decks: Deck[],
  studyCardLimit: number,
  nextDayStartsAt: number,
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
  )
}

export function useHomeDerivedData(input: {
  decks: Deck[]
  shuffleCollections: ShuffleCollection[]
  profileMode: 'local' | 'linked' | undefined
  profileUserId?: string
  studyCardLimit: number
  nextDayStartsAt: number
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
      const next = await loadHomeDeckOptions(showExportModal)
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
        const next = await loadHomeFutureForecast(showFutureForecast, nextDayStartsAt)
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
      const next = await loadHomeSyncedDeckIds(profileMode, profileUserId)
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
      const next = await loadHomeShuffleSummaries({
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
      const next = await loadHomeDeckMetadata(decks, studyCardLimit, nextDayStartsAt)
      if (!cancelled) {
        setDeckScheduleOverview(next.deckScheduleOverview)
        setDeckTagIndex(next.deckTagIndex)
      }
    }

    void loadDeckMetadata()
    return () => {
      cancelled = true
    }
  }, [decks, studyCardLimit, nextDayStartsAt])

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
