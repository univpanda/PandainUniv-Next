import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { placementKeys } from '../keys'
import type { School, SchoolType } from '../types'

// Fetch schools for a specific university
export function useSchoolsByUniversity(universityId: string | null) {
  return useQuery({
    queryKey: placementKeys.schoolsByUniversity(universityId || ''),
    queryFn: async (): Promise<School[]> => {
      if (!universityId) return []

      const { data: schools, error: schoolError } = await supabase
        .from('pt_school')
        .select('*')
        .eq('institution_id', universityId)
        .order('school', { ascending: true })

      if (schoolError) throw schoolError

      const { data: university } = await supabase
        .from('pt_institute')
        .select('id, official_name, english_name, url, country_id, us_news_2025_rank, updated_at')
        .eq('id', universityId)
        .single()

      const { data: deptCounts } = await supabase.from('pt_department').select('school_id')

      const deptCountMap = new Map<string, number>()
      for (const d of deptCounts || []) {
        deptCountMap.set(d.school_id, (deptCountMap.get(d.school_id) || 0) + 1)
      }

      return (schools || []).map((s) => ({
        ...s,
        university_id: s.institution_id,
        university: university
          ? {
              id: university.id,
              university: university.english_name || university.official_name || university.id,
              url: university.url,
              country_id: university.country_id,
              us_news_2025_rank: university.us_news_2025_rank,
              updated_at: university.updated_at,
            }
          : null,
        department_count: deptCountMap.get(s.id) || 0,
      })) as School[]
    },
    enabled: !!universityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create a new school
export function useCreateSchool() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newSchool: {
      school: string
      university_id: string
      url?: string | null
      type?: SchoolType
    }): Promise<School> => {
      const { data, error } = await supabase
        .from('pt_school')
        .insert({
          school: newSchool.school,
          institution_id: newSchool.university_id,
          url: newSchool.url,
          type: newSchool.type,
        })
        .select('*')
        .single()

      if (error) throw error

      return {
        ...data,
        university_id: data.institution_id,
        university: null,
        department_count: 0,
      } as School
    },
    onMutate: async (newSchool) => {
      const queryKey = placementKeys.schoolsByUniversity(newSchool.university_id)
      await queryClient.cancelQueries({ queryKey })

      const previousSchools = queryClient.getQueryData<School[]>(queryKey)
      const optimisticId = `temp-${Date.now()}`

      if (previousSchools) {
        const optimisticSchool: School = {
          id: optimisticId,
          school: newSchool.school.toLowerCase(),
          university_id: newSchool.university_id,
          university: null,
          url: newSchool.url || null,
          type: newSchool.type || 'degree_granting',
          updated_at: new Date().toISOString(),
        }
        queryClient.setQueryData<School[]>(queryKey, [optimisticSchool, ...previousSchools])
      }

      return { previousSchools, optimisticId, universityId: newSchool.university_id }
    },
    onSuccess: (createdSchool, newSchool, context) => {
      if (!context?.optimisticId) return
      const queryKey = placementKeys.schoolsByUniversity(newSchool.university_id)
      queryClient.setQueryData<School[]>(queryKey, (current) => {
        if (!current) return current
        return current.map((school) =>
          school.id === context.optimisticId ? createdSchool : school
        )
      })
    },
    onError: (_, __, context) => {
      if (context?.previousSchools && context?.universityId) {
        const queryKey = placementKeys.schoolsByUniversity(context.universityId)
        queryClient.setQueryData(queryKey, context.previousSchools)
      }
    },
  })
}

// Delete a school
export function useDeleteSchool(universityId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (schoolId: string): Promise<void> => {
      const { error } = await supabase.from('pt_school').delete().eq('id', schoolId)
      if (error) throw error
    },
    onSuccess: (_, schoolId) => {
      if (!universityId) return
      const queryKey = placementKeys.schoolsByUniversity(universityId)
      queryClient.setQueryData<School[]>(queryKey, (current) => {
        if (!current) return current
        return current.filter((school) => school.id !== schoolId)
      })
    },
  })
}

// Update a school
export function useUpdateSchool(universityId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: { id: string; school: string; type: SchoolType }): Promise<School> => {
      const { data, error } = await supabase
        .from('pt_school')
        .update({
          school: updates.school,
          type: updates.type,
        })
        .eq('id', updates.id)
        .select('*')
        .single()

      if (error) throw error

      return {
        ...data,
        university_id: data.institution_id,
        university: null,
      } as School
    },
    onMutate: async (updates) => {
      if (!universityId) return { previousSchools: null }
      const queryKey = placementKeys.schoolsByUniversity(universityId)
      await queryClient.cancelQueries({ queryKey })
      const previousSchools = queryClient.getQueryData<School[]>(queryKey)

      if (previousSchools) {
        queryClient.setQueryData<School[]>(queryKey, (current) => {
          if (!current) return current
          return current.map((s) => {
            if (s.id !== updates.id) return s
            return {
              ...s,
              school: updates.school.toLowerCase(),
              type: updates.type,
            }
          })
        })
      }

      return { previousSchools }
    },
    onSuccess: (updatedSchool) => {
      if (!universityId) return
      const queryKey = placementKeys.schoolsByUniversity(universityId)
      queryClient.setQueryData<School[]>(queryKey, (current) => {
        if (!current) return current
        return current.map((s) => (s.id === updatedSchool.id ? updatedSchool : s))
      })
    },
    onError: (_, __, context) => {
      if (context?.previousSchools && universityId) {
        const queryKey = placementKeys.schoolsByUniversity(universityId)
        queryClient.setQueryData(queryKey, context.previousSchools)
      }
    },
  })
}
