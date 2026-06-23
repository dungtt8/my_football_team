import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?: React.ReactNode  // Trailing icon (will be nested in circle)
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  disabled,
  className,
  children,
  ...props
}) => {
  // Base: Premium pill-shaped button with soft shadow and smooth transitions
  const baseStyles = `
    font-sans font-medium
    transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
    rounded-full
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-[0.98]
    focus:outline-none focus:ring-2 focus:ring-offset-2
    flex items-center justify-center gap-2
    shadow-soft hover:shadow-medium
  `

  // Variants: High-end color palette with refined states
  const variants = {
    primary: `
      bg-espresso text-cream
      hover:bg-espresso-light
      focus:ring-sage
      focus:ring-offset-cream
    `,
    secondary: `
      bg-cream border-[1.5px] border-taupe text-espresso
      hover:bg-cream-light hover:border-sage-dark hover:shadow-soft
      focus:ring-sage
      focus:ring-offset-cream
    `,
    ghost: `
      text-espresso
      hover:bg-cream
      focus:ring-sage
      focus:ring-offset-cream
    `,
    danger: `
      bg-error-red text-cream
      hover:bg-[#B84D46]
      focus:ring-[#C85A54]
      focus:ring-offset-cream
    `,
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className || ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {children}
        </>
      ) : (
        <>
          {children}
          {icon && (
            // Button-in-Button: Nested circular icon container (Double-Bezel pattern)
            <span className="
              inline-flex items-center justify-center
              w-8 h-8
              rounded-full
              bg-black/5 dark:bg-white/10
              ml-1
              group-hover:scale-105 group-hover:translate-x-0.5
              transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
            ">
              {icon}
            </span>
          )}
        </>
      )}
    </button>
  )
}
