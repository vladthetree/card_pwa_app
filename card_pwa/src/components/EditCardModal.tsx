/**
 * AI_CONTEXT:
 * Role: Thin edit-mode adapter around CardFormModal; passes the selected card and save/delete callbacks.
 * Used by: StudyView and card-list management surfaces.
 * Important: Put create/edit form behavior in CardFormModal so both wrappers stay equivalent.
 */
import CardFormModal from './CardFormModal'
import type { Card } from '../types'

interface Props {
  card: Card
  onClose: () => void
  onSaved?: () => void
  onDeleted?: () => void
}

export default function EditCardModal({ card, onClose, onSaved, onDeleted }: Props) {
  return (
    <CardFormModal
      mode="edit"
      card={card}
      onClose={onClose}
      onSaved={onSaved}
      onDeleted={onDeleted}
    />
  )
}
