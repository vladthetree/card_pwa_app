import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  HelpCircle,
  ChevronDown,
  Upload,
  FileText,
  Database,
  CheckCircle2,
  Lightbulb,
  X,
} from 'lucide-react'
import { STRINGS } from '../contexts/SettingsContext'
import { useSettings } from '../contexts/SettingsContext'
import { UI_TOKENS } from '../constants/ui'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type FaqSectionKey = 'import_export' | 'study' | 'csv' | 'mc' | 'txt' | 'apkg' | 'badge' | 'tips'

interface FaqSectionProps {
  title: string
  description: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

function FaqSection({ title, description, icon, isOpen, onToggle, children }: FaqSectionProps) {
  return (
    <div className={`rounded-xl overflow-hidden transition-all duration-300 ease-out ${isOpen ? 'border border-zinc-700 bg-[#0c0c0c]' : 'border border-zinc-900 bg-[#0c0c0c]'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-4 py-4 text-left hover:bg-white/[0.04] transition-all duration-300 ease-out"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 transition-colors duration-300 ease-out ${isOpen ? 'text-white' : 'text-zinc-700'}`}>{icon}</div>
          <div className="min-w-0">
            <p className="text-sm font-black text-white">{title}</p>
            <p className="text-xs text-white/50 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 transition-all duration-300 ease-out ${isOpen ? 'rotate-180 text-white' : 'text-zinc-700'}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-zinc-700 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FaqModal({ isOpen, onClose }: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const prefersReducedMotion = useReducedMotion()
  const [openSection, setOpenSection] = useState<FaqSectionKey | null>(null)

  const toggleSection = (section: FaqSectionKey) => {
    setOpenSection(current => (current === section ? null : section))
  }

  const renderContent = (text: string) => {
    return text.split('\n').map((line, idx) => (
      <div key={idx} className="text-sm text-white/78 leading-relaxed">
        {line}
      </div>
    ))
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
            className={`${UI_TOKENS.modal.shell} max-w-2xl`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/15 bg-black">
              <div className="flex items-center gap-2">
                <HelpCircle size={20} className="text-white" />
                <div>
                  <h2 className="text-white font-black text-lg tracking-tight">{t.faq}</h2>
                  <p className="text-xs text-white/55 mt-0.5">
                    {t.faq_expand_sections}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-2xl text-white/55 hover:text-white hover:bg-white/[0.06] transition-all duration-300 ease-out active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            <div
              className="overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 space-y-4"
              style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 9.25rem)' }}
            >
              <FaqSection
                title={t.faq_import_export}
                description={t.faq_import_export_help}
                icon={<Upload size={18} />}
                isOpen={openSection === 'import_export'}
                onToggle={() => toggleSection('import_export')}
              >
                <div className="pt-3 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">{t.faq_import_title}</h4>
                    {renderContent(t.faq_import_content)}
                  </div>
                  <div className="border-t border-white/10 pt-4">
                    <h4 className="text-sm font-medium text-white mb-2">{t.faq_export_title}</h4>
                    {renderContent(t.faq_export_content)}
                  </div>
                </div>
              </FaqSection>

              <FaqSection
                title={t.faq_study_session}
                description={t.faq_study_session_help}
                icon={<CheckCircle2 size={18} />}
                isOpen={openSection === 'study'}
                onToggle={() => toggleSection('study')}
              >
                <div className="pt-3 space-y-3">
                  <h4 className="text-sm font-medium text-white">{t.faq_study_title}</h4>
                  {renderContent(t.faq_study_content)}
                </div>
              </FaqSection>

              <FaqSection
                title={t.faq_csv_format}
                description={t.faq_csv_format_help}
                icon={<FileText size={18} />}
                isOpen={openSection === 'csv'}
                onToggle={() => toggleSection('csv')}
              >
                <div className="pt-3 space-y-3">
                  <div>
                    <p className="text-xs text-white/60 font-semibold uppercase mb-2">Struktur / Structure</p>
                    <div className="bg-black/75 border border-white/10 rounded-2xl p-3 text-xs font-mono text-white/70">
                      {t.faq_csv_structure}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 font-semibold uppercase mb-2">Beispiel / Example</p>
                    <div className="bg-black/75 border border-white/10 rounded-2xl p-3 text-xs font-mono text-white/70">
                      {t.faq_csv_example}
                    </div>
                  </div>
                </div>
              </FaqSection>

              <FaqSection
                title={t.faq_mc_format}
                description={t.faq_mc_format_help}
                icon={<CheckCircle2 size={18} />}
                isOpen={openSection === 'mc'}
                onToggle={() => toggleSection('mc')}
              >
                <div className="pt-3 space-y-3">
                  <h4 className="text-sm font-medium text-white">{t.faq_mc_title}</h4>
                  {renderContent(t.faq_mc_content)}
                </div>
              </FaqSection>

              <FaqSection
                title={t.faq_txt_format}
                description={t.faq_txt_format_help}
                icon={<FileText size={18} />}
                isOpen={openSection === 'txt'}
                onToggle={() => toggleSection('txt')}
              >
                <div className="pt-3 space-y-3">
                  <p className="text-xs text-white/60 font-semibold uppercase mb-2">Format</p>
                  <div className="bg-black/75 border border-white/10 rounded-2xl p-3 text-xs font-mono text-white/70 whitespace-pre-wrap">
                    {t.faq_txt_structure}
                  </div>
                </div>
              </FaqSection>

              <FaqSection
                title={t.faq_apkg_format}
                description={t.faq_apkg_format_help}
                icon={<Database size={18} />}
                isOpen={openSection === 'apkg'}
                onToggle={() => toggleSection('apkg')}
              >
                <div className="pt-3">
                  {renderContent(t.faq_apkg_info)}
                </div>
              </FaqSection>

              <FaqSection
                title={t.faq_badge_vs_session}
                description={t.faq_badge_vs_session_help}
                icon={<Lightbulb size={18} />}
                isOpen={openSection === 'badge'}
                onToggle={() => toggleSection('badge')}
              >
                <div className="pt-3 space-y-3">
                  <h4 className="text-sm font-medium text-white">{t.faq_badge_vs_session_title}</h4>
                  {renderContent(t.faq_badge_vs_session_content)}
                </div>
              </FaqSection>

              <FaqSection
                title={t.faq_best_practices}
                description={t.faq_best_practices_help}
                icon={<Lightbulb size={18} />}
                isOpen={openSection === 'tips'}
                onToggle={() => toggleSection('tips')}
              >
                <div className="pt-3 space-y-3">
                  <h4 className="text-sm font-medium text-white">{t.faq_tips_title}</h4>
                  {renderContent(t.faq_tips_content)}
                </div>
              </FaqSection>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 px-5 py-4 pb-safe-4 border-t border-white/15 flex gap-3 bg-black">
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
  )
}
