/**
 * AI_CONTEXT: Home-screen React component for home Export Modal; supports dashboard, deck browsing, tag browsing, export, or quick study workflows.
 */
import { Download } from 'lucide-react'
import { UI_TOKENS } from '../../constants/ui'
import { ModalShell } from '../ModalShell'

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
    <ModalShell
      title={t.backup_export_title}
      subtitle={t.backup_export_subtitle}
      onClose={onClose}
      prefersReducedMotion={prefersReducedMotion}
      maxWidthClass="max-w-lg"
    >
        <div>
          <label className="block text-xs text-white/50 font-medium mb-2 uppercase tracking-wide">
            {t.backup_export_deck_scope}
          </label>
          <select
            value={selectedDeckId}
            onChange={(e) => onSelectedDeckIdChange(e.target.value)}
            className={`${UI_TOKENS.input.base} w-full`}
          >
            <option value="all">{t.backup_export_all_decks}</option>
            {deckOptions.map(deck => (
              <option key={deck.id} value={deck.id}>{deck.name}</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-white/45 mt-3">{t.backup_export_note_txt}</p>

        <div className="mt-3 rounded-ds-xl border border-[--brand-secondary-25] bg-[--brand-secondary-12] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[--brand-secondary]">
            {t.migration_official_path_title}
          </p>
          <p className="mt-1 text-xs text-[--brand-secondary-80]">{t.migration_export_step_1}</p>
          <p className="text-xs text-[--brand-secondary-80]">{t.migration_export_step_2}</p>
          <p className="text-xs text-[--brand-secondary-80]">{t.migration_export_step_3}</p>
          <p className="mt-2 text-[11px] text-[--brand-secondary-50]">{t.migration_phase1_no_db_extract}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onExportTxt}
            disabled={isExporting}
            className={`${UI_TOKENS.button.footerPrimary} disabled:opacity-60 inline-flex items-center justify-center gap-1.5`}
          >
            <Download size={12} strokeWidth={1.5} /> .txt
          </button>
          <button
            type="button"
            onClick={onExportCsv}
            disabled={isExporting}
            className={`${UI_TOKENS.button.footerPrimary} disabled:opacity-60 inline-flex items-center justify-center gap-1.5`}
          >
            <Download size={12} strokeWidth={1.5} /> .csv
          </button>
        </div>
    </ModalShell>
  )
}
