/**
 * AI_CONTEXT: Home-screen React component for the daily quests slide; renders
 * level/XP progress and the three quests from buildGamificationProfile.
 * Reine Anzeige der Belohnungsschleife — startet nichts und plant nichts.
 */
import type { GamificationProfile } from '../../types'

const QUEST_TITLE_KEYS: Record<string, string> = {
  'daily-review-goal': 'quest_reviews_title',
  'daily-success-goal': 'quest_success_title',
  'streak-shield': 'quest_streak_title',
}

interface Props {
  t: Record<string, string>
  profile: GamificationProfile | null
}

export function HomeQuestsPanel({ t, profile }: Props) {
  const quests = profile?.quests ?? []
  const level = profile?.level ?? 1
  const rankLabel = t[`rank_${profile?.rankTier ?? 'cadet'}`] ?? ''
  const currentLevelXp = profile?.currentLevelXp ?? 0
  const nextLevelXp = profile?.nextLevelXp ?? 0
  const levelPct = Math.max(0, Math.min(100, profile?.levelProgress ?? 0))
  const todayXp = profile?.todayXp ?? 0
  const totalXp = profile?.totalXp ?? 0

  return (
    <div
      className="relative w-full min-w-0 overflow-hidden rounded-ds border border-ds-border bg-ds-floor px-3 py-2.5 shadow-card before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/[0.06]"
      aria-label={t.quests_panel_label}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="truncate font-mono text-[9px] uppercase tracking-[0.08em] text-ds-muted">
          {t.level_label} {level} · {rankLabel}
        </div>
        <div className="shrink-0 font-mono text-[10px] tabular-nums text-emerald-300">
          {t.quest_xp_today}: +{todayXp} XP
        </div>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[--brand-primary]" style={{ width: `${levelPct}%` }} />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[9px] tabular-nums text-ds-muted">
        <span>{currentLevelXp}/{nextLevelXp} XP</span>
        <span>{t.quest_xp_total}: {totalXp.toLocaleString()} XP</span>
      </div>

      <div className="mt-2.5 grid gap-2">
        {quests.map(quest => {
          const title = t[QUEST_TITLE_KEYS[quest.id] ?? ''] ?? quest.id
          const subtitle = quest.id === 'streak-shield'
            ? (quest.isComplete ? t.quest_streak_done : t.quest_streak_open)
            : null
          const pct = quest.target === 0 ? 0 : Math.min(100, Math.round((quest.progress / quest.target) * 100))

          return (
            <div key={quest.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs text-zinc-200">{title}</span>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-ds-muted">
                    {quest.progress}/{quest.target}
                  </span>
                </div>
                {subtitle && <div className="truncate text-[10px] text-ds-muted">{subtitle}</div>}
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${quest.isComplete ? 'bg-emerald-400' : 'bg-[--brand-secondary]'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <div
                className={`shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[9px] tabular-nums ${
                  quest.isComplete ? 'border-emerald-400/40 text-emerald-300' : 'border-ds-border text-ds-muted'
                }`}
              >
                {quest.isComplete ? '✓ ' : ''}+{quest.rewardXp} XP
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
