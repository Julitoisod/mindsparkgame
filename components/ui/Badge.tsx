'use client'
/**
 * components/ui/Badge.tsx
 * Small coloured badge used for rarity, status, etc.
 */
import type { ReactNode } from 'react'

type BadgeVariant = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'info' | 'success' | 'warning' | 'danger'

interface BadgeProps {
  variant?:  BadgeVariant
  children:  ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  common:    'bg-primary-900/70 text-primary-100 border-primary-300/20',
  uncommon:  'bg-primary-700/20 text-primary-200 border-primary-400/30',
  rare:      'bg-primary-600/20 text-primary-200 border-primary-400/30',
  epic:      'bg-primary-500/20 text-primary-100 border-primary-300/35',
  legendary: 'bg-primary-300/25 text-primary-50 border-primary-200/40',
  info:      'bg-primary-700/20 text-primary-200 border-primary-400/30',
  success:   'bg-primary-600/25 text-primary-100 border-primary-300/35',
  warning:   'bg-primary-800/35 text-primary-100 border-primary-300/30',
  danger:    'bg-primary-950/60 text-primary-100 border-primary-200/35',
}

export default function Badge({ variant = 'common', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
