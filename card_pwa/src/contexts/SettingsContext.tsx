/**
 * AI_CONTEXT:
 * Role: Global settings/profile context for language, algorithm choice/params, study limits, notification settings, focus/fullscreen modes, and hydration state.
 * Used by: App providers and most UI/components needing localized strings or settings.
 * Important: Settings are persisted to localStorage while profile identity lives in IndexedDB; keep hydration flags accurate before dependent effects run.
 */
import { createContext, useContext, useState, useEffect } from 'react'
import { EXAM_DATE_SYNCED_EVENT, STORAGE_KEYS } from '../constants/appIdentity'
import {
  DEFAULT_ALGORITHM_PARAMS,
  normalizeAlgorithmParams,
  type AlgorithmParams,
  type FSRSParams,
  type SM2Params,
} from '../utils/algorithmParams'
import { clearProfile, loadProfile, saveProfile, buildLocalProfile, getOrCreateDeviceId, profileScopeId } from '../services/profileService'
import { normalizeStudyCardLimit } from '../utils/studySessionPersistence'
import { setCachedProfile } from '../services/syncConfig'
import { enqueueSyncOperation } from '../services/syncQueue'
import type { ProfileRecord } from '../db'
import { saveDraftLearnerExamPlan } from '../db/queries/learningUnits'
import { normalizeExamDateIso, normalizeExamDateUpdatedAt } from '../utils/examDate'
import { clamp, finiteOr } from '../utils/numeric'

export type Language = 'de' | 'en'
export type Algorithm = 'sm2' | 'fsrs'
export type FontFamily = 'industrial' | 'modern'
export type QuestionTextSize = 'default' | 'large' | 'xlarge' | 'xxlarge' | 'xxxlarge'
export type NotificationChannelKey = 'dailyReminder' | 'kpiAlert' | 'serverStatus' | 'pushGeneral' | 'pushTest'

export interface NotificationChannelConfig {
  enabled: boolean
  title: string
  body: string
}

export type NotificationChannels = Record<NotificationChannelKey, NotificationChannelConfig>

export const FONT_FAMILY_OPTIONS: Record<FontFamily, string> = {
  industrial: 'var(--app-font-family-mono)',
  modern: 'var(--app-font-family-sans)',
}

interface Settings {
  language: Language
  algorithm: Algorithm
  algorithmParams: AlgorithmParams
  studyCardLimit: number
  shuffleModeEnabled: boolean
  /** Show and record the per-card answer timer in every desktop deck. */
  answerTimerEnabled: boolean
  fontFamily: FontFamily
  questionTextSize: QuestionTextSize
  notificationsEnabled: boolean
  notificationChannels: NotificationChannels
  dailyReminderEnabled: boolean
  dailyReminderTime: string
  showReviewDecks: boolean
  /** Hour (0–23) at which a new study day begins. Default 4 = 04:00 AM.
   *  Prevents schedule shifts when studying past midnight (Issue #8). */
  nextDayStartsAt: number
  /** Daily review goal used for the progress ring on Home. 0 disables it. */
  dailyGoal: number
  /** Eigenes Kartenkontingent des aktuellen Lernpakets (0 = unbegrenzt).
   *  Der persistierte Feldname bleibt fuer bestehende Installationen stabil. */
  newCardsPerDay: number
  /** Prüfungstermin (ISO YYYY-MM-DD, z. B. Sec+) für den Countdown mit
   *  Tempo-Empfehlung auf der Heute-Kachel. null = kein Termin gesetzt. */
  examDateIso: string | null
  /** Zeitpunkt (ms) der letzten `examDateIso`-Änderung — LWW-Basis für den
   *  Profil-Sync (`examDate.upsert`). null = noch nie lokal gesetzt/synced. */
  examDateUpdatedAt: number | null
  /** Focus mode: hides the study session header (deck stats, progress) while
   *  reserving its space, so the card does not jump. Back button stays visible. */
  focusMode: boolean
  /** When on, the app re-enters the Fullscreen API on the first interaction
   *  after load (gesture-less auto-entry is blocked by browsers). */
  fullscreenEnabled: boolean
  /** Session-only reinforcement after a regular Review/Hard. */
  hardPracticeEnabled: boolean
  /** Consecutive Good answers needed to leave Hard reinforcement. */
  hardPracticeGoodStreak: number
  /** Maximum reinforcement passes per card; 0 means unlimited. */
  hardPracticeMaxPasses: number
  /** How early intraday learning steps may be pulled into a session. */
  learnAheadMinutes: number
}

