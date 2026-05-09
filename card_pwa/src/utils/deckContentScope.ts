export interface DeckContentScopeDeck {
  id: string
  parentDeckId?: string | null
  isDeleted?: boolean
}

export interface DeckContentScopeCard {
  deckId: string
  isDeleted?: boolean
}

export function collectDeckIdsWithActiveCardsOrDescendants(
  decks: DeckContentScopeDeck[],
  cards: DeckContentScopeCard[],
): Set<string> {
  const activeDecks = decks.filter(deck => !deck.isDeleted)
  const activeDeckIds = new Set(activeDecks.map(deck => deck.id))
  const parentByDeckId = new Map<string, string | null>()

  for (const deck of activeDecks) {
    parentByDeckId.set(
      deck.id,
      deck.parentDeckId && activeDeckIds.has(deck.parentDeckId) ? deck.parentDeckId : null,
    )
  }

  const keep = new Set<string>()
  for (const card of cards) {
    if (card.isDeleted || !activeDeckIds.has(card.deckId)) continue

    let current: string | null | undefined = card.deckId
    while (current && !keep.has(current)) {
      keep.add(current)
      current = parentByDeckId.get(current)
    }
  }

  return keep
}

export function filterDecksWithActiveCardsOrDescendants<TDeck extends DeckContentScopeDeck>(
  decks: TDeck[],
  cards: DeckContentScopeCard[],
): TDeck[] {
  const keep = collectDeckIdsWithActiveCardsOrDescendants(decks, cards)
  return decks.filter(deck => keep.has(deck.id))
}
