/**
 * AI_CONTEXT: Settings domain subcomponent — Begleiter & Spiel (Sprites, Entwicklung, Animationen).
 * Alles hier ist Darstellung; es ändert weder FSRS noch XP. Das Level kommt aus dem
 * bestehenden Gamification-Profil, die Stufen aus data/companionCatalog.
 */
import { useState } from 'react'
import { Swords } from 'lucide-react'
import { useSettings, STRINGS } from '../../contexts/SettingsContext'
import { useGamificationProfile } from '../../hooks/useCardDb'
import { useHeroSnapshot } from '../../hooks/useHeroSnapshot'
import { buildCompanionSnapshot, getCompanionStages } from '../../data/companionCatalog'
import { HERO_CLASSES } from '../../data/heroClassCatalog'
import { SECURITY_DOMAIN_NUMBERS } from '../../utils/securityDomain'
import { EXAM_FLOOR_COUNT, ASCEND_FLOOR_COUNT } from '../../utils/heroEconomy'
import { buildFloorHintLines } from '../../utils/heroHints'
import { buildHeroSkillContext } from '../../utils/heroSkills'
import { formatTemplate } from '../../utils/formatTemplate'
import { DAY_GOLD_CAP } from '../../utils/heroEconomy'
import { SettingsSection } from '../SettingsSection'
import { SettingsSwitchRow } from '../SettingsSwitchRow'
import { HeroShopModal } from '../hero/HeroShopModal'
import { HeroSprite } from '../hero/HeroSprite'
import { SkillTreeModal } from '../hero/SkillTreeModal'

interface Props {
  isOpen: boolean
  onToggle: () => void
  presentation?: 'accordion' | 'panel'
}

