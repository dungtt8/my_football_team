'use client'

import React, { useState } from 'react'
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/constants'

interface CheckInCardProps {
    userStatus: 'not_checked_in' | 'checked_in' | 'checked_out'
    checkedInTime?: Date
    onCheckIn: () => void
    onCheckOut: () => void
    currentStreak?: number
    isLoading?: boolean
    checkInDeadline?: string | null
}

export const CheckInCard: React.FC<CheckInCardProps> = ({
    userStatus,
    checkedInTime,
    onCheckIn,
    onCheckOut,
    currentStreak = 0,
    isLoading = false,
    checkInDeadline,
}) => {
    // Compute "now" once on mount rather than inline during render, so the
    // server-rendered markup and the client's first render agree (avoiding a
    // hydration mismatch) instead of both calling `new Date()` at slightly
    // different times / environments.
    const [now] = useState(() => new Date())
    const isPastDeadline = checkInDeadline ? now > new Date(checkInDeadline) : false

    const formatDeadline = (dt: string) =>
        new Date(dt).toLocaleString('vi-VN', {
            weekday: 'short',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    const statusColors = {
        not_checked_in: COLORS.paleRed,
        checked_in: COLORS.paleGreen,
        checked_out: '#F4F7FB',
    }

    const statusIndicatorColors = {
        not_checked_in: '#F04438',
        checked_in: '#12B76A',
        checked_out: '#7A8699',
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
                        {now.toLocaleDateString('vi-VN', { weekday: 'long', month: 'long', day: 'numeric' })}
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
                    {formatTime(now)}
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
                disabled={isLoading || (userStatus === 'not_checked_in' && isPastDeadline)}
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor:
                        userStatus === 'not_checked_in' && isPastDeadline ? COLORS.lightGray : COLORS.black,
                    color: COLORS.white,
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: TYPOGRAPHY.sizes.button,
                    fontWeight: TYPOGRAPHY.weights.semibold,
                    cursor:
                        isLoading || (userStatus === 'not_checked_in' && isPastDeadline)
                            ? 'not-allowed'
                            : 'pointer',
                    opacity: isLoading ? 0.7 : 1,
                    marginBottom: checkInDeadline ? '8px' : '16px',
                }}
            >
                {isLoading
                    ? 'Đang xử lý...'
                    : userStatus === 'not_checked_in' && isPastDeadline
                        ? 'Đã hết hạn điểm danh'
                        : userStatus === 'not_checked_in'
                            ? 'Điểm danh'
                            : 'Check Out'}
            </button>

            {/* Deadline badge */}
            {checkInDeadline && userStatus === 'not_checked_in' && (
                <p
                    style={{
                        margin: '0 0 16px 0',
                        textAlign: 'center',
                        fontSize: TYPOGRAPHY.sizes.caption,
                        color: isPastDeadline ? '#F04438' : COLORS.gray,
                    }}
                >
                    {isPastDeadline ? '⛔ Hết hạn: ' : '⏰ Hạn chót: '}
                    {formatDeadline(checkInDeadline)}
                </p>
            )}

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
