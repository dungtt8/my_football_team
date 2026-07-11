'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    House,
    CheckSquare,
    Trophy,
    CreditCard,
    User,
    Plus,
} from 'phosphor-react'

interface TabItem {
    id: string
    label: string
    path: string
    icon: React.ReactNode
    iconActive: React.ReactNode
}

// Order matches redesign-mockup.html bottom nav
const TAB_ITEMS: TabItem[] = [
    {
        id: 'home',
        label: 'Trang chủ',
        path: '/app/home',
        icon: <House size={23} weight="regular" />,
        iconActive: <House size={23} weight="fill" />,
    },
    {
        id: 'attendance',
        label: 'Điểm danh',
        path: '/app/attendance',
        icon: <CheckSquare size={23} weight="regular" />,
        iconActive: <CheckSquare size={23} weight="fill" />,
    },
    {
        id: 'rank',
        label: 'BXH',
        path: '/app/attendance/leaderboard',
        icon: <Trophy size={23} weight="regular" />,
        iconActive: <Trophy size={23} weight="fill" />,
    },
    {
        id: 'campaigns',
        label: 'Khoản thu',
        path: '/app/campaigns',
        icon: <CreditCard size={23} weight="regular" />,
        iconActive: <CreditCard size={23} weight="fill" />,
    },
    {
        id: 'profile',
        label: 'Hồ sơ',
        path: '/app/menu',
        icon: <User size={23} weight="regular" />,
        iconActive: <User size={23} weight="fill" />,
    },
]

export const BottomTabBar: React.FC = () => {
    const pathname = usePathname()
    const router = useRouter()

    // Exact-ish matching so BXH (a sub-path of attendance) doesn't also light up Điểm danh
    const isActive = (path: string) => {
        if (path === '/app/attendance') {
            return (
                pathname === '/app/attendance' ||
                pathname.startsWith('/app/attendance/sessions') ||
                pathname.startsWith('/app/attendance/records') ||
                pathname.startsWith('/app/attendance/history')
            )
        }
        if (path === '/app/home') return pathname === '/app/home'
        return pathname.startsWith(path)
    }

    return (
        <>
            {/* Center FAB — quick check-in shortcut */}
            <button
                className="md:hidden fab"
                aria-label="Điểm danh nhanh"
                onClick={() => router.push('/app/attendance')}
            >
                <Plus size={26} weight="bold" />
            </button>

            <nav
                className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
                style={{
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(18px)',
                    WebkitBackdropFilter: 'blur(18px)',
                    borderTop: '1px solid var(--line-2)',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                }}
            >
                <div className="flex h-16">
                    {TAB_ITEMS.map((tab) => {
                        const active = isActive(tab.path)
                        return (
                            <Link
                                key={tab.id}
                                href={tab.path}
                                className="flex-1 flex flex-col items-center justify-center gap-1 relative transition-all active:scale-95"
                                aria-current={active ? 'page' : undefined}
                            >
                                {active && (
                                    <span
                                        className="absolute top-0 w-7 h-[3px] rounded-full"
                                        style={{
                                            background: 'var(--brand)',
                                            boxShadow: '0 2px 8px rgba(18,183,106,0.5)',
                                        }}
                                    />
                                )}

                                <span
                                    style={{
                                        color: active ? 'var(--brand-600)' : 'var(--ink-4)',
                                        transition: 'color 0.2s ease',
                                    }}
                                >
                                    {active ? tab.iconActive : tab.icon}
                                </span>

                                <span
                                    className="text-[10.5px] whitespace-nowrap"
                                    style={{
                                        color: active ? 'var(--brand-600)' : 'var(--ink-4)',
                                        fontWeight: active ? 700 : 600,
                                    }}
                                >
                                    {tab.label}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </>
    )
}
