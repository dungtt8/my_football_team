'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { useFinance } from '@/hooks/useFinance'
import { useCheckin, type ActiveCheckIn } from '@/hooks/useCheckin'

const G = {
    glass: 'rgba(255,255,255,0.07)', glassBorder: 'rgba(255,255,255,0.10)',
    accent: '#00D68F', accentDim: 'rgba(0,214,143,0.12)',
    t1: '#F0F4FF', t2: 'rgba(240,244,255,0.55)', t3: 'rgba(240,244,255,0.30)',
    red: '#FF6B6B',
}

const ROLE_LABELS: Record<string, string> = {
    member: 'Thành viên', co_manager: 'Phó quản lý', manager: 'Quản lý', owner: 'Chủ đội',
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default function MenuPage() {
    const router = useRouter()
    const { user, role, team, logout } = useAuth()
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
    }, [role, getPaymentDeadline, getActiveCheckIn])

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

    const menuItems = [
        { label: 'Thông tin cá nhân', icon: '👤', action: () => { } },
        { label: 'Lịch sử điểm danh', icon: '📋', action: () => router.push('/app/attendance/history') },
        { label: 'Lịch sử chi tiêu', icon: '💰', action: () => router.push('/app/finance') },
        ...(role === 'owner' ? [{ label: 'Quản lý thành viên', icon: '👥', action: () => router.push('/app/team') }] : []),
        { label: 'Thông báo', icon: '🔔', action: () => { } },
        { label: 'Về ứng dụng', icon: 'ℹ️', action: () => { } },
    ]

    return (
        <div style={{ minHeight: '100vh', padding: '24px 20px', color: G.t1, width: '100%', boxSizing: 'border-box' }}>

            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: G.accent, marginBottom: '6px' }}>Tài khoản</p>
                <h1 style={{ fontSize: '32px', fontWeight: 300, fontFamily: 'serif', color: G.t1, margin: 0 }}>Menu</h1>
            </div>

            {/* Finance Payment Deadline Notification */}
            {paymentDeadline && paymentDeadline.is_active && (
                <div style={{
                    background: 'rgba(255,107,107,0.15)',
                    border: `1px solid rgba(255,107,107,0.30)`,
                    borderRadius: '16px',
                    padding: '16px 20px',
                    marginBottom: '24px',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 0 24px rgba(255,107,107,0.10)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                }}>
                    <div style={{ fontSize: '20px' }}>⏰</div>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#FF9999' }}>Thời hạn thanh toán quỹ</p>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,153,153,0.9)' }}>
                            Vui lòng thanh toán quỹ trong khoảng ngày {paymentDeadline.start_day}-{paymentDeadline.end_day} ({paymentDeadline.days_remaining} ngày còn lại)
                        </p>
                    </div>
                </div>
            )}

            {/* Check-in Notification */}
            {activeCheckIn && !activeCheckIn.responded_at && (
                <div style={{
                    background: 'rgba(0,214,143,0.12)',
                    border: `1px solid rgba(0,214,143,0.30)`,
                    borderRadius: '16px',
                    padding: '16px 20px',
                    marginBottom: '24px',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 0 24px rgba(0,214,143,0.10)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ fontSize: '18px', marginTop: '2px' }}>📋</div>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: G.accent }}>Điểm danh tham gia</p>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(0,214,143,0.85)' }}>
                                {activeCheckIn.session_type === 'training' ? '🏋️ Tập luyện' : '⚽ Trận đấu'} - {activeCheckIn.session_time} tại {activeCheckIn.session_location}
                            </p>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                <button
                                    onClick={() => handleCheckInResponse('yes')}
                                    disabled={respondingCheckIn}
                                    style={{
                                        flex: 1,
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        background: 'rgba(0,214,143,0.20)',
                                        border: `1px solid rgba(0,214,143,0.40)`,
                                        color: G.accent,
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: respondingCheckIn ? 'default' : 'pointer',
                                        opacity: respondingCheckIn ? 0.6 : 1,
                                    }}
                                >
                                    ✓ Có
                                </button>
                                <button
                                    onClick={() => handleCheckInResponse('no')}
                                    disabled={respondingCheckIn}
                                    style={{
                                        flex: 1,
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        background: 'rgba(255,107,107,0.15)',
                                        border: `1px solid rgba(255,107,107,0.30)`,
                                        color: '#FF9999',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: respondingCheckIn ? 'default' : 'pointer',
                                        opacity: respondingCheckIn ? 0.6 : 1,
                                    }}
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
                <div style={{
                    background: activeCheckIn.response === 'yes' ? 'rgba(0,214,143,0.08)' : 'rgba(255,107,107,0.08)',
                    border: `1px solid ${activeCheckIn.response === 'yes' ? 'rgba(0,214,143,0.25)' : 'rgba(255,107,107,0.25)'}`,
                    borderRadius: '16px',
                    padding: '12px 16px',
                    marginBottom: '24px',
                    backdropFilter: 'blur(12px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}>
                    <div style={{ fontSize: '16px' }}>
                        {activeCheckIn.response === 'yes' ? '✓' : '✗'}
                    </div>
                    <p style={{
                        margin: 0,
                        fontSize: '12px',
                        fontWeight: 500,
                        color: activeCheckIn.response === 'yes' ? G.accent : '#FF9999'
                    }}>
                        Bạn đã báo {activeCheckIn.response === 'yes' ? 'sẽ tham gia' : 'không tham gia'}
                    </p>
                </div>
            )}

            {/* Profile card */}
            <div style={{
                background: 'rgba(0,214,143,0.08)', border: `1px solid rgba(0,214,143,0.20)`,
                borderRadius: '24px', padding: '24px', marginBottom: '24px',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 0 40px rgba(0,214,143,0.08)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '60px', height: '60px', borderRadius: '50%', flexShrink: 0,
                        background: `linear-gradient(135deg, ${G.accent}, #00A36C)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '22px', fontWeight: 700, color: '#070B14',
                        boxShadow: '0 0 20px rgba(0,214,143,0.4)',
                    }}>{initials}</div>
                    <div>
                        <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: G.t1 }}>{displayName}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', color: G.accent, fontWeight: 600 }}>{displayRole}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: G.t3 }}>{displayTeam}</p>
                    </div>
                </div>
            </div>

            {/* Invite code card — owner/co_manager only */}
            {(role === 'owner' || role === 'co_manager') && inviteCode && (
                <div style={{ background: 'rgba(74,124,255,0.08)', border: `1px solid rgba(74,124,255,0.20)`, borderRadius: '20px', padding: '18px 20px', marginBottom: '16px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(74,124,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>Mã mời đội</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '0.2em', color: G.t1 }}>{inviteCode}</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={copyCode} style={{ padding: '8px 14px', borderRadius: '10px', background: 'rgba(74,124,255,0.15)', border: `1px solid rgba(74,124,255,0.25)`, color: '#4A7CFF', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Sao chép</button>
                            {role === 'owner' && <button onClick={handleRegenerateCode} disabled={loadingInvite} style={{ padding: '8px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${G.glassBorder}`, color: G.t3, fontSize: '12px', cursor: 'pointer' }}>Đổi mã</button>}
                        </div>
                    </div>
                </div>
            )}

            {/* Menu items */}
            <div style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '18px', overflow: 'hidden', marginBottom: '16px', backdropFilter: 'blur(12px)' }}>
                {menuItems.map((item, i) => (
                    <button key={i} onClick={item.action} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '16px 18px',
                        borderBottom: i < menuItems.length - 1 ? `1px solid rgba(255,255,255,0.05)` : 'none',
                        background: 'transparent',
                        cursor: 'pointer', textAlign: 'left',
                    } as React.CSSProperties}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '18px' }}>{item.icon}</span>
                            <span style={{ fontSize: '15px', fontWeight: 500, color: G.t1 }}>{item.label}</span>
                        </div>
                        <span style={{ color: G.t3, fontSize: '16px' }}>›</span>
                    </button>
                ))}
            </div>

            {/* Logout */}
            <button onClick={handleLogout} style={{
                width: '100%', padding: '15px', borderRadius: '16px', border: `1px solid rgba(255,107,107,0.25)`,
                background: 'rgba(255,107,107,0.08)', color: G.red, fontWeight: 600, fontSize: '15px', cursor: 'pointer',
            }}>Đăng xuất</button>

            {/* Version */}
            <p style={{ textAlign: 'center', color: G.t3, fontSize: '11px', marginTop: '24px' }}>Phiên bản 1.0.0</p>
        </div>
    )
}
