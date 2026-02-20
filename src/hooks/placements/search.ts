import { useQuery } from '@tanstack/react-query'
import { supabasePublic } from '../../lib/supabase'
import { placementKeys } from './keys'
import type {
  PlacementFilters,
  PlacementSearchParams,
  ReverseSearchParams,
  PlacementSearchResult,
  Placement,
} from '../../types'
import type { UniversityTypeaheadResult } from './types'

function mapPlacementRows(rows: Record<string, unknown>[]): Placement[] {
  return rows.map((row) => {
    const rawYear = row.year ?? row.date
    const parsedYear =
      typeof rawYear === 'number' ? rawYear : rawYear ? parseInt(String(rawYear), 10) : null
    const placementUniv = (row.placement_univ ?? row.institution ?? row.placement) as string | null

    return {
      id: row.id as string,
      name: row.name as string | null,
      placementUniv,
      placementType: (row.placement_type as string | null) ?? null,
      role: row.role as string | null,
      year: Number.isNaN(parsedYear) ? null : parsedYear,
      university: row.university as string | null,
      program: row.program as string | null,
      degree: row.degree as string | null,
      discipline: row.discipline as string | null,
      school: null,
      department: null,
    }
  })
}

// Fetch placement filters (degrees, programs, universities, years)
export function usePlacementFilters() {
  return useQuery({
    queryKey: placementKeys.filters(),
    queryFn: async (): Promise<PlacementFilters> => {
      const { data, error } = await supabasePublic.rpc('get_placement_filters')
      if (error) throw error

      return {
        degrees: (data?.degrees || []).filter(Boolean).sort(),
        programs: (data?.programs || []).filter(Boolean).sort(),
        universities: (data?.universities || []).filter(Boolean).sort(),
        years: (data?.years || []).filter(Boolean).sort((a: number, b: number) => b - a),
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Search placements
export function usePlacementSearch(params: PlacementSearchParams, enabled: boolean = true) {
  return useQuery({
    queryKey: placementKeys.search(params),
    queryFn: async (): Promise<PlacementSearchResult> => {
      const { data, error } = await supabasePublic.rpc('search_placements', {
        p_degree: params.degree || null,
        p_program: params.program || null,
        p_program_name: params.programName || null,
        p_university: params.university || null,
        p_from_year: params.fromYear || null,
        p_to_year: params.toYear || null,
        p_limit: params.limit || 100,
        p_offset: params.offset || 0,
      })

      if (error) throw error

      const placements = mapPlacementRows((data || []) as Record<string, unknown>[])
      const totalCount = data?.[0]?.total_count || 0
      const academicCount = data?.[0]?.academic_count || 0
      const academicPct = data?.[0]?.academic_pct ?? null

      return { placements, totalCount, academicCount, academicPct }
    },
    enabled,
    staleTime: 30 * 1000,
  })
}

// Reverse search placements (by hiring institution)
export function useReverseSearch(params: ReverseSearchParams, enabled: boolean = true) {
  return useQuery({
    queryKey: placementKeys.reverseSearch(params),
    queryFn: async (): Promise<PlacementSearchResult> => {
      const { data, error } = await supabasePublic.rpc('reverse_search_placements', {
        p_placement_univ: params.placementUniv,
        p_degree: params.degree || null,
        p_program: params.program || null,
        p_from_year: params.fromYear || null,
        p_to_year: params.toYear || null,
        p_limit: params.limit || 50,
        p_offset: params.offset || 0,
      })

      if (error) throw error

      const placements = mapPlacementRows((data || []) as Record<string, unknown>[])
      const totalCount = data?.[0]?.total_count || 0
      const academicCount = data?.[0]?.academic_count || 0
      const academicPct = data?.[0]?.academic_pct ?? null

      return { placements, totalCount, academicCount, academicPct }
    },
    enabled: enabled && !!params.placementUniv,
    staleTime: 30 * 1000,
  })
}

// Get programs for a specific university
export function useProgramsForUniversity(university: string | null) {
  return useQuery({
    queryKey: placementKeys.programsForUniversity(university || ''),
    queryFn: async (): Promise<string[]> => {
      if (!university) return []
      const { data, error } = await supabasePublic.rpc('get_programs_for_university', {
        p_university: university,
      })
      if (error) throw error
      return (data || []).filter(Boolean).sort()
    },
    enabled: !!university,
    staleTime: 5 * 60 * 1000,
  })
}

// Get universities for a specific program
export function useUniversitiesForProgram(program: string | null) {
  return useQuery({
    queryKey: placementKeys.universitiesForProgram(program || ''),
    queryFn: async (): Promise<string[]> => {
      if (!program) return []
      const { data, error } = await supabasePublic.rpc('get_universities_for_program', {
        p_program: program,
      })
      if (error) throw error
      return (data || []).filter(Boolean).sort()
    },
    enabled: !!program,
    staleTime: 5 * 60 * 1000,
  })
}

// Get programs with placements for a specific university and year range
export function useProgramsWithPlacements(
  university: string | null,
  fromYear: number | null,
  toYear: number | null
) {
  return useQuery({
    queryKey: placementKeys.programsWithPlacements(university || '', fromYear, toYear),
    queryFn: async (): Promise<string[]> => {
      if (!university) return []
      const { data, error } = await supabasePublic.rpc('get_programs_with_placements', {
        p_university: university,
        p_from_year: fromYear,
        p_to_year: toYear,
      })
      if (error) throw error
      return (data || []).filter(Boolean).sort()
    },
    enabled: !!university,
    staleTime: 30 * 1000,
  })
}

// Get distinct program names for a specific alias + university + year range
export function useProgramNamesForAliasUniversityYearRange(
  program: string | null,
  university: string | null,
  fromYear: number | null,
  toYear: number | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: placementKeys.programNamesForAliasUniversityYearRange(
      program || '',
      university || '',
      fromYear,
      toYear
    ),
    queryFn: async (): Promise<string[]> => {
      if (!program || !university) return []
      const { data, error } = await supabasePublic.rpc(
        'get_program_names_for_alias_university_year_range',
        {
          p_program: program,
          p_university: university,
          p_from_year: fromYear,
          p_to_year: toYear,
        }
      )
      if (error) throw error
      return (data || [])
        .map((item: string | { program: string }) => (typeof item === 'string' ? item : item.program))
        .filter(Boolean)
        .sort()
    },
    enabled: enabled && !!program && !!university,
    staleTime: 30 * 1000,
  })
}

// Get programs with placements for a year range (no university filter)
export function useProgramsForYearRange(
  fromYear: number | null,
  toYear: number | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: placementKeys.programsForYearRange(fromYear, toYear),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabasePublic.rpc('get_programs_for_year_range', {
        p_from_year: fromYear,
        p_to_year: toYear,
      })
      if (error) throw error
      return (data || [])
        .map((item: string | { program: string }) => (typeof item === 'string' ? item : item.program))
        .filter(Boolean)
        .sort()
    },
    enabled,
    staleTime: 30 * 1000,
  })
}

