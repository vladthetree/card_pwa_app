/**
 * AI_CONTEXT: Dungeon-Gang auf dem Abschlussbildschirm einer Session — nie zwischen den Karten, überspringbar.
 * Zeigt, ob durch das Gelernte eine neue Etage aufgegangen ist (Sieg), sonst einen Rückzug OHNE Verlust mit der
 * Angabe, was konkret fehlt. Liest nur (HeroSnapshot); schreibt höchstens die gesehene Etagenzahl, nie FSRS oder Gold.
 * Reduced Motion: keine Animation, direkt das Ergebnis. Die Szene wird beim ersten Laden eingefroren, damit der
 * Reload nach dem Speichern der gesehenen Etagen die laufende Szene nicht umschreibt.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSettings, STRINGS } from '../../contexts/SettingsContext'
import { useGamificationProfile } from '../../hooks/useCardDb'
import { useHeroSnapshot } from '../../hooks/useHeroSnapshot'
import { buildCompanionSnapshot } from '../../data/companionCatalog'
import { getHeroClass } from '../../data/heroClassCatalog'
import { FX_FRAME_SIZE, MONSTER_FRAME_HEIGHT, MONSTER_FRAME_SIZE, STRIP_FRAMES, getDungeonMonster, getEffectSheet } from '../../data/dungeonCatalog'
import { ASCEND_FLOOR_COUNT, EXAM_FLOOR_COUNT } from '../../utils/heroEconomy'
import { buildHeroSkillContext } from '../../utils/heroSkills'
import { buildFloorHintLines } from '../../utils/heroHints'
import { formatTemplate } from '../../utils/formatTemplate'
import { persistHeroSeenFloors } from '../../db/queries/heroLoadout'
import { useReducedMotion } from '../../ui/motion'
import type { SecurityDomainNumber } from '../../utils/securityDomain'
import { SpriteStrip } from './SpriteStrip'
import { HERO_ATTACK_VARIANTS } from '../../data/heroAnimationCatalog'
import { HeroSprite } from './HeroSprite'
import { HeroShopModal } from './HeroShopModal'

interface Props {
  /** Deck der Session (Einzel-Session). */
  deckId?: string | null
  /** Decks der Session (Shuffle); das erste mit Domäne bestimmt den Dungeon. */
  deckIds?: readonly string[]
  /** Lernziel-Codes der in dieser Session bearbeiteten Karten (für die Auswertungszeile). */
  touchedObjectives?: readonly string[]
  /**
   * Decks der tatsächlich gelernten Karten. Für gemischte Sessions (Daily Quest, Tag-Session) ohne eigene Domäne
   * bestimmt die häufigste Domäne dieser Karten den Dungeon.
   */
  reviewedDeckIds?: readonly string[]
}

type Mode = 'victory' | 'retreat' | 'clear'
type Phase = 'intro' | 'lunge' | 'fx' | 'death' | 'retreat' | 'done'

const TOTAL_FLOORS = EXAM_FLOOR_COUNT + ASCEND_FLOOR_COUNT

interface FrozenScene {
  domain: SecurityDomainNumber
  mode: Mode
  newFloors: number
  boss: boolean
  openFloors: number
}

