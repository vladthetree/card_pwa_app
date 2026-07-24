import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HomeLearningUnitList } from '../../components/home/HomeLearningUnitList'
import type { RankedLearningUnit } from '../../utils/learningUnitRanking'

function rankedUnit(order: number, recommended = false): RankedLearningUnit {
  return {
    definition: {
      unitId: `course-${order}`,
      type: 'course',
      title: `Video ${order}`,
      objectiveIds: ['1.1'],
      requirementIds: [],
      order,
      estimatedMinutes: 10 + order,
      videoIndex: order,
      definitionVersion: 'test',
    },
    rank: order,
    reason: recommended ? 'next_course_in_sequence' : 'objective_practice_gap',
    recommended,
    blocked: false,
  }
}

describe('HomeLearningUnitList responsive summary', () => {
  it('zeigt eine fokussierte Dreierauswahl mit Typ, Dauer und Empfehlung', () => {
    const html = renderToStaticMarkup(createElement(HomeLearningUnitList, {
      language: 'de',
      phase: 'foundation',
      daysLeft: 30,
      readiness: 'notReady',
      courseCompleted: 2,
      courseTotal: 120,
      ranked: [
        rankedUnit(1, true),
        rankedUnit(2),
        rankedUnit(3),
        rankedUnit(4),
      ],
      stateByUnitId: new Map(),
      onOpenUnit: () => undefined,
    }))

    expect(html).toContain('Empfohlen')
    expect(html).toContain('ca. 11 Min.')
    expect(html).toContain('data-testid="learning-unit-row-course-3"')
    expect(html).not.toContain('data-testid="learning-unit-row-course-4"')
    expect(html).toContain('neo-learning-card')
  })
})
