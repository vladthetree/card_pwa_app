/**
 * AI_CONTEXT:
 * Role: Settings domain subcomponent — Data & maintenance accordion (import/export,
 * optional sync auth token, algorithm diagnostics, manual notification test, error
 * log, video/learning-progress resets, IndexedDB reset, and due-date normalization).
 * Used by: SettingsModal.
 * Important: the destructive "PWA full reset" button lives in the separate
 * SettingsPwaFullReset component, not here — do not re-inline its DB-wiping logic.
 * diagnostics/errorLogs/notificationPermission/*Status are owned by the parent (not
 * local state here) so they survive this accordion section collapsing.
 */
import { useEffect, useState } from 'react'
import { Database, Download, Upload } from 'lucide-react'
import { useSettings, STRINGS } from '../../contexts/SettingsContext'
import {
  normalizeDueDates,
  resetLearningProgress,
  clearAlgorithmDiagnostics,
  type AlgorithmDiagnosticsEntry,
} from '../../db/queries'
import { clearErrorLogs, downloadErrorLogsAsTxt, type ErrorLogEntry } from '../../services/errorLog'
import { UI_TOKENS } from '../../constants/ui'
import { STORAGE_KEYS } from '../../constants/appIdentity'
import {
  clearSyncQueue,
  getSyncQueueDiagnostics,
  releaseDeadLetterSyncQueue,
  wakeDeferredSyncQueue,
  type SyncQueueDiagnostics,
} from '../../services/syncQueue'
import { resetSyncPullState } from '../../services/syncPull'
import { readSyncAuthTokenFromSettings, writeSyncAuthTokenToSettings } from '../../services/syncConfig'
import { resetLocalStudyDataForProfileSwitch } from '../../services/profileService'
import { clearVideoProgress } from '../../hooks/useMesserVideoProgress'
import { exportDbBackupAsCsv, exportDbBackupAsJson, exportDbBackupAsTxt } from '../../utils/dbBackup'
import { unregisterAppServiceWorkers, deleteAppCaches } from './settingsResetHelpers'
import { useNotificationPermissionFlow } from './useNotificationPermissionFlow'
import { SettingsSection } from '../SettingsSection'
import { SettingsPwaFullReset } from './SettingsPwaFullReset'

interface ConfirmModalRequest {
  title: string
  message: string
  confirmLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
}

interface Props {
  isOpen: boolean
  onToggle: () => void
  diagnostics: AlgorithmDiagnosticsEntry[]
  setDiagnostics: (entries: AlgorithmDiagnosticsEntry[]) => void
  errorLogs: ErrorLogEntry[]
  setErrorLogs: (entries: ErrorLogEntry[]) => void
  dataExportStatus: string | null
  setDataExportStatus: (status: string | null) => void
  localDataStatus: string | null
  setLocalDataStatus: (status: string | null) => void
  notificationPermission: NotificationPermission | 'unsupported'
  setNotificationPermission: (permission: NotificationPermission | 'unsupported') => void
  notificationTestStatus: string | null
  setNotificationTestStatus: (status: string | null) => void
  setConfirmModal: (request: ConfirmModalRequest | null) => void
  onOpenImportModal: () => void
}

