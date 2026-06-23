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
}

const TAB_ITEMS: TabItem[] = [
  { id: 'finance', label: 'Finance', path: '/app/finance', icon: <CurrencyDollar size={24} weight="bold" /> },
  { id: 'campaigns', label: 'Campaigns', path: '/app/campaigns', icon: <Megaphone size={24} weight="bold" /> },
  { id: 'attendance', label: 'Attendance', path: '/app/attendance', icon: <ChartLine size={24} weight="bold" /> },
  { id: 'menu', label: 'Menu', path: '/app/menu', icon: <Gear size={24} weight="bold" /> },
]

export const BottomTabBar: React.FC = () => {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden h-20" style={{ background: '#FFFFFF', borderTop: '1px solid #D9D4D0', boxShadow: '0 -6px 16px rgba(15, 14, 12, 0.10)' }}>
      <div className="flex h-full">
        {TAB_ITEMS.map((tab) => {
          const active = isActive(tab.path)
          return (
            <Link
              key={tab.id}
              href={tab.path}
              className="flex-1 flex flex-col items-center justify-center gap-1 transition-all relative"
              style={{ color: active ? '#0F0E0C' : '#9F9A93' }}
              aria-current={active ? 'page' : undefined}
            >
              <span style={{ color: active ? '#3D5A50' : '#9F9A93' }}>
                {tab.icon}
              </span>
              <span className={`text-xs font-medium whitespace-nowrap ${
                active ? 'font-semibold' : 'font-medium'
              }`}>
                {tab.label}
              </span>
              {active && (
                <div className="absolute bottom-0 left-0 right-0 h-1 rounded-t" style={{ background: '#3D5A50' }} />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
