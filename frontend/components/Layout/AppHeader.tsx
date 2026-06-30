'use client'

import React, { useState } from 'react'
import { List, MagnifyingGlass, CaretLeft, CaretRight, ArrowsDownUp } from 'phosphor-react'
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
}

export const AppHeader: React.FC<AppHeaderProps> = ({
    teamName = 'My Football Team',
    teamLogo,
    onMenuClick,
    showSearch = false,
    isSidebarOpen = true,
    onSidebarToggle,
    isDesktop = false,
}) => {
    const { user, team, allTeams } = useAuthContext()
    const [teamSwitcherOpen, setTeamSwitcherOpen] = useState(false)

    return (
        <>
            <header
                className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 md:px-6 transition-all duration-300"
                style={{
                    height: '64px',
                    background: 'rgba(7, 11, 20, 0.80)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    left: isDesktop && isSidebarOpen ? '256px' : '0',
                }}
            >
                {/* Left: Hamburger + Logo */}
                <div className="flex items-center gap-3">
                    {/* Mobile Menu Button */}
                    {onMenuClick && (
                        <button
                            onClick={onMenuClick}
                            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-95"
                            style={{ color: 'rgba(240,244,255,0.7)', background: 'rgba(255,255,255,0.06)' }}
                            aria-label="Mở menu"
                        >
                            <List size={20} weight="bold" />
                        </button>
                    )}

                    {/* Desktop Sidebar Toggle */}
                    {onSidebarToggle && (
                        <button
                            onClick={onSidebarToggle}
                            className="hidden md:flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-95"
                            style={{ color: 'rgba(240,244,255,0.7)', background: 'rgba(255,255,255,0.06)' }}
                            aria-label="Bật/tắt thanh bên"
                        >
                            {isSidebarOpen ? <CaretLeft size={18} weight="bold" /> : <CaretRight size={18} weight="bold" />}
                        </button>
                    )}

                    <div className="flex items-center gap-2.5">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                            style={{ background: 'rgba(127, 168, 159, 0.15)', border: '1px solid rgba(127,168,159,0.2)' }}
                        >
                            ⚽
                        </div>
                        <span className="font-semibold text-sm tracking-tight" style={{ color: '#F0F4FF' }}>
                            My Football Team
                        </span>
                    </div>
                </div>

                {/* Right: Search + Profile */}
                <div className="flex items-center gap-2">
                    {showSearch && (
                        <button
                            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-95"
                            style={{ color: 'rgba(240,244,255,0.4)', background: 'rgba(255,255,255,0.06)' }}
                            aria-label="Tìm kiếm"
                        >
                            <MagnifyingGlass size={18} weight="bold" />
                        </button>
                    )}

                    {/* Team Switcher Button */}
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
                                background: 'rgba(255,255,255,0.07)',
                                border: '1px solid rgba(255,255,255,0.10)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                maxWidth: '160px',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                        >
                            {/* Avatar chữ cái */}
                            <div style={{
                                width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0,
                                background: 'rgba(0,214,143,0.2)', border: '1px solid rgba(0,214,143,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '11px', fontWeight: 700, color: '#00D68F',
                            }}>
                                {(team?.name || user?.full_name || '?').charAt(0).toUpperCase()}
                            </div>
                            {/* Tên đội */}
                            <span style={{
                                fontSize: '13px', fontWeight: 600, color: 'rgba(240,244,255,0.85)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                            }}>
                                {team?.name || 'Chọn đội'}
                            </span>
                            <ArrowsDownUp size={13} weight="bold" style={{ color: 'rgba(240,244,255,0.35)', flexShrink: 0 }} />
                        </button>
                    )}
                </div>
            </header>

            {/* Team Switcher Modal */}
            <TeamSwitcher isOpen={teamSwitcherOpen} onClose={() => setTeamSwitcherOpen(false)} />
        </>
    )
}
