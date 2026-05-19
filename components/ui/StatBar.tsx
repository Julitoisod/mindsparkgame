'use client'
/**
 * components/ui/StatBar.tsx
 * Animated HP / MP / XP progress bar used throughout the HUD.
 */
import { motion } from 'framer-motion'

interface StatBarProps {
  label:    string
  value:    number
  max:      number
  color?:   'blue' | 'red' | 'green' | 'purple' | 'yellow'
  showText?: boolean
}

const colorMap = {
  blue:   'from-primary-300 to-primary-600',
  red:    'from-primary-200 to-primary-700',
  green:  'from-primary-400 to-primary-600',
  purple: 'from-primary-400 to-primary-700',
  yellow: 'from-primary-100 to-primary-500',
}

export default function StatBar({ label, value, max, color = 'green', showText = true }: StatBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-primary-100/70">
        <span className="font-semibold uppercase tracking-wider">{label}</span>
        {showText && <span>{value} / {max}</span>}
      </div>
      <div className="h-2 rounded-full bg-primary-950/70 overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${colorMap[color]}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
