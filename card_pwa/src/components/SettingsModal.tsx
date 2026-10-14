/**
 * AI_CONTEXT:
 * Role: Settings modal shell — owns category navigation, the state that
 * must survive switching categories (see Important below), and the
 * shared ConfirmModal/ImportModal overlays. Renders the 5 domain subcomponents from
 * components/settings/.
 * Used by: HomeView (Settings entry point).
 * Important: diagnostics/errorLogs/notificationPermission/*Status/youngLapseStats/
 * fsrsOptimizationStatus/isOptimizingFsrs stay here (not in the child sections)
 * because AccordionSection unmounts its children when collapsed — moving this state
 * into a child would reset in-flight async status (e.g. FSRS optimizing, PWA reset)
 * every time the user collapses that section, not just when the whole modal closes.
 */
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Bell, Brain, Database, Palette, Swords, User } from 'lucide-react'
import { useSettings, STRINGS } from '../contexts/SettingsContext'
import { getAlgorithmDiagnostics, getYoungCardLapseRate, type AlgorithmDiagnosticsEntry, type YoungCardLapseStats } from '../db/queries'
import { getErrorLogs, type ErrorLogEntry } from '../services/errorLog'
import ConfirmModal from './ConfirmModal'
import { SettingsProfileSyncSection } from './settings/SettingsProfileSyncSection'
import { SettingsAppearanceSection } from './settings/SettingsAppearanceSection'
import { SettingsCompanionSection } from './settings/SettingsCompanionSection'
import { SettingsLearningSection } from './settings/SettingsLearningSection'
import { SettingsNotificationsSection } from './settings/SettingsNotificationsSection'
import { SettingsDataSection } from './settings/SettingsDataSection'
import { Dialog } from '../ui/overlays/Dialog'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type SettingsSectionKey = 'profile' | 'appearance' | 'companion' | 'learning' | 'notifications' | 'data'

const ImportModal = lazy(() => import('./ImportModal.tsx'))

