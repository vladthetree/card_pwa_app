/**
 * AI_CONTEXT:
 * Role: Settings modal shell — owns the accordion open/close state, the state that
 * must survive an accordion section collapsing (see Important below), and the
 * shared ConfirmModal/ImportModal overlays. Renders the 5 domain subcomponents from
 * components/settings/.
 * Used by: HomeView (Settings entry point).
 * Important: diagnostics/errorLogs/notificationPermission/*Status/youngLapseStats/
 * fsrsOptimizationStatus/isOptimizingFsrs stay here (not in the child sections)
 * because AccordionSection unmounts its children when collapsed — moving this state
 * into a child would reset in-flight async status (e.g. FSRS optimizing, PWA reset)
 * every time the user collapses that section, not just when the whole modal closes.
 */
import { lazy, Suspense, useEffect, useState } from 'react'
import { useSettings, STRINGS } from '../contexts/SettingsContext'
import { getAlgorithmDiagnostics, getYoungCardLapseRate, type AlgorithmDiagnosticsEntry, type YoungCardLapseStats } from '../db/queries'
import { getErrorLogs, type ErrorLogEntry } from '../services/errorLog'
import { UI_TOKENS } from '../constants/ui'
import ConfirmModal from './ConfirmModal'
import { SettingsProfileSyncSection } from './settings/SettingsProfileSyncSection'
import { SettingsAppearanceSection } from './settings/SettingsAppearanceSection'
import { SettingsLearningSection } from './settings/SettingsLearningSection'
import { SettingsNotificationsSection } from './settings/SettingsNotificationsSection'
import { SettingsDataSection } from './settings/SettingsDataSection'
import { Dialog } from '../ui/overlays/Dialog'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type SettingsSectionKey = 'profile' | 'appearance' | 'learning' | 'notifications' | 'data'

const ImportModal = lazy(() => import('./ImportModal.tsx'))

export default function SettingsModal({ isOpen, onClose }: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const [openSection, setOpenSection] = useState<SettingsSectionKey | null>(null)
  // Entscheidungsgrundlage für FSRS-Learning-Steps (Audit ⑥): erst messen.
  const [youngLapseStats, setYoungLapseStats] = useState<YoungCardLapseStats | null>(null)

  useEffect(() => {
    if (openSection !== 'learning' || youngLapseStats !== null) return
    let cancelled = false
    void getYoungCardLapseRate().then(stats => {
      if (!cancelled) setYoungLapseStats(stats)
    }).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [openSection, youngLapseStats])

  const [diagnostics, setDiagnostics] = useState<AlgorithmDiagnosticsEntry[]>([])
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([])
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof Notification === 'undefined') return 'unsupported'
    return Notification.permission
  })
  const [notificationTestStatus, setNotificationTestStatus] = useState<string | null>(null)
  const [localDataStatus, setLocalDataStatus] = useState<string | null>(null)
  const [dataExportStatus, setDataExportStatus] = useState<string | null>(null)
  const [fsrsOptimizationStatus, setFsrsOptimizationStatus] = useState<string | null>(null)
  const [isOptimizingFsrs, setIsOptimizingFsrs] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    title: string
    message: string
    confirmLabel?: string
    variant?: 'danger' | 'default'
    onConfirm: () => void
  } | null>(null)

  useEffect(() => {
    if (isOpen) {
      setDiagnostics(getAlgorithmDiagnostics())
      setErrorLogs(getErrorLogs())
      setNotificationPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
      setNotificationTestStatus(null)
      setLocalDataStatus(null)
      setDataExportStatus(null)
    }
  }, [isOpen])

  const toggleSection = (section: SettingsSectionKey) => {
    setOpenSection(current => (current === section ? null : section))
  }

  return (
    <>
      {isOpen && (
        <Dialog
          title={t.settings}
          subtitle={t.settings_expand_sections}
          closeLabel={settings.language === 'de' ? 'Einstellungen schließen' : 'Close settings'}
          onClose={() => onClose()}
          dismissible={!showImportModal && confirmModal === null}
          size="lg"
          className="overflow-hidden"
        >
            <div
              className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 space-y-3"
              style={{
                scrollPaddingBottom: '1rem',
              }}
            >
              <SettingsProfileSyncSection
                isOpen={openSection === 'profile'}
                onToggle={() => toggleSection('profile')}
              />

              <SettingsAppearanceSection
                isOpen={openSection === 'appearance'}
                onToggle={() => toggleSection('appearance')}
              />

              <SettingsLearningSection
                isOpen={openSection === 'learning'}
                onToggle={() => toggleSection('learning')}
                youngLapseStats={youngLapseStats}
                fsrsOptimizationStatus={fsrsOptimizationStatus}
                setFsrsOptimizationStatus={setFsrsOptimizationStatus}
                isOptimizingFsrs={isOptimizingFsrs}
                setIsOptimizingFsrs={setIsOptimizingFsrs}
              />

              <SettingsNotificationsSection
                isOpen={openSection === 'notifications'}
                onToggle={() => toggleSection('notifications')}
                setNotificationPermission={setNotificationPermission}
                setNotificationTestStatus={setNotificationTestStatus}
              />

              <SettingsDataSection
                isOpen={openSection === 'data'}
                onToggle={() => toggleSection('data')}
                diagnostics={diagnostics}
                setDiagnostics={setDiagnostics}
                errorLogs={errorLogs}
                setErrorLogs={setErrorLogs}
                dataExportStatus={dataExportStatus}
                setDataExportStatus={setDataExportStatus}
                localDataStatus={localDataStatus}
                setLocalDataStatus={setLocalDataStatus}
                notificationPermission={notificationPermission}
                setNotificationPermission={setNotificationPermission}
                notificationTestStatus={notificationTestStatus}
                setNotificationTestStatus={setNotificationTestStatus}
                setConfirmModal={setConfirmModal}
                onOpenImportModal={() => setShowImportModal(true)}
              />
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex shrink-0 gap-3 border-t-4 border-black bg-[#FFFDF5] px-5 py-4">
              <button
                onClick={onClose}
                className={`${UI_TOKENS.button.footerSecondary} text-sm font-medium hover:bg-white/5`}
              >
                {t.close}
              </button>
            </div>
        </Dialog>
      )}

    {/* Verschachtelte Overlays bleiben Geschwister im React-Baum; das gemeinsame
        Portal und der Overlay-Stack steuern Fokus, Escape und Backdrop. */}
    <Suspense fallback={null}>
      {showImportModal && (
        <ImportModal
          isOpen
          onClose={() => setShowImportModal(false)}
        />
      )}
    </Suspense>

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
    </>
  )
}