interface SettingsContextType {
  settings: Settings
  isSettingsHydrated: boolean
  isProfileHydrated: boolean
  isAlgorithmMigrating: boolean
  setAlgorithmMigrating: (migrating: boolean) => void
  setLanguage: (lang: Language) => void
  setAlgorithm: (algo: Algorithm) => void
  setFontFamily: (fontFamily: FontFamily) => void
  setQuestionTextSize: (size: QuestionTextSize) => void
  setNotificationsEnabled: (enabled: boolean) => void
  setNotificationChannelEnabled: (channel: NotificationChannelKey, enabled: boolean) => void
  setNotificationChannelTemplate: (channel: NotificationChannelKey, title: string, body: string) => void
  setDailyReminderEnabled: (enabled: boolean) => void
  setDailyReminderTime: (time: string) => void
  setShowReviewDecks: (enabled: boolean) => void
  setStudyCardLimit: (limit: number) => void
  setShuffleModeEnabled: (enabled: boolean) => void
  setAnswerTimerEnabled: (enabled: boolean) => void
  setNextDayStartsAt: (hour: number) => void
  setDailyGoal: (goal: number) => void
  setNewCardsPerDay: (count: number) => void
  setExamDateIso: (dateIso: string | null, options?: { planAlreadySaved?: boolean }) => Promise<void>
  setFocusMode: (enabled: boolean) => void
  setFullscreenEnabled: (enabled: boolean) => void
  setHardPracticeEnabled: (enabled: boolean) => void
  setHardPracticeGoodStreak: (count: number) => void
  setHardPracticeMaxPasses: (count: number) => void
  setLearnAheadMinutes: (minutes: number) => void
  setSm2Params: (params: Partial<SM2Params>) => void
  setFsrsParams: (params: Partial<FSRSParams>) => void
  resetAlgorithmParams: () => void
  // Profile & Sync
  profile: ProfileRecord | null
  setProfile: (profile: ProfileRecord | null) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const STORAGE_KEY = STORAGE_KEYS.settings

const DEFAULT_NOTIFICATION_CHANNELS: NotificationChannels = {
  dailyReminder: {
    enabled: true,
    title: '',
    body: '',
  },
  kpiAlert: {
    enabled: true,
    title: '',
    body: '',
  },
  serverStatus: {
    enabled: true,
    title: '',
    body: '',
  },
  pushGeneral: {
    enabled: true,
    title: '',
    body: '',
  },
  pushTest: {
    enabled: true,
    title: '',
    body: '',
  },
}

function normalizeNotificationChannels(input: unknown): NotificationChannels {
  const source = (input && typeof input === 'object') ? input as Partial<Record<NotificationChannelKey, Partial<NotificationChannelConfig>>> : {}

  const normalizeChannel = (key: NotificationChannelKey): NotificationChannelConfig => {
    const raw = source[key]
    return {
      enabled: raw?.enabled !== false,
      title: typeof raw?.title === 'string' ? raw.title.trim().slice(0, 120) : '',
      body: typeof raw?.body === 'string' ? raw.body.trim().slice(0, 280) : '',
    }
  }

  return {
    dailyReminder: normalizeChannel('dailyReminder'),
    kpiAlert: normalizeChannel('kpiAlert'),
    serverStatus: normalizeChannel('serverStatus'),
    pushGeneral: normalizeChannel('pushGeneral'),
    pushTest: normalizeChannel('pushTest'),
  }
}

function normalizeDailyReminderTime(value: unknown): string {
  if (typeof value !== 'string') return '20:00'
  const trimmed = value.trim()
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed)) return '20:00'
  return trimmed
}

const DEFAULT_SETTINGS: Settings = {
  language: 'de',
  algorithm: 'fsrs',
  algorithmParams: DEFAULT_ALGORITHM_PARAMS,
  studyCardLimit: 50,
  shuffleModeEnabled: true,
  answerTimerEnabled: false,
  fontFamily: 'industrial',
  questionTextSize: 'default',
  notificationsEnabled: true,
  notificationChannels: DEFAULT_NOTIFICATION_CHANNELS,
  dailyReminderEnabled: false,
  dailyReminderTime: '20:00',
  showReviewDecks: false,
  nextDayStartsAt: 4,
  dailyGoal: 20,
  newCardsPerDay: 10,
  examDateIso: null,
  examDateUpdatedAt: null,
  focusMode: false,
  fullscreenEnabled: false,
  hardPracticeEnabled: true,
  hardPracticeGoodStreak: 2,
  hardPracticeMaxPasses: 0,
  learnAheadMinutes: 20,
}

function normalizeInteger(value: unknown, fallback: number, min: number, max: number): number {
  return clamp(Math.round(finiteOr(Number(value), fallback)), min, max)
}

