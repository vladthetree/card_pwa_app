/**
 * AI_CONTEXT:
 * Role: §13.2-Normalisierung der Lab-Szenarien als deterministische Ableitung
 *       aus der Registry: stabile Schritt-IDs, Teilpunkt-Rubrik mit Feedback
 *       und pures Scoring gegen den eingefrorenen Snapshot.
 * Used by: learningUnitRunner (Einfrieren beim Versuchsstart + Bewertung jedes
 *          Lösungs-Checks) und Tests.
 * Important: Pure, kein I/O. Anzeigetexte dienen als stabile IDs innerhalb
 *            eines Snapshots — jede Textänderung ändert die Versionskennung
 *            (Content-Hash) und erreicht laufende Versuche nie (§13.2).
 */
import type { LabScenario } from '../data/labScenarios'
import { fnv1a32 } from './hash'

export interface LabRubricFeedback {
  success: string
  partial: string
  failure: string
}

export type LabStepSnapshot =
  | {
      stepId: string
      kind: 'matching'
      prompt: string
      /** Linke Elemente in Anzeige-Reihenfolge; Texte sind die stabilen IDs. */
      leftIds: string[]
      /** Alle Auswahl-Optionen (korrekte Pendants + Distraktoren). */
      options: string[]
    }
  | {
      stepId: string
      kind: 'ordering'
      prompt: string
      /** Schritte in initialer (gemischter) Anzeige-Reihenfolge. */
      itemIds: string[]
    }

export type LabRubricCriterionSnapshot =
  | {
      criterionId: string
      stepId: string
      comparison: 'pairs-equal'
      expectedRightIdByLeftId: Record<string, string>
      pointsByLeftId: Record<string, number>
      feedback: LabRubricFeedback
    }
  | {
      criterionId: string
      stepId: string
      comparison: 'order-equal'
      expectedOrder: string[]
      partialCreditRule: 'exact-position'
      points: number
      feedback: LabRubricFeedback
    }

export interface LabScenarioSnapshot {
  scenarioId: string
  /** Content-Hash über den normalisierten Snapshot-Kern. */
  scenarioVersion: string
  title: string
  objectiveLabel: string
  difficulty: LabScenario['difficulty']
  expectedDurationSec: number
  steps: LabStepSnapshot[]
  rubric: LabRubricCriterionSnapshot[]
}

const FEEDBACK: LabRubricFeedback = {
  success: 'Alle Zuordnungen korrekt.',
  partial: 'Teilweise korrekt — vergleiche die markierten Einträge mit dem Beweismaterial.',
  failure: 'Keine korrekte Zuordnung — Szenario und Beweismaterial erneut durchgehen.',
}

/**
 * Leitet den §13.2-Snapshot deterministisch aus einem Registry-Szenario ab:
 * genau ein Schritt (`step-1`) je heutiger Interaktion mit Teilpunkt-Rubrik —
 * Matching: 1 Punkt je Paar; Ordering: 1 Punkt je exakt platzierter Position.
 */
export function buildLabScenarioSnapshot(scenario: LabScenario): LabScenarioSnapshot {
  const stepId = 'step-1'
  const interaction = scenario.interaction
  let step: LabStepSnapshot
  let criterion: LabRubricCriterionSnapshot

  if (interaction.type === 'matching') {
    const expectedRightIdByLeftId: Record<string, string> = {}
    const pointsByLeftId: Record<string, number> = {}
    for (const item of interaction.items) {
      expectedRightIdByLeftId[item.left] = item.right
      pointsByLeftId[item.left] = 1
    }
    step = {
      stepId,
      kind: 'matching',
      prompt: scenario.goal ?? scenario.description,
      leftIds: interaction.items.map(item => item.left),
      options: [...interaction.options],
    }
    criterion = {
      criterionId: `${stepId}:pairs`,
      stepId,
      comparison: 'pairs-equal',
      expectedRightIdByLeftId,
      pointsByLeftId,
      feedback: FEEDBACK,
    }
  } else {
    const expectedOrder = interaction.correctOrder.map(index => interaction.steps[index])
    step = {
      stepId,
      kind: 'ordering',
      prompt: scenario.goal ?? scenario.description,
      itemIds: [...interaction.steps],
    }
    criterion = {
      criterionId: `${stepId}:order`,
      stepId,
      comparison: 'order-equal',
      expectedOrder,
      partialCreditRule: 'exact-position',
      points: expectedOrder.length,
      feedback: FEEDBACK,
    }
  }

  const core = {
    scenarioId: scenario.id,
    title: scenario.title,
    objectiveLabel: scenario.objective,
    difficulty: scenario.difficulty,
    expectedDurationSec: scenario.minutes * 60,
    steps: [step],
    rubric: [criterion],
  }
  return { ...core, scenarioVersion: `v-${fnv1a32(JSON.stringify(core)).toString(16)}` }
}

export interface LabCriterionResult {
  earned: number
  possible: number
  outcome: 'success' | 'partial' | 'failure'
  feedback: string
}

export interface LabScoreResult {
  earnedPoints: number
  possiblePoints: number
  solved: boolean
  byCriterionId: Record<string, LabCriterionResult>
}

/** Bewertet Antworten ausschließlich gegen die EINGEFRORENE Rubrik (§13.2);
 *  unbeantwortete Teile zählen 0 Punkte bei unverändertem Nenner. */
export function scoreLabAnswers(
  snapshot: Pick<LabScenarioSnapshot, 'rubric'>,
  answerByStepId: Record<string, unknown>,
): LabScoreResult {
  let earnedPoints = 0
  let possiblePoints = 0
  const byCriterionId: Record<string, LabCriterionResult> = {}

  for (const criterion of snapshot.rubric) {
    const answer = answerByStepId[criterion.stepId]
    let earned = 0
    let possible = 0

    if (criterion.comparison === 'pairs-equal') {
      const chosen = (answer ?? {}) as Record<string, unknown>
      for (const [leftId, points] of Object.entries(criterion.pointsByLeftId)) {
        possible += points
        if (chosen[leftId] === criterion.expectedRightIdByLeftId[leftId]) earned += points
      }
    } else {
      possible = criterion.points
      const givenOrder = Array.isArray(answer) ? (answer as unknown[]) : []
      const pointsPerPosition = criterion.points / criterion.expectedOrder.length
      criterion.expectedOrder.forEach((itemId, index) => {
        if (givenOrder[index] === itemId) earned += pointsPerPosition
      })
      earned = Math.round(earned)
    }

    const outcome: LabCriterionResult['outcome'] =
      earned >= possible ? 'success' : earned === 0 ? 'failure' : 'partial'
    byCriterionId[criterion.criterionId] = {
      earned,
      possible,
      outcome,
      feedback: criterion.feedback[outcome],
    }
    earnedPoints += earned
    possiblePoints += possible
  }

  return {
    earnedPoints,
    possiblePoints,
    solved: possiblePoints > 0 && earnedPoints >= possiblePoints,
    byCriterionId,
  }
}
