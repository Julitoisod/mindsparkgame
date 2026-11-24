'use client'

import { useEffect, useMemo, useState } from 'react'
import { Castle, Check, Clock, Gem, Landmark, Lock, MoonStar, Play, Search, Target, Trees, X } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { useGame } from '@/hooks/useGame'
import ScreenTitle from '@/components/game/ScreenTitle'
import type { CharacterData } from '@/types/character'

// Suggested design (Nov 24): each level has its own hexagon colour and a
// faint silhouette of its place
const levelNodes = [
  { id: 1, title: 'Forest Gate', topic: 'Fraction, Decimal & Solid Quest', badge: 'game-badge-blue', scene: Trees },
  { id: 2, title: 'Crystal Bridge', topic: 'Prisms, Pyramids & Nets', badge: 'game-badge-purple', scene: Gem },
  { id: 3, title: 'Elven Ruins', topic: 'Surface Area Builders', badge: 'game-badge-orange', scene: Landmark },
  { id: 4, title: 'Moonlit Keep', topic: 'Surface Area Problem Solvers', badge: 'game-badge-purple', scene: MoonStar },
  { id: 5, title: 'Oracle Tower', topic: 'Volume Estimation Challenge', badge: 'game-badge-teal', scene: Castle },
]

type Attempt = {
  id: number
  levelNumber: number
  phase: 'normal' | 'boss'
  questionId: string
  selectedAnswer: string
  isCorrect: number
  heartsRemaining: number
  scoreEarned: number
  attemptedAt: string
}

export default function DashboardAttemptsPage() {
  const { user, isAuthed } = useAuth()
  const [character, setCharacter] = useState<CharacterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [attemptsLoading, setAttemptsLoading] = useState(false)
  const [filterLevel, setFilterLevel] = useState<number | null>(null)
  const [search, setSearch] = useState('')

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

  const { progress, loadProgress } = useGame(character?.id ?? 0)

  useEffect(() => {
    if (character?.id) loadProgress?.()
  }, [character?.id, loadProgress])

  useEffect(() => {
    if (!character?.id) return
    setAttemptsLoading(true)
    const url = filterLevel
      ? `/api/attempts?characterId=${character.id}&levelNumber=${filterLevel}`
      : `/api/attempts?characterId=${character.id}`
    fetch(url, { credentials: 'include' })
      .then(res => res.json())
      .then(json => {
        if (json.success) setAttempts(json.data ?? [])
      })
      .finally(() => setAttemptsLoading(false))
  }, [character?.id, filterLevel])

  const completedLevels = useMemo(() => progress?.completedLevels ?? [], [progress?.completedLevels])

  function getLevelTitle(levelNum: number) {
    return levelNodes.find(l => l.id === levelNum)?.title ?? `Level ${levelNum}`
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm font-game text-purple-300">Loading attempts...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header: back, target badge, title, search (and the level filter, when one is on) */}
      <div className="shrink-0 px-3 pb-1 pt-1.5">
        <ScreenTitle title="Attempts" icon={Target} badge="game-badge-red">
          <div className="ml-auto flex min-w-0 items-center gap-1.5 rounded-full border-2 border-[color:var(--ms-edge)] bg-[#0c1f63]/85 px-2.5 py-1">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#93c5fd]" />
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-24 min-w-0 bg-transparent text-xs text-white placeholder-[#93c5fd]/70 focus:outline-none" />
          </div>
          {filterLevel && (
            <button type="button" onClick={() => setFilterLevel(null)} aria-label="Show every level" className="game-pill-gold shrink-0 text-[10px]">
              Lv.{filterLevel} <X className="h-3 w-3" />
            </button>
          )}
        </ScreenTitle>
      </div>

      {/* Scrollable Content */}
      <div className="student-scroll-area px-3 pb-2">
        {/* Level Overview: a row filters the history to that level */}
        <div className="mb-2.5 grid gap-1.5">
          {levelNodes.map(level => {
            const complete = completedLevels.includes(level.id)
            // Completing Level 1 opens Levels 2-5 (same rule as the map)
            const open = !complete && (level.id === 1 || completedLevels.includes(1))
            const selected = filterLevel === level.id
            const Scene = level.scene
            return (
              <button
                type="button"
                key={level.id}
                onClick={() => setFilterLevel(selected ? null : level.id)}
                aria-pressed={selected}
                className={`game-panel flex w-full items-center gap-3 overflow-hidden px-2.5 py-1.5 text-left transition hover:brightness-110 ${selected ? 'game-panel-gold' : ''}`}
              >
                <span className={`game-hex ${level.badge} h-9 w-11 text-[11px]`}>Lv.{level.id}</span>
                <span className="h-7 w-px shrink-0 bg-white/25" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-white">{level.title}</span>
                  <span className="block truncate text-[10px] italic text-[#bfdbfe]">{level.topic}</span>
                </span>
                <Scene className="pointer-events-none absolute right-24 top-1/2 h-12 w-12 -translate-y-1/2 text-white/15" aria-hidden />
                {complete ? (
                  <span className="relative flex shrink-0 items-center gap-1 rounded-full border border-[#bbf7d0]/70 bg-gradient-to-b from-[#4ade80] to-[#15803d] px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow">
                    <Check className="h-3 w-3" strokeWidth={3} /> Done
                  </span>
                ) : open ? (
                  <span className="game-pill-gold relative shrink-0 text-[10px] uppercase">
                    <Play className="h-3 w-3 fill-current" /> Ready
                  </span>
                ) : (
                  <span className="relative flex shrink-0 items-center gap-1 rounded-full border border-white/20 bg-[#334155]/85 px-2.5 py-0.5 text-[10px] font-black uppercase text-white/75">
                    <Lock className="h-3 w-3" /> Lock
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* History */}
        {attemptsLoading ? (
          <div className="py-6 text-center text-xs text-white/80">Loading attempts...</div>
        ) : attempts.length === 0 ? (
          <div className="game-panel border-dashed p-5 text-center text-xs text-white/80">
            No attempts yet. Play the quiz to see history.
          </div>
        ) : (
          <div className="space-y-1.5">
            {attempts
              .filter(a =>
                !search ||
                getLevelTitle(a.levelNumber).toLowerCase().includes(search.toLowerCase()) ||
                a.selectedAnswer.toLowerCase().includes(search.toLowerCase())
              )
              .map(attempt => {
                const correct = Boolean(attempt.isCorrect)
                return (
                  <div key={attempt.id} className="game-panel flex items-center gap-3 px-3 py-1.5">
                    <span className={`game-badge ${correct ? 'game-badge-green' : 'game-badge-red'} h-9 w-9`}>
                      {correct ? <Check className="h-5 w-5" strokeWidth={3} /> : <X className="h-5 w-5" strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-black ${correct ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{correct ? 'Correct' : 'Wrong'}</span>
                        <span className={`rounded-full px-1.5 py-px text-[9px] font-black uppercase text-white ${attempt.phase === 'boss' ? 'bg-[#7c3aed]' : 'bg-[#1d4ed8]'}`}>{attempt.phase === 'boss' ? 'Boss' : 'Quiz'}</span>
                        <span className="text-[10px] text-white/70">{formatDate(attempt.attemptedAt)}</span>
                      </div>
                      <p className="truncate text-[10px] text-white/70">{getLevelTitle(attempt.levelNumber)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-lg font-black leading-none ${correct ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{attempt.scoreEarned > 0 ? `+${attempt.scoreEarned}` : '0'}</p>
                      <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-white/70"><Clock className="h-3 w-3" /> {formatTime(attempt.attemptedAt)}</p>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
