/**
 * AI_CONTEXT:
 * Role: Settings domain subcomponent — Data & maintenance accordion (import/export,
 * optional sync auth token, algorithm diagnostics, error
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
import { exportDbBackupAsCsv, exportDbBackupAsJson, exportDbBackupAsTxt } from '../../services/dbBackup'
import { unregisterAppServiceWorkers, deleteAppCaches } from './settingsResetHelpers'
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
  presentation?: 'accordion' | 'panel'
  diagnostics: AlgorithmDiagnosticsEntry[]
  setDiagnostics: (entries: AlgorithmDiagnosticsEntry[]) => void
  errorLogs: ErrorLogEntry[]
  setErrorLogs: (entries: ErrorLogEntry[]) => void
  dataExportStatus: string | null
  setDataExportStatus: (status: string | null) => void
  localDataStatus: string | null
  setLocalDataStatus: (status: string | null) => void
  setConfirmModal: (request: ConfirmModalRequest | null) => void
  onOpenImportModal: () => void
}

export function SettingsDataSection({
  isOpen,
  onToggle,
  presentation,
  diagnostics,
  setDiagnostics,
  errorLogs,
  setErrorLogs,
  dataExportStatus,
  setDataExportStatus,
  localDataStatus,
  setLocalDataStatus,
  setConfirmModal,
  onOpenImportModal,
}: Props) {
  const { settings, profile } = useSettings()
  const t = STRINGS[settings.language]
  const isDE = settings.language === 'de'

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
      presentation={presentation}
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

        <details className="group/advanced rounded-ds-xl border border-[#18181b] bg-[#080808] p-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left">
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-white/60">
                {isDE ? 'Erweiterte Diagnose' : 'Advanced diagnostics'}
              </span>
              <span className="mt-1 block text-xs text-white/40">
                {isDE ? 'Sync-Queue, Auth-Token, Algorithmus-Checks und Fehlerprotokoll.' : 'Sync queue, auth token, algorithm checks, and error log.'}
              </span>
            </span>
            <span className="text-lg leading-none text-white/30 group-open/advanced:hidden">+</span>
            <span className="hidden text-lg leading-none text-white/30 group-open/advanced:inline">−</span>
          </summary>
          <div className="mt-3 space-y-3 border-t border-[#18181b] pt-3">

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
          </div>
        </details>

        <details className="group/reset rounded-ds-xl border border-rose-400/25 bg-rose-500/[0.04] p-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left">
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-rose-200/90">
                {isDE ? 'Zurücksetzen & Reparieren' : 'Reset & repair'}
              </span>
              <span className="mt-1 block text-xs text-white/40">
                {isDE ? 'Fortschritt, lokale App-Daten oder Fälligkeiten gezielt zurücksetzen.' : 'Reset progress, local app data, or due dates selectively.'}
              </span>
            </span>
            <span className="text-lg leading-none text-rose-200/50 group-open/reset:hidden">+</span>
            <span className="hidden text-lg leading-none text-rose-200/50 group-open/reset:inline">−</span>
          </summary>
          <div className="mt-3 space-y-3 border-t border-rose-400/15 pt-3">
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
        </details>
      </div>
    </SettingsSection>
  )
}
