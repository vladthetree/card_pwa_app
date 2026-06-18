import { motion } from 'framer-motion'
import ReviewHeatmap from '../ReviewHeatmap.tsx'
import { StatPill } from '../StatPill'
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

export function HomeStatsSection({
  t,
  language,
  mode,
  stats,
  onOpenFutureForecast,
  questSize,
  questTopDeckName,
  questStarting,
  onStartDailyQuest,
  onShowDecks,
}: Props) {
  return (
    <>
      {/* Kein delay im Fade: verzögertes Einblenden wirkte bei Re-Renders wie
          Flackern/Nachladen. */}
      {stats && mode === 'kpi' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatPill label={t.stats_total} value={stats.total} color="text-white" />
          <StatPill label={t.stats_now_due} value={stats.nowDue} color="text-[color:var(--brand-primary)]" />
          <StatPill
            label={t.stats_overdue_gt2}
            value={stats.overdueGt2Days}
            color="text-[color:var(--brand-secondary)]"
            onClick={onOpenFutureForecast}
            title={language === 'de' ? 'Prognose der Zukunftskarten (15 Tage)' : 'Future cards forecast (15 days)'}
          />
        </motion.div>
      )}

      {/* Pilot = Daily Quest (Beleg `…23.36.20.jpeg`): gemischte Session über
          mehrere Decks. Das frühere GamificationPanel bleibt als Komponente
          erhalten, der 8.-Juni-Stand zeigt im Pilot-Modus aber die Quest-Kachel. */}
      {mode === 'pilot' && (
        <div className="relative z-20 w-full pb-1">
          <HomeDailyQuestTile
            language={language}
            questSize={questSize}
            dueTodayTotal={stats?.nowDue ?? 0}
            topDeckName={questTopDeckName}
            starting={questStarting}
            onStart={onStartDailyQuest}
            onShowDecks={onShowDecks}
          />
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
