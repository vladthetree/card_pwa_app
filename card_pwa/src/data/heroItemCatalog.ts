/**
 * AI_CONTEXT: Item-Katalog des Helden. Ein Item ist durch (Klasse, Slot, Stufe, Variante) bestimmt;
 * gespeichert wird nur Slot/Stufe/Variante — beim Klassenwechsel "schmiedet" sich die Optik kostenlos um.
 * Namen entstehen aus Qualitätswort (Stufe) + Icon-Substantiv, damit Name und Bild immer zusammenpassen.
 * Macht und Preis hängen nur an der Stufe (utils/heroEconomy), nie an Klasse oder Variante.
 */
import { getHeroClass, HERO_CLASSES, type HeroArchetype, type HeroClassId } from './heroClassCatalog'
import { getTierPower, getTierPrice, HERO_SLOTS, type HeroSlot, type HeroTier } from '../utils/heroEconomy'

const ICON_URLS = import.meta.glob('../assets/hero/items/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

function iconUrl(key: string): string {
  return ICON_URLS[`../assets/hero/items/${key}.png`] ?? ''
}

type Gender = 'm' | 'f' | 'n'
/** [deutsch, Geschlecht, englisch] je Icon. */
const ICON_NOUNS: Record<string, readonly [string, Gender, string]> = {
  'weapon-01': ['Holzschwert', 'n', 'wooden sword'], 'weapon-02': ['Speer', 'm', 'spear'], 'weapon-03': ['Beil', 'n', 'hatchet'], 'weapon-04': ['Knüppel', 'm', 'club'],
  'weapon-05': ['Dunkelschwert', 'n', 'dark sword'], 'weapon-06': ['Streitbeil', 'n', 'battle axe'], 'weapon-07': ['Stachelkeule', 'f', 'spiked mace'], 'weapon-08': ['Eisenspeer', 'm', 'iron spear'],
  'weapon-09': ['Stahlschwert', 'n', 'steel sword'], 'weapon-10': ['Doppelaxt', 'f', 'double axe'], 'weapon-11': ['Kriegshammer', 'm', 'war hammer'], 'weapon-12': ['Hellebarde', 'f', 'halberd'],
  'weapon-13': ['Silberschwert', 'n', 'silver sword'], 'weapon-14': ['Schwarzaxt', 'f', 'black axe'], 'weapon-15': ['Kristallhammer', 'm', 'crystal hammer'], 'weapon-16': ['Goldschwert', 'n', 'gold sword'],
  'focus-01': ['Krummstab', 'm', 'crooked staff'], 'focus-02': ['Lederstab', 'm', 'leather staff'], 'focus-03': ['Wickelstab', 'm', 'wrapped staff'], 'focus-04': ['Quarz', 'm', 'quartz'],
  'focus-05': ['Holzstab', 'm', 'wooden staff'], 'focus-06': ['Eisenstab', 'm', 'iron staff'], 'focus-07': ['Zauberbuch', 'n', 'spellbook'], 'focus-08': ['Graukristall', 'm', 'grey crystal'],
  'focus-09': ['Saphirstab', 'm', 'sapphire staff'], 'focus-10': ['Runenbuch', 'n', 'rune book'], 'focus-11': ['Silberzepter', 'n', 'silver scepter'], 'focus-12': ['Glaskugel', 'f', 'glass orb'],
  'focus-13': ['Goldstab', 'm', 'gold staff'], 'focus-14': ['Obsidianbuch', 'n', 'obsidian tome'], 'focus-15': ['Funkenstab', 'm', 'spark wand'], 'focus-16': ['Sternstab', 'm', 'star wand'],
  'head-01': ['Tuchkapuze', 'f', 'cloth hood'], 'head-02': ['Lederkappe', 'f', 'leather cap'], 'head-03': ['Fellkapuze', 'f', 'fur hood'], 'head-04': ['Hexenhut', 'm', 'witch hat'],
  'head-05': ['Eisenhut', 'm', 'iron hat'], 'head-06': ['Eisenhelm', 'm', 'iron helm'], 'head-07': ['Nasalhelm', 'm', 'nasal helm'], 'head-08': ['Kettenhaube', 'f', 'chain coif'],
  'head-09': ['Großhelm', 'm', 'great helm'], 'head-10': ['Stahlhelm', 'm', 'steel helm'], 'head-11': ['Magierhut', 'm', 'mage hat'], 'head-12': ['Stirnreif', 'm', 'circlet'],
  'head-13': ['Paladinhelm', 'm', 'paladin helm'], 'head-14': ['Hörnerhelm', 'm', 'horned helm'], 'head-15': ['Kristallkrone', 'f', 'crystal crown'], 'head-16': ['Sonnenhelm', 'm', 'sun helm'],
  'chest-01': ['Tunika', 'f', 'tunic'], 'chest-02': ['Lederwams', 'n', 'leather jerkin'], 'chest-03': ['Gambeson', 'n', 'gambeson'], 'chest-04': ['Schattenmantel', 'm', 'shadow cloak'],
  'chest-05': ['Eisenbrust', 'f', 'iron breastplate'], 'chest-06': ['Kettenhemd', 'n', 'chain shirt'], 'chest-07': ['Nietenleder', 'n', 'studded leather'], 'chest-08': ['Schuppenpanzer', 'm', 'scale armor'],
  'chest-09': ['Stahlkürass', 'm', 'steel cuirass'], 'chest-10': ['Waffenrock', 'm', 'tabard'], 'chest-11': ['Magierrobe', 'f', 'mage robe'],
  'chest-13': ['Goldplatte', 'f', 'gold plate'], 'chest-14': ['Obsidianplatte', 'f', 'obsidian plate'], 'chest-15': ['Kristallharnisch', 'm', 'crystal armor'], 'chest-16': ['Sonnenplatte', 'f', 'sun plate'],
  'shield-02': ['Rundschild', 'm', 'round shield'], 'shield-03': ['Ovalschild', 'm', 'oval shield'], 'shield-04': ['Holzschild', 'm', 'wooden shield'],
  'shield-05': ['Eisenbuckler', 'm', 'iron buckler'], 'shield-06': ['Eisenschild', 'm', 'iron shield'], 'shield-07': ['Turmschild', 'm', 'tower shield'], 'shield-08': ['Buckler', 'm', 'buckler'],
  'shield-09': ['Stahlschild', 'm', 'steel shield'], 'shield-10': ['Stahlkite', 'm', 'steel kite'], 'shield-11': ['Stahlturm', 'm', 'steel tower'], 'shield-12': ['Kristallbuckler', 'm', 'crystal buckler'],
  'shield-13': ['Sonnenschild', 'm', 'sun shield'], 'shield-14': ['Obsidianschild', 'm', 'obsidian shield'], 'shield-15': ['Kristallschild', 'm', 'crystal shield'], 'shield-16': ['Goldschild', 'm', 'gold shield'],
  'relic-01': ['Wurzelamulett', 'n', 'root charm'], 'relic-02': ['Kupferring', 'm', 'copper ring'], 'relic-03': ['Rotphiole', 'f', 'red vial'], 'relic-04': ['Knochenfigur', 'f', 'bone figurine'],
  'relic-05': ['Eisenring', 'm', 'iron ring'], 'relic-06': ['Eisenamulett', 'n', 'iron amulet'], 'relic-07': ['Heiltrank', 'm', 'healing draught'], 'relic-08': ['Eisenscheibe', 'f', 'iron disc'],
  'relic-09': ['Siegelring', 'm', 'signet ring'], 'relic-10': ['Stahlamulett', 'n', 'steel amulet'], 'relic-11': ['Blauphiole', 'f', 'blue vial'], 'relic-12': ['Stachelstern', 'm', 'spike star'],
  'relic-13': ['Goldring', 'm', 'gold ring'], 'relic-14': ['Sonnenamulett', 'n', 'sun amulet'], 'relic-15': ['Obsidianring', 'm', 'obsidian ring'], 'relic-16': ['Leuchtkugel', 'f', 'glow orb'],
}

/** Qualitätswort je Stufe: deutsche Endungen [m, f, n] und englisches Adjektiv. */
const TIER_WORDS: Record<HeroTier, { de: readonly [string, string, string]; en: string }> = {
  1: { de: ['Einfacher', 'Einfache', 'Einfaches'], en: 'Plain' },
  2: { de: ['Robuster', 'Robuste', 'Robustes'], en: 'Sturdy' },
  3: { de: ['Feiner', 'Feine', 'Feines'], en: 'Fine' },
  4: { de: ['Edler', 'Edle', 'Edles'], en: 'Noble' },
  5: { de: ['Legendärer', 'Legendäre', 'Legendäres'], en: 'Legendary' },
}
const GENDER_INDEX: Record<Gender, 0 | 1 | 2> = { m: 0, f: 1, n: 2 }

type TierIcons = Record<HeroTier, readonly string[]>

/** Icon-Auswahl (2–3 Varianten je Stufe) je Itemfamilie und Slot. Spätere Stufen sehen sichtbar besser aus. */
const ICONS: Record<HeroArchetype, Record<HeroSlot, TierIcons>> = {
  heavy: {
    weapon: { 1: ['weapon-01', 'weapon-03', 'weapon-04'], 2: ['weapon-05', 'weapon-06', 'weapon-07'], 3: ['weapon-09', 'weapon-10', 'weapon-11'], 4: ['weapon-13', 'weapon-14', 'weapon-12'], 5: ['weapon-15', 'weapon-16'] },
    offhand: { 1: ['shield-02', 'shield-03', 'shield-04'], 2: ['shield-05', 'shield-06', 'shield-08'], 3: ['shield-09', 'shield-10', 'shield-11'], 4: ['shield-13', 'shield-07', 'shield-12'], 5: ['shield-15', 'shield-16', 'shield-14'] },
    head: { 1: ['head-02', 'head-01'], 2: ['head-05', 'head-06', 'head-07'], 3: ['head-09', 'head-10', 'head-08'], 4: ['head-13', 'head-14'], 5: ['head-16', 'head-15'] },
    chest: { 1: ['chest-01', 'chest-03'], 2: ['chest-05', 'chest-06'], 3: ['chest-09', 'chest-10'], 4: ['chest-13', 'chest-08'], 5: ['chest-16', 'chest-14', 'chest-15'] },
    relic: { 1: ['relic-02', 'relic-03', 'relic-01'], 2: ['relic-05', 'relic-06', 'relic-07'], 3: ['relic-09', 'relic-10', 'relic-11'], 4: ['relic-13', 'relic-14', 'relic-12'], 5: ['relic-15', 'relic-16'] },
  },
  light: {
    weapon: { 1: ['weapon-02', 'weapon-01'], 2: ['weapon-08', 'weapon-05'], 3: ['weapon-12', 'weapon-09'], 4: ['weapon-13', 'weapon-14'], 5: ['weapon-16', 'weapon-15'] },
    offhand: { 1: ['shield-02', 'shield-04'], 2: ['shield-05', 'shield-08'], 3: ['shield-09', 'shield-10'], 4: ['shield-13', 'shield-12'], 5: ['shield-16', 'shield-14'] },
    head: { 1: ['head-01', 'head-03', 'head-02'], 2: ['head-08', 'head-07'], 3: ['head-10', 'head-12'], 4: ['head-14', 'head-13'], 5: ['head-15', 'head-16'] },
    chest: { 1: ['chest-02', 'chest-03'], 2: ['chest-07', 'chest-06'], 3: ['chest-08', 'chest-04'], 4: ['chest-14', 'chest-13'], 5: ['chest-15', 'chest-16'] },
    relic: { 1: ['relic-02', 'relic-03', 'relic-04'], 2: ['relic-05', 'relic-06', 'relic-07'], 3: ['relic-09', 'relic-10', 'relic-11'], 4: ['relic-13', 'relic-14', 'relic-12'], 5: ['relic-15', 'relic-16'] },
  },
  cloth: {
    weapon: { 1: ['focus-01', 'focus-02', 'focus-03'], 2: ['focus-05', 'focus-06'], 3: ['focus-09', 'focus-11'], 4: ['focus-13', 'focus-15'], 5: ['focus-16', 'focus-15'] },
    offhand: { 1: ['focus-04', 'focus-07'], 2: ['focus-08', 'relic-12'], 3: ['focus-10', 'focus-12'], 4: ['focus-14', 'focus-12'], 5: ['relic-16', 'focus-14'] },
    head: { 1: ['head-04', 'head-01'], 2: ['head-03', 'head-12'], 3: ['head-11', 'head-08'], 4: ['head-13', 'head-12'], 5: ['head-15', 'head-16'] },
    chest: { 1: ['chest-01', 'chest-04'], 2: ['chest-03', 'chest-04'], 3: ['chest-11', 'chest-10'], 4: ['chest-11', 'chest-10'], 5: ['chest-15', 'chest-16'] },
    relic: { 1: ['relic-02', 'relic-03', 'relic-01'], 2: ['relic-05', 'relic-06', 'relic-07'], 3: ['relic-09', 'relic-10', 'relic-11'], 4: ['relic-13', 'relic-14', 'relic-12'], 5: ['relic-15', 'relic-16'] },
  },
}

export interface HeroItemView {
  slot: HeroSlot
  tier: HeroTier
  variant: number
  /** Stabile ID: Klassenwechsel ändert nur die Optik, nicht Slot/Stufe. */
  id: string
  name: { de: string; en: string }
  icon: string
  power: number
  price: number
}

export function getVariantCount(classId: HeroClassId, slot: HeroSlot, tier: HeroTier): number {
  return ICONS[getHeroClass(classId).archetype][slot][tier].length
}

export function buildHeroItem(classId: HeroClassId, slot: HeroSlot, tier: HeroTier, variant = 0): HeroItemView {
  const options = ICONS[getHeroClass(classId).archetype][slot][tier]
  const safeVariant = Math.min(Math.max(0, Math.floor(variant)), options.length - 1)
  const key = options[safeVariant]
  const [noun, gender, nounEn] = ICON_NOUNS[key] ?? ['Gegenstand', 'm', 'item']
  const words = TIER_WORDS[tier]
  const nameDe = noun.includes(' ')
    // "Krummer Stock": das Substantiv trägt schon ein Adjektiv, das Qualitätswort steht davor als Zusatz.
    ? `${noun} (${words.de[2].replace(/es$/, '')})`
    : `${words.de[GENDER_INDEX[gender]]} ${noun}`
  return {
    slot,
    tier,
    variant: safeVariant,
    id: `${slot}-${tier}-${safeVariant}`,
    name: { de: nameDe, en: `${words.en} ${nounEn}` },
    icon: iconUrl(key),
    power: getTierPower(tier),
    price: getTierPrice(tier),
  }
}

export function listHeroSlotItems(classId: HeroClassId, slot: HeroSlot): HeroItemView[][] {
  return ([1, 2, 3, 4, 5] as HeroTier[]).map(tier =>
    Array.from({ length: getVariantCount(classId, slot, tier) }, (_unused, variant) => buildHeroItem(classId, slot, tier, variant)),
  )
}

export function countHeroCatalogItems(): number {
  let total = 0
  for (const definition of HERO_CLASSES) {
    for (const slot of HERO_SLOTS) for (const tier of [1, 2, 3, 4, 5] as HeroTier[]) total += getVariantCount(definition.id, slot, tier)
  }
  return total
}
