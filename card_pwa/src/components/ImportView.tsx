import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Upload, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import DuplicateReviewModal from './DuplicateReviewModal'
import type { ImportPlan, ParsedImport } from '../utils/import/types'
import { UI_TOKENS } from '../constants/ui'
import ProgressBar from './ProgressBar'

const ACCEPTED = '.apkg,.colpkg,.txt,.csv'
const ACCEPTED_TYPES = new Set(['apkg', 'colpkg', 'txt', 'csv'])
const MAX_IMPORT_SIZE_BYTES = 100 * 1024 * 1024

function getFileExt(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

function loadImportPipeline() {
  return import('../utils/import/importPipeline')
}

type ImportStatus =
  | { phase: 'idle' }
  | { phase: 'parsing'; fileName: string; step: 'validating' | 'parsing' | 'planning'; done?: number; total?: number }
  | { phase: 'reviewing'; plan: ImportPlan; parsed: ParsedImport }
  | { phase: 'importing'; stage: 'decks' | 'add' | 'update'; done: number; total: number }
  | { phase: 'done'; added: number; updated: number; skipped: number }
  | { phase: 'error'; message: string }

async function validateImportFile(file: File, language: 'de' | 'en'): Promise<string | null> {
  const t = STRINGS[language]
  if (file.size > MAX_IMPORT_SIZE_BYTES) {
    return t.file_too_large.replace('{size}', String(Math.round(file.size / (1024 * 1024))))
  }
  const ext = getFileExt(file.name)
  if (ext === 'apkg' || ext === 'colpkg') {
    const header = new Uint8Array(await file.slice(0, 4).arrayBuffer())
    const isZip = header.length >= 2 && header[0] === 0x50 && header[1] === 0x4b
    if (!isZip) return t.invalid_package_file
  }
  return null
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function ImportView({ isOpen, onClose }: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const prefersReducedMotion = useReducedMotion()
  const [status, setStatus] = useState<ImportStatus>({ phase: 'idle' })
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state while closed so a previous success/error screen does not flash
  // briefly on the next open before the modal returns to idle.
  useEffect(() => {
    if (!isOpen) setStatus({ phase: 'idle' })
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const processing = status.phase === 'parsing' || status.phase === 'importing'
      if (e.key === 'Escape' && !processing) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, status.phase])

  const handleConflictsResolved = useCallback(
    async (resolvedPlan: ImportPlan) => {
      setStatus({ phase: 'importing', stage: 'decks', done: 0, total: resolvedPlan.newDecks.length })
      try {
        const { executeImportWithProgress } = await loadImportPipeline()
        const result = await executeImportWithProgress(resolvedPlan, progress => {
          setStatus({ phase: 'importing', stage: progress.stage, done: progress.done, total: progress.total })
        })
        setStatus({ phase: 'done', ...result })
      } catch (err) {
        setStatus({ phase: 'error', message: err instanceof Error ? err.message : t.import_db_write_error })
      }
    },
    [t.import_db_write_error]
  )

  const processFile = useCallback(async (file: File) => {
    const ext = getFileExt(file.name)
    if (!ACCEPTED_TYPES.has(ext)) {
      setStatus({ phase: 'error', message: t.import_unsupported_file.replace('{ext}', ext) })
      return
    }
    setStatus({ phase: 'parsing', fileName: file.name, step: 'validating' })
    try {
      const validationError = await validateImportFile(file, settings.language)
      if (validationError) { setStatus({ phase: 'error', message: validationError }); return }

      setStatus({ phase: 'parsing', fileName: file.name, step: 'parsing' })
      let parsed: ParsedImport
      if (ext === 'apkg' || ext === 'colpkg') {
        const { parseApkg } = await import('../utils/import/apkgImporter')
        parsed = await parseApkg(file, settings.language, settings.algorithm)
      } else {
        const { parseCsv } = await import('../utils/import/csvImporter')
        parsed = await parseCsv(file, settings.language, settings.algorithm)
      }

      setStatus({ phase: 'parsing', fileName: file.name, step: 'planning', done: 0, total: parsed.cards.length })
      const { buildImportPlan, executeImportWithProgress } = await loadImportPipeline()
      const plan = await buildImportPlan(parsed, progress => {
        setStatus({ phase: 'parsing', fileName: file.name, step: 'planning', done: progress.done, total: progress.total })
      })

      if (plan.conflicts.length > 0) {
        setStatus({ phase: 'reviewing', plan, parsed })
        return
      }

      setStatus({ phase: 'importing', stage: 'decks', done: 0, total: plan.newDecks.length })
      const result = await executeImportWithProgress(plan, progress => {
        setStatus({ phase: 'importing', stage: progress.stage, done: progress.done, total: progress.total })
      })
      setStatus({ phase: 'done', ...result })
    } catch (err) {
      setStatus({ phase: 'error', message: err instanceof Error ? err.message : t.import_unknown_error })
    }
  }, [settings.algorithm, settings.language, t.import_unknown_error, t.import_unsupported_file])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }, [processFile])

  // Conflict review takes over the whole modal area
  if (status.phase === 'reviewing') {
    return (
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
              className={UI_TOKENS.modal.overlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setStatus({ phase: 'idle' })} />
            <DuplicateReviewModal
              plan={status.plan}
              onResolved={handleConflictsResolved}
              onCancel={() => setStatus({ phase: 'idle' })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  const isProcessing = status.phase === 'parsing' || status.phase === 'importing'

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
            className={UI_TOKENS.modal.backdrop}
            onClick={() => { if (!isProcessing) onClose() }}
          />

          {/* Modal */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: prefersReducedMotion ? 0.12 : 0.2, ease: 'easeOut' }}
            className={`${UI_TOKENS.modal.shell} max-w-md`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={UI_TOKENS.modal.header}>
              <p className={UI_TOKENS.modal.title}>
                {t.import_action}
              </p>
              {!isProcessing && (
                <button onClick={onClose} className={UI_TOKENS.modal.closeButton}>
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Drop zone */}
            <div className="p-6">
              <div
                onDragOver={e => { e.preventDefault(); if (!isProcessing) setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => { if (!isProcessing) inputRef.current?.click() }}
                className={`
                  relative rounded-[2.5rem] border-2 border-dashed transition-all duration-300 ease-out min-h-[200px]
                  flex flex-col items-center justify-center gap-3 text-center px-6 py-10
                  ${isProcessing ? 'cursor-default' : 'cursor-pointer'}
                  ${isDragOver
                    ? 'scale-[1.01]'
                    : 'border-white/15 hover:border-white/30 bg-white/3'
                  }
                `}
                style={isDragOver ? { borderColor: 'var(--brand-primary)', background: 'var(--brand-primary-08)' } : undefined}
              >
                <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFileInput} />

                <AnimatePresence mode="wait" initial={false}>
                  {status.phase === 'idle' && (
                    <motion.div
                      key="idle"
                      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                      transition={{ duration: prefersReducedMotion ? 0.1 : 0.16, ease: 'easeOut' }}
                      className="flex flex-col items-center gap-3"
                    >
                      <Upload size={34} className={`transition-colors duration-300 ease-out ${isDragOver ? 'text-white' : 'text-white/25'}`} style={isDragOver ? { color: 'var(--brand-primary)' } : undefined} />
                      <div>
                        <p className="text-white/80 font-medium text-sm">{t.file_drop}</p>
                        <p className="text-white/35 text-xs mt-1">{t.click_to_select}</p>
                      </div>
                      <div className="flex items-center justify-center gap-2 flex-wrap mt-1">
                        {['.apkg', '.colpkg', '.txt', '.csv'].map(fmt => (
                          <span key={fmt} className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/40 font-mono">{fmt}</span>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {(status.phase === 'parsing' || status.phase === 'importing') && (
                    <motion.div
                      key="loading"
                      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                      transition={{ duration: prefersReducedMotion ? 0.1 : 0.16, ease: 'easeOut' }}
                      className="flex flex-col items-center gap-3"
                    >
                      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--brand-primary)' }} />
                      <p className="text-white/70 text-sm font-medium">
                        {status.phase === 'parsing' && status.step === 'validating' && t.import_validating}
                        {status.phase === 'parsing' && status.step === 'parsing' && t.reading_file}
                        {status.phase === 'parsing' && status.step === 'planning' && t.import_planning}
                        {status.phase === 'importing' && status.stage === 'decks' && t.import_creating_decks}
                        {status.phase === 'importing' && status.stage !== 'decks' && t.importing_cards}
                      </p>
                      {status.phase === 'importing' && (
                        <p className="text-white/35 text-xs">{status.done} / {status.total}</p>
                      )}
                      {status.phase === 'parsing' && status.step === 'planning' && typeof status.done === 'number' && (
                        <p className="text-white/35 text-xs">{status.done} / {status.total}</p>
                      )}
                      {((status.phase === 'importing' && status.total > 0) || (status.phase === 'parsing' && status.step === 'planning' && (status.total ?? 0) > 0)) && (
                        <div className="w-full max-w-[260px] mt-1">
                          <ProgressBar
                            current={status.phase === 'importing' ? status.done : (status.done ?? 0)}
                            total={status.phase === 'importing' ? status.total : (status.total ?? 1)}
                          />
                        </div>
                      )}
                    </motion.div>
                  )}

                  {status.phase === 'done' && (
                    <motion.div
                      key="done"
                      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                      transition={{ duration: prefersReducedMotion ? 0.1 : 0.16, ease: 'easeOut' }}
                      className="flex flex-col items-center gap-3"
                    >
                      <CheckCircle size={36} className="text-emerald-400" />
                      <p className="text-white font-semibold">{t.import_success}</p>
                      <div className="flex gap-4 text-xs">
                        <span className="text-emerald-400">+{status.added} {t.stats_new.toLowerCase()}</span>
                        {status.updated > 0 && <span className="text-sky-400">{status.updated} {t.updated}</span>}
                        {status.skipped > 0 && <span className="text-white/35">{status.skipped} {t.skipped}</span>}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); onClose() }}
                        className="mt-2 px-5 py-2 rounded-2xl border border-white/20 bg-white text-black text-sm font-black transition-all duration-300 ease-out active:scale-95 hover:bg-white/90"
                      >
                        {t.import_done}
                      </button>
                    </motion.div>
                  )}

                  {status.phase === 'error' && (
                    <motion.div
                      key="error"
                      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                      transition={{ duration: prefersReducedMotion ? 0.1 : 0.16, ease: 'easeOut' }}
                      className="flex flex-col items-center gap-3"
                    >
                      <AlertCircle size={32} className="text-rose-400" />
                      <p className="text-rose-300 font-medium text-sm">{t.import_failed}</p>
                      <p className="text-white/45 text-xs max-w-[260px]">{status.message}</p>
                      <button
                        onClick={e => { e.stopPropagation(); setStatus({ phase: 'idle' }) }}
                        className="mt-2 px-4 py-1.5 rounded-2xl border border-white/15 text-sm text-white/70 hover:text-white hover:border-white/30 transition-all duration-300 ease-out active:scale-95"
                      >
                        {t.retry}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
