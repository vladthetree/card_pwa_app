#!/usr/bin/env node
/**
 * Phase-0-Generator/-Validator des dedizierten Lerneinheiten-Systems
 * (docs/lerneinheiten-sy0-701-umsetzungsplan.md §23.1).
 *
 * Rein additiv: liest die versionierten Snapshots aus content/sy0-701/source/
 * und bestehende App-Module (read-only via Vite ssrLoadModule — u. a. der
 * ECHTE PBQ-Parser aus src/utils/cardTextParser.ts, keine Text-Heuristik)
 * und erzeugt die zehn Pflichtartefakte unter content/sy0-701/generated/.
 *
 * Exit-Code != 0, solange Content-Gates offen sind — das ist im aktuellen
 * Zustand ERWARTET (z. B. keine Readiness-Formen, keine Kalibrierung).
 *
 *     node scripts/sy0701/validate.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const SOURCE = path.join(APP_ROOT, 'content', 'sy0-701', 'source')
const GENERATED = path.join(APP_ROOT, 'content', 'sy0-701', 'generated')

const MANIFEST_VERSION = '2026-07-15.1'
const SCENARIO_OBJECTIVES = ['2.4', '3.2', '4.1', '4.5', '4.6', '4.9', '5.6']
const REQUIRED_READINESS_FORMS = 3

const readJson = f => JSON.parse(fs.readFileSync(path.join(SOURCE, f), 'utf8'))
const gates = []
const gate = (id, ok, detail) => gates.push({ id, status: ok ? 'PASS' : 'FAIL', detail })
const warn = []

function slug(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\(([^)]*)\)/g, ' $1 ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '')
}

function writeArtifact(name, payload) {
  const body = {
    schemaVersion: `sy0701-${name.replace(/\.json$/, '')}-1`,
    manifestVersion: MANIFEST_VERSION,
    generatedAt: Date.now(),
    ...payload,
  }
  fs.mkdirSync(GENERATED, { recursive: true })
  fs.writeFileSync(path.join(GENERATED, name), JSON.stringify(body, null, 2) + '\n')
  return body
}

// ── Eingaben ────────────────────────────────────────────────────────────────
const snapshot = readJson('exam-source-snapshot.json')
const extract = readJson('objectives-v7-extract.json')
const videosManifest = readJson('videos-manifest.json')
const cardsSnapshot = readJson('cards-snapshot.json')
const mappingDecisions = readJson('mapping-decisions.json')

if (snapshot.sha256 !== extract.sourceSha256) {
  console.error('FATAL: Hash-Mismatch zwischen exam-source-snapshot und objectives-v7-extract.')
  process.exit(2)
}

const vite = await createServer({
  root: APP_ROOT,
  configFile: false,
  server: { middlewareMode: true },
  logLevel: 'error',
})
let parserMod, labsMod, qmapMod, tqMod
try {
  parserMod = await vite.ssrLoadModule('/src/utils/cardTextParser.ts')
  labsMod = await vite.ssrLoadModule('/src/data/labScenarios.ts')
  qmapMod = await vite.ssrLoadModule('/src/data/messerVideoQuestionMap.ts')
  tqMod = await vite.ssrLoadModule('/src/data/messerTranscriptQuestions.ts')
} finally {
  await vite.close()
}
const { OrderingParser, MatchingParser } = parserMod
const { LAB_SCENARIOS, LAB_SOURCES } = labsMod
const videoTitleByQuestionId = qmapMod.MESSER_VIDEO_BY_QUESTION_ID
const transcriptQuestions = tqMod.MESSER_TRANSCRIPT_QUESTIONS

// ── 1) exam-source-snapshot ─────────────────────────────────────────────────
writeArtifact('exam-source-snapshot.json', { snapshot })

// ── 2) Requirements-Manifest (Crosswalk) ────────────────────────────────────
const KNOWN_OBJECTIVES = new Set(extract.objectives.map(o => o.id))
const acronyms = extract.acronyms.map(a => ({
  acronymMeaningId: `acr:sy0701:v7:${slug(a.abbr)}:${slug(a.meaning)}`,
  abbr: a.abbr,
  meaning: a.meaning,
}))
{
  const seen = new Set()
  for (const a of acronyms) {
    if (seen.has(a.acronymMeaningId)) {
      console.error(`FATAL: Akronym-ID-Kollision ${a.acronymMeaningId}`)
      process.exit(2)
    }
    seen.add(a.acronymMeaningId)
  }
}
const ambiguousAbbrs = [...acronyms.reduce((m, a) => m.set(a.abbr, (m.get(a.abbr) ?? 0) + 1), new Map())]
  .filter(([, n]) => n > 1)
  .map(([abbr]) => abbr)

const meaningIdsByAbbr = new Map()
for (const a of acronyms) {
  if (!meaningIdsByAbbr.has(a.abbr)) meaningIdsByAbbr.set(a.abbr, [])
  meaningIdsByAbbr.get(a.abbr).push(a.acronymMeaningId)
}
const abbrPattern = new Map(
  [...meaningIdsByAbbr.keys()].map(abbr => [
    abbr,
    new RegExp(`(^|[^A-Za-z0-9])${abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9]|$)`),
  ]),
)

function actionVerbOf(title) {
  if (/^given a scenario,?\s*/i.test(title)) {
    const rest = title.replace(/^given a scenario,?\s*/i, '')
    return rest.split(/\s+/)[0].toLowerCase()
  }
  return title.split(/\s+/)[0].toLowerCase()
}

