'use client'

import React, { useState } from 'react'
import { AppHeader } from './AppHeader'
import { BottomTabBar } from './BottomTabBar'
import { MenuDrawer } from './MenuDrawer'
import { Sidebar } from './Sidebar'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false) // Default closed on mobile
    // Lazy-initialize from window.innerWidth on the client to avoid an initial
    // layout flash (server always renders `false`, then client would otherwise
    // flip to `true` a tick later on desktop). `typeof window` guard keeps this
    // safe during SSR, where it falls back to `false` same as before.
    const [isDesktop, setIsDesktop] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth >= 768 : false
    )

    React.useEffect(() => {
        // Check if desktop on mount
        const checkDesktop = () => setIsDesktop(window.innerWidth >= 768)
        checkDesktop()
        window.addEventListener('resize', checkDesktop)
        return () => window.removeEventListener('resize', checkDesktop)
    }, [])

    // Expose the sidebar's width as a CSS variable so full-screen modals
    // (position: fixed, rendered from anywhere in the app) can center
    // themselves in the content area instead of the whole viewport.
    React.useEffect(() => {
        document.documentElement.style.setProperty(
            '--content-left-offset',
            isDesktop && isSidebarOpen ? '256px' : '0px'
        )
    }, [isDesktop, isSidebarOpen])

    const router = useRouter()
    const { logout } = useAuth()

    const handleNavigate = (path: string) => {
        router.push(path)
    }

    const handleLogout = async () => {
        await logout()
        router.push('/login')
    }

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: 'transparent' }}>
            {/* Desktop Sidebar */}
            <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />

            {/* Main content area */}
            <div className="flex flex-col flex-1">
                {/* Content container */}
                <div className="relative z-10 flex flex-col h-full overflow-hidden">
                    <AppHeader
                        teamName={teamName}
                        teamLogo={teamLogo}
                        onMenuClick={() => setIsMenuOpen(true)}
                        isSidebarOpen={isSidebarOpen}
                        onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                        isDesktop={isDesktop}
                    />

                    {/* Menu Drawer - Mobile only */}
                    <MenuDrawer
                        isOpen={isMenuOpen}
                        onClose={() => setIsMenuOpen(false)}
                        user={user}
                        onNavigate={handleNavigate}
                        onLogout={handleLogout}
                    />

                    {/* Main content area */}
                    <main className="flex-1 overflow-y-auto transition-all duration-300" style={{
                        paddingTop: 0,
                        paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
                        marginLeft: isDesktop && isSidebarOpen ? '256px' : '0',
                        marginTop: '64px',
                        width: isDesktop && isSidebarOpen ? 'calc(100% - 256px)' : '100%',
                        boxSizing: 'border-box'
                    }}>
                        <div className="w-full h-full">
                            {children}
                        </div>
                    </main>

                    {/* Bottom tab bar - mobile only */}
                    <BottomTabBar />
                </div>
            </div>
        </div>
    )
}
