'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CurrencyDollar,
  Megaphone,
  LineChart,
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
  { id: 'attendance', label: 'Attendance', path: '/app/attendance', icon: <LineChart size={24} weight="bold" /> },
  { id: 'menu', label: 'Menu', path: '/app/menu', icon: <Gear size={24} weight="bold" /> },
]

export const BottomTabBar: React.FC = () => {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-light-gray z-40 md:hidden">
      <div className="flex h-20">
        {TAB_ITEMS.map((tab) => {
          const active = isActive(tab.path)
          return (
            <Link
              key={tab.id}
              href={tab.path}
              className={`flex-1 flex flex-col items-center justify-center gap-xs transition-colors ${
                active
                  ? 'text-black border-t-2 border-black'
                  : 'text-gray hover:text-charcoal'
              }`}
            >
              <span className={active ? 'text-black' : 'text-gray'}>
                {tab.icon}
              </span>
              <span className="text-caption font-medium whitespace-nowrap">
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
