import { useCallback, useMemo, useState } from 'react'
import { FilterSelect, LoadingSpinner } from '../ui'
import { usePlacementSearch, useProgramsForYearRange, useProgramNotes, useProgramNamesForAliasUniversityYearRange } from '../../hooks/usePlacementQueries'
import { PlacementPagination, PlacementTable } from './PlacementViews'
import { useUniversitySelectOptions } from './useUniversitySelectOptions'
import type { PlacementCommonFilters } from './types'

interface SearchTabProps {
  isActive: boolean
  commonFilters: PlacementCommonFilters
}

export function SearchTab({ isActive, commonFilters }: SearchTabProps) {
  const [program, setProgram] = useState<string | null>(null)
  const [university, setUniversity] = useState<string | null>(null)
  const [searchTriggered, setSearchTriggered] = useState(false)
  const [page, setPage] = useState(0)
  const [resultProgramFilter, setResultProgramFilter] = useState<string | null>(null)
  const pageSize = 50

  const { data: filteredPrograms } = useProgramsForYearRange(
    commonFilters.fromYear,
    commonFilters.toYear,
    isActive
  )

  const { data: programNotes } = useProgramNotes(program, university, isActive && searchTriggered)

  const universitySelect = useUniversitySelectOptions(
    program,
    commonFilters.fromYear,
    commonFilters.toYear,
    isActive
  )

  const baseSearchParams = useMemo(
    () => ({
      degree: commonFilters.degree,
      program,
      university,
      fromYear: commonFilters.fromYear,
      toYear: commonFilters.toYear,
      limit: pageSize,
      offset: page * pageSize,
    }),
    [commonFilters, program, university, page]
  )
  const filteredSearchParams = useMemo(
    () => ({
      ...baseSearchParams,
      programName: resultProgramFilter,
    }),
    [baseSearchParams, resultProgramFilter]
  )

  const canSearch = !!program && !!university
  const baseSearch = usePlacementSearch(
    baseSearchParams,
    searchTriggered && isActive && canSearch
  )
  const filteredSearch = usePlacementSearch(
    filteredSearchParams,
    searchTriggered && isActive && canSearch && resultProgramFilter !== null
  )

  const handleSearch = useCallback(() => {
    if (program && university) {
      setPage(0)
      setResultProgramFilter(null)
      setSearchTriggered(true)
    }
  }, [program, university])

  const handleReset = useCallback(() => {
    setProgram(null)
    setUniversity(null)
    setResultProgramFilter(null)
    setSearchTriggered(false)
    setPage(0)
  }, [])

  const programOptions = filteredPrograms || []
  const universityOptions = program ? universitySelect.options : []
  const searchResult =
    resultProgramFilter === null ? baseSearch.data : (filteredSearch.data ?? baseSearch.data)
  const isLoading = resultProgramFilter === null ? baseSearch.isLoading : filteredSearch.isLoading
  const isFetching = baseSearch.isFetching || filteredSearch.isFetching
  const { data: resultProgramOptions = [] } = useProgramNamesForAliasUniversityYearRange(
    program,
    university,
    commonFilters.fromYear,
    commonFilters.toYear,
    searchTriggered && isActive && canSearch
  )
  const totalPages = Math.ceil((searchResult?.totalCount || 0) / pageSize)

  return (
    <div className="placement-search">
      <div className="placement-filters">
        <div className="filter-row">
          <FilterSelect
            value={program}
            options={programOptions}
            onChange={(val) => {
              setProgram(val)
              setUniversity(null)
            }}
            placeholder="Select discipline"
            searchPlaceholder="Select discipline"
          />
          <FilterSelect
            value={university}
            options={universityOptions}
            onChange={setUniversity}
            searchValue={universitySelect.mode === 'remote' ? universitySelect.search : undefined}
            onSearchChange={universitySelect.mode === 'remote' ? universitySelect.setSearch : undefined}
            disableClientFilter={universitySelect.mode === 'remote'}
            placeholder="Select university"
            searchPlaceholder="Select university"
            disabled={!program || universitySelect.mode === 'unknown' || universitySelect.isLoading}
          />
        </div>
        {searchTriggered && resultProgramOptions.length > 1 && (
          <div className="filter-row">
            <FilterSelect
              value={resultProgramFilter}
              options={resultProgramOptions}
              onChange={(val) => {
                setPage(0)
                setResultProgramFilter(val)
              }}
              placeholder="All programs"
              searchPlaceholder="Filter by program name"
            />
          </div>
        )}
        <div className="filter-actions">
          <button className="btn-primary" onClick={handleSearch} disabled={!canSearch}>
            Search
          </button>
          <button className="btn-secondary" onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>

      {searchTriggered && canSearch && (
        <div className="placement-results">
          {isLoading ? (
            <LoadingSpinner className="placements-loading" />
          ) : (
            <>
              {programNotes && (
                <div className="program-notes">
                  <strong>Note:</strong> {programNotes}
                </div>
              )}
              <div className="results-header">
                {searchResult?.academicPct != null && searchResult.totalCount > 0 && (
                  <span className="academic-pct">
                    {searchResult.academicCount}/{searchResult.totalCount} ({searchResult.academicPct}%)
                    {' '}academic placements
                  </span>
                )}
                <div className="results-header-right">
                  {isFetching && <span className="fetching-indicator">Updating...</span>}
                  {totalPages > 1 && (
                    <div className="results-top-pagination">
                      <PlacementPagination page={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                  )}
                </div>
              </div>
              <PlacementTable placements={searchResult?.placements || []} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
