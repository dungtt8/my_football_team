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
    <header className="fixed top-0 left-0 right-0 bg-cream shadow-subtle z-40 h-20 flex items-center px-lg md:px-2xl py-lg transition-all duration-300 ease-smooth">
      <div className="flex items-center justify-between w-full">
        {/* Left: Logo & Team Name */}
        <div className="flex items-center gap-md flex-1">
          {/* Hamburger menu - mobile only */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="md:hidden p-md text-espresso hover:bg-taupe/10 transition-colors rounded-full"
              aria-label="Open menu"
            >
              <List size={24} weight="bold" />
            </button>
          )}

          {teamLogo && (
            <img src={teamLogo} alt={teamName} className="w-12 h-12 rounded-xl object-cover" />
          )}
          <h1 className="text-heading-2 text-espresso font-serif hidden md:block">
            {teamName}
          </h1>
        </div>

        {/* Right: Search (optional) */}
        {showSearch && (
          <button
            className="p-md text-taupe hover:text-espresso transition-colors duration-300 ease-smooth"
            aria-label="Search"
          >
            <MagnifyingGlass size={24} weight="bold" />
          </button>
        )}
      </div>
    </header>
  )
}
