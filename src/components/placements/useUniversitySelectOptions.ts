import { useEffect, useState } from 'react'
import {
  useUniversitiesForProgramYearRange,
  useUniversityTypeaheadForProgramYearRange,
} from '../../hooks/usePlacementQueries'

const REMOTE_TYPEAHEAD_THRESHOLD = 500
const UNIVERSITY_TYPEAHEAD_LIMIT = 80
type UniversitySelectMode = 'unknown' | 'local' | 'remote'

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timeoutId)
  }, [value, delayMs])

  return debounced
}

export function useUniversitySelectOptions(
  program: string | null,
  fromYear: number | null,
  toYear: number | null,
  enabled: boolean
) {
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<UniversitySelectMode>('unknown')
  const debouncedSearch = useDebouncedValue(search, 250)

  useEffect(() => {
    if (!program) {
      setMode('local')
      setSearch('')
      return
    }
    setMode('unknown')
    setSearch('')
  }, [program, fromYear, toYear])

  const sizeProbe = useUniversityTypeaheadForProgramYearRange(
    program,
    fromYear,
    toYear,
    '',
    1,
    enabled && !!program && mode === 'unknown'
  )

  useEffect(() => {
    if (mode !== 'unknown' || !program || !sizeProbe.data) return
    if (process.env.NODE_ENV === 'development') {
      console.debug('[placements] university mode probe', {
        program,
        fromYear,
        toYear,
        totalCount: sizeProbe.data.totalCount,
        threshold: REMOTE_TYPEAHEAD_THRESHOLD,
      })
    }
    setMode(sizeProbe.data.totalCount > REMOTE_TYPEAHEAD_THRESHOLD ? 'remote' : 'local')
  }, [mode, program, fromYear, toYear, sizeProbe.data])

  const local = useUniversitiesForProgramYearRange(
    program,
    fromYear,
    toYear,
    enabled && !!program && mode === 'local'
  )

  const remote = useUniversityTypeaheadForProgramYearRange(
    program,
    fromYear,
    toYear,
    debouncedSearch,
    UNIVERSITY_TYPEAHEAD_LIMIT,
    enabled && !!program && mode === 'remote'
  )

  if (!program) {
    return {
      options: [] as string[],
      search,
      setSearch,
      mode: 'local' as UniversitySelectMode,
      isLoading: false,
    }
  }

  return {
    options: mode === 'remote' ? remote.data?.universities || [] : local.data || [],
    search,
    setSearch,
    mode,
    isLoading:
      mode === 'unknown'
        ? sizeProbe.isLoading
        : mode === 'remote'
          ? remote.isLoading
          : local.isLoading,
  }
}
