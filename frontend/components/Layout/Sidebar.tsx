'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { House, CheckSquare, Trophy, CreditCard, CurrencyDollar, User, Users, Wrench, SignOut, CaretLeft, CaretRight } from 'phosphor-react'
import { useAuth } from '@/hooks/useAuth'
import { useCampaign } from '@/hooks/useCampaign'
import { useFinance } from '@/hooks/useFinance'

interface NavItem {
    id: string
    label: string
    path: string
    icon: (active: boolean) => React.ReactNode
    exact?: boolean
    // Optional badge count key — matches redesign-mockup.html `.cnt` pill
    countKey?: 'campaigns' | 'admin'
}

// Player section — matches redesign-mockup.html sidebar
const NAV_ITEMS: NavItem[] = [
    { id: 'home', label: 'Trang chủ', path: '/app/home', icon: (a) => <House size={20} weight={a ? 'fill' : 'bold'} />, exact: true },
    { id: 'attendance', label: 'Điểm danh', path: '/app/attendance', icon: (a) => <CheckSquare size={20} weight={a ? 'fill' : 'bold'} />, exact: true },
    { id: 'rank', label: 'Bảng xếp hạng', path: '/app/attendance/leaderboard', icon: (a) => <Trophy size={20} weight={a ? 'fill' : 'bold'} /> },
    { id: 'campaigns', label: 'Khoản thu', path: '/app/campaigns', icon: (a) => <CreditCard size={20} weight={a ? 'fill' : 'bold'} />, countKey: 'campaigns' },
    { id: 'finance', label: 'Tài chính', path: '/app/finance', icon: (a) => <CurrencyDollar size={20} weight={a ? 'fill' : 'bold'} /> },
    { id: 'profile', label: 'Hồ sơ', path: '/app/menu', icon: (a) => <User size={20} weight={a ? 'fill' : 'bold'} /> },
]

