import { useCallback, useState } from 'react'
import { FilterSelect, LoadingSpinner } from '../ui'
import { usePlacementSearch, useProgramsForYearRange, useProgramNamesForAliasUniversityYearRange } from '../../hooks/usePlacementQueries'
import { ComparisonTable } from './PlacementViews'
import { useUniversitySelectOptions } from './useUniversitySelectOptions'
import type { CompareEntry, PlacementCommonFilters } from './types'

interface ComparisonTabProps {
  isActive: boolean
  commonFilters: PlacementCommonFilters
}

export function ComparisonTab({ isActive, commonFilters }: ComparisonTabProps) {
  const [entry1, setEntry1] = useState<CompareEntry>({ program: null, university: null })
  const [entry2, setEntry2] = useState<CompareEntry>({ program: null, university: null })
  const [searchTriggered, setSearchTriggered] = useState(false)
  const [programFilter1, setProgramFilter1] = useState<string | null>(null)
  const [programFilter2, setProgramFilter2] = useState<string | null>(null)
  const compareLimit = 200

  const { data: filteredPrograms } = useProgramsForYearRange(
    commonFilters.fromYear,
    commonFilters.toYear,
    isActive
  )

  const universities1 = useUniversitySelectOptions(
    entry1.program,
    commonFilters.fromYear,
    commonFilters.toYear,
    isActive
  )
  const universities2 = useUniversitySelectOptions(
    entry2.program,
    commonFilters.fromYear,
    commonFilters.toYear,
    isActive
  )

  const search1 = usePlacementSearch(
    {
      degree: commonFilters.degree,
      program: entry1.program,
      university: entry1.university,
      fromYear: commonFilters.fromYear,
      toYear: commonFilters.toYear,
      limit: compareLimit,
    },
    searchTriggered && isActive && !!entry1.program && !!entry1.university
  )

  const search2 = usePlacementSearch(
    {
      degree: commonFilters.degree,
      program: entry2.program,
      university: entry2.university,
      fromYear: commonFilters.fromYear,
      toYear: commonFilters.toYear,
      limit: compareLimit,
    },
    searchTriggered && isActive && !!entry2.program && !!entry2.university
  )

  const filteredSearch1 = usePlacementSearch(
    {
      degree: commonFilters.degree,
      program: entry1.program,
      programName: programFilter1,
      university: entry1.university,
      fromYear: commonFilters.fromYear,
      toYear: commonFilters.toYear,
      limit: compareLimit,
    },
    searchTriggered && isActive && !!entry1.program && !!entry1.university && programFilter1 !== null
  )

  const filteredSearch2 = usePlacementSearch(
    {
      degree: commonFilters.degree,
      program: entry2.program,
      programName: programFilter2,
      university: entry2.university,
      fromYear: commonFilters.fromYear,
      toYear: commonFilters.toYear,
      limit: compareLimit,
    },
    searchTriggered && isActive && !!entry2.program && !!entry2.university && programFilter2 !== null
  )

  const { data: programOptions1 = [] } = useProgramNamesForAliasUniversityYearRange(
    entry1.program,
    entry1.university,
    commonFilters.fromYear,
    commonFilters.toYear,
    searchTriggered && isActive && !!entry1.program && !!entry1.university
  )

  const { data: programOptions2 = [] } = useProgramNamesForAliasUniversityYearRange(
    entry2.program,
    entry2.university,
    commonFilters.fromYear,
    commonFilters.toYear,
    searchTriggered && isActive && !!entry2.program && !!entry2.university
  )

  const handleCompare = useCallback(() => {
    if (entry1.program && entry1.university && entry2.program && entry2.university) {
      setProgramFilter1(null)
      setProgramFilter2(null)
      setSearchTriggered(true)
    }
  }, [entry1, entry2])

  const handleReset = useCallback(() => {
    setEntry1({ program: null, university: null })
    setEntry2({ program: null, university: null })
    setProgramFilter1(null)
    setProgramFilter2(null)
    setSearchTriggered(false)
  }, [])

  const programOptions = filteredPrograms || []

  const getUniversityOptions1 = () => {
    const options = entry1.program ? universities1.options || [] : []
    if (entry1.program === entry2.program && entry2.university) {
      return options.filter((u) => u !== entry2.university)
    }
    return options
  }

  const getUniversityOptions2 = () => {
    const options = entry2.program ? universities2.options || [] : []
    if (entry1.program === entry2.program && entry1.university) {
      return options.filter((u) => u !== entry1.university)
    }
    return options
  }

  const result1 = programFilter1 === null ? search1.data : (filteredSearch1.data ?? search1.data)
  const result2 = programFilter2 === null ? search2.data : (filteredSearch2.data ?? search2.data)
  const isLoading =
    (programFilter1 === null ? search1.isLoading : filteredSearch1.isLoading) ||
    (programFilter2 === null ? search2.isLoading : filteredSearch2.isLoading)
  const canCompare = entry1.program && entry1.university && entry2.program && entry2.university
  const label1 = `${result1?.placements?.[0]?.program || entry1.program} - ${entry1.university}`
  const label2 = `${result2?.placements?.[0]?.program || entry2.program} - ${entry2.university}`
  const shown1 = result1?.placements?.length || 0
  const shown2 = result2?.placements?.length || 0
  const total1 = result1?.totalCount || 0
  const total2 = result2?.totalCount || 0
  const truncated1 = total1 > shown1 && shown1 >= compareLimit
  const truncated2 = total2 > shown2 && shown2 >= compareLimit
  const academicPct1 = result1?.academicPct ?? 0
  const academicPct2 = result2?.academicPct ?? 0
  const academicCount1 = result1?.academicCount || 0
  const academicCount2 = result2?.academicCount || 0

  return (
    <div className="placement-compare">
      <div className="placement-filters">
        <div className="compare-entries">
          <div className="compare-selects">
            <div className="compare-select-row">
              <FilterSelect
                value={entry1.program}
                options={programOptions}
                onChange={(val) => setEntry1({ program: val, university: null })}
                placeholder="Select discipline"
                searchPlaceholder="Select discipline"
              />
              <FilterSelect
                value={entry1.university}
                options={getUniversityOptions1()}
                onChange={(val) => setEntry1((prev) => ({ ...prev, university: val }))}
                searchValue={universities1.mode === 'remote' ? universities1.search : undefined}
                onSearchChange={universities1.mode === 'remote' ? universities1.setSearch : undefined}
                disableClientFilter={universities1.mode === 'remote'}
                placeholder="Select university"
                searchPlaceholder="Select university"
                disabled={!entry1.program || universities1.mode === 'unknown' || universities1.isLoading}
              />
              {searchTriggered && programOptions1.length > 1 && (
                <FilterSelect
                  value={programFilter1}
                  options={programOptions1}
                  onChange={setProgramFilter1}
                  placeholder="All programs"
                  searchPlaceholder="Filter by program name"
                />
              )}
            </div>
            <div className="compare-select-row">
              <FilterSelect
                value={entry2.program}
                options={programOptions}
                onChange={(val) => setEntry2({ program: val, university: null })}
                placeholder="Select discipline"
                searchPlaceholder="Select discipline"
              />
              <FilterSelect
                value={entry2.university}
                options={getUniversityOptions2()}
                onChange={(val) => setEntry2((prev) => ({ ...prev, university: val }))}
                searchValue={universities2.mode === 'remote' ? universities2.search : undefined}
                onSearchChange={universities2.mode === 'remote' ? universities2.setSearch : undefined}
                disableClientFilter={universities2.mode === 'remote'}
                placeholder="Select university"
                searchPlaceholder="Select university"
                disabled={!entry2.program || universities2.mode === 'unknown' || universities2.isLoading}
              />
              {searchTriggered && programOptions2.length > 1 && (
                <FilterSelect
                  value={programFilter2}
                  options={programOptions2}
                  onChange={setProgramFilter2}
                  placeholder="All programs"
                  searchPlaceholder="Filter by program name"
                />
              )}
            </div>
          </div>
        </div>
        <div className="filter-actions">
          <button className="btn-primary" onClick={handleCompare} disabled={!canCompare}>
            Compare
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
              {(truncated1 || truncated2) && (
                <div className="results-header">
                  <span className="fetching-indicator">
                    Results are capped at {compareLimit} rows.
                    {truncated1 ? ` Showing ${shown1} of ${total1} for "${label1}".` : ''}
                    {truncated2 ? ` Showing ${shown2} of ${total2} for "${label2}".` : ''}
                  </span>
                </div>
              )}
              <ComparisonTable
                results={[
                  { label: label1, placements: result1?.placements || [] },
                  { label: label2, placements: result2?.placements || [] },
                ]}
                academicSummary={[
                  { count: academicCount1, total: total1, pct: academicPct1 },
                  { count: academicCount2, total: total2, pct: academicPct2 },
                ]}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
