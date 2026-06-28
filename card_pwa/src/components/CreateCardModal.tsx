/**
 * AI_CONTEXT:
 * Role: Thin create-mode adapter around CardFormModal; supplies optional default deck context.
 * Used by: HomeView and deck/card management actions.
 * Important: Put create/edit form behavior in CardFormModal so both wrappers stay equivalent.
 */
import CardFormModal from './CardFormModal'

interface Props {
  onClose: () => void
  defaultDeckId?: string
}

export default function CreateCardModal({ onClose, defaultDeckId }: Props) {
  return <CardFormModal mode="create" onClose={onClose} defaultDeckId={defaultDeckId} />
}
