import { memo, useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

const SORT_LABELS: Record<string, string> = {
  popular: 'Popular',
  new: 'New',
}

interface ReplySortOptionsProps {
  sortBy: 'popular' | 'new'
  onSortChange: (sort: 'popular' | 'new') => void
  show?: boolean
}

export const ReplySortOptions = memo(function ReplySortOptions({
  sortBy,
  onSortChange,
  show = true,
}: ReplySortOptionsProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (!show) return null

  return (
    <div className="reply-sort-dropdown" ref={ref}>
      <button
        type="button"
        className="reply-sort-trigger"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Sort by ${SORT_LABELS[sortBy]}`}
      >
        {SORT_LABELS[sortBy]}
        <ChevronDown size={16} className={`reply-sort-chevron ${open ? 'open' : ''}`} />
      </button>
      {open && (
        <div className="reply-sort-menu" role="listbox">
          {(['popular', 'new'] as const).map((option) => (
            <button
              type="button"
              key={option}
              role="option"
              aria-selected={sortBy === option}
              className={`reply-sort-option ${sortBy === option ? 'active' : ''}`}
              onClick={() => {
                onSortChange(option)
                setOpen(false)
              }}
            >
              {SORT_LABELS[option]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})
