'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAttendance, AttendanceRecord } from '@/hooks/useAttendance'
import { useToast } from '@/hooks/useToast'
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/constants'
import { AttendanceList } from '@/components/Attendance/AttendanceList'
import { AttendanceStatsCard } from '@/components/Attendance/AttendanceStatsCard'

export default function AttendanceHistoryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { listAttendance, getUserStats, loading } = useAttendance()

  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    attendancePercentage: 0,
    currentStreak: 0,
  })
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [dateRange, setDateRange] = useState({ from: '', to: '' })

  const recordsPerPage = 20

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const records = await listAttendance({ limit: 500 })
        setAllRecords(records || [])

        const userStats = await getUserStats()
        if (userStats) {
          setStats(userStats)
        }
      } catch (error) {
        console.error('Error loading attendance history:', error)
        toast('Failed to load attendance history', 'error')
      }
    }

    loadData()
  }, [])

  // Filter records
  useEffect(() => {
    let filtered = allRecords

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter)
    }

    // Date range filter
    if (dateRange.from) {
      const fromDate = new Date(dateRange.from).getTime()
      filtered = filtered.filter((r) => new Date(r.createdAt).getTime() >= fromDate)
    }
    if (dateRange.to) {
      const toDate = new Date(dateRange.to).getTime() + 86400000 // Add 1 day
      filtered = filtered.filter((r) => new Date(r.createdAt).getTime() <= toDate)
    }

    setFilteredRecords(filtered)
    setCurrentPage(1)
  }, [allRecords, statusFilter, dateRange])

  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  )
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage)

  const exportToCSV = () => {
    const headers = ['Date', 'Check-In', 'Check-Out', 'Duration', 'Status']
    const rows = filteredRecords.map((r) => [
      new Date(r.createdAt).toLocaleDateString('vi-VN'),
      new Date(r.checkInTime).toLocaleTimeString('vi-VN'),
      r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('vi-VN') : '--',
      r.duration ? `${Math.floor(r.duration / 3600)}h ${Math.floor((r.duration % 3600) / 60)}m` : '--',
      r.status,
    ])

    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div
      style={{
        padding: '24px 16px',
        paddingBottom: '100px',
        backgroundColor: COLORS.white,
        minHeight: '100vh',
      }}
    >
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
          Attendance History
        </h1>
        <p
          style={{
            margin: '8px 0 0 0',
            fontSize: TYPOGRAPHY.sizes.body,
            color: COLORS.gray,
          }}
        >
          View and download your complete attendance records
        </p>
      </div>

      {/* Stats Summary */}
      <div style={{ marginBottom: '32px' }}>
        <h2
          style={{
            margin: '0 0 16px 0',
            fontSize: TYPOGRAPHY.sizes.sectionTitle,
            fontWeight: TYPOGRAPHY.weights.semibold,
            color: COLORS.black,
          }}
        >
          Summary
        </h2>
        <AttendanceStatsCard
          totalPresent={stats.totalPresent}
          totalAbsent={stats.totalAbsent}
          totalLate={stats.totalLate}
          attendancePercentage={stats.attendancePercentage}
          isLoading={loading}
        />
      </div>

      {/* Filters */}
      <div
        style={{
          border: `1px solid ${COLORS.lightGray}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          backgroundColor: COLORS.bone,
        }}
      >
        <h3
          style={{
            margin: '0 0 12px 0',
            fontSize: TYPOGRAPHY.sizes.heading3,
            fontWeight: TYPOGRAPHY.weights.semibold,
            color: COLORS.black,
          }}
        >
          Filters
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          {/* Status Filter */}
          <div>
            <label style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray, display: 'block', marginBottom: '6px' }}>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: `1px solid ${COLORS.lightGray}`,
                borderRadius: '6px',
                fontSize: TYPOGRAPHY.sizes.small,
              }}
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray, display: 'block', marginBottom: '6px' }}>
              From Date
            </label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                border: `1px solid ${COLORS.lightGray}`,
                borderRadius: '6px',
                fontSize: TYPOGRAPHY.sizes.small,
              }}
            />
          </div>

          {/* To Date */}
          <div>
            <label style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray, display: 'block', marginBottom: '6px' }}>
              To Date
            </label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                border: `1px solid ${COLORS.lightGray}`,
                borderRadius: '6px',
                fontSize: TYPOGRAPHY.sizes.small,
              }}
            />
          </div>
        </div>
      </div>

      {/* Records */}
      <div style={{ marginBottom: '24px' }}>
        <h2
          style={{
            margin: '0 0 16px 0',
            fontSize: TYPOGRAPHY.sizes.sectionTitle,
            fontWeight: TYPOGRAPHY.weights.semibold,
            color: COLORS.black,
          }}
        >
          Records ({filteredRecords.length})
        </h2>
        <AttendanceList
          records={paginatedRecords}
          isLoading={loading}
          onRecordClick={(id) => router.push(`/app/attendance/records/${id}`)}
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: SPACING.sm,
            marginBottom: '24px',
          }}
        >
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px',
              backgroundColor: currentPage === 1 ? COLORS.bone : COLORS.black,
              color: currentPage === 1 ? COLORS.gray : COLORS.white,
              border: 'none',
              borderRadius: '4px',
              fontSize: TYPOGRAPHY.sizes.small,
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.sm,
            }}
          >
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: currentPage === page ? COLORS.black : COLORS.bone,
                    color: currentPage === page ? COLORS.white : COLORS.black,
                    border: `1px solid ${COLORS.lightGray}`,
                    borderRadius: '4px',
                    fontSize: TYPOGRAPHY.sizes.small,
                    cursor: 'pointer',
                  }}
                >
                  {page}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 12px',
              backgroundColor: currentPage === totalPages ? COLORS.bone : COLORS.black,
              color: currentPage === totalPages ? COLORS.gray : COLORS.white,
              border: 'none',
              borderRadius: '4px',
              fontSize: TYPOGRAPHY.sizes.small,
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Export Button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={exportToCSV}
          style={{
            padding: '12px 20px',
            backgroundColor: COLORS.black,
            color: COLORS.white,
            border: 'none',
            borderRadius: '8px',
            fontSize: TYPOGRAPHY.sizes.small,
            fontWeight: TYPOGRAPHY.weights.medium,
            cursor: 'pointer',
          }}
        >
          Download as CSV
        </button>
      </div>
    </div>
  )
}
