/**
 * AI_CONTEXT:
 * Role: Settings domain subcomponent — Learning accordion (daily goal, study modes,
 * hard-reinforcement, exam date, and scheduling-algorithm parameters).
 * Used by: SettingsModal.
 * Important: youngLapseStats/fsrsOptimizationStatus/isOptimizingFsrs are owned by the
 * parent (not local state here) so they survive this accordion section collapsing —
 * see SettingsModal's own comment on why that state stays up there.
 */
import { Brain, RefreshCw } from 'lucide-react'
import { useSettings, STRINGS } from '../../contexts/SettingsContext'
import type { YoungCardLapseStats } from '../../db/queries'
import { UI_TOKENS } from '../../constants/ui'
import { wakeDeferredSyncQueue } from '../../services/syncQueue'
import { optimizeFsrsParameters } from '../../services/fsrsOptimizer'
import {
  MIN_STUDY_CARD_LIMIT,
  MAX_STUDY_CARD_LIMIT,
  STUDY_CARD_LIMIT_STEP,
} from '../../services/studySessionPersistence'
import { InfoHint } from '../InfoHint'
import { SettingsSection } from '../SettingsSection'
import { SettingsSliderRow } from '../SettingsSliderRow'
import { SettingsSwitchRow } from '../SettingsSwitchRow'

interface Props {
  isOpen: boolean
  onToggle: () => void
  youngLapseStats: YoungCardLapseStats | null
  fsrsOptimizationStatus: string | null
  setFsrsOptimizationStatus: (status: string | null) => void
  isOptimizingFsrs: boolean
  setIsOptimizingFsrs: (value: boolean) => void
}

function ParameterLabel({ text, info }: { text: string; info: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{text}</span>
      <InfoHint label={`${text} info`} text={info} />
    </span>
  )
}

function updateNumber(value: string, updater: (nextValue: number) => void) {
  const parsed = Number(value)
  if (Number.isFinite(parsed)) {
    updater(parsed)
  }
}

