/**
 * AI_CONTEXT: Spielt die Frame-Animation eines Helden: "idle" (zwei Varianten, Endlosschleife) und "attack" (vier Varianten,
 * einmal, danach steht der letzte Frame). Ein Streifen hat 8 Frames. Ohne Animationsdateien, bei ausgeschalteten Animationen
 * oder Reduced Motion steht der erste Frame bzw. der statische Skin. Die Idle-Schleife läuft rein per CSS (steps),
 * ohne JavaScript-Timer; nur der Angriff nutzt einen kurzen Intervall.
 */
import { useEffect, useState } from 'react'
import { useReducedMotion } from '../../ui/motion'
import { getHeroAnimation, getHeroAttackAnimation, getHeroFrameWidth, HERO_ANIMATION_FRAMES } from '../../data/heroAnimationCatalog'
import { getCompanionStages } from '../../data/companionCatalog'
import type { HeroClassId } from '../../data/heroClassCatalog'

interface Props {
  classId: HeroClassId
  /** 1-basierte Stufe des Skins (siehe getCompanionStages). */
  stageNumber: number
  /** Anzeigehöhe des Frames in CSS-Pixeln (Frame 192 × 224; die Figur selbst füllt etwa 60 % davon). */
  height: number
  mode?: 'idle' | 'attack'
  /** Idle-Schleife: "a" ruhig, "b" wach. */
  idleVariant?: 'a' | 'b'
  /** Angriff 1–4 (Werte außerhalb werden reihum gefaltet). */
  attackVariant?: number
  /** Idle-Schleife erlaubt (Einstellung "Animationen"). */
  animate?: boolean
  attackFps?: number
  /** Dauer eines Idle-Durchlaufs in Sekunden. */
  idleSeconds?: number
  onAttackDone?: () => void
  className?: string
  style?: React.CSSProperties
  testId?: string
}

export function HeroSprite({
  classId, stageNumber, height, mode = 'idle', idleVariant = 'a', attackVariant = 1, animate = true, attackFps = 14, idleSeconds = 1.6, onAttackDone, className = '', style, testId,
}: Props) {
  const reducedMotion = useReducedMotion()
  const stages = getCompanionStages(classId)
  const stage = stages[Math.min(Math.max(stageNumber, 1), stages.length) - 1]
  const idle = getHeroAnimation(classId, stageNumber, idleVariant === 'b' ? 'idle-b' : 'idle-a') || getHeroAnimation(classId, stageNumber, 'idle-a')
  const attack = getHeroAttackAnimation(classId, stageNumber, attackVariant - 1)
  const frameWidth = getHeroFrameWidth(height)
  const [attackFrame, setAttackFrame] = useState(0)
  const attacking = mode === 'attack' && Boolean(attack) && !reducedMotion

  useEffect(() => {
    if (!attacking) {
      setAttackFrame(0)
      return undefined
    }
    let index = 0
    setAttackFrame(0)
    const timer = window.setInterval(() => {
      index += 1
      if (index >= HERO_ANIMATION_FRAMES) {
        window.clearInterval(timer)
        onAttackDone?.()
        return
      }
      setAttackFrame(index)
    }, Math.max(30, Math.round(1000 / attackFps)))
    return () => window.clearInterval(timer)
    // onAttackDone bewusst nicht in den Abhängigkeiten: der Angriff soll nicht neu starten, wenn nur der Callback wechselt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attacking, attackFps, attack])

  // Der Schurke ist fast schwarz: ein schmaler violetter Saum hält ihn vom dunklen Szenenhintergrund getrennt.
  const rim = classId === 'rogue' ? { filter: 'drop-shadow(0 0 2px rgba(167,139,250,0.55))' } : undefined
  const common = { width: frameWidth, height, ...rim, ...style }

  if (attacking) {
    return (
      <div
        aria-hidden="true"
        data-testid={testId}
        data-anim="attack"
        className={`shrink-0 ${className}`}
        style={{
          ...common,
          backgroundImage: `url(${attack})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${frameWidth * HERO_ANIMATION_FRAMES}px ${height}px`,
          backgroundPosition: `${-attackFrame * frameWidth}px 0`,
          imageRendering: 'pixelated',
        }}
      />
    )
  }

  if (idle && animate && !reducedMotion) {
    return (
      <div
        aria-hidden="true"
        data-testid={testId}
        data-anim="idle"
        className={`hero-strip-idle shrink-0 ${className}`}
        style={{
          ...common,
          ['--fw' as string]: `${frameWidth}px`,
          ['--idle-dur' as string]: `${idleSeconds}s`,
          backgroundImage: `url(${idle})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${frameWidth * HERO_ANIMATION_FRAMES}px ${height}px`,
          imageRendering: 'pixelated',
        }}
      />
    )
  }

  // Statisch: erster Idle-Frame, sonst der Skin-Ausschnitt.
  if (idle) {
    return (
      <div
        aria-hidden="true"
        data-testid={testId}
        data-anim="static"
        className={`shrink-0 ${className}`}
        style={{
          ...common,
          backgroundImage: `url(${idle})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${frameWidth * HERO_ANIMATION_FRAMES}px ${height}px`,
          backgroundPosition: '0 0',
          imageRendering: 'pixelated',
        }}
      />
    )
  }

  return (
    <div aria-hidden="true" data-testid={testId} data-anim="static" className={`flex shrink-0 items-end justify-center ${className}`} style={common}>
      <img src={stage.sprite} alt="" draggable={false} style={{ height: '70%', imageRendering: 'pixelated' }} className="object-contain object-bottom" />
    </div>
  )
}
