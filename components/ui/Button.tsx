'use client'
/**
 * components/ui/Button.tsx
 * Reusable animated game-style button.
 */
import { motion } from 'framer-motion'
import type { ReactNode, ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'neon'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  icon?:     ReactNode
  children:  ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-gradient-to-r from-primary-700 to-primary-600 text-white hover:from-primary-600 hover:to-primary-500 shadow-inner-glow',
  secondary: 'bg-primary-900 border border-primary-300/20 text-primary-50 hover:bg-primary-800',
  danger:    'bg-primary-950 border border-primary-300/25 text-primary-50 hover:bg-primary-900 shadow-inner-glow',
  ghost:     'bg-transparent border border-primary-200/25 text-primary-50 hover:bg-primary-200/10',
  neon:      'bg-transparent border border-primary-400 text-primary-200 hover:bg-primary-400/10 shadow-inner-glow',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-7 py-3.5 text-base gap-2.5',
}

export default function Button({
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <motion.button
      whileHover={isDisabled ? {} : { scale: 1.03 }}
      whileTap={isDisabled  ? {} : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={[
        'inline-flex items-center justify-center rounded-lg font-semibold',
        'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-300/60',
        'select-none cursor-pointer',
        variantClasses[variant],
        sizeClasses[size],
        isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
        className,
      ].join(' ')}
      disabled={isDisabled}
      {...(props as object)}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      ) : icon}
      <span>{children}</span>
    </motion.button>
  )
}
