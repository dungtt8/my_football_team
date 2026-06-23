import React from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-5xl px-xl text-center ${className || ''}`}>
      {icon && (
        <div className="mb-4xl text-6xl text-sage/60 transition-transform duration-300 ease-smooth">
          {icon}
        </div>
      )}
      <h2 className="text-heading-1 mb-lg text-espresso font-serif">{title}</h2>
      {description && (
        <p className="text-body text-taupe mb-4xl max-w-md leading-loose">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
