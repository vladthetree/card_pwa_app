/**
 * AI_CONTEXT:
 * Role: Home shuffle collection write commands, separate from modal state.
 */
import { useCallback } from 'react'
import { deleteShuffleCollection } from '../../db/queries'
import type { ShuffleCollection } from '../../types'
import type { HomeConfirmModalState } from './useHomeDialogs'

export function useShuffleCollectionCommands(input: {
  language: 'de' | 'en'
  setConfirmModal: (state: HomeConfirmModalState | null) => void
}) {
  const { language, setConfirmModal } = input

  const handleDeleteShuffleCollection = useCallback((collection: ShuffleCollection) => {
    setConfirmModal({
      title: language === 'de' ? 'Shuffle-Sammlung löschen' : 'Delete shuffle collection',
      message: language === 'de'
        ? `Soll "${collection.name}" wirklich gelöscht werden?`
        : `Do you really want to delete "${collection.name}"?`,
      confirmLabel: language === 'de' ? 'Ja, löschen' : 'Yes, delete',
      variant: 'danger',
      onConfirm: () => {
        void deleteShuffleCollection(collection.id)
      },
    })
  }, [language, setConfirmModal])

  return { handleDeleteShuffleCollection }
}

