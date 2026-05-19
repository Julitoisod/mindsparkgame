'use client'
/**
 * hooks/useAuth.ts
 * Client-side authentication state manager.
 */
import { useState, useEffect, useCallback } from 'react'
import type { PublicUser, LoginInput, RegisterInput } from '@/types/user'
import toast from 'react-hot-toast'

interface AuthState {
  user: PublicUser | null
  loading: boolean
  error: string | null
}

interface UseAuthOptions {
  checkSession?: boolean
}

interface RegisterResult {
  user: PublicUser | null
  errors?: Record<string, string>
  message?: string
}

function isFieldErrors(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value).every(item => typeof item === 'string')
}

export function useAuth({ checkSession = true }: UseAuthOptions = {}) {
  const [state, setState] = useState<AuthState>({
    user:    null,
    loading: checkSession,
    error:   null,
  })

  // Fetch the current session on mount
  useEffect(() => {
    if (checkSession) fetchMe()
  }, [checkSession])

  async function fetchMe() {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setState({ user: json.data ?? null, loading: false, error: null })
      } else {
        setState({ user: null, loading: false, error: null })
      }
    } catch {
      setState({ user: null, loading: false, error: 'Network error' })
    }
  }

  const login = useCallback(async (input: LoginInput): Promise<PublicUser | null> => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(input),
        credentials: 'include',
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setState({ user: json.data, loading: false, error: null })
        toast.success('Welcome back!')
        return json.data as PublicUser
      }
      setState(s => ({ ...s, loading: false, error: json.message }))
      toast.error(json.message ?? 'Login failed')
      return null
    } catch {
      setState(s => ({ ...s, loading: false, error: 'Network error' }))
      toast.error('Network error')
      return null
    }
  }, [])

  const register = useCallback(async (input: RegisterInput): Promise<RegisterResult> => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(input),
        credentials: 'include',
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setState({ user: json.data, loading: false, error: null })
        toast.success('Teacher account created!')
        return { user: json.data as PublicUser }
      }
      const fieldErrors = isFieldErrors(json.data) ? json.data : undefined
      const message = json.message ?? 'Registration failed'
      setState(s => ({ ...s, loading: false, error: message }))
      toast.error(fieldErrors ? Object.values(fieldErrors)[0] : message)
      return { user: null, errors: fieldErrors, message }
    } catch {
      setState(s => ({ ...s, loading: false, error: 'Network error' }))
      toast.error('Network error')
      return { user: null, message: 'Network error' }
    }
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setState({ user: null, loading: false, error: null })
    toast.success('Logged out')
  }, [])

  return {
    user:     state.user,
    loading:  state.loading,
    error:    state.error,
    isAuthed: state.user !== null,
    login,
    register,
    logout,
    refresh:  fetchMe,
  }
}
