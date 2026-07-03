'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAttendance, AttendanceRecord, UserStats } from '@/hooks/useAttendance'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { AttendanceList } from '@/components/Attendance/AttendanceList'
import { AttendanceStatsCard } from '@/components/Attendance/AttendanceStatsCard'

const G = {
    bg: '#070B14', glass: 'rgba(255,255,255,0.07)', glassBorder: 'rgba(255,255,255,0.10)',
    accent: '#00D68F', blue: '#4A7CFF',
    t1: '#F0F4FF', t2: 'rgba(240,244,255,0.55)', t3: 'rgba(240,244,255,0.30)',
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: `1px solid ${G.glassBorder}`,
    background: 'rgba(255,255,255,0.05)',
    color: G.t1,
    fontSize: '13px',
    boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: G.t2,
    display: 'block',
    marginBottom: '6px',
}

export default function AttendanceHistoryPage() {
    const router = useRouter()
    const { user, isLoading: authLoading } = useAuth()
    const { toast } = useToast()
    const { listAttendance, getUserStats, loading } = useAttendance()

    const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([])
    const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])
    const [stats, setStats] = useState<UserStats | null>(null)
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [dateRange, setDateRange] = useState({ from: '', to: '' })

    const recordsPerPage = 20

    // Load data
    useEffect(() => {
        if (authLoading) return
        const loadData = async () => {
            try {
                const records = await listAttendance({ limit: 500 })
                setAllRecords(records || [])

                if (user) {
                    try {
                        const userStats = await getUserStats(user.id)
                        if (userStats) setStats(userStats)
                    } catch { /* non-fatal */ }
                }
            } catch (error) {
                console.error('Error loading attendance history:', error)
                toast('Không thể tải lịch sử điểm danh', 'error')
            }
        }

        loadData()
    }, [authLoading, user])

    // Filter records
    useEffect(() => {
        let filtered = allRecords

        // Status filter (based on real response field: yes / no / null)
        if (statusFilter !== 'all') {
            filtered = filtered.filter((r) => {
                if (statusFilter === 'present') return r.response === 'yes'
                if (statusFilter === 'absent') return r.response === 'no'
                if (statusFilter === 'pending') return r.response === null
                return true
            })
        }

        // Date range filter — based on the actual session date, not record creation time
        if (dateRange.from) {
            const fromDate = new Date(dateRange.from).getTime()
            filtered = filtered.filter((r) => new Date(r.session_date || r.created_at || '').getTime() >= fromDate)
        }
        if (dateRange.to) {
            const toDate = new Date(dateRange.to).getTime() + 86400000 // Add 1 day
            filtered = filtered.filter((r) => new Date(r.session_date || r.created_at || '').getTime() <= toDate)
        }

        setFilteredRecords(filtered)
        setCurrentPage(1)
    }, [allRecords, statusFilter, dateRange])

    const paginatedRecords = filteredRecords.slice(
        (currentPage - 1) * recordsPerPage,
        currentPage * recordsPerPage
    )
    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage)

    const pendingCount = filteredRecords.filter((r) => r.response === null).length

    const exportToCSV = () => {
        const headers = ['Ngày', 'Loại buổi', 'Địa điểm', 'Phản hồi']
        const rows = filteredRecords.map((r) => [
            new Date(r.session_date || r.created_at || '').toLocaleDateString('vi-VN'),
            r.session_type === 'match' ? 'Trận đấu' : 'Tập luyện',
            r.location || '--',
            r.response === 'yes' ? 'Tham gia' : r.response === 'no' ? 'Vắng' : 'Chưa phản hồi',
        ])

        const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `lich-su-diem-danh-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div
            style={{
                padding: '20px 16px',
                paddingBottom: '100px',
                minHeight: '100%',
                width: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
            }}
        >
            {/* Header */}
            <div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: G.t1 }}>
                    Lịch sử điểm danh
                </h1>
                <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: G.t2 }}>
                    Xem và tải toàn bộ lịch sử điểm danh của bạn
                </p>
            </div>

            {/* Stats Summary */}
            <div>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: G.t1, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Tổng quan
                </p>
                <AttendanceStatsCard
                    totalPresent={stats?.attended ?? 0}
                    totalAbsent={stats?.absent ?? 0}
                    totalPending={pendingCount}
                    attendancePercentage={
                        stats && ((stats.attended ?? 0) + (stats.absent ?? 0)) > 0
                            ? Math.round(((stats.attended ?? 0) / ((stats.attended ?? 0) + (stats.absent ?? 0))) * 100)
                            : 0
                    }
                    isLoading={loading}
                />
            </div>

            {/* Filters */}
            <div
                style={{
                    border: `1px solid ${G.glassBorder}`,
                    borderRadius: '16px',
                    padding: '16px',
                    background: G.glass,
                    backdropFilter: 'blur(12px)',
                    boxSizing: 'border-box',
                }}
            >
                <p style={{ margin: '0 0 14px 0', fontSize: '13px', fontWeight: 700, color: G.t1, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Bộ lọc
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                    {/* Status Filter */}
                    <div>
                        <label style={labelStyle}>Trạng thái</label>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
                            <option value="all">Tất cả</option>
                            <option value="present">Tham gia</option>
                            <option value="absent">Vắng</option>
                            <option value="pending">Chưa phản hồi</option>
                        </select>
                    </div>

                    {/* From Date */}
                    <div>
                        <label style={labelStyle}>Từ ngày</label>
                        <input
                            type="date"
                            value={dateRange.from}
                            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                            style={inputStyle}
                        />
                    </div>

                    {/* To Date */}
                    <div>
                        <label style={labelStyle}>Đến ngày</label>
                        <input
                            type="date"
                            value={dateRange.to}
                            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                            style={inputStyle}
                        />
                    </div>
                </div>
            </div>

            {/* Records */}
            <div>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: G.t1, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Bản ghi ({filteredRecords.length})
                </p>
                <AttendanceList
                    records={paginatedRecords}
                    isLoading={loading}
                    onRecordClick={(id) => router.push(`/app/attendance/records/${id}`)}
                />
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{
                            padding: '8px 14px',
                            background: currentPage === 1 ? 'rgba(255,255,255,0.05)' : G.accent,
                            color: currentPage === 1 ? G.t3 : '#06110D',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        }}
                    >
                        Trước
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const page = i + 1
                            return (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        background: currentPage === page ? G.accent : 'rgba(255,255,255,0.05)',
                                        color: currentPage === page ? '#06110D' : G.t2,
                                        border: `1px solid ${G.glassBorder}`,
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontWeight: 600,
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
                            padding: '8px 14px',
                            background: currentPage === totalPages ? 'rgba(255,255,255,0.05)' : G.accent,
                            color: currentPage === totalPages ? G.t3 : '#06110D',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        }}
                    >
                        Sau
                    </button>
                </div>
            )}

            {/* Export Button */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                    onClick={exportToCSV}
                    style={{
                        padding: '12px 22px',
                        background: G.blue,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    Tải về dạng CSV
                </button>
            </div>
        </div>
    )
}
