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
import { motion, AnimatePresence, useReducedMotion } from '../ui/motion'
import { Settings as SettingsIcon, X } from 'lucide-react'
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

interface Props {
  isOpen: boolean
  onClose: () => void
}

type SettingsSectionKey = 'profile' | 'appearance' | 'learning' | 'notifications' | 'data'

const ImportModal = lazy(() => import('./ImportModal.tsx'))

export default function SettingsModal({ isOpen, onClose }: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const prefersReducedMotion = useReducedMotion()
  const [openSection, setOpenSection] = useState<SettingsSectionKey | null>(null)
  // Entscheidungsgrundlage für FSRS-Learning-Steps (Audit ⑥): erst messen.
  const [youngLapseStats, setYoungLapseStats] = useState<YoungCardLapseStats | null>(null)

  // Dialog-Grundverhalten: Escape schließt das Modal.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

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
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="settings-modal"
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
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: prefersReducedMotion ? 0.12 : 0.2, ease: 'easeOut' }}
            className="relative flex min-h-0 w-full max-w-3xl flex-col ds-modal"
            style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 2rem)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b-4 border-black bg-[#FFD93D] px-5 py-4">
              <div className="flex min-w-0 items-center gap-2">
                <SettingsIcon size={18} strokeWidth={1.5} className="text-zinc-400" />
                <div className="min-w-0">
                  <h2 id="settings-modal-title" className="text-zinc-100 font-black text-lg tracking-tight">{t.settings}</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {t.settings_expand_sections}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="ds-icon-button flex h-9 w-9"
                aria-label={settings.language === 'de' ? 'Einstellungen schließen' : 'Close settings'}
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Bewusst außerhalb der AnimatePresence: das sind keine animierten
        Wechselkinder — innerhalb erzeugten sie doppelte Leer-Keys (React-Warnung,
        riskiert verschluckte Kinder bei Exit-Animationen). */}
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
