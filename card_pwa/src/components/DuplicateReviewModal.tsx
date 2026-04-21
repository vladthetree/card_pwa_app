import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, ChevronRight, ChevronLeft, SkipForward, RefreshCw } from 'lucide-react'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import type { ImportPlan, ImportedCard } from '../utils/import/types'
import { UI_TOKENS } from '../constants/ui'
import ProgressBar from './ProgressBar'

interface Props {
  plan: ImportPlan
  onResolved: (resolvedPlan: ImportPlan) => void
  onCancel: () => void
}

type Resolution = 'update' | 'skip'

export default function DuplicateReviewModal({ plan, onResolved, onCancel }: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const prefersReducedMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  // noteId → Resolution
  const [decisions, setDecisions] = useState<Record<string, Resolution>>({})

  const conflict = plan.conflicts[index]
  const total    = plan.conflicts.length
  const current  = decisions[conflict?.noteId ?? '']

  const decide = (resolution: Resolution) => {
    setDecisions(prev => ({ ...prev, [conflict.noteId]: resolution }))
  }

  const applyAll = (resolution: Resolution) => {
    const all: Record<string, Resolution> = {}
    plan.conflicts.forEach(c => { all[c.noteId] = resolution })
    setDecisions(all)
  }

  const handleConfirm = () => {
    // Karten nach Decision aufteilen
    const conflictCards = buildConflictCardMap(plan)

    const toUpdate: ImportedCard[] = []
    const toSkipExtra: ImportedCard[] = []

    for (const c of plan.conflicts) {
      const card = conflictCards[c.noteId]
      if (!card) continue
      if (decisions[c.noteId] === 'update') {
        toUpdate.push(card)
      } else {
        toSkipExtra.push(card)
      }
    }

    onResolved({
      ...plan,
      toUpdate,
      toSkip: [...plan.toSkip, ...toSkipExtra],
    })
  }

  const allDecided = plan.conflicts.every(c => decisions[c.noteId] !== undefined)
  const changeSummary = settings.language === 'de'
    ? (
        <>
          {total} Karte{total !== 1 ? 'n' : ''} aus <span className="text-white/70">{plan.sourceName}</span> {total !== 1 ? 'haben' : 'hat'} sich geändert
        </>
      )
    : (
        <>
          {total} card{total !== 1 ? 's' : ''} from <span className="text-white/70">{plan.sourceName}</span> {total !== 1 ? 'have' : 'has'} changed
        </>
      )

  return (
    <div className="w-full max-w-2xl">
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: prefersReducedMotion ? 0.12 : 0.2, ease: 'easeOut' }}
        className={`${UI_TOKENS.modal.shell} max-w-2xl`}
      >
        <div className={UI_TOKENS.modal.header}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-2xl bg-amber-500/15 flex items-center justify-center border border-amber-500/30">
              <AlertTriangle size={16} className="text-amber-300" />
            </div>
            <div>
              <h2 className={UI_TOKENS.modal.title}>{t.changed_cards_found}</h2>
              <p className={UI_TOKENS.modal.subtitle}>{changeSummary}</p>
            </div>
          </div>
        </div>

        <div className={`${UI_TOKENS.modal.body} space-y-4`}>
          <div className="flex gap-2">
          <button
            onClick={() => applyAll('skip')}
            className={`${UI_TOKENS.button.footerSecondary} text-sm`}
          >
            {t.skip_all}
          </button>
          <button
            onClick={() => applyAll('update')}
            className="flex-1 py-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-sm font-medium text-amber-300 hover:bg-amber-500/15 transition-all duration-300 ease-out active:scale-95"
          >
            {t.update_all}
          </button>
          </div>

        {/* Conflict Card */}
          {conflict && (
            <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] overflow-hidden transition-all duration-300 ease-out">
            {/* Navigations-Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30">
              <span className="text-xs text-white/40 font-mono">
                {index + 1} / {total}
              </span>
              <span className="text-xs text-white/50 truncate max-w-[60%]">
                {t.deck}: {conflict.deckName}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setIndex(i => Math.max(0, i - 1))}
                  disabled={index === 0}
                  className="p-1 rounded-2xl text-white/30 hover:text-white/60 disabled:opacity-20 transition-all duration-300 ease-out active:scale-95"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setIndex(i => Math.min(total - 1, i + 1))}
                  disabled={index === total - 1}
                  className="p-1 rounded-2xl text-white/30 hover:text-white/60 disabled:opacity-20 transition-all duration-300 ease-out active:scale-95"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="px-4 py-2 bg-black/25 border-b border-white/10">
              <ProgressBar
                current={Object.keys(decisions).length}
                total={Math.max(total, 1)}
              />
            </div>

            {/* Diff */}
            <div className="grid grid-cols-2 divide-x divide-white/10">
              <ConflictSide label={t.existing_version} side={conflict.existing} color="blue" />
              <ConflictSide label={t.new_version} side={conflict.incoming} color="amber" />
            </div>

            {/* Entscheidungs-Buttons */}
            <div className="flex gap-2 p-4 bg-black/25 border-t border-white/10">
              <button
                onClick={() => { decide('skip'); if (index < total - 1) setIndex(i => i + 1) }}
                className={`flex-1 py-2.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all duration-300 ease-out active:scale-95
                  ${current === 'skip'
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'border border-white/10 text-white/50 hover:text-white hover:border-white/20'
                  }`}
              >
                <SkipForward size={14} /> {t.skip}
              </button>
              <button
                onClick={() => { decide('update'); if (index < total - 1) setIndex(i => i + 1) }}
                className={`flex-1 py-2.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all duration-300 ease-out active:scale-95
                  ${current === 'update'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'border border-white/10 text-white/50 hover:text-amber-300 hover:border-amber-500/30'
                  }`}
              >
                <RefreshCw size={14} /> {t.update}
              </button>
            </div>
            </div>
          )}

          <div className="flex gap-3 text-xs text-white/45 px-1">
            <span>
              {Object.values(decisions).filter(d => d === 'update').length} {t.update.toLowerCase()}
            </span>
            <span>·</span>
            <span>
              {Object.values(decisions).filter(d => d === 'skip').length} {t.skip.toLowerCase()}
            </span>
            <span>·</span>
            <span>
              {total - Object.keys(decisions).length} {t.open}
            </span>
          </div>
        </div>

        <div className={UI_TOKENS.modal.footer}>
          <button
            onClick={onCancel}
            className={`${UI_TOKENS.button.footerSecondary} text-sm`}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!allDecided}
            className={`flex-1 py-2.5 rounded-2xl text-sm font-black text-white transition-all duration-300 ease-out active:scale-95
              ${allDecided
                ? 'cursor-pointer border border-white/20 bg-white text-black hover:bg-white/90'
                : 'opacity-40 cursor-not-allowed border border-white/10 bg-white/5 text-white/65'
              }`}
          >
            {t.confirm_import}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ConflictSide({
  label,
  side,
  color,
}: {
  label: string
  side: { front: string; back: string }
  color: 'blue' | 'amber'
}) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const cls = color === 'blue' ? 'text-blue-400' : 'text-amber-400'
  return (
    <div className="p-4 space-y-3">
      <p className={`text-xs font-black uppercase tracking-wider ${cls}`}>{label}</p>
      <div>
        <p className="text-[10px] text-white/30 mb-0.5">{t.front_side}</p>
        <p className="text-sm text-white/90 leading-relaxed">{side.front || '–'}</p>
      </div>
      <div>
        <p className="text-[10px] text-white/30 mb-0.5">{t.back_side}</p>
        <p className="text-sm text-white/70 leading-relaxed">{side.back || '–'}</p>
      </div>
    </div>
  )
}

