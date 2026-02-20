import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  useCountries,
  useCreateCountry,
  useDeleteCountry,
  useUpdateCountry,
} from '../../hooks/usePlacementQueries'
import { useToast } from '../../contexts/ToastContext'
import { SearchInput } from '../../components/ui'
import { InlineEditCell } from '../../components/admin/InlineEditCell'
import { AdminPagination } from '../../components/admin/AdminPagination'
import { COUNTRIES_PER_PAGE, type CountrySortColumn, type CountryTabProps } from './types'

interface EditingCountry {
  id: string
  name: string
  code: string
  originalName: string
  originalCode: string
}

export function CountryTab({ state, setState }: CountryTabProps) {
  const { data: countries = [], isLoading, error } = useCountries()
  const createCountry = useCreateCountry()
  const deleteCountry = useDeleteCountry()
  const updateCountry = useUpdateCountry()
  const toast = useToast()
  const { searchQuery, sortColumn, sortDirection, page } = state

  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [pinnedCountryIds, setPinnedCountryIds] = useState<string[]>([])
  const [editingCountry, setEditingCountry] = useState<EditingCountry | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const editNameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAdding && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [isAdding])

  const setSearchQuery = (query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query, page: 1 }))
  }

  const setPage = (newPage: number) => {
    setState((prev) => ({ ...prev, page: newPage }))
  }

  const handleSort = (column: CountrySortColumn) => {
    setState((prev) => {
      if (prev.sortColumn === column) {
        return { ...prev, sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc', page: 1 }
      }
      return { ...prev, sortColumn: column, sortDirection: 'asc', page: 1 }
    })
  }

  const handleAddClick = () => {
    setIsAdding(true)
    setNewName('')
    setNewCode('')
  }

  const handleCancelAdd = () => {
    setIsAdding(false)
    setNewName('')
    setNewCode('')
  }

  const handleDelete = (countryId: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    deleteCountry.mutate(countryId, {
      onSuccess: () => {
        toast.showSuccess('Country deleted')
        setPinnedCountryIds((prev) => prev.filter((id) => id !== countryId))
      },
      onError: () => {
        toast.showError('Failed to delete country')
      },
    })
  }

  const handleSaveNew = () => {
    if (newName.trim() && newCode.trim()) {
      createCountry.mutate(
        { name: newName.trim(), code: newCode.trim() },
        {
          onSuccess: (country) => {
            setIsAdding(false)
            setNewName('')
            setNewCode('')
            setPinnedCountryIds((prev) => [...prev, country.id])
            toast.showSuccess('Country added')
          },
          onError: (error: { code?: string; message?: string }) => {
            const message = error?.message?.toLowerCase() || ''
            if (
              error?.code === '23505' ||
              message.includes('duplicate') ||
              message.includes('unique')
            ) {
              toast.showError('Country already exists')
              return
            }
            toast.showError('Failed to add country')
          },
        }
      )
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveNew()
    } else if (e.key === 'Escape') {
      handleCancelAdd()
    }
  }

  const handleStartEdit = (country: { id: string; name: string; code: string }) => {
    setEditingCountry({
      id: country.id,
      name: country.name,
      code: country.code,
      originalName: country.name,
      originalCode: country.code,
    })
  }

  const handleCancelEdit = () => {
    setEditingCountry(null)
  }

  const handleSaveEdit = () => {
    if (!editingCountry) return

    const nameChanged =
      editingCountry.name.trim().toLowerCase() !== editingCountry.originalName.toLowerCase()
    const codeChanged =
      editingCountry.code.trim().toUpperCase() !== editingCountry.originalCode.toUpperCase()

    if (!nameChanged && !codeChanged) {
      setEditingCountry(null)
      return
    }

    if (!editingCountry.name.trim() || !editingCountry.code.trim()) {
      toast.showError('Name and code are required')
      return
    }

    updateCountry.mutate(
      {
        id: editingCountry.id,
        name: editingCountry.name.trim(),
        code: editingCountry.code.trim(),
      },
      {
        onSuccess: () => {
          setEditingCountry(null)
          toast.showSuccess('Country updated')
        },
        onError: (error: { code?: string; message?: string }) => {
          const message = error?.message?.toLowerCase() || ''
          if (
            error?.code === '23505' ||
            message.includes('duplicate') ||
            message.includes('unique')
          ) {
            toast.showError('Country name or code already exists')
            return
          }
          toast.showError('Failed to update country')
        },
      }
    )
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  useEffect(() => {
    if (editNameInputRef.current && editingCountry?.id) {
      editNameInputRef.current.focus()
    }
  }, [editingCountry])

  const sortedCountries = useMemo(() => {
    const filtered = countries.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const pinnedSet = new Set(pinnedCountryIds)
    const pinned = pinnedCountryIds
      .map((id) => filtered.find((country) => country.id === id))
      .filter((country): country is (typeof filtered)[number] => Boolean(country))

    const temps = filtered.filter(
      (country) => country.id.startsWith('temp-') && !pinnedSet.has(country.id)
    )

    const rest = filtered.filter(
      (country) => !pinnedSet.has(country.id) && !country.id.startsWith('temp-')
    )

    const sortedRest = [...rest].sort((a, b) => {
      let aVal: string | number
      let bVal: string | number

      switch (sortColumn) {
        case 'name':
          aVal = a.name
          bVal = b.name
          break
        case 'code':
          aVal = a.code
          bVal = b.code
          break
        case 'university_count':
          aVal = a.university_count ?? 0
          bVal = b.university_count ?? 0
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return [...pinned, ...temps, ...sortedRest]
  }, [countries, searchQuery, sortColumn, sortDirection, pinnedCountryIds])

  const totalPages = Math.ceil(sortedCountries.length / COUNTRIES_PER_PAGE)
  const startIndex = (page - 1) * COUNTRIES_PER_PAGE
  const paginatedCountries = sortedCountries.slice(startIndex, startIndex + COUNTRIES_PER_PAGE)

  return (
    <div className="university-admin">
      <div className="admin-section country-tab-content">
        <div className="admin-toolbar">
          <p className="admin-description">
            {sortedCountries.length} of {countries.length} countries
          </p>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search countries..."
            className="admin-search-input"
          />
        </div>

        {isLoading && <div className="admin-placeholder">Loading countries...</div>}

        {error && (
          <div className="admin-placeholder" style={{ color: 'var(--color-error)' }}>
            Failed to load countries.
          </div>
        )}

        {!isLoading && !error && (sortedCountries.length > 0 || isAdding) && (
          <>
            <table className="university-table country-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="sortable" onClick={() => handleSort('name')}>
                    Country {sortColumn === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('code')}>
                    Code {sortColumn === 'code' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('university_count')}>
                    Institutes{' '}
                    {sortColumn === 'university_count' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="table-header-action-cell">
                    {!isAdding && (
                      <button
                        className="admin-delete-btn table-header-action"
                        onClick={handleAddClick}
                        title="Add country"
                        type="button"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isAdding && (
                  <tr className="adding-row">
                    <td>-</td>
                    <td>
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Country name"
                        className="inline-input"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                        onKeyDown={handleKeyDown}
                        placeholder="Code"
                        maxLength={3}
                        className="inline-input"
                      />
                    </td>
                    <td>-</td>
                    <td>
                      <button className="admin-delete-btn" onClick={handleCancelAdd} title="Cancel">
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                )}
                {paginatedCountries.map((country, index) => {
                  const isEditing = editingCountry?.id === country.id
                  return (
                    <tr key={country.id} className={isEditing ? 'editing-row' : ''}>
                      <td>{startIndex + index + 1}</td>
                      <InlineEditCell
                        isEditing={isEditing}
                        onStartEdit={() => handleStartEdit(country)}
                        editContent={
                          <input
                            ref={editNameInputRef}
                            type="text"
                            value={editingCountry?.name ?? ''}
                            onChange={(e) =>
                              editingCountry &&
                              setEditingCountry({ ...editingCountry, name: e.target.value })
                            }
                            onKeyDown={handleEditKeyDown}
                            onBlur={handleSaveEdit}
                            className="inline-input"
                          />
                        }
                      >
                        {country.name}
                      </InlineEditCell>
                      <InlineEditCell
                        isEditing={isEditing}
                        onStartEdit={() => handleStartEdit(country)}
                        editContent={
                          <input
                            type="text"
                            value={editingCountry?.code ?? ''}
                            onChange={(e) =>
                              editingCountry &&
                              setEditingCountry({
                                ...editingCountry,
                                code: e.target.value.toUpperCase(),
                              })
                            }
                            onKeyDown={handleEditKeyDown}
                            onBlur={handleSaveEdit}
                            maxLength={3}
                            className="inline-input"
                          />
                        }
                      >
                        {country.code}
                      </InlineEditCell>
                      <td>{country.university_count || 0}</td>
                      <td>
                        <button
                          className="admin-delete-btn"
                          onClick={() => handleDelete(country.id, country.name)}
                          title="Delete"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}

        {!isLoading && !error && sortedCountries.length === 0 && !isAdding && (
          <div className="admin-placeholder">
            {searchQuery ? 'No countries match your search.' : 'No countries found.'}
          </div>
        )}
      </div>
    </div>
  )
}

export default CountryTab
