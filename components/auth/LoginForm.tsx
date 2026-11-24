'use client'
/**
 * components/auth/LoginForm.tsx
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { User, Lock, LogIn, Eye, EyeOff, Mail } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { isStudentApp } from '@/lib/appTarget'
import type { LoginPortal } from '@/types/user'

/**
 * `theme="student"` renders the light card used by the student login page
 * (2026-10 revision item 12); the default is the admin/teacher sign-in card
 * (light, icon-badge fields — Nov 2026b).
 * `portal` tells the server which web link this is, so it refuses the other role.
 */
export default function LoginForm({ theme = 'default', portal }: { theme?: 'default' | 'student'; portal?: LoginPortal }) {
  const student = theme === 'student'
  const router = useRouter()
  const { login, logout } = useAuth({ checkSession: false })

  const [identifier,   setIdentifier]   = useState('')
  const [password,    setPassword]    = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [loading,  setLoading]  = useState(false)
  const [studentApp, setStudentApp] = useState(false)

  useEffect(() => { setStudentApp(isStudentApp()) }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}

    // Admin and teachers sign in with their email (pahabol, Nov 24); students
    // keep their username
    if (!identifier.trim()) errs.identifier = student ? 'Username is required' : 'Email is required'
    else if (!student && !EMAIL_PATTERN.test(identifier.trim())) errs.identifier = 'Enter a valid email address'
    if (!password) errs.password = 'Password is required'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setErrors({})
    const user = await login({ identifier: identifier.trim(), password, portal })

    // The student app is student-only — block teacher sign-ins here (req #1)
    if (studentApp && (user?.role === 'teacher' || user?.role === 'admin')) {
      await logout()
      setLoading(false)
      setErrors({ identifier: 'This app is for students. Teachers, please sign in on the web portal.' })
      return
    }

    setLoading(false)

    if (user?.role === 'admin') {
      router.replace('/admin/dashboard')
    } else if (user?.role === 'teacher') {
      router.replace('/teacher/dashboard')
    } else if (user?.role === 'student') {
      // After each sign-in the game plays the opening cinematic (Nov 2026b),
      // then shows the deadline reminder once (Nov 2026)
      try {
        window.sessionStorage.setItem('mindspark-play-intro', '1')
        window.sessionStorage.setItem('mindspark-show-reminder', '1')
      } catch { /* storage blocked */ }
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
      className="space-y-5 [@media(max-height:460px)]:space-y-2"
      noValidate
    >
      {student ? (
        <div className="space-y-1.5">
          <div className="relative">
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6255E8]">
              <User className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Username"
              autoComplete="username"
              aria-label="Username"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              className="w-full rounded-full border-2 border-[#9B83F5]/45 bg-white py-3 pl-12 pr-4 text-base text-[#22326f] placeholder-[#22326f]/45 transition-all focus:border-[#6255E8] focus:outline-none [@media(max-height:460px)]:py-2 [@media(max-height:460px)]:text-sm"
            />
          </div>
          {errors.identifier && <p className="pl-4 text-xs font-semibold text-[#6255E8]">{errors.identifier}</p>}
        </div>
      ) : (
        // Portal (admin / teacher) fields follow the panel's sign-in mockups
        // (Nov 2026b): a round icon badge, the label above, a white pill input.
        // Email, not username (pahabol, Nov 24)
        <PortalField label="Email" icon={Mail} error={errors.identifier} htmlFor="portal-email">
          <input
            id="portal-email"
            type="email"
            inputMode="email"
            placeholder="name@school.edu.ph"
            autoComplete="username"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            className={portalInput}
          />
        </PortalField>
      )}

      {student ? (
        <div className="space-y-1.5">
          <div className="relative">
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6255E8]">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-full border-2 border-[#9B83F5]/45 bg-white py-3 pl-12 pr-12 text-base text-[#22326f] placeholder-[#22326f]/45 transition-all focus:border-[#6255E8] focus:outline-none [@media(max-height:460px)]:py-2 [@media(max-height:460px)]:text-sm"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6255E8] transition-colors hover:text-[#3459C7]"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && <p className="pl-4 text-xs font-semibold text-[#6255E8]">{errors.password}</p>}
        </div>
      ) : (
        <PortalField label="Password" icon={Lock} error={errors.password} htmlFor="portal-password">
          <div className="relative">
            <input
              id="portal-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={`${portalInput} pr-11`}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6255E8] transition-colors hover:text-[#3459C7]"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </PortalField>
      )}

      {student ? (
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#3459C7] to-[#6255E8] py-3.5 text-lg font-black text-white shadow-lg transition-all hover:brightness-110 disabled:opacity-60 [@media(max-height:460px)]:py-2 [@media(max-height:460px)]:text-base"
        >
          {loading ? 'Signing in…' : 'Log In'}
          <LogIn className="h-5 w-5" />
        </button>
      ) : (
        // Portal sign-in: the palette's blue → violet, so the violet stays but
        // sits with the blue page instead of fighting it (Nov 2026)
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#5a3fd4] via-[#6d4ee8] to-[#8b5cf6] py-3.5 text-base font-black text-white shadow-lg shadow-[#5a3fd4]/40 ring-2 ring-white/40 transition-all hover:brightness-110 disabled:opacity-60"
        >
          <LogIn className="h-4 w-4" />
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      )}
    </motion.form>
  )
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const portalInput =
  'w-full rounded-full border border-[#d9d0f5] bg-white px-4 py-2.5 text-sm text-[#22326f] placeholder-[#22326f]/40 shadow-inner transition-all focus:border-[#6255E8] focus:outline-none focus:ring-2 focus:ring-[#9B83F5]/40'

function PortalField({ label, icon: Icon, error, htmlFor, children }: {
  label: string
  icon: typeof User
  error?: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c5cf0] to-[#5a3fd4] text-white shadow-md shadow-[#5a3fd4]/30">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <label htmlFor={htmlFor} className="block text-sm font-bold text-[#22326f]">{label}</label>
        {children}
        {error && <p className="pl-3 text-xs font-semibold text-red-600">{error}</p>}
      </div>
    </div>
  )
}
