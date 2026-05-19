'use client'
/**
 * components/auth/RegisterForm.tsx
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { User, Mail, Lock, UserPlus } from 'lucide-react'
import Input  from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

export default function RegisterForm() {
  const router = useRouter()
  const { register } = useAuth({ checkSession: false })

  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [errors,   setErrors]   = useState<Record<string, string>>({})
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}

    if (!username || username.trim().length < 3)
      errs.username = 'Username must be at least 3 characters'
    else if (username.trim().length > 32)
      errs.username = 'Username must be 32 characters or fewer'
    else if (!/^[a-zA-Z0-9_]+$/.test(username.trim()))
      errs.username = 'Use letters, numbers, and underscores only'
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = 'Valid email required'
    if (!password)
      errs.password = 'Password is required'
    else if (password.length < 8)
      errs.password = 'Password must be at least 8 characters'
    else if (!/[a-zA-Z]/.test(password) || !/\d/.test(password))
      errs.password = 'Password must contain at least one letter and one number'

    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setErrors({})
    const result = await register({ username: username.trim(), email: email.trim(), password })
    setLoading(false)

    if (result.errors) setErrors(result.errors)
    if (result.user) router.replace('/teacher/students')
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
        placeholder="HeroName"
        autoComplete="nickname"
        value={username}
        onChange={e => setUsername(e.target.value)}
        error={errors.username}
        icon={<User className="w-4 h-4" />}
      />
      <Input
        label="Email"
        type="email"
        placeholder="hero@example.com"
        autoComplete="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        error={errors.email}
        icon={<Mail className="w-4 h-4" />}
      />
      <Input
        label="Password"
        type="password"
        placeholder="Min. 8 characters"
        autoComplete="new-password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        error={errors.password}
        icon={<Lock className="w-4 h-4" />}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={loading}
        icon={<UserPlus className="w-4 h-4" />}
        className="w-full"
      >
        Create Teacher Account
      </Button>
    </motion.form>
  )
}
