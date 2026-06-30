'use client'

import { useState, useCallback } from 'react'
import { useApi } from './useApi'
import { SessionFormData } from '@/components/Attendance/SessionForm'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AttendanceSession {
    id: string
    team_id: string
    created_by: string | null
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

/** One row per (session × user) — the Yes/No response */
export interface AttendanceCheckin {
    id: string
    session_id: string
    user_id: string
    team_id: string
    response: 'yes' | 'no' | null
    responded_at: string | null
    // joined
    full_name?: string
    email?: string
    // when joined with session
    session_date?: string
    location?: string
    session_type?: string
    session_status?: string
    check_in_deadline?: string | null
    description?: string | null
    created_at?: string | null
    createdAt?: string | null
    checked_in_at?: string | null
    checkInTime?: string | null
    checkOutTime?: string | null
    duration?: number
    notes?: string | null
    status?: string
}

/** Kept for backward compat where AttendanceRecord is referenced */
export type AttendanceRecord = AttendanceCheckin

export interface SessionStats {
    total: number
    yes: number
    no: number
    pending: number
}

export interface Badge {
    id: string
    name: string
    icon?: string
    description?: string
    isEarned?: boolean
    earnedDate?: string | null
}

export interface LeaderboardEntry {
    rank: number
    user_id?: string
    full_name?: string
    total_points?: number
    month?: string
    // camelCase aliases
    userId?: string
    userName?: string
    points?: number
    avatarUrl?: string
    streak?: number
    badges?: number
}

export interface UserStats {
    user_id: string
    month: string
    total_points: number
    rank: number
    attended?: number
    absent?: number
    total?: number
}

export interface AttendanceHistory {
    user_id: string
    month: string
    history: AttendanceCheckin[]
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useAttendance = () => {
    const { request, loading, error } = useApi()
    const [localError, setLocalError] = useState<Error | null>(null)

    // ── Sessions ────────────────────────────────────────────────────────────

    const createSession = useCallback(async (data: SessionFormData) => {
        try {
            setLocalError(null)
            return await request<AttendanceSession>('/attendance/sessions', 'POST', data)
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Failed to create session')
            setLocalError(e); throw e
        }
    }, [request])

    // Alias: createManualSession now points to the same endpoint
    const createManualSession = createSession

    const listSessions = useCallback(async (params?: Record<string, string | number>) => {
        try {
            setLocalError(null)
            const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
            return await request<{ data: AttendanceSession[]; pagination: any }>(`/attendance/sessions${qs}`, 'GET') || { data: [], pagination: {} }
        } catch (err) {
            setLocalError(err instanceof Error ? err : new Error('Failed to list sessions'))
            return { data: [], pagination: {} }
        }
    }, [request])

    const getSession = useCallback(async (id: string) => {
        try {
            setLocalError(null)
            return await request<{ session: AttendanceSession; records: AttendanceCheckin[]; stats: SessionStats; total_records: number }>(`/attendance/sessions/${id}`, 'GET')
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Failed to get session')
            setLocalError(e); throw e
        }
    }, [request])

    const closeSession = useCallback(async (id: string) => {
        try {
            setLocalError(null)
            return await request<AttendanceSession>(`/attendance/sessions/${id}/close`, 'POST')
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Failed to close session')
            setLocalError(e); throw e
        }
    }, [request])

    // ── Checkin responses ───────────────────────────────────────────────────

    const getActiveCheckin = useCallback(async () => {
        try {
            setLocalError(null)
            return await request<{ check_in: AttendanceCheckin | null }>('/attendance/checkin/active', 'GET')
        } catch (err) {
            setLocalError(err instanceof Error ? err : new Error('Failed to get active checkin'))
            return { check_in: null }
        }
    }, [request])

    const respondToCheckin = useCallback(async (checkinId: string, response: 'yes' | 'no') => {
        try {
            setLocalError(null)
            return await request<{ success: boolean; check_in: AttendanceCheckin }>(
                `/attendance/checkin/${checkinId}/respond`, 'POST', { response }
            )
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Failed to respond')
            setLocalError(e); throw e
        }
    }, [request])

    // ── Leaderboard & stats ─────────────────────────────────────────────────

    const getLeaderboard = useCallback(async () => {
        try {
            setLocalError(null)
            const res = await request<{ month: string; leaderboard: LeaderboardEntry[] }>('/attendance/leaderboard', 'GET')
            return res?.leaderboard || []
        } catch (err) {
            setLocalError(err instanceof Error ? err : new Error('Failed to fetch leaderboard'))
            return []
        }
    }, [request])

    const getHistoricalLeaderboard = useCallback(async (month: string) => {
        try {
            setLocalError(null)
            const res = await request<{ month: string; leaderboard: LeaderboardEntry[] }>(`/attendance/leaderboard/${month}`, 'GET')
            return res?.leaderboard || []
        } catch (err) {
            setLocalError(err instanceof Error ? err : new Error('Failed to fetch leaderboard'))
            return []
        }
    }, [request])

    const getUserStats = useCallback(async (userId: string, month?: string) => {
        try {
            setLocalError(null)
            const qs = month ? `?month=${month}` : ''
            return await request<UserStats>(`/attendance/stats/${userId}${qs}`, 'GET')
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Failed to fetch user stats')
            setLocalError(e); throw e
        }
    }, [request])

    const getAttendanceHistory = useCallback(async (month?: string) => {
        try {
            setLocalError(null)
            const qs = month ? `?month=${month}` : ''
            return await request<AttendanceHistory>(`/attendance/history${qs}`, 'GET')
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Failed to fetch attendance history')
            setLocalError(e); throw e
        }
    }, [request])

    // ── Compat shims ────────────────────────────────────────────────────────

    const listAttendance = useCallback(async (params?: Record<string, any>) => {
        try {
            const month = params?.month as string | undefined
            const history = await getAttendanceHistory(month)
            return history?.history || []
        } catch { return [] }
    }, [getAttendanceHistory])

    const getAttendanceDetail = useCallback(async (sessionId: string) => {
        try {
            const result = await getSession(sessionId)
            return result?.records?.[0]
        } catch { return undefined }
    }, [getSession])

    // Deprecated — no-op, kept so old call sites don't crash at compile time
    const memberCheckIn = useCallback(async (_sessionId: string) => {
        throw new Error('memberCheckIn removed — use respondToCheckin instead')
    }, [])

    const markAbsent = useCallback(async (_sessionId: string, _userId: string) => {
        throw new Error('markAbsent removed — attendance is now Yes/No based')
    }, [])

    return {
        createSession,
        createManualSession,
        listSessions,
        getSession,
        closeSession,
        getActiveCheckin,
        respondToCheckin,
        getLeaderboard,
        getHistoricalLeaderboard,
        getUserStats,
        getAttendanceHistory,
        listAttendance,
        getAttendanceDetail,
        memberCheckIn,
        markAbsent,
        loading,
        error: error || localError,
    }
}
