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
      <div className="flex h-full items-center justify-center bg-[#0f0a1f]">
        <div className="text-sm font-game text-[#9B83F5]">Loading...</div>
      </div>
    )
  }

  return null
}
