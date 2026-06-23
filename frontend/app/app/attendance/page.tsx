'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAttendance, AttendanceRecord, LeaderboardEntry, GamificationProgress } from '@/hooks/useAttendance'
import { useToast } from '@/hooks/useToast'
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/constants'
import { CheckInCard } from '@/components/Attendance/CheckInCard'
import { AttendanceList } from '@/components/Attendance/AttendanceList'
import { AttendanceStatsCard } from '@/components/Attendance/AttendanceStatsCard'
import { LeaderboardTable } from '@/components/Attendance/LeaderboardTable'
import { PointsCard } from '@/components/Attendance/PointsCard'
import { LevelProgress } from '@/components/Attendance/LevelProgress'
import { BadgeDisplay } from '@/components/Attendance/BadgeDisplay'

export default function AttendancePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const {
    listAttendance,
    checkIn,
    checkOut,
    getUserStats,
    getLeaderboard,
    getGamificationProgress,
    loading,
  } = useAttendance()

  // State
  const [checkInStatus, setCheckInStatus] = useState<'not_checked_in' | 'checked_in' | 'checked_out'>(
    'not_checked_in'
  )
  const [checkedInTime, setCheckedInTime] = useState<Date | undefined>()
  const [currentStreak, setCurrentStreak] = useState(0)
  const [stats, setStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    attendancePercentage: 0,
    currentStreak: 0,
  })
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([])
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([])
  const [gamification, setGamification] = useState<GamificationProgress>({
    currentPoints: 0,
    currentLevel: 1,
    currentLevelName: 'Rookie',
    pointsToNextLevel: 100,
    progressPercent: 0,
    badges: [],
    recentActivity: [],
  })
  const [isCheckingIn, setIsCheckingIn] = useState(false)

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch recent records
        const records = await listAttendance({ limit: 5 })
        setRecentRecords(records || [])

        // Fetch user stats
        const userStats = await getUserStats()
        if (userStats) {
          setStats(userStats)
          setCurrentStreak(userStats.currentStreak)
          // Determine check-in status based on recent records
          if (records && records.length > 0) {
            const today = new Date()
            const todayRecord = records.find((r) => {
              const recordDate = new Date(r.createdAt)
              return (
                recordDate.getDate() === today.getDate() &&
                recordDate.getMonth() === today.getMonth() &&
                recordDate.getFullYear() === today.getFullYear()
              )
            })
            if (todayRecord) {
              setCheckInStatus(todayRecord.checkOutTime ? 'checked_out' : 'checked_in')
              setCheckedInTime(new Date(todayRecord.checkInTime))
            }
          }
        }

        // Fetch leaderboard
        const leaderboard = await getLeaderboard('week')
        setLeaderboardEntries(leaderboard || [])

        // Fetch gamification progress
        const gamif = await getGamificationProgress()
        if (gamif) {
          setGamification(gamif)
        }
      } catch (error) {
        console.error('Error loading attendance data:', error)
        toast('Failed to load attendance data', 'error')
      }
    }

    if (user) {
      loadData()
    }
  }, [user])

  const handleCheckIn = async () => {
    setIsCheckingIn(true)
    try {
      const result = await checkIn({ sessionId: 'current' })
      if (result) {
        setCheckInStatus('checked_in')
        setCheckedInTime(new Date())
        toast('Checked in successfully', 'success')
      }
    } catch (error) {
      console.error('Check-in error:', error)
      toast('Failed to check in', 'error')
    } finally {
      setIsCheckingIn(false)
    }
  }

  const handleCheckOut = async () => {
    setIsCheckingIn(true)
    try {
      if (recentRecords.length > 0) {
        const result = await checkOut(recentRecords[0].id)
        if (result) {
          setCheckInStatus('checked_out')
          toast('Checked out successfully', 'success')
        }
      }
    } catch (error) {
      console.error('Check-out error:', error)
      toast('Failed to check out', 'error')
    } finally {
      setIsCheckingIn(false)
    }
  }

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-5xl md:text-6xl font-serif font-light mb-2" style={{ color: '#0F0E0C' }}>
          Attendance & Leaderboard
        </h1>
        <p className="text-lg font-light" style={{ color: '#6B6660' }}>
          Track check-ins and compete with teammates
        </p>
      </div>

      {/* Check-In Section */}
      <div style={{ marginBottom: '32px' }}>
        <CheckInCard
          userStatus={checkInStatus}
          checkedInTime={checkedInTime}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          currentStreak={currentStreak}
          isLoading={isCheckingIn}
        />
      </div>

      {/* Stats Section */}
      <div style={{ marginBottom: '32px' }}>
        <h2
          style={{
            margin: '0 0 16px 0',
            fontSize: TYPOGRAPHY.sizes.sectionTitle,
            fontWeight: TYPOGRAPHY.weights.semibold,
            color: COLORS.black,
          }}
        >
          Your Statistics
        </h2>
        <AttendanceStatsCard
          totalPresent={stats.totalPresent}
          totalAbsent={stats.totalAbsent}
          totalLate={stats.totalLate}
          attendancePercentage={stats.attendancePercentage}
          isLoading={loading}
        />
      </div>

      {/* Three Column Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        {/* Left Column: Attendance List */}
        <div>
          <h3
            style={{
              margin: '0 0 12px 0',
              fontSize: TYPOGRAPHY.sizes.heading3,
              fontWeight: TYPOGRAPHY.weights.semibold,
              color: COLORS.black,
            }}
          >
            Recent Check-Ins
          </h3>
          <AttendanceList
            records={recentRecords}
            isLoading={loading}
            onRecordClick={(id) => router.push(`/app/attendance/records/${id}`)}
          />
          <button
            onClick={() => router.push('/app/attendance/history')}
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              backgroundColor: 'transparent',
              color: COLORS.black,
              border: `1px solid ${COLORS.lightGray}`,
              borderRadius: '4px',
              fontSize: TYPOGRAPHY.sizes.small,
              fontWeight: TYPOGRAPHY.weights.medium,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            View All History →
          </button>
        </div>

        {/* Center Column: Leaderboard */}
        <div>
          <LeaderboardTable
            entries={leaderboardEntries}
            currentUserId={user?.id || ''}
            isLoading={loading}
            period="week"
            onPeriodChange={async (period) => {
              const data = await getLeaderboard(period)
              setLeaderboardEntries(data || [])
            }}
          />
        </div>

        {/* Right Column: Gamification */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3
              style={{
                margin: '0 0 12px 0',
                fontSize: TYPOGRAPHY.sizes.heading3,
                fontWeight: TYPOGRAPHY.weights.semibold,
                color: COLORS.black,
              }}
            >
              Points & Level
            </h3>
            <PointsCard
              currentPoints={gamification.currentPoints}
              pointsToNextLevel={gamification.pointsToNextLevel}
              nextLevelName={gamification.currentLevelName}
              recentActivity={gamification.recentActivity}
              isLoading={loading}
            />
          </div>

          <div>
            <LevelProgress
              currentLevel={gamification.currentLevel}
              currentLevelName={gamification.currentLevelName}
              progressPercent={gamification.progressPercent}
              totalLevels={10}
              isLoading={loading}
            />
          </div>

          <div>
            <h3
              style={{
                margin: '0 0 12px 0',
                fontSize: TYPOGRAPHY.sizes.heading3,
                fontWeight: TYPOGRAPHY.weights.semibold,
                color: COLORS.black,
              }}
            >
              Badges
            </h3>
            <BadgeDisplay
              badges={gamification.badges}
              maxVisible={6}
              isLoading={loading}
            />
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div
        style={{
          display: 'flex',
          gap: SPACING.md,
          justifyContent: 'center',
        }}
      >
        <button
          onClick={() => router.push('/app/attendance/history')}
          style={{
            padding: '12px 20px',
            backgroundColor: COLORS.bone,
            color: COLORS.black,
            border: `1px solid ${COLORS.lightGray}`,
            borderRadius: '8px',
            fontSize: TYPOGRAPHY.sizes.small,
            fontWeight: TYPOGRAPHY.weights.medium,
            cursor: 'pointer',
          }}
        >
          Download Report
        </button>
        <button
          onClick={() => router.push('/app/menu')}
          style={{
            padding: '12px 20px',
            backgroundColor: COLORS.bone,
            color: COLORS.black,
            border: `1px solid ${COLORS.lightGray}`,
            borderRadius: '8px',
            fontSize: TYPOGRAPHY.sizes.small,
            fontWeight: TYPOGRAPHY.weights.medium,
            cursor: 'pointer',
          }}
        >
          Settings
        </button>
      </div>
    </div>
  )
}
