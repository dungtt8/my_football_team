'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { useFinance } from '@/hooks/useFinance'
import { useCheckin, type ActiveCheckIn } from '@/hooks/useCheckin'

const ROLE_LABELS: Record<string, string> = {
    member: 'Thành viên', co_manager: 'Phó quản lý', manager: 'Quản lý', owner: 'Chủ đội',
}

const BADGES: [string, string][] = [
    ['⚽', 'Ra sân'], ['🔥', 'Chuỗi'], ['💰', 'Đóng quỹ đủ'], ['⏱️', 'Đúng giờ'],
    ['🏃', 'Chăm tập'], ['🎯', 'Ghi bàn'], ['🤝', 'Fair-play'], ['🔒', '...'],
]

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default function MenuPage() {
    const router = useRouter()
    const { user, role, team, logout, isLoading: authLoading } = useAuth()
    const { toast } = useToast()
    const { getPaymentDeadline } = useFinance()
    const { getActiveCheckIn, respondToCheckIn } = useCheckin()
    const [inviteCode, setInviteCode] = useState<string | null>(null)
    const [loadingInvite, setLoadingInvite] = useState(false)
    const [paymentDeadline, setPaymentDeadline] = useState<any>(null)
    const [activeCheckIn, setActiveCheckIn] = useState<ActiveCheckIn | null>(null)
    const [respondingCheckIn, setRespondingCheckIn] = useState(false)

    const displayName = (user as any)?.full_name || (user as any)?.name || user?.email || 'Thành viên'
    const displayRole = role ? (ROLE_LABELS[role] || role) : 'Thành viên'
    const displayTeam = team?.name || 'Đội bóng'
    const initials = displayName.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase()

    useEffect(() => {
        if (authLoading) return
        if (role === 'owner' || role === 'co_manager') {
            const token = localStorage.getItem('auth_token')
            fetch(`${API_URL}/team/invite`, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.json()).then(d => { if (d.invite_code) setInviteCode(d.invite_code) }).catch(() => { })
        }

        // Fetch payment deadline
        getPaymentDeadline()
            .then(data => setPaymentDeadline(data?.payment_deadline))
            .catch(() => { })

        // Fetch active check-in
        getActiveCheckIn()
            .then(data => {
                if (data.check_in) {
                    setActiveCheckIn(data.check_in)
                }
            })
            .catch(() => { })
    }, [authLoading, role])

    const handleRegenerateCode = async () => {
        setLoadingInvite(true)
        try {
            const token = localStorage.getItem('auth_token')
            const res = await fetch(`${API_URL}/team/invite/regenerate`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
            const d = await res.json()
            setInviteCode(d.invite_code)
            toast('Đã tạo mã mời mới', 'success')
        } catch { toast('Lỗi', 'error') }
        finally { setLoadingInvite(false) }
    }

    const copyCode = () => {
        if (!inviteCode) return
        navigator.clipboard.writeText(inviteCode)
        toast('Đã sao chép mã mời', 'success')
    }

    const handleCheckInResponse = async (response: 'yes' | 'no') => {
        if (!activeCheckIn || respondingCheckIn) return
        setRespondingCheckIn(true)
        try {
            await respondToCheckIn(activeCheckIn.id, response)
            setActiveCheckIn({ ...activeCheckIn, response, responded_at: new Date().toISOString() })
            toast(response === 'yes' ? 'Bạn sẽ tham gia ✓' : 'Bạn sẽ không tham gia', 'success')
        } catch {
            toast('Lỗi khi lưu lựa chọn', 'error')
        } finally {
            setRespondingCheckIn(false)
        }
    }

    const handleLogout = async () => {
        try {
            await logout()
            router.push('/login')
            toast('Đã đăng xuất', 'success')
        } catch { router.push('/login') }
    }

    const menuItems: { label: string; sub?: string; icon: string; action: () => void }[] = [
        { label: 'Thông tin cá nhân', sub: 'Tên, số áo, vị trí', icon: '👤', action: () => router.push('/app/menu/settings') },
        { label: 'Lịch sử điểm danh', sub: 'Buổi tập, trận đấu', icon: '📋', action: () => router.push('/app/attendance/history') },
        { label: 'Lịch sử chi tiêu', sub: 'Đóng quỹ, thu chi', icon: '💰', action: () => router.push('/app/finance') },
        ...(role === 'owner' ? [{ label: 'Quản lý thành viên', sub: 'Duyệt, phân quyền', icon: '👥', action: () => router.push('/app/team') }] : []),
        { label: 'Thông báo', sub: 'Nhắc điểm danh, đóng quỹ', icon: '🔔', action: () => { } },
        { label: 'Về ứng dụng', sub: 'Phiên bản 1.0.0', icon: 'ℹ️', action: () => { } },
    ]

    // ---- Reusable pieces ----

    const notificationsEl = (
        <>
            {/* Finance Payment Deadline Notification */}
            {paymentDeadline && paymentDeadline.is_active && (
                <div className="card pad" style={{ borderColor: 'var(--danger)', background: 'var(--danger-050)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 20 }}>⏰</div>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--danger)' }}>Thời hạn thanh toán quỹ</p>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>
                            Vui lòng thanh toán quỹ trong khoảng ngày {paymentDeadline.start_day}-{paymentDeadline.end_day} ({paymentDeadline.days_remaining} ngày còn lại)
                        </p>
                    </div>
                </div>
            )}

            {/* Check-in Notification */}
            {activeCheckIn && !activeCheckIn.responded_at && (
                <div className="card pad" style={{ borderColor: 'var(--brand-100)', background: 'var(--brand-050)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ fontSize: 18, marginTop: 2 }}>📋</div>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--brand-700)' }}>Điểm danh tham gia</p>
                            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>
                                {activeCheckIn.session_type === 'training' ? '🏋️ Tập luyện' : '⚽ Trận đấu'} - {activeCheckIn.session_time} tại {activeCheckIn.session_location}
                            </p>
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleCheckInResponse('yes')}
                                    disabled={respondingCheckIn}
                                    style={{ flex: 1, opacity: respondingCheckIn ? 0.6 : 1 }}
                                >
                                    ✓ Có
                                </button>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleCheckInResponse('no')}
                                    disabled={respondingCheckIn}
                                    style={{ flex: 1, color: 'var(--danger)', opacity: respondingCheckIn ? 0.6 : 1 }}
                                >
                                    ✗ Không
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Check-in Confirmed */}
            {activeCheckIn && activeCheckIn.responded_at && (
                <div className="card pad" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 16, color: activeCheckIn.response === 'yes' ? 'var(--brand-600)' : 'var(--danger)' }}>
                        {activeCheckIn.response === 'yes' ? '✓' : '✗'}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: activeCheckIn.response === 'yes' ? 'var(--brand-700)' : 'var(--danger)' }}>
                        Bạn đã báo {activeCheckIn.response === 'yes' ? 'sẽ tham gia' : 'không tham gia'}
                    </p>
                </div>
            )}
        </>
    )

    // Profile header — centered layout for mobile (matches M.profile)
    const profileHeaderMobileEl = (
        <div className="card pad" style={{ textAlign: 'center' }}>
            <div className="avatar" style={{ width: 84, height: 84, borderRadius: 26, fontSize: 28, margin: '6px auto 14px' }}>{initials}</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800 }}>{displayName}</div>
            <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 2 }}>{displayRole} · {displayTeam}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
                <span className="chip soft">{displayRole}</span>
                <span className="chip blue">{displayTeam}</span>
            </div>
        </div>
    )

    // Profile header — left-aligned row layout for desktop (matches D.profile)
    const profileHeaderDesktopEl = (
        <div className="card pad" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div className="avatar" style={{ width: 82, height: 82, borderRadius: 24, fontSize: 28, flexShrink: 0 }}>{initials}</div>
            <div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800 }}>{displayName}</div>
                <div style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 2 }}>{displayRole} · {displayTeam}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <span className="chip soft">{displayRole}</span>
                    <span className="chip blue">{displayTeam}</span>
                </div>
            </div>
        </div>
    )

    const tilesEl = (
        <div className="tiles">
            <div className="tile"><div className="n">—</div><div className="l">Điểm mùa</div></div>
            <div className="tile"><div className="n">—</div><div className="l">Chuyên cần</div></div>
            <div className="tile"><div className="n">—</div><div className="l">Huy hiệu</div></div>
        </div>
    )

    const badgesEl = (
        <div>
            <div className="sec-title" style={{ marginBottom: 12 }}>Huy hiệu đã đạt</div>
            <div className="card pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, textAlign: 'center' }}>
                {BADGES.map(([e, n], i) => (
                    <div key={i} style={{ opacity: i === 7 ? 0.35 : 1 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', fontSize: 22, margin: '0 auto 6px' }}>{e}</div>
                        <small style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600 }}>{n}</small>
                    </div>
                ))}
            </div>
        </div>
    )

    const inviteCodeEl = (role === 'owner' || role === 'co_manager') && inviteCode && (
        <div>
            <div className="sec-title" style={{ marginBottom: 12 }}>Mã mời đội</div>
            <div className="card pad">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, letterSpacing: '0.2em' }}>{inviteCode}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary btn-sm" onClick={copyCode}>Sao chép</button>
                        {role === 'owner' && <button className="btn btn-ghost btn-sm" onClick={handleRegenerateCode} disabled={loadingInvite}>Đổi mã</button>}
                    </div>
                </div>
            </div>
        </div>
    )

    const settingsListEl = (
        <div className="card">
            {menuItems.map((item, i) => (
                <div
                    key={i}
                    className="row"
                    onClick={item.action}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="lead" style={{ background: 'var(--surface-2)' }}>{item.icon}</div>
                    <div className="rc"><b>{item.label}</b>{item.sub && <small>{item.sub}</small>}</div>
                    <span style={{ color: 'var(--ink-4)' }}>›</span>
                </div>
            ))}
            <div className="row" onClick={handleLogout} style={{ cursor: 'pointer' }}>
                <div className="lead" style={{ background: 'var(--danger-050)' }}>↩️</div>
                <div className="rc"><b style={{ color: 'var(--danger)' }}>Đăng xuất</b></div>
            </div>
        </div>
    )

    return (
        <div className="screen-body" style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>

            {/* Desktop header — matches mockup D.profile .page-h (mobile has no page title, per M.profile) */}
            <div className="hidden md:block page-h">
                <h1>Hồ sơ cầu thủ</h1>
            </div>

            {notificationsEl}

            {/* Mobile layout — matches mockup M.profile: profile card, tiles, badges, invite, settings */}
            <div className="md:hidden">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {profileHeaderMobileEl}
                    {tilesEl}
                    {badgesEl}
                    {inviteCodeEl}
                    {settingsListEl}
                </div>
            </div>

            {/* Desktop layout — matches mockup D.profile: profile+badges (left) | settings (right) */}
            <div className="hidden md:block">
                <div className="dgrid">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {profileHeaderDesktopEl}
                        {badgesEl}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {settingsListEl}
                    </div>
                </div>
                <div style={{ marginTop: 20 }}>
                    {inviteCodeEl}
                </div>
            </div>
        </div>
    )
}
