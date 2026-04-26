import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Brain,
  Bell,
  Bug,
  Palette,
  Settings as SettingsIcon,
  RefreshCw,
  X,
  User,
} from 'lucide-react'
import {
  useSettings,
  STRINGS,
  type FontFamily,
  type NotificationChannelKey,
  FONT_FAMILY_OPTIONS,
} from '../contexts/SettingsContext'
import { THEMES, useTheme, type ThemeKey } from '../contexts/ThemeContext'
import { clearAlgorithmDiagnostics, getAlgorithmDiagnostics, normalizeDueDates, type AlgorithmDiagnosticsEntry } from '../db/queries'
import { clearErrorLogs, downloadErrorLogsAsTxt, getErrorLogs, type ErrorLogEntry } from '../services/errorLog'
import { UI_TOKENS } from '../constants/ui'
import { subscribeToWebPushNotificationsWithStatus, type WebPushSubscribeStatus } from '../services/webPush'
import { db } from '../db'
import { BACKUP_METADATA, DATABASE_NAMES, STORAGE_KEYS } from '../constants/appIdentity'
import { clearSyncQueue, closeSyncQueueDatabase } from '../services/syncQueue'
import { resetSyncPullState } from '../services/syncPull'
import { readSyncAuthTokenFromSettings, writeSyncAuthTokenToSettings } from '../services/syncConfig'
import { resetLocalStudyDataForProfileSwitch } from '../services/profileService'
import { formatBuildVersionTitle, formatServiceWorkerVersionLabel } from '../utils/buildInfo'
import { InfoHint } from './InfoHint'
import { SettingsSection } from './SettingsSection'
import ConfirmModal from './ConfirmModal'
import ProfileSyncSection from './ProfileSyncSection'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type SettingsSectionKey = 'profile' | 'appearance' | 'learning' | 'notifications' | 'diagnostics'



const MIN_STUDY_CARD_LIMIT = 10
const MAX_STUDY_CARD_LIMIT = 200
const STUDY_CARD_LIMIT_STEP = 10
const APP_STORAGE_PREFIXES = ['card-pwa-', 'anki-pwa-'] as const
const APP_COOKIE_PREFIXES = ['card_pwa_', 'anki_pwa_', 'card-pwa-', 'anki-pwa-'] as const
const APP_STORAGE_EXACT_KEYS = [BACKUP_METADATA.marker, BACKUP_METADATA.legacyMarker] as const
const APP_SERVICE_WORKER_PATH = '/service-worker.js'



function ParameterLabel({ text, info }: { text: string; info: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{text}</span>
      <InfoHint label={`${text} info`} text={info} />
    </span>
  )
}