const requirements = []
const requirementIds = new Set()
for (const objective of extract.objectives) {
  const scenarioRequired = /^given a scenario/i.test(objective.title)
  const verb = actionVerbOf(objective.title)
  const walk = (items, ancestors) => {
    for (const item of items) {
      const pathSegments = [...ancestors, item.text]
      if (item.children.length > 0) {
        walk(item.children, pathSegments)
        continue
      }
      let requirementId = `req:sy0701:v7:${objective.id}:${pathSegments.map(slug).join(':')}`
      let n = 2
      while (requirementIds.has(requirementId)) requirementId = `${requirementId}~${n++}`
      requirementIds.add(requirementId)
      const acronymMeaningIds = []
      const leafText = pathSegments.join(' ')
      for (const [abbr, pattern] of abbrPattern) {
        if (pattern.test(leafText)) acronymMeaningIds.push(...meaningIdsByAbbr.get(abbr))
      }
      requirements.push({
        requirementId,
        examCode: snapshot.examCode,
        sourceRevision: snapshot.documentRevision,
        domainId: objective.domainId,
        objectiveId: objective.id,
        sourcePath: [objective.domainId, objective.id, ...pathSegments],
        requirementSummary: `${objective.id}: ${pathSegments.join(' > ')}`,
        actionVerb: verb,
        acronymMeaningIds,
        scenarioRequired,
        // Initial konservativ: fachliche Criticality-Zuweisung ist offenes
        // Review-Item; ohne 'critical' sind keine Error-Definitionen nötig.
        criticality: 'standard',
        criticalErrorClassIds: [],
      })
    }
  }
  walk(objective.bullets, [])
}
writeArtifact('sy0-701-requirements.json', {
  sourceSnapshotId: snapshot.snapshotId,
  requirements,
  criticalErrorDefinitions: [],
  pendingReview: [
    'Criticality je Requirement ist noch nicht fachlich zugewiesen (alle standard).',
    'CriticalErrorDefinitions folgen mit der Criticality-Zuweisung.',
  ],
})
gate('requirement-ids-eindeutig', requirementIds.size === requirements.length, `${requirements.length} Requirements`)
gate('objectives-vollstaendig', extract.objectives.length === 28, `${extract.objectives.length}/28 Objectives`)

// ── 3) Akronymliste ─────────────────────────────────────────────────────────
writeArtifact('sy0-701-acronyms.json', {
  sourceSnapshotId: snapshot.snapshotId,
  acronyms,
  ambiguousAbbrs,
  note: 'Set-Gleichheit mit der offiziellen V7-Akronymtabelle; mehrdeutige Kürzel sind getrennte Bedeutungspaare (kein Duplikatfehler).',
})
gate('akronyme-extrahiert', acronyms.length === 336, `${acronyms.length} Paare, mehrdeutig: ${ambiguousAbbrs.join(', ')}`)

