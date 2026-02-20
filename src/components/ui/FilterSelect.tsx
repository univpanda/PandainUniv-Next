import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FilterSelectProps {
  label?: string
  value: string | null
  options: string[]
  onChange: (value: string | null) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  searchValue?: string
  onSearchChange?: (value: string) => void
  disableClientFilter?: boolean
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  disabled,
  searchValue,
  onSearchChange,
  disableClientFilter = false,
}: FilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [internalSearch, setInternalSearch] = useState('')
  const search = searchValue ?? internalSearch
  const setSearch = onSearchChange ?? setInternalSearch

  const filteredOptions = disableClientFilter
    ? options
    : options.filter((opt) => opt.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="filter-group">
      {label && <label>{label}</label>}
      <div className="filter-select">
        <button
          className="filter-select-trigger"
          onClick={() => {
            if (!disabled) {
              setIsOpen(!isOpen)
            }
          }}
          type="button"
          disabled={disabled}
        >
          <span className={value ? '' : 'placeholder'}>{value || placeholder || 'Select...'}</span>
          <ChevronDown size={16} className={isOpen ? 'rotated' : ''} />
        </button>
        {isOpen && (
          <>
            <div
              className="filter-select-backdrop"
              onClick={() => {
                setIsOpen(false)
                setSearch('')
              }}
            />
            <div className="filter-select-dropdown">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder || 'Search...'}
                className="filter-select-search"
                autoFocus
              />
              <div className="filter-select-options">
                {filteredOptions.map((opt) => (
                  <button
                    key={opt}
                    className={`filter-select-option ${opt === value ? 'selected' : ''}`}
                    type="button"
                    onClick={() => {
                      onChange(opt)
                      setIsOpen(false)
                      setSearch('')
                    }}
                  >
                    {opt}
                  </button>
                ))}
                {filteredOptions.length === 0 && (
                  <div className="filter-select-empty">No options found</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
