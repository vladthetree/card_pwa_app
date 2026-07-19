import { describe, it, expect } from 'vitest'
import { buildLabScenarioSnapshot, scoreLabAnswers } from '../../utils/labSnapshot'
import type { LabScenario } from '../../data/labScenarios'
import { LAB_SCENARIOS } from '../../data/labScenarios'

const MATCHING: LabScenario = {
  id: 'fw-1',
  categoryId: 'firewalls',
  title: 'ACL-Wirkungen',
  objective: '4.5 Modify enterprise capabilities',
  difficulty: 'einsteiger',
  minutes: 8,
  description: 'Ordne Regeln ihren Wirkungen zu.',
  goal: 'Telnet blockieren, HTTPS erlauben.',
  interaction: {
    type: 'matching',
    items: [
      { left: 'deny tcp any any eq 23', right: 'Telnet blockieren' },
      { left: 'permit tcp any host 10.0.0.5 eq 443', right: 'HTTPS erlauben' },
      { left: 'deny udp any any eq 69', right: 'TFTP blockieren' },
    ],
    options: ['Telnet blockieren', 'HTTPS erlauben', 'TFTP blockieren', 'DNS umleiten'],
  },
}

const ORDERING: LabScenario = {
  id: 'ir-1',
  categoryId: 'incident-response',
  title: 'IR-Prozess',
  objective: '4.8 Incident response',
  difficulty: 'fortgeschritten',
  minutes: 10,
  description: 'Bringe die Schritte in die richtige Reihenfolge.',
  interaction: {
    type: 'ordering',
    steps: ['Containment', 'Preparation', 'Recovery', 'Detection'],
    correctOrder: [1, 3, 0, 2], // Preparation → Detection → Containment → Recovery
  },
}

describe('buildLabScenarioSnapshot', () => {
  it('normalisiert deterministisch: stabile Schritt-ID, Rubrik und Content-Hash-Version', () => {
    const first = buildLabScenarioSnapshot(MATCHING)
    const second = buildLabScenarioSnapshot(MATCHING)
    expect(second).toEqual(first)
    expect(first.steps[0].stepId).toBe('step-1')
    expect(first.scenarioVersion).toMatch(/^v-/)
    expect(first.expectedDurationSec).toBe(480)

    // Jede Textänderung ändert die Versionskennung.
    const changed = buildLabScenarioSnapshot({
      ...MATCHING,
      interaction: {
        ...MATCHING.interaction,
        type: 'matching',
        items: [{ left: 'deny tcp any any eq 23', right: 'SSH blockieren' }],
        options: ['SSH blockieren'],
      },
    })
    expect(changed.scenarioVersion).not.toBe(first.scenarioVersion)
  })

  it('leitet die Ordering-Rubrik aus der korrekten Reihenfolge ab', () => {
    const snapshot = buildLabScenarioSnapshot(ORDERING)
    const criterion = snapshot.rubric[0]
    expect(criterion.comparison).toBe('order-equal')
    if (criterion.comparison === 'order-equal') {
      expect(criterion.expectedOrder).toEqual(['Preparation', 'Detection', 'Containment', 'Recovery'])
      expect(criterion.points).toBe(4)
    }
  })

  it('lässt sich über die gesamte Registry ableiten (100 % der Szenarien normalisierbar)', () => {
    for (const scenario of LAB_SCENARIOS) {
      const snapshot = buildLabScenarioSnapshot(scenario)
      expect(snapshot.steps).toHaveLength(1)
      expect(snapshot.rubric).toHaveLength(1)
    }
  })
})

describe('scoreLabAnswers', () => {
  it('Matching: 1 Teilpunkt je korrektes Paar; unbeantwortet zählt 0 bei vollem Nenner', () => {
    const snapshot = buildLabScenarioSnapshot(MATCHING)
    const partial = scoreLabAnswers(snapshot, {
      'step-1': {
        'deny tcp any any eq 23': 'Telnet blockieren',
        'permit tcp any host 10.0.0.5 eq 443': 'DNS umleiten', // falsch
        // drittes Paar unbeantwortet
      },
    })
    expect(partial).toMatchObject({ earnedPoints: 1, possiblePoints: 3, solved: false })
    expect(partial.byCriterionId['step-1:pairs'].outcome).toBe('partial')

    const empty = scoreLabAnswers(snapshot, {})
    expect(empty).toMatchObject({ earnedPoints: 0, possiblePoints: 3, solved: false })
    expect(empty.byCriterionId['step-1:pairs'].outcome).toBe('failure')
  })

  it('Ordering: exact-position vergibt Teilpunkte nur für exakt platzierte Schritte', () => {
    const snapshot = buildLabScenarioSnapshot(ORDERING)
    const twoRight = scoreLabAnswers(snapshot, {
      'step-1': ['Preparation', 'Detection', 'Recovery', 'Containment'],
    })
    expect(twoRight).toMatchObject({ earnedPoints: 2, possiblePoints: 4, solved: false })

    const solved = scoreLabAnswers(snapshot, {
      'step-1': ['Preparation', 'Detection', 'Containment', 'Recovery'],
    })
    expect(solved).toMatchObject({ earnedPoints: 4, possiblePoints: 4, solved: true })
    expect(solved.byCriterionId['step-1:order'].outcome).toBe('success')
    expect(solved.byCriterionId['step-1:order'].feedback).toBeTruthy()
  })
})
