'use client'
/**
 * components/auth/LoginForm.tsx
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { User, Lock, LogIn, Eye, EyeOff } from 'lucide-react'
import Input  from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

export default function LoginForm() {
  const router = useRouter()
  const { login } = useAuth({ checkSession: false })

  const [identifier,   setIdentifier]   = useState('')
  const [password,    setPassword]    = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}

    if (!identifier) errs.identifier = 'Username is required'
    if (!password) errs.password = 'Password is required'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setErrors({})
    const user = await login({ identifier, password })
    setLoading(false)

    if (user?.role === 'teacher') {
      router.replace('/teacher/dashboard')
    } else if (user?.role === 'student') {
      const charRes = await fetch('/api/character', { credentials: 'include' })
      const charJson = await charRes.json()
      const hasCharacter = charJson.success && charJson.data?.length > 0
      router.replace(hasCharacter ? '/dashboard' : '/character-select')
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y:  0 }}
      className="space-y-5"
      noValidate
    >
      <Input
        label="Username"
        type="text"
        placeholder="hero123"
        autoComplete="username"
        value={identifier}
        onChange={e => setIdentifier(e.target.value)}
        error={errors.identifier}
        icon={<User className="w-4 h-4" />}
      />
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-primary-100">Password</label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-300 pointer-events-none">
            <Lock className="w-4 h-4" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={[
              'w-full rounded-xl bg-dark-500 border',
              errors.password ? 'border-primary-200 focus:ring-primary-300/30' : 'border-primary-200/20 focus:ring-primary-300/30',
              'text-white placeholder-primary-100/45',
              'px-4 py-3 text-sm pl-10',
              'focus:outline-none focus:ring-2 focus:border-primary-300/60',
              'transition-all duration-200',
              'autofill:bg-dark-500',
            ].join(' ')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-300 hover:text-primary-100 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs font-semibold text-primary-100">{errors.password}</p>}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={loading}
        icon={<LogIn className="w-4 h-4" />}
        className="w-full"
      >
        Sign In
      </Button>
    </motion.form>
  )
}
