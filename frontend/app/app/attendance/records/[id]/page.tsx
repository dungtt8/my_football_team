'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAttendance, AttendanceRecord } from '@/hooks/useAttendance'
import { useToast } from '@/hooks/useToast'
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/constants'

export default function AttendanceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { getAttendanceDetail, loading } = useAttendance()

  const [record, setRecord] = useState<AttendanceRecord | null>(null)

  useEffect(() => {
    const loadRecord = async () => {
      try {
        const id = params.id as string
        if (id) {
          const data = await getAttendanceDetail(id)
          setRecord(data)
        }
      } catch (error) {
        console.error('Error loading attendance record:', error)
        toast('Failed to load attendance record', 'error')
      }
    }

    loadRecord()
  }, [params.id])

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return { bg: COLORS.paleGreen, text: '#2E7D32' }
      case 'late':
        return { bg: COLORS.paleYellow, text: '#F57F17' }
      case 'absent':
        return { bg: COLORS.paleRed, text: '#C62828' }
      case 'pending':
      default:
        return { bg: '#F0F0F0', text: '#666666' }
    }
  }

  if (loading || !record) {
    return (
      <div style={{ padding: '24px 16px', paddingBottom: '100px' }}>
        <div style={{ height: '400px', backgroundColor: COLORS.bone, borderRadius: '8px', animation: 'pulse 2s infinite' }} />
      </div>
    )
  }

  const statusColor = getStatusColor(record.status)

  return (
    <div
      style={{
        padding: '24px 16px',
        paddingBottom: '100px',
        backgroundColor: COLORS.white,
        minHeight: '100vh',
      }}
    >
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        style={{
          marginBottom: '20px',
          padding: '8px 12px',
          backgroundColor: 'transparent',
          color: COLORS.black,
          border: `1px solid ${COLORS.lightGray}`,
          borderRadius: '4px',
          fontSize: TYPOGRAPHY.sizes.small,
          fontWeight: TYPOGRAPHY.weights.medium,
          cursor: 'pointer',
        }}
      >
        ← Back
      </button>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: TYPOGRAPHY.sizes.hero,
            fontWeight: TYPOGRAPHY.weights.semibold,
            color: COLORS.black,
          }}
        >
          Attendance Detail
        </h1>
        <p
          style={{
            margin: '8px 0 0 0',
            fontSize: TYPOGRAPHY.sizes.body,
            color: COLORS.gray,
          }}
        >
          {formatDate(record.createdAt)}
        </p>
      </div>

      {/* Main Card */}
      <div
        style={{
          border: `1px solid ${COLORS.lightGray}`,
          borderRadius: '12px',
          padding: '20px',
          backgroundColor: COLORS.white,
          marginBottom: '24px',
        }}
      >
        {/* Status Badge */}
        <div style={{ marginBottom: '20px' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '8px 12px',
              backgroundColor: statusColor.bg,
              color: statusColor.text,
              borderRadius: '6px',
              fontSize: TYPOGRAPHY.sizes.small,
              fontWeight: TYPOGRAPHY.weights.medium,
              textTransform: 'capitalize',
            }}
          >
            {record.status}
          </span>
        </div>

        {/* Detail Grid */}
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* Check-In Time */}
          <div>
            <p style={{ margin: '0 0 8px 0', fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray }}>
              Check-In Time
            </p>
            <p style={{ margin: 0, fontSize: TYPOGRAPHY.sizes.body, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.black }}>
              {formatTime(record.checkInTime)}
            </p>
          </div>

          {/* Check-Out Time */}
          <div>
            <p style={{ margin: '0 0 8px 0', fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray }}>
              Check-Out Time
            </p>
            <p style={{ margin: 0, fontSize: TYPOGRAPHY.sizes.body, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.black }}>
              {record.checkOutTime ? formatTime(record.checkOutTime) : 'Not checked out yet'}
            </p>
          </div>

          {/* Duration */}
          <div>
            <p style={{ margin: '0 0 8px 0', fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray }}>
              Duration
            </p>
            <p style={{ margin: 0, fontSize: TYPOGRAPHY.sizes.body, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.black }}>
              {formatDuration(record.duration)}
            </p>
          </div>

          {/* Location */}
          {record.location && (
            <div>
              <p style={{ margin: '0 0 8px 0', fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray }}>
                Location
              </p>
              <p style={{ margin: 0, fontSize: TYPOGRAPHY.sizes.body, color: COLORS.black }}>
                {record.location}
              </p>
            </div>
          )}

          {/* Notes */}
          {record.notes && (
            <div>
              <p style={{ margin: '0 0 8px 0', fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray }}>
                Notes
              </p>
              <p style={{ margin: 0, fontSize: TYPOGRAPHY.sizes.body, color: COLORS.black }}>
                {record.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Related Stats */}
      <div
        style={{
          border: `1px solid ${COLORS.lightGray}`,
          borderRadius: '12px',
          padding: '20px',
          backgroundColor: COLORS.bone,
        }}
      >
        <h3
          style={{
            margin: '0 0 16px 0',
            fontSize: TYPOGRAPHY.sizes.heading3,
            fontWeight: TYPOGRAPHY.weights.semibold,
            color: COLORS.black,
          }}
        >
          Related Information
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <p style={{ margin: '0 0 8px 0', fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray }}>
              Record ID
            </p>
            <p style={{ margin: 0, fontSize: TYPOGRAPHY.sizes.small, color: COLORS.black }}>
              {record.id}
            </p>
          </div>
          <div>
            <p style={{ margin: '0 0 8px 0', fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray }}>
              Created Date
            </p>
            <p style={{ margin: 0, fontSize: TYPOGRAPHY.sizes.small, color: COLORS.black }}>
              {new Date(record.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