// Management section — only for co_manager / owner
const MANAGE_ITEMS: NavItem[] = [
    { id: 'admin', label: 'Duyệt & quản lý', path: '/app/admin', icon: (a) => <Wrench size={20} weight={a ? 'fill' : 'bold'} />, countKey: 'admin' },
    { id: 'team', label: 'Đội bóng', path: '/app/team', icon: (a) => <Users size={20} weight={a ? 'fill' : 'bold'} /> },
]

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onToggle }) => {
    const pathname = usePathname()
    const router = useRouter()
    const { user, role, logout } = useAuth()
    const isManager = role === 'manager' || role === 'co_manager' || role === 'owner'
    const { listCampaigns } = useCampaign()
    const { getPendingApprovals } = useFinance()
    const [counts, setCounts] = useState<{ campaigns: number; admin: number }>({ campaigns: 0, admin: 0 })

    useEffect(() => {
        if (!user) return
        const load = async () => {
            try {
                const camps = await listCampaigns({ status: 'active' })
                let unpaid = 0
                camps.forEach((c) => {
                    const mine = c.assignments?.find((a) => String(a.user_id) === String(user.id))
                    if (mine && (mine.status === 'pending_confirmation' || mine.status === 'rejected')) unpaid++
                })
                setCounts((prev) => ({ ...prev, campaigns: unpaid }))
            } catch { }

            if (isManager) {
                try {
                    const pending = await getPendingApprovals()
                    setCounts((prev) => ({ ...prev, admin: pending.length }))
                } catch { }
            }
        }
        load()
    }, [user, isManager])

    const isActive = (item: NavItem) => {
        if (item.path === '/app/attendance') {
            return (
                pathname === '/app/attendance' ||
                pathname.startsWith('/app/attendance/sessions') ||
                pathname.startsWith('/app/attendance/records') ||
                pathname.startsWith('/app/attendance/history')
            )
        }
        if (item.exact) return pathname === item.path
        return pathname.startsWith(item.path)
    }

    const handleLogout = async () => {
        await logout()
        router.push('/login')
    }

    return (
        <aside
            className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 z-50 transition-all duration-300"
            style={{
                background: '#0C1220',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
                visibility: isOpen ? 'visible' : 'hidden',
                opacity: isOpen ? 1 : 0,
                width: '256px',
                paddingLeft: '12px',
            }}
        >
            {/* Brand */}
            <div
                className="flex items-center gap-3 px-5"
                style={{ height: '64px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
            >
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-700))', boxShadow: 'var(--shadow-brand)', fontSize: '17px' }}
                >
                    ⚽
                </div>
                <div style={{ lineHeight: 1.25 }}>
                    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '15px', color: '#fff' }}>
                        {(user as any)?.teamName || 'My Football Team'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Quản lý đội bóng</div>
                </div>
            </div>

            {/* Toggle Button */}
            {onToggle && (
                <button
                    onClick={onToggle}
                    className="absolute -right-11 top-4 md:flex hidden items-center justify-center w-9 h-9 rounded-r-xl transition-all z-40"
                    style={{
                        background: '#0C1220',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderLeft: 'none',
                        color: 'var(--brand)',
                    }}
                    title={isOpen ? 'Thu gọn' : 'Mở rộng'}
                >
                    {isOpen ? <CaretLeft size={16} weight="bold" /> : <CaretRight size={16} weight="bold" />}
                </button>
            )}

            {/* Navigation Items */}
            <nav className="flex-1 px-3 overflow-y-auto">
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', padding: '20px 12px 8px' }}>
                    Cầu thủ
                </div>
                <div className="space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const active = isActive(item)
                        return (
                            <Link
                                key={item.id}
                                href={item.path}
                                className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all"
                                style={{
                                    background: active ? 'linear-gradient(135deg, var(--brand), var(--brand-600))' : 'transparent',
                                    color: active ? '#fff' : 'rgba(255,255,255,0.68)',
                                    fontWeight: active ? 700 : 600,
                                    boxShadow: active ? 'var(--shadow-brand)' : 'none',
                                    padding: 10,
                                }}
                                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
                            >
                                {item.icon(active)}
                                <span style={{ fontSize: '14px' }}>{item.label}</span>
                                {item.countKey && counts[item.countKey] > 0 && (
                                    <span style={{
                                        marginLeft: 'auto', background: 'var(--accent)', color: '#fff',
                                        fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '99px',
                                    }}>
                                        {counts[item.countKey]}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </div>

                {isManager && (
                    <>
                        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', padding: '20px 12px 8px' }}>
                            Ban quản lý
                        </div>
                        <div className="space-y-1">
                            {MANAGE_ITEMS.map((item) => {
                                const active = isActive(item)
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.path}
                                        className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all"
                                        style={{
                                            background: active ? 'linear-gradient(135deg, var(--brand), var(--brand-600))' : 'transparent',
                                            color: active ? '#fff' : 'rgba(255,255,255,0.68)',
                                            fontWeight: active ? 700 : 600,
                                            boxShadow: active ? 'var(--shadow-brand)' : 'none',
                                            padding: 10,
                                        }}
                                        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                                        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
                                    >
                                        {item.icon(active)}
                                        <span style={{ fontSize: '14px' }}>{item.label}</span>
                                        {item.countKey && counts[item.countKey] > 0 && (
                                            <span style={{
                                                marginLeft: 'auto', background: 'var(--accent)', color: '#fff',
                                                fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '99px',
                                            }}>
                                                {counts[item.countKey]}
                                            </span>
                                        )}
                                    </Link>
                                )
                            })}
                        </div>
                    </>
                )}
            </nav>

            {/* User Section */}
            <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                {user && (
                    <div
                        className="flex items-center gap-3 mb-2"
                        style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '14px' }}
                    >
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '11px', flexShrink: 0,
                            background: 'linear-gradient(135deg, #FFB27A, var(--accent))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', fontWeight: 800, color: '#fff',
                        }}>
                            {(user.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0, lineHeight: 1.3 }}>
                            <p style={{ fontSize: '13px', color: '#fff', fontWeight: 700, fontFamily: 'var(--font-head)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user.name}
                            </p>
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user.email}
                            </p>
                        </div>
                    </div>
                )}

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                    style={{ background: 'rgba(240,68,56,0.12)', color: '#FF8A80' }}
                >
                    <SignOut size={20} weight="bold" />
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Đăng xuất</span>
                </button>
            </div>
        </aside>
    )
}

interface SidebarProps {
    isOpen?: boolean
    onToggle?: () => void
}
