import CardFormModal from './CardFormModal'

interface Props {
  onClose: () => void
  defaultDeckId?: string
}

export default function CreateCardModal({ onClose, defaultDeckId }: Props) {
  return <CardFormModal mode="create" onClose={onClose} defaultDeckId={defaultDeckId} />
}
