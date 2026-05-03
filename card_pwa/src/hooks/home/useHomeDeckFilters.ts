import { useEffect, useMemo, useState } from 'react'
import { STORAGE_KEYS } from '../../constants/appIdentity'
import type { Deck, DeckScheduleOverview } from '../../types'
import { formatDeckName } from '../../utils/cardTextParser'

export type DeckSortMode = 'name' | 'due_today'

function normalizeDeckSortMode(value: unknown): DeckSortMode {
  return value === 'due_today' ? 'due_today' : 'name'
}

export function useHomeDeckFilters({
  decks,
  deckTagIndex,
  deckScheduleOverview,
  language,
}: {
  decks: Deck[]
  deckTagIndex: Record<string, string[]>
  deckScheduleOverview: Record<string, DeckScheduleOverview>
  language: 'de' | 'en'
}) {
  const [deckSearchQuery, setDeckSearchQuery] = useState('')
  const [deckSortMode, setDeckSortMode] = useState<DeckSortMode>(() => {
    if (typeof window === 'undefined') return 'name'
    return normalizeDeckSortMode(window.localStorage.getItem(STORAGE_KEYS.homeDeckSortMode))
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.homeDeckSortMode, deckSortMode)
  }, [deckSortMode])

  const normalizedDeckSearch = deckSearchQuery.trim().toLowerCase()

  const filteredDecks = useMemo(() => {
    if (!normalizedDeckSearch) return decks

    const deckMatchesSearch = (deck: Deck): boolean => {
      const title = formatDeckName(deck.name).toLowerCase()
      if (title.includes(normalizedDeckSearch)) return true

      const tags = deckTagIndex[deck.id] ?? []
      if (tags.some(tag => tag.includes(normalizedDeckSearch))) return true

      return (deck.subDecks ?? []).some(deckMatchesSearch)
    }

    return decks.filter(deck => {
      return deckMatchesSearch(deck)
    })
  }, [decks, deckTagIndex, normalizedDeckSearch])

  const visibleDecks = useMemo(() => {
    const sorted = [...filteredDecks]

    if (deckSortMode === 'due_today') {
      sorted.sort((a, b) => {
        const aDueToday = deckScheduleOverview[a.id]?.today.total ?? 0
        const bDueToday = deckScheduleOverview[b.id]?.today.total ?? 0
        if (bDueToday !== aDueToday) return bDueToday - aDueToday
        return formatDeckName(a.name).localeCompare(formatDeckName(b.name), language)
      })
      return sorted
    }

    sorted.sort((a, b) => formatDeckName(a.name).localeCompare(formatDeckName(b.name), language))
    return sorted
  }, [deckScheduleOverview, deckSortMode, filteredDecks, language])

  return {
    deckSearchQuery,
    setDeckSearchQuery,
    deckSortMode,
    setDeckSortMode,
    filteredDecks,
    visibleDecks,
  }
}