export function SettingsCompanionSection({ isOpen, onToggle, presentation }: Props) {
  const { settings, setCompanionSettings } = useSettings()
  const t = STRINGS[settings.language]
  const { profile } = useGamificationProfile(settings.nextDayStartsAt)
  const level = profile?.level ?? 1
  const classId = settings.companion.classId
  const { snapshot: heroSnapshot } = useHeroSnapshot(level, settings.nextDayStartsAt)
  const [shopOpen, setShopOpen] = useState(false)
  const [skillsOpen, setSkillsOpen] = useState(false)
  const heroState = heroSnapshot?.state ?? null
  const skillContext = heroState && heroSnapshot ? buildHeroSkillContext(heroState, heroSnapshot.loadout.skillNodeIds, classId, level) : null
  const totalFloors = EXAM_FLOOR_COUNT + ASCEND_FLOOR_COUNT
  const snapshot = buildCompanionSnapshot(level, classId)
  const { companion } = settings
  const dimmed = !companion.enabled

  return (
    <SettingsSection
      title={t.companion_settings_title}
      description={t.companion_settings_desc}
      icon={<Swords size={18} />}
      isOpen={isOpen}
      onToggle={onToggle}
      presentation={presentation}
    >
      <div className="space-y-5 pt-5">
        <div className="flex items-center gap-4 rounded-ds-xl border border-[#18181b] bg-[#0c0c0c] p-3">
          <div className={`flex h-[200px] w-[172px] shrink-0 items-end justify-center ${dimmed ? 'opacity-40 grayscale' : ''}`}>
            <HeroSprite classId={classId} stageNumber={snapshot.stageNumber} height={200} animate={companion.enabled && companion.animationsEnabled} testId="companion-preview" />
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ds-muted">
              {t.companion_current_label} · {snapshot.stageNumber}/{snapshot.stageCount}
            </div>
            <div className="mt-0.5 text-lg font-semibold text-ds-fg">{t[snapshot.stage.nameKey]}</div>
            <div className="mt-1 text-xs text-white/60">
              {t.companion_settings_level.replace('{level}', String(level))}
            </div>
            <div className="mt-0.5 text-xs text-white/45">
              {snapshot.nextStage
                ? t.companion_next.replace('{level}', String(snapshot.nextStage.minLevel))
                : t.companion_max}
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-white/50">{t.hero_class_title}</h3>
          <p className="mb-3 text-xs leading-relaxed text-white/40">{t.hero_class_hint}</p>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label={t.hero_class_title}>
            {HERO_CLASSES.map(definition => {
              const selected = definition.id === classId
              const preview = buildCompanionSnapshot(level, definition.id).stage
              return (
                <button
                  key={definition.id}
                  type="button"
                  onClick={() => setCompanionSettings({ classId: definition.id })}
                  aria-pressed={selected}
                  data-testid={`hero-class-${definition.id}`}
                  className={`flex min-h-11 flex-col items-center rounded-ds-xl border p-2 text-center transition ${selected ? 'border-[--brand-primary-50] bg-[--brand-primary-08]' : 'border-[#18181b] bg-[#0c0c0c] hover:border-[#27272a]'}`}
                >
                  <img src={preview.sprite} alt="" width={80} height={96} draggable={false} className="h-24 w-20 object-contain object-bottom [image-rendering:pixelated]" />
                  <span className="mt-1 text-xs font-semibold text-zinc-100">{t[definition.nameKey]}</span>
                  <span className="mt-0.5 text-[10px] leading-snug text-white/45">{t[definition.roleKey]}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-ds-xl border border-[#18181b] bg-[#0c0c0c] p-3" data-testid="hero-panel">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-white/50">{t.hero_panel_title}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <p className="font-mono text-lg font-bold text-amber-300" data-testid="hero-gold">{heroState?.balance ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wide text-white/45">{t.hero_gold_label}</p>
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-white">{heroState?.gearPower ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wide text-white/45">{t.hero_gear_label}</p>
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-white">{heroState?.knowledge.mature ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wide text-white/45">{t.hero_knowledge_label}</p>
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-emerald-300">{heroState?.power.total ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wide text-white/45">{t.hero_power_label}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-white/45">
            {heroState && heroState.todayGold > 0 ? `${formatTemplate(t.hero_gold_today, { gold: heroState.todayGold })}${heroState.todayCapped ? ` · ${t.hero_gold_cap}` : ''} · ` : ''}
            {formatTemplate(t.hero_gold_help, { cap: DAY_GOLD_CAP })}
          </p>
          <p className="mt-1 text-[11px] text-white/35">{t.hero_power_hint}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setShopOpen(true)} data-testid="hero-open-shop" className="min-h-11 rounded-ds border border-amber-300/40 bg-amber-300/10 px-3 text-xs font-semibold text-amber-200">
              {t.hero_open_shop}
            </button>
            <button type="button" onClick={() => setSkillsOpen(true)} data-testid="hero-open-skills" className="min-h-11 rounded-ds border border-[#27272a] px-3 text-xs font-semibold text-white/80">
              {t.hero_open_skills}{skillContext ? ` (${skillContext.resolved.pointsFree})` : ''}
            </button>
          </div>

          <h4 className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-white/50">{t.hero_dungeons_title}</h4>
          <ul className="space-y-2">
            {SECURITY_DOMAIN_NUMBERS.map(domain => {
              const entry = heroState?.domains[domain]
              const open = entry?.openFloors ?? 0
              const hintLines = buildFloorHintLines(entry?.progress.hint ?? null, t)
              return (
                <li key={domain} data-testid={`hero-domain-${domain}`} className="rounded-ds border border-[#18181b] bg-black/30 p-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-zinc-100">{domain}. {t[`hero_domain_${domain}`]}</span>
                    <span className="shrink-0 font-mono text-[10px] text-white/50">{formatTemplate(t.hero_floors_open, { open, total: totalFloors })}{entry?.progress.bossCleared ? ` · ${t.hero_boss_cleared}` : ''}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10" role="presentation">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.round((open / totalFloors) * 100)}%` }} />
                  </div>
                  {hintLines.length > 0 && <p className="mt-1 text-[10px] text-white/40">{hintLines.join(' · ')}</p>}
                </li>
              )
            })}
          </ul>
        </div>

        <div className="space-y-2">
          <SettingsSwitchRow
            label={t.companion_setting_enabled}
            description={t.companion_setting_enabled_help}
            checked={companion.enabled}
            onCheckedChange={enabled => setCompanionSettings({ enabled })}
          />
          <SettingsSwitchRow
            label={t.companion_setting_header}
            description={t.companion_setting_header_help}
            checked={companion.showInHeader}
            disabled={!companion.enabled}
            onCheckedChange={showInHeader => setCompanionSettings({ showInHeader })}
          />
          <SettingsSwitchRow
            label={t.companion_setting_quests}
            description={t.companion_setting_quests_help}
            checked={companion.showInQuests}
            disabled={!companion.enabled}
            onCheckedChange={showInQuests => setCompanionSettings({ showInQuests })}
          />
          <SettingsSwitchRow
            label={t.companion_setting_loop}
            description={t.companion_setting_loop_help}
            checked={companion.dashboardLoopEnabled}
            disabled={!companion.enabled}
            onCheckedChange={dashboardLoopEnabled => setCompanionSettings({ dashboardLoopEnabled })}
          />
          <SettingsSwitchRow
            label={t.companion_setting_dungeon}
            description={t.companion_setting_dungeon_help}
            checked={companion.dungeonRunEnabled}
            disabled={!companion.enabled}
            onCheckedChange={dungeonRunEnabled => setCompanionSettings({ dungeonRunEnabled })}
          />
          <SettingsSwitchRow
            label={t.companion_setting_animations}
            description={t.companion_setting_animations_help}
            checked={companion.animationsEnabled}
            disabled={!companion.enabled}
            onCheckedChange={animationsEnabled => setCompanionSettings({ animationsEnabled })}
          />
        </div>

        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-white/50">{t.companion_stages_title}</h3>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {getCompanionStages(settings.companion.classId).map(stage => {
              const unlocked = level >= stage.minLevel
              const current = stage.id === snapshot.stage.id
              return (
                <li
                  key={stage.id}
                  data-testid={`companion-stage-${stage.id}`}
                  data-unlocked={unlocked ? 'true' : 'false'}
                  className={`flex flex-col items-center rounded-ds-xl border p-2 text-center ${
                    current ? 'border-[--brand-primary-50] bg-[--brand-primary-08]' : 'border-[#18181b] bg-[#0c0c0c]'
                  }`}
                >
                  <img
                    src={stage.sprite}
                    alt=""
                    width={80}
                    height={96}
                    draggable={false}
                    className={`h-24 w-20 object-contain object-bottom [image-rendering:pixelated] ${unlocked ? '' : 'opacity-30 grayscale'}`}
                  />
                  <span className="mt-1 text-xs font-semibold text-zinc-100">{t[stage.nameKey]}</span>
                  <span className="text-[10px] text-white/50">
                    {t.companion_stage_from_level.replace('{level}', String(stage.minLevel))}
                  </span>
                  <span className={`mt-0.5 text-[10px] ${current ? 'text-emerald-300' : 'text-white/40'}`}>
                    {current ? t.companion_stage_current : unlocked ? t.companion_stage_unlocked : t.companion_stage_locked}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      <HeroShopModal isOpen={shopOpen} onClose={() => setShopOpen(false)} snapshot={heroSnapshot} classId={classId} language={settings.language} level={level} />
      <SkillTreeModal isOpen={skillsOpen} onClose={() => setSkillsOpen(false)} snapshot={heroSnapshot} classId={classId} language={settings.language} level={level} />
    </SettingsSection>
  )
}
