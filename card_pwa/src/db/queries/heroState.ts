/**
 * AI_CONTEXT: Liest Reviews, aktive Karten, Decks und die Helden-Ausrüstung aus Dexie und baut daraus den
 * HeroState (utils/heroDungeon). Nur lesend; schreibt nie in FSRS/Karten. Wird beim Session-Ende und in den Einstellungen geladen.
 */
import { db } from '../../db'
import { buildHeroState, type HeroState } from '../../utils/heroDungeon'
import { buildDeckDomainIndex, type SecurityDomainNumber } from '../../utils/securityDomain'
import { isStudyableCard } from '../../utils/sm2'
import { getHeroLoadout, type HeroLoadout } from './heroLoadout'
import type { HeroRating } from '../../utils/heroEconomy'

export interface HeroSnapshot {
  state: HeroState
  loadout: HeroLoadout
  /** Deck-ID → Domäne, damit die Oberfläche das Dungeon-Ziel einer Session bestimmen kann. */
  deckDomains: ReadonlyMap<string, SecurityDomainNumber>
}

export async function getHeroSnapshot(params: { level: number; nextDayStartsAt: number; now?: number }): Promise<HeroSnapshot> {
  const [reviews, cards, decks, loadout] = await Promise.all([
    db.reviews.toArray(),
    db.cards.filter(isStudyableCard).toArray(),
    db.decks.toArray(),
    getHeroLoadout(),
  ])

  const deckDomains = buildDeckDomainIndex(decks)
  const state = buildHeroState({
    reviews: reviews.map(review => ({
      reviewKey: review.opId ?? `${review.cardId}:${review.timestamp}`,
      cardId: review.cardId,
      rating: review.rating as HeroRating,
      timeMs: review.timeMs,
      timestamp: review.timestamp,
    })),
    cards: cards.map(card => ({ id: card.id, deckId: card.deckId, tags: card.tags ?? [] })),
    deckDomains,
    purchases: loadout.purchases,
    equipped: loadout.equipped,
    level: params.level,
    nextDayStartsAt: params.nextDayStartsAt,
    now: params.now ?? Date.now(),
  })

  return { state, loadout, deckDomains }
}
