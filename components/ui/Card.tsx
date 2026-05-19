'use client'
/**
 * components/ui/Card.tsx
 * Glassmorphism-style card for the game UI.
 */
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface CardProps {
  children:   ReactNode
  className?: string
  glow?:      'blue' | 'purple' | 'green' | 'pink' | false
  hover?:     boolean
  padding?:   'sm' | 'md' | 'lg' | 'none'
}

const glowClasses = {
  blue:   'border-primary-400/30 shadow-inner-glow',
  purple: 'border-primary-300/30 shadow-inner-glow',
  green:  'border-primary-400/30 shadow-inner-glow',
  pink:   'border-primary-600/30 shadow-inner-glow',
}

const paddingClasses = {
  none: '',
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-8',
}

export default function Card({
  children,
  className = '',
  glow      = false,
  hover     = false,
  padding   = 'md',
}: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
      transition={{ duration: 0.3 }}
      className={[
        'relative rounded-2xl bg-dark-600/86 backdrop-blur-md',
        'border border-primary-200/15',
        glow ? glowClasses[glow] : '',
        paddingClasses[padding],
        className,
      ].join(' ')}
    >
      {/* subtle inner gradient */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-100/[0.05] to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
