// Placement types for PhD placement search

export interface Placement {
  id: string
  name: string | null
  placementUniv: string | null
  placementType: string | null
  role: string | null
  year: number | null
  university: string | null
  program: string | null
  degree: string | null
  discipline: string | null
  school: string | null
  department: string | null
}

export interface PlacementFilters {
  degrees: string[]
  programs: string[]
  universities: string[]
  years: number[]
}

export interface PlacementSearchParams {
  degree?: string | null
  program?: string | null
  programName?: string | null
  university?: string | null
  fromYear?: number | null
  toYear?: number | null
  limit?: number
  offset?: number
}

export interface ReverseSearchParams {
  placementUniv: string
  degree?: string | null
  program?: string | null
  fromYear?: number | null
  toYear?: number | null
  limit?: number
  offset?: number
}

export interface PlacementSearchResult {
  placements: Placement[]
  totalCount: number
  academicCount: number
  academicPct: number | null
}

export type PlacementSubTab = 'search' | 'compare' | 'reverse'
