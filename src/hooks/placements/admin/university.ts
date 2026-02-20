import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { placementKeys } from '../keys'
import type { Country, University } from '../types'

// Fetch all universities from pt_institute table with school count
export function useUniversities() {
  return useQuery({
    queryKey: placementKeys.universities(),
    queryFn: async (): Promise<University[]> => {
      const { data: universities, error: uniError } = await supabase
        .from('pt_institute')
        .select('id, official_name, english_name, url, country_id, us_news_2025_rank, updated_at')
        .is('parent_institution_id', null)
        .order('official_name', { ascending: true })

      if (uniError) throw uniError

      const { data: countries, error: countryError } = await supabase
        .from('pt_country')
        .select('id, name, code')

      if (countryError) throw countryError

      const countryMap = new Map(countries?.map((c) => [c.id, c]) || [])

      const { data: schools, error: schoolError } = await supabase
        .from('pt_school')
        .select('institution_id')

      if (schoolError) throw schoolError

      const schoolCountMap = new Map<string, number>()
      for (const s of schools || []) {
        schoolCountMap.set(s.institution_id, (schoolCountMap.get(s.institution_id) || 0) + 1)
      }

      return (universities || []).map((u) => ({
        id: u.id,
        university: u.english_name || u.official_name || u.id,
        url: u.url,
        country_id: u.country_id,
        country: countryMap.get(u.country_id) || null,
        us_news_2025_rank: u.us_news_2025_rank,
        updated_at: u.updated_at,
        school_count: schoolCountMap.get(u.id) || 0,
      }))
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

async function getCountryById(countryId: string | null): Promise<Country | null> {
  if (!countryId) return null
  const { data } = await supabase.from('pt_country').select('id, name, code').eq('id', countryId).single()
  return data || null
}

// Create a new university
export function useCreateUniversity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newUniversity: {
      university: string
      country_id?: string | null
      us_news_2025_rank?: number | null
      url?: string | null
    }): Promise<University> => {
      const { data, error } = await supabase
        .from('pt_institute')
        .insert({
          id: newUniversity.university.toLowerCase().replace(/\s+/g, '-'),
          official_name: newUniversity.university,
          english_name: newUniversity.university,
          lowercase_name: newUniversity.university.toLowerCase(),
          country_id: newUniversity.country_id || null,
          us_news_2025_rank: newUniversity.us_news_2025_rank,
          url: newUniversity.url || '',
          type: 'university',
        })
        .select('id, official_name, english_name, url, country_id, us_news_2025_rank, updated_at')
        .single()

      if (error) throw error

      const country = await getCountryById(data.country_id)

      return {
        id: data.id,
        university: data.english_name || data.official_name || data.id,
        url: data.url,
        country_id: data.country_id,
        country,
        us_news_2025_rank: data.us_news_2025_rank,
        updated_at: data.updated_at,
        school_count: 0,
      }
    },
    onMutate: async (newUniversity) => {
      await queryClient.cancelQueries({ queryKey: placementKeys.universities() })

      const previousUniversities = queryClient.getQueryData<University[]>(placementKeys.universities())
      const optimisticId = `temp-${Date.now()}`

      if (previousUniversities) {
        const optimisticUniversity: University = {
          id: optimisticId,
          university: newUniversity.university.toLowerCase(),
          url: newUniversity.url || null,
          country_id: newUniversity.country_id || null,
          country: null,
          us_news_2025_rank: newUniversity.us_news_2025_rank || null,
          updated_at: new Date().toISOString(),
        }
        queryClient.setQueryData<University[]>(placementKeys.universities(), [
          optimisticUniversity,
          ...previousUniversities,
        ])
      }

      return { previousUniversities, optimisticId }
    },
    onSuccess: (createdUniversity, _, context) => {
      if (!context?.optimisticId) return
      queryClient.setQueryData<University[]>(placementKeys.universities(), (current) => {
        if (!current) return current
        return current.map((university) =>
          university.id === context.optimisticId ? createdUniversity : university
        )
      })
    },
    onError: (_, __, context) => {
      if (context?.previousUniversities) {
        queryClient.setQueryData(placementKeys.universities(), context.previousUniversities)
      }
    },
  })
}

// Delete a university
export function useDeleteUniversity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (universityId: string): Promise<void> => {
      const { error } = await supabase.from('pt_institute').delete().eq('id', universityId)
      if (error) throw error
    },
    onSuccess: (_, universityId) => {
      queryClient.setQueryData<University[]>(placementKeys.universities(), (current) => {
        if (!current) return current
        return current.filter((university) => university.id !== universityId)
      })
    },
  })
}

// Update a university
export function useUpdateUniversity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: {
      id: string
      university: string
      country_id: string | null
      us_news_2025_rank: number | null
    }): Promise<University> => {
      const { data, error } = await supabase
        .from('pt_institute')
        .update({
          official_name: updates.university,
          english_name: updates.university,
          lowercase_name: updates.university.toLowerCase(),
          country_id: updates.country_id || null,
          us_news_2025_rank: updates.us_news_2025_rank,
        })
        .eq('id', updates.id)
        .select('id, official_name, english_name, url, country_id, us_news_2025_rank, updated_at')
        .single()

      if (error) throw error

      const country = await getCountryById(data.country_id)

      return {
        id: data.id,
        university: data.english_name || data.official_name || data.id,
        url: data.url,
        country_id: data.country_id,
        country,
        us_news_2025_rank: data.us_news_2025_rank,
        updated_at: data.updated_at,
        school_count: 0,
      }
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: placementKeys.universities() })
      const previousUniversities = queryClient.getQueryData<University[]>(placementKeys.universities())

      if (previousUniversities) {
        queryClient.setQueryData<University[]>(placementKeys.universities(), (current) => {
          if (!current) return current
          return current.map((uni) => {
            if (uni.id !== updates.id) return uni
            const keepCountry = updates.country_id === uni.country_id
            return {
              ...uni,
              university: updates.university.toLowerCase(),
              country_id: updates.country_id,
              us_news_2025_rank: updates.us_news_2025_rank,
              country: keepCountry ? uni.country : null,
            }
          })
        })
      }

      return { previousUniversities }
    },
    onSuccess: (updatedUniversity) => {
      queryClient.setQueryData<University[]>(placementKeys.universities(), (current) => {
        if (!current) return current
        return current.map((uni) => (uni.id === updatedUniversity.id ? updatedUniversity : uni))
      })
    },
    onError: (_, __, context) => {
      if (context?.previousUniversities) {
        queryClient.setQueryData(placementKeys.universities(), context.previousUniversities)
      }
    },
  })
}