/** Baut eine Map noteId → ImportedCard aus dem Plan */
function buildConflictCardMap(plan: ImportPlan): Record<string, import('../utils/import/types').ImportedCard> {
  const all = [...plan.toAdd, ...plan.toSkip]
  const map: Record<string, import('../utils/import/types').ImportedCard> = {}

  // Wir brauchen die ursprünglichen conflict-Karten aus der parsed-Liste
  // Diese sind in toSkip wenn noch nicht entschieden, also als Plan-Konflikte mitliefern
  // Der Plan hat aber nur conflicts[] mit noteId → wir nutzen die incoming-Daten
  for (const c of plan.conflicts) {
    // Baue eine ImportedCard aus den incoming-Daten des Konflikts
    map[c.noteId] = {
      id:       c.cardId,
      noteId:   c.noteId,
      deckId:   '',  // wird vom Update-Query nicht benötigt
      front:    c.incoming.front,
      back:     c.incoming.back,
      tags:     Array.from(new Set([...(c.existingTags ?? []), ...(c.incomingTags ?? [])])),
      extra:    { acronym: '', examples: '', port: '', protocol: '' },
      type:     0, queue: 0, due: 0, interval: 0,
      factor:   2500, reps: 0, lapses: 0,
      createdAt: Date.now(),
    }
  }
  // Überschreibe mit echten Daten falls in toAdd vorhanden
  for (const card of all) {
    if (map[card.noteId]) map[card.noteId] = card
  }
  return map
}
