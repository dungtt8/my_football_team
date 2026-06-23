'use client'

import React, { useState } from 'react'
import { AppHeader } from './AppHeader'
import { BottomTabBar } from './BottomTabBar'
import { MenuDrawer } from './MenuDrawer'
import { useRouter } from 'next/navigation'

interface AppLayoutProps {
  children: React.ReactNode
  teamName?: string
  teamLogo?: string
  user?: {
    name: string
    email: string
    avatar?: string
    role?: string
  }
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  teamName,
  teamLogo,
  user,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()

  const handleNavigate = (path: string) => {
    router.push(path)
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <AppHeader 
        teamName={teamName} 
        teamLogo={teamLogo} 
        onMenuClick={() => setIsMenuOpen(true)}
      />
      
      {/* Menu Drawer */}
      <MenuDrawer 
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        user={user}
        onNavigate={handleNavigate}
      />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto pt-16 pb-20 md:pb-0">
        <div className="w-full h-full">
          {children}
        </div>
      </main>

      {/* Bottom tab bar - mobile only */}
      <BottomTabBar />
    </div>
  )
}
