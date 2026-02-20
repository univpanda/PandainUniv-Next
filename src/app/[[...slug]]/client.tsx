'use client'

import dynamic from 'next/dynamic'
import { StrictMode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../../contexts/AuthContext'
import { ToastProvider } from '../../contexts/ToastContext'
import { handleMutationError } from '../../lib/blockedUserHandler'

const App = dynamic(() => import('../../App'), { ssr: false })

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 10 * 60 * 1000, // 10 minutes - increased for better cache retention
      refetchOnWindowFocus: false,
      retry: 2, // Limit retries to prevent excessive requests
    },
    mutations: {
      // Global mutation error handler - check if user is blocked on RLS errors
      onError: (error: Error) => {
        handleMutationError(error)
      },
    },
  },
})

export function ClientOnly() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}
