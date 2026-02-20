import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { placementKeys } from '../keys'
import type { Department } from '../types'

// Fetch departments for a specific school
export function useDepartmentsBySchool(schoolId: string | null) {
  return useQuery({
    queryKey: placementKeys.departmentsBySchool(schoolId || ''),
    queryFn: async (): Promise<Department[]> => {
      if (!schoolId) return []
      const { data, error } = await supabase
        .from('pt_department')
        .select(
          `
          *,
          school:pt_school(id, school, url, type, institution_id)
        `
        )
        .eq('school_id', schoolId)
        .order('department', { ascending: true })

      if (error) throw error

      return (data || []).map((d) => ({
        ...d,
        school: d.school ? { ...d.school, university_id: d.school.institution_id } : null,
      }))
    },
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create a new department
export function useCreateDepartment(schoolId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newDepartment: {
      department: string
      school_id: string
      url?: string | null
    }): Promise<Department> => {
      const { data, error } = await supabase
        .from('pt_department')
        .insert([newDepartment])
        .select(
          `
          *,
          school:pt_school(id, school, url, type, institution_id)
        `
        )
        .single()

      if (error) throw error

      return {
        ...data,
        school: data.school ? { ...data.school, university_id: data.school.institution_id } : null,
      }
    },
    onMutate: async (newDepartment) => {
      if (!schoolId) return { previousDepartments: null, tempId: null as string | null }
      const queryKey = placementKeys.departmentsBySchool(schoolId)
      await queryClient.cancelQueries({ queryKey })
      const previousDepartments = queryClient.getQueryData<Department[]>(queryKey)

      const tempId = `temp-${Date.now()}`
      const optimisticDepartment: Department = {
        id: tempId,
        department: newDepartment.department,
        school_id: newDepartment.school_id,
        school: null,
        url: newDepartment.url || null,
        status: null,
        created_at: new Date().toISOString(),
      }

      queryClient.setQueryData<Department[]>(queryKey, (current) => {
        if (!current) return [optimisticDepartment]
        return [optimisticDepartment, ...current]
      })

      return { previousDepartments, tempId }
    },
    onSuccess: (newDepartment, _, context) => {
      if (!schoolId) return
      const queryKey = placementKeys.departmentsBySchool(schoolId)
      queryClient.setQueryData<Department[]>(queryKey, (current) => {
        if (!current) return [newDepartment]
        if (!context?.tempId) return [...current, newDepartment]
        return current.map((d) => (d.id === context.tempId ? newDepartment : d))
      })
      queryClient.invalidateQueries({ queryKey: ['placements', 'schools'] })
    },
    onError: (_, __, context) => {
      if (context?.previousDepartments && schoolId) {
        const queryKey = placementKeys.departmentsBySchool(schoolId)
        queryClient.setQueryData(queryKey, context.previousDepartments)
      }
    },
  })
}

// Delete a department
export function useDeleteDepartment(schoolId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (departmentId: string): Promise<void> => {
      const { error } = await supabase.from('pt_department').delete().eq('id', departmentId)
      if (error) throw error
    },
    onSuccess: (_, departmentId) => {
      if (!schoolId) return
      const queryKey = placementKeys.departmentsBySchool(schoolId)
      queryClient.setQueryData<Department[]>(queryKey, (current) => {
        if (!current) return current
        return current.filter((department) => department.id !== departmentId)
      })
      queryClient.invalidateQueries({ queryKey: ['placements', 'schools'] })
    },
  })
}

// Update a department
export function useUpdateDepartment(schoolId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: { id: string; department: string; url?: string | null }): Promise<Department> => {
      const { data, error } = await supabase
        .from('pt_department')
        .update({
          department: updates.department,
          url: updates.url,
        })
        .eq('id', updates.id)
        .select(
          `
          *,
          school:pt_school(id, school, url, type, institution_id)
        `
        )
        .single()

      if (error) throw error

      return {
        ...data,
        school: data.school ? { ...data.school, university_id: data.school.institution_id } : null,
      }
    },
    onMutate: async (updates) => {
      if (!schoolId) return { previousDepartments: null }
      const queryKey = placementKeys.departmentsBySchool(schoolId)
      await queryClient.cancelQueries({ queryKey })
      const previousDepartments = queryClient.getQueryData<Department[]>(queryKey)

      queryClient.setQueryData<Department[]>(queryKey, (current) => {
        if (!current) return current
        return current.map((d) => {
          if (d.id === updates.id) {
            return {
              ...d,
              department: updates.department,
              url: updates.url ?? d.url,
            }
          }
          return d
        })
      })

      return { previousDepartments }
    },
    onSuccess: (updatedDepartment) => {
      if (!schoolId) return
      const queryKey = placementKeys.departmentsBySchool(schoolId)
      queryClient.setQueryData<Department[]>(queryKey, (current) => {
        if (!current) return current
        return current.map((d) => (d.id === updatedDepartment.id ? updatedDepartment : d))
      })
    },
    onError: (_, __, context) => {
      if (context?.previousDepartments && schoolId) {
        const queryKey = placementKeys.departmentsBySchool(schoolId)
        queryClient.setQueryData(queryKey, context.previousDepartments)
      }
    },
  })
}
