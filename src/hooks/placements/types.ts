// Country type from pt_country table
export interface Country {
  id: string
  name: string
  code: string
  university_count?: number
}

// University type from pt_institute table
export interface University {
  id: string
  university: string
  url: string | null
  country_id: string | null
  country: Country | null
  us_news_2025_rank: number | null
  updated_at: string
  school_count?: number
}

// School type enum
export type SchoolType =
  | 'degree_granting'
  | 'continuing_education'
  | 'non_degree'
  | 'administrative'

// School type from pt_school table
export interface School {
  id: string
  school: string
  university_id: string | null
  university: University | null
  url: string | null
  type: SchoolType
  updated_at: string
  department_count?: number
}

// Department type from pt_department table
export interface Department {
  id: string
  department: string
  school_id: string | null
  school: School | null
  url: string | null
  status: string | null
  created_at: string
}

export interface UniversityTypeaheadResult {
  universities: string[]
  totalCount: number
}
