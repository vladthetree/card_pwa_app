/**
 * AI_CONTEXT: Reusable React component for faq Modal; contributes to the card-learning UI and shared app interactions.
 */
import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from '../ui/motion'
import {
  HelpCircle,
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
import { AccordionSection } from './AccordionSection'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type FaqSectionKey = 'import_export' | 'study' | 'csv' | 'mc' | 'txt' | 'apkg' | 'badge' | 'tips'

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
            <div className="sticky top-0 z-10 flex items-center justify-between border-b-4 border-black bg-[#C4B5FD] px-5 py-4">
              <div className="flex items-center gap-2">
                <HelpCircle size={20} strokeWidth={1.5} className="text-white" />
                <div>
                  <h2 className="text-white font-black text-lg tracking-tight">{t.faq}</h2>
                  <p className="text-xs text-white/55 mt-0.5">
                    {t.faq_expand_sections}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="ds-icon-button h-9 w-9"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <div
              className="overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 space-y-4"
              style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 9.25rem)' }}
            >
              <AccordionSection
                variant="faq"
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
                  <div className="border-t border-[#18181b] pt-4">
                    <h4 className="text-sm font-medium text-white mb-2">{t.faq_export_title}</h4>
                    {renderContent(t.faq_export_content)}
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection
                variant="faq"
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
              </AccordionSection>

              <AccordionSection
                variant="faq"
                title={t.faq_csv_format}
                description={t.faq_csv_format_help}
                icon={<FileText size={18} />}
                isOpen={openSection === 'csv'}
                onToggle={() => toggleSection('csv')}
              >
                <div className="pt-3 space-y-3">
                  <div>
                    <p className="text-xs text-white/60 font-semibold uppercase mb-2">Struktur / Structure</p>
	                    <div className="rounded-ds-xl border border-[#18181b] bg-[#0a0a0a] p-3 text-xs font-mono text-white/70">
                      {t.faq_csv_structure}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 font-semibold uppercase mb-2">Beispiel / Example</p>
	                    <div className="rounded-ds-xl border border-[#18181b] bg-[#0a0a0a] p-3 text-xs font-mono text-white/70">
                      {t.faq_csv_example}
                    </div>
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection
                variant="faq"
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
              </AccordionSection>

              <AccordionSection
                variant="faq"
                title={t.faq_txt_format}
                description={t.faq_txt_format_help}
                icon={<FileText size={18} />}
                isOpen={openSection === 'txt'}
                onToggle={() => toggleSection('txt')}
              >
                <div className="pt-3 space-y-3">
                  <p className="text-xs text-white/60 font-semibold uppercase mb-2">Format</p>
	                  <div className="rounded-ds-xl border border-[#18181b] bg-[#0a0a0a] p-3 text-xs font-mono text-white/70 whitespace-pre-wrap">
                    {t.faq_txt_structure}
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection
                variant="faq"
                title={t.faq_apkg_format}
                description={t.faq_apkg_format_help}
                icon={<Database size={18} />}
                isOpen={openSection === 'apkg'}
                onToggle={() => toggleSection('apkg')}
              >
                <div className="pt-3">
                  {renderContent(t.faq_apkg_info)}
                </div>
              </AccordionSection>

              <AccordionSection
                variant="faq"
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
              </AccordionSection>

              <AccordionSection
                variant="faq"
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
              </AccordionSection>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex gap-3 border-t-4 border-black bg-[#FFFDF5] px-5 py-4">
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
