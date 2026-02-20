import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { placementKeys } from '../keys'
import type { Country } from '../types'

// Fetch all countries from pt_country table with university count
export function useCountries() {
  return useQuery({
    queryKey: placementKeys.countries(),
    queryFn: async (): Promise<Country[]> => {
      // Fetch countries
      const { data: countries, error: countryError } = await supabase
        .from('pt_country')
        .select('id, name, code')
        .order('name', { ascending: true })

      if (countryError) throw countryError

      // Fetch university counts per country from pt_institute (the actual table)
      const { data: counts, error: countError } = await supabase
        .from('pt_institute')
        .select('country_id')
        .is('parent_institution_id', null)

      if (countError) throw countError

      // Count universities per country
      const countMap = new Map<string, number>()
      for (const row of counts || []) {
        countMap.set(row.country_id, (countMap.get(row.country_id) || 0) + 1)
      }

      return (countries || []).map((c: { id: string; name: string; code: string }) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        university_count: countMap.get(c.id) || 0,
      }))
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create a new country
export function useCreateCountry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newCountry: { name: string; code: string }): Promise<Country> => {
      const { data, error } = await supabase.from('pt_country').insert(newCountry).select().single()

      if (error) throw error
      return data
    },
    onMutate: async (newCountry) => {
      await queryClient.cancelQueries({ queryKey: placementKeys.countries() })

      const previousCountries = queryClient.getQueryData<Country[]>(placementKeys.countries())
      const optimisticId = `temp-${Date.now()}`

      if (previousCountries) {
        const optimisticCountry: Country = {
          id: optimisticId,
          name: newCountry.name.toLowerCase(),
          code: newCountry.code.toUpperCase(),
        }
        queryClient.setQueryData<Country[]>(placementKeys.countries(), [
          optimisticCountry,
          ...previousCountries,
        ])
      }

      return { previousCountries, optimisticId }
    },
    onSuccess: (createdCountry, _, context) => {
      if (!context?.optimisticId) return
      queryClient.setQueryData<Country[]>(placementKeys.countries(), (current) => {
        if (!current) return current
        return current.map((country) =>
          country.id === context.optimisticId ? createdCountry : country
        )
      })
    },
    onError: (_, __, context) => {
      if (context?.previousCountries) {
        queryClient.setQueryData(placementKeys.countries(), context.previousCountries)
      }
    },
  })
}

// Delete a country
export function useDeleteCountry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (countryId: string): Promise<void> => {
      const { error } = await supabase.from('pt_country').delete().eq('id', countryId)
      if (error) throw error
    },
    onSuccess: (_, countryId) => {
      queryClient.setQueryData<Country[]>(placementKeys.countries(), (current) => {
        if (!current) return current
        return current.filter((country) => country.id !== countryId)
      })
    },
  })
}

// Update a country
export function useUpdateCountry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, name, code }: { id: string; name: string; code: string }): Promise<Country> => {
      const { data, error } = await supabase
        .from('pt_country')
        .update({ name, code })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onMutate: async ({ id, name, code }) => {
      await queryClient.cancelQueries({ queryKey: placementKeys.countries() })
      const previousCountries = queryClient.getQueryData<Country[]>(placementKeys.countries())

      if (previousCountries) {
        queryClient.setQueryData<Country[]>(placementKeys.countries(), (current) => {
          if (!current) return current
          return current.map((country) =>
            country.id === id
              ? { ...country, name: name.toLowerCase(), code: code.toUpperCase() }
              : country
          )
        })
      }

      return { previousCountries }
    },
    onError: (_, __, context) => {
      if (context?.previousCountries) {
        queryClient.setQueryData(placementKeys.countries(), context.previousCountries)
      }
    },
  })
}
