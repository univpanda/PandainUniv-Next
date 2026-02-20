import type { Placement } from '../../types'

export interface PlacementCommonFilters {
  degree: string
  fromYear: number | null
  toYear: number | null
}

export interface CompareEntry {
  program: string | null
  university: string | null
}

export interface ComparisonResult {
  label: string
  placements: Placement[]
}

export interface AcademicSummaryItem {
  count: number
  total: number
  pct: number
}
