import { motion } from 'framer-motion'
import { Download, X } from 'lucide-react'
import { UI_TOKENS } from '../../constants/ui'

interface Props {
  isOpen: boolean
  t: Record<string, string>
  prefersReducedMotion: boolean | null
  selectedDeckId: 'all' | string
  deckOptions: Array<{ id: string; name: string }>
  isExporting: boolean
  onClose: () => void
  onSelectedDeckIdChange: (value: 'all' | string) => void
  onExportTxt: () => void
  onExportCsv: () => void
}

export function HomeExportModal({
  isOpen,
  t,
  prefersReducedMotion,
  selectedDeckId,
  deckOptions,
  isExporting,
  onClose,
  onSelectedDeckIdChange,
  onExportTxt,
  onExportCsv,
}: Props) {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={UI_TOKENS.modal.overlay}
    >
      <div className={UI_TOKENS.modal.backdrop} onClick={onClose} />
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: prefersReducedMotion ? 0.12 : 0.2, ease: 'easeOut' }}
        className={`${UI_TOKENS.modal.shell} max-w-lg p-5 sm:p-6`}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className={UI_TOKENS.modal.title}>{t.backup_export_title}</h3>
            <p className={UI_TOKENS.modal.subtitle}>{t.backup_export_subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className={UI_TOKENS.modal.closeButton}
          >
            <X size={16} />
          </button>
        </div>

        <div>
          <label className="block text-xs text-white/50 font-medium mb-2 uppercase tracking-wide">
            {t.backup_export_deck_scope}
          </label>
          <select
            value={selectedDeckId}
            onChange={(e) => onSelectedDeckIdChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-white/30"
          >
            <option value="all">{t.backup_export_all_decks}</option>
            {deckOptions.map(deck => (
              <option key={deck.id} value={deck.id}>{deck.name}</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-white/45 mt-3">{t.backup_export_note_txt}</p>

        <div className="mt-3 rounded-xl border border-sky-400/25 bg-sky-500/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-200/90">
            {t.migration_official_path_title}
          </p>
          <p className="mt-1 text-xs text-sky-100/80">{t.migration_export_step_1}</p>
          <p className="text-xs text-sky-100/80">{t.migration_export_step_2}</p>
          <p className="text-xs text-sky-100/80">{t.migration_export_step_3}</p>
          <p className="mt-2 text-[11px] text-sky-100/60">{t.migration_phase1_no_db_extract}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onExportTxt}
            disabled={isExporting}
            className="px-3 py-2 rounded-lg text-xs border border-white/20 bg-white text-black hover:bg-white/90 transition disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
          >
            <Download size={12} /> .txt
          </button>
          <button
            type="button"
            onClick={onExportCsv}
            disabled={isExporting}
            className="px-3 py-2 rounded-lg text-xs border border-white/20 bg-white text-black hover:bg-white/90 transition disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
          >
            <Download size={12} /> .csv
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