function normalizeDailyGoal(value: unknown): number {
  return normalizeInteger(value, 20, 0, 500)
}

export function normalizeNewCardsPerDay(value: unknown): number {
  return normalizeInteger(value, 10, 0, 100)
}

export function normalizeSettings(input: Partial<Settings> | undefined): Settings {
  const legacy = input as (Partial<Settings> & { answerTimerDeckIds?: unknown }) | undefined
  const rawNextDayStartsAt = Number(input?.nextDayStartsAt)
  const normalizedChannels = normalizeNotificationChannels(input?.notificationChannels)
  const normalizedDailyReminderEnabled = typeof input?.dailyReminderEnabled === 'boolean'
    ? input.dailyReminderEnabled
    : normalizedChannels.dailyReminder.enabled

  return {
    language: input?.language === 'en' ? 'en' : 'de',
    algorithm: input?.algorithm === 'sm2' ? 'sm2' : 'fsrs',
    algorithmParams: normalizeAlgorithmParams(input?.algorithmParams),
    studyCardLimit: normalizeStudyCardLimit(input?.studyCardLimit),
    shuffleModeEnabled: input?.shuffleModeEnabled !== false,
    answerTimerEnabled: typeof input?.answerTimerEnabled === 'boolean'
      ? input.answerTimerEnabled
      : Array.isArray(legacy?.answerTimerDeckIds) && legacy.answerTimerDeckIds.length > 0,
    fontFamily: input?.fontFamily === 'modern' ? input.fontFamily : 'industrial',
    questionTextSize:
      input?.questionTextSize === 'large'
      || input?.questionTextSize === 'xlarge'
      || input?.questionTextSize === 'xxlarge'
      || input?.questionTextSize === 'xxxlarge'
        ? input.questionTextSize
        : 'default',
    notificationsEnabled: input?.notificationsEnabled !== false,
      notificationChannels: normalizedChannels,
      dailyReminderEnabled: normalizedDailyReminderEnabled,
    dailyReminderTime: normalizeDailyReminderTime(input?.dailyReminderTime),
    showReviewDecks: input?.showReviewDecks === true,
    nextDayStartsAt: Number.isInteger(rawNextDayStartsAt) && rawNextDayStartsAt >= 0 && rawNextDayStartsAt <= 23 ? rawNextDayStartsAt : 4,
    dailyGoal: normalizeDailyGoal(input?.dailyGoal),
    newCardsPerDay: normalizeNewCardsPerDay(input?.newCardsPerDay),
    examDateIso: normalizeExamDateIso(input?.examDateIso),
    examDateUpdatedAt: normalizeExamDateUpdatedAt(input?.examDateUpdatedAt),
    focusMode: input?.focusMode === true,
    fullscreenEnabled: input?.fullscreenEnabled === true,
    hardPracticeEnabled: input?.hardPracticeEnabled !== false,
    hardPracticeGoodStreak: normalizeInteger(input?.hardPracticeGoodStreak, 2, 1, 5),
    hardPracticeMaxPasses: normalizeInteger(input?.hardPracticeMaxPasses, 0, 0, 20),
    learnAheadMinutes: normalizeInteger(input?.learnAheadMinutes, 20, 0, 60),
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS)
  const [isSettingsHydrated, setIsSettingsHydrated] = useState(false)
  const [isProfileHydrated, setIsProfileHydrated] = useState(false)
  const [isAlgorithmMigrating, setAlgorithmMigrating] = useState(false)
  const [profile, setProfileState] = useState<ProfileRecord | null>(null)

  const saveSettings = (next: Settings) => {
    setSettingsState(next)
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const existing = raw ? JSON.parse(raw) as Record<string, unknown> : {}
      delete existing.gameOfLifeViewMode
      delete existing.gameOfLifeAnimationSpeed
      delete existing.answerTimerDeckIds
      delete existing.showBuildVersion
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...next }))
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }
  }

  // Lade Settings aus LocalStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<Settings>
        saveSettings(normalizeSettings(parsed))
      } catch {
        // Ignore parsing errors
      }
    }
    setIsSettingsHydrated(true)
  }, [])

  // Ein von einem anderen Gerät gepullter `examDate.upsert` schreibt direkt in
  // localStorage (syncPull.ts, außerhalb von React) und feuert dieses Event —
  // Settings hat keine Dexie-liveQuery-Reaktivität, also hier explizit den
  // gerade geschriebenen Wert ins React-State übernehmen (kein erneuter Push).
  useEffect(() => {
    const onExamDateSynced = () => {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return
      try {
        const parsed = JSON.parse(stored) as Partial<Settings>
        setSettingsState(prev => ({
          ...prev,
          examDateIso: normalizeExamDateIso(parsed.examDateIso),
          examDateUpdatedAt: normalizeExamDateUpdatedAt(parsed.examDateUpdatedAt),
        }))
      } catch {
        // Ignore parsing errors
      }
    }
    window.addEventListener(EXAM_DATE_SYNCED_EVENT, onExamDateSynced)
    return () => window.removeEventListener(EXAM_DATE_SYNCED_EVENT, onExamDateSynced)
  }, [])

  // Load profile from IndexedDB on mount
  useEffect(() => {
    void (async () => {
      try {
        let p = await loadProfile()
        if (!p) {
          // Ensure device ID is seeded even in local mode
          getOrCreateDeviceId()
          p = buildLocalProfile()
          await saveProfile(p)
        }
        setProfileState(p)
        // Feed into syncConfig cache
        setCachedProfile(
          p.mode === 'linked' ? (p.profileToken ?? null) : null,
          p.mode === 'linked' ? (p.endpoint ?? null) : null,
        )
      } finally {
        setIsProfileHydrated(true)
      }
    })()
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--app-font-family', FONT_FAMILY_OPTIONS[settings.fontFamily])
    root.style.setProperty(
      '--app-font-family-sans',
      settings.fontFamily === 'industrial'
        ? '"Share Tech Mono", "IBM Plex Mono", monospace'
        : '"Space Grotesk", "Inter", system-ui, sans-serif'
    )
    root.style.setProperty(
      '--app-font-family-mono',
      settings.fontFamily === 'industrial'
        ? '"Share Tech Mono", "IBM Plex Mono", monospace'
        : '"Space Grotesk", "Inter", system-ui, sans-serif'
    )
  }, [settings.fontFamily])

  const setLanguage = (language: Language) => {
    saveSettings({ ...settings, language })
  }

  const setAlgorithm = (algorithm: Algorithm) => {
    saveSettings({ ...settings, algorithm })
  }

  const setFontFamily = (fontFamily: FontFamily) => {
    saveSettings({ ...settings, fontFamily })
  }

  const setQuestionTextSize = (questionTextSize: QuestionTextSize) => {
    saveSettings({ ...settings, questionTextSize })
  }

  const setNotificationsEnabled = (notificationsEnabled: boolean) => {
    saveSettings({ ...settings, notificationsEnabled })
  }

  const setNotificationChannelEnabled = (channel: NotificationChannelKey, enabled: boolean) => {
    const notificationChannels: NotificationChannels = {
      ...settings.notificationChannels,
      [channel]: {
        ...settings.notificationChannels[channel],
        enabled,
      },
    }

    saveSettings({
      ...settings,
      notificationChannels,
      dailyReminderEnabled: channel === 'dailyReminder' ? enabled : settings.dailyReminderEnabled,
    })
  }

  const setNotificationChannelTemplate = (channel: NotificationChannelKey, title: string, body: string) => {
    const notificationChannels: NotificationChannels = {
      ...settings.notificationChannels,
      [channel]: {
        ...settings.notificationChannels[channel],
        title: title.trim().slice(0, 120),
        body: body.trim().slice(0, 280),
      },
    }

    saveSettings({
      ...settings,
      notificationChannels,
    })
  }

  const setDailyReminderEnabled = (dailyReminderEnabled: boolean) => {
    saveSettings({
      ...settings,
      dailyReminderEnabled,
      notificationChannels: {
        ...settings.notificationChannels,
        dailyReminder: {
          ...settings.notificationChannels.dailyReminder,
          enabled: dailyReminderEnabled,
        },
      },
    })
  }

  const setDailyReminderTime = (dailyReminderTime: string) => {
    saveSettings({ ...settings, dailyReminderTime: normalizeDailyReminderTime(dailyReminderTime) })
  }

  const setShowReviewDecks = (showReviewDecks: boolean) => {
    saveSettings({ ...settings, showReviewDecks })
  }

  const setStudyCardLimit = (limit: number) => {
    saveSettings({ ...settings, studyCardLimit: normalizeStudyCardLimit(limit) })
  }

  const setShuffleModeEnabled = (shuffleModeEnabled: boolean) => {
    saveSettings({ ...settings, shuffleModeEnabled })
  }

  const setAnswerTimerEnabled = (answerTimerEnabled: boolean) => {
    saveSettings({ ...settings, answerTimerEnabled })
  }

  const setNextDayStartsAt = (hour: number) => {
    const normalized = Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 4
    saveSettings({ ...settings, nextDayStartsAt: normalized })
  }

  const setDailyGoal = (goal: number) => {
    saveSettings({ ...settings, dailyGoal: normalizeDailyGoal(goal) })
  }

  const setNewCardsPerDay = (count: number) => {
    saveSettings({ ...settings, newCardsPerDay: normalizeNewCardsPerDay(count) })
  }

  const setExamDateIso = async (
    dateIso: string | null,
    options: { planAlreadySaved?: boolean } = {},
  ) => {
    const examDateIso = normalizeExamDateIso(dateIso)
    if (dateIso !== null && examDateIso === null) {
      throw new Error(`Invalid exam date: ${dateIso}`)
    }
    const examDateUpdatedAt = Date.now()

    // `learnerExamPlans` is the authoritative write source. Settings remains
    // a derived compatibility/countdown cache and is only updated after the
    // profile-scoped plan write has succeeded.
    if (!options.planAlreadySaved) {
      await saveDraftLearnerExamPlan({
        profileId: profileScopeId(profile),
        now: examDateUpdatedAt,
        examDateIso,
        uiLanguage: settings.language,
      })
    }
    saveSettings({ ...settings, examDateIso, examDateUpdatedAt })
    await enqueueSyncOperation('examDate.upsert', {
      profileId: profileScopeId(profile),
      examDateIso,
      updatedAt: examDateUpdatedAt,
    })
  }

  const setFocusMode = (focusMode: boolean) => {
    saveSettings({ ...settings, focusMode })
  }

  const setFullscreenEnabled = (fullscreenEnabled: boolean) => {
    saveSettings({ ...settings, fullscreenEnabled })
  }

  const setHardPracticeEnabled = (hardPracticeEnabled: boolean) => {
    saveSettings({ ...settings, hardPracticeEnabled })
  }

  const setHardPracticeGoodStreak = (count: number) => {
    saveSettings({ ...settings, hardPracticeGoodStreak: normalizeInteger(count, 2, 1, 5) })
  }

  const setHardPracticeMaxPasses = (count: number) => {
    saveSettings({ ...settings, hardPracticeMaxPasses: normalizeInteger(count, 0, 0, 20) })
  }

  const setLearnAheadMinutes = (minutes: number) => {
    saveSettings({ ...settings, learnAheadMinutes: normalizeInteger(minutes, 20, 0, 60) })
  }

  const setSm2Params = (params: Partial<SM2Params>) => {
    saveSettings({
      ...settings,
      algorithmParams: {
        ...settings.algorithmParams,
        sm2: normalizeAlgorithmParams({ sm2: { ...settings.algorithmParams.sm2, ...params } }).sm2,
      },
    })
  }

  const setFsrsParams = (params: Partial<FSRSParams>) => {
    saveSettings({
      ...settings,
      algorithmParams: {
        ...settings.algorithmParams,
        fsrs: normalizeAlgorithmParams({ fsrs: { ...settings.algorithmParams.fsrs, ...params } }).fsrs,
      },
    })
  }

  const resetAlgorithmParams = () => {
    saveSettings({
      ...settings,
      algorithmParams: DEFAULT_ALGORITHM_PARAMS,
    })
  }

  const setProfile = (next: ProfileRecord | null) => {
    if (next) {
      void saveProfile(next)
      setProfileState(next)
      setCachedProfile(
        next.mode === 'linked' ? (next.profileToken ?? null) : null,
        next.mode === 'linked' ? (next.endpoint ?? null) : null,
      )
    } else {
      void clearProfile()
      setProfileState(null)
      setCachedProfile(null, null)
    }
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isSettingsHydrated,
        isProfileHydrated,
        isAlgorithmMigrating,
        setAlgorithmMigrating,
        setLanguage,
        setAlgorithm,
        setFontFamily,
        setQuestionTextSize,
        setNotificationsEnabled,
        setNotificationChannelEnabled,
        setNotificationChannelTemplate,
        setDailyReminderEnabled,
        setDailyReminderTime,
        setShowReviewDecks,
        setStudyCardLimit,
        setShuffleModeEnabled,
        setAnswerTimerEnabled,
        setNextDayStartsAt,
        setDailyGoal,
        setNewCardsPerDay,
        setExamDateIso,
        setFocusMode,
        setFullscreenEnabled,
        setHardPracticeEnabled,
        setHardPracticeGoodStreak,
        setHardPracticeMaxPasses,
        setLearnAheadMinutes,
        setSm2Params,
        setFsrsParams,
        resetAlgorithmParams,
        profile,
        setProfile,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings muss innerhalb von SettingsProvider verwendet werden')
  }
  return context
}

export { STRINGS } from '../i18n'
