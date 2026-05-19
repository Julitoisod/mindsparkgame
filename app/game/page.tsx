'use client'
/**
 * app/game/page.tsx — Full-screen game view
 * Auth-protected quiz adventure view.
 */
import { useEffect, useState } from 'react'
import { useRouter }           from 'next/navigation'
import dynamic                 from 'next/dynamic'
import Link                    from 'next/link'
import { LayoutDashboard }     from 'lucide-react'

import { useAuth }             from '@/hooks/useAuth'
import type { CharacterData }  from '@/types/character'

const QuizAdventure = dynamic(() => import('@/components/game/QuizAdventure'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-dark-900">
      <span className="font-game text-sm text-primary-300 animate-pulse">Loading adventure...</span>
    </div>
  ),
})

/*
// Dynamic import: skip SSR for the entire 3D canvas
const GameCanvas = dynamic(() => import('@/components/game/GameCanvas'), {
  ssr:     false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-dark-900">
      <div className="text-primary-300 font-game animate-pulse">Loading World…</div>
    </div>
  ),
})
*/

export default function GamePage() {
  const router = useRouter()
  const { user, isAuthed, loading } = useAuth()

  const [character, setCharacter] = useState<CharacterData | null>(null)
  const [ready,     setReady]     = useState(false)

  useEffect(() => {
    if (!loading && !isAuthed) {
      router.replace('/login')
      return
    }
    if (!loading && user?.role === 'teacher') {
      router.replace('/teacher/students')
      return
    }
    if (isAuthed && user?.role === 'student') {
      fetch('/api/character', { credentials: 'include' })
        .then(r => r.json())
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
        .finally(() => setReady(true))
    }
  }, [isAuthed, loading, router, user?.role])

  useEffect(() => {
    if (!loading && ready && user?.role === 'student' && !character) {
      router.replace('/character-select')
    }
  }, [character, loading, ready, router, user?.role])

  if (loading || (!ready && isAuthed)) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <span className="text-primary-300 font-game animate-pulse">Initialising…</span>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-dark-900">
      {/* Dashboard shortcut */}
      <Link
        href="/dashboard"
        className="absolute top-4 right-16 z-20 flex h-8 w-9 items-center justify-center gap-1.5 text-xs text-primary-100/65 hover:text-white transition-colors bg-dark-700/70 backdrop-blur-sm rounded-lg border border-primary-200/15 sm:w-auto sm:px-3"
        aria-label="Dashboard"
      >
        <LayoutDashboard className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>

      {ready && character && (
        <QuizAdventure
          characterId={character.id}
          characterStats={character.stats}
          playerName={character.name}
          playerClass={character.class}
        />
      )}
    </div>
  )
}
