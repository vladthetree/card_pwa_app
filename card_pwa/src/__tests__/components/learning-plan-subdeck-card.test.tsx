import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  LearningPlanAcronymReferences,
  LearningPlanSubDeckCard,
  LearningPlanSubDeckInfoModal,
} from '../../components/LearningPlanSubDeckCard'
import type {
  LearningPlanAcronymCardMapping,
  LearningPlanSubDeckReadModel,
} from '../../utils/learningPlanMapping'

function subDeck(
  overrides: Partial<LearningPlanSubDeckReadModel> = {},
): LearningPlanSubDeckReadModel {
  return {
    deckId: 'sy0-701-objective-4-5',
    subDeckName: '4.5 Enterprise Security',
    domainId: '4',
    rootDeckName: '04_Security_Operations',
    sourceSubDeckIds: ['sy0-701-objective-4-5'],
    objectiveId: '4.5',
    unitIds: ['unit:course:080'],
    cardIds: ['c1', 'c2'],
    installedCardIds: ['c1', 'c2'],
    reviewedCardIds: ['c1', 'c2'],
    missingCardIds: [],
    physicalDeckIds: ['sy0-701-objective-4-5'],
    successRate: { rate: 90, ratio: 0.9, successful: 9, total: 10 },
    status: 'fulfilled',
    ...overrides,
  }
}

describe('LearningPlanSubDeckCard', () => {
  it('zeigt ein erfülltes Subdeck grün und mit der echten Rate', () => {
    const html = renderToStaticMarkup(createElement(LearningPlanSubDeckCard, {
      language: 'de',
      deck: subDeck(),
      onStudy: () => undefined,
      onOpenInfo: () => undefined,
    }))

    expect(html).toContain('data-learning-plan-status="fulfilled"')
    expect(html).toContain('bg-[#86EFAC]')
    expect(html).toContain('Sub-Deck')
    expect(html).toContain('90 % Erfolgsrate · 10 Bewertungen')
    expect(html).toContain('2/2 Karten bewertet')
    expect(html).toContain('Erfüllt')
    expect(html).toContain('Erfüllt: alle Karten bewertet und mindestens 90 % Erfolgsrate')
    expect(html).toContain('aria-label="Sub-Deck 4.5 Enterprise Security öffnen"')
    expect(html).not.toContain('Echtes Subdeck lernen')
  })

  it('zeigt ein noch offenes Sub-Deck weiß und 0 Antworten neutral', () => {
    const html = renderToStaticMarkup(createElement(LearningPlanSubDeckCard, {
      language: 'de',
      deck: subDeck({
        successRate: { rate: 0, ratio: 0, successful: 0, total: 0 },
        status: 'open',
      }),
      onStudy: () => undefined,
      onOpenInfo: () => undefined,
    }))

    expect(html).toContain('data-learning-plan-status="open"')
    expect(html).toContain('neo-learning-hover-yellow bg-white')
    expect(html).toContain('Noch keine Bewertungen')
    expect(html).toContain('Offen')
    expect(html).not.toContain('>0 % Erfolgsrate<')
  })

  it('zeigt „In Bearbeitung“ wie bei Video-Einheiten als Status-Tag', () => {
    const html = renderToStaticMarkup(createElement(LearningPlanSubDeckCard, {
      language: 'de',
      deck: subDeck({
        successRate: { rate: 70, ratio: 0.7, successful: 7, total: 10 },
        status: 'inProgress',
      }),
      onStudy: () => undefined,
      onOpenInfo: () => undefined,
    }))

    expect(html).toContain('data-learning-plan-status="inProgress"')
    expect(html).toContain('70 % Erfolgsrate · 10 Bewertungen')
    expect(html).toMatch(/rounded-full[^"]*bg-\[#FDBA74\][^"]*"[^>]*>In Bearbeitung</)
  })

  it('zeigt im barrierearmen Info-Dialog Kriterium, echte Rate und Status', () => {
    const html = renderToStaticMarkup(createElement(LearningPlanSubDeckInfoModal, {
      language: 'de',
      deck: subDeck(),
      onClose: () => undefined,
    }))

    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('Jede installierte Karte mindestens einmal bewertet')
    expect(html).toContain('90 % Erfolgsrate · 10 Bewertungen')
    expect(html).toContain('Der Wert stammt aus allen Reviews der echten Karten-IDs')
    expect(html).toContain('Erfüllt')
  })
})

describe('LearningPlanAcronymReferences', () => {
  it('zeigt dieselbe echte Acronym-Card-ID als einzelne Referenz', () => {
    const card: LearningPlanAcronymCardMapping = {
      cardId: '1779724748974',
      label: 'Detection & Response',
      objectiveIds: ['4.4', '4.5', '4.7'],
      rationale: 'Mehrfachbezug',
      installed: true,
      reviewed: true,
      physicalDeckId: 'sy0-701-acronyms-bonus',
    }
    const html = renderToStaticMarkup(createElement(LearningPlanAcronymReferences, {
      language: 'de',
      cards: [card],
      onStudy: () => undefined,
      defaultOpen: true,
    }))

    expect(html).toContain('data-card-id="1779724748974"')
    expect(html).toContain('Acronym-Bonus (ABCD + PBQ)')
    expect(html).toContain('Fortschritt bleibt an der echten Card-ID')
    expect(html).toContain('Bewertet')
  })

  it('startet eingeklappt und zeigt nur Titel mit Anzahl (Referenzmaterial dominiert den Lernpfad nicht)', () => {
    const card: LearningPlanAcronymCardMapping = {
      cardId: '1779724748974',
      label: 'Detection & Response',
      objectiveIds: ['4.4'],
      rationale: 'Mehrfachbezug',
      installed: true,
      reviewed: true,
      physicalDeckId: 'sy0-701-acronyms-bonus',
    }
    const html = renderToStaticMarkup(createElement(LearningPlanAcronymReferences, {
      language: 'de',
      cards: [card],
      onStudy: () => undefined,
    }))

    expect(html).toContain('Acronym-Karten')
    expect(html).toContain('(1)')
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('data-card-id="1779724748974"')
  })
})
