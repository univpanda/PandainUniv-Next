import { X } from 'lucide-react'

interface InlineRowActionCellProps {
  isEditing: boolean
  onCancel: () => void
  onDelete: () => void
}

export function InlineRowActionCell({ isEditing, onCancel, onDelete }: InlineRowActionCellProps) {
  return (
    <td>
      <button
        className="admin-delete-btn"
        onClick={isEditing ? onCancel : onDelete}
        title={isEditing ? 'Cancel' : 'Delete'}
      >
        <X size={16} />
      </button>
    </td>
  )
}
