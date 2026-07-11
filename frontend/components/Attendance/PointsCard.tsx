'use client'

import React from 'react'
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/constants'

interface PointsCardProps {
  currentPoints: number
  pointsToNextLevel: number
  nextLevelName: string
  recentActivity: { action: string; points: number; date: string }[]
  isLoading?: boolean
}

export const PointsCard: React.FC<PointsCardProps> = ({
  currentPoints,
  pointsToNextLevel,
  nextLevelName,
  recentActivity,
  isLoading = false,
}) => {
  const progressPercent = Math.min(
    100,
    Math.max(0, ((currentPoints % 100) / 100) * 100)
  )

  if (isLoading) {
    return (
      <div
        style={{
          border: `1px solid ${COLORS.lightGray}`,
          borderRadius: '12px',
          padding: '20px',
          backgroundColor: COLORS.white,
          animation: 'pulse 2s infinite',
          height: '280px',
        }}
      />
    )
  }

  return (
    <div
      style={{
        border: `1px solid ${COLORS.lightGray}`,
        borderRadius: '12px',
        padding: '20px',
        backgroundColor: COLORS.white,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Header */}
      <p
        style={{
          margin: 0,
          fontSize: TYPOGRAPHY.sizes.caption,
          color: COLORS.gray,
          marginBottom: '8px',
        }}
      >
        Points
      </p>

      {/* Large Points Display */}
      <p
        style={{
          margin: 0,
          fontSize: '32px',
          fontWeight: TYPOGRAPHY.weights.semibold,
          color: COLORS.black,
          marginBottom: '16px',
        }}
      >
        {currentPoints}
      </p>

      {/* Progress Bar */}
      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            height: '8px',
            backgroundColor: COLORS.lightGray,
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              backgroundColor: COLORS.black,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <p
          style={{
            margin: 0,
            fontSize: TYPOGRAPHY.sizes.caption,
            color: COLORS.gray,
          }}
        >
          {pointsToNextLevel} points to next level ({nextLevelName})
        </p>
      </div>

      {/* Recent Activity */}
      <div
        style={{
          borderTop: `1px solid ${COLORS.lightGray}`,
          paddingTop: '12px',
        }}
      >
        <p
          style={{
            margin: '0 0 8px 0',
            fontSize: TYPOGRAPHY.sizes.caption,
            color: COLORS.gray,
            fontWeight: TYPOGRAPHY.weights.medium,
          }}
        >
          Recent Activity
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                  fontSize: TYPOGRAPHY.sizes.small,
                }}
              >
                <span style={{ color: COLORS.gray }}>{activity.action}</span>
                <span
                  style={{
                    fontWeight: TYPOGRAPHY.weights.medium,
                    color: activity.points > 0 ? '#12B76A' : '#F04438',
                  }}
                >
                  {activity.points > 0 ? '+' : ''}{activity.points} pts
                </span>
              </div>
            ))
          ) : (
            <p style={{ margin: 0, fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray }}>
              No recent activity
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