// ── Inhaltsbestand aufbereiten ──────────────────────────────────────────────
const profile = cardsSnapshot.profiles[0]
const profileB = cardsSnapshot.profiles[1]
{
  const a = new Set(profile.cards.map(c => c.id))
  const b = new Set(profileB.cards.map(c => c.id))
  const equal = a.size === b.size && [...a].every(id => b.has(id))
  gate('profile-kartenparitaet', equal, `Default=${a.size}, ${profileB.profileName}=${b.size}`)
}

const OBJECTIVE_DECK = /^sy0-701-objective-(\d)-(\d+)$/
const objectiveOfDeck = deckId => {
  const m = OBJECTIVE_DECK.exec(deckId)
  return m ? `${m[1]}.${m[2]}` : null
}
const rootDeckDomain = deckId => {
  const name = profile.decks[deckId] ?? ''
  const m = /^0([1-5])_/.exec(name)
  return m ? Number(m[1]) : null
}

const M_ID = /^(M\d-\d{3}):/
const videoByTitle = new Map(videosManifest.videos.map(v => [v.title, v]))
const videoByIndex = new Map(videosManifest.videos.map(v => [v.index, v]))

const unknownDeckObjectives = new Set()
const cardsByVideoIndex = new Map()
const pbqCards = []
const practiceObjectiveCards = []
const rootDeckCards = []
const acronymDeckCards = []
let unresolvedQuestionIds = 0

for (const card of profile.cards) {
  const deckName = profile.decks[card.deckId] ?? card.deckId
  const front = card.front ?? ''
  const isPbq = OrderingParser.isOrdering(front) || MatchingParser.isMatching(front)
  if (isPbq) {
    pbqCards.push({
      cardId: card.id,
      deckId: card.deckId,
      deckName,
      kind: OrderingParser.isOrdering(front) ? 'ordering' : 'matching',
      objective: objectiveOfDeck(card.deckId),
    })
  }
  const objective = objectiveOfDeck(card.deckId)
  if (objective && !KNOWN_OBJECTIVES.has(objective)) unknownDeckObjectives.add(objective)

  const mId = M_ID.exec(front)?.[1]
  if (mId) {
    const title = videoTitleByQuestionId[mId]
    const video = title ? videoByTitle.get(title) : undefined
    if (video) {
      if (!cardsByVideoIndex.has(video.index)) cardsByVideoIndex.set(video.index, [])
      cardsByVideoIndex.get(video.index).push({ cardId: card.id, questionId: mId })
    } else {
      unresolvedQuestionIds += 1
    }
  }

  if (objective) {
    if (!mId && !isPbq) practiceObjectiveCards.push({ cardId: card.id, objective })
  } else if (rootDeckDomain(card.deckId)) {
    rootDeckCards.push({ cardId: card.id, domain: rootDeckDomain(card.deckId), deckName })
  } else if (/acronym/i.test(deckName)) {
    acronymDeckCards.push({ cardId: card.id, isPbq })
  }
}
gate('deck-objectives-bekannt', unknownDeckObjectives.size === 0, unknownDeckObjectives.size ? [...unknownDeckObjectives].join(',') : 'alle Deck-Codes bekannt')
gate('frage-video-aufloesung', unresolvedQuestionIds === 0, `${unresolvedQuestionIds} M-IDs ohne Videotreffer`)

// ── 4) video-content-map ────────────────────────────────────────────────────
const videoContentMap = videosManifest.videos.map(video => {
  const mapped = cardsByVideoIndex.get(video.index) ?? []
  const indexKey = String(video.index).padStart(3, '0')
  const transcript = transcriptQuestions[indexKey] ?? []
  return {
    videoIndex: video.index,
    objective: video.objective,
    title: video.title,
    file: video.file,
    cardIds: mapped.map(m => m.cardId),
    recallQuestionIds: [
      ...mapped.map(m => m.questionId),
      ...transcript.map((_, i) => `T${indexKey}-${String(i + 1).padStart(2, '0')}`),
    ],
  }
})
const videosOhneRecall = videoContentMap.filter(v => v.recallQuestionIds.length === 0)
writeArtifact('video-content-map.json', {
  sourceSnapshotId: snapshot.snapshotId,
  note: 'Karten-IDs sind profilübergreifend identisch (verifiziert); Zuordnung über M-Frage-ID im Kartenfront + generierte Video-Titel-Map, nie über das Objective-Deck.',
  videos: videoContentMap,
  videosWithoutRecall: videosOhneRecall.map(v => v.videoIndex),
})
gate('videos-mit-recall', videosOhneRecall.length === 0, `${videosOhneRecall.length} Videos ohne Recall-Fragen: ${videosOhneRecall.map(v => v.videoIndex).join(',')}`)

