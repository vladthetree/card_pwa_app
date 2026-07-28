/**
 * AI_CONTEXT:
 * Role: Shared transient answer/peek state for StudyView and ShuffleStudyView.
 * It intentionally does not own rating persistence or scheduling.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Card, ReviewAnswerDetails } from '../../types'

export function useStudyAnswerState(input: {
  currentCard: Card | null
  sessionCount: number
  isFlipped: boolean
}) {
  const { currentCard, sessionCount, isFlipped } = input
  const [answerWasIncorrect, setAnswerWasIncorrect] = useState(false)
  const [answerRevealed, setAnswerRevealed] = useState(false)
  const [peeking, setPeeking] = useState(false)
  const [peekFlipped, setPeekFlipped] = useState(true)
  const pendingAnswerRef = useRef<ReviewAnswerDetails | null>(null)

  useEffect(() => {
    setAnswerRevealed(false)
    setPeeking(false)
    setPeekFlipped(true)
    pendingAnswerRef.current = null
  }, [currentCard?.id, sessionCount])

  useEffect(() => {
    if (isFlipped) setAnswerRevealed(true)
  }, [isFlipped])

  const handleAnswerEvaluated = useCallback((score: number, answer?: Pick<ReviewAnswerDetails, 'selected' | 'correct'>) => {
    setAnswerWasIncorrect(score < 1.0)
    pendingAnswerRef.current = answer ? { ...answer, wasCorrect: score >= 1.0 } : null
  }, [])

  const resetAnswerState = useCallback(() => {
    setAnswerWasIncorrect(false)
    pendingAnswerRef.current = null
  }, [])

  return {
    answerWasIncorrect,
    setAnswerWasIncorrect,
    answerRevealed,
    peeking,
    setPeeking,
    peekFlipped,
    setPeekFlipped,
    pendingAnswerRef,
    handleAnswerEvaluated,
    resetAnswerState,
  }
}
