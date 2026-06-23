'use client'

import React from 'react'
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/constants'
import { LeaderboardEntry } from '@/hooks/useAttendance'

interface LeaderboardRowProps {
  rank: number
  user: {
    name: string
    avatarUrl?: string
    points: number
    streak: number
    badges: number
  }
  isCurrentUser?: boolean
  showBadges?: boolean
}

export const LeaderboardRow: React.FC<LeaderboardRowProps> = ({
  rank,
  user,
  isCurrentUser = false,
  showBadges = true,
}) => {
  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return '#FFD700'
      case 2:
        return '#C0C0C0'
      case 3:
        return '#CD7F32'
      default:
        return '#BDBDBD'
    }
  }

  const getRankBadgeLabel = (rank: number) => {
    switch (rank) {
      case 1:
        return '👑'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return rank
    }
  }

  return (
    <div
      style={{
        padding: '12px 16px',
        border: `1px solid ${COLORS.lightGray}`,
        borderRadius: '8px',
        backgroundColor: isCurrentUser ? '#FFFBF7' : COLORS.white,
        borderLeft: isCurrentUser ? `4px solid ${COLORS.black}` : 'none',
        paddingLeft: isCurrentUser ? '12px' : '16px',
        display: 'grid',
        gridTemplateColumns: '60px 1fr 80px 80px 100px',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
      }}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = isCurrentUser ? '#FFF9F5' : COLORS.bone
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = isCurrentUser ? '#FFFBF7' : COLORS.white
      }}
    >
      {/* Rank Badge */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: getRankBadgeColor(rank),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: rank <= 3 ? '20px' : TYPOGRAPHY.sizes.small,
            fontWeight: TYPOGRAPHY.weights.semibold,
            color: rank <= 3 ? COLORS.white : COLORS.black,
          }}
        >
          {getRankBadgeLabel(rank)}
        </div>
      </div>

      {/* User Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {user.avatarUrl && (
          <img
            src={user.avatarUrl}
            alt={user.name}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
        )}
        <div>
          <p
            style={{
              margin: 0,
              fontSize: TYPOGRAPHY.sizes.small,
              fontWeight: TYPOGRAPHY.weights.medium,
              color: COLORS.black,
            }}
          >
            {user.name}
          </p>
          {isCurrentUser && (
            <p style={{ margin: '2px 0 0 0', fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray }}>
              You
            </p>
          )}
        </div>
      </div>

      {/* Points */}
      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            margin: 0,
            fontSize: TYPOGRAPHY.sizes.heading3,
            fontWeight: TYPOGRAPHY.weights.semibold,
            color: COLORS.black,
          }}
        >
          {user.points}
        </p>
        <p style={{ margin: '2px 0 0 0', fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray }}>
          pts
        </p>
      </div>

      {/* Streak */}
      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            margin: 0,
            fontSize: TYPOGRAPHY.sizes.heading3,
            fontWeight: TYPOGRAPHY.weights.semibold,
            color: COLORS.black,
          }}
        >
          🔥 {user.streak}
        </p>
        <p style={{ margin: '2px 0 0 0', fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray }}>
          days
        </p>
      </div>

      {/* Badges */}
      {showBadges && (
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              margin: 0,
              fontSize: TYPOGRAPHY.sizes.heading3,
              fontWeight: TYPOGRAPHY.weights.semibold,
              color: COLORS.black,
            }}
          >
            🏆 {user.badges}
          </p>
          <p style={{ margin: '2px 0 0 0', fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray }}>
            badges
          </p>
        </div>
      )}
    </div>
  )
}
