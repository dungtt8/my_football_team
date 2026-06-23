'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAttendance, AttendanceRecord, AttendanceSession, LeaderboardEntry, UserStats } from '@/hooks/useAttendance'
import { useToast } from '@/hooks/useToast'
import { SessionForm, SessionFormData } from '@/components/Attendance/SessionForm'

const G = {
    bg: '#070B14', glass: 'rgba(255,255,255,0.07)', glassBorder: 'rgba(255,255,255,0.10)',
    accent: '#00D68F', accentDim: 'rgba(0,214,143,0.12)', blue: '#4A7CFF',
    t1: '#F0F4FF', t2: 'rgba(240,244,255,0.55)', t3: 'rgba(240,244,255,0.30)',
}

export default function AttendancePage() {
    const router = useRouter()
    const { user, role } = useAuth()
    const { toast } = useToast()
    const { listSessions, memberCheckIn, createSession, getUserStats, getLeaderboard, getAttendanceHistory, loading } = useAttendance()
    const isManager = role === 'manager' || role === 'co_manager'

    const [stats, setStats] = useState<UserStats | null>(null)
    const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([])
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null)
    const [allSessions, setAllSessions] = useState<AttendanceSession[]>([])
    const [myCheckedIn, setMyCheckedIn] = useState(false)
    const [isCheckingIn, setIsCheckingIn] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    useEffect(() => {
        if (!user) return
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
                    const todayRec = records.find((r: AttendanceRecord) => r.checked_in_at && new Date(r.checked_in_at).toDateString() === today)
                    if (todayRec) setMyCheckedIn(true)
                } catch { }

                try {
                    const s = await getUserStats(user.id)
                    setStats(s)
                } catch { }

                const lb = await getLeaderboard()
                setLeaderboard((lb || []).slice(0, 5))
            } catch { toast('Không thể tải dữ liệu', 'error') }
        }
        load()
    }, [user])

    const handleCheckIn = async () => {
        if (!activeSession) { toast('Không có buổi active hôm nay', 'error'); return }
        setIsCheckingIn(true)
        try {
            await memberCheckIn(activeSession.id)
            setMyCheckedIn(true)
            toast('✅ Điểm danh thành công! +10 điểm', 'success')
        } catch (e: any) { toast(e?.message || 'Lỗi điểm danh', 'error') }
        finally { setIsCheckingIn(false) }
    }

    const handleCreate = async (data: SessionFormData) => {
        setIsCreating(true)
        try {
            const s = await createSession(data)
            setActiveSession(s)
            setAllSessions(prev => [s, ...prev])
            setShowForm(false)
            toast('Đã tạo lịch điểm danh', 'success')
        } catch (e: any) { toast(e?.message || 'Lỗi tạo lịch', 'error') }
        finally { setIsCreating(false) }
    }

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    const isDeadlinePassed = activeSession?.check_in_deadline ? new Date() > new Date(activeSession.check_in_deadline) : false

    return (
        <div style={{ minHeight: '100vh', padding: '24px 20px 24px', color: G.t1 }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                <div>
                    <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: G.accent, marginBottom: '6px' }}>Điểm danh</p>
                    <h1 style={{ fontSize: '32px', fontWeight: 300, fontFamily: 'serif', color: G.t1, margin: 0 }}>Buổi tập & Thi đấu</h1>
                </div>
                {isManager && (
                    <button onClick={() => setShowForm(true)} style={{
                        padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        background: G.accent, color: '#070B14', border: 'none',
                        boxShadow: '0 0 20px rgba(0,214,143,0.3)',
                    }}>+ Tạo lịch</button>
                )}
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
                {[
                    { label: 'Điểm tháng', value: stats?.total_points ?? '—' },
                    { label: 'Đã dự', value: stats?.attended ?? '—' },
                    { label: 'Hạng', value: stats?.rank ? `#${stats.rank}` : '—' },
                ].map(s => (
                    <div key={s.label} style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '16px', padding: '16px 12px', backdropFilter: 'blur(12px)' }}>
                        <p style={{ fontSize: '11px', color: G.t3, margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
                        <p style={{ fontSize: '24px', fontWeight: 700, color: G.accent, margin: 0 }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Active session / Check-in card */}
            {activeSession ? (
                <div style={{
                    background: myCheckedIn ? 'rgba(0,214,143,0.08)' : G.glass,
                    border: `1px solid ${myCheckedIn ? 'rgba(0,214,143,0.30)' : G.glassBorder}`,
                    borderRadius: '20px', padding: '20px', marginBottom: '28px',
                    backdropFilter: 'blur(16px)',
                    boxShadow: myCheckedIn ? '0 0 30px rgba(0,214,143,0.12)' : 'none',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                            <p style={{ fontSize: '11px', color: G.t3, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Buổi đang mở</p>
                            <p style={{ fontSize: '17px', fontWeight: 600, color: G.t1, margin: 0 }}>
                                {activeSession.session_type === 'match' ? '⚽ Trận đấu' : '🏃 Buổi tập'}
                                {activeSession.location ? ` · ${activeSession.location}` : ''}
                            </p>
                            <p style={{ fontSize: '12px', color: G.t2, marginTop: '4px' }}>{fmtDate(activeSession.session_date)}</p>
                        </div>
                        {myCheckedIn && <span style={{ fontSize: '28px' }}>✅</span>}
                    </div>
                    {activeSession.check_in_deadline && (
                        <p style={{ fontSize: '12px', color: isDeadlinePassed ? '#FF6B6B' : G.t3, marginBottom: '16px' }}>
                            {isDeadlinePassed ? '⛔ Hết hạn điểm danh' : `⏰ Hạn: ${new Date(activeSession.check_in_deadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                    )}
                    {!isManager && !myCheckedIn && !isDeadlinePassed && (
                        <button disabled={isCheckingIn} onClick={handleCheckIn} style={{
                            width: '100%', padding: '14px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                            background: `linear-gradient(135deg, ${G.accent}, #00A36C)`,
                            color: '#070B14', fontWeight: 700, fontSize: '15px',
                            boxShadow: '0 4px 24px rgba(0,214,143,0.35)',
                            transition: 'all 0.2s ease', opacity: isCheckingIn ? 0.6 : 1,
                        }}>
                            {isCheckingIn ? 'Đang xử lý...' : '✓ Điểm danh ngay'}
                        </button>
                    )}
                    {!isManager && myCheckedIn && (
                        <p style={{ textAlign: 'center', color: G.accent, fontWeight: 600, fontSize: '14px' }}>Đã điểm danh hôm nay 🎉</p>
                    )}
                    {isManager && (
                        <button onClick={() => router.push(`/app/attendance/sessions/${activeSession.id}`)} style={{
                            width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${G.glassBorder}`,
                            background: 'rgba(255,255,255,0.05)', color: G.t1, fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                        }}>Quản lý buổi này →</button>
                    )}
                </div>
            ) : (
                <div style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '20px', padding: '24px', marginBottom: '28px', textAlign: 'center' }}>
                    <p style={{ color: G.t3, fontSize: '14px' }}>Không có buổi active hôm nay</p>
                    {isManager && <button onClick={() => setShowForm(true)} style={{ marginTop: '12px', padding: '10px 20px', borderRadius: '10px', background: G.accentDim, color: G.accent, border: `1px solid rgba(0,214,143,0.25)`, fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>+ Tạo lịch mới</button>}
                </div>
            )}

            {/* Sessions list */}
            {allSessions.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: G.t2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>Tất cả lịch</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {allSessions.map(s => {
                            const isMatch = s.session_type === 'match'
                            const isPast = s.status === 'closed'
                            return (
                                <button key={s.id} onClick={() => router.push(`/app/attendance/sessions/${s.id}`)} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '14px 16px', background: G.glass, border: `1px solid ${G.glassBorder}`,
                                    borderRadius: '14px', cursor: 'pointer', textAlign: 'left', width: '100%',
                                    backdropFilter: 'blur(12px)', opacity: isPast ? 0.55 : 1,
                                    transition: 'all 0.15s ease',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '22px' }}>{isMatch ? '⚽' : '🏃'}</span>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: G.t1 }}>
                                                {isMatch ? 'Trận đấu' : 'Buổi tập'}{s.location ? ` · ${s.location}` : ''}
                                            </p>
                                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: G.t3 }}>{fmtDate(s.session_date)}</p>
                                        </div>
                                    </div>
                                    <span style={{
                                        fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px',
                                        background: isPast ? 'rgba(255,255,255,0.06)' : G.accentDim,
                                        color: isPast ? G.t3 : G.accent,
                                        border: `1px solid ${isPast ? G.glassBorder : 'rgba(0,214,143,0.25)'}`,
                                    }}>{isPast ? 'Đã đóng' : 'Đang mở'}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
                <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: G.t2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>Bảng xếp hạng</p>
                    <div style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '16px', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
                        {leaderboard.map((e, i) => {
                            const isMe = (e.user_id || e.userId) === user?.id
                            return (
                                <div key={e.user_id || e.userId || i} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '12px 16px', borderBottom: i < leaderboard.length - 1 ? `1px solid rgba(255,255,255,0.05)` : 'none',
                                    background: isMe ? G.accentDim : 'transparent',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: i < 3 ? G.accent : G.t3, width: '20px' }}>#{i + 1}</span>
                                        <p style={{ margin: 0, fontSize: '14px', fontWeight: isMe ? 700 : 500, color: isMe ? G.accent : G.t1 }}>{e.full_name || e.userName || 'Thành viên'}</p>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: G.accent }}>{e.total_points ?? e.points ?? 0}đ</p>
                                </div>
                            )
                        })}
                    </div>
                    <button onClick={() => router.push('/app/attendance/history')} style={{
                        width: '100%', marginTop: '10px', padding: '11px', borderRadius: '12px',
                        background: 'transparent', border: `1px solid ${G.glassBorder}`,
                        color: G.t2, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                    }}>Xem lịch sử đầy đủ →</button>
                </div>
            )}

            {/* Session Form Modal */}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
                    onClick={() => setShowForm(false)}>
                    <div style={{ background: '#0E1628', border: `1px solid ${G.glassBorder}`, borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '600px', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 600, color: G.t1 }}>Tạo lịch điểm danh</h2>
                        <SessionForm onSubmit={handleCreate} isLoading={isCreating} onCancel={() => setShowForm(false)} />
                    </div>
                </div>
            )}
        </div>
    )
}
