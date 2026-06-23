'use client'

import { useState, useCallback } from 'react'

interface LoadingState {
  isLoading: boolean
  error: string | null
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
  withLoading: <T,>(promise: Promise<T>) => Promise<T>
}

/**
 * Custom hook to manage loading and error states consistently
 * Provides methods to handle async operations with loading and error tracking
 */
export const useLoadingState = (): LoadingState => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading)
  }, [])

  const setErrorMessage = useCallback((errorMsg: string | null) => {
    setError(errorMsg)
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
  }, [])

  const withLoading = useCallback(
    async <T,>(promise: Promise<T>): Promise<T> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await promise
        setIsLoading(false)
        return result
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unexpected error occurred'
        setError(errorMessage)
        setIsLoading(false)
        throw err
      }
    },
    []
  )

  return {
    isLoading,
    error,
    setLoading,
    setError: setErrorMessage,
    reset,
    withLoading,
  }
}