// Get universities with placements for a program and year range
export function useUniversitiesForProgramYearRange(
  program: string | null,
  fromYear: number | null,
  toYear: number | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: placementKeys.universitiesForProgramYearRange(program || '', fromYear, toYear),
    queryFn: async (): Promise<string[]> => {
      if (!program) return []
      const { data, error } = await supabasePublic.rpc('get_universities_for_program_year_range', {
        p_program: program,
        p_from_year: fromYear,
        p_to_year: toYear,
      })
      if (error) throw error
      const universities = (data || []).map((item: string | { university: string }) =>
        typeof item === 'string' ? item : item.university
      )
      return universities.filter(Boolean).sort()
    },
    enabled: enabled && !!program,
    staleTime: 30 * 1000,
  })
}

// Get universities for a program+year range with server-side query + limit
export function useUniversityTypeaheadForProgramYearRange(
  program: string | null,
  fromYear: number | null,
  toYear: number | null,
  query: string = '',
  limit: number = 80,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: placementKeys.universityTypeaheadForProgramYearRange(
      program || '',
      fromYear,
      toYear,
      query,
      limit
    ),
    queryFn: async (): Promise<UniversityTypeaheadResult> => {
      if (!program) return { universities: [], totalCount: 0 }

      const { data, error } = await supabasePublic.rpc('search_universities_for_program_year_range', {
        p_program: program,
        p_from_year: fromYear,
        p_to_year: toYear,
        p_query: query || null,
        p_limit: limit,
      })

      if (!error) {
        const rows = (data || []) as Array<{ university: string; total_count: number }>
        const universities = rows.map((r) => r.university).filter(Boolean)
        const totalCount = rows[0]?.total_count ?? 0
        return { universities, totalCount }
      }

      // Backward compatibility while migration is rolling out.
      if (error.code === 'PGRST202' || error.code === '42883') {
        const { data: fallbackData, error: fallbackError } = await supabasePublic.rpc(
          'get_universities_for_program_year_range',
          {
            p_program: program,
            p_from_year: fromYear,
            p_to_year: toYear,
          }
        )
        if (fallbackError) throw fallbackError

        const universities = (fallbackData || []).map((item: string | { university: string }) =>
          typeof item === 'string' ? item : item.university
        )
        const normalizedQuery = query.trim().toLowerCase()
        const filtered = universities
          .filter(Boolean)
          .filter((name: string) => (normalizedQuery ? name.toLowerCase().includes(normalizedQuery) : true))
          .slice(0, limit)

        return { universities: filtered, totalCount: universities.filter(Boolean).length }
      }

      throw error
    },
    enabled: enabled && !!program,
    staleTime: 60 * 1000,
  })
}

