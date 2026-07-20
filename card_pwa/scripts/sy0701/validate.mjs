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
 * Exit-Code != 0, solange Content-Gates offen sind.
 *
 * Ziel seit 2026-07-19: Lerngrundlage, keine Exam-Engine — Readiness-/
 * Kalibrierungs-Gates sind gestrichen; die Artefakte 7–10 bleiben als
 * dokumentierter Nicht-Anspruch erhalten.
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

const MANIFEST_VERSION = '2026-07-19.2'
const SCENARIO_OBJECTIVES = ['2.4', '3.2', '4.1', '4.5', '4.6', '4.9', '5.6']

const readJson = f => JSON.parse(fs.readFileSync(path.join(SOURCE, f), 'utf8'))
const readJsonOptional = f => (fs.existsSync(path.join(SOURCE, f)) ? readJson(f) : null)
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
// Kuratierte fachliche Zuordnungen (OFFENE-PUNKTE #6/#8); optional, solange
// die Kuratierung läuft — fehlende Einträge bleiben ehrlich 'mapping-review'.
const leafMapping = readJsonOptional('leaf-mapping.json')
const criticalitySource = readJsonOptional('criticality.json')

if (snapshot.sha256 !== extract.sourceSha256) {
  console.error('FATAL: Hash-Mismatch zwischen exam-source-snapshot und objectives-v7-extract.')
  process.exit(2)
}

const vite = await createServer({
  root: APP_ROOT,
  configFile: false,
  // Einmalskript ohne laufenden Dev-Server: kein Datei-Watcher nötig — vermeidet
  // ENOSPC, wenn VSCodes eigener Watcher das inotify-Budget schon ausschöpft.
  server: { middlewareMode: true, watch: null },
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
        criticality: 'standard',
        criticalErrorClassIds: [],
      })
    }
  }
  walk(objective.bullets, [])
}

// ── Criticality aus kuratierter Source anwenden (OFFENE-PUNKTE #8) ──────────
const criticalErrorDefinitions = criticalitySource?.criticalErrorDefinitions ?? []
{
  const reqById = new Map(requirements.map(r => [r.requirementId, r]))
  const problems = []
  const defIds = new Set()
  for (const def of criticalErrorDefinitions) {
    if (defIds.has(def.errorClassId)) problems.push(`doppelte errorClassId ${def.errorClassId}`)
    defIds.add(def.errorClassId)
    if (!reqById.has(def.requirementId)) problems.push(`Definition ${def.errorClassId} referenziert unbekannte Requirement ${def.requirementId}`)
    if (def.severity !== 'critical' || !def.definitionVersion || !def.triggerRuleId || !def.resolutionRule) {
      problems.push(`Definition ${def.errorClassId} unvollständig`)
    }
  }
  const referencedDefIds = new Set()
  for (const entry of criticalitySource?.critical ?? []) {
    const req = reqById.get(entry.requirementId)
    if (!req) { problems.push(`critical-Eintrag referenziert unbekannte Requirement ${entry.requirementId}`); continue }
    if (!Array.isArray(entry.criticalErrorClassIds) || entry.criticalErrorClassIds.length === 0) {
      problems.push(`critical-Eintrag ${entry.requirementId} ohne criticalErrorClassIds`)
      continue
    }
    for (const id of entry.criticalErrorClassIds) {
      if (!defIds.has(id)) problems.push(`critical-Eintrag ${entry.requirementId} referenziert unbekannte Definition ${id}`)
      referencedDefIds.add(id)
    }
    req.criticality = 'critical'
    req.criticalErrorClassIds = [...entry.criticalErrorClassIds]
  }
  for (const id of defIds) {
    if (!referencedDefIds.has(id)) problems.push(`verwaiste CriticalErrorDefinition ${id}`)
  }
  if (problems.length > 0) {
    console.error('FATAL: criticality.json inkonsistent:\n  - ' + problems.join('\n  - '))
    process.exit(2)
  }
  const criticalCount = requirements.filter(r => r.criticality === 'critical').length
  gate('criticality-zugewiesen', Boolean(criticalitySource) && criticalCount > 0,
    criticalitySource
      ? `${criticalCount} kritische Requirements, ${criticalErrorDefinitions.length} Error-Definitionen`
      : 'criticality.json fehlt (fachliche Zuweisung steht aus)')
}

