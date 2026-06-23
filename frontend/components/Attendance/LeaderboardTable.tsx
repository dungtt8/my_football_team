'use client'

import React, { useState } from 'react'
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/constants'
import { LeaderboardEntry } from '@/hooks/useAttendance'
import { LeaderboardRow } from './LeaderboardRow'

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  currentUserId: string
  isLoading: boolean
  period?: 'week' | 'month' | 'all'
  onPeriodChange?: (period: 'week' | 'month' | 'all') => void
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  currentUserId,
  isLoading,
  period = 'week',
  onPeriodChange,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>(period)

  const handlePeriodChange = (newPeriod: 'week' | 'month' | 'all') => {
    setSelectedPeriod(newPeriod)
    onPeriodChange?.(newPeriod)
  }

  const periods: Array<{ value: 'week' | 'month' | 'all'; label: string }> = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ]

  if (isLoading) {
    return (
      <div>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: TYPOGRAPHY.sizes.sectionTitle, color: COLORS.black }}>
            Leaderboard
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              style={{
                height: '56px',
                backgroundColor: COLORS.bone,
                borderRadius: '8px',
                animation: 'pulse 2s infinite',
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header with Title and Period Selector */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: TYPOGRAPHY.sizes.sectionTitle,
            fontWeight: TYPOGRAPHY.weights.semibold,
            color: COLORS.black,
          }}
        >
          Leaderboard
        </h2>
      </div>

      {/* Period Tabs */}
      <div
        style={{
          display: 'flex',
          gap: SPACING.sm,
          marginBottom: '16px',
          borderBottom: `1px solid ${COLORS.lightGray}`,
          paddingBottom: '12px',
        }}
      >
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePeriodChange(p.value)}
            style={{
              padding: '8px 12px',
              backgroundColor: selectedPeriod === p.value ? COLORS.black : 'transparent',
              color: selectedPeriod === p.value ? COLORS.white : COLORS.gray,
              border: 'none',
              borderRadius: '4px',
              fontSize: TYPOGRAPHY.sizes.small,
              fontWeight:
                selectedPeriod === p.value ? TYPOGRAPHY.weights.semibold : TYPOGRAPHY.weights.regular,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Leaderboard Entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
        {entries.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '32px 16px',
              color: COLORS.gray,
            }}
          >
            <p style={{ margin: 0, fontSize: TYPOGRAPHY.sizes.body }}>No leaderboard data available</p>
          </div>
        ) : (
          entries.map((entry) => (
            <LeaderboardRow
              key={entry.userId}
              rank={entry.rank}
              user={{
                name: entry.userName,
                avatarUrl: entry.avatarUrl,
                points: entry.points,
                streak: entry.streak,
                badges: entry.badges,
              }}
              isCurrentUser={entry.userId === currentUserId}
              showBadges={true}
            />
          ))
        )}
      </div>
    </div>
  )
}
