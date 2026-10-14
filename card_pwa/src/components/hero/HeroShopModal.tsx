/**
 * AI_CONTEXT: Ausrüstungs-Laden des Helden. Kaufen nur der Reihe nach (Stufe n braucht n−1), nur mit abgeleitetem Gold;
 * nichts wird je zurückgebucht. Rein Spiel — verändert weder FSRS noch Karten. Items sehen je Klasse anders aus (Varianten).
 */
import { useState } from 'react'
import { Dialog } from '../../ui/overlays/Dialog'
import { STRINGS } from '../../contexts/SettingsContext'
import { buildHeroItem, getVariantCount } from '../../data/heroItemCatalog'
import { type HeroClassId } from '../../data/heroClassCatalog'
import { buildHeroSkillContext } from '../../utils/heroSkills'
import { HERO_SLOTS, getNextTier, getTierPower, getTierPrice, type HeroSlot, type HeroTier } from '../../utils/heroEconomy'
import { purchaseHeroItem, setHeroEquippedTier, setHeroItemVariant } from '../../db/queries/heroLoadout'
import type { HeroSnapshot } from '../../db/queries/heroState'
import { formatTemplate } from '../../utils/formatTemplate'

interface Props {
  isOpen: boolean
  onClose: () => void
  snapshot: HeroSnapshot | null
  classId: HeroClassId
  language: 'de' | 'en'
  level: number
}

