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
    <div className={`flex flex-col items-center justify-center py-3xl px-lg text-center ${className || ''}`}>
      {icon && (
        <div className="mb-xl text-4xl">
          {icon}
        </div>
      )}
      <h3 className="text-heading-3 mb-md text-charcoal">{title}</h3>
      {description && (
        <p className="text-body text-gray mb-xl max-w-sm">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
