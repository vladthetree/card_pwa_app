/**
 * AI_CONTEXT:
 * Role: Settings domain subcomponent — Notifications & App accordion (service-worker
 * notifications toggle, per-channel enable/template editing, daily reminder time).
 * Used by: SettingsModal.
 * Important: notificationPermission/notificationTestStatus are owned by the parent
 * (not local state here) so they survive category switches. Notification tests
 * remain here as part of the same user-facing workflow.
 */
import { Bell } from 'lucide-react'
import {
  useSettings,
  STRINGS,
  type NotificationChannelKey,
} from '../../contexts/SettingsContext'
import { UI_TOKENS } from '../../constants/ui'
import { subscribeToWebPushNotificationsWithStatus, type WebPushSubscribeStatus } from '../../services/webPush'
import { SettingsSection } from '../SettingsSection'
import { SettingsSwitchRow } from '../SettingsSwitchRow'
import { useNotificationPermissionFlow } from './useNotificationPermissionFlow'

interface Props {
  isOpen: boolean
  onToggle: () => void
  presentation?: 'accordion' | 'panel'
  notificationPermission: NotificationPermission | 'unsupported'
  setNotificationPermission: (permission: NotificationPermission | 'unsupported') => void
  notificationTestStatus: string | null
  setNotificationTestStatus: (status: string | null) => void
}

