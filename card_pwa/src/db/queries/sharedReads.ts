/**
 * AI_CONTEXT:
 * Role: Koaleszierte Volltabellen-Reads für den Home-Dashboard-Pfad; parallele Aufrufer teilen sich einen In-Flight-Read.
 * Used by: decks.ts/reviews.ts Query-Layer (fetchDecks, getDeckHomeMetadata, fetchGlobalStats, …).
 * Important: Es wird nur der laufende Read geteilt, nie ein abgeschlossenes Ergebnis gecacht — keine Staleness. Aufrufer dürfen die gelieferten Arrays/Records nicht mutieren.
 */
import { db, type CardRecord, type DeckRecord } from '../../db'

let cardsInflight: Promise<CardRecord[]> | null = null
let decksInflight: Promise<DeckRecord[]> | null = null

/**
 * Liest alle Karten; gleichzeitige Aufrufer (Home-Mount: Deck-Stats,
 * ScheduleOverview, GlobalStats, Forecast) teilen sich EINEN IndexedDB-Scan
 * statt die Tabelle 4–5× parallel zu deserialisieren.
 */
export function readAllCardsShared(): Promise<CardRecord[]> {
  if (!cardsInflight) {
    cardsInflight = db.cards.toArray().finally(() => {
      cardsInflight = null
    })
  }
  return cardsInflight
}

/** Wie readAllCardsShared, für die (kleine) Deck-Tabelle. */
export function readAllDecksShared(): Promise<DeckRecord[]> {
  if (!decksInflight) {
    decksInflight = db.decks.toArray().finally(() => {
      decksInflight = null
    })
  }
  return decksInflight
}
