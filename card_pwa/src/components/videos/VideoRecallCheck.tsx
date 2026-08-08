/**
 * AI_CONTEXT:
 * Role: Active-recall quiz after a video; asks ALL mapped Messer MC deck questions plus all curated transcript questions,
 *       tracks per-question right/wrong, and gates a "passed" state via the recallMastery model (≥90% per question).
 * Used by: VideosView recall-check modal.
 * Important: It intentionally does not write reviews or alter FSRS/SM2 scheduling; mastery state lives solely in the
 *            append-only recall-run history of the learning-units DB.
 */
import { useEffect, useState } from 'react'
import { Brain, Check, Eye, Loader2, RotateCcw, X } from 'lucide-react'
import { listCardsByIds, listDeckCards } from '../../db/queries'
import { listVideoRecallRunsForProfile } from '../../db/queries/learningUnits'
import type { Card } from '../../types'
import type { TranscriptQuestion } from '../../data/messerTranscriptQuestions'
import {
  parseQuestion,
  parseAnswer,
  parseMcAnswer,
  stripHtml,
  type MatchingAnswer,
  type OrderingAnswer,
} from '../../utils/cardTextParser'
import { suggestConfidence, type VideoConfidence } from '../../hooks/useMesserVideoProgress'
import { computeRecallVerdict, type RecallRunResult, type VideoRecallVerdict } from '../../hooks/useVideoRecallScores'
import {
  computeRecallMastery,
  computeRecallRunTally,
  formatLocalDayOf,
  selectRecallRunQuestionIds,
  type RecallRunLike,
} from '../../utils/recallMastery'
import { MESSER_VIDEO_BY_QUESTION_ID, normalizeMesserVideoTitle } from '../../data/messerVideoQuestionMap'

/**
 * Abruf-Check: aktives Erinnern direkt nach dem Video. Lädt das zugehörige
 * Objective-Deck (`getSecurityObjectiveDeckId`) und behält davon nur die Fragen, die
 * laut generiertem Mapping (messerVideoQuestionMap) zu GENAU diesem Video
 * gehören — erst erinnern, dann aufdecken, dann ehrlich selbst bewerten.
 * Kuratierte Transkriptfragen (messerTranscriptQuestions) kommen IMMER dazu:
 * die Zielmenge ist grundsätzlich der komplette hinterlegte Fragenbestand.
 *
 * Bestanden ist der Check erst, wenn JEDE Frage der Zielmenge im
 * Mastery-Modell (recallMastery) über 90 % liegt. Falsch beantwortete Fragen
 * werden an den kommenden Tagen erneut abgefragt — zusammen mit einer kleinen
 * Auffrischungs-Auswahl der übrigen Fragen.
 *
 * Bewusst NICHT planungswirksam: der Check schreibt keine Reviews und verändert
 * den FSRS-Zeitplan nicht. Sein Nutzen liegt im Abrufakt selbst (Testing-Effekt)
 * und in der Kalibrierung der Selbsteinschätzung. Für echte verteilte
 * Wiederholung startet man eine reguläre Lernsession des Decks.
 */

const MESSER_RECALL_QUESTION_PATTERN = /^(M([1-5])-\d{3}):\s+\S/
const NON_MESSER_RECALL_TAGS = new Set(['acronyms', 'acronym-bonus', 'pbq', 'drag-drop'])

