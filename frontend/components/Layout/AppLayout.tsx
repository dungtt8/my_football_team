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
        <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#070B14' }}>
            {/* Ambient gradient blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div style={{
                    position: 'absolute', top: '-120px', right: '-80px',
                    width: '420px', height: '420px',
                    background: 'radial-gradient(circle, rgba(0,214,143,0.12) 0%, transparent 70%)',
                    borderRadius: '50%',
                }} />
                <div style={{
                    position: 'absolute', bottom: '80px', left: '-100px',
                    width: '380px', height: '380px',
                    background: 'radial-gradient(circle, rgba(74,124,255,0.10) 0%, transparent 70%)',
                    borderRadius: '50%',
                }} />
                <div style={{
                    position: 'absolute', top: '45%', right: '20%',
                    width: '250px', height: '250px',
                    background: 'radial-gradient(circle, rgba(0,214,143,0.05) 0%, transparent 70%)',
                    borderRadius: '50%',
                }} />
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
                <main className="flex-1 overflow-y-auto" style={{ paddingTop: '64px', paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
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