writeArtifact('sy0-701-requirements.json', {
  sourceSnapshotId: snapshot.snapshotId,
  requirements,
  criticalErrorDefinitions,
  pendingReview: criticalitySource ? [] : [
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
    durationSec: Number.isFinite(video.durationSec) ? video.durationSec : null,
    cardIds: mapped.map(m => m.cardId),
    recallQuestionIds: [
      ...mapped.map(m => m.questionId),
      ...transcript.map((_, i) => `T${indexKey}-${String(i + 1).padStart(2, '0')}`),
    ],
  }
})
const videosOhneDauer = videoContentMap.filter(v => v.durationSec === null)
gate('video-dauern', videosOhneDauer.length === 0, videosOhneDauer.length ? `${videosOhneDauer.length} Videos ohne durationSec` : 'alle 120 Dauern vorhanden')
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

// Gültige Asset-IDs für die Referenzvalidierung der kuratierten Zuordnung.
const validVideoIds = new Set(videosManifest.videos.map(v => `video:${v.index}`))
const validAssessmentIds = new Set()
for (const mapped of cardsByVideoIndex.values()) {
  for (const m of mapped) validAssessmentIds.add(`mc:${m.questionId}`)
}
for (const [indexKey, list] of Object.entries(transcriptQuestions)) {
  list.forEach((_, i) => validAssessmentIds.add(`tq:T${indexKey}-${String(i + 1).padStart(2, '0')}`))
}
for (const card of profile.cards) validAssessmentIds.add(`card:${card.id}`)
const validPracticalIds = new Set(LAB_SCENARIOS.map(s => `lab:${s.id}`))
for (const c of pbqCards) validPracticalIds.add(`card:${c.cardId}`)

const curatedByReq = new Map(Object.entries(leafMapping?.entries ?? {}))
{
  const reqIds = new Set(requirements.map(r => r.requirementId))
  const problems = []
  for (const [reqId, entry] of curatedByReq) {
    if (!reqIds.has(reqId)) { problems.push(`unbekannte Requirement ${reqId}`); continue }
    if (!['covered', 'content-missing', 'assessment-missing'].includes(entry.status)) {
      problems.push(`${reqId}: ungültiger Status ${entry.status}`)
    }
    for (const id of entry.learningAssetIds ?? []) {
      if (!validVideoIds.has(id)) problems.push(`${reqId}: unbekanntes Lernasset ${id}`)
    }
    for (const id of entry.assessmentItemIds ?? []) {
      if (!validAssessmentIds.has(id)) problems.push(`${reqId}: unbekanntes Assessment-Item ${id}`)
    }
    for (const id of entry.practicalItemIds ?? []) {
      if (!validPracticalIds.has(id)) problems.push(`${reqId}: unbekanntes Praxis-Item ${id}`)
    }
    if (entry.status === 'covered'
      && ((entry.learningAssetIds ?? []).length === 0 || (entry.assessmentItemIds ?? []).length === 0)) {
      problems.push(`${reqId}: covered verlangt >=1 Lernasset UND >=1 Assessment-Item`)
    }
  }
  if (problems.length > 0) {
    console.error(`FATAL: leaf-mapping.json inkonsistent (${problems.length} Probleme):\n  - ` + problems.slice(0, 25).join('\n  - '))
    process.exit(2)
  }
}

const byRequirementId = {}
const statusCounts = { covered: 0, 'mapping-review': 0, 'content-missing': 0, 'assessment-missing': 0 }
for (const r of requirements) {
  const curated = curatedByReq.get(r.requirementId)
  let coverage
  if (curated) {
    coverage = {
      requirementId: r.requirementId,
      learningAssetIds: [...(curated.learningAssetIds ?? [])],
      assessmentItemIds: [...(curated.assessmentItemIds ?? [])],
      practicalItemIds: [...(curated.practicalItemIds ?? [])],
      qaStatus: curated.status,
      reviewer: curated.reviewer ?? leafMapping?.reviewer,
      ...(curated.note ? { note: curated.note } : {}),
    }
  } else {
    // Unkuratiert: Inhalt existiert höchstens auf Objective-Ebene.
    const hasLearning = (videosByObjective.get(r.objectiveId) ?? []).length > 0
    coverage = {
      requirementId: r.requirementId,
      learningAssetIds: (videosByObjective.get(r.objectiveId) ?? []).map(i => `video:${i}`),
      assessmentItemIds: [],
      practicalItemIds: (labsByObjective.get(r.objectiveId) ?? []).map(id => `lab:${id}`),
      qaStatus: hasLearning ? 'mapping-review' : 'content-missing',
    }
  }
  statusCounts[coverage.qaStatus] += 1
  byRequirementId[r.requirementId] = coverage
}
const blocking = Object.values(byRequirementId).filter(r => r.qaStatus !== 'covered').map(r => r.requirementId)
writeArtifact('content-qa-report.json', {
  sourceSnapshotId: snapshot.snapshotId,
  requirementCount: requirements.length,
  coveredCount: requirements.length - blocking.length,
  statusCounts,
  byRequirementId,
  blockingRequirementIds: blocking,
  mappingDecisions: {
    decided: mappingDecisions.decisions.length,
    applied: 0,
    note: mappingDecisions.applicationStatus,
  },
  provenance: {
    cardSet: 'Dritt-/abgeleitetes Kursmaterial (messner_lernkarten) — Lizenz-/Herkunftsprüfung siehe content/sy0-701/LIZENZ-HERKUNFT.md',
    objectivesSnapshot: snapshot.usageBasis,
  },
})
gate('leaf-mapping-gesichtet', statusCounts['mapping-review'] === 0,
  `${requirements.length - statusCounts['mapping-review']}/${requirements.length} Leaves fachlich gesichtet`)
