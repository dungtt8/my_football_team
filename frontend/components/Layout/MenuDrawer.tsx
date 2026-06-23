'use client'

import React, { useEffect } from 'react'
import {
  House,
  CurrencyDollar,
  Megaphone,
  Gear,
  Question,
  Info,
  SignOut,
  X,
} from 'phosphor-react'
import { Button } from '../Common/Button'

interface MenuDrawerProps {
  isOpen: boolean
  onClose: () => void
  user?: {
    name: string
    email: string
    avatar?: string
    role?: string
  }
  onNavigate?: (path: string) => void
}

interface MenuItem {
  id: string
  label: string
  path: string
  icon: React.ReactNode
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/app',
    icon: <House size={24} weight="bold" />,
  },
  {
    id: 'finance',
    label: 'Finance',
    path: '/app/finance',
    icon: <CurrencyDollar size={24} weight="bold" />,
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    path: '/app/campaigns',
    icon: <Megaphone size={24} weight="bold" />,
  },
  {
    id: 'attendance',
    label: 'Attendance',
    path: '/app/attendance',
    icon: <Gear size={24} weight="bold" />,
  },
]

const FOOTER_ITEMS: MenuItem[] = [
  {
    id: 'settings',
    label: 'Settings',
    path: '/app/menu',
    icon: <Gear size={24} weight="bold" />,
  },
  {
    id: 'help',
    label: 'Help & Support',
    path: '/help',
    icon: <Question size={24} weight="bold" />,
  },
  {
    id: 'about',
    label: 'About',
    path: '/about',
    icon: <Info size={24} weight="bold" />,
  },
]

export const MenuDrawer: React.FC<MenuDrawerProps> = ({
  isOpen,
  onClose,
  user,
  onNavigate,
}) => {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleNavigate = (path: string) => {
    onNavigate?.(path)
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40"
          onClick={handleBackdropClick}
          style={{
            animation: 'fadeIn 0.3s ease-in-out',
          }}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed left-0 top-0 bottom-0 w-80 md:w-72 max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        }}
      >
        {/* Header Section */}
        {user && (
          <div className="p-lg border-b border-light-gray">
            <div className="flex items-start justify-between mb-lg">
              <div className="flex items-center gap-lg flex-1">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-bone flex items-center justify-center">
                    <span className="text-lg font-bold text-black">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-heading-3 text-black font-bold truncate">
                    {user.name}
                  </h3>
                  <p className="text-caption text-gray truncate">
                    {user.role || user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-md text-gray hover:text-black transition-colors flex-shrink-0"
                aria-label="Close menu"
              >
                <X size={24} weight="bold" />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Menu Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Main Menu Items */}
          <nav className="p-md space-y-xs">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className="w-full flex items-center gap-lg px-md py-lg text-black hover:bg-bone transition-colors rounded-card text-left"
              >
                <span className="text-gray flex-shrink-0">{item.icon}</span>
                <span className="text-body font-medium flex-1">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Separator */}
          <div className="my-lg mx-md border-t border-light-gray" />

          {/* Footer Menu Items */}
          <nav className="p-md space-y-xs">
            {FOOTER_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className="w-full flex items-center gap-lg px-md py-lg text-black hover:bg-bone transition-colors rounded-card text-left"
              >
                <span className="text-gray flex-shrink-0">{item.icon}</span>
                <span className="text-body font-medium flex-1">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Footer Section */}
        <div className="p-lg border-t border-light-gray">
          <Button
            variant="secondary"
            size="md"
            className="w-full !text-red-600 !border-red-200"
            onClick={() => {
              // Logout logic will be handled by parent component
              onClose()
            }}
          >
            <SignOut size={20} weight="bold" className="mr-md" />
            Logout
          </Button>
        </div>
      </div>

      {/* Styles for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}