function mapWebPushStatusToText(status: WebPushSubscribeStatus, strings: Record<string, string>) {
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

export function SettingsNotificationsSection({
  isOpen,
  onToggle,
  presentation,
  notificationPermission,
  setNotificationPermission,
  notificationTestStatus,
  setNotificationTestStatus,
}: Props) {
  const {
    settings,
    setNotificationsEnabled,
    setNotificationChannelEnabled,
    setNotificationChannelTemplate,
    setDailyReminderEnabled,
    setDailyReminderTime,
  } = useSettings()
  const t = STRINGS[settings.language]
  const isDE = settings.language === 'de'
  const isIosRuntime = typeof window !== 'undefined' && /iphone|ipad|ipod/i.test(window.navigator.userAgent)
  const { requestNotificationPermission, ensureNotificationPermission, postServiceWorkerMessage } =
    useNotificationPermissionFlow({ setNotificationPermission, setNotificationTestStatus })

  const notificationPermissionLabel = notificationPermission === 'granted'
    ? t.notification_test_permission_granted_label
    : notificationPermission === 'denied'
      ? t.notification_test_permission_denied_label
      : notificationPermission === 'default'
        ? t.notification_test_permission_default_label
        : t.notification_test_permission_unsupported_label

  const triggerServerStatusTest = async (connected: boolean) => {
    const hasPermission = await ensureNotificationPermission()
    if (!hasPermission) return
    const ok = await postServiceWorkerMessage({
      type: 'SERVER_STATUS_NOTIFICATION',
      title: connected ? t.notification_test_online_title : t.notification_test_offline_title,
      body: connected ? t.notification_test_online_body : t.notification_test_offline_body,
      connected,
    })
    if (ok) setNotificationTestStatus(connected ? t.notification_test_online_sent : t.notification_test_offline_sent)
  }

  const triggerPushTest = async () => {
    const hasPermission = await ensureNotificationPermission()
    if (!hasPermission) return
    const ok = await postServiceWorkerMessage({
      type: 'TEST_PUSH_NOTIFICATION',
      language: settings.language,
      title: t.notification_test_push_title,
      body: t.notification_test_push_body,
      tag: 'card-pwa-test-push',
      url: '/?view=study',
    })
    if (ok) setNotificationTestStatus(t.notification_test_push_sent)
  }

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
      defaultTitle: isDE ? 'Tagesimpuls' : 'Daily study cue',
      defaultBody: isDE
        ? 'Eine kurze Session reicht: waehle eine Karte, die heute wirklich haengen bleiben soll.'
        : 'One short session is enough: choose one card that should actually stick today.',
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

  return (
    <SettingsSection
      title={settings.language === 'de' ? 'Benachrichtigungen & App' : 'Notifications & app'}
      description={settings.language === 'de' ? 'Reminder, Kanäle und Service-Worker-Updates.' : 'Reminders, channels, and service worker updates.'}
      icon={<Bell size={18} />}
      isOpen={isOpen}
      onToggle={onToggle}
      presentation={presentation}
    >
      <div className="pt-5 space-y-4">
        <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-3`}>
          <p className="text-xs text-white/50 font-medium uppercase tracking-wide">{t.sw_notifications_title}</p>
          <p className="text-xs text-white/40 leading-relaxed">{t.sw_notifications_description}</p>
          <SettingsSwitchRow
            label={t.sw_notifications_toggle_label}
            checked={settings.notificationsEnabled}
            onCheckedChange={applySwNotificationsEnabled}
          />
        </div>

        <details className="group/channels">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-ds-xl border border-[#18181b] bg-[#080808] px-3 py-3 text-left transition hover:bg-white/[0.035]">
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-white/60">
                {settings.language === 'de' ? 'Kanäle & Vorlagen' : 'Channels & templates'}
              </span>
              <span className="mt-1 block text-xs text-white/40">
                {settings.language === 'de'
                  ? 'Reminder, Statusmeldungen und Textvorlagen nur bei Bedarf öffnen.'
                  : 'Open reminders, status alerts, and templates only when needed.'}
              </span>
            </span>
            <span className="text-lg leading-none text-white/30 group-open/channels:hidden">+</span>
            <span className="hidden text-lg leading-none text-white/30 group-open/channels:inline">-</span>
          </summary>

          <div className="mt-3 space-y-3">
            {notificationChannels.map(channel => {
              const channelConfig = settings.notificationChannels[channel.key]
              const channelEnabled = channel.key === 'dailyReminder' ? settings.dailyReminderEnabled : channelConfig.enabled

              return (
                <div key={channel.key} className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-3`}>
                  <p className="text-xs text-white/50 font-medium uppercase tracking-wide">{channel.label}</p>
                  <p className="text-xs text-white/40 leading-relaxed">{channel.description}</p>

                  {channel.key === 'dailyReminder' && isIosRuntime && (
                    <p className="text-[11px] text-amber-200/90 leading-relaxed rounded-ds border border-amber-300/20 bg-amber-500/10 p-2.5">
                      {t.daily_reminder_ios_install_hint}
                    </p>
                  )}

                  <SettingsSwitchRow
                    label={t.notification_channel_toggle_label}
                    checked={channelEnabled}
                    onCheckedChange={next => applyNotificationChannelEnabled(channel.key, next)}
                  />

                  {channel.key === 'dailyReminder' && (
                    <div className="rounded-ds-xl border border-[#18181b] bg-[#0c0c0c] p-3 space-y-2">
                      <label className="block text-xs text-white/70 uppercase tracking-wide">{t.daily_reminder_time_label}</label>
                      <input
                        type="time"
                        value={settings.dailyReminderTime}
                        onChange={e => { void applyDailyReminderTime(e.target.value) }}
                        className="w-full rounded-ds bg-[#0a0a0a] border border-[#18181b] px-2 py-1.5 text-white"
                        disabled={!channelEnabled}
                      />
                    </div>
                  )}

                  <details className="group/template rounded-ds-xl border border-[#18181b] bg-[#0a0a0a] p-3">
                    <summary className="cursor-pointer list-none text-xs font-medium uppercase tracking-wide text-white/55 transition hover:text-white/80">
                      {settings.language === 'de' ? 'Vorlage bearbeiten' : 'Edit template'}
                      <span className="ml-2 text-white/30 group-open/template:hidden">+</span>
                      <span className="ml-2 hidden text-white/30 group-open/template:inline">-</span>
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
                          className="w-full rounded-ds bg-[#0a0a0a] border border-[#18181b] px-2 py-1.5 text-white"
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
                          className="w-full rounded-ds bg-[#0a0a0a] border border-[#18181b] px-2 py-1.5 text-white resize-y"
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
        </details>

        <details className="group/test rounded-ds-xl border border-[#18181b] bg-[#080808] p-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left">
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-white/60">{t.notification_test_title}</span>
              <span className="mt-1 block text-xs text-white/40">{t.notification_test_description}</span>
            </span>
            <span className="text-lg leading-none text-white/30 group-open/test:hidden">+</span>
            <span className="hidden text-lg leading-none text-white/30 group-open/test:inline">−</span>
          </summary>
          <div className="mt-3 space-y-3 border-t border-[#18181b] pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-white/55">{t.notification_test_permission_label}</span>
              <span className="rounded-full border border-[#27272a] px-2.5 py-1 text-[11px] text-white/75">{notificationPermissionLabel}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => { void requestNotificationPermission() }} className={`${UI_TOKENS.button.ghost} py-2`}>
                {t.notification_test_request_permission}
              </button>
              <button type="button" onClick={() => setNotificationPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)} className={`${UI_TOKENS.button.ghost} py-2`}>
                {t.notification_test_refresh_permission}
              </button>
              <button type="button" onClick={() => { void triggerPushTest() }} className={`${UI_TOKENS.button.ghost} py-2`}>
                {t.notification_test_push_button}
              </button>
              <button type="button" onClick={() => { void triggerServerStatusTest(false) }} className={`${UI_TOKENS.button.ghost} py-2`}>
                {t.notification_test_offline_button}
              </button>
              <button type="button" onClick={() => { void triggerServerStatusTest(true) }} className={`${UI_TOKENS.button.ghost} py-2 sm:col-span-2`}>
                {t.notification_test_online_button}
              </button>
            </div>
            {notificationTestStatus && <p className="text-xs text-amber-300/90" role="status">{notificationTestStatus}</p>}
          </div>
        </details>
      </div>
    </SettingsSection>
  )
}
