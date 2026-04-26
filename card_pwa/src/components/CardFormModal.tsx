import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X, Plus, Loader2, CheckCircle, Trash2, Info, Minus } from 'lucide-react'
import { db, type DeckRecord } from '../db'
import { createCard, updateCard, deleteCard } from '../db/queries'
import { STRINGS, useSettings } from '../contexts/SettingsContext'
import { QuestionParser, AnswerParser } from '../utils/cardTextParser'
import { SM2 } from '../utils/sm2'
import { UI_TOKENS } from '../constants/ui'
import { generateUuidV7 } from '../utils/id'
import { enqueueSyncOperation } from '../services/syncQueue'
import type { Card } from '../types'

type Props = {
  onClose: () => void
} & (
  | { mode: 'create'; defaultDeckId?: string }
  | { mode: 'edit'; card: Card; onSaved?: () => void; onDeleted?: () => void }
)

interface FormState {
  deckId: string
  newDeckName: string
  front: string
  back: string
  tags: string
  mnemonic: string           // Merkhilfe (both MC and non-MC)
  isMultipleChoice: boolean
  mcOptions: string[]        // dynamic answer options
  correctAnswer: string | null
  questionText: string
}

/** Extract embedded Merkhilfe from a non-MC back text */
function extractMnemonic(text: string): { backText: string; mnemonic: string } {
  const idx = text.indexOf('Merkhilfe:')
  if (idx === -1) return { backText: text, mnemonic: '' }
  return { backText: text.slice(0, idx).trim(), mnemonic: text.slice(idx + 10).trim() }
}

const inputCls =
  `${UI_TOKENS.input.base} placeholder-white/25 transition-all duration-300 ease-out`

function generateId(): string {
  return generateUuidV7()
}

function Field({ label, children, labelRight }: { label: string; children: React.ReactNode; labelRight?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs text-white/50 font-medium uppercase tracking-wide">{label}</label>
        {labelRight}
      </div>
      {children}
    </div>
  )
}

