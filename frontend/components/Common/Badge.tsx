import React from 'react'

type BadgeVariant = 'approved' | 'pending' | 'rejected' | 'info' | 'draft'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: BadgeVariant
  children: React.ReactNode
}

const BADGE_STYLES = {
  approved: 'bg-pale-green text-success-green',
  pending: 'bg-pale-yellow text-warning-yellow',
  rejected: 'bg-pale-red text-error-red',
  info: 'bg-pale-blue text-info-blue',
  draft: 'bg-taupe/10 text-taupe',
}

export const Badge: React.FC<BadgeProps> = ({ variant, className, children, ...props }) => {
  const baseStyles = 'inline-flex items-center rounded-full px-lg py-xs text-caption font-medium transition-all duration-300 ease-smooth'
  const bgClass = BADGE_STYLES[variant]

  return (
    <span
      className={`${baseStyles} ${bgClass} ${className || ''}`}
      {...props}
    >
      {children}
    </span>
  )
}
