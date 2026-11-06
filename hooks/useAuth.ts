'use client'
/**
 * hooks/useAuth.ts
 * Client-side authentication state manager.
 */
import { useState, useEffect, useCallback } from 'react'
import type { PublicUser, LoginInput } from '@/types/user'
import toast from 'react-hot-toast'

interface AuthState {
  user: PublicUser | null
  loading: boolean
  error: string | null
}

interface UseAuthOptions {
  checkSession?: boolean
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
    logout,
    refresh:  fetchMe,
  }
}
