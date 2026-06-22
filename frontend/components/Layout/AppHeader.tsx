interface AppHeaderProps {
  teamName?: string
  teamLogo?: string
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  teamName = 'Football Team',
  teamLogo,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-light-gray z-40 h-16 flex items-center px-lg md:px-2xl">
      <div className="flex items-center gap-md">
        {teamLogo && (
          <img src={teamLogo} alt={teamName} className="w-10 h-10 rounded-card" />
        )}
        <div className="flex-1">
          <h1 className="text-heading-3 text-black font-serif">{teamName}</h1>
        </div>
      </div>
    </header>
  )
}