// ── 5) pbq-lab-coverage ─────────────────────────────────────────────────────
const labsByObjective = new Map()
for (const s of LAB_SCENARIOS) {
  const code = String(s.objective ?? '').split(/\s+/)[0]
  if (!labsByObjective.has(code)) labsByObjective.set(code, [])
  labsByObjective.get(code).push(s.id)
}
const scenarioGate = SCENARIO_OBJECTIVES.map(obj => ({
  objective: obj,
  labScenarioIds: labsByObjective.get(obj) ?? [],
  pbqCardIds: pbqCards.filter(c => c.objective === obj).map(c => c.cardId),
  ok: (labsByObjective.get(obj) ?? []).length > 0 || pbqCards.some(c => c.objective === obj),
}))
writeArtifact('pbq-lab-coverage.json', {
  sourceSnapshotId: snapshot.snapshotId,
  pbqCards,
  pbqCardCount: pbqCards.length,
  labScenarioCount: LAB_SCENARIOS.length,
  labsByObjective: Object.fromEntries(labsByObjective),
  scenarioObjectiveGate: scenarioGate,
  note: 'PBQ-Erkennung ausschließlich über den echten Kartenparser (OrderingParser/MatchingParser aus src/utils/cardTextParser.ts). Matching/Ordering deckt nicht das gesamte PBQ-Spektrum ab; fehlende Praxispfade siehe content-qa-report.',
})
gate('pbq-inventar', pbqCards.length === 23, `${pbqCards.length} parsererkannte PBQ-Karten (erwartet 23)`)
gate('szenario-objectives-praxis', scenarioGate.every(s => s.ok), scenarioGate.filter(s => !s.ok).map(s => s.objective).join(',') || 'alle 7 mit Praxispfad')

// ── 6) content-qa-report ────────────────────────────────────────────────────
const videosByObjective = new Map()
for (const v of videosManifest.videos) {
  if (!videosByObjective.has(v.objective)) videosByObjective.set(v.objective, [])
  videosByObjective.get(v.objective).push(v.index)
}
const assessmentByObjective = new Map()
for (const [index, mapped] of cardsByVideoIndex) {
  const video = videoByIndex.get(index)
  if (!video) continue
  if (!assessmentByObjective.has(video.objective)) assessmentByObjective.set(video.objective, 0)
  assessmentByObjective.set(video.objective, assessmentByObjective.get(video.objective) + mapped.length)
}
for (const [indexKey, list] of Object.entries(transcriptQuestions)) {
  const video = videoByIndex.get(Number(indexKey))
  if (!video) continue
  assessmentByObjective.set(video.objective, (assessmentByObjective.get(video.objective) ?? 0) + list.length)
}
for (const c of practiceObjectiveCards) {
  assessmentByObjective.set(c.objective, (assessmentByObjective.get(c.objective) ?? 0) + 1)
}

