/**
 * AI_CONTEXT: Endlos-Schleife des Dungeon-Kampfs fürs Dashboard: Held steht im Idle, läuft in Pixel-Schritten vor, schlägt zu
 * (Angriffs-Frames + Klassen-Effekt), das Monster zerfällt, der Held kehrt zurück und das nächste Domänen-Monster erscheint.
 * Reine Anzeige ohne Spielwirkung. Läuft nur, solange das Dokument sichtbar ist; bei Reduced Motion, ausgeschalteter
 * Einstellung "Animationen" oder fehlenden Frames steht ein ruhiges Standbild.
 */
import { useEffect, useRef, useState } from 'react'
import { useCompanionSettings } from '../../contexts/SettingsContext'
import { HERO_ATTACK_VARIANTS } from '../../data/heroAnimationCatalog'
import { buildCompanionSnapshot } from '../../data/companionCatalog'
import { getHeroClass } from '../../data/heroClassCatalog'
import { FX_FRAME_SIZE, MONSTER_FRAME_HEIGHT, MONSTER_FRAME_SIZE, STRIP_FRAMES, getDungeonMonster, getEffectSheet } from '../../data/dungeonCatalog'
import { SECURITY_DOMAIN_NUMBERS, type SecurityDomainNumber } from '../../utils/securityDomain'
import { useReducedMotion } from '../../ui/motion'
import { HeroSprite } from './HeroSprite'
import { SpriteStrip } from './SpriteStrip'

type LoopPhase = 'idle' | 'lunge' | 'strike' | 'death' | 'return'

/** Dauer der Phasen in Millisekunden (ein Durchlauf ≈ 4 s; der Angriff hat 8 Frames bei 14 fps ≈ 570 ms). */
const PHASE_MS: Record<LoopPhase, number> = { idle: 1600, lunge: 380, strike: 360, death: 1000, return: 640 }
const PHASE_ORDER: readonly LoopPhase[] = ['idle', 'lunge', 'strike', 'death', 'return']

interface Props {
  level: number
  /** Beschriftung für Screenreader. */
  label?: string
  className?: string
}

export function DungeonLoopScene({ level, label, className = '' }: Props) {
  const companion = useCompanionSettings()
  const reducedMotion = useReducedMotion()
  const classDefinition = getHeroClass(companion.classId)
  const stageNumber = buildCompanionSnapshot(level, classDefinition.id).stageNumber
  const [domain, setDomain] = useState<SecurityDomainNumber>(classDefinition.domain)
  const [phase, setPhase] = useState<LoopPhase>('idle')
  // Zählt die Durchläufe: wechselt Angriff (4 Varianten) und Idle (2 Varianten) reihum.
  const [cycle, setCycle] = useState(0)
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden)
  const timer = useRef<number | null>(null)
  const running = companion.animationsEnabled && !reducedMotion && visible

  // Nur laufen, solange die Seite sichtbar ist (spart Akku, nichts läuft im Hintergrund).
  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (!running) {
      setPhase('idle')
      return undefined
    }
    let index = 0
    const step = () => {
      const current = PHASE_ORDER[index % PHASE_ORDER.length]
      setPhase(current)
      timer.current = window.setTimeout(() => {
        index += 1
        // Nach dem Rückweg erscheint das nächste Monster (reihum durch alle fünf Domänen).
        if (PHASE_ORDER[index % PHASE_ORDER.length] === 'idle') {
          setDomain(previous => SECURITY_DOMAIN_NUMBERS[previous % SECURITY_DOMAIN_NUMBERS.length])
          setCycle(previous => previous + 1)
        }
        step()
      }, PHASE_MS[current])
    }
    step()
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [running])

  const monster = getDungeonMonster(domain)
  const fxSheet = getEffectSheet(classDefinition.id)
  const heroLeft = phase === 'lunge' || phase === 'strike' || phase === 'death' ? '38%' : '2%'
  const attacking = phase === 'strike' || phase === 'death'
  const dead = phase === 'death' || phase === 'return'

  return (
    <div
      className={`relative h-40 w-full overflow-hidden rounded-ds border border-[#18181b] bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-800 ${className}`}
      role="img"
      aria-label={label ?? classDefinition.id}
      data-testid="dungeon-loop"
      data-phase={phase}
      data-running={running ? 'true' : 'false'}
    >
      <div className="absolute inset-x-0 bottom-0 h-6 bg-zinc-950/70" aria-hidden="true" />
      <div
        className="absolute bottom-0"
        style={{ left: heroLeft, transition: running ? `left ${phase === 'return' ? 560 : 320}ms steps(5, end)` : 'none' }}
      >
        <HeroSprite
          classId={classDefinition.id}
          stageNumber={stageNumber}
          height={170}
          mode={attacking ? 'attack' : 'idle'}
          idleVariant={cycle % 2 === 0 ? 'a' : 'b'}
          attackVariant={(cycle % HERO_ATTACK_VARIANTS) + 1}
          animate={companion.animationsEnabled}
          attackFps={14}
          testId="dungeon-loop-hero"
        />
      </div>
      <div className="absolute right-[4%]" style={{ width: 130, height: 141, bottom: -22 }}>
        {dead
          ? <SpriteStrip src={monster.death} frames={STRIP_FRAMES} frameSize={MONSTER_FRAME_SIZE} frameHeight={MONSTER_FRAME_HEIGHT} size={130} fps={12} playing={phase === 'death'} restFrame={-1} />
          : <SpriteStrip src={monster.idle} frames={STRIP_FRAMES} frameSize={MONSTER_FRAME_SIZE} frameHeight={MONSTER_FRAME_HEIGHT} size={130} fps={8} playing={running} loop />}
      </div>
      {phase === 'strike' && fxSheet && (
        <div className="absolute right-[8%]" style={{ bottom: 6 }}>
          <SpriteStrip src={fxSheet} frames={STRIP_FRAMES} frameSize={FX_FRAME_SIZE} size={130} fps={16} playing />
        </div>
      )}
    </div>
  )
}
