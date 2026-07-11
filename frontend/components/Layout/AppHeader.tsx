'use client'

import React, { useState } from 'react'
import { List, MagnifyingGlass, CaretLeft, CaretRight, ArrowsDownUp, Plus } from 'phosphor-react'
import { useAuthContext } from '@/contexts/AuthContext'
import TeamSwitcher from '@/components/Common/TeamSwitcher'

interface AppHeaderProps {
    teamName?: string
    teamLogo?: string
    onMenuClick?: () => void
    showSearch?: boolean
    isSidebarOpen?: boolean
    onSidebarToggle?: () => void
    isDesktop?: boolean
    searchPlaceholder?: string
    onSearch?: (value: string) => void
    createLabel?: string
    onCreateClick?: () => void
}

export const AppHeader: React.FC<AppHeaderProps> = ({
    teamName = 'My Football Team',
    teamLogo,
    onMenuClick,
    showSearch = false,
    isSidebarOpen = true,
    onSidebarToggle,
    isDesktop = false,
    searchPlaceholder = 'Tìm cầu thủ, khoản thu, giao dịch…',
    onSearch,
    createLabel,
    onCreateClick,
}) => {
    const { user, team } = useAuthContext()
    const [teamSwitcherOpen, setTeamSwitcherOpen] = useState(false)

    const iconBtn: React.CSSProperties = {
        color: 'var(--ink-2)',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
    }

    return (
        <>
            <header
                className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 md:px-6 transition-all duration-300"
                style={{
                    height: '64px',
                    background: 'rgba(255,255,255,0.82)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderBottom: '1px solid var(--line-2)',
                    left: isDesktop && isSidebarOpen ? '256px' : '0',
                }}
            >
                {/* Left: Hamburger + Logo */}
                <div className="flex items-center gap-3">
                    {onMenuClick && (
                        <button
                            onClick={onMenuClick}
                            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-95"
                            style={iconBtn}
                            aria-label="Mở menu"
                        >
                            <List size={20} weight="bold" />
                        </button>
                    )}

                    {onSidebarToggle && (
                        <button
                            onClick={onSidebarToggle}
                            className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-95"
                            style={iconBtn}
                            aria-label="Bật/tắt thanh bên"
                        >
                            {isSidebarOpen ? <CaretLeft size={18} weight="bold" /> : <CaretRight size={18} weight="bold" />}
                        </button>
                    )}

                    <div className="flex items-center gap-2.5">
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, var(--brand), var(--brand-700))',
                                boxShadow: 'var(--shadow-brand)',
                                fontSize: '17px',
                            }}
                        >
                            ⚽
                        </div>
                        <span
                            className="font-bold text-sm tracking-tight"
                            style={{ color: 'var(--ink)', fontFamily: 'var(--font-head)' }}
                        >
                            {team?.name || teamName}
                        </span>
                    </div>
                </div>

                {/* Center: Search bar (desktop only) — matches redesign-mockup.html .dsearch */}
                {showSearch && (
                    <div
                        className="hidden md:flex items-center gap-2"
                        style={{
                            flex: 1,
                            maxWidth: '420px',
                            margin: '0 16px',
                            background: 'var(--surface-2)',
                            border: '1px solid var(--line)',
                            borderRadius: '12px',
                            padding: '10px 14px',
                            color: 'var(--ink-3)',
                        }}
                    >
                        <MagnifyingGlass size={16} weight="bold" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            onChange={(e) => onSearch?.(e.target.value)}
                            style={{
                                border: 'none',
                                outline: 'none',
                                background: 'transparent',
                                fontSize: '13px',
                                color: 'var(--ink)',
                                width: '100%',
                            }}
                        />
                    </div>
                )}

                {/* Right: Search icon (mobile) + Create + Team switcher */}
                <div className="flex items-center gap-2">
                    {showSearch && (
                        <button
                            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-95"
                            style={iconBtn}
                            aria-label="Tìm kiếm"
                        >
                            <MagnifyingGlass size={18} weight="bold" />
                        </button>
                    )}

                    {createLabel && (
                        <button
                            onClick={onCreateClick}
                            className="hidden md:flex items-center justify-center gap-2 rounded-xl transition-all active:scale-95"
                            style={{
                                padding: '10px 16px',
                                background: 'linear-gradient(135deg, var(--brand), var(--brand-600))',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '13px',
                                boxShadow: 'var(--shadow-brand)',
                                border: 'none',
                            }}
                        >
                            <Plus size={16} weight="bold" />
                            {createLabel}
                        </button>
                    )}

                    {user && (
                        <button
                            onClick={() => setTeamSwitcherOpen(true)}
                            aria-label="Chuyển đội"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '5px 10px 5px 6px',
                                borderRadius: '12px',
                                background: 'var(--surface)',
                                border: '1px solid var(--line)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                maxWidth: '170px',
                                boxShadow: 'var(--shadow-subtle)',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface)')}
                        >
                            <div style={{
                                width: '28px', height: '28px', borderRadius: '9px', flexShrink: 0,
                                background: 'linear-gradient(135deg, var(--brand), var(--brand-600))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '12px', fontWeight: 800, color: '#fff',
                            }}>
                                {(team?.name || user?.full_name || '?').charAt(0).toUpperCase()}
                            </div>
                            <span style={{
                                fontSize: '13px', fontWeight: 700, color: 'var(--ink-2)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                            }}>
                                {team?.name || 'Chọn đội'}
                            </span>
                            <ArrowsDownUp size={13} weight="bold" style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
                        </button>
                    )}
                </div>
            </header>

            <TeamSwitcher isOpen={teamSwitcherOpen} onClose={() => setTeamSwitcherOpen(false)} />
        </>
    )
}
