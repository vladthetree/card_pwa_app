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
]

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

if (violations.length > 0) {
  console.error('Legacy safe-area patterns found:')
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.rule} (${violation.count})`)
  }
  process.exit(1)
}

console.log('Safe-area legacy check passed.')