// Get notes for a specific program + university combination
export function useProgramNotes(program: string | null, university: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: placementKeys.programNotes(program || '', university || ''),
    queryFn: async (): Promise<string | null> => {
      if (!program || !university) return null
      const { data, error } = await supabasePublic.rpc('get_program_notes', {
        p_program: program,
        p_university: university,
      })
      if (error) return null
      return data as string | null
    },
    enabled: enabled && !!program && !!university,
    staleTime: 5 * 60 * 1000,
  })
}

// Reverse-search dropdown: placement institutions (hiring orgs) for a program + year range
export function usePlacementInstitutionsForProgramYearRange(
  program: string | null,
  fromYear: number | null,
  toYear: number | null,
  query: string = '',
  limit: number = 60,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: placementKeys.placementInstitutionsForProgramYearRange(
      program || '',
      fromYear,
      toYear,
      query,
      limit
    ),
    queryFn: async (): Promise<string[]> => {
      if (!program) return []
      const { data, error } = await supabasePublic.rpc(
        'search_placement_institutions_for_program_year_range',
        {
          p_program: program,
          p_from_year: fromYear,
          p_to_year: toYear,
          p_query: query || null,
          p_limit: limit,
        }
      )

      if (!error) {
        const institutions = (data || []).map((item: string | { placement_institution: string }) =>
          typeof item === 'string' ? item : item.placement_institution
        )
        return institutions.filter(Boolean)
      }

      // Backward compatibility while migration is rolling out.
      if (error.code === 'PGRST202' || error.code === '42883') {
        const { data: fallbackData, error: fallbackError } = await supabasePublic.rpc(
          'get_placement_institutions_for_program_year_range',
          {
            p_program: program,
            p_from_year: fromYear,
            p_to_year: toYear,
          }
        )
        if (fallbackError) throw fallbackError

        const normalizedQuery = query.trim().toLowerCase()
        const institutions = (fallbackData || []).map((item: string | { placement_institution: string }) =>
          typeof item === 'string' ? item : item.placement_institution
        )

        return institutions
          .filter(Boolean)
          .filter((name: string) => (normalizedQuery ? name.toLowerCase().includes(normalizedQuery) : true))
          .slice(0, limit)
      }

      throw error
    },
    enabled: enabled && !!program,
    staleTime: 60 * 1000,
  })
}
