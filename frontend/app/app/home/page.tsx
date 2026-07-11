'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAttendance, AttendanceSession, LeaderboardEntry, UserStats } from '@/hooks/useAttendance'
import { useCheckin, ActiveCheckIn } from '@/hooks/useCheckin'
import { useCampaign, Campaign } from '@/hooks/useCampaign'
import { useToast } from '@/hooks/useToast'

const greeting = () => {
    const h = new Date().getHours()
    if (h < 11) return 'Chào buổi sáng'
    if (h < 14) return 'Chào buổi trưa'
    if (h < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
}

const fmtSession = (d?: string) =>
    d ? new Date(d).toLocaleString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''

export default function HomePage() {
    const router = useRouter()
    const { user, isLoading: authLoading, team } = useAuth()
    const { toast } = useToast()
    const { listSessions, getUserStats, getLeaderboard } = useAttendance()
    const { getActiveCheckIn, respondToCheckIn } = useCheckin()
    const { listCampaigns } = useCampaign()

    const [stats, setStats] = useState<UserStats | null>(null)
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null)
    const [upcoming, setUpcoming] = useState<AttendanceSession[]>([])
    const [activeCheckIn, setActiveCheckIn] = useState<ActiveCheckIn | null>(null)
    const [unpaid, setUnpaid] = useState<number>(0)
    const [weekCount, setWeekCount] = useState<number>(0)
    const [checkingIn, setCheckingIn] = useState(false)

    const displayName = (user as any)?.full_name || (user as any)?.name || user?.email || 'Thành viên'
    const initials = String(displayName).trim().split(/\s+/).map((w: string) => w[0]).slice(-2).join('').toUpperCase()

    useEffect(() => {
        if (authLoading || !user) return
        const load = async () => {
            try {
                const res = await listSessions({ limit: 20 })
                const sessions: AttendanceSession[] = (res as any)?.data || []
                const active = sessions.filter(s => s.status === 'active')
                setActiveSession(active[0] || null)
                setUpcoming(active.slice(0, 3))

                const now = new Date()
                const weekAhead = new Date(now.getTime() + 7 * 864e5)
                setWeekCount(sessions.filter(s => {
                    const d = new Date(s.session_date)
                    return d >= now && d <= weekAhead
                }).length)
            } catch { }

            try {
                const a = await getActiveCheckIn()
                if (a?.check_in) setActiveCheckIn(a.check_in)
            } catch { }

            try { setStats(await getUserStats(user.id)) } catch { }
            try { setLeaderboard(((await getLeaderboard()) || []).slice(0, 5)) } catch { }

            try {
                const camps: Campaign[] = await listCampaigns({ status: 'active' })
                let count = 0
                camps.forEach(c => {
                    const mine = c.assignments?.find(a => String(a.user_id) === String(user.id))
                    if (mine && (mine.status === 'pending_confirmation' || mine.status === 'rejected')) count++
                })
                setUnpaid(count)
            } catch { }
        }
        load()
    }, [user, authLoading, team?.id])

    const attendancePct = stats && stats.total ? Math.round(((stats.attended || 0) / stats.total) * 100) : null
    const myEntry = leaderboard.find(e => String(e.user_id || e.userId) === String(user?.id))
    const isDeadlinePassed = activeSession?.check_in_deadline ? new Date() > new Date(activeSession.check_in_deadline) : false

    const handleRespond = async (value: 'yes' | 'no') => {
        if (!activeCheckIn) { router.push('/app/attendance'); return }
        setCheckingIn(true)
        try {
            await respondToCheckIn(activeCheckIn.id, value)
            setActiveCheckIn({ ...activeCheckIn, response: value })
            toast(value === 'yes' ? '✅ Điểm danh thành công! +10 điểm 🎉' : '📋 Đã báo vắng buổi này', 'success')
        } catch (e: any) { toast(e?.message || 'Lỗi điểm danh', 'error') }
        finally { setCheckingIn(false) }
    }

    const response = activeCheckIn?.response ?? null

    return (
        <div className="screen-body" style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
            {/* Mobile: hero greeting card (hidden on desktop, matches mockup Mobile screen) */}
            <div className="hero md:hidden">
                <div className="pitch-lines" />
                <div className="hero-row">
                    <div>
                        <div className="sub">{greeting()} 👋</div>
                        <h2>{displayName}</h2>
                    </div>
                    <div className="avatar">{initials || '?'}</div>
                </div>
                <div className="hero-stats">
                    <div className="hstat"><div className="n">{stats?.total_points ?? '—'}</div><div className="l">Điểm mùa</div></div>
                    <div className="hstat"><div className="n">{stats?.rank ? `#${stats.rank}` : '—'}</div><div className="l">Xếp hạng</div></div>
                    <div className="hstat"><div className="n">{attendancePct != null ? `${attendancePct}%` : '—'}</div><div className="l">Chuyên cần</div></div>
                </div>
            </div>

            {/* Desktop: page title + 3 stat cards (hidden on mobile, matches mockup Desktop D.home) */}
            <div className="hidden md:block">
                <div className="page-h">
                    <h1>{greeting()}, {displayName} 👋</h1>
                    <p>Đây là tổng quan hoạt động của bạn tại {team?.name || 'đội bóng'}.</p>
                </div>
                <div className="dgrid-3" style={{ marginBottom: 20 }}>
                    <div className="card pad">
                        <div className="ic" style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--brand-050)', color: 'var(--brand-600)', display: 'grid', placeItems: 'center', fontSize: 17, marginBottom: 10 }}>🏆</div>
                        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 26 }}>{stats?.total_points ?? '—'} <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--brand-600)' }}>điểm</span></div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4, fontWeight: 600 }}>Xếp hạng {stats?.rank ? `#${stats.rank}` : '—'}</div>
                    </div>
                    <div className="card pad">
                        <div className="ic" style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--blue-050)', color: 'var(--blue)', display: 'grid', placeItems: 'center', fontSize: 17, marginBottom: 10 }}>📅</div>
                        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 26 }}>{attendancePct != null ? `${attendancePct}%` : '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4, fontWeight: 600 }}>Chuyên cần{stats?.attended != null && stats?.total ? ` · ${stats.attended}/${stats.total} buổi` : ''}</div>
                    </div>
                    <div className="card pad" style={unpaid > 0 ? { border: '1.5px solid var(--danger)', background: 'linear-gradient(180deg,var(--danger-050),#fff)' } : undefined}>
                        <div className="ic" style={{ width: 34, height: 34, borderRadius: 10, background: unpaid > 0 ? 'var(--danger)' : 'var(--brand-050)', color: unpaid > 0 ? '#fff' : 'var(--brand-600)', display: 'grid', placeItems: 'center', fontSize: 17, marginBottom: 10 }}>💳</div>
                        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 26, color: unpaid > 0 ? 'var(--danger)' : undefined }}>{unpaid}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4, fontWeight: 600 }}>Khoản thu chưa đóng</div>
                    </div>
                </div>
            </div>

            {/* Desktop: two-column split (matches redesign-mockup.html .dgrid) — checkin + upcoming left, leaderboard right. Stacks to one column on mobile via CSS. */}
            <div className="dgrid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Check-in card */}
                    {activeSession && (
                        <div className="checkin">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="chip live"><span className="live-dot" />ĐANG MỞ</span>
                                <span style={{ fontSize: 24 }}>{activeSession.session_type === 'match' ? '⚽' : '🏃'}</span>
                            </div>
                            <div className="match-title">
                                {activeSession.session_type === 'match' ? 'Trận đấu' : 'Buổi tập'}
                                {activeSession.location ? ` · ${activeSession.location}` : ''}
                            </div>
                            <div className="meta">🕒&nbsp;{fmtSession(activeSession.session_date)}</div>
                            {activeSession.check_in_deadline && (
                                <div className="deadline">⏰&nbsp;Hạn điểm danh: {new Date(activeSession.check_in_deadline).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</div>
                            )}
                            {response === 'yes' && (
                                <>
                                    <p style={{ textAlign: 'center', color: 'var(--brand-600)', fontWeight: 700, fontSize: 14, marginTop: 15 }}>Đã điểm danh hôm nay 🎉</p>
                                    {!isDeadlinePassed && (
                                        <button className="btn btn-ghost btn-block" style={{ marginTop: 8, opacity: checkingIn ? 0.6 : 1 }} disabled={checkingIn} onClick={() => handleRespond('no')}>
                                            Đổi thành vắng mặt
                                        </button>
                                    )}
                                </>
                            )}
                            {response === 'no' && (
                                <>
                                    <p style={{ textAlign: 'center', color: 'var(--ink-3)', fontWeight: 700, fontSize: 14, marginTop: 15 }}>Bạn đã báo vắng buổi này</p>
                                    {!isDeadlinePassed && (
                                        <button className="btn btn-primary btn-block" style={{ marginTop: 8, opacity: checkingIn ? 0.6 : 1 }} disabled={checkingIn} onClick={() => handleRespond('yes')}>
                                            ✓ Đổi thành có mặt
                                        </button>
                                    )}
                                </>
                            )}
                            {response === null && !isDeadlinePassed && (
                                <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                                    <button className="btn btn-primary" style={{ flex: 1, padding: 15, opacity: checkingIn ? 0.6 : 1 }} disabled={checkingIn} onClick={() => handleRespond('yes')}>
                                        {checkingIn ? 'Đang xử lý...' : '✓ Điểm danh ngay · +10 điểm'}
                                    </button>
                                    <button className="btn btn-ghost" style={{ padding: '15px 18px', opacity: checkingIn ? 0.6 : 1 }} disabled={checkingIn} onClick={() => handleRespond('no')}>
                                        Vắng mặt
                                    </button>
                                </div>
                            )}
                            {isDeadlinePassed && response === null && (
                                <p style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 600, fontSize: 13, marginTop: 15 }}>⛔ Đã hết hạn điểm danh</p>
                            )}
                        </div>
                    )}

                    {/* Quick access tiles — mobile only, replaced by the 3 stat cards above on desktop */}
                    <div className="md:hidden">
                        <div className="sec-title" style={{ marginBottom: 12 }}>Truy cập nhanh</div>
                        <div className="tiles">
                            <div className="tile" style={{ cursor: 'pointer' }} onClick={() => router.push('/app/campaigns')}>
                                <div className="ic" style={{ background: 'var(--danger-050)', color: 'var(--danger)' }}>💳</div>
                                <div className="n" style={{ fontSize: 16 }}>{unpaid} khoản</div>
                                <div className="l">Chưa đóng</div>
                            </div>
                            <div className="tile" style={{ cursor: 'pointer' }} onClick={() => router.push('/app/attendance/leaderboard')}>
                                <div className="ic" style={{ background: '#FEF6E7', color: 'var(--gold)' }}>🏆</div>
                                <div className="n" style={{ fontSize: 16 }}>{stats?.rank ? `Hạng ${stats.rank}` : '—'}</div>
                                <div className="l">BXH đội</div>
                            </div>
                            <div className="tile" style={{ cursor: 'pointer' }} onClick={() => router.push('/app/attendance')}>
                                <div className="ic" style={{ background: 'var(--brand-050)', color: 'var(--brand-600)' }}>📅</div>
                                <div className="n" style={{ fontSize: 16 }}>{weekCount} buổi</div>
                                <div className="l">Tuần này</div>
                            </div>
                        </div>
                    </div>

                    {/* Upcoming sessions */}
                    {upcoming.length > 0 && (
                        <div className="card">
                            <div className="pad" style={{ paddingBottom: 6 }}>
                                <div className="sec-title">Sắp diễn ra<a onClick={() => router.push('/app/attendance')}>Xem tất cả</a></div>
                            </div>
                            {upcoming.map(s => (
                                <div className="row" key={s.id}>
                                    <div className="lead" style={{ background: s.session_type === 'match' ? 'var(--blue-050)' : 'var(--brand-050)' }}>
                                        {s.session_type === 'match' ? '⚽' : '🏃'}
                                    </div>
                                    <div className="rc">
                                        <b>{s.session_type === 'match' ? 'Trận đấu' : 'Buổi tập'}{s.location ? ` · ${s.location}` : ''}</b>
                                        <small>{fmtSession(s.session_date)}</small>
                                    </div>
                                    <span className="badge ok">Đang mở</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Mini leaderboard */}
                {leaderboard.length > 0 && (
                    <div className="card">
                        <div className="pad" style={{ paddingBottom: 6 }}>
                            <div className="sec-title">Top chuyên cần<a onClick={() => router.push('/app/attendance/leaderboard')}>Xem tất cả</a></div>
                        </div>
                        {leaderboard.slice(0, 3).map((e, i) => {
                            const isMe = String(e.user_id || e.userId) === String(user?.id)
                            const medal = ['🥇', '🥈', '🥉'][i] || ''
                            return (
                                <div className={`lb-row${isMe ? ' me' : ''}`} key={e.user_id || e.userId || i}>
                                    <div className={`rank${i < 3 ? ' top' : ''}`}>{i + 1}</div>
                                    <div className="rc" style={{ flex: 1 }}>
                                        <b style={{ fontSize: 13 }}>{medal} {e.full_name || e.userName || 'Thành viên'}{isMe ? ' (Bạn)' : ''}</b>
                                    </div>
                                    <b className="amt-pos">{e.total_points ?? e.points ?? 0}</b>
                                </div>
                            )
                        })}
                        {myEntry && !leaderboard.slice(0, 3).some(e => String(e.user_id || e.userId) === String(user?.id)) && (
                            <div className="lb-row me">
                                <div className="rank">{myEntry.rank}</div>
                                <div className="rc" style={{ flex: 1 }}><b style={{ fontSize: 13 }}>{displayName} (Bạn)</b></div>
                                <b className="amt-pos">{myEntry.total_points ?? myEntry.points ?? 0}</b>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
