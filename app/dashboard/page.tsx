'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function DashboardPage() {
  const router = useRouter()
  const { loading, isAuthed } = useAuth()

  useEffect(() => {
    if (!loading && isAuthed) {
      router.replace('/dashboard/map')
    }
  }, [loading, isAuthed, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0a1f]">
        <div className="text-sm font-game text-[#c084fc]">Loading...</div>
      </div>
    )
  }

  return null
}
