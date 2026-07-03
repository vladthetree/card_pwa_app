#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const TARGET_DIRS = ['src', 'index.html', 'public/manifest.json', 'tailwind.config.js']

const FORBIDDEN = [
  { pattern: /var\(--safe-(top|bottom|left|right)\)/g, label: 'legacy --safe-* variable usage' },
  { pattern: /--theme-notch/g, label: 'legacy --theme-notch variable usage' },
  { pattern: /\.safe-area-top\b/g, label: 'legacy .safe-area-top utility' },
  { pattern: /\.safe-area-bottom\b/g, label: 'legacy .safe-area-bottom utility' },
  // iOS 26 (Liquid Glass): black-translucent rendert die Status-/Home-Zone
  // opak SCHWARZ → sichtbarer Balken unter der Bildschirmrundung. Standalone
  // kommt allein aus dem Manifest (display: standalone); die Legacy-Metas
  // dürfen nicht zurückkehren. Muster matchen nur echte <meta>-Tags, nicht
  // die erklärenden Kommentare in index.html.
  { pattern: /<meta\s+name="apple-mobile-web-app-capable"/g, label: 'legacy apple-mobile-web-app-capable meta (iOS 26: use manifest display)' },
  { pattern: /<meta\s+name="apple-mobile-web-app-status-bar-style"/g, label: 'legacy status-bar-style meta (iOS 26.1+: renders opaque black bars)' },
  { pattern: /<meta\s+name="apple-touch-fullscreen"/g, label: 'legacy apple-touch-fullscreen meta' },
]

/**
 * Chrome-Farb-Kontrakt: manifest theme_color/background_color und das
 * theme-color-Meta müssen exakt --ds-bg entsprechen. iOS malt die
 * Home-Indicator-Zone der Standalone-PWA mit diesen Farben — jede Drift
 * (historisch: #080808 vs. #0b0b09) erzeugt einen sichtbaren Streifen.
 */
function checkChromeColorContract(violations) {
  const cssContent = readFileSync(join(ROOT, 'src/index.css'), 'utf8')
  const htmlContent = readFileSync(join(ROOT, 'index.html'), 'utf8')
  const manifest = JSON.parse(readFileSync(join(ROOT, 'public/manifest.json'), 'utf8'))

  const dsBg = cssContent.match(/--ds-bg:\s*(#[0-9a-fA-F]{3,8})/)?.[1]?.toLowerCase()
  const metaThemeColor = htmlContent.match(/<meta\s+name="theme-color"\s+content="(#[0-9a-fA-F]{3,8})"/)?.[1]?.toLowerCase()

  if (!dsBg) {
    violations.push({ file: 'src/index.css', rule: 'chrome-color contract: --ds-bg not found', count: 1 })
    return
  }

  const expectations = [
    { file: 'index.html', label: 'meta theme-color', value: metaThemeColor },
    { file: 'public/manifest.json', label: 'manifest theme_color', value: manifest.theme_color?.toLowerCase() },
    { file: 'public/manifest.json', label: 'manifest background_color', value: manifest.background_color?.toLowerCase() },
  ]

  for (const { file, label, value } of expectations) {
    if (value !== dsBg) {
      violations.push({
        file,
        rule: `chrome-color contract: ${label} (${value ?? 'missing'}) must equal --ds-bg (${dsBg})`,
        count: 1,
      })
    }
  }
}

function collectFiles(entry) {
  const fullPath = join(ROOT, entry)
  const stats = statSync(fullPath)
  if (stats.isFile()) {
    return [fullPath]
  }

  const output = []
  for (const child of readdirSync(fullPath)) {
    const childPath = join(fullPath, child)
    const childStats = statSync(childPath)
    if (childStats.isDirectory()) {
      output.push(...collectFiles(relative(ROOT, childPath)))
      continue
    }

    if (/\.(ts|tsx|css|html|json|js|mjs)$/.test(child)) {
      output.push(childPath)
    }
  }
  return output
}

const files = TARGET_DIRS.flatMap(collectFiles)
const violations = []

for (const filePath of files) {
  const content = readFileSync(filePath, 'utf8')

  for (const rule of FORBIDDEN) {
    const matches = content.match(rule.pattern)
    if (!matches) continue

    violations.push({
      file: relative(ROOT, filePath),
      rule: rule.label,
      count: matches.length,
    })
  }
}

checkChromeColorContract(violations)

if (violations.length > 0) {
  console.error('Legacy safe-area patterns found:')
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.rule} (${violation.count})`)
  }
  process.exit(1)
}

console.log('Safe-area legacy check passed.')
