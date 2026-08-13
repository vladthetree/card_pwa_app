/**
 * AI_CONTEXT:
 * Role: Motivation quote selection helpers for the initial loading screen.
 * Used by: App.tsx ViewFallback (startup splash).
 * Important: Splash picks once per app launch and avoids repeating the previous launch
 *            when localStorage is available; offline reminders stay day/slot-based in the SW.
 */
import { MOTIVATION_QUOTES, type MotivationQuote } from '../data/motivationQuotes'
import { formatLocalDayOf } from './recallMastery'

type MotivationLanguage = 'de' | 'en'

interface MotivationStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

interface LaunchPickOptions {
  random?: () => number
  storage?: MotivationStorage | null
}

const LAST_LAUNCH_QUOTE_KEY_PREFIX = 'card-pwa-last-launch-motivation-index:'
const launchQuoteCache: Partial<Record<MotivationLanguage, MotivationQuote>> = {}

/**
 * Tagesabschnitt als Slot: vormittags / nachmittags / abends. Innerhalb eines
 * Slots bleibt der Spruch stabil (schnelle App-Neustarts flackern nicht),
 * über den Tag gibt es bis zu drei verschiedene.
 */
export function daypartSlot(hour: number): number {
  if (hour < 11) return 0
  if (hour < 17) return 1
  return 2
}

/** FNV-1a — klein, stabil, reicht für die gleichverteilte Spruchwahl. */
function hashSeed(seed: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function normalizeLanguage(language: MotivationLanguage): MotivationLanguage {
  return language === 'en' ? 'en' : 'de'
}

function getLaunchStorage(storage: MotivationStorage | null | undefined): MotivationStorage | null {
  if (storage !== undefined) return storage
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage
  } catch {
    return null
  }
}

function readPreviousLaunchIndex(language: MotivationLanguage, storage: MotivationStorage | null): number | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(`${LAST_LAUNCH_QUOTE_KEY_PREFIX}${language}`)
    if (raw === null) return null
    const parsed = Number(raw)
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
  } catch {
    return null
  }
}

function writePreviousLaunchIndex(language: MotivationLanguage, storage: MotivationStorage | null, index: number) {
  if (!storage) return
  try {
    storage.setItem(`${LAST_LAUNCH_QUOTE_KEY_PREFIX}${language}`, String(index))
  } catch {
    // localStorage can be unavailable in privacy modes; the catalog itself is still offline.
  }
}

function randomIndex(length: number, random: () => number): number {
  const value = random()
  const bounded = Number.isFinite(value) ? Math.max(0, Math.min(value, 0.999999999999)) : 0
  return Math.floor(bounded * length)
}

/**
 * Deterministische Wahl pro Tag + Tagesabschnitt; aufeinanderfolgende
 * Abschnitte desselben Tages liefern garantiert verschiedene Sprüche
 * (gleiches Prinzip wie die Server-Pushes).
 */
export function pickMotivationQuote(language: 'de' | 'en', now: Date = new Date()): MotivationQuote {
  const lang = normalizeLanguage(language)
  const quotes = MOTIVATION_QUOTES[lang]
  const dateKey = formatLocalDayOf(now.getTime())
  const slot = daypartSlot(now.getHours())
  let index = hashSeed(`${dateKey}:splash`) % quotes.length
  for (let step = 1; step <= slot; step += 1) {
    let next = hashSeed(`${dateKey}#${step}:splash`) % quotes.length
    if (next === index) next = (next + 1) % quotes.length
    index = next
  }
  return quotes[index]
}

/**
 * Splash-Auswahl pro App-Launch: bleibt während eines laufenden Starts stabil,
 * nimmt beim nächsten Start aber möglichst einen anderen Spruch als zuletzt.
 */
export function pickLaunchMotivationQuote(
  language: MotivationLanguage,
  options: LaunchPickOptions = {},
): MotivationQuote {
  const lang = normalizeLanguage(language)
  const cached = launchQuoteCache[lang]
  if (cached) return cached

  const quotes = MOTIVATION_QUOTES[lang]
  const storage = getLaunchStorage(options.storage)
  const previousIndex = readPreviousLaunchIndex(lang, storage)
  let index = randomIndex(quotes.length, options.random ?? Math.random)
  if (quotes.length > 1 && previousIndex === index) {
    index = (index + 1) % quotes.length
  }

  writePreviousLaunchIndex(lang, storage, index)
  launchQuoteCache[lang] = quotes[index]
  return quotes[index]
}

export function resetLaunchMotivationQuoteCache() {
  delete launchQuoteCache.de
  delete launchQuoteCache.en
}
