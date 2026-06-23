'use client'

import React from 'react'
import { List, MagnifyingGlass, Football } from 'phosphor-react'

interface AppHeaderProps {
    teamName?: string
    teamLogo?: string
    onMenuClick?: () => void
    showSearch?: boolean
}

export const AppHeader: React.FC<AppHeaderProps> = ({
    teamName = 'Football Team',
    teamLogo,
    onMenuClick,
    showSearch = false,
}) => {
    return (
        <header
            className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 md:px-6 md:left-64"
            style={{
                height: '64px',
                background: 'rgba(7, 11, 20, 0.80)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}
        >
            {/* Left: Hamburger + Logo */}
            <div className="flex items-center gap-3">
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

                <div className="flex items-center gap-2.5">
                    {teamLogo ? (
                        <img src={teamLogo} alt={teamName} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #00D68F, #00A36C)' }}
                        >
                            <Football size={16} weight="fill" color="#070B14" />
                        </div>
                    )}
                    <span className="font-semibold text-sm tracking-tight" style={{ color: '#F0F4FF' }}>
                        {teamName}
                    </span>
                </div>
            </div>

            {/* Right: Search */}
            {showSearch && (
                <button
                    className="flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-95"
                    style={{ color: 'rgba(240,244,255,0.4)', background: 'rgba(255,255,255,0.06)' }}
                    aria-label="Search"
                >
                    <MagnifyingGlass size={18} weight="bold" />
                </button>
            )}
        </header>
    )
}
