'use client'

import { useState, useCallback } from 'react'
import { useApi } from './useApi'

export interface UserProfile {
    id: string
    email: string
    full_name: string
    phone?: string
}

export interface UseProfileReturn {
    profile: UserProfile | null
    loading: boolean
    error: Error | null
    updateProfile: (data: { full_name?: string; phone?: string }) => Promise<UserProfile>
    changePassword: (data: {
        current_password: string
        new_password: string
        new_password_confirm: string
    }) => Promise<{ message: string }>
}

export const useProfile = (): UseProfileReturn => {
    const { request, loading, error } = useApi()
    const [localError, setLocalError] = useState<Error | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)

    const updateProfile = useCallback(
        async (data: { full_name?: string; phone?: string }) => {
            try {
                setLocalError(null)
                const result = await request<UserProfile>('/profile', 'PUT', data)
                if (result) {
                    setProfile(result)
                }
                return result
            } catch (err) {
                const e = err instanceof Error ? err : new Error('Failed to update profile')
                setLocalError(e)
                throw e
            }
        },
        [request]
    )

    const changePassword = useCallback(
        async (data: {
            current_password: string
            new_password: string
            new_password_confirm: string
        }) => {
            try {
                setLocalError(null)
                return await request<{ message: string }>('/auth/password', 'PUT', data)
            } catch (err) {
                const e = err instanceof Error ? err : new Error('Failed to change password')
                setLocalError(e)
                throw e
            }
        },
        [request]
    )

    return {
        profile,
        loading,
        error: error || localError,
        updateProfile,
        changePassword,
    }
}
