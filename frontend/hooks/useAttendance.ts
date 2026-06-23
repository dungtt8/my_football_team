'use client'

import { useState, useCallback } from 'react'
import { useApi } from './useApi'

// Types
export interface AttendanceRecord {
  id: string
  userId: string
  sessionId: string
  checkInTime: string
  checkOutTime?: string
  duration?: number
  status: 'present' | 'late' | 'absent' | 'pending'
  location?: string
  notes?: string
  createdAt: string
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  userName: string
  avatarUrl?: string
  points: number
  streak: number
  badges: number
  totalPresent: number
}

export interface UserStats {
  totalPresent: number
  totalAbsent: number
  totalLate: number
  attendancePercentage: number
  currentStreak: number
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  earnedDate: string
  isEarned: boolean
}

export interface GamificationProgress {
  currentPoints: number
  currentLevel: number
  currentLevelName: string
  pointsToNextLevel: number
  progressPercent: number
  badges: Badge[]
  recentActivity: { action: string; points: number; date: string }[]
}

export interface Streak {
  userId: string
  currentStreak: number
  maxStreak: number
  lastCheckInDate: string
}

export interface UseAttendanceReturn {
  listAttendance: (params?: Record<string, any>) => Promise<AttendanceRecord[]>
  getAttendanceDetail: (id: string) => Promise<AttendanceRecord>
  checkIn: (data: any) => Promise<AttendanceRecord>
  checkOut: (id: string) => Promise<AttendanceRecord>
  getLeaderboard: (period?: string) => Promise<LeaderboardEntry[]>
  getUserStats: (userId?: string, period?: string) => Promise<UserStats>
  getStreaks: () => Promise<Streak[]>
  getGamificationProgress: () => Promise<GamificationProgress>
  claimReward: (rewardId: string) => Promise<GamificationProgress>
  getCheckInQRCode: () => Promise<{ qrCode: string; sessionId: string }>
  submitManualCheckIn: (notes?: string) => Promise<AttendanceRecord>
  loading: boolean
  error: Error | null
}

export const useAttendance = (): UseAttendanceReturn => {
  const { request, loading, error } = useApi()
  const [localError, setLocalError] = useState<Error | null>(null)

  const listAttendance = useCallback(
    async (params?: Record<string, any>) => {
      try {
        setLocalError(null)
        const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
        const data = await request<AttendanceRecord[]>(`/attendance${queryString}`, 'GET')
        return data || []
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch attendance records')
        setLocalError(error)
        console.error('Error listing attendance:', error)
        return []
      }
    },
    [request]
  )

  const getAttendanceDetail = useCallback(
    async (id: string) => {
      try {
        setLocalError(null)
        const data = await request<AttendanceRecord>(`/attendance/${id}`, 'GET')
        return data
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch attendance detail')
        setLocalError(error)
        console.error('Error fetching attendance detail:', error)
        throw error
      }
    },
    [request]
  )

  const checkIn = useCallback(
    async (data: any) => {
      try {
        setLocalError(null)
        const response = await request<AttendanceRecord>('/attendance/checkin', 'POST', data)
        return response
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to check in')
        setLocalError(error)
        console.error('Error checking in:', error)
        throw error
      }
    },
    [request]
  )

  const checkOut = useCallback(
    async (id: string) => {
      try {
        setLocalError(null)
        const response = await request<AttendanceRecord>(
          `/attendance/${id}/checkout`,
          'POST'
        )
        return response
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to check out')
        setLocalError(error)
        console.error('Error checking out:', error)
        throw error
      }
    },
    [request]
  )

  const getLeaderboard = useCallback(
    async (period?: string) => {
      try {
        setLocalError(null)
        const queryString = period ? `?period=${period}` : ''
        const data = await request<LeaderboardEntry[]>(
          `/attendance/leaderboard${queryString}`,
          'GET'
        )
        return data || []
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch leaderboard')
        setLocalError(error)
        console.error('Error fetching leaderboard:', error)
        return []
      }
    },
    [request]
  )

  const getUserStats = useCallback(
    async (userId?: string, period?: string) => {
      try {
        setLocalError(null)
        const params = new URLSearchParams()
        if (userId) params.append('userId', userId)
        if (period) params.append('period', period)
        const queryString = params.toString() ? `?${params.toString()}` : ''
        const data = await request<UserStats>(`/attendance/stats${queryString}`, 'GET')
        return data || { totalPresent: 0, totalAbsent: 0, totalLate: 0, attendancePercentage: 0, currentStreak: 0 }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch user stats')
        setLocalError(error)
        console.error('Error fetching user stats:', error)
        return { totalPresent: 0, totalAbsent: 0, totalLate: 0, attendancePercentage: 0, currentStreak: 0 }
      }
    },
    [request]
  )

  const getStreaks = useCallback(
    async () => {
      try {
        setLocalError(null)
        const data = await request<Streak[]>('/attendance/streaks', 'GET')
        return data || []
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch streaks')
        setLocalError(error)
        console.error('Error fetching streaks:', error)
        return []
      }
    },
    [request]
  )

  const getGamificationProgress = useCallback(
    async () => {
      try {
        setLocalError(null)
        const data = await request<GamificationProgress>('/attendance/gamification', 'GET')
        return data
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch gamification progress')
        setLocalError(error)
        console.error('Error fetching gamification progress:', error)
        throw error
      }
    },
    [request]
  )

  const claimReward = useCallback(
    async (rewardId: string) => {
      try {
        setLocalError(null)
        const response = await request<GamificationProgress>(
          '/attendance/rewards/claim',
          'POST',
          { rewardId }
        )
        return response
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to claim reward')
        setLocalError(error)
        console.error('Error claiming reward:', error)
        throw error
      }
    },
    [request]
  )

  const getCheckInQRCode = useCallback(
    async () => {
      try {
        setLocalError(null)
        const data = await request<{ qrCode: string; sessionId: string }>(
          '/attendance/qrcode',
          'GET'
        )
        return data
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch QR code')
        setLocalError(error)
        console.error('Error fetching QR code:', error)
        throw error
      }
    },
    [request]
  )

  const submitManualCheckIn = useCallback(
    async (notes?: string) => {
      try {
        setLocalError(null)
        const response = await request<AttendanceRecord>(
          '/attendance/checkin/manual',
          'POST',
          { notes }
        )
        return response
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to submit manual check-in')
        setLocalError(error)
        console.error('Error submitting manual check-in:', error)
        throw error
      }
    },
    [request]
  )

  return {
    listAttendance,
    getAttendanceDetail,
    checkIn,
    checkOut,
    getLeaderboard,
    getUserStats,
    getStreaks,
    getGamificationProgress,
    claimReward,
    getCheckInQRCode,
    submitManualCheckIn,
    loading,
    error: error || localError,
  }
}
