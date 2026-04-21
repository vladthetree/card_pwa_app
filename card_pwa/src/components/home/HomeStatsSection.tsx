import { motion } from 'framer-motion'
import ReviewHeatmap from '../ReviewHeatmap.tsx'
import { StatPill } from '../StatPill'
import { GameOfLife } from './GameOfLife'
import { GamificationPanel } from './GamificationPanel'
import type { GamificationProfile } from '../../types'

export type HomeDashboardMode = 'kpi' | 'heatmap' | 'life' | 'pilot'

interface Props {
  t: Record<string, string>
  language: 'de' | 'en'
  mode: HomeDashboardMode
  stats: {
    total: number
    nowDue: number
    overdueGt2Days: number
    reviewedToday: number
    successfulToday: number
  } | null
  gameOfLifeViewMode: '2d' | '3d'
  gameOfLifeAnimationSpeed: number
  gamificationProfile: GamificationProfile | null
  onOpenFutureForecast: () => void
}

export function HomeStatsSection({
  t,
  language,
  mode,
  stats,
  gameOfLifeViewMode,
  gameOfLifeAnimationSpeed,
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

      {mode === 'life' && stats && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="relative z-20 h-[clamp(11rem,68vw,21rem)] w-full overflow-hidden rounded-2xl bg-black sm:h-[clamp(12rem,46vw,23rem)] md:h-[clamp(13rem,34vw,24rem)]"
        >
          <GameOfLife
            reviewedToday={stats.reviewedToday}
            correctToday={stats.successfulToday}
            viewMode={gameOfLifeViewMode}
            animationSpeed={gameOfLifeAnimationSpeed}
          />
        </motion.div>
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