export default function SettingsModal({ isOpen, onClose }: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const [activeSection, setActiveSection] = useState<SettingsSectionKey>('profile')
  // Entscheidungsgrundlage für FSRS-Learning-Steps (Audit ⑥): erst messen.
  const [youngLapseStats, setYoungLapseStats] = useState<YoungCardLapseStats | null>(null)

  useEffect(() => {
    if (activeSection !== 'learning' || youngLapseStats !== null) return
    let cancelled = false
    void getYoungCardLapseRate().then(stats => {
      if (!cancelled) setYoungLapseStats(stats)
    }).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [activeSection, youngLapseStats])

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

  const sectionOptions: Array<{
    key: SettingsSectionKey
    label: string
    description: string
    icon: ReactNode
  }> = settings.language === 'de'
    ? [
        { key: 'profile', label: 'Profil & Sync', description: 'Konto und Geräte', icon: <User size={17} /> },
        { key: 'appearance', label: 'Darstellung', description: 'Sprache und Design', icon: <Palette size={17} /> },
        { key: 'companion', label: 'Begleiter', description: 'Sprites und Spiel', icon: <Swords size={17} /> },
        { key: 'learning', label: 'Lernen', description: 'Sessions und Planung', icon: <Brain size={17} /> },
        { key: 'notifications', label: 'Mitteilungen', description: 'Reminder und Push', icon: <Bell size={17} /> },
        { key: 'data', label: 'Daten', description: 'Import und Wartung', icon: <Database size={17} /> },
      ]
    : [
        { key: 'profile', label: 'Profile & sync', description: 'Account and devices', icon: <User size={17} /> },
        { key: 'appearance', label: 'Appearance', description: 'Language and design', icon: <Palette size={17} /> },
        { key: 'companion', label: 'Companion', description: 'Sprites and game', icon: <Swords size={17} /> },
        { key: 'learning', label: 'Learning', description: 'Sessions and planning', icon: <Brain size={17} /> },
        { key: 'notifications', label: 'Notifications', description: 'Reminders and push', icon: <Bell size={17} /> },
        { key: 'data', label: 'Data', description: 'Import and maintenance', icon: <Database size={17} /> },
      ]

  const sectionProps = { isOpen: true, onToggle: () => {}, presentation: 'panel' as const }

  return (
    <>
      {isOpen && (
        <Dialog
          title={t.settings}
          subtitle={settings.language === 'de' ? 'Wähle einen Bereich und passe ihn direkt an.' : 'Choose a category and adjust it directly.'}
          closeLabel={settings.language === 'de' ? 'Einstellungen schließen' : 'Close settings'}
          onClose={() => onClose()}
          dismissible={!showImportModal && confirmModal === null}
          size="xl"
          className="h-[calc(100dvh-env(safe-area-inset-top,0px)-2rem)] overflow-hidden sm:h-[min(48rem,calc(100dvh-env(safe-area-inset-top,0px)-2rem))] [&>div:first-child]:mb-0 [&>div:first-child]:shrink-0 [&>div:first-child]:border-b-[3px] [&>div:first-child]:border-black [&>div:first-child]:bg-[#FFD93D] [&>div:first-child]:px-4 [&>div:first-child]:py-3 sm:[&>div:first-child]:px-5 sm:[&>div:first-child]:py-4"
        >
          <div className="flex min-h-0 flex-1 flex-col bg-[#050505] md:grid md:grid-cols-[13.5rem_minmax(0,1fr)]">
            <nav
              aria-label={settings.language === 'de' ? 'Einstellungsbereiche' : 'Settings categories'}
              className="shrink-0 overflow-x-auto border-b border-[#27272a] bg-[#080808] p-2 md:overflow-y-auto md:border-b-0 md:border-r md:p-3"
            >
              <div className="flex min-w-max gap-2 md:min-w-0 md:flex-col">
                {sectionOptions.map(option => {
                  const selected = activeSection === option.key
                  return (
                    <button
                      key={option.key}
                      type="button"
                      aria-current={selected ? 'page' : undefined}
                      onClick={() => setActiveSection(option.key)}
                      className={`flex min-h-11 items-center gap-2.5 rounded-ds-xl border px-3 py-2.5 text-left transition md:w-full ${selected
                        ? 'border-[--brand-primary-50] bg-[--brand-primary-08] text-white'
                        : 'border-transparent text-zinc-500 hover:border-[#27272a] hover:bg-white/[0.03] hover:text-zinc-200'
                      }`}
                    >
                      <span className="shrink-0">{option.icon}</span>
                      <span>
                        <span className="block text-xs font-bold sm:text-sm">{option.label}</span>
                        <span className="hidden text-[11px] text-zinc-500 md:block">{option.description}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5" style={{ scrollPaddingBottom: '1rem' }}>
              {activeSection === 'profile' && <SettingsProfileSyncSection {...sectionProps} />}
              {activeSection === 'appearance' && <SettingsAppearanceSection {...sectionProps} />}
              {activeSection === 'companion' && <SettingsCompanionSection {...sectionProps} />}
              {activeSection === 'learning' && (
                <SettingsLearningSection
                  {...sectionProps}
                  youngLapseStats={youngLapseStats}
                  fsrsOptimizationStatus={fsrsOptimizationStatus}
                  setFsrsOptimizationStatus={setFsrsOptimizationStatus}
                  isOptimizingFsrs={isOptimizingFsrs}
                  setIsOptimizingFsrs={setIsOptimizingFsrs}
                />
              )}
              {activeSection === 'notifications' && (
                <SettingsNotificationsSection
                  {...sectionProps}
                  notificationPermission={notificationPermission}
                  setNotificationPermission={setNotificationPermission}
                  notificationTestStatus={notificationTestStatus}
                  setNotificationTestStatus={setNotificationTestStatus}
                />
              )}
              {activeSection === 'data' && (
                <SettingsDataSection
                  {...sectionProps}
                  diagnostics={diagnostics}
                  setDiagnostics={setDiagnostics}
                  errorLogs={errorLogs}
                  setErrorLogs={setErrorLogs}
                  dataExportStatus={dataExportStatus}
                  setDataExportStatus={setDataExportStatus}
                  localDataStatus={localDataStatus}
                  setLocalDataStatus={setLocalDataStatus}
                  setConfirmModal={setConfirmModal}
                  onOpenImportModal={() => setShowImportModal(true)}
                />
              )}
            </div>
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
