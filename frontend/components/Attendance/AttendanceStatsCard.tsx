'use client'

import React from 'react'
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/constants'

interface AttendanceStatsCardProps {
  totalPresent: number
  totalAbsent: number
  totalLate: number
  attendancePercentage: number
  isLoading?: boolean
}

export const AttendanceStatsCard: React.FC<AttendanceStatsCardProps> = ({
  totalPresent,
  totalAbsent,
  totalLate,
  attendancePercentage,
  isLoading = false,
}) => {
  const StatBox = ({
    label,
    value,
    color,
  }: {
    label: string
    value: number | string
    color: string
  }) => (
    <div
      style={{
        padding: '12px',
        border: `1px solid ${COLORS.lightGray}`,
        borderRadius: '8px',
        backgroundColor: COLORS.bone,
        textAlign: 'center',
      }}
    >
      <p style={{ margin: 0, fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray }}>
        {label}
      </p>
      <p
        style={{
          margin: '8px 0 0 0',
          fontSize: TYPOGRAPHY.sizes.heading3,
          fontWeight: TYPOGRAPHY.weights.semibold,
          color,
        }}
      >
        {value}
      </p>
    </div>
  )

  if (isLoading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: SPACING.md,
        }}
      >
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            style={{
              height: '80px',
              backgroundColor: COLORS.bone,
              borderRadius: '8px',
              animation: 'pulse 2s infinite',
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: SPACING.md,
      }}
    >
      <StatBox label="Present" value={totalPresent} color="#4CAF50" />
      <StatBox label="Late" value={totalLate} color="#FFC107" />
      <StatBox label="Absent" value={totalAbsent} color="#F44336" />
      <StatBox label="Percentage" value={`${Math.round(attendancePercentage)}%`} color={COLORS.black} />

      {/* Attendance Rate Bar - spans full width */}
      <div
        style={{
          gridColumn: 'span 4',
          marginTop: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              flex: 1,
              height: '8px',
              backgroundColor: COLORS.lightGray,
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${attendancePercentage}%`,
                backgroundColor: COLORS.black,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span
            style={{
              fontSize: TYPOGRAPHY.sizes.small,
              fontWeight: TYPOGRAPHY.weights.medium,
              color: COLORS.gray,
              minWidth: '40px',
            }}
          >
            {Math.round(attendancePercentage)}%
          </span>
        </div>
      </div>
    </div>
  )
}
