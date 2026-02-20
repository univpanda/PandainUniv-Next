import type { Dispatch, SetStateAction } from 'react'
import type { SchoolType } from '../../hooks/placements'

export type AdminSubTab = 'country' | 'university' | 'school' | 'department' | 'pandas'
export type UniversitySortColumn = 'university' | 'country' | 'us_news_2025_rank' | 'school_count'
export type CountrySortColumn = 'name' | 'code' | 'university_count'
export type SchoolSortColumn = 'school' | 'university' | 'type' | 'department_count'
export type DepartmentSortColumn = 'department'
export type SortDirection = 'asc' | 'desc'

export interface AdminProps {
  isActive?: boolean
}

export interface UniversityTabState {
  searchQuery: string
  sortColumn: UniversitySortColumn
  sortDirection: SortDirection
  page: number
}

export interface SchoolTabState {
  selectedUniversityId: string | null
  searchQuery: string
  sortColumn: SchoolSortColumn
  sortDirection: SortDirection
  page: number
}

export interface DepartmentTabState {
  selectedSchoolId: string | null
  searchQuery: string
  sortColumn: DepartmentSortColumn
  sortDirection: SortDirection
  page: number
}

export interface CountryTabState {
  searchQuery: string
  sortColumn: CountrySortColumn
  sortDirection: SortDirection
  page: number
}

export interface CountryTabProps {
  state: CountryTabState
  setState: Dispatch<SetStateAction<CountryTabState>>
}

export interface UniversityTabProps {
  state: UniversityTabState
  setState: Dispatch<SetStateAction<UniversityTabState>>
}

export interface SchoolTabProps {
  state: SchoolTabState
  setState: Dispatch<SetStateAction<SchoolTabState>>
}

export interface DepartmentTabProps {
  state: DepartmentTabState
  setState: Dispatch<SetStateAction<DepartmentTabState>>
}

export const COUNTRIES_PER_PAGE = 20
export const UNIVERSITIES_PER_PAGE = 20
export const SCHOOLS_PER_PAGE = 20
export const DEPARTMENTS_PER_PAGE = 20

export const SCHOOL_TYPE_OPTIONS: { value: SchoolType; label: string }[] = [
  { value: 'degree_granting', label: 'Degree Granting' },
  { value: 'continuing_education', label: 'Continuing Education' },
  { value: 'non_degree', label: 'Non-Degree' },
  { value: 'administrative', label: 'Administrative' },
]
