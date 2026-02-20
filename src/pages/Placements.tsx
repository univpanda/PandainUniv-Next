import { useState, useMemo, useCallback } from 'react'
import { LogIn } from 'lucide-react'
import { FilterSelect } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { SearchTab, ComparisonTab, ReverseSearchTab } from '../components/placements'
import type { PlacementSubTab } from '../types'

interface PlacementsProps {
  isActive?: boolean
}

const CURRENT_MONTH = new Date().getMonth() // 0-indexed: 7 = August
const CURRENT_YEAR = new Date().getFullYear()
const MAX_YEAR = CURRENT_MONTH >= 7 ? CURRENT_YEAR : CURRENT_YEAR - 1
const MIN_YEAR_PUBLIC = MAX_YEAR - 1 // signed-out: 2-year window
const MIN_YEAR_AUTH = MAX_YEAR - 4 // signed-in: 5-year window

export function Placements({ isActive = true }: PlacementsProps) {
  const auth = useAuth()
  const minYear = auth.user ? MIN_YEAR_AUTH : MIN_YEAR_PUBLIC

  const degree = 'PhD'
  const [fromYear, setFromYear] = useState<number>(MIN_YEAR_PUBLIC)
  const [toYear, setToYear] = useState<number>(MAX_YEAR)
  const [subTab, setSubTab] = useState<PlacementSubTab>('search')

  // Clamp fromYear when auth state changes (e.g. user signs out while viewing older data)
  const effectiveFromYear = Math.max(fromYear, minYear)

  // Keep year options local to avoid a heavy blocking "filters" RPC on initial render.
  const yearOptions = useMemo(() => {
    const years: number[] = []
    for (let y = MAX_YEAR; y >= minYear; y--) years.push(y)
    return years
  }, [minYear])

  const startYearOptions = useMemo(() => yearOptions.map(String), [yearOptions])

  const endYearOptions = useMemo(
    () => yearOptions.filter((year) => year >= effectiveFromYear).map(String),
    [yearOptions, effectiveFromYear]
  )

  const handleFromYearChange = useCallback(
    (value: string | null) => {
      if (!value) return
      const nextFromYear = parseInt(value, 10)
      setFromYear(nextFromYear)
      if (toYear < nextFromYear) {
        setToYear(nextFromYear)
      }
    },
    [toYear]
  )

  const commonFilters = useMemo(
    () => ({
      degree,
      fromYear: effectiveFromYear,
      toYear,
    }),
    [degree, effectiveFromYear, toYear]
  )

  return (
    <div className="placements-container">
      <div className="placement-filters common-filters">
        <div className="filter-row">
          <FilterSelect
            value={degree}
            options={['PhD']}
            onChange={() => {}}
            placeholder="PhD"
            disabled
          />
          <FilterSelect
            value={effectiveFromYear.toString()}
            options={startYearOptions}
            onChange={handleFromYearChange}
            searchPlaceholder="Select start year"
          />
          <FilterSelect
            value={toYear.toString()}
            options={endYearOptions}
            onChange={(val) => val && setToYear(parseInt(val, 10))}
            searchPlaceholder="Select end year"
          />
        </div>
        {!auth.user && (
          <div className="sign-in-prompt">
            <button className="auth-button auth-sign-in" onClick={auth.signInWithGoogle}>
              <LogIn size={18} />
              <span>Sign in</span>
            </button>
            <span className="sign-in-text-full">
              to see placement data starting {MIN_YEAR_AUTH}
            </span>
            <span className="sign-in-text-short">for {MIN_YEAR_AUTH}+ data</span>
          </div>
        )}
      </div>

      <div className="placements-tabs">
        <button
          className={`placements-tab ${subTab === 'search' ? 'active' : ''}`}
          onClick={() => setSubTab('search')}
        >
          Search
        </button>
        <button
          className={`placements-tab ${subTab === 'compare' ? 'active' : ''}`}
          onClick={() => setSubTab('compare')}
        >
          Compare
        </button>
        <button
          className={`placements-tab ${subTab === 'reverse' ? 'active' : ''}`}
          onClick={() => setSubTab('reverse')}
        >
          Reverse Search
        </button>
      </div>

      <div className="placements-content">
        <div className={subTab !== 'search' ? 'hidden' : ''}>
          <SearchTab isActive={isActive && subTab === 'search'} commonFilters={commonFilters} />
        </div>
        <div className={subTab !== 'compare' ? 'hidden' : ''}>
          <ComparisonTab
            isActive={isActive && subTab === 'compare'}
            commonFilters={commonFilters}
          />
        </div>
        <div className={subTab !== 'reverse' ? 'hidden' : ''}>
          <ReverseSearchTab
            isActive={isActive && subTab === 'reverse'}
            commonFilters={commonFilters}
          />
        </div>
      </div>
    </div>
  )
}

export default Placements
