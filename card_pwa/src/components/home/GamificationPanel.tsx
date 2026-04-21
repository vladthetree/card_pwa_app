import { motion } from 'framer-motion'
import { Award, Flame, ShieldCheck, Sparkles, Target, Trophy, Zap } from 'lucide-react'
import type { GamificationAchievement, GamificationProfile } from '../../types'

interface Props {
  language: 'de' | 'en'
  profile: GamificationProfile | null
}

const COPY = {
  de: {
    level: 'Level',
    xpToday: 'XP heute',
    streak: 'Serie',
    streakRisk: 'gefährdet',
    best: 'Bestwert',
    success: 'Trefferquote',
    dailyQuests: 'Daily Quests',
    achievements: 'Badges',
    locked: 'nächstes Ziel',
    noData: 'Schließe dein erstes Review ab, um XP, Serien und Badges zu aktivieren.',
    days: 'Tage',
  },
  en: {
    level: 'Level',
    xpToday: 'XP today',
    streak: 'Streak',
    streakRisk: 'at risk',
    best: 'best',
    success: 'success',
    dailyQuests: 'Daily quests',
    achievements: 'Badges',
    locked: 'next target',
    noData: 'Finish your first review to activate XP, streaks, and badges.',
    days: 'days',
  },
} as const

const RARITY_CLASS: Record<GamificationAchievement['rarity'], string> = {
  common: 'border-white/15 text-white/70 bg-white/[0.03]',
  rare: 'border-sky-400/30 text-sky-100 bg-sky-500/10',
  epic: 'border-amber-300/35 text-amber-100 bg-amber-400/10',
}

function clampProgress(progress: number, target: number): number {
  if (target <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((progress / target) * 100)))
}

function formatCompact(value: number, language: 'de' | 'en'): string {
  return new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-US', {
    notation: value >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value)
}

function localizeRank(title: string, language: 'de' | 'en'): string {
  if (language === 'en') return title
  const titles: Record<string, string> = {
    'Neural Architect': 'Neural Architect',
    'Recall Strategist': 'Recall-Stratege',
    'Memory Engineer': 'Memory Engineer',
    'Focus Builder': 'Fokus-Builder',
    'Review Pilot': 'Review-Pilot',
    'Warm-up Cadet': 'Warm-up-Kadett',
  }
  return titles[title] ?? title
}

