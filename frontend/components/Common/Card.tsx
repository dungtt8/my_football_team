import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: 'default' | 'elevated'
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  className,
  children,
  ...props
}) => {
  const baseStyles = 'rounded-card border border-light-gray bg-white p-xl'

  return (
    <div className={`${baseStyles} ${className || ''}`} {...props}>
      {children}
    </div>
  )
}