export function DungeonRunPanel({ deckId, deckIds, touchedObjectives = [], reviewedDeckIds }: Props) {
  const { settings } = useSettings()
  const t = STRINGS[settings.language]
  const companion = settings.companion
  const enabled = companion.enabled && companion.dungeonRunEnabled
  const reducedMotion = useReducedMotion()
  const { profile } = useGamificationProfile(settings.nextDayStartsAt)
  const level = profile?.level ?? 1
  const { snapshot } = useHeroSnapshot(level, settings.nextDayStartsAt, enabled)
  const [shopOpen, setShopOpen] = useState(false)
  const frozen = useRef<FrozenScene | null>(null)
  const [phase, setPhase] = useState<Phase>('intro')
  const timers = useRef<number[]>([])

  const domain = useMemo<SecurityDomainNumber | null>(() => {
    if (!snapshot) return null
    // 1) Domäne des Session-Decks, 2) häufigste Domäne der gelernten Karten (Daily Quest u. Ä.), 3) erstes Deck mit Domäne.
    if (deckId) {
      const own = snapshot.deckDomains.get(deckId)
      if (own) return own
    }
    if (reviewedDeckIds && reviewedDeckIds.length > 0) {
      const counts = new Map<SecurityDomainNumber, number>()
      for (const id of reviewedDeckIds) {
        const found = snapshot.deckDomains.get(id)
        if (found) counts.set(found, (counts.get(found) ?? 0) + 1)
      }
      let best: SecurityDomainNumber | null = null
      for (const [candidate, count] of [...counts.entries()].sort((a, b) => a[0] - b[0])) {
        if (best === null || count > (counts.get(best) ?? 0)) best = candidate
      }
      if (best !== null) return best
    }
    for (const id of deckIds ?? []) {
      const found = snapshot.deckDomains.get(id)
      if (found) return found
    }
    return null
  }, [snapshot, deckId, deckIds, reviewedDeckIds])

  const classDefinition = getHeroClass(companion.classId)
  const skills = snapshot ? buildHeroSkillContext(snapshot.state, snapshot.loadout.skillNodeIds, classDefinition.id, level) : null
  const effects = skills?.effects
  const calm = effects?.has('calm') ?? false
  const quick = effects?.has('run-quick') ?? false

  // Szene einmal einfrieren, sobald Daten und Domäne feststehen.
  if (snapshot && domain && !frozen.current) {
    const entry = snapshot.state.domains[domain]
    const seen = snapshot.loadout.seenFloors[String(domain)]
    const newFloors = seen === undefined ? 0 : Math.max(0, entry.openFloors - seen)
    const allOpen = entry.openFloors >= TOTAL_FLOORS
    frozen.current = {
      domain,
      mode: newFloors > 0 ? 'victory' : allOpen ? 'clear' : 'retreat',
      newFloors,
      boss: newFloors > 0 && entry.progress.bossCleared && (seen ?? 0) < EXAM_FLOOR_COUNT,
      openFloors: entry.openFloors,
    }
  }
  const scene = frozen.current

  // Gesehene Etagen merken (einmal je Szene), damit ein Sieg nur einmal gefeiert wird.
  const persistedRef = useRef(false)
  useEffect(() => {
    if (!scene || persistedRef.current) return
    persistedRef.current = true
    void persistHeroSeenFloors(scene.domain, scene.openFloors)
  }, [scene])

  // Zeitlinie der Szene.
  useEffect(() => {
    if (!scene) return undefined
    timers.current.forEach(id => window.clearTimeout(id))
    timers.current = []
    if (reducedMotion || scene.mode === 'clear') {
      setPhase('done')
      return undefined
    }
    const f = quick ? 0.5 : 1
    const at = (ms: number, next: Phase) => timers.current.push(window.setTimeout(() => setPhase(next), ms * f))
    setPhase('intro')
    if (scene.mode === 'victory') {
      at(500, 'lunge')
      at(800, 'fx')
      at(1150, 'death')
      at(1900, 'done')
    } else {
      at(600, 'retreat')
      at(1400, 'done')
    }
    return () => timers.current.forEach(id => window.clearTimeout(id))
  }, [scene, reducedMotion, quick])

  if (!enabled) return null
  if (!snapshot) {
    return (
      <div className="my-4 rounded-ds border border-[#18181b] bg-ds-floor p-3 text-xs text-white/40" data-testid="dungeon-run-loading">
        {t.hero_run_loading}
      </div>
    )
  }
  if (!scene || !domain) {
    return (
      <div className="my-4 rounded-ds border border-[#18181b] bg-ds-floor p-3 text-xs text-white/50" data-testid="dungeon-run-nodomain">
        <div className="flex items-end gap-3">
          <HeroSprite classId={classDefinition.id} stageNumber={buildCompanionSnapshot(level, classDefinition.id).stageNumber} height={140} animate={companion.animationsEnabled} testId="dungeon-hero-idle" />
          <p className="pb-2">{t.hero_run_no_domain}</p>
        </div>
        <GoldLine t={t} snapshot={snapshot} onShop={() => setShopOpen(true)} />
        <HeroShopModal isOpen={shopOpen} onClose={() => setShopOpen(false)} snapshot={snapshot} classId={classDefinition.id} language={settings.language} level={level} />
      </div>
    )
  }

  const monster = getDungeonMonster(scene.domain)
  const entry = snapshot.state.domains[scene.domain]
  const heroStageNumber = buildCompanionSnapshot(level, classDefinition.id).stageNumber
  const fxSheet = getEffectSheet(classDefinition.id)
  // Der Angriff wechselt reihum (Domäne + geöffnete Etagen), damit nicht jeder Lauf gleich aussieht.
  const attackVariant = ((scene.domain + scene.openFloors) % HERO_ATTACK_VARIANTS) + 1
  const done = phase === 'done'
  const strikePhase = phase === 'fx'
  // Der Schlag läuft ab dem Effekt; im Sieg bleibt die Pose, wenn der Skilltree-Effekt "Standhaft" aktiv ist.
  const heroAttacks = phase === 'fx' || phase === 'death' || (done && scene.mode === 'victory' && Boolean(effects?.has('pose-hold')))
  const speed = quick ? 2 : 1
  const heroOffset = phase === 'lunge' || phase === 'fx' || phase === 'death'
    ? 70
    : phase === 'retreat' ? -14
      : done && scene.mode === 'victory' && effects?.has('pose-hold') ? 70 : 0
  const shake = !calm && !reducedMotion && phase === 'death'
  const aura = effects?.has('aura') ? `drop-shadow(0 0 6px ${classDefinition.accent})` : undefined
  const hintLines = scene.mode === 'retreat' ? buildFloorHintLines(entry.progress.hint, t) : []
  const banner = scene.mode === 'victory'
    ? (scene.boss ? t.hero_run_boss : formatTemplate(t.hero_run_floor_open, { floor: scene.openFloors }))
    : scene.mode === 'clear' ? t.hero_run_all_clear : t.hero_run_retreat
  const skip = () => {
    timers.current.forEach(id => window.clearTimeout(id))
    timers.current = []
    setPhase('done')
  }
  const monsterName = t[monster.nameKey]
  const showPopup = !calm && !reducedMotion && snapshot.state.todayGold > 0 && phase === 'death'

  return (
    <section className="my-4 overflow-hidden rounded-ds border border-[#27272a] bg-ds-floor text-left" data-testid="dungeon-run" data-mode={scene.mode} data-phase={phase} aria-label={t.hero_run_title}>
      <div className="flex items-center justify-between gap-2 border-b border-[#18181b] px-3 py-2">
        <h3 className="truncate text-xs font-medium uppercase tracking-wide text-white/60">{t.hero_run_title} · {scene.domain}. {t[`hero_domain_${scene.domain}`]}</h3>
        {!done && (
          <button type="button" onClick={skip} className="min-h-11 shrink-0 rounded-ds border border-[#27272a] px-3 text-xs text-white/70" data-testid="dungeon-run-skip">
            {t.hero_run_skip}
          </button>
        )}
      </div>

      <div
        className={`relative h-48 overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-800 ${shake ? 'hero-shake' : ''}`}
        role="img"
        aria-label={`${t[classDefinition.nameKey]} – ${monsterName}`}
        data-testid="dungeon-scene"
      >
        <div className="absolute inset-x-0 bottom-0 h-8 bg-zinc-950/70" aria-hidden="true" />
        {effects?.has('scene-torch') && (
          <>
            <span className="hero-torch absolute left-3 top-6 h-4 w-2 rounded-t-full bg-gradient-to-t from-orange-600 via-amber-400 to-yellow-200" aria-hidden="true" />
            <span className="hero-torch absolute right-3 top-6 h-4 w-2 rounded-t-full bg-gradient-to-t from-orange-600 via-amber-400 to-yellow-200" aria-hidden="true" />
          </>
        )}
        <div
          className={`absolute bottom-0 left-2 ${!calm && !reducedMotion && phase === 'retreat' ? 'hero-flash' : ''}`}
          // Pixel-Schritte statt weichem Gleiten: der Held "läuft" in 5 Rucken auf das Monster zu.
          style={{ transform: `translateX(${heroOffset}px)`, filter: aura, transition: reducedMotion ? 'none' : `transform ${Math.round(360 / speed)}ms steps(5, end)` }}
        >
          <HeroSprite
            classId={classDefinition.id}
            stageNumber={heroStageNumber}
            height={190}
            mode={heroAttacks ? 'attack' : 'idle'}
            attackVariant={attackVariant}
            animate={companion.animationsEnabled}
            attackFps={14 * speed}
            idleSeconds={1.6 / speed}
            testId="dungeon-hero"
          />
        </div>
        <div className="absolute right-2" style={{ width: 150, height: 162, bottom: -24 }}>
          {scene.mode === 'victory' && (phase === 'death' || done)
            // Nach dem Sieg bleiben die Überreste (letzter Frame) liegen.
            ? <SpriteStrip src={monster.death} frames={STRIP_FRAMES} frameSize={MONSTER_FRAME_SIZE} frameHeight={MONSTER_FRAME_HEIGHT} size={150} fps={12 * speed} playing={phase === 'death'} restFrame={-1} />
            : <SpriteStrip src={monster.idle} frames={STRIP_FRAMES} frameSize={MONSTER_FRAME_SIZE} frameHeight={MONSTER_FRAME_HEIGHT} size={150} fps={scene.mode === 'retreat' && phase === 'retreat' ? 14 : 8} playing={!reducedMotion && !done} loop />}
        </div>
        {strikePhase && fxSheet && (
          <div className="absolute right-8" style={{ bottom: 10 }}>
            <SpriteStrip src={fxSheet} frames={STRIP_FRAMES} frameSize={FX_FRAME_SIZE} size={150} fps={16 * speed} playing />
          </div>
        )}
        {strikePhase && effects?.has('trail') && (
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {[0, 1, 2, 3, 4].map(i => (
              <span key={i} className="hero-spark absolute h-1.5 w-1.5 bg-amber-200" style={{ left: `${34 + i * 9}%`, bottom: `${34 + (i % 3) * 14}px`, animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
        )}
        {showPopup && (
          <span className={`hero-float absolute right-16 top-8 font-mono font-bold text-amber-300 ${effects?.has('numbers-big') ? 'text-2xl' : 'text-base'}`} aria-hidden="true">
            +{snapshot.state.todayGold}
          </span>
        )}
      </div>

      <div className="space-y-1.5 px-3 py-3">
        {done && (
          <p className={`text-sm font-semibold ${scene.mode === 'retreat' ? 'text-amber-200' : 'text-emerald-300'}`} role="status" aria-live="polite" data-testid="dungeon-run-banner">
            {banner}
          </p>
        )}
        {done && hintLines.length > 0 && <p className="text-[11px] text-white/50" data-testid="dungeon-run-hint">{hintLines.join(' · ')}</p>}
        {done && effects?.has('summary-objectives') && touchedObjectives.length > 0 && (
          <p className="text-[11px] text-white/50">{formatTemplate(t.hero_run_objectives, { list: [...new Set(touchedObjectives)].sort().join(', ') })}</p>
        )}
        {done && effects?.has('summary-healed') && (
          <p className="text-[11px] text-white/50">{formatTemplate(t.hero_run_healed, { n: snapshot.state.knowledge.healed })}</p>
        )}
        <GoldLine t={t} snapshot={snapshot} onShop={() => setShopOpen(true)} />
      </div>

      <HeroShopModal isOpen={shopOpen} onClose={() => setShopOpen(false)} snapshot={snapshot} classId={classDefinition.id} language={settings.language} level={level} />
    </section>
  )
}

function GoldLine({ t, snapshot, onShop }: { t: Record<string, string>; snapshot: NonNullable<ReturnType<typeof useHeroSnapshot>['snapshot']>; onShop: () => void }) {
  const { state } = snapshot
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
      <p className="text-xs text-white/60" data-testid="dungeon-run-gold">
        <span className="font-semibold text-amber-300">{formatTemplate(t.hero_run_gold, { gold: state.todayGold })}</span>
        {' · '}
        {formatTemplate(t.hero_run_balance, { gold: state.balance })}
        {state.todayCapped ? ` · ${t.hero_gold_cap}` : ''}
      </p>
      <button type="button" onClick={onShop} className="min-h-11 rounded-ds border border-amber-300/40 bg-amber-300/10 px-3 text-xs font-semibold text-amber-200" data-testid="dungeon-run-shop">
        {t.hero_open_shop}
      </button>
    </div>
  )
}
