'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

import { useAuth } from '@/hooks/useAuth'
import type { CharacterData } from '@/types/character'

const QuizAdventure = dynamic(() => import('@/components/game/QuizAdventure'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-dark-900">
      <span className="font-game text-sm text-primary-300 animate-pulse">Loading game...</span>
    </div>
  ),
})

export default function DashboardMapPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthed, loading: authLoading } = useAuth()

  const [character, setCharacter] = useState<CharacterData | null>(null)
  const [ready, setReady] = useState(false)

  const levelId = searchParams.get('level') || '1'

  useEffect(() => {
    if (authLoading || !isAuthed) return

    if (user?.role === 'teacher') {
      router.replace('/teacher/students')
      return
    }

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
      .catch(() => {
        // Handle fetch failures gracefully (network/DB issues)
      })
      .finally(() => setReady(true))
  }, [authLoading, isAuthed, router, user?.role])

  useEffect(() => {
    if (!authLoading && ready && user?.role === 'student' && !character) {
      router.replace('/character-select')
    }
  }, [authLoading, ready, character, router, user?.role])

  if (authLoading || !ready) {
    return (
      <div className="flex h-full items-center justify-center bg-dark-900">
        <span className="text-primary-300 font-game animate-pulse">Initialising...</span>
      </div>
    )
  }

  if (!character) return null

  return (
    <div className="h-full w-full overflow-hidden">
      <QuizAdventure
        characterId={character.id}
        characterStats={character.stats}
        playerName={character.name}
        playerClass={character.class}
        initialLevel={parseInt(levelId)}
      />
    </div>
  )
}