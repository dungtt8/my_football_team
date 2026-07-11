'use client'

import React, { useEffect } from 'react'
import {
  ChartLine,
  CurrencyDollar,
  Megaphone,
  Users,
  Gear,
  Question,
  Info,
  SignOut,
  X,
} from 'phosphor-react'

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
  { id: 'attendance', label: 'Điểm danh', path: '/app/attendance', icon: <ChartLine size={22} weight="bold" /> },
  { id: 'campaigns', label: 'Khoản thu', path: '/app/campaigns', icon: <Megaphone size={22} weight="bold" /> },
  { id: 'finance', label: 'Tài chính', path: '/app/finance', icon: <CurrencyDollar size={22} weight="bold" /> },
  { id: 'team', label: 'Đội bóng', path: '/app/team', icon: <Users size={22} weight="bold" /> },
]

const FOOTER_ITEMS: MenuItem[] = [
  { id: 'settings', label: 'Cài đặt', path: '/app/menu', icon: <Gear size={22} weight="bold" /> },
  { id: 'help', label: 'Trợ giúp', path: '/help', icon: <Question size={22} weight="bold" /> },
  { id: 'about', label: 'Giới thiệu', path: '/about', icon: <Info size={22} weight="bold" /> },
]

export const MenuDrawer: React.FC<MenuDrawerProps> = ({
  isOpen,
  onClose,
  user,
  onNavigate,
  onLogout,
}) => {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  const handleNavigate = (path: string) => {
    onNavigate?.(path)
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  const itemBase: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '14px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--ink-2)',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.15s ease',
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleBackdropClick}
          style={{ background: 'rgba(11,18,32,0.35)', animation: 'fadeIn 0.25s ease-in-out' }}
        />
      )}

      <div
        className={`fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] z-50 transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          background: 'var(--surface)',
          borderRight: '1px solid var(--line)',
          boxShadow: 'var(--shadow-deep)',
        }}
      >
        {/* Header Section */}
        <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--line-2)', paddingTop: 'calc(env(safe-area-inset-top) + 20px)' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #FFB27A, var(--accent))' }}
              >
                <span style={{ fontSize: '17px', fontWeight: 800, color: '#fff' }}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 800, fontFamily: 'var(--font-head)', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name || 'Thành viên'}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.role || user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0"
              style={{ color: 'var(--ink-2)', background: 'var(--surface-2)', width: '38px', height: '38px', borderRadius: '11px', border: '1px solid var(--line)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Đóng menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Menu Content */}
        <div className="flex-1 overflow-y-auto">
          <nav className="px-3 py-4 space-y-1">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                style={itemBase}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--brand-050)'; e.currentTarget.style.color = 'var(--brand-700)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-2)' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div style={{ margin: '8px 18px', height: '1px', background: 'var(--line-2)' }} />

          <nav className="px-3 py-2 space-y-1">
            {FOOTER_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                style={{ ...itemBase, fontSize: '13px', color: 'var(--ink-3)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Footer Section */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--line-2)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
          <button
            onClick={() => { onLogout?.(); onClose() }}
            style={{
              width: '100%',
              padding: '13px 16px',
              borderRadius: '14px',
              background: 'var(--color-error-050)',
              border: '1px solid rgba(240,68,56,0.2)',
              color: 'var(--color-error)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
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
