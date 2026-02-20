import type { PlacementSearchParams, ReverseSearchParams } from '../../types'

// Query keys
export const placementKeys = {
  all: ['placements'] as const,
  filters: () => [...placementKeys.all, 'filters'] as const,
  universities: () => [...placementKeys.all, 'universities'] as const,
  countries: () => [...placementKeys.all, 'countries'] as const,
  schoolsByUniversity: (universityId: string) =>
    [...placementKeys.all, 'schools', universityId] as const,
  departmentsBySchool: (schoolId: string) =>
    [...placementKeys.all, 'departments', schoolId] as const,
  search: (params: PlacementSearchParams) => [...placementKeys.all, 'search', params] as const,
  reverseSearch: (params: ReverseSearchParams) =>
    [...placementKeys.all, 'reverse', params] as const,
  programsForUniversity: (university: string) => [...placementKeys.all, 'programs', university] as const,
  universitiesForProgram: (program: string) =>
    [...placementKeys.all, 'universities', program] as const,
  programsWithPlacements: (university: string, fromYear: number | null, toYear: number | null) =>
    [...placementKeys.all, 'programsWithPlacements', university, fromYear, toYear] as const,
  programNamesForAliasUniversityYearRange: (
    program: string,
    university: string,
    fromYear: number | null,
    toYear: number | null
  ) =>
    [
      ...placementKeys.all,
      'programNamesForAliasUniversityYearRange',
      program,
      university,
      fromYear,
      toYear,
    ] as const,
  programsForYearRange: (fromYear: number | null, toYear: number | null) =>
    [...placementKeys.all, 'programsForYearRange', fromYear, toYear] as const,
  universitiesForProgramYearRange: (program: string, fromYear: number | null, toYear: number | null) =>
    [...placementKeys.all, 'universitiesForProgramYearRange', program, fromYear, toYear] as const,
  universityTypeaheadForProgramYearRange: (
    program: string,
    fromYear: number | null,
    toYear: number | null,
    query: string,
    limit: number
  ) =>
    [
      ...placementKeys.all,
      'universityTypeaheadForProgramYearRange',
      program,
      fromYear,
      toYear,
      query,
      limit,
    ] as const,
  placementInstitutionsForProgramYearRange: (
    program: string,
    fromYear: number | null,
    toYear: number | null,
    query: string,
    limit: number
  ) =>
    [
      ...placementKeys.all,
      'placementInstitutionsForProgramYearRange',
      program,
      fromYear,
      toYear,
      query,
      limit,
    ] as const,
  programNotes: (program: string, university: string) =>
    [...placementKeys.all, 'programNotes', program, university] as const,
}
