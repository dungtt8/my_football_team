'use client'

import { useState, useCallback } from 'react'
import { useApi } from './useApi'
import { SessionFormData } from '@/components/Attendance/SessionForm'

// ── Types ────────────────────────────────────────────────────────────────────

export interface AttendanceSession {
    id: string
    team_id: string
    created_by: string
    session_date: string
    check_in_deadline: string | null
    location: string | null
    session_type: 'training' | 'match'
    description: string | null
    status: 'active' | 'closed'
    closed_at: string | null
    created_at: string
    updated_at: string
}

export interface AttendanceRecord {
    id: string
    // snake_case (from backend)
    session_id?: string
    user_id?: string
    status: 'attended' | 'marked_absent' | 'present' | 'late' | 'absent' | 'pending'
    checked_in_at?: string | null
    marked_by?: string | null
    created_at?: string
    // joined from session
    session_date?: string
    location?: string
    session_type?: string
    // joined from user
    full_name?: string
    email?: string
    // camelCase aliases for backward compat
    createdAt?: string
    checkInTime?: string
    checkOutTime?: string
    duration?: number
    notes?: string
    userId?: string
    sessionId?: string
}

export interface LeaderboardEntry {
    rank: number
    // snake_case (from backend)
    user_id?: string
    full_name?: string
    total_points?: number
    month?: string
    // camelCase aliases for backward compat
    userId?: string
    userName?: string
    avatarUrl?: string
    points?: number
    streak?: number
    badges?: number
    totalPresent?: number
}

export interface Badge {
    id: string
    name: string
    description: string
    icon: string
    earnedDate: string
    isEarned: boolean
}

export interface UserStats {
    user_id: string
    month: string
    total_points: number
    rank: number
    attended: number
    absent: number
}

export interface AttendanceHistory {
    user_id: string
    month: string
    history: AttendanceRecord[]
}

export interface CheckInResult {
    id: string
    session_id: string
    user_id: string
    status: string
    checked_in_at: string
    points_awarded: number
}

export interface MarkAbsentResult {
    id: string
    session_id: string
    user_id: string
    status: string
    marked_by: string
    points_deducted: number
}

// ── Hook interface ────────────────────────────────────────────────────────────

