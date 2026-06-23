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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-light-gray z-40 md:hidden h-20">
      <div className="flex h-full">
        {TAB_ITEMS.map((tab) => {
          const active = isActive(tab.path)
          return (
            <Link
              key={tab.id}
              href={tab.path}
              className={`flex-1 flex flex-col items-center justify-center gap-xs transition-all ${
                active
                  ? 'text-black'
                  : 'text-gray hover:text-charcoal'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <span className={`transition-colors ${active ? 'text-black' : 'text-gray'}`}>
                {tab.icon}
              </span>
              <span className={`text-caption font-medium whitespace-nowrap ${
                active ? 'font-bold' : 'font-medium'
              }`}>
                {tab.label}
              </span>
              {active && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black rounded-t-card" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