const COPY = {
  de: {
    title: 'Abruf-Check',
    objective: 'Objective',
    loading: 'Karten werden geladen …',
    emptyTitle: 'Noch keine Fragen',
    emptyBody: 'Zu diesem Video gibt es noch keine fertigen Abruf-Fragen. Schau das Video, halte rechts Notizen fest — sobald Fragen zu diesem Video vorliegen, erscheinen sie hier.',
    notScheduling: 'Zählt nicht zur Wiederholung — dient dem aktiven Abruf und deiner Selbsteinschätzung.',
    intro: 'Erinnere dich an die Antwort, bevor du aufdeckst.',
    pickIntro: 'Tippe die richtige Antwort an.',
    card: 'Karte',
    reveal: 'Antwort zeigen',
    revealMissed: 'Weiß ich nicht — Antwort zeigen',
    next: 'Weiter',
    knew: 'Gewusst',
    missed: 'Nicht gewusst',
    answer: 'Antwort',
    explanation: 'Erklärung',
    mnemonic: 'Merkhilfe',
    fromTranscript: 'Aus dem Video',
    resultTitle: 'Ergebnis',
    resultScore: '{known} von {total} aus dem Gedächtnis gewusst',
    passTitle: 'Abruf-Check-Status',
    passPassed: 'Bestanden — alle {total} Fragen liegen über 90 %.',
    passPending: 'Noch nicht bestanden — {pending} von {total} Fragen offen.',
    passPendingHint: 'Falsch beantwortete Fragen zählen erst ab dem nächsten Tag als getilgt. Der nächste Check fragt sie erneut ab — plus eine kleine Auswahl der übrigen Fragen.',
    tally: 'Bisher insgesamt: {correct} richtig · {wrong} falsch',
    verdictTitle: 'Empfehlung',
    verdictUnderstood: 'Video verstanden — du kannst weiterziehen.',
    verdictAlmost: 'Fast — wiederhole den Check oder wirf noch einen Blick ins Video.',
    verdictReview: 'Schau dir das Video noch einmal an, bevor du weitermachst.',
    studyMissed: 'Diese {count} Karten regulär lernen',
    suggestion: 'Vorschlag für deine Selbsteinschätzung:',
    setConfidence: 'Status setzen',
    again: 'Nochmal',
    close: 'Schließen',
    gaps: 'Lücken',
    ok: 'Okay',
    solid: 'Sicher',
  },
  en: {
    title: 'Recall check',
    objective: 'Objective',
    loading: 'Loading cards …',
    emptyTitle: 'No questions yet',
    emptyBody: 'This video has no finished recall questions yet. Watch the video and take notes on the right — questions will show up here once they exist for this video.',
    notScheduling: 'Does not count as a review — it serves active recall and your self-assessment.',
    intro: 'Try to recall the answer before you reveal it.',
    pickIntro: 'Tap the correct answer.',
    card: 'Card',
    reveal: 'Show answer',
    revealMissed: "Don't know — show answer",
    next: 'Next',
    knew: 'Knew it',
    missed: 'Missed it',
    answer: 'Answer',
    explanation: 'Explanation',
    mnemonic: 'Mnemonic',
    fromTranscript: 'From the video',
    resultTitle: 'Result',
    resultScore: 'Recalled {known} of {total} from memory',
    passTitle: 'Recall check status',
    passPassed: 'Passed — all {total} questions are above 90%.',
    passPending: 'Not passed yet — {pending} of {total} questions open.',
    passPendingHint: 'Wrongly answered questions only clear from the next day on. The next check asks them again — plus a small sample of the remaining questions.',
    tally: 'Overall so far: {correct} right · {wrong} wrong',
    verdictTitle: 'Recommendation',
    verdictUnderstood: 'Video understood — you can move on.',
    verdictAlmost: 'Almost — repeat the check or revisit parts of the video.',
    verdictReview: 'Watch the video again before moving on.',
    studyMissed: 'Study these {count} cards for real',
    suggestion: 'Suggested self-assessment:',
    setConfidence: 'Set status',
    again: 'Again',
    close: 'Close',
    gaps: 'Gaps',
    ok: 'Okay',
    solid: 'Solid',
  },
} as const

interface Props {
  deckId: string
  objective: string
  videoTitle: string
  /** Playlist-Index des Videos — Schlüssel für die kuratierten Transkript-Fragen. */
  videoIndex?: number | null
  /** Profil, dessen Abruf-Historie den Mastery-Zustand liefert. */
  profileId: string
  language: 'de' | 'en'
  onClose: () => void
  onConfidence: (confidence: VideoConfidence) => void
  /** Handoff: „Nicht gewusst“-Karten als reguläre (planungswirksame) Lernsession
   *  des Objective-Decks starten. Der Check selbst bleibt non-scheduling. */
  onStudyMissed?: (cards: Card[]) => void
  /** Bisherige Läufe dieses Videos (für die Verstanden-Empfehlung); beim Mount eingefroren. */
  previousRuns?: RecallRunResult[]
  /** Wird bei jedem abgeschlossenen Durchlauf aufgerufen: `questionIds` sind die
   *  gestellten Fragen in Abfragereihenfolge, `missedQuestionIds` die davon
   *  falsch beantworteten. */
  onResult?: (
    known: number,
    total: number,
    questionIds: string[],
    missedQuestionIds: string[],
  ) => void | Promise<void>
  /** Eingefrorene Zielmenge einer aktiven Kurs-Ausführung (§8.2): alle
   *  hinterlegten Fragen des Videos (M-IDs → Deck-Karten, T-IDs →
   *  Transkriptfragen). Welche davon ein Lauf stellt, entscheidet der
   *  Mastery-Zustand (offene Fragen + Auffrischungs-Auswahl). */
  frozenQuestionIds?: readonly string[]
  /** Karten-IDs der eingefrorenen M-Fragen — lädt sie deckunabhängig, damit
   *  auch fehlplatzierte Karten (§8.1) auflösbar bleiben. */
  frozenRecallCardIds?: readonly string[]
}

type Phase = 'loading' | 'empty' | 'quiz' | 'result'

