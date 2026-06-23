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
            className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 md:px-6"
            style={{
                height: '64px',
                background: 'rgba(255, 252, 249, 0.85)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderBottom: '1px solid rgba(15, 14, 12, 0.06)',
            }}
        >
            {/* Left: Hamburger + Logo */}
            <div className="flex items-center gap-3">
                {onMenuClick && (
                    <button
                        onClick={onMenuClick}
                        className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-95"
                        style={{ color: '#0F0E0C', background: 'rgba(15, 14, 12, 0.05)' }}
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
                            style={{ background: '#3D5A50' }}
                        >
                            <Football size={16} weight="fill" color="#FFFCF9" />
                        </div>
                    )}
                    <span className="font-semibold text-sm tracking-tight" style={{ color: '#0F0E0C' }}>
                        {teamName}
                    </span>
                </div>
            </div>

            {/* Right: Search */}
            {showSearch && (
                <button
                    className="flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-95"
                    style={{ color: '#9F9A93', background: 'rgba(15, 14, 12, 0.05)' }}
                    aria-label="Search"
                >
                    <MagnifyingGlass size={18} weight="bold" />
                </button>
            )}
        </header>
    )
}