gate('leaf-coverage', blocking.length === 0,
  `${requirements.length - blocking.length}/${requirements.length} covered; Lücken: ${statusCounts['content-missing']} content-missing, ${statusCounts['assessment-missing']} assessment-missing`)
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
      note: 'GESTRICHEN am 2026-07-19: keine Exam-Engine, keine Readiness-Formen — Ziel ist die Lerngrundlage.',
    },
  },
  disjointness: 'Course/Practice überlappen nicht (M-ID-Zuordnung vs. Rest); Readiness ist gestrichen.',
})

// ── 8) holdout-leakage-report ───────────────────────────────────────────────
writeArtifact('holdout-leakage-report.json', {
  sourceSnapshotId: snapshot.snapshotId,
  holdoutItemCount: 0,
  leakageFindings: [],
  verdict: 'NOT_APPLICABLE',
  note: 'GESTRICHEN am 2026-07-19: keine Exam-Engine, keine Holdout-Items — Artefakt bleibt als dokumentierter Nicht-Anspruch.',
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
  verdict: 'NOT_APPLICABLE',
  note: 'GESTRICHEN am 2026-07-19: keine Exam-Engine, keine Kalibrierung — Artefakt bleibt als dokumentierter Nicht-Anspruch.',
})

// ── Generierte TS-Datenmodule (Plan §20: sy0701ContentMap.ts, sy0701Requirements.ts) ──
const DATA_DIR = path.join(APP_ROOT, 'src', 'data')
const genHeader = `/**
 * AI_CONTEXT:
 * Role: GENERATED data module of the dedicated SY0-701 learning-unit system — do not edit by hand.
 * Used by: learning-unit builders/tests; regenerate via \`node scripts/sy0701/validate.mjs\`.
 * Important: Derived from content/sy0-701/source/* (official V7 snapshot ${snapshot.sha256.slice(0, 12)}…, manifest ${MANIFEST_VERSION}).
 */`

// Rückabbildung des kuratierten Leaf-Mappings: Video → zugeordnete Requirements.
const requirementIdsByVideo = new Map()
for (const [reqId, entry] of curatedByReq) {
  for (const assetId of entry.learningAssetIds ?? []) {
    const index = Number(assetId.replace('video:', ''))
    if (!requirementIdsByVideo.has(index)) requirementIdsByVideo.set(index, [])
    requirementIdsByVideo.get(index).push(reqId)
  }
}
const contentMapEntries = videoContentMap.map(v => ({
  videoIndex: v.videoIndex,
  objectiveId: v.objective,
  requirementIds: requirementIdsByVideo.get(v.videoIndex) ?? [],
  courseCardIds: v.cardIds,
  recallQuestionIds: v.recallQuestionIds,
  recallCardIds: v.cardIds,
  ...(v.durationSec !== null ? { durationSec: v.durationSec } : {}),
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
fs.writeFileSync(
  path.join(DATA_DIR, 'sy0701Acronyms.ts'),
  `${genHeader}

export interface AcronymMeaning {
  acronymMeaningId: string
  abbr: string
  meaning: string
}

export const SY0701_ACRONYMS: readonly AcronymMeaning[] = ${JSON.stringify(acronyms, null, 2)}

export const SY0701_AMBIGUOUS_ABBRS: readonly string[] = ${JSON.stringify(ambiguousAbbrs, null, 2)}
`,
)
console.log('Generiert: src/data/sy0701ContentMap.ts, src/data/sy0701Requirements.ts, src/data/sy0701Acronyms.ts')

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
