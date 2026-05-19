'use client'
/**
 * components/ui/Input.tsx
 * Styled text input matching the dark game theme.
 */
import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:     string
  error?:     string
  icon?:      ReactNode
  containerClassName?: string
}

export default function Input({
  label,
  error,
  icon,
  containerClassName = '',
  className = '',
  ...props
}: InputProps) {
  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-primary-100">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-300 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          className={[
            'w-full rounded-xl bg-dark-500 border',
            error ? 'border-primary-200 focus:ring-primary-300/30' : 'border-primary-200/20 focus:ring-primary-300/30',
            'text-white placeholder-primary-100/45',
            'px-4 py-3 text-sm',
            icon ? 'pl-10' : '',
            'focus:outline-none focus:ring-2 focus:border-primary-300/60',
            'transition-all duration-200',
            'autofill:bg-dark-500',
            className,
          ].join(' ')}
          {...props}
        />
      </div>
      {error && <p className="text-xs font-semibold text-primary-100">{error}</p>}
    </div>
  )
}
