import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  useCountries,
  useCreateUniversity,
  useDeleteUniversity,
  useUniversities,
  useUpdateUniversity,
} from '../../hooks/usePlacementQueries'
import { useToast } from '../../contexts/ToastContext'
import { SearchInput } from '../../components/ui'
import { InlineEditCell } from '../../components/admin/InlineEditCell'
import { InlineRowActionCell } from '../../components/admin/InlineRowActionCell'
import { AdminPagination } from '../../components/admin/AdminPagination'
import {
  UNIVERSITIES_PER_PAGE,
  type UniversitySortColumn,
  type UniversityTabProps,
} from './types'

interface EditingUniversity {
  id: string
  university: string
  country_id: string | null
  us_news_2025_rank: string
  originalUniversity: string
  originalCountryId: string | null
  originalRank: string
}

export function UniversityTab({ state, setState }: UniversityTabProps) {
  const { data: universities = [], isLoading, error } = useUniversities()
  const { data: countries = [] } = useCountries()
  const createUniversity = useCreateUniversity()
  const deleteUniversity = useDeleteUniversity()
  const updateUniversity = useUpdateUniversity()
  const toast = useToast()
  const { searchQuery, sortColumn, sortDirection, page } = state

  const [isAdding, setIsAdding] = useState(false)
  const [newUniversity, setNewUniversity] = useState('')
  const [newCountryId, setNewCountryId] = useState<string>('')
  const [newRank, setNewRank] = useState('')
  const [pinnedUniversityIds, setPinnedUniversityIds] = useState<string[]>([])
  const universityInputRef = useRef<HTMLInputElement>(null)
  const editUniversityInputRef = useRef<HTMLInputElement>(null)
  const [editingUniversity, setEditingUniversity] = useState<EditingUniversity | null>(null)

  useEffect(() => {
    if (isAdding && universityInputRef.current) {
      universityInputRef.current.focus()
    }
  }, [isAdding])

  useEffect(() => {
    if (editingUniversity && editUniversityInputRef.current) {
      editUniversityInputRef.current.focus()
    }
  }, [editingUniversity])

  const setSearchQuery = (query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query, page: 1 }))
  }

  const setPage = useCallback(
    (newPage: number) => {
      setState((prev) => ({ ...prev, page: newPage }))
    },
    [setState]
  )

  const handleSort = (column: UniversitySortColumn) => {
    setState((prev) => {
      if (prev.sortColumn === column) {
        return { ...prev, sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc', page: 1 }
      } else {
        return { ...prev, sortColumn: column, sortDirection: 'asc', page: 1 }
      }
    })
  }

  const handleAddClick = () => {
    setIsAdding(true)
    setNewUniversity('')
    setNewCountryId('')
    setNewRank('')
  }

  const handleCancelAdd = () => {
    setIsAdding(false)
    setNewUniversity('')
    setNewCountryId('')
    setNewRank('')
  }

  const handleDelete = (universityId: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    deleteUniversity.mutate(universityId, {
      onSuccess: () => {
        toast.showSuccess('Institute deleted')
        setPinnedUniversityIds((prev) => prev.filter((id) => id !== universityId))
      },
      onError: () => {
        toast.showError('Failed to delete university')
      },
    })
  }

  const handleSaveNew = () => {
    if (newUniversity.trim()) {
      createUniversity.mutate(
        {
          university: newUniversity.trim(),
          country_id: newCountryId || null,
          us_news_2025_rank: newRank ? parseInt(newRank, 10) : null,
        },
        {
          onSuccess: (university) => {
            setIsAdding(false)
            setNewUniversity('')
            setNewCountryId('')
            setNewRank('')
            setPinnedUniversityIds((prev) => [...prev, university.id])
            toast.showSuccess('Institute added')
          },
          onError: (error: { code?: string; message?: string }) => {
            const message = error?.message?.toLowerCase() || ''
            if (
              error?.code === '23505' ||
              message.includes('duplicate') ||
              message.includes('unique')
            ) {
              toast.showError('Institute already exists in this country')
              return
            }
            toast.showError('Failed to add university')
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

  const sortedUniversities = useMemo(() => {
    const filtered = universities.filter((uni) =>
      uni.university.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const pinnedSet = new Set(pinnedUniversityIds)
    const pinned = pinnedUniversityIds
      .map((id) => filtered.find((university) => university.id === id))
      .filter((university): university is (typeof filtered)[number] => Boolean(university))

    const temps = filtered.filter(
      (university) => university.id.startsWith('temp-') && !pinnedSet.has(university.id)
    )

    const rest = filtered.filter(
      (university) => !pinnedSet.has(university.id) && !university.id.startsWith('temp-')
    )

    const sortedRest = [...rest].sort((a, b) => {
      let aVal: string | number
      let bVal: string | number

      switch (sortColumn) {
        case 'university':
          aVal = a.university
          bVal = b.university
          break
        case 'country':
          aVal = a.country?.name || ''
          bVal = b.country?.name || ''
          break
        case 'us_news_2025_rank':
          aVal = a.us_news_2025_rank ?? Infinity
          bVal = b.us_news_2025_rank ?? Infinity
          break
        case 'school_count':
          aVal = a.school_count ?? 0
          bVal = b.school_count ?? 0
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return [...pinned, ...temps, ...sortedRest]
  }, [universities, searchQuery, sortColumn, sortDirection, pinnedUniversityIds])

  const startIndex = (page - 1) * UNIVERSITIES_PER_PAGE
  const totalPages = Math.ceil(sortedUniversities.length / UNIVERSITIES_PER_PAGE)
  const paginatedUniversities = sortedUniversities.slice(
    startIndex,
    startIndex + UNIVERSITIES_PER_PAGE
  )

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages, setPage])

  const handleStartEdit = (uni: (typeof universities)[number]) => {
    setEditingUniversity({
      id: uni.id,
      university: uni.university,
      country_id: uni.country_id || null,
      us_news_2025_rank:
        uni.us_news_2025_rank !== null && uni.us_news_2025_rank !== undefined
          ? String(uni.us_news_2025_rank)
          : '',
      originalUniversity: uni.university,
      originalCountryId: uni.country_id || null,
      originalRank:
        uni.us_news_2025_rank !== null && uni.us_news_2025_rank !== undefined
          ? String(uni.us_news_2025_rank)
          : '',
    })
  }

  const handleCancelEdit = () => {
    setEditingUniversity(null)
  }

  const handleSaveEdit = () => {
    if (!editingUniversity) return

    const trimmedName = editingUniversity.university.trim()
    if (!trimmedName) {
      toast.showError('Institute name cannot be empty.')
      return
    }

    const rankValue =
      editingUniversity.us_news_2025_rank.trim() === ''
        ? null
        : Number(editingUniversity.us_news_2025_rank)

    if (rankValue !== null && Number.isNaN(rankValue)) {
      toast.showError('Rank must be a valid number.')
      return
    }

    const hasChanges =
      trimmedName !== editingUniversity.originalUniversity ||
      (editingUniversity.country_id || null) !== editingUniversity.originalCountryId ||
      (editingUniversity.us_news_2025_rank.trim() || '') !== (editingUniversity.originalRank || '')

    if (!hasChanges) {
      setEditingUniversity(null)
      return
    }

    updateUniversity.mutate(
      {
        id: editingUniversity.id,
        university: trimmedName,
        country_id: editingUniversity.country_id || null,
        us_news_2025_rank: rankValue,
      },
      {
        onSuccess: () => {
          toast.showSuccess('Institute updated.')
          setEditingUniversity(null)
        },
        onError: () => {
          toast.showError('Failed to update university.')
        },
      }
    )
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveEdit()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEdit()
    }
  }

  return (
    <div className="university-admin">
      <div className="admin-section university-tab-content">
        <div className="admin-toolbar">
          <p className="admin-description">
            {sortedUniversities.length} of {universities.length} institutes
          </p>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search institutes..."
            className="admin-search-input"
          />
        </div>

        {isLoading && <div className="admin-placeholder">Loading institutes...</div>}

        {error && (
          <div className="admin-placeholder" style={{ color: 'var(--color-error)' }}>
            Failed to load institutes.
          </div>
        )}

        {!isLoading && !error && (sortedUniversities.length > 0 || isAdding) && (
          <div className="university-table-wrapper">
            <table className="university-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="sortable" onClick={() => handleSort('university')}>
                    Institute {sortColumn === 'university' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('country')}>
                    Country {sortColumn === 'country' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('us_news_2025_rank')}>
                    US News 2025{' '}
                    {sortColumn === 'us_news_2025_rank' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('school_count')}>
                    Schools {sortColumn === 'school_count' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="table-header-action-cell">
                    {!isAdding && (
                      <button
                        className="admin-delete-btn table-header-action"
                        onClick={handleAddClick}
                        title="Add university"
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
                        ref={universityInputRef}
                        type="text"
                        value={newUniversity}
                        onChange={(e) => setNewUniversity(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Institute name"
                        className="inline-input"
                      />
                    </td>
                    <td>
                      <select
                        value={newCountryId}
                        onChange={(e) => setNewCountryId(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="inline-input"
                      >
                        <option value="">Select country</option>
                        {countries.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={newRank}
                        onChange={(e) => setNewRank(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Rank"
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
                {paginatedUniversities.map((uni, index) => {
                  const isEditing = editingUniversity?.id === uni.id
                  const editingValue = isEditing ? editingUniversity : null
                  return (
                    <tr key={uni.id} className={isEditing ? 'editing-row' : ''}>
                      <td>{startIndex + index + 1}</td>
                      <InlineEditCell
                        isEditing={isEditing}
                        onStartEdit={() => handleStartEdit(uni)}
                        editContent={
                          editingValue ? (
                            <input
                              ref={editUniversityInputRef}
                              type="text"
                              value={editingValue.university}
                              onChange={(e) =>
                                setEditingUniversity({
                                  ...editingValue,
                                  university: e.target.value,
                                })
                              }
                              onKeyDown={handleEditKeyDown}
                              className="inline-input"
                            />
                          ) : null
                        }
                      >
                        {uni.url ? (
                          <a href={uni.url} target="_blank" rel="noopener noreferrer">
                            {uni.university}
                          </a>
                        ) : (
                          <span className="university-name-link">{uni.university}</span>
                        )}
                      </InlineEditCell>
                      <InlineEditCell
                        isEditing={isEditing}
                        onStartEdit={() => handleStartEdit(uni)}
                        editContent={
                          editingValue ? (
                            <select
                              value={editingValue.country_id || ''}
                              onChange={(e) =>
                                setEditingUniversity({
                                  ...editingValue,
                                  country_id: e.target.value || null,
                                })
                              }
                              onKeyDown={handleEditKeyDown}
                              className="inline-input"
                            >
                              <option value="">Select country</option>
                              {countries.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          ) : null
                        }
                      >
                        {uni.country?.name || '-'}
                      </InlineEditCell>
                      <InlineEditCell
                        isEditing={isEditing}
                        onStartEdit={() => handleStartEdit(uni)}
                        editContent={
                          editingValue ? (
                            <input
                              type="number"
                              value={editingValue.us_news_2025_rank}
                              onChange={(e) =>
                                setEditingUniversity({
                                  ...editingValue,
                                  us_news_2025_rank: e.target.value,
                                })
                              }
                              onKeyDown={handleEditKeyDown}
                              className="inline-input"
                            />
                          ) : null
                        }
                      >
                        {uni.us_news_2025_rank || '-'}
                      </InlineEditCell>
                      <td>{uni.school_count || 0}</td>
                      <InlineRowActionCell
                        isEditing={isEditing}
                        onCancel={handleCancelEdit}
                        onDelete={() => handleDelete(uni.id, uni.university)}
                      />
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}

        {!isLoading && !error && sortedUniversities.length === 0 && !isAdding && (
          <div className="admin-placeholder">
            {searchQuery ? 'No institutes match your search.' : 'No institutes found.'}
          </div>
        )}
      </div>
    </div>
  )
}
