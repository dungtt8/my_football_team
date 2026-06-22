import { AppHeader } from './AppHeader'
import { BottomTabBar } from './BottomTabBar'

interface AppLayoutProps {
  children: React.ReactNode
  teamName?: string
  teamLogo?: string
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  teamName,
  teamLogo,
}) => {
  return (
    <div className="flex flex-col h-screen bg-white">
      <AppHeader teamName={teamName} teamLogo={teamLogo} />
      
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
