/**
 * AI_CONTEXT: Home-screen React component for home Stats Section; supports dashboard, deck browsing, tag browsing, export, or quick study workflows.
 */
import { motion } from 'framer-motion'
import ReviewHeatmap from '../ReviewHeatmap.tsx'
import { HomeDailyQuestTile } from './HomeDailyQuestTile'
import type { GamificationProfile } from '../../types'

// 'clean' (Beleg `…23.40.53.jpeg`): Dashboard-Kachel komplett ausgeblendet.
export type HomeDashboardMode = 'kpi' | 'heatmap' | 'pilot' | 'clean'

interface Props {
  t: Record<string, string>
  language: 'de' | 'en'
  mode: HomeDashboardMode
  stats: {
    total: number
    new: number
    learning: number
    review: number
    nowDue: number
    overdueGt2Days: number
  } | null
  gamificationProfile: GamificationProfile | null
  onOpenFutureForecast: () => void
  /** Daily Quest (Pilot-Modus, Beleg `…23.36.20.jpeg`) */
  questSize: number
  questTopDeckName: string | null
  questStarting: boolean
  onStartDailyQuest: () => void
  onShowDecks: () => void
}

function CompactStatTile({
  label,
  value,
  tone = 'neutral',
  onClick,
  title,
}: {
  label: string
  value: string | number
  tone?: 'neutral' | 'orange' | 'blue' | 'emerald'
  onClick?: () => void
  title?: string
}) {
  const interactive = typeof onClick === 'function'
  const toneClass = {
    neutral: 'text-zinc-200',
    orange: 'text-[--brand-primary]',
    blue: 'text-[--brand-secondary]',
    emerald: 'text-emerald-300',
  }[tone]
  const className = `min-h-[4.25rem] min-w-0 rounded-[12px] border border-[#18181b] bg-[#0a0a0a] px-3 py-2.5 text-left ${
    interactive ? 'cursor-pointer hover:border-[#3f3f46] hover:bg-[#111] active:scale-[0.98]' : ''
  }`
  const content = (
    <>
      <div className={`font-mono text-2xl font-bold tabular-nums leading-none ${toneClass}`}>{value}</div>
      <div className="mt-2 truncate font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500">{label}</div>
    </>
  )

  if (interactive) {
    return (
      <button type="button" onClick={onClick} title={title} className={className} aria-label={`${label}: ${value}`}>
        {content}
      </button>
    )
  }

  return (
    <div title={title} className={className} aria-label={`${label}: ${value}`}>
      {content}
    </div>
  )
}

export function HomeStatsSection({
  t,
  language,
  mode,
  stats,
  gamificationProfile,
  onOpenFutureForecast,
  questSize,
  questTopDeckName,
  questStarting,
  onStartDailyQuest,
  onShowDecks,
}: Props) {
  const learningReviewCount = stats ? stats.learning + stats.review : 0
  const streakValue = gamificationProfile?.currentStreak ?? 0
  const accuracyValue = gamificationProfile && gamificationProfile.totalReviews > 0
    ? `${gamificationProfile.successRate}%`
    : `${streakValue}d`
  const streakLabel = gamificationProfile && gamificationProfile.totalReviews > 0
    ? (language === 'de' ? 'Accuracy' : 'Accuracy')
    : (language === 'de' ? 'Streak' : 'Streak')
  const statGrid = stats ? (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.14 }}
      className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
    >
      <CompactStatTile label={t.stats_now_due} value={stats.nowDue} tone="orange" />
      <CompactStatTile label={t.stats_new} value={stats.new} tone="blue" />
      <CompactStatTile label={language === 'de' ? 'Lernen/Review' : 'Learning/Review'} value={learningReviewCount} />
      <CompactStatTile
        label={streakLabel}
        value={accuracyValue}
        tone={gamificationProfile && gamificationProfile.totalReviews > 0 ? 'emerald' : 'neutral'}
        onClick={onOpenFutureForecast}
        title={language === 'de' ? 'Prognose der Zukunftskarten (15 Tage)' : 'Future cards forecast (15 days)'}
      />
    </motion.div>
  ) : null

  return (
    <>
      {/* Kein delay im Fade: verzögertes Einblenden wirkte bei Re-Renders wie
          Flackern/Nachladen. */}
      {mode === 'kpi' && statGrid}

      {/* Pilot = Daily Quest (Beleg `…23.36.20.jpeg`): gemischte Session über
          mehrere Decks. Das frühere GamificationPanel bleibt als Komponente
          erhalten, der 8.-Juni-Stand zeigt im Pilot-Modus aber die Quest-Kachel. */}
      {mode === 'pilot' && (
        <div className="relative z-20 grid w-full min-w-0 gap-2 pb-1 sm:gap-3">
          <HomeDailyQuestTile
            language={language}
            questSize={questSize}
            dueTodayTotal={stats?.nowDue ?? 0}
            topDeckName={questTopDeckName}
            starting={questStarting}
            onStart={onStartDailyQuest}
            onShowDecks={onShowDecks}
          />
          {statGrid}
        </div>
      )}

      {mode === 'heatmap' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <ReviewHeatmap />
        </motion.div>
      )}
    </>
  )
}
