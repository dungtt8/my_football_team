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
  onLogout?: () => void
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
    label: 'Tổng quan',
    path: '/app',
    icon: <House size={24} weight="bold" />,
  },
  {
    id: 'finance',
    label: 'Tài chính',
    path: '/app/finance',
    icon: <CurrencyDollar size={24} weight="bold" />,
  },
  {
    id: 'campaigns',
    label: 'Chiến dịch',
    path: '/app/campaigns',
    icon: <Megaphone size={24} weight="bold" />,
  },
  {
    id: 'attendance',
    label: 'Điểm danh',
    path: '/app/attendance',
    icon: <Gear size={24} weight="bold" />,
  },
]

const FOOTER_ITEMS: MenuItem[] = [
  {
    id: 'settings',
    label: 'Cài đặt',
    path: '/app/menu',
    icon: <Gear size={24} weight="bold" />,
  },
  {
    id: 'help',
    label: 'Trợ giúp',
    path: '/help',
    icon: <Question size={24} weight="bold" />,
  },
  {
    id: 'about',
    label: 'Giới thiệu',
    path: '/about',
    icon: <Info size={24} weight="bold" />,
  },
]

export const MenuDrawer: React.FC<MenuDrawerProps> = ({
  isOpen,
  onClose,
  user,
  onNavigate,
  onLogout,
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
        className={`fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] z-50 transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        style={{
          background: 'rgba(7, 11, 20, 0.98)',
          backdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          paddingTop: '72px',
        }}
      >
        {/* Header Section */}
        {user && (
          <div className="px-4 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,214,143,0.2)' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#00D68F' }}>
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 600, color: '#F0F4FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(240,244,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.role || user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 transition-colors"
                style={{ color: 'rgba(240,244,255,0.6)', background: 'rgba(255,255,255,0.06)', width: '36px', height: '36px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Đóng menu"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Menu Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Main Menu Itex-3 py-4 space-y-1">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(240,244,255,0.7)',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as any).style.background = 'rgba(0,214,143,0.1)'
                  (e.currentTarget as any).style.color = '#00D68F'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as any).style.background = 'transparent'
                  (e.currentTarget as any).style.color = 'rgba(240,244,255,0.7)'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Separator */}
          <div style={{ margin: '12px 16px', height: '1px', background: 'rgba(255,255,255,0.07)' }} />

          {/* Footer Menu Items */}
          <nav className="px-3 py-4 space-y-1">
            {FOOTER_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(240,244,255,0.6)',
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as any).style.background = 'rgba(255,255,255,0.06)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as any).style.background = 'transparent'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Footer Section */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => {
              onLogout?.()
              onClose()
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(255,107,107,0.1)',
              border: '1px solid rgba(255,107,107,0.3)',
              color: '#FF6B6B',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as any).style.background = 'rgba(255,107,107,0.2)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as any).style.background = 'rgba(255,107,107,0.1)'
            }}
          >
            <SignOut size={20} weight="bold" />
            Đăng xuất
          </button>
        </div>
      </div>
    </>
  )
}
