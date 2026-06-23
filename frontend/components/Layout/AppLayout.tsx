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
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #FFFCF9 0%, #F5F3F0 100%)' }}>
      {/* Ambient background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-teal-200/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-emerald-100/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-gradient-to-br from-gray-200/10 to-transparent rounded-full blur-2xl" />
      </div>
      
      {/* Content container */}
      <div className="relative z-10 flex flex-col h-full">
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
    </div>
  )
}
