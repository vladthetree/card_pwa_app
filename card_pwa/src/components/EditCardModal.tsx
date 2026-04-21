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
