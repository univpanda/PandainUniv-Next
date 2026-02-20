import type { ReactNode } from 'react'

interface InlineEditCellProps {
  isEditing: boolean
  onStartEdit?: () => void
  editContent: ReactNode
  children: ReactNode
  className?: string
}

export function InlineEditCell({
  isEditing,
  onStartEdit,
  editContent,
  children,
  className = '',
}: InlineEditCellProps) {
  const tdClassName = isEditing ? className : `editable-cell ${className}`.trim()

  return (
    <td className={tdClassName} onDoubleClick={() => !isEditing && onStartEdit?.()}>
      {isEditing ? editContent : children}
    </td>
  )
}
