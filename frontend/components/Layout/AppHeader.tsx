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
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-light-gray z-40 h-16 flex items-center px-lg md:px-2xl">
      <div className="flex items-center justify-between w-full">
        {/* Left: Logo & Team Name */}
        <div className="flex items-center gap-md flex-1">
          {/* Hamburger menu - mobile only */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="md:hidden p-md text-black hover:bg-bone transition-colors rounded-button"
              aria-label="Open menu"
            >
              <List size={24} weight="bold" />
            </button>
          )}

          {teamLogo && (
            <img src={teamLogo} alt={teamName} className="w-10 h-10 rounded-card" />
          )}
          <h1 className="text-heading-3 text-black font-serif hidden md:block">
            {teamName}
          </h1>
        </div>

        {/* Right: Search (optional) */}
        {showSearch && (
          <button
            className="p-md text-gray hover:text-black transition-colors"
            aria-label="Search"
          >
            <MagnifyingGlass size={24} weight="bold" />
          </button>
        )}
      </div>
    </header>
  )
}
