'use client'

import React from 'react'
import { List, MagnifyingGlass } from 'phosphor-react'

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
    <header className="fixed top-0 left-0 right-0 z-40 h-20 flex items-center px-4 md:px-8 py-4 transition-all duration-300" style={{ background: '#FFFFFF', boxShadow: '0 6px 16px rgba(15, 14, 12, 0.10)' }}>
      <div className="flex items-center justify-between w-full">
        {/* Left: Logo & Team Name */}
        <div className="flex items-center gap-3 flex-1">
          {/* Hamburger menu - mobile only */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 transition-colors rounded-lg"
              style={{ color: '#0F0E0C' }}
              aria-label="Open menu"
            >
              <List size={24} weight="bold" />
            </button>
          )}

          {teamLogo && (
            <img src={teamLogo} alt={teamName} className="w-12 h-12 rounded-lg object-cover" />
          )}
          <h1 className="hidden md:block font-serif font-light text-2xl" style={{ color: '#0F0E0C' }}>
            {teamName}
          </h1>
        </div>

        {/* Right: Search (optional) */}
        {showSearch && (
          <button
            className="p-2 transition-colors duration-300 rounded-lg"
            style={{ color: '#9F9A93' }}
            aria-label="Search"
          >
            <MagnifyingGlass size={24} weight="bold" />
          </button>
        )}
      </div>
    </header>
  )
}
