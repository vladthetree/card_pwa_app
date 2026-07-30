import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HomeLearningUnitList } from '../../components/home/HomeLearningUnitList'
import type { LearningUnitState } from '../../utils/learningUnits'
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
    expect(html).toContain('Abruf-Check vollständig beendet und Lernstatus')
  })

  it('zeigt auf der Einheit klar den nächsten offenen Schritt', () => {
    const state: LearningUnitState = {
      profileId: 'p',
      evidenceEpoch: 1,
      unitId: 'course-1',
      activityStatus: 'inProgress',
      currentStep: 'recall',
      activeExecutionId: 'exec-1',
      lastActivityAt: 1,
      updatedAt: 1,
    }
    const html = renderToStaticMarkup(createElement(HomeLearningUnitList, {
      language: 'de',
      phase: 'foundation',
      daysLeft: 30,
      readiness: 'notReady',
      courseCompleted: 0,
      courseTotal: 120,
      ranked: [rankedUnit(1, true)],
      stateByUnitId: new Map([['course-1', state]]),
      onOpenUnit: () => undefined,
    }))

    expect(html).toContain('in Bearbeitung')
    expect(html).toContain('Nächster Schritt: Abruf-Check beenden und Lernstatus wählen')
    expect(html).toContain('bg-[#FDBA74]')
  })

  it('kennzeichnet eine abgeschlossene Einheit eindeutig grün', () => {
    const state: LearningUnitState = {
      profileId: 'p',
      evidenceEpoch: 1,
      unitId: 'course-1',
      activityStatus: 'completed',
      currentStep: 'done',
      lastActivityAt: 2,
      completedAt: 2,
      updatedAt: 2,
    }
    const html = renderToStaticMarkup(createElement(HomeLearningUnitList, {
      language: 'de',
      phase: 'foundation',
      daysLeft: 30,
      readiness: 'notReady',
      courseCompleted: 1,
      courseTotal: 120,
      ranked: [rankedUnit(1)],
      stateByUnitId: new Map([['course-1', state]]),
      onOpenUnit: () => undefined,
    }))

    expect(html).toContain('abgeschlossen')
    expect(html).toContain('Fertig: Video und Abruf-Check bearbeitet')
    expect(html).toContain('bg-[#86EFAC]')
  })
})