export function SettingsDataSection({
  isOpen,
  onToggle,
  diagnostics,
  setDiagnostics,
  errorLogs,
  setErrorLogs,
  dataExportStatus,
  setDataExportStatus,
  localDataStatus,
  setLocalDataStatus,
  notificationPermission,
  setNotificationPermission,
  notificationTestStatus,
  setNotificationTestStatus,
  setConfirmModal,
  onOpenImportModal,
}: Props) {
  const { settings, profile } = useSettings()
  const t = STRINGS[settings.language]
  const isDE = settings.language === 'de'
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

  const [syncAuthToken, setSyncAuthToken] = useState(() => readSyncAuthTokenFromSettings())
  const [syncQueueDiagnostics, setSyncQueueDiagnostics] = useState<SyncQueueDiagnostics | null>(null)
  const [syncQueueStatus, setSyncQueueStatus] = useState<string | null>(null)

  const refreshSyncQueueDiagnostics = async () => {
    try {
      setSyncQueueDiagnostics(await getSyncQueueDiagnostics())
    } catch {
      setSyncQueueDiagnostics(null)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    void refreshSyncQueueDiagnostics()
  }, [isOpen])

  const handleSyncAuthTokenChange = (value: string) => {
    setSyncAuthToken(value)
    writeSyncAuthTokenToSettings(value)
  }

  const releaseSyncRetries = async () => {
    setSyncQueueStatus(null)
    try {
      await wakeDeferredSyncQueue()
      const released = await releaseDeadLetterSyncQueue()
      await refreshSyncQueueDiagnostics()
      setSyncQueueStatus(isDE
        ? `Retry freigegeben (${released} Dead-Letter Ops).`
        : `Retry released (${released} dead-letter ops).`)
    } catch {
      setSyncQueueStatus(isDE ? 'Retry-Freigabe fehlgeschlagen.' : 'Retry release failed.')
    }
  }

  const confirmClearSyncQueue = () => {
    setConfirmModal({
      title: isDE ? 'Sync-Queue leeren' : 'Clear sync queue',
      message: isDE
        ? 'Alle lokalen ausstehenden Sync-Operationen inklusive Dead-Letter und Outbox werden gelöscht. Nicht synchronisierte Änderungen können dadurch auf anderen Geräten fehlen.'
        : 'All local pending sync operations including dead-letter and outbox entries will be deleted. Unsynced changes may be missing on other devices.',
      confirmLabel: isDE ? 'Queue leeren' : 'Clear queue',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await clearSyncQueue()
          await refreshSyncQueueDiagnostics()
          setSyncQueueStatus(isDE ? 'Sync-Queue geleert.' : 'Sync queue cleared.')
        } catch {
          setSyncQueueStatus(isDE ? 'Sync-Queue konnte nicht geleert werden.' : 'Could not clear sync queue.')
        }
      },
    })
  }

  const runDataExport = async (format: 'txt' | 'csv' | 'json') => {
    setDataExportStatus(null)
    try {
      if (format === 'txt') {
        await exportDbBackupAsTxt()
      } else if (format === 'json') {
        await exportDbBackupAsJson()
      } else {
        await exportDbBackupAsCsv()
      }
      setDataExportStatus(settings.language === 'de' ? 'Export gestartet.' : 'Export started.')
    } catch {
      setDataExportStatus(settings.language === 'de' ? 'Export fehlgeschlagen.' : 'Export failed.')
    }
  }

  const confirmResetVideoProgress = () => {
    setConfirmModal({
      title: settings.language === 'de' ? 'Video-Fortschritt zurücksetzen' : 'Reset video progress',
      message: settings.language === 'de'
        ? 'Gesehen-Status und Selbsteinschätzung aller Lernvideos werden gelöscht. Lernkarten, Reviews und Notizen bleiben erhalten.'
        : 'Watched state and self-assessment of all course videos will be cleared. Cards, reviews, and notes are kept.',
      confirmLabel: settings.language === 'de' ? 'Zurücksetzen' : 'Reset',
      variant: 'danger',
      onConfirm: async () => {
        clearVideoProgress()
        try {
          const [{ clearVideoProgressForProfile }, { profileScopeId }] = await Promise.all([
            import('../../db/queries/learningUnits'),
            import('../../services/profileService'),
          ])
          await clearVideoProgressForProfile(profileScopeId(profile))
          setLocalDataStatus(settings.language === 'de' ? 'Video-Fortschritt zurückgesetzt.' : 'Video progress reset.')
        } catch (error) {
          console.error('[SettingsModal] Dedizierter Video-Fortschritt-Reset fehlgeschlagen', error)
          setLocalDataStatus(settings.language === 'de'
            ? 'Video-Fortschritt konnte nicht vollständig zurückgesetzt werden.'
            : 'Video progress could not be fully reset.')
        }
      },
    })
  }

  const confirmResetLearningProgress = () => {
    setConfirmModal({
      title: isDE ? 'Lernfortschritt zurücksetzen' : 'Reset learning progress',
      message: isDE
        ? 'Alle Karten werden auf „neu“ zurückgesetzt und die komplette Review-Historie (Heatmap, Streak, Statistiken) wird gelöscht — auch auf dem Server und anderen Geräten. Offene Lerneinheiten werden abgebrochen und ihre Evidenz beginnt neu. Decks, Karteninhalte und Notizen bleiben erhalten. Das kann nicht rückgängig gemacht werden.'
        : 'All cards are reset to “new” and the entire review history (heatmap, streak, statistics) is deleted — including on the server and other devices. Open learning units are aborted and their evidence starts over. Decks, card content, and notes are kept. This cannot be undone.',
      confirmLabel: isDE ? 'Fortschritt löschen' : 'Delete progress',
      variant: 'danger',
      onConfirm: async () => {
        const result = await resetLearningProgress()
        if (result.ok) {
          // Dediziertes Lerneinheiten-System: Evidence-Epoch erhöhen und offene
          // Ausführungen abbrechen (§16); Audit-Historie bleibt erhalten.
          try {
            const [{ resetProfileLearningEvidence }, { profileScopeId }] = await Promise.all([
              import('../../db/queries/learningUnits'),
              import('../../services/profileService'),
            ])
            await resetProfileLearningEvidence(profileScopeId(profile), Date.now())
          } catch (error) {
            console.error('[SettingsModal] Lerneinheiten-Reset fehlgeschlagen', error)
          }
          localStorage.removeItem(STORAGE_KEYS.studySession)
          localStorage.removeItem(STORAGE_KEYS.legacyStudySession)
          setLocalDataStatus(isDE
            ? `Lernfortschritt zurückgesetzt (${result.cards} Karten).`
            : `Learning progress reset (${result.cards} cards).`)
          window.setTimeout(() => {
            window.location.reload()
          }, 600)
        } else {
          setLocalDataStatus(isDE ? 'Zurücksetzen fehlgeschlagen.' : 'Reset failed.')
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

  return (
    <SettingsSection
      title={settings.language === 'de' ? 'Daten & Wartung' : 'Data & maintenance'}
      description={settings.language === 'de' ? 'Import, Export, Sync-Details, Fehlerlogs und Zurücksetzen.' : 'Import, export, sync details, error logs, and resets.'}
      icon={<Database size={18} />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="pt-5 space-y-4">
        <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-3`}>
          <p className="text-xs text-white/50 font-medium uppercase tracking-wide">
            {settings.language === 'de' ? 'Lokale Daten' : 'Local data'}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={onOpenImportModal}
              className={`${UI_TOKENS.button.ghost} justify-center py-2.5`}
            >
              <Upload size={13} strokeWidth={1.5} />
              {settings.language === 'de' ? 'Import' : 'Import'}
            </button>
            <button
              type="button"
              onClick={() => { void runDataExport('txt') }}
              className={`${UI_TOKENS.button.ghost} justify-center py-2.5`}
            >
              <Download size={13} strokeWidth={1.5} />
              TXT
            </button>
            <button
              type="button"
              onClick={() => { void runDataExport('csv') }}
              className={`${UI_TOKENS.button.ghost} justify-center py-2.5`}
            >
              <Download size={13} strokeWidth={1.5} />
              CSV
            </button>
            <button
              type="button"
              onClick={() => { void runDataExport('json') }}
              className={`${UI_TOKENS.button.ghost} justify-center py-2.5`}
            >
              <Download size={13} strokeWidth={1.5} />
              JSON
            </button>
          </div>
          {dataExportStatus && (
            <p className="text-xs text-emerald-300/90 leading-relaxed">{dataExportStatus}</p>
          )}
        </div>

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
            className="w-full rounded-ds bg-[#0a0a0a] border border-[#18181b] px-2 py-1.5 text-white"
          />
        </div>

        <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-3`}>
          <p className="text-xs text-white/50 font-medium uppercase tracking-wide">
            {isDE ? 'Sync-Queue Diagnose' : 'Sync queue diagnostics'}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              [isDE ? 'Pending' : 'Pending', syncQueueDiagnostics?.pendingCount ?? '–'],
              [isDE ? 'Dead-Letter' : 'Dead-letter', syncQueueDiagnostics?.deadLetterCount ?? '–'],
              [isDE ? 'Deferred' : 'Deferred', syncQueueDiagnostics?.deferredCount ?? '–'],
              [isDE ? 'Outbox' : 'Outbox', syncQueueDiagnostics?.outboxCount ?? '–'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-ds-xl border border-[#18181b] bg-[#0c0c0c] px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-white/40">{label}</p>
                <p className="text-sm font-semibold text-white/85">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => { void releaseSyncRetries() }}
              className={`${UI_TOKENS.button.ghost} py-2 border-amber-300/30 text-amber-100 hover:text-amber-50`}
            >
              {isDE ? 'Retry freigeben' : 'Release retry'}
            </button>
            <button
              type="button"
              onClick={() => { void refreshSyncQueueDiagnostics() }}
              className={`${UI_TOKENS.button.ghost} py-2`}
            >
              {isDE ? 'Aktualisieren' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={confirmClearSyncQueue}
              className={`${UI_TOKENS.button.ghost} py-2 border-rose-400/30 text-rose-200 hover:text-rose-100`}
            >
              {isDE ? 'Queue leeren' : 'Clear queue'}
            </button>
          </div>
          {syncQueueStatus && <p className="text-xs text-amber-300/90 leading-relaxed">{syncQueueStatus}</p>}
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
              {t.notification_test_title}
            </span>
          </p>
          <p className="text-xs text-white/40 leading-relaxed">
            {t.notification_test_description}
          </p>
          <div className="rounded-ds-xl border border-[#18181b] bg-[#0c0c0c] p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-white/60 uppercase tracking-wide">{t.notification_test_permission_label}</p>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium border ${
                notificationPermission === 'granted'
                  ? 'border-emerald-500/35 text-emerald-200 bg-emerald-500/10'
                  : notificationPermission === 'denied'
                    ? 'border-rose-500/35 text-rose-200 bg-rose-500/10'
                    : 'border-[#18181b] text-zinc-300 bg-[#0c0c0c]'
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
            <div className="max-h-36 overflow-y-auto rounded-ds-xl border border-[#18181b] bg-[#0a0a0a] p-2 space-y-2">
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
          <p className="text-xs text-white/50 font-medium uppercase tracking-wide">
            {settings.language === 'de' ? 'Lernvideo-Fortschritt' : 'Video progress'}
          </p>
          <p className="text-xs text-white/40 leading-relaxed">
            {settings.language === 'de'
              ? 'Setzt Gesehen-Status und Selbsteinschätzung aller Professor-Messer-Videos zurück — z. B. für einen zweiten Kursdurchlauf. Lernkarten und Notizen bleiben unberührt.'
              : 'Resets watched state and self-assessment for all Professor Messer videos — e.g. for a second course run. Cards and notes stay untouched.'}
          </p>
          <button
            type="button"
            onClick={confirmResetVideoProgress}
            className={`${UI_TOKENS.button.ghost} py-2 border-amber-400/30 text-amber-200 hover:text-amber-100`}
          >
            {settings.language === 'de' ? 'Video-Fortschritt zurücksetzen' : 'Reset video progress'}
          </button>
        </div>

        <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-3`}>
          <p className="text-xs text-white/50 font-medium uppercase tracking-wide">
            {isDE ? 'Lernfortschritt & Metriken' : 'Learning progress & metrics'}
          </p>
          <p className="text-xs text-white/40 leading-relaxed">
            {isDE
              ? 'Setzt alle Karten auf „neu“ zurück und löscht die komplette Review-Historie (Heatmap, Streak, Statistiken) — wird auf Server und andere Geräte synchronisiert. Decks, Karteninhalte und Notizen bleiben erhalten.'
              : 'Resets all cards to “new” and deletes the entire review history (heatmap, streak, statistics) — synced to the server and other devices. Decks, card content, and notes are kept.'}
          </p>
          <button
            type="button"
            data-testid="reset-learning-progress"
            onClick={confirmResetLearningProgress}
            className={`${UI_TOKENS.button.ghost} py-2 border-rose-400/30 text-rose-200 hover:text-rose-100`}
          >
            {isDE ? 'Fortschritt & Metriken zurücksetzen' : 'Reset progress & metrics'}
          </button>
        </div>

        <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-3`}>
          <p className="text-xs text-white/50 font-medium uppercase tracking-wide">{t.indexeddb_reset_title}</p>
          <p className="text-xs text-white/40 leading-relaxed">{t.indexeddb_reset_description}</p>
          <SettingsPwaFullReset setConfirmModal={setConfirmModal} setLocalDataStatus={setLocalDataStatus} />
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
            className={`${UI_TOKENS.button.ghost} py-2 border-[--brand-secondary-25] text-[--brand-secondary] hover:text-ds-fg`}
          >
            {t.normalize_due_dates_action}
          </button>
          {localDataStatus && <p className="text-xs text-amber-300/90 leading-relaxed">{localDataStatus}</p>}
        </div>
      </div>
    </SettingsSection>
  )
}