function shuffle<T>(input: T[]): T[] {
  const arr = [...input]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Karte gehört genau dann in den Abruf-Check, wenn sie eine fertige
 * Messer-MC-Frage ist UND laut generiertem Mapping zu genau diesem Video
 * gehört. Fragen ohne Mapping-Eintrag werden bewusst ausgeschlossen —
 * lieber weniger Fragen als Fragen aus dem falschen Video (in dem Fall das
 * Mapping neu generieren, siehe messerVideoQuestionMap.ts).
 */
export function isProfessorMesserRecallCard(card: Card, objective?: string, videoTitle?: string): boolean {
  const match = MESSER_RECALL_QUESTION_PATTERN.exec(card.front.trim())
  if (!match) return false
  const [, questionId, domain] = match

  const objectiveDomain = objective?.split('.')[0]
  if (objectiveDomain && domain !== objectiveDomain) return false

  if (card.tags.some(tag => NON_MESSER_RECALL_TAGS.has(tag.trim().toLowerCase()))) return false

  if (videoTitle) {
    const mappedTitle = MESSER_VIDEO_BY_QUESTION_ID[questionId]
    if (!mappedTitle) return false
    return normalizeMesserVideoTitle(mappedTitle) === normalizeMesserVideoTitle(videoTitle)
  }
  return true
}

export interface RecallCardView {
  prompt: string
  /** MC-Optionen in Anzeigereihenfolge; leer bei Ordering/Matching/Plain. */
  options: Array<{ label: string; text: string; correct: boolean }>
  answer: string
  merkhilfe: string | null
}

/**
 * Bereitet eine Karte für die Abruf-Ansicht auf: MC-Fragen strukturiert
 * (Optionen einzeln, korrekte markiert, Erklärung/Merkhilfe getrennt),
 * alle anderen Typen als schlichte Frage/Antwort-Ansicht.
 */
export function buildRecallCardView(card: Card, optionOrder?: readonly number[]): RecallCardView {
  const question = parseQuestion(card.front)
  const prompt = (question.question || stripHtml(card.front))
    .replace(/^M[1-5]-\d{3}:\s*/, '') // interne Fragen-ID, für Lernende nur Rauschen
    .trim()

  let answer = ''
  let options: RecallCardView['options'] = []
  let merkhilfe: string | null = null

  if (question.type === 'ordering') {
    const parsed = parseAnswer(card.back, 'ordering') as OrderingAnswer
    const ordered = parsed.correctOrder
      .map((idx, position) => `${position + 1}. ${question.items[idx] ?? ''}`.trim())
      .filter(Boolean)
      .join('\n')
    answer = [ordered, parsed.explanation].filter(Boolean).join('\n\n')
    merkhilfe = parsed.merkhilfe
  } else if (question.type === 'matching') {
    const parsed = parseAnswer(card.back, 'matching') as MatchingAnswer
    answer = parsed.pairs.map(pair => `${pair.left} = ${pair.right}`).join('\n')
    merkhilfe = parsed.merkhilfe
  } else {
    const parsed = parseMcAnswer(card.back)
    const sourceOptions = Object.entries(question.options)
    const order = optionOrder && optionOrder.length === sourceOptions.length
      ? optionOrder
      : sourceOptions.map((_entry, index) => index)
    options = order.map((sourceIndex, position) => {
      const [sourceLabel, text] = sourceOptions[sourceIndex]
      return {
        label: OPTION_LABELS[position] ?? String(position + 1),
        text: stripHtml(text).trim(),
        correct: parsed.correctOptions.includes(sourceLabel),
      }
    })
    merkhilfe = parsed.merkhilfe
    // Ohne erkannte korrekte Option gäbe die Optionsliste beim Aufdecken keine
    // Antwort preis — dann lieber die schlichte Text-Ansicht.
    if (options.length > 0 && !options.some(option => option.correct)) options = []
    if (options.length > 0) {
      // Optionen samt Markierung übernehmen die Antwort-Rolle; übrig bleibt die
      // Erklärung. Wiederholt sie eingangs nur den Text der korrekten Option
      // (Kartenformat "C | Confidentiality\n\nErklärung…"), fällt das weg.
      answer = parsed.answer
      const correctText = options.find(option => option.correct)?.text
      const answerLines = stripHtml(answer).trim().split('\n')
      if (correctText && answerLines[0]?.trim() === correctText) {
        answer = answerLines.slice(1).join('\n').trim()
      }
    } else {
      answer = [
        parsed.correct && question.options[parsed.correct]
          ? `${parsed.correct}: ${question.options[parsed.correct]}`
          : '',
        parsed.answer,
      ].filter(Boolean).join('\n\n')
    }
  }

  const cleanPrompt = stripHtml(prompt).trim()
  const cleanAnswer = stripHtml(answer).trim()
  return {
    prompt: cleanPrompt || '—',
    options,
    answer: cleanAnswer || (options.length > 0 ? '' : stripHtml(card.back).trim() || '—'),
    merkhilfe: merkhilfe ? stripHtml(merkhilfe).trim() || null : null,
  }
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

/**
 * Bereitet eine kuratierte Transkript-Frage für die Abruf-Ansicht auf.
 * `order` ist eine Permutation der Options-Indizes (Mischen pro Session, damit
 * sich nicht die Buchstabenposition statt des Inhalts einprägt).
 */
export function buildTranscriptQuestionView(
  question: TranscriptQuestion,
  order: readonly number[] = [0, 1, 2, 3],
): RecallCardView {
  return {
    prompt: question.q,
    options: order.map((sourceIndex, position) => ({
      label: OPTION_LABELS[position],
      text: question.options[sourceIndex],
      correct: sourceIndex === question.correct,
    })),
    answer: question.why,
    merkhilfe: null,
  }
}

/** Ein Quiz-Eintrag: gemappte Deck-Karte oder kuratierte Transkript-Frage. */
export interface RecallQuizItem {
  source: 'deck' | 'transcript'
  view: RecallCardView
  /** Nur bei `source === 'deck'` gesetzt (für den Study-Handoff). */
  card?: Card
  /** Stabile Fragen-ID (M-ID der Karte bzw. T-ID der Transkriptfrage). */
  questionId?: string
}

/** T-ID einer Transkriptfrage: positional, 1-basiert (`T006-01` = erste Frage
 *  von Video 006) — identisch zur Vergabe im Content-Map-Generator. */
export function transcriptQuestionId(videoIndex: number, position: number): string {
  return `T${String(videoIndex).padStart(3, '0')}-${String(position + 1).padStart(2, '0')}`
}

const CONFIDENCE_META: Record<VideoConfidence, { key: 'gaps' | 'ok' | 'solid'; cls: string; activeCls: string }> = {
  gaps: {
    key: 'gaps',
    cls: 'border-amber-500/30 bg-amber-500/5 text-amber-200 hover:border-amber-400/60',
    activeCls: 'border-amber-400/70 bg-amber-500/20 text-amber-100',
  },
  ok: {
    key: 'ok',
    cls: 'border-[--brand-secondary-25] bg-[--brand-secondary-08] text-[--brand-secondary] hover:border-[--brand-secondary-80]',
    activeCls: 'border-[--brand-secondary-80] bg-[--brand-secondary-20] text-ds-fg',
  },
  solid: {
    key: 'solid',
    cls: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200 hover:border-emerald-400/60',
    activeCls: 'border-emerald-400/70 bg-emerald-500/20 text-emerald-100',
  },
}

/** Fragenmenge des nächsten Laufs aus Zielmenge und Historie: offene Fragen
 *  plus kleine Auffrischungs-Auswahl; Erst-Check fragt alles. Seed = Video +
 *  Kalendertag + Laufzähler — gleiche Zusammenstellung beim Wiederöffnen am
 *  selben Tag, neue Mischung nach jedem abgeschlossenen Lauf. */
function buildRunItems(
  pool: ReadonlyMap<string, RecallQuizItem>,
  targetIds: readonly string[],
  runs: readonly RecallRunLike[],
  seedScope: string,
): RecallQuizItem[] {
  const now = Date.now()
  const mastery = computeRecallMastery({ runs, questionIds: targetIds, now })
  const ordered = selectRecallRunQuestionIds({
    questionIds: targetIds,
    pendingQuestionIds: mastery.pendingQuestionIds,
    seed: `recall|${seedScope}|${formatLocalDayOf(now)}|${runs.length}`,
  })
  return ordered
    .map(questionId => pool.get(questionId))
    .filter((item): item is RecallQuizItem => item !== undefined)
}

export default function VideoRecallCheck({ deckId, objective, videoTitle, videoIndex, profileId, language, onClose, onConfidence, onStudyMissed, previousRuns, onResult, frozenQuestionIds, frozenRecallCardIds }: Props) {
  const copy = COPY[language]
  const [phase, setPhase] = useState<Phase>('loading')
  const [items, setItems] = useState<RecallQuizItem[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  // Angeklickte Option (Label) bei MC-Fragen; null = per „Weiß ich nicht" aufgedeckt.
  const [picked, setPicked] = useState<string | null>(null)
  const [knownCount, setKnownCount] = useState(0)
  const [missedCards, setMissedCards] = useState<Card[]>([])
  // Falsch beantwortete Fragen des laufenden Durchgangs (alle Quellen).
  const [missedQuestionIds, setMissedQuestionIds] = useState<string[]>([])
  // Vollständige Zielmenge (alle hinterlegten Fragen) + Item-Pool für Folge-Läufe.
  const [itemPool, setItemPool] = useState<ReadonlyMap<string, RecallQuizItem>>(new Map())
  const [allQuestionIds, setAllQuestionIds] = useState<string[]>([])
  // Persistierte Läufe (beim Öffnen geladen) + die in dieser Sitzung beendeten.
  const [dbRuns, setDbRuns] = useState<RecallRunLike[]>([])
  const [sessionRuns, setSessionRuns] = useState<RecallRunLike[]>([])
  // Lauf-Historie für die Empfehlung: beim Mount eingefroren (der Parent hängt
  // via onResult neue Läufe an seine Kopie an — sonst würde doppelt gezählt),
  // lokal wächst sie mit jedem „Nochmal"-Durchlauf weiter.
  const [runHistory, setRunHistory] = useState<RecallRunResult[]>(() => previousRuns ?? [])

  // Stabile Deps für die eingefrorene Auswahl (Array-Identität wechselt pro Render).
  const frozenQuestionKey = frozenQuestionIds?.join('|') ?? ''
  const frozenCardKey = frozenRecallCardIds?.join('|') ?? ''

  useEffect(() => {
    let cancelled = false
    setPhase('loading')
    const deckCardsPromise = listDeckCards(deckId)
      .then(all => all.filter(card => card.front?.trim() && isProfessorMesserRecallCard(card, objective, videoTitle)))
      .catch(() => [] as Card[])
    // Eingefrorene M-Karten deckunabhängig nachladen (fehlplatzierte Decks, §8.1).
    const frozenCardsPromise: Promise<Card[]> = frozenRecallCardIds && frozenRecallCardIds.length > 0
      ? listCardsByIds([...frozenRecallCardIds]).catch(() => [] as Card[])
      : Promise.resolve([] as Card[])
    // Kuratierte Transkript-Fragen lazy laden — hält sie aus dem Videos-Chunk heraus.
    const transcriptPromise: Promise<TranscriptQuestion[]> =
      videoIndex === null || videoIndex === undefined
        ? Promise.resolve([])
        : import('../../data/messerTranscriptQuestions')
            .then(mod => mod.MESSER_TRANSCRIPT_QUESTIONS[String(videoIndex).padStart(3, '0')] ?? [])
            .catch(() => [])
    // Abruf-Historie dieses Videos (aktuelle Evidence-Epoch) für Mastery/Auswahl.
    const runsPromise: Promise<RecallRunLike[]> =
      videoIndex === null || videoIndex === undefined
        ? Promise.resolve([])
        : listVideoRecallRunsForProfile(profileId)
            .then(runs => runs.filter(run => run.videoIndex === videoIndex))
            .catch(() => [] as RecallRunLike[])
    void Promise.all([deckCardsPromise, transcriptPromise, frozenCardsPromise, runsPromise]).then(([deckCards, transcriptQuestions, frozenCards, runs]) => {
      if (cancelled) return
      const questionIdOfCard = (card: Card) => MESSER_RECALL_QUESTION_PATTERN.exec(card.front.trim())?.[1]

      const pool = new Map<string, RecallQuizItem>()
      if (frozenQuestionIds && frozenQuestionIds.length > 0) {
        // Ausführungsmodus (§8.2): die eingefrorene Zielmenge der Ausführung.
        const cardByQuestionId = new Map<string, Card>()
        for (const card of [...deckCards, ...frozenCards]) {
          const id = questionIdOfCard(card)
          if (id && !cardByQuestionId.has(id)) cardByQuestionId.set(id, card)
        }
        for (const questionId of frozenQuestionIds) {
          const card = cardByQuestionId.get(questionId)
          if (card) {
            pool.set(questionId, { source: 'deck', card, questionId, view: buildRecallCardView(card, shuffle([0, 1, 2, 3])) })
            continue
          }
          const match = /^T(\d{3})-(\d{2})$/.exec(questionId)
          const question = match && Number(match[1]) === videoIndex
            ? transcriptQuestions[Number(match[2]) - 1]
            : undefined
          if (question) {
            pool.set(questionId, { source: 'transcript', questionId, view: buildTranscriptQuestionView(question, shuffle([0, 1, 2, 3])) })
          }
        }
      } else {
        // Freier Modus: Zielmenge = ALLE Deck-Fragen + ALLE Transkript-Fragen.
        for (const card of deckCards) {
          const questionId = questionIdOfCard(card)
          if (questionId && !pool.has(questionId)) {
            pool.set(questionId, { source: 'deck', card, questionId, view: buildRecallCardView(card, shuffle([0, 1, 2, 3])) })
          }
        }
        if (videoIndex !== null && videoIndex !== undefined) {
          transcriptQuestions.forEach((question, position) => {
            const questionId = transcriptQuestionId(videoIndex, position)
            if (!pool.has(questionId)) {
              pool.set(questionId, { source: 'transcript', questionId, view: buildTranscriptQuestionView(question, shuffle([0, 1, 2, 3])) })
            }
          })
        }
      }
      const targetIds = [...pool.keys()]
      if (targetIds.length === 0) {
        setPhase('empty')
        return
      }
      setItemPool(pool)
      setAllQuestionIds(targetIds)
      setDbRuns(runs)
      setSessionRuns([])
      setItems(buildRunItems(pool, targetIds, runs, `${videoIndex ?? videoTitle}`))
      setIndex(0)
      setRevealed(false)
      setPicked(null)
      setKnownCount(0)
      setMissedCards([])
      setMissedQuestionIds([])
      setPhase('quiz')
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId, objective, videoTitle, videoIndex, profileId, frozenQuestionKey, frozenCardKey])

  const current = items[index]
  const view = current?.view ?? null
  const total = items.length

  const grade = async (known: boolean) => {
    const nextKnown = knownCount + (known ? 1 : 0)
    // In den Study-Handoff gehören nur echte Deck-Karten; Transkript-Fragen
    // existieren nicht als Karten und zählen nur im Ergebnis.
    const missedCard = !known && current?.source === 'deck' ? current.card : undefined
    if (missedCard) {
      setMissedCards(prev => (prev.some(card => card.id === missedCard.id) ? prev : [...prev, missedCard]))
    }
    const missedId = !known ? current?.questionId : undefined
    const nextMissedIds = missedId && !missedQuestionIds.includes(missedId)
      ? [...missedQuestionIds, missedId]
      : missedQuestionIds
    if (nextMissedIds !== missedQuestionIds) setMissedQuestionIds(nextMissedIds)
    if (index + 1 >= total) {
      const questionIds = items.map(item => item.questionId).filter((id): id is string => typeof id === 'string')
      setKnownCount(nextKnown)
      setRunHistory(prev => [...prev, { known: nextKnown, total, at: Date.now() }])
      setSessionRuns(prev => [...prev, {
        questionIds,
        missedQuestionIds: nextMissedIds,
        correct: nextKnown,
        total,
        completedAt: Date.now(),
      }])
      await onResult?.(nextKnown, total, questionIds, nextMissedIds)
      setPhase('result')
      return
    }
    setKnownCount(nextKnown)
    setIndex(index + 1)
    setRevealed(false)
    setPicked(null)
  }

  const restart = () => {
    // „Nochmal“ nach dem Mastery-Zustand inkl. der gerade beendeten Läufe:
    // offene Fragen zuerst wieder rein, plus Auffrischungs-Auswahl.
    setItems(buildRunItems(itemPool, allQuestionIds, [...dbRuns, ...sessionRuns], `${videoIndex ?? videoTitle}`))
    setIndex(0)
    setRevealed(false)
    setPicked(null)
    setKnownCount(0)
    setMissedCards([])
    setMissedQuestionIds([])
    setPhase('quiz')
  }

  // MC-Fragen: Antwort anklicken statt selbst bewerten — richtig geklickt zählt
  // als gewusst, falsch geklickt (oder „Weiß ich nicht") als nicht gewusst.
  const hasOptions = (view?.options.length ?? 0) > 0
  const pickedCorrect = view?.options.find(option => option.label === picked)?.correct ?? false

  const pickOption = (label: string) => {
    if (revealed) return
    setPicked(label)
    setRevealed(true)
  }

  const suggested = suggestConfidence(knownCount, total)
  const verdict: VideoRecallVerdict = computeRecallVerdict(runHistory)

  // Bestanden-Status über die GESAMTE Zielmenge (nicht nur den letzten Lauf):
  // jede hinterlegte Frage muss im Mastery-Modell über 90 % liegen.
  const combinedRuns = [...dbRuns, ...sessionRuns]
  const mastery = phase === 'result' && allQuestionIds.length > 0
    ? computeRecallMastery({ runs: combinedRuns, questionIds: allQuestionIds, now: Date.now() })
    : null
  const tally = computeRecallRunTally(combinedRuns)

  const VERDICT_META: Record<Exclude<VideoRecallVerdict, 'unknown'>, { text: string; cls: string; Icon: typeof Check }> = {
    understood: { text: copy.verdictUnderstood, cls: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200', Icon: Check },
    almost: { text: copy.verdictAlmost, cls: 'border-[--brand-secondary-25] bg-[--brand-secondary-08] text-[--brand-secondary]', Icon: Eye },
    review: { text: copy.verdictReview, cls: 'border-amber-500/30 bg-amber-500/5 text-amber-200', Icon: RotateCcw },
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-sm pt-safe-2 pb-safe-4"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
    >
      <div className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-ds-sheet border border-[#1f1f23] bg-[#0a0a0a] shadow-2xl">
        {/* Kopf */}
        <div className="flex items-center gap-2 border-b border-[#18181b] px-4 py-3">
          <Brain size={16} strokeWidth={1.5} className="shrink-0 text-[--brand-secondary]" />
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[14px] font-bold text-white">{copy.title}</div>
            <div className="truncate font-mono text-[11px] text-zinc-500">
              {copy.objective} {objective} · {videoTitle}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ds-icon-button flex h-9 w-9 shrink-0"
            aria-label={copy.close}
            data-testid="recall-check-close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Inhalt scrollt; die Aktionsleiste darunter bleibt immer erreichbar (Mobil-Fix). */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {phase === 'loading' && (
            <div className="flex items-center justify-center gap-2 py-12 font-mono text-[12px] text-zinc-500">
              <Loader2 size={16} className="animate-spin" />
              {copy.loading}
            </div>
          )}

          {phase === 'empty' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Brain size={26} strokeWidth={1.5} className="text-zinc-600" />
              <div className="font-mono text-[14px] font-bold text-zinc-200">{copy.emptyTitle}</div>
              <p className="max-w-sm font-mono text-[12px] leading-relaxed text-zinc-500">{copy.emptyBody}</p>
            </div>
          )}

          {phase === 'quiz' && view && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                <span className="flex shrink-0 items-center gap-2">
                  {copy.card} {index + 1}/{total}
                  {current?.source === 'transcript' && (
                    <span
                      data-testid="recall-check-transcript-badge"
                      className="rounded-[5px] border border-[--brand-secondary-25] bg-[--brand-secondary-08] px-1.5 py-0.5 text-[9px] font-bold tracking-[0.1em] text-[--brand-secondary]"
                    >
                      {copy.fromTranscript}
                    </span>
                  )}
                </span>
                <span>{hasOptions ? copy.pickIntro : copy.intro}</span>
              </div>

              <div className="min-h-[140px] rounded-ds-2xl border border-[#1f1f23] bg-[#0c0c0c] p-4">
                <div className="whitespace-pre-line font-mono text-[15px] leading-relaxed text-zinc-100">
                  {view.prompt}
                </div>

                {/* MC-Optionen: vor dem Aufdecken anklickbar (die Wahl IST die
                    Bewertung); danach die korrekte grün, eine falsch gewählte
                    rot, die übrigen abgedimmt. Nach dem Aufdecken gesperrt. */}
                {view.options.length > 0 && (
                  <div className="mt-4 flex flex-col gap-1.5" data-testid="recall-check-options">
                    {view.options.map(option => {
                      const isPicked = picked === option.label
                      const highlight = revealed && option.correct
                      const wrongPick = revealed && isPicked && !option.correct
                      const dimmed = revealed && !option.correct && !isPicked
                      return (
                        <button
                          key={option.label}
                          type="button"
                          disabled={revealed}
                          onClick={() => pickOption(option.label)}
                          data-testid={`recall-check-option-${option.label}`}
                          className={`flex items-start gap-2.5 rounded-ds-lg border px-2.5 py-2 text-left font-mono text-[13px] leading-relaxed transition-colors ${
                            highlight
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                              : wrongPick
                                ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                                : dimmed
                                  ? 'border-transparent text-zinc-600'
                                  : 'border-[#1f1f23] bg-[#0f0f0f] text-zinc-300 hover:border-[--brand-secondary-50] hover:text-zinc-100'
                          }`}
                        >
                          <span className={`shrink-0 font-bold ${
                            highlight ? 'text-emerald-300' : wrongPick ? 'text-rose-300' : dimmed ? 'text-zinc-700' : 'text-zinc-500'
                          }`}>
                            {option.label}
                          </span>
                          <span className="min-w-0 flex-1">{option.text}</span>
                          {highlight && <Check size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-emerald-300" />}
                          {wrongPick && <X size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-rose-300" />}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Aufgedeckt: alles flach als Fließtext — die grüne Option oben ist
                    die einzige farbige Markierung, Merkhilfe nur eine Zeile mit Label. */}
                {revealed && (view.options.length === 0 || view.answer || view.merkhilfe) && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-[#18181b] pt-4">
                    {view.options.length === 0 && (
                      <div>
                        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-400/80">
                          {copy.answer}
                        </div>
                        <div className="whitespace-pre-line font-mono text-[14px] leading-relaxed text-emerald-100">
                          {view.answer || '—'}
                        </div>
                      </div>
                    )}
                    {view.options.length > 0 && view.answer && (
                      <p className="whitespace-pre-line font-mono text-[13px] leading-relaxed text-zinc-400">
                        {view.answer}
                      </p>
                    )}
                    {view.merkhilfe && (
                      <p className="whitespace-pre-line font-mono text-[13px] leading-relaxed text-zinc-400">
                        <span className="font-bold text-amber-300/90">{copy.mnemonic}: </span>
                        {view.merkhilfe}
                      </p>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {phase === 'result' && (
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-500">{copy.resultTitle}</div>
                <div className="mt-1 font-mono text-[20px] font-bold text-white">
                  {copy.resultScore.replace('{known}', String(knownCount)).replace('{total}', String(total))}
                </div>
              </div>

              {/* Bestanden-Status: alle hinterlegten Fragen ≥ 90 % im Mastery-Modell?
                  Solange nicht, gilt der Check als nicht bestanden und die
                  Lerneinheit bleibt offen. */}
              {mastery && (
                <div
                  data-testid={mastery.passed ? 'recall-check-pass' : 'recall-check-pending'}
                  className={`flex items-start gap-2.5 rounded-ds-xl border px-3 py-2.5 ${
                    mastery.passed
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200'
                      : 'border-amber-500/30 bg-amber-500/5 text-amber-200'
                  }`}
                >
                  {mastery.passed
                    ? <Check size={15} strokeWidth={2} className="mt-0.5 shrink-0" />
                    : <RotateCcw size={15} strokeWidth={2} className="mt-0.5 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-80">{copy.passTitle}</div>
                    <div className="font-mono text-[13px] font-bold leading-relaxed">
                      {mastery.passed
                        ? copy.passPassed.replace('{total}', String(allQuestionIds.length))
                        : copy.passPending
                            .replace('{pending}', String(mastery.pendingQuestionIds.length))
                            .replace('{total}', String(allQuestionIds.length))}
                    </div>
                    {!mastery.passed && (
                      <p className="mt-1 font-mono text-[11px] leading-relaxed opacity-80">{copy.passPendingHint}</p>
                    )}
                    <p className="mt-1 font-mono text-[11px] leading-relaxed opacity-80" data-testid="recall-check-tally">
                      {copy.tally
                        .replace('{correct}', String(tally.correct))
                        .replace('{wrong}', String(tally.wrong))}
                    </p>
                  </div>
                </div>
              )}

              {/* Verstanden-Empfehlung: objektives Urteil aus der Lauf-Historie
                  (siehe computeRecallVerdict) — über der subjektiven Selbsteinschätzung. */}
              {verdict !== 'unknown' && (() => {
                const meta = VERDICT_META[verdict]
                return (
                  <div
                    data-testid={`recall-check-verdict-${verdict}`}
                    className={`flex items-start gap-2.5 rounded-ds-xl border px-3 py-2.5 ${meta.cls}`}
                  >
                    <meta.Icon size={15} strokeWidth={2} className="mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-80">{copy.verdictTitle}</div>
                      <div className="font-mono text-[13px] font-bold leading-relaxed">{meta.text}</div>
                    </div>
                  </div>
                )
              })()}

              <div>
                <div className="mb-2 font-mono text-[11px] text-zinc-500">{copy.suggestion}</div>
                <div className="grid grid-cols-3 gap-2">
                  {(['gaps', 'ok', 'solid'] as const).map(level => {
                    const meta = CONFIDENCE_META[level]
                    const isSuggested = level === suggested
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => onConfidence(level)}
                        data-testid={`recall-check-confidence-${level}`}
                        className={`flex flex-col items-center gap-1 rounded-ds-xl border py-3 font-mono text-[12px] font-bold transition-colors ${
                          isSuggested ? meta.activeCls : meta.cls
                        }`}
                      >
                        {copy[meta.key]}
                        {isSuggested && (
                          <span className="text-[9px] font-normal uppercase tracking-[0.12em] opacity-80">
                            {language === 'de' ? 'Vorschlag' : 'suggested'}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Handoff statt Versickern: die Misses landen in einer regulären,
                  planungswirksamen Session des Objective-Decks. */}
              {onStudyMissed && missedCards.length > 0 && (
                <button
                  type="button"
                  onClick={() => onStudyMissed(missedCards)}
                  data-testid="recall-check-study-missed"
                  className="flex items-center justify-center gap-2 rounded-ds-xl border border-[--brand-secondary-50] bg-[--brand-secondary-12] py-3 font-mono text-[13px] font-bold text-[--brand-secondary] transition-colors hover:border-[--brand-secondary-80]"
                >
                  <Brain size={15} strokeWidth={1.5} />
                  {copy.studyMissed.replace('{count}', String(missedCards.length))}
                </button>
              )}

              <button
                type="button"
                onClick={restart}
                className="flex items-center justify-center gap-2 rounded-ds-xl border border-[#1f1f23] py-2.5 font-mono text-[12px] text-zinc-400 transition-colors hover:border-[#3f3f46] hover:text-zinc-200"
              >
                <RotateCcw size={14} strokeWidth={1.5} />
                {copy.again}
              </button>
            </div>
          )}
        </div>

        {/* Aktionsleiste: fest unter dem scrollenden Inhalt, damit Aufdecken und
            Bewerten auch bei langen Karten auf kleinen Displays erreichbar bleiben.
            MC-Fragen bewerten sich über die angeklickte Option selbst — hier gibt
            es nur „Weiß ich nicht" (vor der Wahl) und „Weiter" (nach dem Aufdecken). */}
        {phase === 'quiz' && hasOptions && (
          <div className="shrink-0 border-t border-[#18181b] px-4 py-3">
            {!revealed ? (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                data-testid="recall-check-reveal"
                className="flex w-full items-center justify-center gap-2 rounded-ds-xl border border-[#3f3f46] bg-[#111] py-2.5 font-mono text-[12px] text-zinc-400 transition-colors hover:border-[--brand-secondary-50] hover:text-zinc-200"
              >
                <Eye size={14} strokeWidth={1.5} />
                {copy.revealMissed}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => grade(picked !== null && pickedCorrect)}
                data-testid="recall-check-next"
                className="flex w-full items-center justify-center gap-2 rounded-ds-xl border border-[--brand-secondary-50] bg-[--brand-secondary-12] py-4 font-mono text-[13px] font-bold text-[--brand-secondary] transition-colors hover:border-[--brand-secondary-80]"
              >
                {copy.next}
              </button>
            )}
          </div>
        )}
        {phase === 'quiz' && !hasOptions && (
          <div className="shrink-0 border-t border-[#18181b] px-4 py-3">
            {!revealed ? (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                data-testid="recall-check-reveal"
                className="flex w-full items-center justify-center gap-2 rounded-ds-xl border border-[#3f3f46] bg-[#111] py-3 font-mono text-[13px] font-bold text-zinc-100 transition-colors hover:border-[--brand-secondary-50]"
              >
                <Eye size={15} strokeWidth={1.5} />
                {copy.reveal}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => grade(false)}
                  data-testid="recall-check-missed"
                  className="flex items-center justify-center gap-2 rounded-ds-xl border border-rose-500/40 bg-rose-500/10 py-4 font-mono text-[13px] font-bold text-rose-200 transition-colors hover:border-rose-400/70"
                >
                  <X size={15} strokeWidth={1.5} />
                  {copy.missed}
                </button>
                <button
                  type="button"
                  onClick={() => grade(true)}
                  data-testid="recall-check-knew"
                  className="flex items-center justify-center gap-2 rounded-ds-xl border border-emerald-500/40 bg-emerald-500/10 py-4 font-mono text-[13px] font-bold text-emerald-200 transition-colors hover:border-emerald-400/70"
                >
                  <Check size={15} strokeWidth={1.5} />
                  {copy.knew}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Fuß: Hinweis zur Nicht-Planungswirksamkeit */}
        <div className="border-t border-[#18181b] px-4 py-2.5">
          <p className="font-mono text-[10px] leading-relaxed text-zinc-600">{copy.notScheduling}</p>
        </div>
      </div>
    </div>
  )
}