export interface UseAttendanceReturn {
    createSession: (data: SessionFormData) => Promise<AttendanceSession>
    listSessions: (params?: Record<string, string | number>) => Promise<{ data: AttendanceSession[]; pagination: any }>
    getSession: (id: string) => Promise<{ session: AttendanceSession; records: AttendanceRecord[]; total_records: number }>
    closeSession: (id: string) => Promise<AttendanceSession>
    memberCheckIn: (sessionId: string) => Promise<CheckInResult>
    markAbsent: (sessionId: string, userId: string) => Promise<MarkAbsentResult>
    getLeaderboard: () => Promise<LeaderboardEntry[]>
    getHistoricalLeaderboard: (month: string) => Promise<LeaderboardEntry[]>
    getUserStats: (userId: string, month?: string) => Promise<UserStats>
    getAttendanceHistory: (month?: string) => Promise<AttendanceHistory>
    // Compatibility shims (redirect to real endpoints)
    listAttendance: (params?: Record<string, any>) => Promise<AttendanceRecord[]>
    getAttendanceDetail: (sessionId: string) => Promise<AttendanceRecord | undefined>
    loading: boolean
    error: Error | null
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useAttendance = (): UseAttendanceReturn => {
    const { request, loading, error } = useApi()
    const [localError, setLocalError] = useState<Error | null>(null)

    const createSession = useCallback(
        async (data: SessionFormData) => {
            try {
                setLocalError(null)
                return await request<AttendanceSession>('/attendance/sessions', 'POST', data)
            } catch (err) {
                const e = err instanceof Error ? err : new Error('Failed to create session')
                setLocalError(e); throw e
            }
        },
        [request]
    )

    const listSessions = useCallback(
        async (params?: Record<string, string | number>) => {
            try {
                setLocalError(null)
                const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
                return await request<{ data: AttendanceSession[]; pagination: any }>(`/attendance/sessions${qs}`, 'GET') || { data: [], pagination: {} }
            } catch (err) {
                setLocalError(err instanceof Error ? err : new Error('Failed to list sessions'))
                return { data: [], pagination: {} }
            }
        },
        [request]
    )

    const getSession = useCallback(
        async (id: string) => {
            try {
                setLocalError(null)
                return await request<{ session: AttendanceSession; records: AttendanceRecord[]; total_records: number }>(`/attendance/sessions/${id}`, 'GET')
            } catch (err) {
                const e = err instanceof Error ? err : new Error('Failed to get session')
                setLocalError(e); throw e
            }
        },
        [request]
    )

    const closeSession = useCallback(
        async (id: string) => {
            try {
                setLocalError(null)
                return await request<AttendanceSession>(`/attendance/sessions/${id}/close`, 'POST')
            } catch (err) {
                const e = err instanceof Error ? err : new Error('Failed to close session')
                setLocalError(e); throw e
            }
        },
        [request]
    )

    const memberCheckIn = useCallback(
        async (sessionId: string) => {
            try {
                setLocalError(null)
                return await request<CheckInResult>(`/attendance/sessions/${sessionId}/check-in`, 'POST')
            } catch (err) {
                const e = err instanceof Error ? err : new Error('Failed to check in')
                setLocalError(e); throw e
            }
        },
        [request]
    )

    const markAbsent = useCallback(
        async (sessionId: string, userId: string) => {
            try {
                setLocalError(null)
                return await request<MarkAbsentResult>(`/attendance/sessions/${sessionId}/mark-absent`, 'POST', { user_id: userId })
            } catch (err) {
                const e = err instanceof Error ? err : new Error('Failed to mark absent')
                setLocalError(e); throw e
            }
        },
        [request]
    )

    const getLeaderboard = useCallback(
        async () => {
            try {
                setLocalError(null)
                return await request<LeaderboardEntry[]>('/attendance/leaderboard', 'GET') || []
            } catch (err) {
                setLocalError(err instanceof Error ? err : new Error('Failed to fetch leaderboard'))
                return []
            }
        },
        [request]
    )

    const getHistoricalLeaderboard = useCallback(
        async (month: string) => {
            try {
                setLocalError(null)
                return await request<LeaderboardEntry[]>(`/attendance/leaderboard/${month}`, 'GET') || []
            } catch (err) {
                setLocalError(err instanceof Error ? err : new Error('Failed to fetch leaderboard'))
                return []
            }
        },
        [request]
    )

    const getUserStats = useCallback(
        async (userId: string, month?: string) => {
            try {
                setLocalError(null)
                const qs = month ? `?month=${month}` : ''
                return await request<UserStats>(`/attendance/stats/${userId}${qs}`, 'GET')
            } catch (err) {
                const e = err instanceof Error ? err : new Error('Failed to fetch user stats')
                setLocalError(e); throw e
            }
        },
        [request]
    )

    const getAttendanceHistory = useCallback(
        async (month?: string) => {
            try {
                setLocalError(null)
                const qs = month ? `?month=${month}` : ''
                return await request<AttendanceHistory>(`/attendance/history${qs}`, 'GET')
            } catch (err) {
                const e = err instanceof Error ? err : new Error('Failed to fetch attendance history')
                setLocalError(e); throw e
            }
        },
        [request]
    )

    return {
        createSession,
        listSessions,
        getSession,
        closeSession,
        memberCheckIn,
        markAbsent,
        getLeaderboard,
        getHistoricalLeaderboard,
        getUserStats,
        getAttendanceHistory,
        // Compat shims
        listAttendance: async (params?: Record<string, any>) => {
            try {
                const month = params?.month as string | undefined
                const history = await getAttendanceHistory(month)
                return history?.history || []
            } catch { return [] }
        },
        getAttendanceDetail: async (sessionId: string) => {
            try {
                const result = await getSession(sessionId)
                return result?.records?.[0]
            } catch { return undefined }
        },
        loading,
        error: error || localError,
    }
}