const byRequirementId = {}
let contentMissing = 0
let assessmentMissing = 0
for (const r of requirements) {
  const hasLearning = (videosByObjective.get(r.objectiveId) ?? []).length > 0
  const hasAssessment = (assessmentByObjective.get(r.objectiveId) ?? 0) > 0
  let qaStatus
  if (!hasLearning) qaStatus = 'content-missing'
  else if (!hasAssessment) qaStatus = 'assessment-missing'
  else qaStatus = 'mapping-review' // Inhalt existiert nur auf Objective-Ebene; Leaf-Zuordnung unbelegt
  if (qaStatus === 'content-missing') contentMissing += 1
  if (qaStatus === 'assessment-missing') assessmentMissing += 1
  byRequirementId[r.requirementId] = {
    requirementId: r.requirementId,
    learningAssetIds: (videosByObjective.get(r.objectiveId) ?? []).map(i => `video:${i}`),
    assessmentItemIds: [],
    practicalItemIds: (labsByObjective.get(r.objectiveId) ?? []).map(id => `lab:${id}`),
    qaStatus,
  }
}
const blocking = Object.values(byRequirementId).filter(r => r.qaStatus !== 'covered').map(r => r.requirementId)
writeArtifact('content-qa-report.json', {
  sourceSnapshotId: snapshot.snapshotId,
  requirementCount: requirements.length,
  coveredCount: requirements.length - blocking.length,
  statusCounts: {
    covered: requirements.length - blocking.length,
    'mapping-review': blocking.length - contentMissing - assessmentMissing,
    'content-missing': contentMissing,
    'assessment-missing': assessmentMissing,
  },
  byRequirementId,
  blockingRequirementIds: blocking,
  mappingDecisions: {
    decided: mappingDecisions.decisions.length,
    applied: 0,
    note: mappingDecisions.applicationStatus,
  },
  provenance: {
    cardSet: 'Dritt-/abgeleitetes Kursmaterial (messner_lernkarten) — Lizenz-/Herkunftsprüfung offen',
    objectivesSnapshot: snapshot.usageBasis,
  },
})
gate('leaf-coverage', blocking.length === 0, `${requirements.length - blocking.length}/${requirements.length} Leaves covered (Leaf-Mapping steht aus)`)
gate('mapping-31-entschieden', mappingDecisions.decisions.length === 31, `${mappingDecisions.decisions.length}/31 entschieden; Anwendung zurückgestellt (Bestand unverändert)`)
if (mappingDecisions.decisions.some(d => d.decision === 'move')) {
  warn.push('7 Mapping-Moves sind fachlich entschieden, aber auf Nutzer-Anweisung nicht auf sync.db angewendet.')
}

// ── 7) content-pools ────────────────────────────────────────────────────────
writeArtifact('content-pools.json', {
  sourceSnapshotId: snapshot.snapshotId,
  pools: {
    course: {
      videoUnits: videoContentMap.filter(v => v.videoIndex >= 2).length,
      mappedCardCount: [...cardsByVideoIndex.values()].reduce((n, l) => n + l.length, 0),
      transcriptQuestionCount: Object.values(transcriptQuestions).reduce((n, l) => n + l.length, 0),
    },
    practice: {
      rootDeckScenarioCards: rootDeckCards.length,
      unmappedObjectiveCards: practiceObjectiveCards.length,
      acronymDeckCards: acronymDeckCards.length,
      pbqCards: pbqCards.length,
      labScenarios: LAB_SCENARIOS.length,
    },
    readiness: {
      forms: [],
      formCount: 0,
      requiredForms: REQUIRED_READINESS_FORMS,
      note: 'Readiness-Items dürfen ausschließlich neu erstellte, nie ausgelieferte Items sein (Detailplan §6.2/Phase 0); der gesamte Bestand ist historisch exponiert und damit unzulässig.',
    },
  },
  disjointness: 'Course/Practice überlappen nicht (M-ID-Zuordnung vs. Rest); Readiness ist leer und damit trivially disjunkt.',
})
gate('readiness-formen', false, `0/${REQUIRED_READINESS_FORMS} disjunkte Readiness-Formen vorhanden`)

// ── 8) holdout-leakage-report ───────────────────────────────────────────────
writeArtifact('holdout-leakage-report.json', {
  sourceSnapshotId: snapshot.snapshotId,
  holdoutItemCount: 0,
  leakageFindings: [],
  verdict: 'NOT_APPLICABLE',
  note: 'Es existieren noch keine Holdout-Items. Leakage-Prüfung wird wirksam, sobald Readiness-Formen im serverseitigen Holdout-Store angelegt sind (Client/Repo erhalten nur Deskriptoren + Hashes).',
})

// ── 9) historical-exposure-report ───────────────────────────────────────────
writeArtifact('historical-exposure-report.json', {
  sourceSnapshotId: snapshot.snapshotId,
  policy: 'Für Readiness sind nur Items zulässig, die nachweislich nie an den Kandidaten ausgeliefert wurden.',
  exposedPools: {
    activeCards: profile.cards.length,
    transcriptQuestions: Object.values(transcriptQuestions).reduce((n, l) => n + l.length, 0),
    labScenarios: LAB_SCENARIOS.length,
  },
  readinessEligibleExistingItems: 0,
  conclusion: 'Der komplette Bestand gilt als historisch exponiert (täglicher Study-/Recall-/Lab-Zugriff, keine lückenlose Nicht-Auslieferungs-Historie). Readiness-Formen müssen aus neu erstellten Items aufgebaut werden.',
})