export function HeroShopModal({ isOpen, onClose, snapshot, classId, language, level }: Props) {
  const t = STRINGS[language]
  const [pickedVariant, setPickedVariant] = useState<Partial<Record<HeroSlot, number>>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (!isOpen) return null

  const state = snapshot?.state
  const loadout = snapshot?.loadout
  const balance = state?.balance ?? 0
  const fundedKeys = new Set((state?.funded ?? []).map(purchase => `${purchase.slot}:${purchase.tier}`))
  const skillEffects = state && loadout ? buildHeroSkillContext(state, loadout.skillNodeIds, classId, level).effects : new Set<string>()
  const glow = skillEffects.has('frame-glow')

  const buy = async (slot: HeroSlot, tier: HeroTier) => {
    if (busy) return
    setBusy(true)
    const variant = pickedVariant[slot] ?? 0
    const result = await purchaseHeroItem({ slot, tier, variant, balance, variantCount: getVariantCount(classId, slot, tier) })
    setBusy(false)
    if (result.ok) {
      const item = buildHeroItem(classId, slot, tier, variant)
      setMessage(formatTemplate(t.hero_shop_bought, { name: item.name[language] }))
    }
  }

  return (
    <Dialog
      title={t.hero_shop_title}
      subtitle={t.hero_shop_subtitle}
      closeLabel={language === 'de' ? 'Laden schließen' : 'Close shop'}
      onClose={onClose}
      size="lg"
      className="max-h-[calc(100dvh-4rem)] overflow-y-auto p-4 sm:p-5"
    >
      <div className="space-y-3" data-testid="hero-shop">
        <div className="flex items-center justify-between rounded-ds-xl border border-[#18181b] bg-[#0c0c0c] p-3">
          <span className="text-sm font-semibold text-amber-300" data-testid="hero-shop-balance">
            {formatTemplate(t.hero_shop_balance, { gold: balance })}
          </span>
          <span className="font-mono text-[11px] text-white/50">{t.hero_power_label}: {state?.power.total ?? 0}</span>
        </div>
        {message && <p className="text-xs text-emerald-300" role="status">{message}</p>}

        {HERO_SLOTS.map(slot => {
          const owned = (loadout?.purchases ?? []).filter(purchase => purchase.slot === slot).sort((a, b) => a.tier - b.tier)
          const nextTier = getNextTier(owned, slot)
          const equippedTier = loadout?.equipped[slot] ?? (owned.length ? owned[owned.length - 1].tier : undefined)
          const variantCount = nextTier ? getVariantCount(classId, slot, nextTier) : 0
          const variant = Math.min(pickedVariant[slot] ?? 0, Math.max(0, variantCount - 1))
          const price = nextTier ? getTierPrice(nextTier) : 0
          const affordable = nextTier !== null && balance >= price
          const equippedPurchase = owned.find(purchase => purchase.tier === equippedTier)

          return (
            <section key={slot} className="rounded-ds-xl border border-[#18181b] bg-[#0c0c0c] p-3" data-testid={`hero-slot-${slot}`}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">{t[`hero_slot_${slot}`]}</h3>

              <div className="flex items-center gap-3">
                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-ds border border-[#27272a] bg-black/40 ${glow && equippedPurchase ? 'shadow-[0_0_14px_rgba(233,196,106,0.45)]' : ''}`}>
                  {equippedPurchase
                    ? <img src={buildHeroItem(classId, slot, equippedPurchase.tier as HeroTier, equippedPurchase.variant).icon} alt="" width={56} height={56} className="h-14 w-14 object-contain [image-rendering:pixelated]" draggable={false} />
                    : <span className="text-lg text-white/20" aria-hidden="true">—</span>}
                </div>
                <div className="min-w-0 flex-1">
                  {equippedPurchase ? (
                    <>
                      <p className="truncate text-sm font-semibold text-zinc-100">{buildHeroItem(classId, slot, equippedPurchase.tier as HeroTier, equippedPurchase.variant).name[language]}</p>
                      <p className="text-[11px] text-white/50">
                        {formatTemplate(t.hero_tier_label, { tier: equippedPurchase.tier })} · {formatTemplate(t.hero_item_power, { power: getTierPower(equippedPurchase.tier) })}
                      </p>
                      {!fundedKeys.has(`${slot}:${equippedPurchase.tier}`) && <p className="text-[11px] text-amber-300">{t.hero_shop_dormant}</p>}
                    </>
                  ) : (
                    <p className="text-sm text-white/40">—</p>
                  )}
                </div>
              </div>

              {owned.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={t[`hero_slot_${slot}`]}>
                  {owned.map(purchase => (
                    <button
                      key={purchase.tier}
                      type="button"
                      onClick={() => { void setHeroEquippedTier(slot, purchase.tier as HeroTier) }}
                      aria-pressed={equippedTier === purchase.tier}
                      className={`min-h-11 min-w-11 rounded-ds border px-2 text-xs ${equippedTier === purchase.tier ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' : 'border-[#27272a] text-white/60'}`}
                    >
                      {formatTemplate(t.hero_tier_label, { tier: purchase.tier })}
                    </button>
                  ))}
                </div>
              )}

              {equippedPurchase && getVariantCount(classId, slot, equippedPurchase.tier as HeroTier) > 1 && (
                <div className="mt-2 flex items-center gap-1.5" role="group" aria-label={t.hero_shop_variant}>
                  {Array.from({ length: getVariantCount(classId, slot, equippedPurchase.tier as HeroTier) }, (_unused, v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => { void setHeroItemVariant(slot, equippedPurchase.tier as HeroTier, v, getVariantCount(classId, slot, equippedPurchase.tier as HeroTier)) }}
                      aria-pressed={equippedPurchase.variant === v}
                      aria-label={buildHeroItem(classId, slot, equippedPurchase.tier as HeroTier, v).name[language]}
                      className={`flex h-11 w-11 items-center justify-center rounded-ds border ${equippedPurchase.variant === v ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-[#27272a]'}`}
                    >
                      <img src={buildHeroItem(classId, slot, equippedPurchase.tier as HeroTier, v).icon} alt="" width={32} height={32} className="h-8 w-8 object-contain [image-rendering:pixelated]" draggable={false} />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 border-t border-[#18181b] pt-3">
                {nextTier ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5" role="group" aria-label={t.hero_shop_variant}>
                      {Array.from({ length: variantCount }, (_unused, v) => {
                        const preview = buildHeroItem(classId, slot, nextTier, v)
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setPickedVariant(current => ({ ...current, [slot]: v }))}
                            aria-pressed={variant === v}
                            aria-label={preview.name[language]}
                            title={preview.name[language]}
                            className={`flex h-12 w-12 items-center justify-center rounded-ds border ${variant === v ? 'border-[--brand-primary-50] bg-[--brand-primary-08]' : 'border-[#27272a]'}`}
                          >
                            <img src={preview.icon} alt="" width={36} height={36} className="h-9 w-9 object-contain [image-rendering:pixelated]" draggable={false} />
                          </button>
                        )
                      })}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-xs font-semibold text-zinc-100">
                        {t.hero_shop_next}: {buildHeroItem(classId, slot, nextTier, variant).name[language]}
                      </p>
                      <p className="text-[11px] text-white/50">
                        {formatTemplate(t.hero_tier_label, { tier: nextTier })} · {formatTemplate(t.hero_item_power, { power: getTierPower(nextTier) })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { void buy(slot, nextTier) }}
                      disabled={!affordable || busy}
                      data-testid={`hero-buy-${slot}`}
                      className="min-h-11 rounded-ds border border-amber-300/40 bg-amber-300/10 px-3 text-xs font-semibold text-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {affordable ? formatTemplate(t.hero_shop_buy, { price }) : formatTemplate(t.hero_shop_missing, { missing: price - balance })}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-emerald-300">{t.hero_shop_maxed}</p>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </Dialog>
  )
}
