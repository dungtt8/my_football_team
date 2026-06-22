'use client'

import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { useAuth } from './useAuth'

interface UseApiOptions {
  onError?: (error: Error) => void
  onSuccess?: (data: any) => void
}

export const useApi = () => {
  const { isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const request = useCallback(
    async <T,>(
      endpoint: string,
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
      body?: any,
      options?: UseApiOptions
    ) => {
      if (!isAuthenticated) {
        const err = new Error('Not authenticated')
        setError(err)
        options?.onError?.(err)
        throw err
      }

      setLoading(true)
      setError(null)

      try {
        let response

        switch (method) {
          case 'GET':
            response = await apiClient.get<T>(endpoint)
            break
          case 'POST':
            response = await apiClient.post<T>(endpoint, body)
            break
          case 'PUT':
            response = await apiClient.put<T>(endpoint, body)
            break
          case 'PATCH':
            response = await apiClient.patch<T>(endpoint, body)
            break
          case 'DELETE':
            response = await apiClient.delete<T>(endpoint)
            break
        }

        if (response.error) {
          const err = new Error(response.error)
          setError(err)
          options?.onError?.(err)
          throw err
        }

        options?.onSuccess?.(response.data)
        return response.data as T
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        options?.onError?.(error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [isAuthenticated]
  )

  return {
    request,
    loading,
    error,
  }
}
