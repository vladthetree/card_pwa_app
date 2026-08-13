/**
 * Shared learning-plan domain values. Kept outside React so persistence, sync,
 * and UI validate the same exam-language codes.
 */
import { isValidExamDateIso } from './examDate'

export const SUPPORTED_EXAM_LANGUAGES = ['en', 'ja', 'pt', 'es', 'th'] as const
export type ExamLanguage = (typeof SUPPORTED_EXAM_LANGUAGES)[number]

export function isSupportedExamLanguage(value: unknown): value is ExamLanguage {
  return typeof value === 'string'
    && SUPPORTED_EXAM_LANGUAGES.includes(value as ExamLanguage)
}

export interface LearningPlanFormValues {
  examDateIso: string
  examLanguage: string
  weeklyHours: string
  learningDays: string
  bufferDays: string
}

export interface NormalizedLearningPlanValues {
  examDateIso: string | null
  examLanguage: ExamLanguage
  weeklyMinutesAvailable: number
  learningDaysPerWeek: number
  bufferDays: number
}

export type LearningPlanField = keyof LearningPlanFormValues

export function buildLearningPlanFormValues(input: {
  examDateIso?: string | null
  examLanguage?: string | null
  weeklyMinutesAvailable?: number | null
  learningDaysPerWeek?: number | null
  bufferDays?: number | null
}): LearningPlanFormValues {
  return {
    examDateIso: input.examDateIso ?? '',
    examLanguage: isSupportedExamLanguage(input.examLanguage) ? input.examLanguage : 'en',
    weeklyHours: String((input.weeklyMinutesAvailable ?? 300) / 60),
    learningDays: String(input.learningDaysPerWeek ?? 6),
    bufferDays: String(input.bufferDays ?? 7),
  }
}

export function learningPlanFormValuesEqual(a: LearningPlanFormValues, b: LearningPlanFormValues): boolean {
  return (Object.keys(a) as LearningPlanField[]).every(key => a[key] === b[key])
}

export function normalizeLearningPlanFormValues(values: LearningPlanFormValues): NormalizedLearningPlanValues | null {
  const weeklyHours = Number(values.weeklyHours)
  const learningDays = Number(values.learningDays)
  const bufferDays = Number(values.bufferDays)
  const dateValid = values.examDateIso === '' || isValidExamDateIso(values.examDateIso)
  const languageValid = isSupportedExamLanguage(values.examLanguage)
  if (
    !dateValid || !languageValid ||
    !Number.isFinite(weeklyHours) || weeklyHours < 0.5 || weeklyHours > 80 ||
    !Number.isInteger(learningDays) || learningDays < 1 || learningDays > 7 ||
    values.bufferDays.trim() === '' ||
    !Number.isInteger(bufferDays) || bufferDays < 0 || bufferDays > 60
  ) return null

  return {
    examDateIso: values.examDateIso || null,
    examLanguage: values.examLanguage as ExamLanguage,
    weeklyMinutesAvailable: Math.round(weeklyHours * 60),
    learningDaysPerWeek: learningDays,
    bufferDays,
  }
}
