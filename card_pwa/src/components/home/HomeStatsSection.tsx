/**
 * AI_CONTEXT: Home-screen React component for home Stats Section; supports dashboard, deck browsing, tag browsing, export, or quick study workflows.
 */
import { useState, type ReactNode } from 'react'
import { motion } from '../../ui/motion'
import ReviewHeatmap from '../ReviewHeatmap.tsx'
import { HomeDailyQuestTile } from './HomeDailyQuestTile'
import { HomeQuestsPanel } from './HomeQuestsPanel'
import type { GamificationProfile } from '../../types'

// 'clean' (Beleg `…23.40.53.jpeg`): Dashboard-Kachel fast komplett ausgeblendet,
// bleibt aber als Swipe-Slide erreichbar, damit mobile Nutzer wieder herauskommen.
// 'today': geführtes Heute-Paket (Video → Abruf-Check → Karten) — erster Slide.
export type HomeDashboardMode = 'today' | 'kpi' | 'heatmap' | 'pilot' | 'quests' | 'clean'

interface Props {
  t: Record<string, string>
  language: 'de' | 'en'
  /** 'carousel' = ein Slide zurzeit (historisch); 'stack' = eigener Dashboard-
   *  Modus mit ALLEN Widgets untereinander, scrollbar (Nutzerentscheidung
   *  2026-07-19). */
  layout?: 'carousel' | 'stack'
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
  onModeChange: (mode: HomeDashboardMode) => void
  /** Daily Quest (Pilot-Modus, Beleg `…23.36.20.jpeg`) */
  questSize: number
  /** true = Quest-Größe noch nicht belastbar (Vorschau lädt) — nie als
   *  „Alles erledigt“ anzeigen. */
  questLoading?: boolean
  questTopDeckName: string | null
  questHasDecks?: boolean
  questStarting: boolean
  onStartDailyQuest: () => void
  /** Heute-Paket (geführter Tagespfad Video → Abruf-Check → Karten). */
  todayPackageTile?: ReactNode
  /** Meldung, wenn das Heute-Paket offline mangels lokaler Daten fehlt. */
  todayPackageNotice?: ReactNode
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
  const className = `relative min-h-[4.25rem] min-w-0 overflow-hidden rounded-ds border border-ds-border bg-ds-floor px-3 py-2.5 text-left shadow-card before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/[0.06] ${
    interactive ? 'cursor-pointer hover:border-ds-border-hover hover:bg-ds-panel active:scale-[0.98]' : ''
  }`
  const content = (
    <>
      <div className={`font-mono text-2xl font-semibold tabular-nums leading-none ${toneClass}`}>{value}</div>
      <div className="mt-2 truncate font-mono text-[9px] uppercase tracking-[0.08em] text-ds-muted 2xl:text-xs">{label}</div>
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

const DASHBOARD_CAROUSEL_MODES: HomeDashboardMode[] = ['today', 'pilot', 'quests', 'kpi', 'heatmap', 'clean']
const DASHBOARD_LABELS: Record<HomeDashboardMode, string> = {
  today: 'Heute',
  pilot: 'Pilot',
  quests: 'Quests',
  kpi: 'KPI',
  heatmap: 'Heatmap',
  clean: 'Minimal',
}

function DashboardModeCarousel({
  mode,
  language,
  onModeChange,
  children,
}: {
  mode: HomeDashboardMode
  language: 'de' | 'en'
  onModeChange: (mode: HomeDashboardMode) => void
  children: ReactNode
}) {
  const [direction, setDirection] = useState(0)
  const activeIndex = DASHBOARD_CAROUSEL_MODES.indexOf(mode)
  const isCarouselMode = activeIndex >= 0
  const isCleanMode = mode === 'clean'

  if (!isCarouselMode) return null

  const goTo = (index: number, directionOverride?: number) => {
    const total = DASHBOARD_CAROUSEL_MODES.length
    const nextIndex = ((index % total) + total) % total
    if (nextIndex === activeIndex) return
    setDirection(directionOverride ?? (nextIndex > activeIndex ? 1 : -1))
    onModeChange(DASHBOARD_CAROUSEL_MODES[nextIndex])
  }

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number }; velocity: { x: number } },
  ) => {
    const swipeOffset = info.offset.x
    const swipeVelocity = info.velocity.x
    if (swipeOffset < -42 || swipeVelocity < -420) {
      goTo(activeIndex + 1, 1)
      return
    }
    if (swipeOffset > 42 || swipeVelocity > 420) {
      goTo(activeIndex - 1, -1)
    }
  }

  return (
    <div className="w-full min-w-0">
      <div className="overflow-hidden">
        {/* Kein exit-gated AnimatePresence (Wait-Modus ist repo-weit verboten,
            Guard: no-animatepresence-wait.test.ts): der Slide remountet über
            seinen Key nur mit Enter-Animation. */}
        <motion.div
          key={mode}
          className={isCleanMode ? 'min-h-3.5 cursor-grab active:cursor-grabbing sm:min-h-0' : 'cursor-grab active:cursor-grabbing'}
          initial={{ opacity: 0, x: direction >= 0 ? 18 : -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          dragDirectionLock
          style={{ touchAction: 'pan-y' }}
          onDragEnd={handleDragEnd}
        >
          {children}
        </motion.div>
      </div>

      <div className={`flex items-center justify-center gap-2 sm:hidden ${isCleanMode ? 'mt-0' : 'mt-2'}`} aria-label={language === 'de' ? 'Dashboard-Auswahl' : 'Dashboard selection'}>
        {DASHBOARD_CAROUSEL_MODES.map((option, index) => (
          // 44px-Touch-Ziel (unsichtbares Padding + negatives Margin), der
          // sichtbare Punkt bleibt klein.
          <button
            key={option}
            type="button"
            onClick={() => goTo(index)}
            className="group -my-3.5 flex h-11 min-w-[44px] items-center justify-center"
            aria-label={language === 'de' ? `${DASHBOARD_LABELS[option]} anzeigen` : `Show ${DASHBOARD_LABELS[option]}`}
            aria-current={activeIndex === index}
            title={DASHBOARD_LABELS[option]}
          >
            <span
              className={`h-2 rounded-full transition-all ${
                activeIndex === index ? 'w-6 bg-white' : 'w-2 bg-white/30 group-hover:bg-white/50'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

export function HomeStatsSection({
  t,
  language,
  layout = 'carousel',
  mode,
  stats,
  gamificationProfile,
  onOpenFutureForecast,
  onModeChange,
  questSize,
  questLoading = false,
  questTopDeckName,
  questHasDecks = true,
  questStarting,
  onStartDailyQuest,
  todayPackageTile,
  todayPackageNotice,
}: Props) {
  const learningReviewCount = stats ? stats.learning + stats.review : 0
  const streakValue = gamificationProfile?.currentStreak ?? 0
  const accuracyValue = gamificationProfile && gamificationProfile.totalReviews > 0
    ? `${gamificationProfile.successRate}%`
    : `${streakValue}d`
  const streakLabel = gamificationProfile && gamificationProfile.totalReviews > 0
    ? t.stats_accuracy
    : t.stats_streak
  const forecastTitle = language === 'de' ? 'Prognose der Zukunftskarten (15 Tage)' : 'Future cards forecast (15 days)'
  const statGrid = stats ? (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.14 }}
      className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 2xl:col-span-2"
    >
      <CompactStatTile label={t.stats_now_due} value={stats.nowDue} tone="orange" />
      <CompactStatTile label={t.stats_new} value={stats.new} tone="blue" />
      <CompactStatTile label={t.stats_learning_review} value={learningReviewCount} />
      <CompactStatTile
        label={streakLabel}
        value={accuracyValue}
        tone={gamificationProfile && gamificationProfile.totalReviews > 0 ? 'emerald' : 'neutral'}
        onClick={onOpenFutureForecast}
        title={forecastTitle}
      />
    </motion.div>
  ) : null

  // Dashboard als eigene Ansicht: reine Statistik-Widgets untereinander zum
  // Scrollen — KPIs, Quests, Heatmap. Heute-Paket, Lerneinheiten und Daily
  // Quest haben eigene Modi bzw. sind bewusst nicht mehr hier (2026-07-19).
  if (layout === 'stack') {
    return (
      <div className="grid w-full min-w-0 gap-2 pb-2 sm:gap-3 2xl:grid-cols-2 2xl:items-start" data-testid="dashboard-stack">
        {statGrid}
        <HomeQuestsPanel t={t} profile={gamificationProfile} />
        <ReviewHeatmap />
      </div>
    )
  }

  let dashboardContent: ReactNode = null

  if (mode === 'kpi') {
    dashboardContent = statGrid
  } else if (mode === 'today') {
    dashboardContent = (
      <div className="relative z-20 grid w-full min-w-0 gap-2 pb-1 sm:gap-3">
        {todayPackageNotice}
        {todayPackageTile ?? (
          <HomeDailyQuestTile
            language={language}
            questSize={questSize}
            loading={questLoading}
            dueTodayTotal={stats?.nowDue ?? 0}
            topDeckName={questTopDeckName}
            hasDecks={questHasDecks}
            starting={questStarting}
            onStart={onStartDailyQuest}
          />
        )}
      </div>
    )
  } else if (mode === 'pilot') {
    dashboardContent = (
      <div className="relative z-20 grid w-full min-w-0 gap-2 pb-1 sm:gap-3">
        <HomeDailyQuestTile
          language={language}
          questSize={questSize}
          loading={questLoading}
          dueTodayTotal={stats?.nowDue ?? 0}
          topDeckName={questTopDeckName}
          hasDecks={questHasDecks}
          starting={questStarting}
          onStart={onStartDailyQuest}
        />
      </div>
    )
  } else if (mode === 'quests') {
    dashboardContent = (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.14 }}
        className="w-full min-w-0"
      >
        <HomeQuestsPanel t={t} profile={gamificationProfile} />
      </motion.div>
    )
  } else if (mode === 'heatmap') {
    dashboardContent = (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <ReviewHeatmap />
      </motion.div>
    )
  } else if (mode === 'clean') {
    dashboardContent = (
      <div className="min-h-3.5 sm:min-h-0" aria-label={DASHBOARD_LABELS.clean} />
    )
  }

  if (dashboardContent === null) return null

  return (
    <DashboardModeCarousel mode={mode} language={language} onModeChange={onModeChange}>
      {dashboardContent}
    </DashboardModeCarousel>
  )
}
