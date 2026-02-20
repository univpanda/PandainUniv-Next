import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  useCreateDepartment,
  useDeleteDepartment,
  useDepartmentsBySchool,
  useSchoolsByUniversity,
  useUniversities,
  useUpdateDepartment,
} from '../../hooks/usePlacementQueries'
import { useToast } from '../../contexts/ToastContext'
import { SearchInput } from '../../components/ui'
import { InlineEditCell } from '../../components/admin/InlineEditCell'
import { InlineRowActionCell } from '../../components/admin/InlineRowActionCell'
import { AdminPagination } from '../../components/admin/AdminPagination'
import { DEPARTMENTS_PER_PAGE, type DepartmentSortColumn, type DepartmentTabProps } from './types'

interface EditingDepartment {
  id: string
  department: string
  originalDepartment: string
}

export function DepartmentTab({ state, setState }: DepartmentTabProps) {
  const { data: universities = [] } = useUniversities()
  const { selectedSchoolId, searchQuery, sortColumn, sortDirection, page } = state
  const { data: departments = [], isLoading, error } = useDepartmentsBySchool(selectedSchoolId)
  const createDepartment = useCreateDepartment(selectedSchoolId)
  const deleteDepartment = useDeleteDepartment(selectedSchoolId)
  const updateDepartment = useUpdateDepartment(selectedSchoolId)
  const toast = useToast()

  const [schoolSearch, setSchoolSearch] = useState('')
  const [selectedUniversityId, setSelectedUniversityIdLocal] = useState<string | null>(null)
  const { data: schools = [] } = useSchoolsByUniversity(selectedUniversityId)
  const [isAdding, setIsAdding] = useState(false)
  const [newDepartment, setNewDepartment] = useState('')
  const [pinnedDepartmentIds, setPinnedDepartmentIds] = useState<string[]>([])
  const departmentInputRef = useRef<HTMLInputElement>(null)
  const editDepartmentInputRef = useRef<HTMLInputElement>(null)
  const [editingDepartment, setEditingDepartment] = useState<EditingDepartment | null>(null)

  // Build a flat list of schools with their university names for searching
  const allSchools = useMemo(() => {
    if (!selectedUniversityId) return []
    return schools.map((s) => ({
      ...s,
      universityName: universities.find((u) => u.id === s.university_id)?.university || '',
    }))
  }, [schools, universities, selectedUniversityId])

  // Filter schools for search dropdown
  const filteredSchools = useMemo(() => {
    if (!schoolSearch.trim()) return allSchools.slice(0, 20)
    const search = schoolSearch.toLowerCase()
    return allSchools.filter((s) => s.school.toLowerCase().includes(search)).slice(0, 20)
  }, [allSchools, schoolSearch])

  // Filter universities for university selection dropdown
  const filteredUniversities = useMemo(() => {
    if (!schoolSearch.trim() && !selectedUniversityId) return universities.slice(0, 20)
    const search = schoolSearch.toLowerCase()
    return universities.filter((u) => u.university.toLowerCase().includes(search)).slice(0, 20)
  }, [universities, schoolSearch, selectedUniversityId])

  const selectedSchool = useMemo(() => {
    return allSchools.find((s) => s.id === selectedSchoolId) || null
  }, [allSchools, selectedSchoolId])

  const selectedUniversity = useMemo(() => {
    return universities.find((u) => u.id === selectedUniversityId) || null
  }, [universities, selectedUniversityId])

  useEffect(() => {
    if (isAdding && departmentInputRef.current) {
      departmentInputRef.current.focus()
    }
  }, [isAdding])

  useEffect(() => {
    if (editingDepartment && editDepartmentInputRef.current) {
      editDepartmentInputRef.current.focus()
    }
  }, [editingDepartment])

  const setSelectedSchoolId = (id: string | null) => {
    setState((prev) => ({ ...prev, selectedSchoolId: id, searchQuery: '', page: 1 }))
    setPinnedDepartmentIds([])
    setIsAdding(false)
    setEditingDepartment(null)
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

  const handleSort = (column: DepartmentSortColumn) => {
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
    setNewDepartment('')
  }

  const handleCancelAdd = () => {
    setIsAdding(false)
    setNewDepartment('')
  }

  const handleDelete = (departmentId: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    deleteDepartment.mutate(departmentId, {
      onSuccess: () => {
        toast.showSuccess('Department deleted')
        setPinnedDepartmentIds((prev) => prev.filter((id) => id !== departmentId))
      },
      onError: () => {
        toast.showError('Failed to delete department')
      },
    })
  }

  const handleSaveNew = () => {
    if (newDepartment.trim() && selectedSchoolId) {
      createDepartment.mutate(
        {
          department: newDepartment.trim(),
          school_id: selectedSchoolId,
        },
        {
          onSuccess: (department) => {
            setIsAdding(false)
            setNewDepartment('')
            setPinnedDepartmentIds((prev) => [...prev, department.id])
            toast.showSuccess('Department added')
          },
          onError: (error: { code?: string; message?: string }) => {
            const message = error?.message?.toLowerCase() || ''
            if (
              error?.code === '23505' ||
              message.includes('duplicate') ||
              message.includes('unique')
            ) {
              toast.showError('Department already exists for this school')
              return
            }
            toast.showError('Failed to add department')
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

  const sortedDepartments = useMemo(() => {
    const filtered = departments.filter((d) =>
      d.department.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const pinnedSet = new Set(pinnedDepartmentIds)
    const pinned = pinnedDepartmentIds
      .map((id) => filtered.find((department) => department.id === id))
      .filter((department): department is (typeof filtered)[number] => Boolean(department))

    const temps = filtered.filter(
      (department) => department.id.startsWith('temp-') && !pinnedSet.has(department.id)
    )

    const rest = filtered.filter(
      (department) => !pinnedSet.has(department.id) && !department.id.startsWith('temp-')
    )

    const sortedRest = [...rest].sort((a, b) => {
      let aVal: string
      let bVal: string

      switch (sortColumn) {
        case 'department':
          aVal = a.department
          bVal = b.department
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return [...pinned, ...temps, ...sortedRest]
  }, [departments, searchQuery, sortColumn, sortDirection, pinnedDepartmentIds])

  const startIndex = (page - 1) * DEPARTMENTS_PER_PAGE
  const totalPages = Math.ceil(sortedDepartments.length / DEPARTMENTS_PER_PAGE)
  const paginatedDepartments = sortedDepartments.slice(
    startIndex,
    startIndex + DEPARTMENTS_PER_PAGE
  )

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages, setPage])

  const handleStartEdit = (d: (typeof departments)[number]) => {
    setEditingDepartment({
      id: d.id,
      department: d.department,
      originalDepartment: d.department,
    })
  }

  const handleCancelEdit = () => {
    setEditingDepartment(null)
  }

  const handleSaveEdit = () => {
    if (!editingDepartment) return

    const trimmedName = editingDepartment.department.trim()
    if (!trimmedName) {
      toast.showError('Department name cannot be empty.')
      return
    }

    const hasChanges = trimmedName !== editingDepartment.originalDepartment

    if (!hasChanges) {
      setEditingDepartment(null)
      return
    }

    updateDepartment.mutate(
      {
        id: editingDepartment.id,
        department: trimmedName,
      },
      {
        onSuccess: () => {
          toast.showSuccess('Department updated.')
          setEditingDepartment(null)
        },
        onError: () => {
          toast.showError('Failed to update department.')
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
        {/* School selector and department search */}
        <div className="admin-toolbar">
          <p className="admin-description">
            {selectedSchoolId
              ? `${sortedDepartments.length} department${sortedDepartments.length !== 1 ? 's' : ''}`
              : '\u00A0'}
          </p>
          {/* Step 1: Select university first */}
          {!selectedUniversityId && (
            <div className="admin-search-input search-box">
              <input
                type="text"
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                placeholder="Search university..."
              />
            </div>
          )}
          {/* Step 2: Show selected university and school search */}
          {selectedUniversityId && !selectedSchoolId && (
            <>
              <div className="admin-search-input search-box">
                <input
                  type="text"
                  value={selectedUniversity?.university || ''}
                  readOnly
                  style={{ color: 'var(--color-text)' }}
                />
                <button
                  className="admin-delete-btn"
                  onClick={() => {
                    setSelectedUniversityIdLocal(null)
                    setSchoolSearch('')
                  }}
                  title="Clear selection"
                  type="button"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="admin-search-input search-box">
                <input
                  type="text"
                  value={schoolSearch}
                  onChange={(e) => setSchoolSearch(e.target.value)}
                  placeholder="Search school..."
                />
              </div>
            </>
          )}
          {/* Step 3: Show selected school and department search */}
          {selectedSchoolId && (
            <>
              <div className="admin-search-input search-box">
                <input
                  type="text"
                  value={selectedSchool ? selectedSchool.school : ''}
                  readOnly
                  style={{ color: 'var(--color-text)' }}
                />
                <button
                  className="admin-delete-btn"
                  onClick={() => {
                    setSelectedSchoolId(null)
                    setSchoolSearch('')
                  }}
                  title="Clear selection"
                  type="button"
                >
                  <X size={14} />
                </button>
              </div>
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search departments..."
                className="admin-search-input"
              />
            </>
          )}
        </div>

        {/* University search results - Step 1 */}
        {!selectedUniversityId && schoolSearch && filteredUniversities.length > 0 && (
          <div className="university-table-wrapper">
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
                      setSelectedUniversityIdLocal(u.id)
                      setSchoolSearch('')
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

        {/* School search results - Step 2 */}
        {selectedUniversityId &&
          !selectedSchoolId &&
          (schoolSearch ? filteredSchools.length > 0 : allSchools.length > 0) && (
            <div className="university-table-wrapper">
              <table className="university-table">
                <thead>
                  <tr>
                    <th>School</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {(schoolSearch ? filteredSchools : allSchools).map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => {
                        setSelectedSchoolId(s.id)
                        setSchoolSearch('')
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{s.school}</td>
                      <td>{s.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        {/* No schools message */}
        {selectedUniversityId && !selectedSchoolId && allSchools.length === 0 && (
          <div className="admin-placeholder">No schools found for this university.</div>
        )}

        {/* Departments list - only show when school is selected */}
        {selectedSchoolId && (
          <>
            {isLoading && <div className="admin-placeholder">Loading departments...</div>}

            {error && (
              <div className="admin-placeholder" style={{ color: 'var(--color-error)' }}>
                Failed to load departments.
              </div>
            )}

            {!isLoading && !error && (sortedDepartments.length > 0 || isAdding) && (
              <div className="university-table-wrapper">
                <table className="university-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th className="sortable" onClick={() => handleSort('department')}>
                        Department{' '}
                        {sortColumn === 'department' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="table-header-action-cell">
                        {!isAdding && (
                          <button
                            className="admin-delete-btn table-header-action"
                            onClick={handleAddClick}
                            title="Add department"
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
                            ref={departmentInputRef}
                            type="text"
                            value={newDepartment}
                            onChange={(e) => setNewDepartment(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Department name"
                            className="inline-input"
                          />
                        </td>
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
                    {paginatedDepartments.map((d, index) => {
                      const isEditing = editingDepartment?.id === d.id
                      const editingValue = isEditing ? editingDepartment : null
                      return (
                        <tr key={d.id} className={isEditing ? 'editing-row' : ''}>
                          <td>{startIndex + index + 1}</td>
                          <InlineEditCell
                            isEditing={isEditing}
                            onStartEdit={() => handleStartEdit(d)}
                            editContent={
                              editingValue ? (
                                <input
                                  ref={editDepartmentInputRef}
                                  type="text"
                                  value={editingValue.department}
                                  onChange={(e) =>
                                    setEditingDepartment({
                                      ...editingValue,
                                      department: e.target.value,
                                    })
                                  }
                                  onKeyDown={handleEditKeyDown}
                                  className="inline-input"
                                />
                              ) : null
                            }
                          >
                            {d.url ? (
                              <a href={d.url} target="_blank" rel="noopener noreferrer">
                                {d.department}
                              </a>
                            ) : (
                              <span className="university-name-link">{d.department}</span>
                            )}
                          </InlineEditCell>
                          <InlineRowActionCell
                            isEditing={isEditing}
                            onCancel={handleCancelEdit}
                            onDelete={() => handleDelete(d.id, d.department)}
                          />
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}

            {!isLoading && !error && sortedDepartments.length === 0 && !isAdding && (
              <div className="admin-placeholder">
                {searchQuery
                  ? 'No departments match your search.'
                  : 'No departments found for this school.'}
              </div>
            )}
          </>
        )}

        {!selectedUniversityId && !schoolSearch && (
          <div className="admin-placeholder">
            Search for a university, then select a school to view its departments.
          </div>
        )}
      </div>
    </div>
  )
}

export default DepartmentTab
