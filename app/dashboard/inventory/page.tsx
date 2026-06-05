'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

import { useAuth } from '@/hooks/useAuth'
import { useGame } from '@/hooks/useGame'

import type { CharacterData } from '@/types/character'

const Inventory = dynamic(() => import('@/components/dashboard/Inventory'), {
  loading: () => <div className="h-48 rounded-lg bg-purple-900/40 backdrop-blur-md animate-pulse" />,
  ssr: false,
})

export default function DashboardInventoryPage() {
  const { user, isAuthed } = useAuth()
  const [character, setCharacter] = useState<CharacterData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthed || user?.role !== 'student') return
    fetch('/api/character', { credentials: 'include' })
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data?.length) {
          const raw = json.data[0]
          setCharacter({
            ...raw,
            stats: raw.stats ?? {
              hp: raw.hp, maxHp: raw.maxHp ?? raw.max_hp,
              mp: raw.mp, maxMp: raw.maxMp ?? raw.max_mp,
              attack: raw.attack, defense: raw.defense, speed: raw.speed,
              level: raw.level, experience: raw.experience,
              experienceToNext: raw.experienceToNext ?? raw.experience_to_next ?? 100,
            },
          })
        }
      })
      .finally(() => setLoading(false))
  }, [isAuthed, user?.role])

  const { inventory, loadingInv, toggleEquip } = useGame(character?.id ?? 0)

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm font-game text-purple-300">Loading inventory...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="student-scroll-area">
        <Inventory slots={inventory} onToggleEquip={toggleEquip} loading={loadingInv} />
      </div>
    </div>
  )
}