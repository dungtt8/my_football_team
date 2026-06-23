import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: 'default' | 'elevated' | 'subtle'
  padding?: 'sm' | 'md' | 'lg' | 'xl'
  interactive?: boolean  // Adds hover effects for clickable cards
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'lg',
  interactive = false,
  className,
  children,
  ...props
}) => {
  // Padding mappings for premium spacing
  const paddingMap = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  }

  // Double-Bezel (Doppelrand) Architecture:
  // Outer shell: subtle background, hairline border, padding
  // Inner core: distinct background, inset highlight, nested radius
  
  const baseOuterStyles = `
    rounded-2xl
    bg-taupe/5
    ring-1 ring-espresso/5
    p-1.5
    transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
  `

  const baseInnerStyles = `
    rounded-[calc(1rem-0.375rem)]
    bg-cream
    shadow-subtle
    overflow-hidden
  `

  const variants = {
    default: '',
    elevated: `
      hover:shadow-soft
      active:shadow-medium
    `,
    subtle: `
      bg-white/0
      ring-0
      p-0
    `,
  }

  const interactiveStyles = interactive ? `
    cursor-pointer
    hover:shadow-soft
    active:scale-[0.995]
  ` : ''

  if (variant === 'subtle') {
    return (
      <div
        className={`
          rounded-xl
          bg-cream
          ${paddingMap[padding]}
          ${interactiveStyles}
          transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${className || ''}
        `}
        {...props}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      className={`${baseOuterStyles} ${variants[variant]} ${className || ''}`}
      {...props}
    >
      <div className={`${baseInnerStyles} ${paddingMap[padding]} ${interactiveStyles}`}>
        {children}
      </div>
    </div>
  )
}