export default function SettingsModal({ isOpen, onClose }: Props) {
  const {
    settings,
    isAlgorithmMigrating,
    setLanguage,
    setAlgorithm,
    setFontFamily,
    setNotificationsEnabled,
    setNotificationChannelEnabled,
    setNotificationChannelTemplate,
    setDailyReminderEnabled,
    setDailyReminderTime,
    setShowBuildVersion,
    setStudyCardLimit,
    setShuffleModeEnabled,
    setDailyGoal,
    setSm2Params,
    setFsrsParams,
    resetAlgorithmParams,
  } = useSettings()
  const { themeKey, setTheme } = useTheme()
  const t = STRINGS[settings.language]
  const prefersReducedMotion = useReducedMotion()
  const [openSection, setOpenSection] = useState<SettingsSectionKey | null>(null)
  const [diagnostics, setDiagnostics] = useState<AlgorithmDiagnosticsEntry[]>([])
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([])
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof Notification === 'undefined') return 'unsupported'
    return Notification.permission
  })
  const [syncAuthToken, setSyncAuthToken] = useState(() => readSyncAuthTokenFromSettings())
  const [notificationTestStatus, setNotificationTestStatus] = useState<string | null>(null)
  const [localDataStatus, setLocalDataStatus] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    title: string
    message: string
    confirmLabel?: string
    variant?: 'danger' | 'default'
    onConfirm: () => void
  } | null>(null)
  const isIosRuntime = typeof window !== 'undefined' && /iphone|ipad|ipod/i.test(window.navigator.userAgent)
  const buildVersionLabel = useMemo(() => formatServiceWorkerVersionLabel(), [])
  const buildVersionTitle = useMemo(() => formatBuildVersionTitle(), [])

  const fontOptions: Array<{ key: FontFamily; label: string; description: string; preview: string }> = [
    {
      key: 'industrial',
      label: t.font_family_industrial,
      description: t.font_family_industrial_help,
      preview: 'A1 GRID LOCK',
    },
    {
      key: 'modern',
      label: t.font_family_modern,
      description: t.font_family_modern_help,
      preview: 'Signal Flow 204',
    },
  ]

  const isDE = settings.language === 'de'
  const notificationChannels: Array<{
    key: NotificationChannelKey
    label: string
    description: string
    defaultTitle: string
    defaultBody: string
  }> = [
    {
      key: 'dailyReminder',
      label: t.notification_channel_daily_reminder,
      description: t.notification_channel_daily_reminder_help,
      defaultTitle: isDE ? 'Lern-Reminder' : 'Study reminder',
      defaultBody: isDE ? 'Zeit für deine heutige Session in Card_PWA.' : 'Time for your daily study session in Card_PWA.',
    },
    {
      key: 'kpiAlert',
      label: t.notification_channel_kpi_alert,
      description: t.notification_channel_kpi_alert_help,
      defaultTitle: isDE ? 'Hohe Lernlast erkannt' : 'High study backlog detected',
      defaultBody: isDE ? 'Du hast aktuell 12 fällige Karten. Starte eine Session, um den Rückstand zu glätten.' : 'You currently have 12 due cards. Start a study session to reduce the backlog.',
    },
    {
      key: 'serverStatus',
      label: t.notification_channel_server_status,
      description: t.notification_channel_server_status_help,
      defaultTitle: isDE ? 'Server verbunden' : 'Server connected',
      defaultBody: isDE ? 'Sync-Verbindung ist aktiv.' : 'Sync connection is active.',
    },
    {
      key: 'pushGeneral',
      label: t.notification_channel_push_general,
      description: t.notification_channel_push_general_help,
      defaultTitle: isDE ? 'Neue Lernbenachrichtigung' : 'New study notification',
      defaultBody: isDE ? 'Es gibt neue Inhalte in Card_PWA.' : 'There is new activity in Card_PWA.',
    },
    {
      key: 'pushTest',
      label: t.notification_channel_push_test,
      description: t.notification_channel_push_test_help,
      defaultTitle: isDE ? 'Neue Lernbenachrichtigung' : 'New study notification',
      defaultBody: isDE ? 'Es gibt neue Inhalte in Card_PWA.' : 'There is new activity in Card_PWA.',
    },
  ]

  useEffect(() => {
    if (isOpen) {
      setDiagnostics(getAlgorithmDiagnostics())
      setErrorLogs(getErrorLogs())
      setNotificationPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
      setNotificationTestStatus(null)
      setLocalDataStatus(null)
    }
  }, [isOpen])

  const isAppStorageKey = (key: string) =>
    APP_STORAGE_EXACT_KEYS.includes(key as typeof APP_STORAGE_EXACT_KEYS[number]) ||
    APP_STORAGE_PREFIXES.some(prefix => key.startsWith(prefix))

  const clearStorageArea = (storage: Storage) => {
    const keys: string[] = []
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key && isAppStorageKey(key)) {
        keys.push(key)
      }
    }
    keys.forEach(key => storage.removeItem(key))
  }

  const isAppServiceWorkerRegistration = (registration: ServiceWorkerRegistration) => {
    const scriptUrls = [
      registration.active?.scriptURL,
      registration.waiting?.scriptURL,
      registration.installing?.scriptURL,
    ].filter((value): value is string => typeof value === 'string' && value.length > 0)

    return scriptUrls.some(scriptUrl => {
      try {
        return new URL(scriptUrl, window.location.origin).pathname === APP_SERVICE_WORKER_PATH
      } catch {
        return false
      }
    })
  }

  const unregisterAppServiceWorkers = async () => {
    if (!('serviceWorker' in navigator)) return
    const registrations = await navigator.serviceWorker.getRegistrations()
    const appRegistrations = registrations.filter(isAppServiceWorkerRegistration)
    await Promise.all(appRegistrations.map(registration => registration.unregister()))
  }

  const deleteAppCaches = async () => {
    if (typeof caches === 'undefined') return
    const keys = await caches.keys()
    const appKeys = keys.filter(key => APP_STORAGE_PREFIXES.some(prefix => key.startsWith(prefix)))
    await Promise.all(appKeys.map(key => caches.delete(key)))
  }

  const resetLocalIndexedDb = () => {
    setConfirmModal({
      title: t.indexeddb_reset_title,
      message: t.indexeddb_reset_confirm,
      confirmLabel: t.indexeddb_reset_action,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await resetLocalStudyDataForProfileSwitch()
          await clearSyncQueue()
          await resetSyncPullState()
          localStorage.removeItem(STORAGE_KEYS.studySession)
          localStorage.removeItem(STORAGE_KEYS.legacyStudySession)

          setLocalDataStatus(t.indexeddb_reset_done)
          window.setTimeout(() => {
            window.location.reload()
          }, 300)
        } catch {
          setLocalDataStatus(t.indexeddb_reset_failed)
        }
      },
    })
  }

  const resetServiceWorkerState = () => {
    setConfirmModal({
      title: t.service_worker_reset_action,
      message: t.service_worker_reset_confirm,
      confirmLabel: t.service_worker_reset_action,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await unregisterAppServiceWorkers()
          await deleteAppCaches()

          setLocalDataStatus(t.service_worker_reset_done)
          window.setTimeout(() => {
            window.location.reload()
          }, 300)
        } catch {
          setLocalDataStatus(t.service_worker_reset_failed)
        }
      },
    })
  }

  const deleteCookieEverywhere = (name: string) => {
    const expires = 'Thu, 01 Jan 1970 00:00:00 GMT'
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    const hostParts = window.location.hostname.split('.').filter(Boolean)
    const domains = new Set<string>([''])
    for (let index = 0; index < hostParts.length - 1; index += 1) {
      domains.add(`.${hostParts.slice(index).join('.')}`)
    }

    const pathParts = window.location.pathname.split('/').filter(Boolean)
    const paths = new Set<string>(['/'])
    let currentPath = ''
    for (const part of pathParts) {
      currentPath += `/${part}`
      paths.add(currentPath)
    }

    domains.forEach(domain => {
      paths.forEach(path => {
        document.cookie = `${encodeURIComponent(name)}=; expires=${expires}; max-age=0; path=${path}${domain ? `; domain=${domain}` : ''}; SameSite=Lax${secure}`
      })
    })
  }

  const deleteAccessibleCookies = () => {
    document.cookie
      .split(';')
      .map(cookie => cookie.split('=')[0]?.trim())
      .filter((name): name is string => (
        Boolean(name) &&
        APP_COOKIE_PREFIXES.some(prefix => name.startsWith(prefix))
      ))
      .forEach(deleteCookieEverywhere)
  }

  const deleteIndexedDbDatabase = (name: string) => new Promise<void>(resolve => {
    if (!('indexedDB' in window)) {
      resolve()
      return
    }

    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })

  const resetEntirePwaState = () => {
    setConfirmModal({
      title: t.pwa_full_reset_title,
      message: t.pwa_full_reset_confirm,
      confirmLabel: t.pwa_full_reset_action,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await unregisterAppServiceWorkers()
          await deleteAppCaches()

          try {
            db.close()
            closeSyncQueueDatabase()
          } catch {
            // best effort: continue clearing browser-owned storage
          }

          deleteAccessibleCookies()
          clearStorageArea(localStorage)
          clearStorageArea(sessionStorage)

          await Promise.all([
            deleteIndexedDbDatabase(DATABASE_NAMES.app),
            deleteIndexedDbDatabase(DATABASE_NAMES.legacyApp),
            deleteIndexedDbDatabase(DATABASE_NAMES.syncQueue),
            deleteIndexedDbDatabase(DATABASE_NAMES.legacySyncQueue),
          ])

          setLocalDataStatus(t.pwa_full_reset_done)
          window.setTimeout(() => {
            window.location.replace(window.location.origin + window.location.pathname)
          }, 300)
        } catch {
          setLocalDataStatus(t.pwa_full_reset_failed)
        }
      },
    })
  }

  const runNormalizeDueDates = () => {
    setConfirmModal({
      title: t.normalize_due_dates_action,
      message: t.normalize_due_dates_confirm,
      confirmLabel: t.normalize_due_dates_action,
      onConfirm: async () => {
        try {
          const { updated } = await normalizeDueDates()
          if (updated === 0) {
            setLocalDataStatus(t.normalize_due_dates_none)
          } else {
            setLocalDataStatus(t.normalize_due_dates_done.replace('{count}', String(updated)))
          }
        } catch {
          setLocalDataStatus(t.normalize_due_dates_failed)
        }
      },
    })
  }

  const updateNumber = (
    value: string,
    updater: (nextValue: number) => void
  ) => {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      updater(parsed)
    }
  }

  const toggleSection = (section: SettingsSectionKey) => {
    setOpenSection(current => (current === section ? null : section))
  }

  const notificationPermissionLabel = notificationPermission === 'granted'
    ? t.notification_test_permission_granted_label
    : notificationPermission === 'denied'
      ? t.notification_test_permission_denied_label
      : notificationPermission === 'default'
        ? t.notification_test_permission_default_label
        : t.notification_test_permission_unsupported_label

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported')
      setNotificationTestStatus(t.notification_test_unsupported)
      return 'unsupported' as const
    }

    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
    setNotificationTestStatus(
      permission === 'granted'
        ? t.notification_test_permission_granted
        : t.notification_test_permission_denied
    )
    return permission
  }

  const ensureNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported')
      setNotificationTestStatus(t.notification_test_unsupported)
      return false
    }

    const current = Notification.permission
    setNotificationPermission(current)

    if (current === 'granted') {
      return true
    }

    if (current === 'default') {
      const requested = await requestNotificationPermission()
      return requested === 'granted'
    }

    setNotificationTestStatus(t.notification_test_permission_required)
    return false
  }

  const postServiceWorkerMessage = async (payload: Record<string, unknown>) => {
    if (!('serviceWorker' in navigator)) {
      setNotificationTestStatus(t.notification_test_sw_unavailable)
      return false
    }

    try {
      const registration = await navigator.serviceWorker.ready
      registration.active?.postMessage(payload)
      navigator.serviceWorker.controller?.postMessage(payload)
      return true
    } catch {
      setNotificationTestStatus(t.notification_test_sw_unavailable)
      return false
    }
  }

  const triggerServerStatusTest = async (connected: boolean) => {
    const hasPermission = await ensureNotificationPermission()
    if (!hasPermission) {
      return
    }

    const ok = await postServiceWorkerMessage({
      type: 'SERVER_STATUS_NOTIFICATION',
      title: connected ? t.notification_test_online_title : t.notification_test_offline_title,
      body: connected ? t.notification_test_online_body : t.notification_test_offline_body,
      connected,
    })

    if (ok) {
      setNotificationTestStatus(connected ? t.notification_test_online_sent : t.notification_test_offline_sent)
    }
  }

  const triggerPushTest = async () => {
    const hasPermission = await ensureNotificationPermission()
    if (!hasPermission) {
      return
    }

    const ok = await postServiceWorkerMessage({
      type: 'TEST_PUSH_NOTIFICATION',
      language: settings.language,
      title: t.notification_test_push_title,
      body: t.notification_test_push_body,
      tag: 'card-pwa-test-push',
      url: '/?view=study',
    })

    if (ok) {
      setNotificationTestStatus(t.notification_test_push_sent)
    }
  }

  const applyDailyReminderEnabled = async (enabled: boolean) => {
    if (!enabled) {
      setDailyReminderEnabled(false)
      setNotificationTestStatus(t.daily_reminder_saved)
      return true
    }

    const hasPermission = await ensureNotificationPermission()
    if (!hasPermission) {
      setNotificationTestStatus(t.daily_reminder_permission_needed)
      return false
    }

    const status = await subscribeToWebPushNotificationsWithStatus(settings.language, {
      enabled: true,
      time: settings.dailyReminderTime,
    })

    setDailyReminderEnabled(true)
    setNotificationTestStatus(mapWebPushStatusToText(status, t))
    return true
  }

  const applySwNotificationsEnabled = (enabled: boolean) => {
    setNotificationsEnabled(enabled)
    setNotificationTestStatus(enabled ? t.sw_notifications_enabled : t.sw_notifications_disabled)
  }

  const applyNotificationChannelEnabled = async (channel: NotificationChannelKey, enabled: boolean) => {
    if (channel === 'dailyReminder') {
      const applied = await applyDailyReminderEnabled(enabled)
      setNotificationChannelEnabled(channel, applied ? enabled : false)
      return
    }

    setNotificationChannelEnabled(channel, enabled)
    setNotificationTestStatus(
      enabled
        ? t.notification_channel_enabled.replace('{channel}', notificationChannels.find(item => item.key === channel)?.label ?? channel)
        : t.notification_channel_disabled.replace('{channel}', notificationChannels.find(item => item.key === channel)?.label ?? channel)
    )
  }

  const applyNotificationTemplate = (channel: NotificationChannelKey, title: string, body: string) => {
    setNotificationChannelTemplate(channel, title, body)
  }

  const resetNotificationTemplate = (channel: NotificationChannelKey) => {
    setNotificationChannelTemplate(channel, '', '')
  }

  const handleSyncAuthTokenChange = (value: string) => {
    setSyncAuthToken(value)
    writeSyncAuthTokenToSettings(value)
  }

  const applyDailyReminderTime = async (time: string) => {
    setDailyReminderTime(time)

    if (!settings.dailyReminderEnabled) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    const status = await subscribeToWebPushNotificationsWithStatus(settings.language, {
      enabled: true,
      time,
    })
    setNotificationTestStatus(mapWebPushStatusToText(status, t))
  }

  const mapWebPushStatusToText = (status: WebPushSubscribeStatus, strings: Record<string, string>) => {
    switch (status) {
      case 'subscribed':
        return strings.daily_reminder_subscription_synced
      case 'missing-vapid-key':
        return strings.daily_reminder_subscription_missing_vapid
      case 'missing-subscribe-endpoint':
        return strings.daily_reminder_subscription_missing_endpoint
      case 'subscribe-endpoint-failed':
        return strings.daily_reminder_subscription_failed_endpoint
      case 'unsupported':
      case 'error':
      default:
        return strings.daily_reminder_subscription_unavailable
    }
  }

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          className={UI_TOKENS.modal.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: prefersReducedMotion ? 0.12 : 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-zinc-800 bg-[#050505] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_56px_-10px_rgba(0,0,0,0.72),0_42px_80px_-24px_rgba(0,0,0,0.55)] sm:rounded-[2.5rem]"
            style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2rem)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-zinc-900 bg-[#050505]/95 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <SettingsIcon size={18} className="text-zinc-400" />
                <div>
                  <h2 className="text-zinc-100 font-black text-lg tracking-tight">{t.settings}</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {t.settings_expand_sections}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-900 text-zinc-500 transition-all duration-300 ease-out hover:border-zinc-700 hover:text-zinc-100 active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            <div
              className="overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 space-y-3"
              style={{
                maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 9.25rem)',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)',
                scrollPaddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)',
              }}
            >
              <SettingsSection
                title={settings.language === 'de' ? 'Profil & Sync' : 'Profile & Sync'}
                description={settings.language === 'de' ? 'Lokale Nutzung oder geräteübergreifende Synchronisierung.' : 'Use locally or sync across devices.'}
                icon={<User size={18} />}
                isOpen={openSection === 'profile'}
                onToggle={() => toggleSection('profile')}
              >
                <ProfileSyncSection language={settings.language === 'de' ? 'de' : 'en'} />
              </SettingsSection>

              <SettingsSection
                title={t.appearance}
                description={t.appearance_help}
                icon={<Palette size={18} />}
                isOpen={openSection === 'appearance'}
                onToggle={() => toggleSection('appearance')}
              >
                <div className="pt-5 space-y-4">
                  <div>
                    <label className="block text-xs text-white/50 font-medium mb-2 uppercase tracking-wide">
                      {t.font_family}
                    </label>
                    <p className="text-xs text-white/40 leading-relaxed mb-3">{t.font_family_help}</p>
                    <div className="grid grid-cols-1 gap-3">
                      {fontOptions.map(option => {
                        const selected = option.key === settings.fontFamily

                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setFontFamily(option.key)}
                            className={`rounded-2xl border p-3 text-left transition-all duration-300 ease-out active:scale-95 ${
                              selected
                                ? 'bg-white/15 border-white/35 shadow-lg shadow-black/10'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-black text-white">{option.label}</p>
                                <p className="mt-1 text-xs text-white/45">{option.description}</p>
                              </div>
                              <span className="text-[10px] text-white/45 uppercase tracking-wide">
                                {selected ? t.current_selection : ''}
                              </span>
                            </div>
                            <div
                              className="mt-3 rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white/85"
                              style={{
                                fontFamily: FONT_FAMILY_OPTIONS[option.key],
                              }}
                            >
                              {option.preview}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 font-medium mb-2 uppercase tracking-wide">
                      {t.theme}
                    </label>
                    <p className="text-xs text-white/40 leading-relaxed mb-3">{t.theme_help}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(THEMES).map(([key, theme]) => {
                        const selected = key === themeKey

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setTheme(key as ThemeKey)}
                            className={`rounded-2xl border p-3 text-left transition-all duration-300 ease-out active:scale-95 ${
                              selected
                                ? 'bg-white/15 border-white/35 shadow-lg shadow-black/10'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-black" style={{ color: theme.text }}>{theme.name}</p>
                                <p className="text-xs mt-1" style={{ color: selected ? theme.textSecondary : theme.textMuted }}>
                                  {selected ? t.current_selection : ''}
                                </p>
                              </div>
                              <div className="flex gap-1.5">
                                {[theme.primary, theme.secondary, theme.accent].map((color, idx) => (
                                  <span
                                    key={`${key}-${idx}`}
                                    className="w-4 h-4 rounded-full border border-white/20"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                            </div>
                            <div
                              className="mt-3 h-16 rounded-xl border overflow-hidden"
                              style={{
                                background: theme.background,
                                borderColor: theme.border,
                              }}
                            >
                              <div className="h-full w-full px-3 py-2 flex flex-col justify-between" style={{ background: theme.surface }}>
                                <div className="h-2.5 w-20 rounded-full" style={{ background: theme.primary, opacity: 0.9 }} />
                                <div className="flex gap-1.5">
                                  <span className="h-2 w-14 rounded-full" style={{ background: theme.secondary, opacity: 0.9 }} />
                                  <span className="h-2 w-9 rounded-full" style={{ background: theme.accent, opacity: 0.9 }} />
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-3`}>
                    <p className="text-xs text-white/50 font-medium uppercase tracking-wide">{t.build_version_visibility_title}</p>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
                      <div>
                        <p className="text-xs text-white/70">{t.build_version_visibility_toggle}</p>
                        <p className="text-[11px] text-white/45 mt-1" title={buildVersionTitle}>{buildVersionLabel}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowBuildVersion(!settings.showBuildVersion)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                          settings.showBuildVersion
                            ? 'border-emerald-400/40 bg-emerald-500/25'
                            : 'border-white/20 bg-white/10'
                        }`}
                        aria-pressed={settings.showBuildVersion}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            settings.showBuildVersion ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                </div>
              </SettingsSection>

              <SettingsSection
                title={t.learning}
                description={t.learning_help}
                icon={<Brain size={18} />}
                isOpen={openSection === 'learning'}
                onToggle={() => toggleSection('learning')}
              >
                <div className="pt-5 space-y-5">
                  <div>
                    <label className="block text-xs text-white/50 font-medium mb-3 uppercase tracking-wide">
                      {t.language}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['de', 'en'] as const).map(lang => (
                        <button
                          key={lang}
                          onClick={() => setLanguage(lang)}
                          className={`py-2.5 px-3 rounded-xl font-medium transition-all ${
                            settings.language === lang
                              ? 'bg-white/20 text-white border border-white/40'
                              : 'bg-white/5 text-white/60 hover:text-white/80 border border-white/10'
                          }`}
                        >
                          {lang === 'de' ? t.german : t.english}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 font-medium mb-3 uppercase tracking-wide">
                      {t.study_stack_size}
                    </label>
                    <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-3`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-white/70">
                          <ParameterLabel text={t.study_stack_size} info={t.study_stack_size_info} />
                        </span>
                        <span className="text-xs text-white/60 tabular-nums">{settings.studyCardLimit}</span>
                      </div>
                      <input
                        type="range"
                        min={MIN_STUDY_CARD_LIMIT}
                        max={MAX_STUDY_CARD_LIMIT}
                        step={STUDY_CARD_LIMIT_STEP}
                        value={settings.studyCardLimit}
                        onChange={e => setStudyCardLimit(Number(e.target.value))}
                        className="w-full accent-white"
                      />
                      <p className="text-xs text-white/45">
                        {t.study_weight_hint.replace('{count}', '50')}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 font-medium mb-3 uppercase tracking-wide">
                      {settings.language === 'de' ? 'Shuffle-Modus' : 'Shuffle mode'}
                    </label>
                    <div className={`${UI_TOKENS.surface.panelSoft} p-4`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {settings.language === 'de' ? 'Deck-übergreifendes Lernen anzeigen' : 'Show cross-deck study mode'}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-white/45">
                            {settings.language === 'de'
                              ? 'Blendet Shuffle-Sammlungen, den Verwalten-Shortcut und den Start aus der Home-Ansicht ein oder aus. Laufende Sessions bleiben davon unberührt.'
                              : 'Show or hide shuffle collections, the manage shortcut, and the home entry point. Active sessions are left untouched.'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShuffleModeEnabled(!settings.shuffleModeEnabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                            settings.shuffleModeEnabled
                              ? 'border-emerald-400/40 bg-emerald-500/25'
                              : 'border-white/20 bg-white/10'
                          }`}
                          aria-pressed={settings.shuffleModeEnabled}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              settings.shuffleModeEnabled ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 font-medium mb-3 uppercase tracking-wide">
                      {t.daily_goal_setting}
                    </label>
                    <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-3`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-white/70">{t.daily_goal_label}</span>
                        <span className="text-xs text-white/60 tabular-nums">
                          {settings.dailyGoal === 0 ? '—' : settings.dailyGoal}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        step={5}
                        value={settings.dailyGoal}
                        onChange={e => setDailyGoal(Number(e.target.value))}
                        className="w-full accent-white"
                        aria-label={t.daily_goal_setting}
                      />
                      <p className="text-xs text-white/45">{t.daily_goal_setting_help}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 font-medium mb-3 uppercase tracking-wide">
                      {t.algorithm}
                    </label>
                    <div className="space-y-2">
                      {(['fsrs', 'sm2'] as const).map(algo => (
                        <button
                          key={algo}
                          onClick={() => setAlgorithm(algo)}
                          disabled={isAlgorithmMigrating}
                          className={`w-full text-left py-3 px-4 rounded-xl border transition-all ${
                            settings.algorithm === algo
                              ? 'bg-white/20 border-white/40'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          } ${isAlgorithmMigrating ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <div className="font-medium text-white">
                            {algo === 'sm2' ? t.sm2 : t.fsrs}
                          </div>
                          <div className="text-xs text-white/50 mt-1">
                            {algo === 'sm2' ? t.about_sm2 : t.about_fsrs}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-3`}>
                    <p className="text-xs text-white/50 font-medium uppercase tracking-wide">
                      Algorithm Parameters (Beta)
                    </p>
                    <p className="text-xs text-white/40 leading-relaxed">
                      {settings.algorithm === 'sm2' ? t.algorithm_params_hint_sm2 : t.algorithm_params_hint_fsrs}
                    </p>

                    {settings.algorithm === 'sm2' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="text-xs text-white/65">
                          <ParameterLabel text="Hard Multiplier" info={t.param_hard_multiplier_info} />
                          <input
                            type="number"
                            step="0.05"
                            value={settings.algorithmParams.sm2.hardMultiplier}
                            onChange={e => updateNumber(e.target.value, value => setSm2Params({ hardMultiplier: value }))}
                            className="mt-1 w-full rounded-lg bg-black/50 border border-white/15 px-2 py-1.5 text-white"
                          />
                        </label>
                        <label className="text-xs text-white/65">
                          <ParameterLabel text="Easy Multiplier" info={t.param_easy_multiplier_info} />
                          <input
                            type="number"
                            step="0.05"
                            value={settings.algorithmParams.sm2.easyMultiplier}
                            onChange={e => updateNumber(e.target.value, value => setSm2Params({ easyMultiplier: value }))}
                            className="mt-1 w-full rounded-lg bg-black/50 border border-white/15 px-2 py-1.5 text-white"
                          />
                        </label>
                        <label className="text-xs text-white/65">
                          <ParameterLabel text="Ease Again" info={t.param_ease_again_info} />
                          <input
                            type="number"
                            step="10"
                            value={settings.algorithmParams.sm2.easeAgain}
                            onChange={e => updateNumber(e.target.value, value => setSm2Params({ easeAgain: value }))}
                            className="mt-1 w-full rounded-lg bg-black/50 border border-white/15 px-2 py-1.5 text-white"
                          />
                        </label>
                        <label className="text-xs text-white/65">
                          <ParameterLabel text="Ease Easy" info={t.param_ease_easy_info} />
                          <input
                            type="number"
                            step="10"
                            value={settings.algorithmParams.sm2.easeEasy}
                            onChange={e => updateNumber(e.target.value, value => setSm2Params({ easeEasy: value }))}
                            className="mt-1 w-full rounded-lg bg-black/50 border border-white/15 px-2 py-1.5 text-white"
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="text-xs text-white/65">
                          <ParameterLabel text="Request Retention" info={t.param_request_retention_info} />
                          <input
                            type="number"
                            step="0.01"
                            value={settings.algorithmParams.fsrs.requestRetention}
                            onChange={e => updateNumber(e.target.value, value => setFsrsParams({ requestRetention: value }))}
                            className="mt-1 w-full rounded-lg bg-black/50 border border-white/15 px-2 py-1.5 text-white"
                          />
                        </label>
                        <label className="text-xs text-white/65">
                          <ParameterLabel text="Hard Penalty" info={t.param_hard_penalty_info} />
                          <input
                            type="number"
                            step="0.05"
                            value={settings.algorithmParams.fsrs.hardPen}
                            onChange={e => updateNumber(e.target.value, value => setFsrsParams({ hardPen: value }))}
                            className="mt-1 w-full rounded-lg bg-black/50 border border-white/15 px-2 py-1.5 text-white"
                          />
                        </label>
                        <label className="text-xs text-white/65">
                          <ParameterLabel text="Easy Bonus" info={t.param_easy_bonus_info} />
                          <input
                            type="number"
                            step="0.05"
                            value={settings.algorithmParams.fsrs.easyBonus}
                            onChange={e => updateNumber(e.target.value, value => setFsrsParams({ easyBonus: value }))}
                            className="mt-1 w-full rounded-lg bg-black/50 border border-white/15 px-2 py-1.5 text-white"
                          />
                        </label>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={resetAlgorithmParams}
                      className={`w-full ${UI_TOKENS.button.ghost} py-2`}
                    >
                      Reset Algorithm Parameters
                    </button>
                  </div>

                  <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-2`}>
                    <p className="text-xs text-white/50 font-medium uppercase tracking-wide">
                      <span className="inline-flex items-center gap-2">
                        <RefreshCw size={12} />
                        {t.migration_section_title}
                      </span>
                    </p>
                    <p className="text-xs text-white/40 leading-relaxed">
                      {t.migration_section_description}
                    </p>
                  </div>

                </div>
              </SettingsSection>

              <SettingsSection
                title={t.notifications}
                description={t.notifications_help}
                icon={<Bell size={18} />}
                isOpen={openSection === 'notifications'}
                onToggle={() => toggleSection('notifications')}
              >
                <div className="pt-5 space-y-4">
                  <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-3`}>
                    <p className="text-xs text-white/50 font-medium uppercase tracking-wide">{t.sw_notifications_title}</p>
                    <p className="text-xs text-white/40 leading-relaxed">{t.sw_notifications_description}</p>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
                      <span className="text-xs text-white/70">{t.sw_notifications_toggle_label}</span>
                      <button
                        type="button"
                        onClick={() => applySwNotificationsEnabled(!settings.notificationsEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                          settings.notificationsEnabled
                            ? 'border-emerald-400/40 bg-emerald-500/25'
                            : 'border-white/20 bg-white/10'
                        }`}
                        aria-pressed={settings.notificationsEnabled}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            settings.notificationsEnabled ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {notificationChannels.map(channel => {
                    const channelConfig = settings.notificationChannels[channel.key]
                    const channelEnabled = channel.key === 'dailyReminder' ? settings.dailyReminderEnabled : channelConfig.enabled

                    return (
                      <div key={channel.key} className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-3`}>
                        <p className="text-xs text-white/50 font-medium uppercase tracking-wide">{channel.label}</p>
                        <p className="text-xs text-white/40 leading-relaxed">{channel.description}</p>

                        {channel.key === 'dailyReminder' && isIosRuntime && (
                          <p className="text-[11px] text-amber-200/90 leading-relaxed rounded-lg border border-amber-300/20 bg-amber-500/10 p-2.5">
                            {t.daily_reminder_ios_install_hint}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
                          <span className="text-xs text-white/70">{t.notification_channel_toggle_label}</span>
                          <button
                            type="button"
                            onClick={() => { void applyNotificationChannelEnabled(channel.key, !channelEnabled) }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                              channelEnabled
                                ? 'border-emerald-400/40 bg-emerald-500/25'
                                : 'border-white/20 bg-white/10'
                            }`}
                            aria-pressed={channelEnabled}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                channelEnabled ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        {channel.key === 'dailyReminder' && (
                          <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
                            <label className="block text-xs text-white/70 uppercase tracking-wide">{t.daily_reminder_time_label}</label>
                            <input
                              type="time"
                              value={settings.dailyReminderTime}
                              onChange={e => { void applyDailyReminderTime(e.target.value) }}
                              className="w-full rounded-lg bg-black/50 border border-white/15 px-2 py-1.5 text-white"
                              disabled={!channelEnabled}
                            />
                          </div>
                        )}

                        <details className="group rounded-xl border border-white/10 bg-black/25 p-3">
                          <summary className="cursor-pointer list-none text-xs font-medium uppercase tracking-wide text-white/55 transition hover:text-white/80">
                            {settings.language === 'de' ? 'Vorlage bearbeiten' : 'Edit template'}
                            <span className="ml-2 text-white/30 group-open:hidden">+</span>
                            <span className="ml-2 hidden text-white/30 group-open:inline">-</span>
                          </summary>
                          <div className="mt-3 space-y-3">
                            <div className="space-y-2">
                              <label className="block text-xs text-white/65 uppercase tracking-wide">{t.notification_template_title_label}</label>
                              <input
                                type="text"
                                maxLength={120}
                                value={channelConfig.title}
                                onChange={e => applyNotificationTemplate(channel.key, e.target.value, channelConfig.body)}
                                placeholder={channel.defaultTitle}
                                className="w-full rounded-lg bg-black/50 border border-white/15 px-2 py-1.5 text-white"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs text-white/65 uppercase tracking-wide">{t.notification_template_body_label}</label>
                              <textarea
                                rows={2}
                                maxLength={280}
                                value={channelConfig.body}
                                onChange={e => applyNotificationTemplate(channel.key, channelConfig.title, e.target.value)}
                                placeholder={channel.defaultBody}
                                className="w-full rounded-lg bg-black/50 border border-white/15 px-2 py-1.5 text-white resize-y"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => resetNotificationTemplate(channel.key)}
                              className={`${UI_TOKENS.button.ghost} py-2`}
                            >
                              {t.notification_template_reset}
                            </button>
                          </div>
                        </details>
                      </div>
                    )
                  })}
                </div>
              </SettingsSection>

              <SettingsSection
                title={t.diagnostics}
                description={t.diagnostics_help}
                icon={<Bug size={18} />}
                isOpen={openSection === 'diagnostics'}
                onToggle={() => toggleSection('diagnostics')}
              >
                <div className="pt-5 space-y-4">

                  <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-3`}>
                    <p className="text-xs text-white/50 font-medium uppercase tracking-wide">Optional Sync Auth Token</p>
                    <p className="text-xs text-white/40 leading-relaxed">
                      Optionales Feature: Wenn gesetzt, wird der Token als Bearer-Header bei Sync-Requests gesendet. Leer lassen deaktiviert Auth-Header.
                    </p>
                    <input
                      type="password"
                      autoComplete="off"
                      value={syncAuthToken}
                      onChange={event => handleSyncAuthTokenChange(event.target.value)}
                      placeholder="Leer = kein Token"
                      className="w-full rounded-lg bg-black/50 border border-white/15 px-2 py-1.5 text-white"
                    />
                  </div>

                  <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-2`}>
                    <p className="text-xs text-white/50 font-medium uppercase tracking-wide">
                      Algorithm Diagnostics
                    </p>
                    <p className="text-xs text-white/40 leading-relaxed">
                      Persistenz-Checks aus Dev-Reviews: {diagnostics.length} Ereignis(se).
                    </p>
                    {diagnostics.length > 0 && (
                      <p className="text-xs text-amber-300/90 leading-relaxed">
                        Letzter Eintrag: Karte {diagnostics[diagnostics.length - 1]?.cardId},
                        Mismatches {diagnostics[diagnostics.length - 1]?.mismatches.length}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        clearAlgorithmDiagnostics()
                        setDiagnostics([])
                      }}
                      className={`w-full ${UI_TOKENS.button.ghost} py-2`}
                    >
                      Clear Diagnostics
                    </button>
                  </div>

                  <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-3`}>
                    <p className="text-xs text-white/50 font-medium uppercase tracking-wide">
                      <span className="inline-flex items-center gap-2">
                        <Bell size={12} />
                        {t.notification_test_title}
                      </span>
                    </p>
                    <p className="text-xs text-white/40 leading-relaxed">
                      {t.notification_test_description}
                    </p>
                    <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-white/60 uppercase tracking-wide">{t.notification_test_permission_label}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium border ${
                          notificationPermission === 'granted'
                            ? 'border-emerald-500/35 text-emerald-200 bg-emerald-500/10'
                            : notificationPermission === 'denied'
                              ? 'border-rose-500/35 text-rose-200 bg-rose-500/10'
                              : 'border-white/15 text-white/70 bg-white/5'
                        }`}>
                          {notificationPermissionLabel}
                        </span>
                      </div>
                      <p className="text-xs text-white/45 leading-relaxed">
                        {notificationPermission === 'granted'
                          ? t.notification_test_permission_granted_help
                          : notificationPermission === 'denied'
                            ? t.notification_test_permission_denied_help
                            : notificationPermission === 'unsupported'
                              ? t.notification_test_permission_unsupported_help
                              : t.notification_test_permission_default_help}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => { void requestNotificationPermission() }}
                          className={`${UI_TOKENS.button.ghost} py-2`}
                        >
                          {t.notification_test_request_permission}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotificationPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)}
                          className={`${UI_TOKENS.button.ghost} py-2`}
                        >
                          {t.notification_test_refresh_permission}
                        </button>
                      </div>
                      <p className="text-[11px] text-white/40 leading-relaxed">
                        {t.notification_test_ios_hint}
                      </p>
                    </div>

                    {notificationTestStatus && (
                      <p className="text-xs text-amber-300/90 leading-relaxed">{notificationTestStatus}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { void triggerPushTest() }}
                        className={`${UI_TOKENS.button.ghost} py-2`}
                      >
                        {t.notification_test_push_button}
                      </button>
                      <button
                        type="button"
                        onClick={() => { void triggerServerStatusTest(false) }}
                        className={`${UI_TOKENS.button.ghost} py-2`}
                      >
                        {t.notification_test_offline_button}
                      </button>
                      <button
                        type="button"
                        onClick={() => { void triggerServerStatusTest(true) }}
                        className={`${UI_TOKENS.button.ghost} py-2`}
                      >
                        {t.notification_test_online_button}
                      </button>
                    </div>
                  </div>

                  <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-3`}>
                    <p className="text-xs text-white/50 font-medium uppercase tracking-wide">
                      {t.error_log_title}
                    </p>
                    <p className="text-xs text-white/40 leading-relaxed">
                      {t.error_log_count.replace('{count}', String(errorLogs.length))}
                    </p>

                    {errorLogs.length > 0 && (
                      <div className="max-h-36 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-2 space-y-2">
                        {errorLogs.slice(0, 5).map(entry => (
                          <div key={entry.id} className="text-[11px] text-white/70 leading-relaxed">
                            <p className="text-white/90">{new Date(entry.timestamp).toLocaleString()} · {entry.source}</p>
                            <p className="text-white/60 truncate">{entry.message}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={downloadErrorLogsAsTxt}
                        disabled={errorLogs.length === 0}
                        className={`${UI_TOKENS.button.ghost} py-2 disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {t.error_log_export}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearErrorLogs()
                          setErrorLogs([])
                        }}
                        disabled={errorLogs.length === 0}
                        className={`${UI_TOKENS.button.ghost} py-2 disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {t.error_log_clear}
                      </button>
                    </div>
                  </div>

                  <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-3`}>
                    <p className="text-xs text-white/50 font-medium uppercase tracking-wide">{t.indexeddb_reset_title}</p>
                    <p className="text-xs text-white/40 leading-relaxed">{t.indexeddb_reset_description}</p>
                    <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 space-y-2">
                      <p className="text-xs font-semibold text-rose-100">{t.pwa_full_reset_title}</p>
                      <p className="text-xs text-rose-100/70 leading-relaxed">{t.pwa_full_reset_description}</p>
                      <button
                        type="button"
                        onClick={() => { void resetEntirePwaState() }}
                        className={`${UI_TOKENS.button.ghost} w-full py-2 border-rose-400/40 text-rose-100 hover:text-white hover:bg-rose-500/15`}
                      >
                        {t.pwa_full_reset_action}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => { void resetLocalIndexedDb() }}
                      className={`${UI_TOKENS.button.ghost} py-2 border-rose-400/30 text-rose-200 hover:text-rose-100`}
                    >
                      {t.indexeddb_reset_action}
                    </button>
                    <button
                      type="button"
                      onClick={() => { void resetServiceWorkerState() }}
                      className={`${UI_TOKENS.button.ghost} py-2 border-amber-300/30 text-amber-100 hover:text-amber-50`}
                    >
                      {t.service_worker_reset_action}
                    </button>
                    <p className="text-xs text-white/40 leading-relaxed">{t.normalize_due_dates_description}</p>
                    <button
                      type="button"
                      onClick={() => { void runNormalizeDueDates() }}
                      className={`${UI_TOKENS.button.ghost} py-2 border-sky-400/30 text-sky-200 hover:text-sky-100`}
                    >
                      {t.normalize_due_dates_action}
                    </button>
                    {localDataStatus && <p className="text-xs text-amber-300/90 leading-relaxed">{localDataStatus}</p>}
                  </div>
                </div>
              </SettingsSection>

            </div>

            {/* Footer */}
            <div className="sticky bottom-0 px-5 py-4 pb-safe-4 border-t border-zinc-900 flex gap-3 bg-[#050505]/95 backdrop-blur-xl">
              <button
                onClick={onClose}
                className={`${UI_TOKENS.button.footerSecondary} text-sm font-medium hover:bg-white/5`}
              >
                {t.close}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <ConfirmModal
        isOpen={confirmModal !== null}
        title={confirmModal?.title ?? ''}
        message={confirmModal?.message ?? ''}
        confirmLabel={confirmModal?.confirmLabel}
        variant={confirmModal?.variant}
        onConfirm={() => {
          confirmModal?.onConfirm()
          setConfirmModal(null)
        }}
        onCancel={() => setConfirmModal(null)}
      />
    </AnimatePresence>
  )
}
