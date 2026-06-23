'use client'

import React from 'react'
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/constants'
import { AttendanceRecord } from '@/hooks/useAttendance'

interface AttendanceListProps {
  records: AttendanceRecord[]
  isLoading: boolean
  onRecordClick?: (id: string) => void
  emptyMessage?: string
}

export const AttendanceList: React.FC<AttendanceListProps> = ({
  records,
  isLoading,
  onRecordClick,
  emptyMessage = 'No attendance records found',
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return '#4CAF50'
      case 'late':
        return '#FFC107'
      case 'absent':
        return '#F44336'
      case 'pending':
      default:
        return '#999999'
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      present: { bg: COLORS.paleGreen, text: '#2E7D32' },
      late: { bg: COLORS.paleYellow, text: '#F57F17' },
      absent: { bg: COLORS.paleRed, text: '#C62828' },
      pending: { bg: '#F0F0F0', text: '#666666' },
    }
    const style = colors[status as keyof typeof colors] || colors.pending
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '4px 8px',
          backgroundColor: style.bg,
          color: style.text,
          borderRadius: '4px',
          fontSize: TYPOGRAPHY.sizes.caption,
          fontWeight: TYPOGRAPHY.weights.medium,
          textTransform: 'capitalize',
        }}
      >
        {status}
      </span>
    )
  }

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              height: '60px',
              backgroundColor: COLORS.bone,
              borderRadius: '8px',
              animation: 'pulse 2s infinite',
            }}
          />
        ))}
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '32px 16px',
          color: COLORS.gray,
        }}
      >
        <p style={{ margin: 0, fontSize: TYPOGRAPHY.sizes.body }}>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
      {records.map((record) => (
        <div
          key={record.id}
          onClick={() => onRecordClick?.(record.id)}
          style={{
            padding: '12px',
            border: `1px solid ${COLORS.lightGray}`,
            borderRadius: '8px',
            backgroundColor: COLORS.white,
            cursor: onRecordClick ? 'pointer' : 'default',
            transition: 'background-color 0.2s',
            display: 'grid',
            gridTemplateColumns: '80px 80px 80px 80px 1fr',
            alignItems: 'center',
            gap: '12px',
          }}
          onMouseOver={(e) => {
            if (onRecordClick) {
              (e.currentTarget as HTMLElement).style.backgroundColor = COLORS.bone
            }
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = COLORS.white
          }}
        >
          {/* Date */}
          <div>
            <p style={{ margin: 0, fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray }}>
              Date
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: TYPOGRAPHY.sizes.small, color: COLORS.black }}>
              {formatDate(record.createdAt)}
            </p>
          </div>

          {/* Check-In Time */}
          <div>
            <p style={{ margin: 0, fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray }}>
              Check-In
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: TYPOGRAPHY.sizes.small, color: COLORS.black }}>
              {formatTime(record.checkInTime)}
            </p>
          </div>

          {/* Check-Out Time */}
          <div>
            <p style={{ margin: 0, fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray }}>
              Check-Out
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: TYPOGRAPHY.sizes.small, color: COLORS.black }}>
              {record.checkOutTime ? formatTime(record.checkOutTime) : '--:--'}
            </p>
          </div>

          {/* Duration */}
          <div>
            <p style={{ margin: 0, fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray }}>
              Duration
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: TYPOGRAPHY.sizes.small, color: COLORS.black }}>
              {formatDuration(record.duration)}
            </p>
          </div>

          {/* Status Badge */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {getStatusBadge(record.status)}
          </div>
        </div>
      ))}
    </div>
  )
}
