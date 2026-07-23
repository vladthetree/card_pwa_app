/**
 * AI_CONTEXT: Regression coverage for responsive learning-plan form values,
 * validation, compact summary markup, and exam-date source precedence.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  LearningPlanPanel,
  buildLearningPlanFormValues,
  learningPlanFormValuesEqual,
  normalizeLearningPlanFormValues,
} from '../../components/LearningPlanPanel'
import { resolveEffectiveLearningPlanExamDate } from '../../hooks/home/useLearningUnits'
import { computeDraftPacing, computeLearningWorkload } from '../../utils/learningUnitRanking'

const contentProgress = {
  rootDeckCount: 5,
  deckCount: 28,
  unitCount: 120,
  cardCount: 412,
  installedCardCount: 412,
  reviewedCardCount: 42,
  missingCardCount: 0,
}

describe('LearningPlanPanel values', () => {
  it('baut stabile iOS-Formwerte aus einem gespeicherten Draft', () => {
    const values = buildLearningPlanFormValues({
      examDateIso: '2026-09-12',
      examLanguage: 'en',
      weeklyMinutesAvailable: 330,
      learningDaysPerWeek: 5,
      bufferDays: 3,
    })
    expect(values).toEqual({
      examDateIso: '2026-09-12',
      examLanguage: 'en',
      weeklyHours: '5.5',
      learningDays: '5',
      bufferDays: '3',
    })
    expect(normalizeLearningPlanFormValues(values)).toEqual({
      examDateIso: '2026-09-12',
      examLanguage: 'en',
      weeklyMinutesAvailable: 330,
      learningDaysPerWeek: 5,
      bufferDays: 3,
    })
  })

  it('lässt leere Felder beim Tippen zu, aber nicht beim Speichern', () => {
    const valid = buildLearningPlanFormValues({})
    expect(normalizeLearningPlanFormValues({ ...valid, weeklyHours: '' })).toBeNull()
    expect(normalizeLearningPlanFormValues({ ...valid, learningDays: '8' })).toBeNull()
    expect(normalizeLearningPlanFormValues({ ...valid, bufferDays: '-1' })).toBeNull()
  })

  it('erkennt echte Änderungen ohne numerische Zwischenzustände umzudeuten', () => {
    const baseline = buildLearningPlanFormValues({ weeklyMinutesAvailable: 300 })
    expect(learningPlanFormValuesEqual(baseline, { ...baseline })).toBe(true)
    expect(learningPlanFormValuesEqual(baseline, { ...baseline, weeklyHours: '5.0' })).toBe(false)
  })
})

describe('Lernplan-Terminquelle', () => {
  it('nutzt bei Altinstallationen den restaurierten Draft als Fallback', () => {
    expect(resolveEffectiveLearningPlanExamDate({
      settingsExamDateIso: null,
      settingsExamDateUpdatedAt: null,
      draftExamDateIso: '2026-10-01',
    })).toBe('2026-10-01')
  })

  it('priorisiert einen explizit geänderten Settings-Termin', () => {
    expect(resolveEffectiveLearningPlanExamDate({
      settingsExamDateIso: '2026-11-15',
      settingsExamDateUpdatedAt: 123,
      draftExamDateIso: '2026-10-01',
    })).toBe('2026-11-15')
  })

  it('respektiert ein explizites Löschen trotz altem Draft', () => {
    expect(resolveEffectiveLearningPlanExamDate({
      settingsExamDateIso: null,
      settingsExamDateUpdatedAt: 124,
      draftExamDateIso: '2026-10-01',
    })).toBeNull()
  })
})

describe('LearningPlanPanel summary', () => {
  it('trennt Planwerte von echten Review-Zeitmessungen', () => {
    const values = buildLearningPlanFormValues({
      examDateIso: '2026-09-12',
      weeklyMinutesAvailable: 300,
      learningDaysPerWeek: 6,
    })
    const workload = computeLearningWorkload({
      remainingCourseUnits: [{ unitId: 'course-1', estimatedMinutes: 60 }],
      remainingLabUnits: [{ unitId: 'lab-1', estimatedMinutes: 30 }],
      dueReviewCardCount: 8,
      unresolvedErrorCardCount: 4,
      pendingReviewCardCount: 10,
      timedReviewSampleCount: 4,
      observedReviewTimeMs: 120_000,
    })
    const pacing = computeDraftPacing({
      daysLeft: 30,
      plan: { weeklyMinutesAvailable: 300, learningDaysPerWeek: 6 },
      workload,
    })
    const html = renderToStaticMarkup(createElement(LearningPlanPanel, {
      language: 'de',
      summaryValues: values,
      values,
      pacing,
      previewPacing: pacing,
      contentProgress,
      open: false,
      dirty: false,
      saving: false,
      saveError: null,
      configured: false,
      collapseSignal: 0,
      onOpen: () => undefined,
      onChange: () => undefined,
      onSave: () => undefined,
      onClose: () => undefined,
    }))

    expect(html).toContain('data-testid="learning-workload-metrics"')
    expect(html).toContain('Kurs/Labs: Planwerte · Reviews bis Termin')
    expect(html).toContain('Kurs: 1 Einheiten · 1 Std. Planwert')
    expect(html).toContain('Ø 30 Sek./Karte aus 4 Messungen')
    expect(html).toContain('Bis Termin bereits fällig geplant: 10 Karten · etwa 5 Min.')
    expect(html).toContain('Prognostizierter Umfang: 1 Std. 54 Min.')
    expect(html).not.toContain('Prüfungssimulation')
  })

  it('rendert die kompakte Zusammenfassung mit iOS-großer Bearbeiten-Aktion', () => {
    const values = buildLearningPlanFormValues({
      examDateIso: '2026-09-12',
      weeklyMinutesAvailable: 300,
      learningDaysPerWeek: 6,
    })
    const pacing = computeDraftPacing({ daysLeft: null })
    const html = renderToStaticMarkup(createElement(LearningPlanPanel, {
      language: 'de',
      summaryValues: values,
      values,
      pacing,
      previewPacing: pacing,
      contentProgress,
      open: false,
      dirty: false,
      saving: false,
      saveError: null,
      configured: false,
      collapseSignal: 0,
      onOpen: () => undefined,
      onChange: () => undefined,
      onSave: () => undefined,
      onClose: () => undefined,
    }))
    expect(html).toContain('data-testid="learning-plan-summary"')
    expect(html).toContain('data-testid="learning-plan-edit"')
    expect(html).toContain('data-testid="learning-plan-toggle"')
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('min-h-11')
    expect(html).toContain('12. Sept. 2026')
    expect(html).toContain('5 Decks · 28 Subdecks · 120 Videos')
    expect(html).toContain('42/412 Karten bearbeitet')
    expect(html).toContain('role="progressbar"')
    expect(html).not.toContain('data-testid="learning-plan-editor"')
  })

  it('startet mit gespeichertem Plan als eingeklappter Briefing-Streifen', () => {
    const values = buildLearningPlanFormValues({
      examDateIso: '2026-09-12',
      weeklyMinutesAvailable: 300,
      learningDaysPerWeek: 6,
    })
    const pacing = computeDraftPacing({ daysLeft: null })
    const html = renderToStaticMarkup(createElement(LearningPlanPanel, {
      language: 'de',
      summaryValues: values,
      values,
      pacing,
      previewPacing: pacing,
      contentProgress,
      open: false,
      dirty: false,
      saving: false,
      saveError: null,
      configured: true,
      collapseSignal: 1,
      onOpen: () => undefined,
      onChange: () => undefined,
      onSave: () => undefined,
      onClose: () => undefined,
    }))
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('42/412 Karten bearbeitet')
    expect(html).not.toContain('5 Std./Woche')
  })
})