function ProgressLine({
  value,
  max,
  className = 'from-[color:var(--brand-primary)] to-[color:var(--brand-secondary)]',
}: {
  value: number
  max: number
  className?: string
}) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${className}`}
        style={{ width: `${clampProgress(value, max)}%` }}
      />
    </div>
  )
}

export function GamificationPanel({ language, profile }: Props) {
  const copy = COPY[language]

  if (!profile) {
    return (
      <div className="rounded-xl border border-zinc-900 bg-black p-4">
        <div className="h-28 rounded-lg bg-white/[0.04] animate-pulse" />
      </div>
    )
  }

  const unlockedAchievements = profile.achievements.filter(item => item.unlocked)
  const nextAchievement = profile.achievements.find(item => !item.unlocked)
  const featuredAchievements = [...unlockedAchievements.slice(-2), ...(nextAchievement ? [nextAchievement] : [])].slice(-3)
  const hasProgress = profile.totalReviews > 0
  const rankTitle = localizeRank(profile.title, language)
  const primaryQuest = profile.quests[0]

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#090909] p-3 sm:rounded-xl sm:p-4"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(circle at 12% 0%, var(--brand-primary-20), transparent 30%), radial-gradient(circle at 92% 20%, var(--brand-secondary-15), transparent 34%)',
        }}
      />

      <div className="relative grid gap-2.5 sm:gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-white/45 sm:text-[10px] sm:tracking-[0.2em]">
              <Sparkles size={13} className="text-[color:var(--brand-primary)]" />
              {copy.level} {profile.level}
            </div>
            <div className="mt-0.5 truncate text-base font-black text-white sm:mt-1 sm:text-xl">{rankTitle}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-right sm:rounded-lg">
            <div className="text-sm font-black text-[color:var(--brand-primary)] sm:text-base">{formatCompact(profile.todayXp, language)}</div>
            <div className="text-[9px] uppercase tracking-[0.16em] text-white/35">{copy.xpToday}</div>
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-[10px] uppercase tracking-[0.14em] text-white/40">
            <span>{formatCompact(profile.currentLevelXp, language)} XP</span>
            <span>{formatCompact(profile.nextLevelXp, language)} XP</span>
          </div>
          <ProgressLine value={profile.currentLevelXp} max={profile.nextLevelXp} />
        </div>

        {!hasProgress && (
          <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs leading-relaxed text-white/52">
            {copy.noData}
          </div>
        )}

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <div className="rounded-xl border border-white/10 bg-black/45 p-2 sm:rounded-lg">
            <div className={`flex items-center gap-1.5 text-sm font-black ${profile.streakAtRisk ? 'text-amber-200' : 'text-orange-200'}`}>
              <Flame size={14} />
              {profile.currentStreak}
            </div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-white/35">
              {copy.streak}{profile.streakAtRisk ? ` ${copy.streakRisk}` : ''}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/45 p-2 sm:rounded-lg">
            <div className="flex items-center gap-1.5 text-sm font-black text-sky-100">
              <Trophy size={14} />
              {profile.longestStreak}
            </div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-white/35">{copy.best} {copy.days}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/45 p-2 sm:rounded-lg">
            <div className="flex items-center gap-1.5 text-sm font-black text-emerald-100">
              <ShieldCheck size={14} />
              {profile.successRate}%
            </div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-white/35">{copy.success}</div>
          </div>
        </div>

        {primaryQuest && (
          <div className="rounded-xl border border-white/10 bg-black/35 p-2.5 sm:hidden">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em]">
              <span className="flex min-w-0 items-center gap-1.5 text-white/50">
                <Target size={12} className="text-[color:var(--brand-secondary)]" />
                <span className="truncate">{primaryQuest.title}</span>
              </span>
              <span className={primaryQuest.isComplete ? 'text-emerald-300' : 'text-white/35'}>
                {primaryQuest.progress}/{primaryQuest.target}
              </span>
            </div>
            <ProgressLine
              value={primaryQuest.progress}
              max={primaryQuest.target}
              className={primaryQuest.isComplete ? 'from-emerald-300 to-emerald-500' : undefined}
            />
          </div>
        )}

        <div className="hidden gap-2 sm:grid sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-black/35 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/45">
              <Target size={13} className="text-[color:var(--brand-secondary)]" />
              {copy.dailyQuests}
            </div>
            <div className="space-y-2">
              {profile.quests.slice(0, 2).map(quest => (
                <div key={quest.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-white/70">{quest.title}</span>
                    <span className={quest.isComplete ? 'text-emerald-300' : 'text-white/35'}>
                      {quest.progress}/{quest.target}
                    </span>
                  </div>
                  <ProgressLine
                    value={quest.progress}
                    max={quest.target}
                    className={quest.isComplete ? 'from-emerald-300 to-emerald-500' : undefined}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/35 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/45">
              <Award size={13} className="text-amber-200" />
              {copy.achievements}
            </div>
            <div className="grid gap-1.5">
              {featuredAchievements.map(achievement => (
                <div
                  key={achievement.id}
                  className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 ${achievement.unlocked ? RARITY_CLASS[achievement.rarity] : 'border-white/10 bg-white/[0.02] text-white/35'}`}
                  title={achievement.description}
                >
                  <span className="truncate text-[11px]">{achievement.title}</span>
                  {achievement.unlocked ? (
                    <Zap size={12} />
                  ) : (
                    <span className="text-[9px] uppercase tracking-[0.12em]">{copy.locked}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
