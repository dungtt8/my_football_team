'use client'

import React, { useState } from 'react'
import { List, MagnifyingGlass, CaretLeft, CaretRight, User } from 'phosphor-react'
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
    const { user, allTeams } = useAuthContext()
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
                            aria-label="Open menu"
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
                            aria-label="Toggle sidebar"
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
                            aria-label="Search"
                        >
                            <MagnifyingGlass size={18} weight="bold" />
                        </button>
                    )}

                    {/* Profile/Team Switcher Button */}
                    {user && allTeams.length > 0 && (
                        <button
                            onClick={() => setTeamSwitcherOpen(true)}
                            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-95 hover:bg-white/10"
                            style={{ color: 'rgba(240,244,255,0.7)', background: 'rgba(255,255,255,0.06)' }}
                            aria-label="Switch team"
                            title={`${allTeams.length} team${allTeams.length !== 1 ? 's' : ''}`}
                        >
                            <User size={18} weight="bold" />
                        </button>
                    )}
                </div>
            </header>

            {/* Team Switcher Modal */}
            <TeamSwitcher isOpen={teamSwitcherOpen} onClose={() => setTeamSwitcherOpen(false)} />
        </>
    )
}