export function SettingsLearningSection({
  isOpen,
  onToggle,
  youngLapseStats,
  fsrsOptimizationStatus,
  setFsrsOptimizationStatus,
  isOptimizingFsrs,
  setIsOptimizingFsrs,
}: Props) {
  const {
    settings,
    isAlgorithmMigrating,
    setAlgorithm,
    setShowReviewDecks,
    setStudyCardLimit,
    setShuffleModeEnabled,
    setNextDayStartsAt,
    setDailyGoal,
    setRecallCheckSize,
    setNewCardsPerDay,
    setExamDateIso,
    setHardPracticeEnabled,
    setHardPracticeGoodStreak,
    setHardPracticeMaxPasses,
    setLearnAheadMinutes,
    setSm2Params,
    setFsrsParams,
    resetAlgorithmParams,
  } = useSettings()
  const t = STRINGS[settings.language]

  const handleOptimizeFsrs = async () => {
    if (isOptimizingFsrs) return
    setIsOptimizingFsrs(true)
    setFsrsOptimizationStatus(settings.language === 'de' ? 'Optimiere lokal …' : 'Optimizing locally …')
    try {
      const result = await optimizeFsrsParameters()
      setFsrsParams({ w: result.parameters })
      setFsrsOptimizationStatus(settings.language === 'de'
        ? `Gespeichert: ${result.reviewCount} Reviews auf ${result.cardCount} Karten ausgewertet.`
        : `Saved: evaluated ${result.reviewCount} reviews across ${result.cardCount} cards.`)
    } catch (error) {
      setFsrsOptimizationStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setIsOptimizingFsrs(false)
    }
  }

  return (
    <SettingsSection
      title={settings.language === 'de' ? 'Lernen' : 'Learning'}
      description={settings.language === 'de' ? 'Tagesziel, Lernmodi und Lern-Algorithmus.' : 'Daily goal, study modes, and scheduling algorithm.'}
      icon={<Brain size={18} />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="pt-5 space-y-5">
        <SettingsSliderRow
          sectionLabel={t.study_stack_size}
          label={<ParameterLabel text={t.study_stack_size} info={t.study_stack_size_info} />}
          valueLabel={settings.studyCardLimit}
          value={settings.studyCardLimit}
          min={MIN_STUDY_CARD_LIMIT}
          max={MAX_STUDY_CARD_LIMIT}
          step={STUDY_CARD_LIMIT_STEP}
          onValueChange={setStudyCardLimit}
          help={t.study_weight_hint.replace('{count}', String(settings.studyCardLimit))}
        />

        <div>
          <label className="block text-xs text-white/50 font-medium mb-3 uppercase tracking-wide">
            {settings.language === 'de' ? 'Shuffle-Modus' : 'Shuffle mode'}
          </label>
          <div className={`${UI_TOKENS.surface.panelSoft} p-4`}>
            <SettingsSwitchRow
              label={settings.language === 'de' ? 'Deck-übergreifendes Lernen anzeigen' : 'Show cross-deck study mode'}
              labelClassName="text-sm font-medium text-white"
              description={settings.language === 'de'
                ? 'Blendet Shuffle-Sammlungen, den Verwalten-Shortcut und den Start aus der Home-Ansicht ein oder aus. Laufende Sessions bleiben davon unberührt.'
                : 'Show or hide shuffle collections, the manage shortcut, and the home entry point. Active sessions are left untouched.'}
              descriptionClassName="mt-1 text-xs leading-relaxed text-white/45"
              checked={settings.shuffleModeEnabled}
              onCheckedChange={setShuffleModeEnabled}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/50 font-medium mb-3 uppercase tracking-wide">
            {settings.language === 'de' ? 'Review-Decks' : 'Review decks'}
          </label>
          <div className={`${UI_TOKENS.surface.panelSoft} p-4`}>
            <SettingsSwitchRow
              label={settings.language === 'de' ? 'Review-Decks anzeigen und synchronisieren' : 'Show and sync review decks'}
              labelClassName="text-sm font-medium text-white"
              description={settings.language === 'de'
                ? 'Blendet serverseitige Review-Decks in Home und in der Sync-Deckauswahl ein. Standardmäßig bleiben sie ausgeblendet.'
                : 'Shows server-side review decks on Home and in sync deck selection. They stay hidden by default.'}
              descriptionClassName="mt-1 text-xs leading-relaxed text-white/45"
              checked={settings.showReviewDecks}
              onCheckedChange={next => {
                setShowReviewDecks(next)
                if (next) void wakeDeferredSyncQueue()
              }}
            />
          </div>
        </div>

        <SettingsSliderRow
          sectionLabel={t.daily_goal_setting}
          label={t.daily_goal_label}
          valueLabel={settings.dailyGoal === 0 ? '-' : settings.dailyGoal}
          value={settings.dailyGoal}
          min={0}
          max={200}
          step={5}
          onValueChange={setDailyGoal}
          help={t.daily_goal_setting_help}
          ariaLabel={t.daily_goal_setting}
        />

        <SettingsSliderRow
          sectionLabel={settings.language === 'de' ? 'Tag-Wechsel' : 'Day rollover'}
          label={settings.language === 'de' ? 'Neuer Lerntag beginnt um' : 'New study day starts at'}
          valueLabel={`${String(settings.nextDayStartsAt).padStart(2, '0')}:00`}
          value={settings.nextDayStartsAt}
          min={0}
          max={23}
          step={1}
          onValueChange={setNextDayStartsAt}
          help={settings.language === 'de'
            ? 'Bis zu dieser Uhrzeit zählen Reviews noch zum Vortag — verhindert Verschiebungen beim Lernen nach Mitternacht.'
            : 'Reviews before this hour still count toward the previous day — prevents shifts when studying past midnight.'}
          ariaLabel={settings.language === 'de' ? 'Tag-Wechsel-Uhrzeit' : 'Day rollover hour'}
        />

        <SettingsSliderRow
          sectionLabel={settings.language === 'de' ? 'Abruf-Check (Lernvideos)' : 'Recall check (videos)'}
          label={settings.language === 'de' ? 'Fragen pro Check' : 'Questions per check'}
          valueLabel={settings.recallCheckSize}
          value={settings.recallCheckSize}
          min={3}
          max={15}
          step={1}
          onValueChange={setRecallCheckSize}
          help={settings.language === 'de'
            ? 'Wie viele Fragen der Abruf-Check nach einem Video höchstens stellt.'
            : 'How many questions a recall check asks after a video at most.'}
          ariaLabel={settings.language === 'de' ? 'Fragen pro Abruf-Check' : 'Questions per recall check'}
        />

        <SettingsSliderRow
          sectionLabel={settings.language === 'de' ? 'Aktuelles Paket' : 'Current package'}
          label={settings.language === 'de' ? 'Karten pro aktuellem Paket' : 'Cards per current package'}
          valueLabel={settings.newCardsPerDay === 0 ? '∞' : settings.newCardsPerDay}
          value={settings.newCardsPerDay}
          min={0}
          max={50}
          step={1}
          onValueChange={setNewCardsPerDay}
          help={settings.language === 'de'
            ? 'Eigenes Kontingent für den Karten-Schritt des aktuellen Pakets. Unabhängig von „Tägliche Karten pro Deck“. 0 = unbegrenzt.'
            : 'Separate quota for the current package card step. Independent of “Daily cards per deck”. 0 = unlimited.'}
          ariaLabel={settings.language === 'de' ? 'Karten pro aktuellem Paket' : 'Cards per current package'}
        />

        <SettingsSliderRow
          sectionLabel="Learn ahead"
          label={settings.language === 'de' ? 'Lernschritte vorziehen' : 'Pull learning steps forward'}
          valueLabel={`${settings.learnAheadMinutes} min`}
          value={settings.learnAheadMinutes}
          min={0}
          max={60}
          step={5}
          onValueChange={setLearnAheadMinutes}
          help={settings.language === 'de'
            ? 'Wie bei Anki: kurze Lernschritte dürfen so viele Minuten vor Fälligkeit in die Session kommen. 0 respektiert die exakte Uhrzeit.'
            : 'Like Anki: short learning steps may enter the session this many minutes early. 0 respects the exact due time.'}
        />

        <div>
          <label className="block text-xs text-white/50 font-medium mb-3 uppercase tracking-wide">
            {settings.language === 'de' ? 'Hard-Verstärkung' : 'Hard reinforcement'}
          </label>
          <div className={`${UI_TOKENS.surface.panelSoft} space-y-4 p-4`}>
            <SettingsSwitchRow
              label={settings.language === 'de' ? 'Hard-Karten in derselben Session wiederholen' : 'Repeat Hard cards in the same session'}
              description={settings.language === 'de'
                ? 'Das reguläre Hard wird einmal gespeichert und terminiert. Weitere Durchläufe sind reine Session-Übungen und verschieben den Termin nicht erneut.'
                : 'The regular Hard is saved and scheduled once. Further passes are session-only practice and do not reschedule the card.'}
              checked={settings.hardPracticeEnabled}
              onCheckedChange={setHardPracticeEnabled}
            />
            {settings.hardPracticeEnabled && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs text-white/65">
                  {settings.language === 'de' ? 'Benötigte Gut-Serie' : 'Required Good streak'}
                  <input type="number" min={1} max={5} value={settings.hardPracticeGoodStreak} onChange={event => setHardPracticeGoodStreak(Number(event.target.value))} className="mt-1 w-full rounded-ds border border-[#18181b] bg-[#0a0a0a] px-2 py-1.5 text-white" />
                </label>
                <label className="text-xs text-white/65">
                  {settings.language === 'de' ? 'Max. Übungsdurchläufe (0 = ∞)' : 'Max practice passes (0 = ∞)'}
                  <input type="number" min={0} max={20} value={settings.hardPracticeMaxPasses} onChange={event => setHardPracticeMaxPasses(Number(event.target.value))} className="mt-1 w-full rounded-ds border border-[#18181b] bg-[#0a0a0a] px-2 py-1.5 text-white" />
                </label>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/50 font-medium mb-3 uppercase tracking-wide">
            {settings.language === 'de' ? 'Prüfungstermin' : 'Exam date'}
          </label>
          <div className={`${UI_TOKENS.surface.panelSoft} p-4`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <input
                type="date"
                value={settings.examDateIso ?? ''}
                onChange={event => { void setExamDateIso(event.target.value || null) }}
                aria-label={settings.language === 'de' ? 'Prüfungstermin' : 'Exam date'}
                className="min-h-11 flex-1 rounded-ds border border-[#18181b] bg-[#0c0c0c] px-3 font-mono text-base text-white [color-scheme:dark] focus:border-[--brand-primary-50] focus:outline-none sm:text-sm"
              />
              {settings.examDateIso && (
                <button
                  type="button"
                  onClick={() => { void setExamDateIso(null) }}
                  className="min-h-11 rounded-ds border border-[#18181b] bg-[#0c0c0c] px-3 text-sm font-semibold text-white/70 transition hover:border-[#3f3f46] hover:text-white sm:text-xs"
                >
                  {settings.language === 'de' ? 'Entfernen' : 'Clear'}
                </button>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/45">
              {settings.language === 'de'
                ? 'Zieldatum für Countdown und Lerneinheiten. Änderungen werden mit dem Lernplan und dem aktiven Profil abgeglichen.'
                : 'Target date for the countdown and learning units. Changes are reconciled with the study plan and active profile.'}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/50 font-medium mb-3 uppercase tracking-wide">
            {t.algorithm}
          </label>
          <div className="space-y-2">
            {(['fsrs', 'sm2'] as const).map(algo => (
              <button
                key={algo}
                onClick={() => setAlgorithm(algo)}
                disabled={isAlgorithmMigrating}
                className={`w-full text-left py-3 px-4 rounded-ds-xl border transition-all ${
                  settings.algorithm === algo
                    ? 'border-[--brand-primary-50] bg-[--brand-primary-08]'
                    : 'bg-[#0c0c0c] border-[#18181b] hover:bg-[#111]'
                } ${isAlgorithmMigrating ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="font-medium text-white">
                  {algo === 'sm2' ? t.sm2 : t.fsrs}
                </div>
                <div className="text-xs text-white/50 mt-1">
                  {algo === 'sm2' ? t.about_sm2 : t.about_fsrs}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Lapse-Rate junger Karten: informiert die Learning-Steps-Frage
            (Audit ⑥) — hohe Quote ⇒ Intraday-Lernschritte erwägen. */}
        {youngLapseStats && youngLapseStats.total >= 30 && (
          <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-1.5`} data-testid="young-lapse-stats">
            <p className="text-xs text-white/50 font-medium uppercase tracking-wide">
              {settings.language === 'de' ? 'Lapse-Rate junger Karten' : 'Young-card lapse rate'}
            </p>
            <p className={`font-mono text-lg font-bold ${youngLapseStats.rate >= 25 ? 'text-amber-300' : 'text-white'}`}>
              {youngLapseStats.rate} %
              <span className="ml-2 text-xs font-normal text-white/40">
                (n={youngLapseStats.total}, {settings.language === 'de' ? 'erste 3 Reviews, 30 Tage' : 'first 3 reviews, 30 days'})
              </span>
            </p>
            <p className="text-xs text-white/40 leading-relaxed">
              {settings.language === 'de'
                ? 'Anteil „Nicht gewusst" bei neuen Karten. Bleibt der Wert über ~25 %, lohnt sich das Aktivieren von FSRS-Lernschritten (kurze Intraday-Wiederholungen).'
                : 'Share of "Again" on new cards. If this stays above ~25%, enabling FSRS learning steps (short intraday repeats) is worth it.'}
            </p>
          </div>
        )}

        <details className={`${UI_TOKENS.surface.panelSoft} group/algorithm p-4`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left">
            <span>
              <span className="block text-xs text-white/50 font-medium uppercase tracking-wide">
                Algorithm Parameters (Beta)
              </span>
              <span className="mt-1 block text-xs text-white/40 leading-relaxed">
                {settings.language === 'de'
                  ? 'Nur öffnen, wenn du die Scheduler-Gewichtung bewusst feinjustieren willst.'
                  : 'Open only when you want to tune scheduler weighting deliberately.'}
              </span>
            </span>
            <span className="text-lg leading-none text-white/30 group-open/algorithm:hidden">+</span>
            <span className="hidden text-lg leading-none text-white/30 group-open/algorithm:inline">-</span>
          </summary>

          <div className="mt-4 space-y-3">
            <p className="text-xs text-white/40 leading-relaxed">
              {settings.algorithm === 'sm2' ? t.algorithm_params_hint_sm2 : t.algorithm_params_hint_fsrs}
            </p>

            {settings.algorithm === 'sm2' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-white/65">
                  <ParameterLabel text="Hard Multiplier" info={t.param_hard_multiplier_info} />
                  <input
                    type="number"
                    step="0.05"
                    value={settings.algorithmParams.sm2.hardMultiplier}
                    onChange={e => updateNumber(e.target.value, value => setSm2Params({ hardMultiplier: value }))}
                    className="mt-1 w-full rounded-ds bg-[#0a0a0a] border border-[#18181b] px-2 py-1.5 text-white"
                  />
                </label>
                <label className="text-xs text-white/65">
                  <ParameterLabel text="Easy Multiplier" info={t.param_easy_multiplier_info} />
                  <input
                    type="number"
                    step="0.05"
                    value={settings.algorithmParams.sm2.easyMultiplier}
                    onChange={e => updateNumber(e.target.value, value => setSm2Params({ easyMultiplier: value }))}
                    className="mt-1 w-full rounded-ds bg-[#0a0a0a] border border-[#18181b] px-2 py-1.5 text-white"
                  />
                </label>
                <label className="text-xs text-white/65">
                  <ParameterLabel text="Ease Again" info={t.param_ease_again_info} />
                  <input
                    type="number"
                    step="10"
                    value={settings.algorithmParams.sm2.easeAgain}
                    onChange={e => updateNumber(e.target.value, value => setSm2Params({ easeAgain: value }))}
                    className="mt-1 w-full rounded-ds bg-[#0a0a0a] border border-[#18181b] px-2 py-1.5 text-white"
                  />
                </label>
                <label className="text-xs text-white/65">
                  <ParameterLabel text="Ease Easy" info={t.param_ease_easy_info} />
                  <input
                    type="number"
                    step="10"
                    value={settings.algorithmParams.sm2.easeEasy}
                    onChange={e => updateNumber(e.target.value, value => setSm2Params({ easeEasy: value }))}
                    className="mt-1 w-full rounded-ds bg-[#0a0a0a] border border-[#18181b] px-2 py-1.5 text-white"
                  />
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                <label className="text-xs text-white/65">
                  <ParameterLabel text="Request Retention" info={t.param_request_retention_info} />
                  <input
                    type="number"
                    step="0.01"
                    value={settings.algorithmParams.fsrs.requestRetention}
                    onChange={e => updateNumber(e.target.value, value => setFsrsParams({ requestRetention: value }))}
                    className="mt-1 w-full rounded-ds bg-[#0a0a0a] border border-[#18181b] px-2 py-1.5 text-white"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => { void handleOptimizeFsrs() }}
                  disabled={isOptimizingFsrs}
                  className={`w-full ${UI_TOKENS.button.ghost} py-2 disabled:cursor-wait disabled:opacity-50`}
                >
                  {isOptimizingFsrs
                    ? (settings.language === 'de' ? 'Optimiere …' : 'Optimizing …')
                    : (settings.language === 'de' ? 'FSRS mit meiner Historie optimieren' : 'Optimize FSRS from my history')}
                </button>
                {fsrsOptimizationStatus && (
                  <p className="text-xs leading-relaxed text-white/55" role="status">{fsrsOptimizationStatus}</p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={resetAlgorithmParams}
              className={`w-full ${UI_TOKENS.button.ghost} py-2`}
            >
              Reset Algorithm Parameters
            </button>
          </div>
        </details>

        <div className={`${UI_TOKENS.surface.panelSoft} p-4 space-y-2`}>
          <p className="text-xs text-white/50 font-medium uppercase tracking-wide">
            <span className="inline-flex items-center gap-2">
              <RefreshCw size={12} strokeWidth={1.5} />
              {t.migration_section_title}
            </span>
          </p>
          <p className="text-xs text-white/40 leading-relaxed">
            {t.migration_section_description}
          </p>
        </div>
      </div>
    </SettingsSection>
  )
}
