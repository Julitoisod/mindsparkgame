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
      <div className="flex min-h-screen items-center justify-center bg-[#07170d]">
        <div className="text-sm font-game text-[#74c476]">Loading...</div>
      </div>
    )
  }

  return null
}
