'use client'

import React from 'react'
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/constants'

interface CheckInCardProps {
  userStatus: 'not_checked_in' | 'checked_in' | 'checked_out'
  checkedInTime?: Date
  onCheckIn: () => void
  onCheckOut: () => void
  currentStreak?: number
  isLoading?: boolean
}

export const CheckInCard: React.FC<CheckInCardProps> = ({
  userStatus,
  checkedInTime,
  onCheckIn,
  onCheckOut,
  currentStreak = 0,
  isLoading = false,
}) => {
  const statusColors = {
    not_checked_in: COLORS.paleRed,
    checked_in: COLORS.paleGreen,
    checked_out: '#F0F0F0',
  }

  const statusIndicatorColors = {
    not_checked_in: '#F44336',
    checked_in: '#4CAF50',
    checked_out: '#999999',
  }

  const formatTime = (date?: Date) => {
    if (!date) return '--:--'
    return new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: TYPOGRAPHY.sizes.heading3,
              fontWeight: TYPOGRAPHY.weights.semibold,
              color: COLORS.black,
            }}
          >
            Today's Check-In
          </h3>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: TYPOGRAPHY.sizes.caption,
              color: COLORS.gray,
            }}
          >
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: statusIndicatorColors[userStatus],
          }}
        />
      </div>

      {/* Current Time */}
      <div
        style={{
          textAlign: 'center',
          paddingBottom: '16px',
          borderBottom: `1px solid ${COLORS.lightGray}`,
          marginBottom: '20px',
        }}
      >
        <p style={{ margin: 0, fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray }}>
          Current Time
        </p>
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '24px',
            fontWeight: TYPOGRAPHY.weights.semibold,
            color: COLORS.black,
          }}
        >
          {formatTime(new Date())}
        </p>
      </div>

      {/* Status Info */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '20px',
          padding: '12px',
          backgroundColor: statusColors[userStatus],
          borderRadius: '8px',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: TYPOGRAPHY.sizes.small,
            fontWeight: TYPOGRAPHY.weights.medium,
            color: COLORS.black,
            textTransform: 'capitalize',
          }}
        >
          Status: {userStatus === 'not_checked_in' ? 'Not Checked In' : userStatus === 'checked_in' ? 'Checked In' : 'Checked Out'}
        </p>
        {checkedInTime && userStatus !== 'not_checked_in' && (
          <p style={{ margin: '4px 0 0 0', fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray }}>
            at {formatTime(checkedInTime)}
          </p>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={userStatus === 'not_checked_in' ? onCheckIn : onCheckOut}
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: COLORS.black,
          color: COLORS.white,
          border: 'none',
          borderRadius: '12px',
          fontSize: TYPOGRAPHY.sizes.button,
          fontWeight: TYPOGRAPHY.weights.semibold,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
          marginBottom: '16px',
        }}
      >
        {isLoading ? 'Processing...' : userStatus === 'not_checked_in' ? 'Check In' : 'Check Out'}
      </button>

      {/* Streak Display */}
      {currentStreak > 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '12px',
            backgroundColor: COLORS.paleYellow,
            borderRadius: '8px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: TYPOGRAPHY.sizes.small,
              fontWeight: TYPOGRAPHY.weights.medium,
              color: COLORS.black,
            }}
          >
            🔥 {currentStreak} Day Streak
          </p>
        </div>
      )}
    </div>
  )
}
