import React from 'react'

type BadgeVariant = 'approved' | 'pending' | 'rejected' | 'info'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: BadgeVariant
  children: React.ReactNode
}

const BADGE_STYLES = {
  approved: 'bg-pale-green text-approved',
  pending: 'bg-pale-yellow text-pending',
  rejected: 'bg-pale-red text-rejected',
  info: 'bg-pale-blue text-info',
}

// Custom colors for text since they're not in tailwind config
const TEXT_COLORS = {
  approved: '#346538',
  pending: '#956400',
  rejected: '#9F2F2D',
  info: '#0277BD',
}

export const Badge: React.FC<BadgeProps> = ({ variant, className, children, style, ...props }) => {
  const baseStyles = 'inline-block rounded-pill px-md py-xs text-caption font-medium'
  const bgClass = BADGE_STYLES[variant]

  return (
    <span
      className={`${baseStyles} ${bgClass} ${className || ''}`}
      style={{
        color: TEXT_COLORS[variant],
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  )
}
