#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const srcRoot = resolve(root, 'src')

const allowedDirectDbRuntimeImports = new Set([
  'src/components/AppInitializer.tsx',
  'src/components/settings/SettingsPwaFullReset.tsx',
])

const allowedDexieRuntimeAccess = new Set([
  'src/hooks/home/useTagCardIndex.ts',
  'src/hooks/useCardDb.ts',
  'src/hooks/useHeatmap.ts',
  'src/hooks/useStreak.ts',
  'src/services/algorithmMigration.ts',
  'src/services/deckHierarchy.ts',
  'src/services/fsrsOptimizer.ts',
  'src/services/profileService.ts',
  'src/services/syncPull/apply.ts',
  'src/services/syncPull/bootstrapUpload.ts',
  'src/services/syncPull/deltaPull.ts',
  'src/services/syncPull/shared.ts',
  'src/services/syncPull/snapshot.ts',
  'src/services/syncQueue.ts',
  'src/services/syncedDeckScope.ts',
  'src/utils/dbBackup.ts',
  'src/utils/import/importPipeline.ts',
])

const allowedUtilsLayerImports = new Set([
  'src/utils/import/importPipeline.ts -> ../../services/syncQueue',
  'src/utils/sync/operationResolver.ts -> ../../services/syncQueue',
  'src/utils/todayPackage.ts -> ../hooks/useVideoRecallScores',
])

const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs'])

function walk(dir) {
  const entries = []
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue
      entries.push(...walk(path))
    } else if ([...sourceExtensions].some(ext => path.endsWith(ext))) {
      entries.push(path)
    }
  }
  return entries
}

function normalize(path) {
  return path.split(sep).join('/')
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null
  const base = resolve(fromFile, '..', specifier)
  return normalize(relative(srcRoot, base))
}

function isComponentsRuntimeDbImport(fileRel, statement, specifier, resolvedImport) {
  if (!fileRel.startsWith('src/components/')) return false
  if (/^\s*import\s+type\b/.test(statement)) return false
  if (specifier.includes('/db/queries')) return false
  if (resolvedImport === 'db' || resolvedImport === 'db/index') return true
  return false
}

function isUtilsLayerImport(fileRel, specifier) {
  if (!fileRel.startsWith('src/utils/')) return false
  return specifier.includes('/components/') || specifier.includes('/hooks/') || specifier.includes('/services/')
}

function isQueryUiImport(fileRel, specifier) {
  if (!fileRel.startsWith('src/db/queries/')) return false
  return specifier.includes('/components/') || specifier.includes('/hooks/')
}

const violations = []

for (const file of walk(srcRoot)) {
  const fileRel = normalize(relative(root, file))
  const source = readFileSync(file, 'utf8')
  if (fileRel.startsWith('src/__tests__/')) continue

  const code = stripComments(source)
  const importRegex = /^\s*import\s+(?:type\s+)?[\s\S]*?\s+from\s+['"]([^'"]+)['"]/gm
  let match

  while ((match = importRegex.exec(code))) {
    const statement = match[0]
    const specifier = match[1]
    const resolvedImport = resolveImport(file, specifier)

    if (
      resolvedImport &&
      isComponentsRuntimeDbImport(fileRel, statement, specifier, resolvedImport) &&
      !allowedDirectDbRuntimeImports.has(fileRel)
    ) {
      violations.push({
        file: fileRel,
        import: specifier,
        rule: 'components must not runtime-import db/index; use db/queries or a service adapter',
      })
    }

    if (isUtilsLayerImport(fileRel, specifier) && !allowedUtilsLayerImports.has(`${fileRel} -> ${specifier}`)) {
      violations.push({
        file: fileRel,
        import: specifier,
        rule: 'utils must not import UI or service layers',
      })
    }

    if (isQueryUiImport(fileRel, specifier)) {
      violations.push({
        file: fileRel,
        import: specifier,
        rule: 'db/queries must not import UI layers',
      })
    }
  }

  if (!fileRel.startsWith('src/db/') && !allowedDexieRuntimeAccess.has(fileRel)) {
    const hasDirectDbAccess = /\bdb\.(cards|decks|reviews|syncOutbox|settings|sessions|shuffleCollections|videoNotes)\b/.test(code)
    if (hasDirectDbAccess) {
      violations.push({
        file: fileRel,
        import: 'db.*',
        rule: 'direct Dexie table access outside db/ requires an explicit architecture exception',
      })
    }
  }
}

if (violations.length > 0) {
  console.error('Architecture import check failed:')
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.import} -> ${violation.rule}`)
  }
  process.exit(1)
}

console.log('Architecture import check passed.')
