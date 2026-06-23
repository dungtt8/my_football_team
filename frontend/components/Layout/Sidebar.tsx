'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CurrencyDollar, Megaphone, ChartLine, Users, SignOut, CaretLeft, CaretRight } from 'phosphor-react'
import { useAuth } from '@/hooks/useAuth'

interface NavItem {
    id: string
    label: string
    path: string
    icon: React.ReactNode
}

interface SidebarProps {
    isOpen?: boolean
    onToggle?: () => void
}

const NAV_ITEMS: NavItem[] = [
    {
        id: 'finance',
        label: 'Tài Chính',
        path: '/app/finance',
        icon: <CurrencyDollar size={20} weight="regular" />,
    },
    {
        id: 'campaigns',
        label: 'Chiến Dịch',
        path: '/app/campaigns',
        icon: <Megaphone size={20} weight="regular" />,
    },
    {
        id: 'attendance',
        label: 'Điểm Danh',
        path: '/app/attendance',
        icon: <ChartLine size={20} weight="regular" />,
    },
    {
        id: 'team',
        label: 'Đội Bóng',
        path: '/app/team',
        icon: <Users size={20} weight="regular" />,
    },
]

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onToggle }) => {
    const pathname = usePathname()
    const router = useRouter()
    const { user, logout } = useAuth()

    const isActive = (path: string) => pathname.startsWith(path)

    const handleLogout = async () => {
        await logout()
        router.push('/login')
    }

    return (
        <aside
            className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 border-r z-50 transition-all duration-300"
            style={{
                background: 'rgba(7, 11, 20, 0.95)',
                backdropFilter: 'blur(20px)',
                borderColor: 'rgba(255,255,255,0.07)',
                paddingTop: '64px',
                transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
                visibility: isOpen ? 'visible' : 'hidden',
                opacity: isOpen ? 1 : 0,
                width: '256px',
            }}
        >
            {/* Toggle Button */}
            {onToggle && (
                <button
                    onClick={onToggle}
                    className="absolute -right-12 top-20 md:flex hidden items-center justify-center w-10 h-10 rounded-r-lg transition-all z-40"
                    style={{
                        background: 'rgba(7, 11, 20, 0.95)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        color: '#00D68F',
                    }}
                    title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                    {isOpen ? <CaretLeft size={16} /> : <CaretRight size={16} />}
                </button>
            )}

            {/* Navigation Items */}
            <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                    const active = isActive(item.path)
                    return (
                        <Link
                            key={item.id}
                            href={item.path}
                            className="flex items-center gap-3 px-4 py-3 rounded-12 transition-all"
                            style={{
                                background: active ? 'rgba(0,214,143,0.15)' : 'transparent',
                                color: active ? '#00D68F' : 'rgba(240,244,255,0.6)',
                                borderLeft: active ? '2px solid #00D68F' : 'none',
                                paddingLeft: active ? 'calc(16px - 2px)' : '16px',
                            }}
                        >
                            {item.icon}
                            <span style={{ fontSize: '14px', fontWeight: active ? 600 : 500 }}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
            </nav>

            {/* User Section */}
            <div
                className="px-3 py-4 border-t"
                style={{ borderColor: 'rgba(255,255,255,0.07)' }}
            >
                {user && (
                    <div className="mb-3 px-4 py-2">
                        <p style={{ fontSize: '12px', color: 'rgba(240,244,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                            Tài khoản
                        </p>
                        <p style={{ fontSize: '14px', color: '#F0F4FF', fontWeight: 500, marginBottom: '2px' }}>
                            {user.name}
                        </p>
                        <p style={{ fontSize: '12px', color: 'rgba(240,244,255,0.5)' }}>
                            {user.email}
                        </p>
                    </div>
                )}

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-12 transition-all"
                    style={{
                        background: 'rgba(255,107,107,0.1)',
                        color: '#FF6B6B',
                    }}
                >
                    <SignOut size={20} weight="regular" />
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Đăng Xuất</span>
                </button>
            </div>
        </aside>
    )
}
