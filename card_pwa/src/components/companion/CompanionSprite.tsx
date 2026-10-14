/**
 * AI_CONTEXT: Zeigt den Begleiter-Sprite (Pixel-Art) samt Stufen-Text im Quest-Panel.
 * Reine Anzeige: Stufe kommt aus buildCompanionSnapshot(level, companion.classId). Das Bild ist dekorativ
 * (alt leer), der Stand steht als Text daneben. Die Idle-Schleife läuft nur ohne Reduced Motion (HeroSprite). Das Kopfzeilen-Abzeichen zeigt den ruhigen Skin.
 */
import { buildCompanionSnapshot } from '../../data/companionCatalog'
import { useCompanionSettings } from '../../contexts/SettingsContext'
import { HeroSprite } from '../hero/HeroSprite'

interface Props {
  t: Record<string, string>
  level: number
}

export function CompanionSprite({ t, level }: Props) {
  const companion = useCompanionSettings()
  if (!companion.enabled || !companion.showInQuests) return null
  const { stage, stageNumber, stageCount, nextStage, levelsToNext } = buildCompanionSnapshot(level, companion.classId)
  const name = t[stage.nameKey] ?? stage.id
  const nextLine = nextStage
    ? (t.companion_next ?? '').replace('{level}', String(nextStage.minLevel)).replace('{count}', String(levelsToNext))
    : t.companion_max

  return (
    <div className="flex min-w-0 items-center gap-2.5" data-testid="companion-sprite" data-stage={stage.id}>
      <div className="flex h-[104px] w-[89px] shrink-0 items-end justify-center">
        <HeroSprite classId={companion.classId} stageNumber={stageNumber} height={104} animate={companion.animationsEnabled} testId="companion-hero" />
      </div>
      <div className="min-w-0">
        <div className="truncate font-mono text-[9px] uppercase tracking-[0.08em] text-ds-muted 2xl:text-xs">
          {t.companion_label} · {stageNumber}/{stageCount}
        </div>
        <div className="truncate text-sm font-semibold text-ds-fg 2xl:text-base">{name}</div>
        <div className="truncate text-[10px] text-ds-muted 2xl:text-xs">{nextLine}</div>
      </div>
    </div>
  )
}

/**
 * Kompakte Variante für die Home-Kopfzeile: nur das Sprite, Stand im title/aria-label.
 */
export function CompanionBadge({ t, level }: Props) {
  const companion = useCompanionSettings()
  if (!companion.enabled || !companion.showInHeader) return null
  const { stage, stageNumber, stageCount } = buildCompanionSnapshot(level, companion.classId)
  const label = `${t.companion_label ?? ''}: ${t[stage.nameKey] ?? stage.id} (${stageNumber}/${stageCount}) · ${t.level_label ?? 'Level'} ${level}`

  return (
    <div
      className="-my-2 flex h-12 w-12 shrink-0 items-end justify-center sm:h-14 sm:w-14"
      role="img"
      aria-label={label}
      title={label}
      data-testid="companion-badge"
      data-stage={stage.id}
    >
      <img src={stage.sprite} alt="" draggable={false} className="h-full w-full object-contain object-bottom [image-rendering:pixelated]" />
    </div>
  )
}
