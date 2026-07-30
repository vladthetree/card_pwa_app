/**
 * Shared learning-plan domain values. Kept outside React so persistence, sync,
 * and UI validate the same exam-language codes.
 */
export const SUPPORTED_EXAM_LANGUAGES = ['en', 'ja', 'pt', 'es', 'th'] as const
export type ExamLanguage = (typeof SUPPORTED_EXAM_LANGUAGES)[number]

export function isSupportedExamLanguage(value: unknown): value is ExamLanguage {
  return typeof value === 'string'
    && SUPPORTED_EXAM_LANGUAGES.includes(value as ExamLanguage)
}
