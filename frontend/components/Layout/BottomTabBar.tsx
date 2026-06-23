'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    CurrencyDollar,
    Megaphone,
    ChartLine,
    Gear,
} from 'phosphor-react'

interface TabItem {
    id: string
    label: string
    path: string
    icon: React.ReactNode
    iconActive: React.ReactNode
}

const TAB_ITEMS: TabItem[] = [
    {
        id: 'finance',
        label: 'Tài chính',
        path: '/app/finance',
        icon: <CurrencyDollar size={22} weight="regular" />,
        iconActive: <CurrencyDollar size={22} weight="fill" />,
    },
    {
        id: 'campaigns',
        label: 'Chiến dịch',
        path: '/app/campaigns',
        icon: <Megaphone size={22} weight="regular" />,
        iconActive: <Megaphone size={22} weight="fill" />,
    },
    {
        id: 'attendance',
        label: 'Điểm danh',
        path: '/app/attendance',
        icon: <ChartLine size={22} weight="regular" />,
        iconActive: <ChartLine size={22} weight="fill" />,
    },
    {
        id: 'menu',
        label: 'Menu',
        path: '/app/menu',
        icon: <Gear size={22} weight="regular" />,
        iconActive: <Gear size={22} weight="fill" />,
    },
]

export const BottomTabBar: React.FC = () => {
    const pathname = usePathname()

    const isActive = (path: string) => pathname.startsWith(path)

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
            style={{
                background: 'rgba(255, 252, 249, 0.92)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(15, 14, 12, 0.06)',
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
                            {/* Active pill indicator */}
                            {active && (
                                <span
                                    className="absolute top-1.5 w-8 h-1 rounded-full"
                                    style={{ background: '#3D5A50' }}
                                />
                            )}

                            <span
                                style={{
                                    color: active ? '#3D5A50' : '#9F9A93',
                                    transition: 'color 0.2s ease',
                                }}
                            >
                                {active ? tab.iconActive : tab.icon}
                            </span>

                            <span
                                className="text-[10px] font-medium whitespace-nowrap"
                                style={{
                                    color: active ? '#3D5A50' : '#9F9A93',
                                    fontWeight: active ? 600 : 500,
                                }}
                            >
                                {tab.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