// ── 10) calibration-report ──────────────────────────────────────────────────
writeArtifact('calibration-report.json', {
  sourceSnapshotId: snapshot.snapshotId,
  calibratedForms: [],
  verdict: 'MISSING',
  note: 'Keine Kalibrierungsdaten. Blueprint-Freigabe und Formäquivalenz (Detailplan §14) setzen kalibrierte, fachlich reviewte Formen voraus.',
})
gate('kalibrierung', false, 'keine Kalibrierungsdaten vorhanden')

// ── Generierte TS-Datenmodule (Plan §20: sy0701ContentMap.ts, sy0701Requirements.ts) ──
const DATA_DIR = path.join(APP_ROOT, 'src', 'data')
const genHeader = `/**
 * AI_CONTEXT:
 * Role: GENERATED data module of the dedicated SY0-701 learning-unit system — do not edit by hand.
 * Used by: learning-unit builders/tests; regenerate via \`node scripts/sy0701/validate.mjs\`.
 * Important: Derived from content/sy0-701/source/* (official V7 snapshot ${snapshot.sha256.slice(0, 12)}…, manifest ${MANIFEST_VERSION}).
 */`

const contentMapEntries = videoContentMap.map(v => ({
  videoIndex: v.videoIndex,
  objectiveId: v.objective,
  requirementIds: [], // Leaf-Mapping ist offenes Phase-0-Item (OFFENE-PUNKTE.md #6)
  courseCardIds: v.cardIds,
  recallQuestionIds: v.recallQuestionIds,
  recallCardIds: v.cardIds,
  ...(v.cardIds.length === 0 ? { unmappedReason: 'keine per-Video gemappten Karten (Objective-Practice-Pool bleibt unberührt)' } : {}),
}))
fs.writeFileSync(
  path.join(DATA_DIR, 'sy0701ContentMap.ts'),
  `${genHeader}
import type { VideoContentMapEntry } from '../utils/learningUnits'

export const SY0701_SOURCE_SNAPSHOT_ID = ${JSON.stringify(snapshot.snapshotId)}
export const SY0701_CONTENT_MANIFEST_VERSION = ${JSON.stringify(MANIFEST_VERSION)}

export const SY0701_CONTENT_MAP: readonly VideoContentMapEntry[] = ${JSON.stringify(contentMapEntries, null, 2)}

export const SY0701_CONTENT_MAP_BY_VIDEO_INDEX: ReadonlyMap<number, VideoContentMapEntry> = new Map(
  SY0701_CONTENT_MAP.map(entry => [entry.videoIndex, entry]),
)
`,
)

fs.writeFileSync(
  path.join(DATA_DIR, 'sy0701Requirements.ts'),
  `${genHeader}
import type { ExamRequirementsManifest } from '../utils/learningUnits'

export const SY0701_REQUIREMENTS_MANIFEST: ExamRequirementsManifest = ${JSON.stringify(
    {
      sourceSnapshotId: snapshot.snapshotId,
      manifestVersion: MANIFEST_VERSION,
      requirements,
      criticalErrorDefinitions: [],
    },
    null,
    2,
  )}
`,
)
console.log('\nGeneriert: src/data/sy0701ContentMap.ts, src/data/sy0701Requirements.ts')

// ── Gate-Zusammenfassung ────────────────────────────────────────────────────
const failed = gates.filter(g => g.status === 'FAIL')
console.log(`\nQuelle: ${snapshot.documentTitle} (${snapshot.documentRevision}, sha256 ${snapshot.sha256.slice(0, 12)}…)`)
console.log(`Artefakte: ${fs.readdirSync(GENERATED).length} Dateien in content/sy0-701/generated/\n`)
for (const g of gates) console.log(`  [${g.status}] ${g.id} — ${g.detail}`)
for (const w of warn) console.log(`  [WARN] ${w}`)
console.log(failed.length
  ? `\n${failed.length} Gate(s) offen — Phase 0 ist nicht abgeschlossen (erwartet in diesem Stand).`
  : '\nAlle Gates bestanden.')
process.exit(failed.length ? 1 : 0)
