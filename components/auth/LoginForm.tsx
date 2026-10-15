'use client'
/**
 * components/auth/LoginForm.tsx
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { User, Lock, LogIn, Eye, EyeOff } from 'lucide-react'
import Input  from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { isStudentApp } from '@/lib/appTarget'

/**
 * `theme="student"` renders the light card used by the student login page
 * (2026-10 revision item 12); the default dark theme stays for the teacher.
 */
export default function LoginForm({ theme = 'default' }: { theme?: 'default' | 'student' }) {
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

    if (!identifier) errs.identifier = 'Username is required'
    if (!password) errs.password = 'Password is required'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setErrors({})
    const user = await login({ identifier, password })

    // The student app is student-only — block teacher sign-ins here (req #1)
    if (studentApp && user?.role === 'teacher') {
      await logout()
      setLoading(false)
      setErrors({ identifier: 'This app is for students. Teachers, please sign in on the web portal.' })
      return
    }

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
      )}

      <div className="space-y-1.5">
        {!student && <label className="block text-sm font-medium text-primary-100">Password</label>}
        <div className="relative">
          <div className={`absolute top-1/2 -translate-y-1/2 pointer-events-none ${student ? 'left-4 text-[#6255E8]' : 'left-3 text-primary-300'}`}>
            <Lock className={student ? 'w-5 h-5' : 'w-4 h-4'} />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder={student ? 'Password' : '••••••••'}
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={student
              ? 'w-full rounded-full border-2 border-[#9B83F5]/45 bg-white py-3 pl-12 pr-12 text-base text-[#22326f] placeholder-[#22326f]/45 transition-all focus:border-[#6255E8] focus:outline-none [@media(max-height:460px)]:py-2 [@media(max-height:460px)]:text-sm'
              : [
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
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword(!showPassword)}
            className={`absolute top-1/2 -translate-y-1/2 transition-colors ${student ? 'right-4 text-[#6255E8] hover:text-[#3459C7]' : 'right-3 text-primary-300 hover:text-primary-100'}`}
          >
            {showPassword ? <EyeOff className={student ? 'w-5 h-5' : 'w-4 h-4'} /> : <Eye className={student ? 'w-5 h-5' : 'w-4 h-4'} />}
          </button>
        </div>
        {errors.password && (
          <p className={student ? 'pl-4 text-xs font-semibold text-[#6255E8]' : 'text-xs font-semibold text-primary-100'}>{errors.password}</p>
        )}
      </div>

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
      )}
    </motion.form>
  )
}
