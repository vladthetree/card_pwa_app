import { createContext, useContext, useState, useEffect } from 'react'
import { STORAGE_KEYS } from '../constants/appIdentity'
import {
  DEFAULT_ALGORITHM_PARAMS,
  normalizeAlgorithmParams,
  type AlgorithmParams,
  type FSRSParams,
  type SM2Params,
} from '../utils/algorithmParams'
import { clearProfile, loadProfile, saveProfile, makeLocalProfile, getOrCreateDeviceId } from '../services/profileService'
import { setCachedProfile } from '../services/syncConfig'
import type { ProfileRecord } from '../db'

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
  fontFamily: FontFamily
  questionTextSize: QuestionTextSize
  notificationsEnabled: boolean
  notificationChannels: NotificationChannels
  dailyReminderEnabled: boolean
  dailyReminderTime: string
  showBuildVersion: boolean
  /** Hour (0–23) at which a new study day begins. Default 4 = 04:00 AM.
   *  Prevents schedule shifts when studying past midnight (Issue #8). */
  nextDayStartsAt: number
  /** Daily review goal used for the progress ring on Home. 0 disables it. */
  dailyGoal: number
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
  setShowBuildVersion: (enabled: boolean) => void
  setStudyCardLimit: (limit: number) => void
  setShuffleModeEnabled: (enabled: boolean) => void
  setNextDayStartsAt: (hour: number) => void
  setDailyGoal: (goal: number) => void
  setSm2Params: (params: Partial<SM2Params>) => void
  setFsrsParams: (params: Partial<FSRSParams>) => void
  resetAlgorithmParams: () => void
  // Profile & Sync
  profile: ProfileRecord | null
  setProfile: (profile: ProfileRecord | null) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const STORAGE_KEY = STORAGE_KEYS.settings
const MIN_STUDY_CARD_LIMIT = 10
const MAX_STUDY_CARD_LIMIT = 200
const STUDY_CARD_LIMIT_STEP = 10

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

function normalizeStudyCardLimit(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 50
  const rounded = Math.round(parsed / STUDY_CARD_LIMIT_STEP) * STUDY_CARD_LIMIT_STEP
  return Math.max(MIN_STUDY_CARD_LIMIT, Math.min(MAX_STUDY_CARD_LIMIT, rounded))
}

const DEFAULT_SETTINGS: Settings = {
  language: 'de',
  algorithm: 'fsrs',
  algorithmParams: DEFAULT_ALGORITHM_PARAMS,
  studyCardLimit: 50,
  shuffleModeEnabled: true,
  fontFamily: 'industrial',
  questionTextSize: 'default',
  notificationsEnabled: true,
  notificationChannels: DEFAULT_NOTIFICATION_CHANNELS,
  dailyReminderEnabled: false,
  dailyReminderTime: '20:00',
  showBuildVersion: true,
  nextDayStartsAt: 4,
  dailyGoal: 20,
}

function normalizeDailyGoal(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 20
  const rounded = Math.round(parsed)
  return Math.max(0, Math.min(500, rounded))
}

function normalizeSettings(input: Partial<Settings> | undefined): Settings {
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
    showBuildVersion: input?.showBuildVersion !== false,
    nextDayStartsAt: Number.isInteger(rawNextDayStartsAt) && rawNextDayStartsAt >= 0 && rawNextDayStartsAt <= 23 ? rawNextDayStartsAt : 4,
    dailyGoal: normalizeDailyGoal(input?.dailyGoal),
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

  // Load profile from IndexedDB on mount
  useEffect(() => {
    void (async () => {
      try {
        let p = await loadProfile()
        if (!p) {
          // Ensure device ID is seeded even in local mode
          getOrCreateDeviceId()
          p = makeLocalProfile()
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

  const setShowBuildVersion = (showBuildVersion: boolean) => {
    saveSettings({ ...settings, showBuildVersion })
  }

  const setStudyCardLimit = (limit: number) => {
    saveSettings({ ...settings, studyCardLimit: normalizeStudyCardLimit(limit) })
  }

  const setShuffleModeEnabled = (shuffleModeEnabled: boolean) => {
    saveSettings({ ...settings, shuffleModeEnabled })
  }

  const setNextDayStartsAt = (hour: number) => {
    const normalized = Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 4
    saveSettings({ ...settings, nextDayStartsAt: normalized })
  }

  const setDailyGoal = (goal: number) => {
    saveSettings({ ...settings, dailyGoal: normalizeDailyGoal(goal) })
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
        setShowBuildVersion,
        setStudyCardLimit,
        setShuffleModeEnabled,
        setNextDayStartsAt,
        setDailyGoal,
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
