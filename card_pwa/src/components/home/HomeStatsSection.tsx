import { motion } from 'framer-motion'
import ReviewHeatmap from '../ReviewHeatmap.tsx'
import { StatPill } from '../StatPill'
import { GamificationPanel } from './GamificationPanel'
import type { GamificationProfile } from '../../types'

export type HomeDashboardMode = 'kpi' | 'heatmap' | 'pilot'

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
}

export function HomeStatsSection({
  t,
  language,
  mode,
  stats,
  gamificationProfile,
  onOpenFutureForecast,
}: Props) {
  return (
    <>
      {stats && mode === 'kpi' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid grid-cols-3 gap-2 sm:gap-3">
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

      {mode === 'pilot' && (
        <div className="relative z-20 w-full pb-1">
          <GamificationPanel language={language} profile={gamificationProfile} />
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
