import { Bell, Download, HardDrive, HelpCircle, Settings as SettingsIcon } from 'lucide-react'
import PWA_Logo from '../../assets/Logo.svg'
import { APP_NAME } from '../../constants/appIdentity'
import { UI_TOKENS } from '../../constants/ui'
import StreakBadge from '../StreakBadge'
import DailyGoalRing from '../DailyGoalRing'

interface Props {
  t: Record<string, string>
  language: 'de' | 'en'
  canInstall: boolean
  isInstalled: boolean
  isInstalling: boolean
  isConnected: boolean
  notificationPermission: NotificationPermission | 'unsupported'
  storageEstimateUnavailable: boolean
  storageUsedBytes: number | null
  storageQuotaBytes: number | null
  onInstall: () => void
  onRequestNotificationPermission: () => void
  onShowSettings: () => void
  onShowFaq: () => void
}

export function HomeHeaderBar({
  t,
  language,
  canInstall,
  isInstalled,
  isInstalling,
  isConnected,
  notificationPermission,
  storageEstimateUnavailable,
  storageUsedBytes,
  storageQuotaBytes,
  onInstall,
  onRequestNotificationPermission,
  onShowSettings,
  onShowFaq,
}: Props) {
  return (
    <div className={UI_TOKENS.header.row}>
      <div className={UI_TOKENS.header.brand}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/70 p-1.5 sm:h-10 sm:w-10 sm:rounded-md">
          <img src={PWA_Logo} alt={APP_NAME} className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-base font-black font-mono uppercase tracking-[0.16em] text-white sm:text-2xl sm:tracking-[0.22em]">{APP_NAME}</h1>
          <div className="mt-0.5 flex items-center gap-1.5 sm:hidden">
            <span
              className={`server-status-lamp ${isConnected ? 'server-status-lamp--connected' : 'server-status-lamp--disconnected'}`}
              aria-hidden="true"
            />
            <span className="text-[10px] uppercase tracking-[0.12em] text-white/45">
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <DailyGoalRing size={30} strokeWidth={3} />
        <StreakBadge />
        {canInstall && !isInstalled && (
          <button
            onClick={onInstall}
            disabled={isInstalling}
            className={`${UI_TOKENS.button.iconGhost} relative min-h-9 min-w-9 justify-center px-2 disabled:opacity-70 sm:min-h-0 sm:min-w-0 sm:justify-start sm:px-3`}
            title={t.install}
            aria-label={t.install}
          >
            {isInstalling ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download size={14} />
            )}
            <span className="text-sm hidden sm:inline">{t.install}</span>
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 sm:static sm:h-2 sm:w-2" aria-hidden="true" />
            <span className="text-xs hidden lg:inline text-white/70">{t.install_status_not_installed}</span>
          </button>
        )}

        <div
          className="hidden items-center gap-2 px-1 sm:flex"
          title={isConnected
            ? (language === 'de' ? 'Sync-Server verbunden' : 'Sync server connected')
            : (language === 'de' ? 'Sync-Server nicht erreichbar' : 'Sync server unreachable')}
          aria-label={isConnected
            ? (language === 'de' ? 'Sync-Server verbunden' : 'Sync server connected')
            : (language === 'de' ? 'Sync-Server nicht erreichbar' : 'Sync server unreachable')}
        >
          <span
            className={`server-status-lamp ${isConnected ? 'server-status-lamp--connected' : 'server-status-lamp--disconnected'}`}
            aria-hidden="true"
          />
          <span className="text-xs hidden sm:inline text-white/70">
            {isConnected
              ? (language === 'de' ? 'Server online' : 'Server online')
              : (language === 'de' ? 'Server offline' : 'Server offline')}
          </span>
        </div>

        {!storageEstimateUnavailable && storageQuotaBytes && storageQuotaBytes > 0 && (
          <div
            className="hidden items-center gap-1.5 px-1 min-[380px]:flex"
            title={storageUsedBytes !== null && storageQuotaBytes !== null
              ? `${t.stats_storage_used}: ${(storageUsedBytes / 1024 / 1024).toFixed(1)} MB / ${(storageQuotaBytes / 1024 / 1024).toFixed(1)} MB`
              : t.stats_storage_unavailable}
          >
            <HardDrive size={13} className="text-white/50" />
            <span className="hidden md:inline text-[10px] font-mono uppercase tracking-wider text-white/50">
              {storageUsedBytes !== null && storageQuotaBytes > 0
                ? `${Math.round((storageUsedBytes / storageQuotaBytes) * 100)}%`
                : '--'}
            </span>
            <span className="md:hidden text-[10px] font-mono uppercase tracking-wider text-white/50">
              {storageUsedBytes !== null && storageQuotaBytes > 0
                ? `${Math.round((storageUsedBytes / storageQuotaBytes) * 100)}%`
                : '--'}
            </span>
          </div>
        )}

        {notificationPermission === 'default' && (
          <button
            onClick={onRequestNotificationPermission}
            className={`${UI_TOKENS.button.iconGhost} min-h-9 min-w-9 justify-center px-2 sm:min-h-0 sm:min-w-0 sm:justify-start sm:px-3`}
            title={language === 'de' ? 'Benachrichtigungen erlauben' : 'Enable notifications'}
            aria-label={language === 'de' ? 'Benachrichtigungen erlauben' : 'Enable notifications'}
          >
            <Bell size={14} />
            <span className="text-sm hidden sm:inline">
              {language === 'de' ? 'Hinweise' : 'Alerts'}
            </span>
          </button>
        )}

        <button
          onClick={onShowSettings}
          className={`${UI_TOKENS.button.iconGhost} min-h-9 min-w-9 justify-center px-2 sm:min-h-0 sm:min-w-0 sm:justify-start sm:px-3`}
          title={t.settings}
          aria-label={t.settings}
        >
          <SettingsIcon size={14} />
          <span className="text-sm hidden sm:inline">{t.settings}</span>
        </button>

        <button
          onClick={onShowFaq}
          className={`${UI_TOKENS.button.iconGhost} min-h-9 min-w-9 justify-center px-2 sm:min-h-0 sm:min-w-0 sm:justify-start sm:px-3`}
          title={t.faq}
          aria-label={t.faq}
        >
          <HelpCircle size={14} />
          <span className="text-sm hidden sm:inline">{t.faq}</span>
        </button>
      </div>
    </div>
  )
}
