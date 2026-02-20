import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  useCreateSchool,
  useDeleteSchool,
  useSchoolsByUniversity,
  useUniversities,
  useUpdateSchool,
} from '../../hooks/usePlacementQueries'
import type { SchoolType } from '../../hooks/placements'
import { useToast } from '../../contexts/ToastContext'
import { SearchInput } from '../ui'
import { InlineEditCell } from '../admin/InlineEditCell'
import { InlineRowActionCell } from '../admin/InlineRowActionCell'
import { AdminPagination } from '../admin/AdminPagination'
import {
  SCHOOL_TYPE_OPTIONS,
  SCHOOLS_PER_PAGE,
  type SchoolSortColumn,
  type SchoolTabProps,
} from './types'

interface EditingSchool {
  id: string
  school: string
  type: SchoolType
  originalSchool: string
  originalType: SchoolType
}

export function SchoolTab({ state, setState }: SchoolTabProps) {
  const { data: universities = [] } = useUniversities()
  const { selectedUniversityId, searchQuery, sortColumn, sortDirection, page } = state
  const { data: schools = [], isLoading, error } = useSchoolsByUniversity(selectedUniversityId)
  const createSchool = useCreateSchool()
  const deleteSchool = useDeleteSchool(selectedUniversityId)
  const updateSchool = useUpdateSchool(selectedUniversityId)
  const toast = useToast()

  const [universitySearch, setUniversitySearch] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [newSchool, setNewSchool] = useState('')
  const [newType, setNewType] = useState<SchoolType>('degree_granting')
  const [pinnedSchoolIds, setPinnedSchoolIds] = useState<string[]>([])
  const schoolInputRef = useRef<HTMLInputElement>(null)
  const editSchoolInputRef = useRef<HTMLInputElement>(null)
  const [editingSchool, setEditingSchool] = useState<EditingSchool | null>(null)

  // Filter universities for search dropdown
  const filteredUniversities = useMemo(() => {
    if (!universitySearch.trim()) return universities.slice(0, 20)
    const search = universitySearch.toLowerCase()
    return universities.filter((u) => u.university.toLowerCase().includes(search)).slice(0, 20)
  }, [universities, universitySearch])

  const selectedUniversity = useMemo(() => {
    return universities.find((u) => u.id === selectedUniversityId) || null
  }, [universities, selectedUniversityId])

  useEffect(() => {
    if (isAdding && schoolInputRef.current) {
      schoolInputRef.current.focus()
    }
  }, [isAdding])

  useEffect(() => {
    if (editingSchool && editSchoolInputRef.current) {
      editSchoolInputRef.current.focus()
    }
  }, [editingSchool])

  const setSelectedUniversityId = (id: string | null) => {
    setState((prev) => ({ ...prev, selectedUniversityId: id, searchQuery: '', page: 1 }))
    setPinnedSchoolIds([])
    setIsAdding(false)
    setEditingSchool(null)
  }

  const setSearchQuery = (query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query, page: 1 }))
  }

  const setPage = useCallback(
    (newPage: number) => {
      setState((prev) => ({ ...prev, page: newPage }))
    },
    [setState]
  )

  const handleSort = (column: SchoolSortColumn) => {
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
    setNewSchool('')
    setNewType('degree_granting')
  }

  const handleCancelAdd = () => {
    setIsAdding(false)
    setNewSchool('')
    setNewType('degree_granting')
  }

  const handleDelete = (schoolId: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    deleteSchool.mutate(schoolId, {
      onSuccess: () => {
        toast.showSuccess('School deleted')
        setPinnedSchoolIds((prev) => prev.filter((id) => id !== schoolId))
      },
      onError: () => {
        toast.showError('Failed to delete school')
      },
    })
  }

  const handleSaveNew = () => {
    if (newSchool.trim() && selectedUniversityId) {
      createSchool.mutate(
        {
          school: newSchool.trim(),
          university_id: selectedUniversityId,
          type: newType,
        },
        {
          onSuccess: (school) => {
            setIsAdding(false)
            setNewSchool('')
            setNewType('degree_granting')
            setPinnedSchoolIds((prev) => [...prev, school.id])
            toast.showSuccess('School added')
          },
          onError: (error: { code?: string; message?: string }) => {
            const message = error?.message?.toLowerCase() || ''
            if (
              error?.code === '23505' ||
              message.includes('duplicate') ||
              message.includes('unique')
            ) {
              toast.showError('School already exists for this university')
              return
            }
            toast.showError('Failed to add school')
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

  const sortedSchools = useMemo(() => {
    const filtered = schools.filter((s) =>
      s.school.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const pinnedSet = new Set(pinnedSchoolIds)
    const pinned = pinnedSchoolIds
      .map((id) => filtered.find((school) => school.id === id))
      .filter((school): school is (typeof filtered)[number] => Boolean(school))

    const temps = filtered.filter(
      (school) => school.id.startsWith('temp-') && !pinnedSet.has(school.id)
    )

    const rest = filtered.filter(
      (school) => !pinnedSet.has(school.id) && !school.id.startsWith('temp-')
    )

    const sortedRest = [...rest].sort((a, b) => {
      let aVal: string | number
      let bVal: string | number

      switch (sortColumn) {
        case 'school':
          aVal = a.school
          bVal = b.school
          break
        case 'type':
          aVal = a.type
          bVal = b.type
          break
        case 'department_count':
          aVal = a.department_count ?? 0
          bVal = b.department_count ?? 0
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return [...pinned, ...temps, ...sortedRest]
  }, [schools, searchQuery, sortColumn, sortDirection, pinnedSchoolIds])

  const startIndex = (page - 1) * SCHOOLS_PER_PAGE
  const totalPages = Math.ceil(sortedSchools.length / SCHOOLS_PER_PAGE)
  const paginatedSchools = sortedSchools.slice(startIndex, startIndex + SCHOOLS_PER_PAGE)

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages, setPage])

  const handleStartEdit = (s: (typeof schools)[number]) => {
    setEditingSchool({
      id: s.id,
      school: s.school,
      type: s.type,
      originalSchool: s.school,
      originalType: s.type,
    })
  }

  const handleCancelEdit = () => {
    setEditingSchool(null)
  }

  const handleSaveEdit = () => {
    if (!editingSchool) return

    const trimmedName = editingSchool.school.trim()
    if (!trimmedName) {
      toast.showError('School name cannot be empty.')
      return
    }

    const hasChanges =
      trimmedName !== editingSchool.originalSchool ||
      editingSchool.type !== editingSchool.originalType

    if (!hasChanges) {
      setEditingSchool(null)
      return
    }

    updateSchool.mutate(
      {
        id: editingSchool.id,
        school: trimmedName,
        type: editingSchool.type,
      },
      {
        onSuccess: () => {
          toast.showSuccess('School updated.')
          setEditingSchool(null)
        },
        onError: () => {
          toast.showError('Failed to update school.')
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

  const formatSchoolType = (type: SchoolType) => {
    return SCHOOL_TYPE_OPTIONS.find((o) => o.value === type)?.label || type
  }

  return (
    <div className="university-admin">
      <div className="admin-section university-tab-content">
        {/* University selector and school search */}
        <div className="admin-toolbar">
          <p className="admin-description">
            {selectedUniversityId
              ? `${sortedSchools.length} school${sortedSchools.length !== 1 ? 's' : ''}`
              : '\u00A0'}
          </p>
          <div className="admin-search-input search-box">
            <input
              type="text"
              value={selectedUniversity ? selectedUniversity.university : universitySearch}
              onChange={(e) => {
                setUniversitySearch(e.target.value)
                if (selectedUniversityId) {
                  setSelectedUniversityId(null)
                }
              }}
              placeholder="Search university..."
            />
            {selectedUniversityId && (
              <button
                className="admin-delete-btn"
                onClick={() => {
                  setSelectedUniversityId(null)
                  setUniversitySearch('')
                }}
                title="Clear selection"
                type="button"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {selectedUniversityId && (
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search schools..."
              className="admin-search-input"
            />
          )}
        </div>

        {/* University search results */}
        {!selectedUniversityId && universitySearch && filteredUniversities.length > 0 && (
          <div
            className="university-table-wrapper"
            style={{ maxHeight: '300px', overflow: 'auto' }}
          >
            <table className="university-table">
              <thead>
                <tr>
                  <th>Institute</th>
                  <th>Country</th>
                </tr>
              </thead>
              <tbody>
                {filteredUniversities.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => {
                      setSelectedUniversityId(u.id)
                      setUniversitySearch('')
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{u.university}</td>
                    <td>{u.country?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Schools list - only show when university is selected */}
        {selectedUniversityId && (
          <>
            {isLoading && <div className="admin-placeholder">Loading schools...</div>}

            {error && (
              <div className="admin-placeholder" style={{ color: 'var(--color-error)' }}>
                Failed to load schools.
              </div>
            )}

            {!isLoading && !error && (sortedSchools.length > 0 || isAdding) && (
              <div className="university-table-wrapper">
                <table className="university-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th className="sortable" onClick={() => handleSort('school')}>
                        School {sortColumn === 'school' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="sortable" onClick={() => handleSort('type')}>
                        Type {sortColumn === 'type' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="sortable" onClick={() => handleSort('department_count')}>
                        Depts{' '}
                        {sortColumn === 'department_count' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="table-header-action-cell">
                        {!isAdding && (
                          <button
                            className="admin-delete-btn table-header-action"
                            onClick={handleAddClick}
                            title="Add school"
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
                            ref={schoolInputRef}
                            type="text"
                            value={newSchool}
                            onChange={(e) => setNewSchool(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="School name"
                            className="inline-input"
                          />
                        </td>
                        <td>
                          <select
                            value={newType}
                            onChange={(e) => setNewType(e.target.value as SchoolType)}
                            onKeyDown={handleKeyDown}
                            className="inline-input"
                          >
                            {SCHOOL_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>-</td>
                        <td>
                          <button
                            className="admin-delete-btn"
                            onClick={handleCancelAdd}
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    )}
                    {paginatedSchools.map((s, index) => {
                      const isEditing = editingSchool?.id === s.id
                      const editingValue = isEditing ? editingSchool : null
                      return (
                        <tr key={s.id} className={isEditing ? 'editing-row' : ''}>
                          <td>{startIndex + index + 1}</td>
                          <InlineEditCell
                            isEditing={isEditing}
                            onStartEdit={() => handleStartEdit(s)}
                            editContent={
                              editingValue ? (
                                <input
                                  ref={editSchoolInputRef}
                                  type="text"
                                  value={editingValue.school}
                                  onChange={(e) =>
                                    setEditingSchool({ ...editingValue, school: e.target.value })
                                  }
                                  onKeyDown={handleEditKeyDown}
                                  className="inline-input"
                                />
                              ) : null
                            }
                          >
                            {s.url ? (
                              <a href={s.url} target="_blank" rel="noopener noreferrer">
                                {s.school}
                              </a>
                            ) : (
                              <span className="university-name-link">{s.school}</span>
                            )}
                          </InlineEditCell>
                          <InlineEditCell
                            isEditing={isEditing}
                            onStartEdit={() => handleStartEdit(s)}
                            editContent={
                              editingValue ? (
                                <select
                                  value={editingValue.type}
                                  onChange={(e) =>
                                    setEditingSchool({
                                      ...editingValue,
                                      type: e.target.value as SchoolType,
                                    })
                                  }
                                  onKeyDown={handleEditKeyDown}
                                  className="inline-input"
                                >
                                  {SCHOOL_TYPE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              ) : null
                            }
                          >
                            {formatSchoolType(s.type)}
                          </InlineEditCell>
                          <td>{s.department_count || 0}</td>
                          <InlineRowActionCell
                            isEditing={isEditing}
                            onCancel={handleCancelEdit}
                            onDelete={() => handleDelete(s.id, s.school)}
                          />
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}

            {!isLoading && !error && sortedSchools.length === 0 && !isAdding && (
              <div className="admin-placeholder">
                {searchQuery
                  ? 'No schools match your search.'
                  : 'No schools found for this university.'}
              </div>
            )}
          </>
        )}

        {!selectedUniversityId && !universitySearch && (
          <div className="admin-placeholder">Search for a university to view its schools.</div>
        )}
      </div>
    </div>
  )
}
