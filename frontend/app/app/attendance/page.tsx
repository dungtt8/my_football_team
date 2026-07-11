'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAttendance, AttendanceRecord, AttendanceSession, UserStats } from '@/hooks/useAttendance'
import { useToast } from '@/hooks/useToast'
import { SessionForm, SessionFormData } from '@/components/Attendance/SessionForm'

export default function AttendancePage() {
    const router = useRouter()
    const { user, team, role, isLoading: authLoading } = useAuth()
    const { toast } = useToast()
    const { listSessions, getActiveCheckin, respondToCheckin, createManualSession, getUserStats, getAttendanceHistory, loading } = useAttendance()
    const isManager = role === 'manager' || role === 'co_manager' || role === 'owner'

    const [stats, setStats] = useState<UserStats | null>(null)
    const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([])
    const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null)
    const [allSessions, setAllSessions] = useState<AttendanceSession[]>([])
    const [activeCheckinId, setActiveCheckinId] = useState<string | null>(null)
    const [myResponse, setMyResponse] = useState<'yes' | 'no' | null>(null)
    const [isCheckingIn, setIsCheckingIn] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (authLoading || !user) return

        // Reset local state so stale data from a previous team isn't shown
        // while the new team's data is loading.
        setStats(null)
        setRecentRecords([])
        setActiveSession(null)
        setAllSessions([])
        setActiveCheckinId(null)
        setMyResponse(null)
        setError(null)

        const load = async () => {
            try {
                const allRes = await listSessions({ limit: 20 })
                const sessions: AttendanceSession[] = allRes?.data || []
                setAllSessions(sessions)
                const today = new Date().toDateString()
                const todaySession = sessions.find(s => s.status === 'active' && new Date(s.session_date).toDateString() === today)
                setActiveSession(todaySession || sessions.find(s => s.status === 'active') || null)

                try {
                    const hist = await getAttendanceHistory()
                    const records = hist?.history || []
                    setRecentRecords(records.slice(0, 5))
                } catch { }

                // The user's own Yes/No response for the current active session
                try {
                    const active = await getActiveCheckin()
                    if (active?.check_in) {
                        setActiveCheckinId(active.check_in.id)
                        setMyResponse(active.check_in.response ?? null)
                    }
                } catch { }

                try {
                    const s = await getUserStats(user.id)
                    setStats(s)
                } catch { }
            } catch {
                setError('Không thể tải dữ liệu. Vui lòng thử lại.')
                toast('Không thể tải dữ liệu', 'error')
            }
        }
        load()
    }, [user, authLoading, team?.id])

    const handleRespond = async (value: 'yes' | 'no') => {
        if (!activeCheckinId) { toast('Không tìm thấy phiếu điểm danh cho buổi này', 'error'); return }
        setIsCheckingIn(true)
        try {
            await respondToCheckin(activeCheckinId, value)
            setMyResponse(value)
            toast(value === 'yes' ? '✅ Điểm danh thành công! +10 điểm' : '📋 Đã báo vắng buổi này', 'success')
        } catch (e: any) { toast(e?.message || 'Lỗi điểm danh', 'error') }
        finally { setIsCheckingIn(false) }
    }

    const handleCreate = async (data: SessionFormData) => {
        setIsCreating(true)
        try {
            const s = await createManualSession(data)
            setActiveSession(s)
            setAllSessions(prev => [s, ...prev])
            setShowForm(false)
            toast('Đã tạo lịch điểm danh', 'success')
        } catch (e: any) { toast(e?.message || 'Lỗi tạo lịch', 'error') }
        finally { setIsCreating(false) }
    }

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    const isDeadlinePassed = activeSession?.check_in_deadline ? new Date() > new Date(activeSession.check_in_deadline) : false

    // ---- Reusable pieces (rendered once, placed in different order/columns for mobile vs desktop) ----

    const errorEl = error && (
        <div className="card pad" style={{ borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--danger)' }}>{error}</p>
            <button className="btn btn-ghost btn-sm" onClick={() => window.location.reload()} style={{ flexShrink: 0 }}>Thử lại</button>
        </div>
    )

    const tilesEl = (
        <div className="tiles">
            <div className="tile"><div className="n" style={{ color: 'var(--brand-600)' }}>{stats?.total_points ?? '—'}</div><div className="l">Điểm tháng</div></div>
            <div className="tile"><div className="n">{stats?.attended ?? '—'}</div><div className="l">Đã dự</div></div>
            <div className="tile" style={{ cursor: 'pointer' }} onClick={() => router.push('/app/attendance/leaderboard')}>
                <div className="n" style={{ color: 'var(--accent)' }}>{stats?.rank ? `#${stats.rank}` : '—'}</div><div className="l">Hạng</div>
            </div>
        </div>
    )

    const checkinEl = activeSession ? (
        <div className="checkin">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="chip live"><span className="live-dot" />BUỔI ĐANG MỞ</span>
                <span style={{ fontSize: 26 }}>{activeSession.session_type === 'match' ? '⚽' : '🏃'}</span>
            </div>
            <div className="match-title">{activeSession.session_type === 'match' ? 'Trận đấu' : 'Buổi tập'}</div>
            <div className="meta">📍&nbsp;{activeSession.location || 'Chưa có địa điểm'} · {fmtDate(activeSession.session_date)}</div>
            {activeSession.check_in_deadline && (
                <div className="deadline" style={isDeadlinePassed ? { color: 'var(--danger)' } : undefined}>
                    {isDeadlinePassed
                        ? '⛔ Hết hạn điểm danh'
                        : `⏰ Hạn: ${new Date(activeSession.check_in_deadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                </div>
            )}
            {!isManager && myResponse === null && !isDeadlinePassed && activeCheckinId && (
                <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                    <button className="btn btn-primary" style={{ flex: 1, padding: 15, opacity: isCheckingIn ? 0.6 : 1 }} disabled={isCheckingIn} onClick={() => handleRespond('yes')}>
                        {isCheckingIn ? 'Đang xử lý...' : '✓ Điểm danh ngay'}
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '15px 18px', opacity: isCheckingIn ? 0.6 : 1 }} disabled={isCheckingIn} onClick={() => handleRespond('no')}>
                        Vắng mặt
                    </button>
                </div>
            )}
            {!isManager && myResponse === 'yes' && (
                <>
                    <p style={{ textAlign: 'center', color: 'var(--brand-600)', fontWeight: 600, fontSize: 14, marginTop: 14 }}>Đã điểm danh hôm nay 🎉</p>
                    {!isDeadlinePassed && (
                        <button className="btn btn-ghost btn-block" style={{ marginTop: 8, opacity: isCheckingIn ? 0.6 : 1 }} disabled={isCheckingIn} onClick={() => handleRespond('no')}>
                            Đổi thành vắng mặt
                        </button>
                    )}
                </>
            )}
            {!isManager && myResponse === 'no' && (
                <>
                    <p style={{ textAlign: 'center', color: 'var(--ink-3)', fontWeight: 600, fontSize: 14, marginTop: 14 }}>Bạn đã báo vắng buổi này</p>
                    {!isDeadlinePassed && (
                        <button className="btn btn-primary btn-block" style={{ marginTop: 8, opacity: isCheckingIn ? 0.6 : 1 }} disabled={isCheckingIn} onClick={() => handleRespond('yes')}>
                            ✓ Đổi thành có mặt
                        </button>
                    )}
                </>
            )}
            {!isManager && myResponse === null && !isDeadlinePassed && !activeCheckinId && (
                <p style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, marginTop: 14 }}>Đang tải phiếu điểm danh...</p>
            )}
            {isManager && (
                <button className="btn btn-ghost btn-block" style={{ marginTop: 14 }} onClick={() => router.push(`/app/attendance/sessions/${activeSession.id}`)}>Quản lý buổi này →</button>
            )}
        </div>
    ) : (
        <div className="card pad" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: 0 }}>Không có buổi active hôm nay</p>
        </div>
    )

    const pillsEl = (
        <div className="pills">
            <div className="pill on">Tất cả</div>
            <div className="pill">Buổi tập</div>
            <div className="pill">Trận đấu</div>
            <div className="pill">Đang mở</div>
        </div>
    )

    const sessionsListEl = allSessions.length > 0 && (
        <div className="card">
            {allSessions.map(s => {
                const isMatch = s.session_type === 'match'
                const isPast = s.status === 'closed'
                return (
                    <div key={s.id} className="row" onClick={() => router.push(`/app/attendance/sessions/${s.id}`)} style={{ cursor: 'pointer', ...(isPast ? { opacity: .6 } : {}) }}>
                        <div className="lead" style={{ background: isPast ? 'var(--surface-2)' : isMatch ? 'var(--blue-050)' : 'var(--brand-050)' }}>{isMatch ? '⚽' : '🏃'}</div>
                        <div className="rc">
                            <b>{isMatch ? 'Trận đấu' : 'Buổi tập'}{s.location ? ` · ${s.location}` : ''}</b>
                            <small>{fmtDate(s.session_date)}</small>
                        </div>
                        <span className={`badge ${isPast ? 'closed' : 'ok'}`}>{isPast ? 'Đã đóng' : 'Đang mở'}</span>
                    </div>
                )
            })}
        </div>
    )

    const recentRecordsEl = recentRecords.length > 0 && (
        <div>
            <div className="sec-title" style={{ marginBottom: 12 }}>Điểm danh gần đây<a onClick={() => router.push('/app/attendance/history')}>Xem tất cả</a></div>
            <div className="card">
                {recentRecords.slice(0, 5).map((record, idx) => {
                    const yes = record.response === 'yes'
                    return (
                        <div key={record.id || idx} className="row" onClick={() => router.push(`/app/attendance/records/${record.id}`)} style={{ cursor: 'pointer' }}>
                            <div className="lead" style={{ background: yes ? 'var(--brand-050)' : 'var(--danger-050)' }}>{yes ? '✅' : '✖️'}</div>
                            <div className="rc">
                                <b>{yes ? 'Có mặt' : record.response === 'no' ? 'Vắng' : 'Chưa phản hồi'} · {record.session_type === 'match' ? 'Trận đấu' : 'Buổi tập'}</b>
                                <small>{record.session_date ? new Date(record.session_date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }) : 'N/A'}</small>
                            </div>
                            <span className={yes ? 'amt-pos' : 'amt-neg'}>{yes ? '+10' : '0'}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )

    const createButtonEl = isManager && (
        <button className="btn btn-ghost btn-block" onClick={() => setShowForm(true)}>+ Tạo lịch mới</button>
    )

    return (
        <div className="screen-body" style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>

            {/* Mobile header — matches mockup M.attend */}
            <div className="md:hidden">
                <div className="eyebrow">Điểm danh</div>
                <h1 className="sec-title" style={{ fontSize: 22, marginTop: 4 }}>Buổi tập &amp; thi đấu</h1>
            </div>

            {/* Desktop header — matches mockup D.attend .page-h */}
            <div className="hidden md:block page-h">
                <h1>Điểm danh</h1>
                <p>Buổi tập &amp; thi đấu của {team?.name || 'đội bóng'}.</p>
            </div>

            {errorEl}

            {/* Mobile layout — matches mockup M.attend: tiles, checkin, pills, sessions, recent */}
            <div className="md:hidden">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {tilesEl}
                    {checkinEl}
                    {pillsEl}
                    {sessionsListEl}
                    {recentRecordsEl}
                    {createButtonEl}
                </div>
            </div>

            {/* Desktop layout — matches mockup D.attend, with "Buổi đang mở" and "Lịch sử các buổi tập" aligned on the same row */}
            <div className="hidden md:block">
                <div className="dgrid">
                    {pillsEl}
                    {tilesEl}
                    {sessionsListEl}
                    {checkinEl}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 20 }}>
                    {recentRecordsEl}
                    {createButtonEl}
                </div>
            </div>

            {/* Session Form Modal */}
            {showForm && (
                <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 'var(--content-left-offset, 0px)', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
                    onClick={() => setShowForm(false)}>
                    <div style={{ background: '#F4F7FB', border: `1px solid var(--line)`, borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '600px', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div>
                                <div className="eyebrow">Điểm danh</div>
                                <h2 className="sec-title" style={{ fontSize: 22, marginTop: 2 }}>Tạo lịch điểm danh</h2>
                            </div>
                            <button onClick={() => setShowForm(false)} style={{ background: '#FFFFFF', border: `1px solid var(--line)`, color: 'var(--ink-2)', borderRadius: '10px', padding: '6px 12px', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>✕</button>
                        </div>
                        <SessionForm onSubmit={handleCreate} isLoading={isCreating} onCancel={() => setShowForm(false)} />
                    </div>
                </div>
            )}
        </div>
    )
}
