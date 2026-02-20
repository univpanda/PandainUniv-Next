import { useCallback, useEffect, useMemo, useState } from 'react'
import { FilterSelect, LoadingSpinner } from '../ui'
import {
  usePlacementInstitutionsForProgramYearRange,
  useProgramsForYearRange,
  useReverseSearch,
} from '../../hooks/usePlacementQueries'
import { PlacementPagination, PlacementTable } from './PlacementViews'
import type { PlacementCommonFilters } from './types'

interface ReverseSearchTabProps {
  isActive: boolean
  commonFilters: PlacementCommonFilters
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timeoutId)
  }, [value, delayMs])

  return debounced
}

export function ReverseSearchTab({ isActive, commonFilters }: ReverseSearchTabProps) {
  const [placementUniv, setPlacementUniv] = useState('')
  const [program, setProgram] = useState<string | null>(null)
  const [placementSearch, setPlacementSearch] = useState('')
  const [searchTriggered, setSearchTriggered] = useState(false)
  const [page, setPage] = useState(0)
  const pageSize = 50
  const debouncedPlacementSearch = useDebouncedValue(placementSearch, 250)

  const { data: filteredPrograms } = useProgramsForYearRange(
    commonFilters.fromYear,
    commonFilters.toYear,
    isActive
  )

  const {
    data: placementInstitutionOptions,
    isLoading: placementInstitutionsLoading,
    isError: placementInstitutionsIsError,
    error: placementInstitutionsError,
  } = usePlacementInstitutionsForProgramYearRange(
    program,
    commonFilters.fromYear,
    commonFilters.toYear,
    debouncedPlacementSearch,
    60,
    isActive
  )

  const searchParams = useMemo(
    () => ({
      placementUniv,
      degree: commonFilters.degree,
      program,
      fromYear: commonFilters.fromYear,
      toYear: commonFilters.toYear,
      limit: pageSize,
      offset: page * pageSize,
    }),
    [placementUniv, commonFilters, program, page]
  )

  const { data: searchResult, isLoading, isFetching } = useReverseSearch(
    searchParams,
    searchTriggered && isActive && !!program && !!placementUniv.trim()
  )

  const handleSearch = useCallback(() => {
    if (placementUniv.trim() && program) {
      setPage(0)
      setSearchTriggered(true)
    }
  }, [placementUniv, program])

  const handleReset = useCallback(() => {
    setPlacementUniv('')
    setProgram(null)
    setPlacementSearch('')
    setSearchTriggered(false)
    setPage(0)
  }, [])

  const totalPages = Math.ceil((searchResult?.totalCount || 0) / pageSize)

  return (
    <div className="placement-reverse">
      <div className="placement-filters">
        <div className="filter-row">
          <FilterSelect
            value={program}
            options={filteredPrograms || []}
            onChange={(val) => {
              setProgram(val)
              setPlacementUniv('')
              setPlacementSearch('')
            }}
            placeholder="Select discipline"
            searchPlaceholder="Select discipline"
          />
          <FilterSelect
            value={placementUniv || null}
            options={program ? placementInstitutionOptions || [] : []}
            onChange={(val) => setPlacementUniv(val ?? '')}
            searchValue={placementSearch}
            onSearchChange={setPlacementSearch}
            placeholder={
              !program
                ? 'Select discipline first'
                : placementInstitutionsLoading
                  ? 'Loading...'
                  : 'Select placement institution'
            }
            searchPlaceholder="Select placement institution"
            disabled={!program || placementInstitutionsLoading}
          />
        </div>
        {program && placementInstitutionsIsError && (
          <div className="no-results">
            Failed to load placement institutions.
            {placementInstitutionsError instanceof Error ? ` ${placementInstitutionsError.message}` : ''}
          </div>
        )}
        {program &&
          !placementInstitutionsLoading &&
          !placementInstitutionsIsError &&
          (placementInstitutionOptions?.length || 0) === 0 && (
            <div className="no-results">
              No placement institutions found for this discipline and year range.
            </div>
          )}
        <div className="filter-actions">
          <button
            className="btn-primary"
            onClick={handleSearch}
            disabled={!placementUniv.trim() || !program}
          >
            Search
          </button>
          <button className="btn-secondary" onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>

      {searchTriggered && (
        <div className="placement-results">
          {isLoading ? (
            <LoadingSpinner className="placements-loading" />
          ) : (
            <>
              <div className="results-header">
                <span className="results-count">
                  {searchResult?.totalCount || 0} graduates found at "{placementUniv}"
                </span>
                <div className="results-header-right">
                  {isFetching && <span className="fetching-indicator">Updating...</span>}
                  {totalPages > 1 && (
                    <div className="reverse-top-pagination">
                      <PlacementPagination page={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                  )}
                </div>
              </div>
              <PlacementTable placements={searchResult?.placements || []} showUniversity />
            </>
          )}
        </div>
      )}
    </div>
  )
}