export default function CardFormModal(props: Props) {
  const { onClose } = props
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const prefersReducedMotion = useReducedMotion()

  const [decks, setDecks] = useState<DeckRecord[]>([])
  const [createNewDeck, setCreateNewDeck] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'deleting' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showTagsInfo, setShowTagsInfo] = useState(false)

  useEffect(() => {
    if (props.mode === 'create') {
      db.decks.orderBy('name').toArray().then(loaded => {
        setDecks(loaded)
        if (loaded.length === 0) setCreateNewDeck(true)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mode])

  useEffect(() => {
    if (!showTagsInfo) return

    const timer = window.setTimeout(() => {
      setShowTagsInfo(false)
    }, 3000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [showTagsInfo])

  const buildInitialForm = (): FormState => {
    if (props.mode === 'edit') {
      const parsedQuestion = QuestionParser.parse(props.card.front)
      const parsedAnswer = AnswerParser.parse(props.card.back)
      const optionValues = Object.values(parsedQuestion.options)
      const isMC = optionValues.length >= 2
      const mcOptions = isMC
        ? (optionValues.length >= 4 ? optionValues : [...optionValues, ...Array(Math.max(0, 4 - optionValues.length)).fill('')])
        : ['', '', '', '']
      const { backText, mnemonic } = isMC
        ? { backText: '', mnemonic: parsedAnswer.answer || '' }
        : extractMnemonic(props.card.back)
      return {
        deckId: '',
        newDeckName: '',
        front: parsedQuestion.question,
        back: backText,
        tags: props.card.tags.join('; '),
        mnemonic,
        isMultipleChoice: isMC,
        mcOptions,
        correctAnswer: parsedAnswer.correct,
        questionText: parsedQuestion.question,
      }
    }
    return {
      deckId: props.defaultDeckId ?? '',
      newDeckName: '',
      front: '',
      back: '',
      tags: '',
      mnemonic: '',
      isMultipleChoice: false,
      mcOptions: ['', '', '', ''],
      correctAnswer: null,
      questionText: '',
    }
  }

  const [form, setForm] = useState<FormState>(buildInitialForm)

  // Set default deckId once decks load (create mode)
  useEffect(() => {
    if (props.mode === 'create' && !form.deckId && decks.length > 0) {
      setForm(prev => ({ ...prev, deckId: decks[0].id }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decks])

  const set = useCallback((field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(prev => ({ ...prev, [field]: e.target.value })), [])

  const setCheckbox = useCallback((field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => setForm(prev => ({ ...prev, [field]: e.target.checked })), [])

  const setMcOption = useCallback((index: number) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => {
      const updated = [...prev.mcOptions]
      updated[index] = e.target.value
      return { ...prev, mcOptions: updated }
    }), [])

  const addMcOption = useCallback(() =>
    setForm(prev => ({ ...prev, mcOptions: [...prev.mcOptions, ''] })), [])

  const removeMcOption = useCallback((index: number) =>
    setForm(prev => {
      if (prev.mcOptions.length <= 2) return prev
      const updated = prev.mcOptions.filter((_, i) => i !== index)
      const removedLabel = String.fromCharCode(65 + index)
      let newCorrect = prev.correctAnswer
      if (newCorrect === removedLabel) {
        newCorrect = null
      } else if (newCorrect) {
        const correctIdx = newCorrect.charCodeAt(0) - 65
        if (correctIdx > index) newCorrect = String.fromCharCode(correctIdx - 1 + 65)
      }
      return { ...prev, mcOptions: updated, correctAnswer: newCorrect }
    }), [])

  const buildContent = (): { frontContent: string; backContent: string } | null => {
    if (form.isMultipleChoice) {
      if (!form.questionText.trim()) { setError(t.question_empty); return null }
      const filledOptions = form.mcOptions.filter(o => o.trim())
      if (filledOptions.length < 2) { setError(t.all_options_required); return null }
      if (form.mcOptions.some(o => !o.trim())) { setError(t.all_options_required); return null }
      if (!form.correctAnswer) { setError(t.choose_correct_answer); return null }
      const optionLines = form.mcOptions.map((opt, i) => `${String.fromCharCode(65 + i)}: ${opt.trim()}`)
      return {
        frontContent: [form.questionText.trim(), ...optionLines].join('\n'),
        backContent: `>> CORRECT: ${form.correctAnswer} | ${form.mnemonic.trim() || t.no_additional_info}`,
      }
    }
    const frontContent = form.front.trim()
    const backRaw = form.back.trim()
    if (!frontContent || !backRaw) { setError(t.front_back_required); return null }
    const backContent = form.mnemonic.trim()
      ? `${backRaw}\nMerkhilfe: ${form.mnemonic.trim()}`
      : backRaw
    return { frontContent, backContent }
  }

  const handleSave = async (andAnother = false) => {
    const content = buildContent()
    if (!content) return
    const { frontContent, backContent } = content

    if (props.mode === 'create') {
      let deckId = form.deckId
      if (createNewDeck) {
        const deckName = form.newDeckName.trim()
        if (!deckName) { setError(t.deck_name_empty); return }
        deckId = generateId()
        const createdAt = Date.now()
        await db.decks.add({
          id: deckId,
          name: deckName,
          createdAt,
          updatedAt: createdAt,
          source: 'manual',
        })
        await enqueueSyncOperation('deck.create', {
          id: deckId,
          name: deckName,
          createdAt,
          updatedAt: createdAt,
          source: 'manual',
        })
      }
      if (!deckId) { setError(t.choose_deck); return }

      setStatus('saving')
      setError(null)
      const result = await createCard({
        id: generateId(),
        noteId: generateId(),
        deckId,
        front: frontContent,
        back: backContent,
        tags: form.tags.split(';').map(t => t.trim()).filter(Boolean),
        extra: {
          acronym: '',
          examples: '',
          port: '',
          protocol: '',
        },
        type: SM2.CARD_TYPE_NEW,
        queue: SM2.QUEUE_NEW,
        due: Math.floor(Date.now() / 86_400_000),
        interval: 0,
        factor: SM2.DEFAULT_EASE,
        stability: settings.algorithm === 'fsrs' ? 0.5 : undefined,
        difficulty: settings.algorithm === 'fsrs' ? 5 : undefined,
        reps: 0,
        lapses: 0,
        algorithm: settings.algorithm,
      })

      if (!result.ok) { setError(result.error ?? t.unknown_error); setStatus('error'); return }
      setStatus('saved')

      if (andAnother) {
        setTimeout(() => {
          setForm(prev => ({
            ...prev,
            front: '', back: '', tags: '', mnemonic: '',
            mcOptions: ['', '', '', ''],
            correctAnswer: null, questionText: '',
          }))
          setStatus('idle')
        }, 800)
      }
    } else {
      setStatus('saving')
      setError(null)
      const result = await updateCard(props.card.id, {
        front: frontContent,
        back: backContent,
        tags: form.tags.split(';').map(t => t.trim()).filter(Boolean),
        extra: props.card.extra,
      })

      if (!result.ok) { setError(result.error ?? t.unknown_error); setStatus('error'); return }
      setStatus('saved')
      setTimeout(() => { props.onSaved?.(); onClose() }, 600)
    }
  }

  const handleDelete = async () => {
    if (props.mode !== 'edit') return
    setStatus('deleting')
    setError(null)
    const result = await deleteCard(props.card.id)
    if (!result.ok) { setError(result.error ?? t.unknown_error); setStatus('error'); return }
    props.onDeleted?.()
    onClose()
  }

  const isBusy = status === 'saving' || status === 'deleting'

  return (
    <AnimatePresence initial={false}>
      <motion.div
        className={UI_TOKENS.modal.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className={UI_TOKENS.modal.backdrop} onClick={onClose} />

        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: prefersReducedMotion ? 0.12 : 0.2, ease: 'easeOut' }}
          className={`${UI_TOKENS.modal.shell} max-w-none self-end rounded-b-none sm:max-w-lg sm:self-auto sm:rounded-b-[2rem]`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={UI_TOKENS.modal.header}>
            <h2 className={UI_TOKENS.modal.title}>
              {props.mode === 'create' ? t.new_card : t.edit_card}
            </h2>
            <button
              onClick={onClose}
              className={UI_TOKENS.modal.closeButton}
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(100dvh-env(safe-area-inset-top,0px)-12rem)]">
            {/* Deck selection — create mode only */}
            {props.mode === 'create' && (
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wide">{t.deck}</label>
                {!createNewDeck && decks.length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      value={form.deckId}
                      onChange={set('deckId')}
                      className={`${UI_TOKENS.input.base} flex-1 transition-all duration-300 ease-out`}
                    >
                      {decks.map(d => (
                        <option key={d.id} value={d.id} style={{ background: '#1a1a2e' }}>{d.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setCreateNewDeck(true)}
                      className={`${UI_TOKENS.button.ghost} px-3 py-2 rounded-[12px] text-white/50 hover:text-white`}
                    >
                      <Plus size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={form.newDeckName}
                      onChange={set('newDeckName')}
                      placeholder={t.new_deck_placeholder}
                      className={`${UI_TOKENS.input.base} flex-1 placeholder-white/25 transition-all duration-300 ease-out`}
                    />
                    {decks.length > 0 && (
                      <button
                        onClick={() => setCreateNewDeck(false)}
                        className={`${UI_TOKENS.button.ghost} px-3 py-2 rounded-[12px] text-white/50 hover:text-white`}
                      >
                        {t.existing_deck}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Multiple Choice Toggle */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isMultipleChoice}
                  onChange={setCheckbox('isMultipleChoice')}
                  className="h-5 w-5"
                />
                <span className="text-xs text-white/70 font-medium">
                  {props.mode === 'create' ? t.create_multiple_choice : t.multiple_choice_card}
                </span>
              </label>
            </div>

            {/* Form body */}
            {form.isMultipleChoice ? (
              <>
                <Field label={t.question}>
                  <textarea
                    value={form.questionText}
                    onChange={set('questionText')}
                    placeholder={t.enter_question}
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </Field>

                <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-3`}>
                  <p className="text-xs text-white/50 font-medium">{t.answer_options}</p>
                  <div className="space-y-2">
                    {form.mcOptions.map((opt, i) => {
                      const letter = String.fromCharCode(65 + i)
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="correctAnswer"
                            value={letter}
                            checked={form.correctAnswer === letter}
                            onChange={() => setForm(prev => ({ ...prev, correctAnswer: letter }))}
                            className="h-5 w-5 shrink-0 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={setMcOption(i)}
                            placeholder={`${t.option_prefix} ${letter}...`}
                            className={`${inputCls} flex-1`}
                          />
                          {form.mcOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeMcOption(i)}
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-white/30 transition-all duration-200 ease-out active:scale-[0.98] hover:bg-rose-500/10 hover:text-rose-400 sm:h-9 sm:w-9"
                              title={t.remove_answer_option}
                            >
                              <Minus size={14} strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={addMcOption}
                    className="text-xs text-white/40 hover:text-white/70 transition flex items-center gap-1.5 pt-1"
                  >
                    <Plus size={12} strokeWidth={1.5} /> {t.add_answer_option}
                  </button>
                </div>

                <Field label={t.extra_explanation_optional}>
                  <textarea
                    value={form.mnemonic}
                    onChange={set('mnemonic')}
                    placeholder={t.extra_explanation_placeholder}
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label={t.front_required}>
                  <textarea
                    value={form.front}
                    onChange={set('front')}
                    placeholder={t.front_placeholder}
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                </Field>
                <Field label={t.back_required}>
                  <textarea
                    value={form.back}
                    onChange={set('back')}
                    placeholder={t.back_placeholder}
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                </Field>
                <Field label={t.extra_explanation_optional}>
                  <textarea
                    value={form.mnemonic}
                    onChange={set('mnemonic')}
                    placeholder={t.extra_explanation_placeholder}
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </Field>
              </>
            )}

            {/* Tags */}
            <Field
              label={t.tags_label}
              labelRight={
                <button
                  type="button"
                  onClick={() => setShowTagsInfo(v => !v)}
                  className="text-white/30 hover:text-white/60 transition"
                >
                  <Info size={13} strokeWidth={1.5} />
                </button>
              }
            >
              {showTagsInfo && (
                <p className="text-xs text-white/45 mb-1.5 leading-relaxed">{t.tags_info}</p>
              )}
              <input
                value={form.tags}
                onChange={set('tags')}
                placeholder={t.tags_placeholder}
                className={inputCls}
              />
            </Field>

            {/* Algorithm info — create mode only */}
            {props.mode === 'create' && (
              <div className={`${UI_TOKENS.surface.panelSoft} p-3`}>
                <p className="text-xs text-white/50 mb-2 font-medium">{t.learning_algorithm_info}</p>
                <p className="text-sm text-white/70">
                  {t.cards_created_with.replace('{algorithm}', settings.algorithm === 'sm2' ? 'SM2' : 'FSRS')}
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-rose-400 text-sm flex items-center gap-1.5">
                <X size={13} strokeWidth={1.5} /> {error}
              </p>
            )}
          </div>

          {/* Footer */}
          {props.mode === 'create' ? (
            <div className={`${UI_TOKENS.modal.footer} px-6`}>
              <button
                onClick={() => handleSave(true)}
                disabled={isBusy || status === 'saved'}
                className={`${UI_TOKENS.button.footerSecondary} text-sm disabled:opacity-40`}
              >
                {t.save_and_more}
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={isBusy || status === 'saved'}
                className={`${UI_TOKENS.button.footerPrimary} text-sm disabled:opacity-40 flex items-center justify-center gap-2`}
              >
                {status === 'saving' && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
                {status === 'saved' && <CheckCircle size={14} strokeWidth={1.5} className="text-green-300" />}
                {status === 'idle' || status === 'error' ? t.save : status === 'saving' ? t.saving : `${t.saved}!`}
              </button>
            </div>
          ) : (
            <div className={`${UI_TOKENS.modal.footer} px-6`}>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isBusy}
                className="px-3 py-2.5 rounded-[12px] border border-red-500/30 bg-[#0c0c0c] text-sm text-red-400 hover:text-red-300 transition-all duration-200 ease-out active:scale-[0.98] disabled:opacity-40 hover:bg-red-500/10"
              >
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
              <button
                onClick={onClose}
                disabled={isBusy}
                className={`${UI_TOKENS.button.footerSecondary} text-sm disabled:opacity-40`}
              >
                {t.cancel}
              </button>
              <button
                onClick={() => handleSave()}
                disabled={isBusy}
                className={`${UI_TOKENS.button.footerPrimary} text-sm disabled:opacity-40 flex items-center justify-center gap-2`}
              >
                {status === 'saving' ? (
                  <><Loader2 size={14} strokeWidth={1.5} className="animate-spin" /> {t.saving}</>
                ) : status === 'saved' ? (
                  <><CheckCircle size={14} strokeWidth={1.5} /> {t.saved}</>
                ) : t.save}
              </button>
            </div>
          )}

          {/* Delete confirmation — edit mode only */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center"
                onClick={e => e.stopPropagation()}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-rose-950/80 border border-rose-500/30 rounded-[14px] p-6 max-w-sm shadow-modal"
                >
                  <h3 className="text-white font-black text-lg mb-2">{t.delete_card_title}</h3>
                  <p className="text-white/70 text-sm mb-6">{t.delete_card_description}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 px-4 py-2 rounded-[12px] border border-[#18181b] bg-[#0c0c0c] text-white text-sm hover:bg-[#111] hover:border-[#3f3f46] transition-all duration-200 ease-out active:scale-[0.98]"
                    >
                      {t.cancel}
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={status === 'deleting'}
                      className="flex-1 px-4 py-2 rounded-[12px] bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-all duration-200 ease-out active:scale-[0.98] disabled:opacity-40"
                    >
                      {status === 'deleting' ? t.deleting : t.yes_delete}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
