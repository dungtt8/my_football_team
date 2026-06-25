'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAttendance, AttendanceSession, AttendanceRecord } from '@/hooks/useAttendance'
import { useToast } from '@/hooks/useToast'
import { ArrowLeft } from 'phosphor-react'

export default function SessionDetailPage() {
    const router = useRouter()
    const params = useParams()
    const { user, role } = useAuth()
    const { toast } = useToast()
    const id = params.id as string

    const { getSession, memberCheckIn, markAbsent, closeSession } = useAttendance()
    const isManager = role === 'co_manager' || role === 'manager' || role === 'owner'

    const [session, setSession] = useState<AttendanceSession | null>(null)
    const [records, setRecords] = useState<AttendanceRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isActing, setIsActing] = useState(false)

    useEffect(() => { loadData() }, [id])

    const loadData = async () => {
        setIsLoading(true)
        try {
            const result = await getSession(id)
            setSession(result.session)
            setRecords(result.records)
        } catch {
            toast('Không thể tải buổi tập', 'error')
            router.push('/app/attendance')
        } finally { setIsLoading(false) }
    }

    const act = async (fn: () => Promise<void>, successMsg: string) => {
        setIsActing(true)
        try { await fn(); toast(successMsg, 'success'); loadData() }
        catch (e: any) { toast(e?.message || 'Lỗi', 'error') }
        finally { setIsActing(false) }
    }

    const myRecord = records.find((r) => r.user_id === user?.id)
    const isActive = session?.status === 'active'
    const isDeadlinePassed = session?.check_in_deadline
        ? new Date() > new Date(session.check_in_deadline)
        : false
    const canCheckIn = isActive && !myRecord && !isDeadlinePassed

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', {
        weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })
    const fmtTime = (d: string) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

    if (isLoading) return (
        <div className="min-h-screen p-6 flex items-center justify-center">
            <div className="animate-pulse space-y-4 w-full max-w-lg">
                <div className="h-8 bg-gray-100 rounded w-1/2" />
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-40 bg-gray-100 rounded" />
            </div>
        </div>
    )

    if (!session) return null

    const isMatch = session.session_type === 'match'
    const attendedCount = records.filter((r) => r.status === 'attended').length
    const absentCount = records.filter((r) => r.status === 'marked_absent').length

    return (
        <div className="min-h-screen px-6 pt-8 pb-20 md:px-12 space-y-6" style={{ color: '#0F0E0C' }}>
            {/* Back */}
            <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-medium" style={{ color: '#6B6660' }}>
                <ArrowLeft size={18} />Quay lại
            </button>

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{isMatch ? '⚽' : '🏃'}</span>
                        <h1 className="text-3xl font-serif font-light">
                            {isMatch ? 'Trận đấu' : 'Buổi tập'}
                        </h1>
                    </div>
                    <p className="text-sm" style={{ color: '#9F9A93' }}>
                        {fmtDate(session.session_date)}
                        {session.location && ` · ${session.location}`}
                    </p>
                    {session.check_in_deadline && (
                        <p className="text-xs mt-1" style={{ color: isDeadlinePassed ? '#E53E3E' : '#6B6660' }}>
                            {isDeadlinePassed ? '⛔ Đã hết hạn điểm danh' : `⏰ Hạn điểm danh: ${fmtTime(session.check_in_deadline)}`}
                        </p>
                    )}
                </div>
                <span className={`text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {isActive ? 'Đang mở' : 'Đã đóng'}
                </span>
            </div>

            {/* Description */}
            {session.description && (
                <p className="text-sm leading-relaxed" style={{ color: '#6B6660' }}>{session.description}</p>
            )}

            {/* Manager stats */}
            {isManager && (
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Đã điểm danh', value: attendedCount, color: '#166534', bg: '#DCFCE7' },
                        { label: 'Vắng mặt', value: absentCount, color: '#991B1B', bg: '#FEE2E2' },
                        { label: 'Tổng', value: records.length, color: '#4A4540', bg: '#F5F3F0' },
                    ].map((s) => (
                        <div key={s.label} className="rounded-xl p-4" style={{ background: s.bg }}>
                            <p className="text-xs font-medium mb-1" style={{ color: s.color }}>{s.label}</p>
                            <p className="text-2xl font-semibold" style={{ color: s.color }}>{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Member check-in card */}
            {!isManager && (
                <div className="rounded-2xl p-5 border" style={{ borderColor: '#E5E5E5' }}>
                    {myRecord ? (
                        <div className="text-center py-2">
                            <p className="text-2xl mb-2">✅</p>
                            <p className="font-semibold">Đã điểm danh</p>
                            {myRecord.checked_in_at && (
                                <p className="text-sm mt-1" style={{ color: '#6B6660' }}>lúc {fmtTime(myRecord.checked_in_at)}</p>
                            )}
                        </div>
                    ) : isDeadlinePassed ? (
                        <div className="text-center py-2">
                            <p className="text-2xl mb-2">⛔</p>
                            <p className="font-semibold" style={{ color: '#E53E3E' }}>Đã hết hạn điểm danh</p>
                        </div>
                    ) : !isActive ? (
                        <div className="text-center py-2">
                            <p className="text-sm" style={{ color: '#6B6660' }}>Buổi này đã đóng</p>
                        </div>
                    ) : (
                        <>
                            <p className="font-semibold mb-4">Bạn có tham gia {isMatch ? 'trận đấu' : 'buổi tập'} này không?</p>
                            <div className="flex gap-3">
                                <button
                                    disabled={isActing}
                                    onClick={() => act(() => memberCheckIn(id).then(() => { }), 'Điểm danh thành công! +10 điểm')}
                                    className="flex-1 py-4 rounded-xl text-base font-semibold disabled:opacity-50 transition-all"
                                    style={{ background: '#0F0E0C', color: '#FFFCF9' }}
                                >
                                    {isActing ? 'Đang xử lý...' : '✓ Tham gia'}
                                </button>
                                <button
                                    disabled={isActing}
                                    onClick={() => act(() => markAbsent(id, user?.id || '').then(() => { }), 'Đã ghi nhận không tham gia (-5 điểm)')}
                                    className="flex-1 py-3 rounded-xl text-sm font-semibold border disabled:opacity-50 transition-all"
                                    style={{ borderColor: '#E5E5E5', color: '#6B6660', background: 'transparent' }}
                                >
                                    Không
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Attendance records (manager) */}
            {isManager && records.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-3">Danh sách điểm danh</h2>
                    <div className="space-y-2">
                        {records.map((r) => (
                            <div key={r.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: '#F5F3F0' }}>
                                <div>
                                    <p className="text-sm font-medium">{r.full_name || r.user_id}</p>
                                    {r.checked_in_at && (
                                        <p className="text-xs" style={{ color: '#6B6660' }}>Điểm danh lúc {fmtTime(r.checked_in_at)}</p>
                                    )}
                                </div>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${r.status === 'attended' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {r.status === 'attended' ? 'Có mặt' : 'Vắng mặt'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Manager: mark absent for members who haven't checked in */}
            {isManager && isActive && (
                <div className="rounded-2xl p-5 border" style={{ borderColor: '#E5E5E5' }}>
                    <p className="text-sm font-semibold mb-1">Đánh vắng mặt</p>
                    <p className="text-xs mb-4" style={{ color: '#9F9A93' }}>Nhập ID thành viên vắng mặt (-5 điểm)</p>
                    <MarkAbsentForm
                        disabled={isActing}
                        onSubmit={(userId) => act(
                            () => markAbsent(id, userId).then(() => { }),
                            'Đã đánh vắng mặt (-5 điểm)'
                        )}
                    />
                </div>
            )}

            {/* Manager: close session */}
            {isManager && isActive && (
                <button
                    disabled={isActing}
                    onClick={() => {
                        if (!window.confirm('Đóng buổi này? Không thể mở lại.')) return
                        act(() => closeSession(id).then(() => { }), 'Đã đóng buổi')
                    }}
                    className="w-full py-3 rounded-xl text-sm font-semibold border disabled:opacity-50"
                    style={{ borderColor: '#E53E3E', color: '#E53E3E' }}
                >
                    Đóng buổi
                </button>
            )}
        </div>
    )
}

// Simple inline form for marking absent
function MarkAbsentForm({ onSubmit, disabled }: { onSubmit: (userId: string) => void; disabled: boolean }) {
    const [userId, setUserId] = useState('')
    return (
        <div className="flex gap-2">
            <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="User ID thành viên"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"
            />
            <button
                disabled={disabled || !userId.trim()}
                onClick={() => { onSubmit(userId.trim()); setUserId('') }}
                className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: '#0F0E0C', color: '#FFFCF9' }}
            >
                Đánh
            </button>
        </div>
    )
}
