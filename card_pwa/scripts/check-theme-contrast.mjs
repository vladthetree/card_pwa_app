#!/usr/bin/env node
/**
 * Prüft WCAG-Kontrastverhältnisse für die kritischen Token-Paare beider
 * Themes (Neo-Brutalismus, Newsprint). Die Hex-Werte hier sind bewusst
 * dupliziert (nicht aus CSS geparst) — Quelle der Wahrheit bleiben
 * src/contexts/ThemeContext.tsx (THEMES) und der .newsprint-app/.neo-app-
 * Block in src/index.css; bei Änderungen dort auch hier nachziehen.
 */

const AA_NORMAL = 4.5
const AA_LARGE = 3.0

function hexToRgb(hex) {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3
    ? normalized.split('').map(c => c + c).join('')
    : normalized
  const parsed = Number.parseInt(full, 16)
  return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255]
}

function channelToLinear(channel) {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(channelToLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(hexA, hexB) {
  const lA = relativeLuminance(hexA)
  const lB = relativeLuminance(hexB)
  const lighter = Math.max(lA, lB)
  const darker = Math.min(lA, lB)
  return (lighter + 0.05) / (darker + 0.05)
}

const THEME_PAIRS = {
  'neo (Neo-Brutalismus)': [
    { name: 'background/text', bg: '#FFFDF5', fg: '#000000', min: AA_NORMAL },
    { name: 'card/text', bg: '#FFFFFF', fg: '#000000', min: AA_NORMAL },
    { name: 'panel(violet)/text', bg: '#C4B5FD', fg: '#000000', min: AA_NORMAL },
    { name: 'secondary-accent(yellow)/text', bg: '#FFD93D', fg: '#000000', min: AA_NORMAL },
    { name: 'primary-accent(coral)/fg-on-accent', bg: '#FF6B6B', fg: '#150b08', min: AA_LARGE },
  ],
  'newsprint (Newsprint)': [
    { name: 'background/text', bg: '#F9F9F7', fg: '#111111', min: AA_NORMAL },
    { name: 'card/text', bg: '#FFFFFF', fg: '#111111', min: AA_NORMAL },
    { name: 'panel(divider-grey)/text', bg: '#E5E5E0', fg: '#111111', min: AA_NORMAL },
    { name: 'background/text-secondary', bg: '#F9F9F7', fg: '#4D4D4D', min: AA_NORMAL },
    { name: 'background/text-muted', bg: '#F9F9F7', fg: '#595959', min: AA_NORMAL },
    { name: 'background/subtle', bg: '#F9F9F7', fg: '#666666', min: AA_LARGE },
    { name: 'primary-accent(red)/fg-on-accent (white)', bg: '#CC0000', fg: '#FFFFFF', min: AA_NORMAL },
    { name: 'gap-bucket accent-hex/text (grey chip, ex. UI_TOKENS.modal)', bg: '#E5E5E0', fg: '#111111', min: AA_NORMAL },
    { name: 'input focus-bg/text', bg: '#F0F0F0', fg: '#111111', min: AA_NORMAL },
  ],
  'newsprintDark (Newsprint Dark)': [
    { name: 'background/text', bg: '#141413', fg: '#E8E8E3', min: AA_NORMAL },
    { name: 'card/text', bg: '#1E1E1C', fg: '#E8E8E3', min: AA_NORMAL },
    { name: 'panel(divider-dark)/text', bg: '#2C2C29', fg: '#E8E8E3', min: AA_NORMAL },
    { name: 'background/text-secondary', bg: '#141413', fg: '#C9C9C2', min: AA_NORMAL },
    { name: 'background/text-muted', bg: '#141413', fg: '#A3A39C', min: AA_NORMAL },
    { name: 'background/subtle', bg: '#141413', fg: '#8A8A83', min: AA_LARGE },
    { name: 'accent(red)/background — Akzenttext auf Fond', bg: '#141413', fg: '#FF6166', min: AA_NORMAL },
    { name: 'primary-accent(red)/fg-on-accent (dark ink)', bg: '#FF6166', fg: '#141413', min: AA_NORMAL },
    { name: 'gap-bucket accent-hex/text (dark chip)', bg: '#2C2C29', fg: '#E8E8E3', min: AA_NORMAL },
    { name: 'input focus-bg/text', bg: '#262623', fg: '#E8E8E3', min: AA_NORMAL },
  ],
}

let failed = false

for (const [themeName, pairs] of Object.entries(THEME_PAIRS)) {
  console.log(`\n${themeName}`)
  for (const pair of pairs) {
    const ratio = contrastRatio(pair.bg, pair.fg)
    const ok = ratio >= pair.min
    if (!ok) failed = true
    const status = ok ? 'OK  ' : 'FAIL'
    console.log(`  [${status}] ${pair.name}: ${ratio.toFixed(2)}:1 (min ${pair.min}:1, ${pair.bg} / ${pair.fg})`)
  }
}

if (failed) {
  console.error('\nKontrast-Check fehlgeschlagen: mindestens ein Token-Paar unter AA-Schwelle.')
  process.exit(1)
}

console.log('\nKontrast-Check bestanden.')
