/**
 * AI_CONTEXT: Zweisprachiges Copy-Wörterbuch des Lerneinheiten-Moduls (Labels,
 * Phasen, Reife, Empfehlungsgründe). Eigenes Modul, damit HomeLearningUnitsTile
 * und LearningUnitsView es nicht aus der Nachbarkomponente HomeLearningUnitList
 * importieren müssen.
 */
import type { LearningPhase, ReadinessStatus } from '../../utils/learningUnits'
import type { LearningUnitReason } from '../../utils/learningUnitRanking'

export const LEARNING_UNIT_COPY = {
  de: {
    label: 'Lerneinheiten · SY0-701',
    showAll: 'Alle anzeigen',
    recommended: 'Empfohlen',
    duration: (minutes: number) => `ca. ${minutes} Min.`,
    type: {
      course: 'Video',
      review: 'Wiederholung',
      lab: 'Lab',
    },
    progress: (done: number, total: number) => `${done}/${total} bearbeitet`,
    daysLeft: (days: number) => days === 1 ? 'noch 1 Tag' : `noch ${days} Tage`,
    examToday: 'Prüfungstag',
    pastExam: 'Termin überschritten',
    evidenceNote: 'Evidenz: noch unzureichend',
    readiness: {
      notReady: 'Reife: noch nicht bereit',
      approaching: 'Reife: auf dem Weg',
      examReady: 'Reife: prüfungsbereit',
    } satisfies Record<ReadinessStatus, string>,
    phase: {
      foundation: 'Grundlagen',
      deepening: 'Vertiefung',
      exam: 'Prüfungsphase',
      final: 'Endspurt',
      pastExam: 'Termin überschritten',
    } satisfies Record<LearningPhase, string>,
    activity: {
      notStarted: 'offen',
      inProgress: 'in Bearbeitung',
      completed: 'abgeschlossen',
    },
    currentStep: {
      video: 'Nächster Schritt: Video ansehen',
      recall: 'Nächster Schritt: Abruf-Check beenden und Lernstatus wählen',
      cards: 'Nächster Schritt: ausgewählte Karten bewerten',
      lab: 'Nächster Schritt: Lab vollständig lösen',
      done: 'Alle erforderlichen Schritte erledigt',
    },
    activeCardProgress: (reviewed: number, total: number) =>
      `${reviewed}/${total} Karten in dieser Einheit seit Start bewertet`,
    completionRule: 'Video-Einheit fertig: Abruf-Check vollständig beendet und Lernstatus (Lücken, Okay oder Sicher) gewählt. Karten werden separat in Wiederholungs-Einheiten gelernt. Wiederholung fertig: jede ausgewählte Karte bewertet. Lab fertig: vollständig gelöst.',
    completedDetail: {
      course: 'Fertig: Video und Abruf-Check bearbeitet',
      review: 'Wiederholungszyklus fertig · kann erneut fällig werden',
      lab: 'Fertig: Lab vollständig gelöst',
    },
    reason: {
      active_execution: 'Angefangen — fortsetzen',
      completed_activity: 'Bereits abgeschlossen',
      scheduler_due: 'Wiederholung fällig',
      unresolved_error_retest: 'Ungelöste Fehler erneut prüfen',
      next_course_in_sequence: 'Nächstes Video der Reihe',
      objective_practice_gap: 'Übung fürs Objective',
      lab_retry: 'Lab erneut versuchen',
      weak_domain: 'Schwache Domain vertiefen',
      exam_practice: 'Prüfungs-Drill',
      readiness_no_go: 'Termin/Plan prüfen',
    } satisfies Record<LearningUnitReason, string>,
    noGo: 'Der Prüfungstermin ist überschritten. Termin oder Plan aktualisieren — bis dahin gibt es keine aktuelle Empfehlung.',
  },
  en: {
    label: 'Learning units · SY0-701',
    showAll: 'Show all',
    recommended: 'Recommended',
    duration: (minutes: number) => `about ${minutes} min`,
    type: {
      course: 'Video',
      review: 'Review',
      lab: 'Lab',
    },
    progress: (done: number, total: number) => `${done}/${total} worked through`,
    daysLeft: (days: number) => days === 1 ? '1 day left' : `${days} days left`,
    examToday: 'Exam day',
    pastExam: 'Exam date passed',
    evidenceNote: 'Evidence: still insufficient',
    readiness: {
      notReady: 'Readiness: not ready yet',
      approaching: 'Readiness: approaching',
      examReady: 'Readiness: exam-ready',
    } satisfies Record<ReadinessStatus, string>,
    phase: {
      foundation: 'Foundations',
      deepening: 'Deepening',
      exam: 'Exam phase',
      final: 'Final stretch',
      pastExam: 'Exam date passed',
    } satisfies Record<LearningPhase, string>,
    activity: {
      notStarted: 'open',
      inProgress: 'in progress',
      completed: 'completed',
    },
    currentStep: {
      video: 'Next step: watch the video',
      recall: 'Next step: finish the recall check and choose a learning status',
      cards: 'Next step: rate the selected cards',
      lab: 'Next step: solve the lab completely',
      done: 'All required steps completed',
    },
    activeCardProgress: (reviewed: number, total: number) =>
      `${reviewed}/${total} cards in this unit rated since it started`,
    completionRule: 'Video unit done: recall check fully completed and a learning status (Gaps, Okay, or Solid) selected. Cards are studied separately in review units. Review done: every selected card rated. Lab done: solved completely.',
    completedDetail: {
      course: 'Done: video and recall check completed',
      review: 'Review cycle done · it can become due again',
      lab: 'Done: lab solved completely',
    },
    reason: {
      active_execution: 'Started — continue',
      completed_activity: 'Already completed',
      scheduler_due: 'Review due',
      unresolved_error_retest: 'Retest unresolved errors',
      next_course_in_sequence: 'Next video in sequence',
      objective_practice_gap: 'Practice for the objective',
      lab_retry: 'Retry the lab',
      weak_domain: 'Strengthen a weak domain',
      exam_practice: 'Exam drill',
      readiness_no_go: 'Check exam date/plan',
    } satisfies Record<LearningUnitReason, string>,
    noGo: 'The exam date has passed. Update the date or plan — until then there is no current recommendation.',
  },
} as const
