/**
 * AI_CONTEXT:
 * Role: Home deck creation/deletion commands. Modal visibility is injected by
 * useHomeDialogs; persistent writes go through db/queries.
 */
import { useCallback, useState } from 'react'
import { createDeck, deleteDeck } from '../../db/queries'
import { submitHomeDeckCreation } from './homeControllerHelpers'
import type { HomeConfirmModalState } from './useHomeDialogs'

export function useDeckCommands(input: {
  t: Record<string, string>
  reload: () => Promise<unknown> | unknown
  setConfirmModal: (state: HomeConfirmModalState | null) => void
  closeCreateDeckModal: () => void
}) {
  const { t, reload, setConfirmModal, closeCreateDeckModal } = input
  const [newDeckName, setNewDeckName] = useState('')
  const [createDeckError, setCreateDeckError] = useState<string | null>(null)
  const [isCreatingDeck, setIsCreatingDeck] = useState(false)

  const openCreateDeckModal = useCallback((open: () => void) => {
    setNewDeckName('')
    setCreateDeckError(null)
    open()
  }, [])

  const handleCreateDeck = useCallback(async () => {
    setIsCreatingDeck(true)
    const result = await submitHomeDeckCreation(newDeckName, {
      deck_name_empty: t.deck_name_empty,
      deck_name_exists: t.deck_name_exists,
      save_failed: t.save_failed,
    }, createDeck)
    setIsCreatingDeck(false)

    if (!result.ok) {
      setCreateDeckError(result.error)
      return
    }

    setCreateDeckError(null)
    closeCreateDeckModal()
    setNewDeckName('')
    await reload()
  }, [closeCreateDeckModal, newDeckName, reload, t.deck_name_empty, t.deck_name_exists, t.save_failed])

  const handleDelete = useCallback((deckId: string, name: string) => {
    setConfirmModal({
      title: t.deck_delete_title,
      message: t.delete_deck_confirm.replace('{name}', name),
      confirmLabel: t.yes_delete,
      variant: 'danger',
      onConfirm: () => {
        void (async () => {
          await deleteDeck(deckId)
          await reload()
        })()
      },
    })
  }, [reload, setConfirmModal, t.deck_delete_title, t.delete_deck_confirm, t.yes_delete])

  return {
    newDeckName,
    createDeckError,
    isCreatingDeck,
    setNewDeckName,
    openCreateDeckModal,
    handleCreateDeck,
    handleDelete,
  }
}

