'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Filter, History, Search, XCircle } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { useGame } from '@/hooks/useGame'
import type { CharacterData } from '@/types/character'

const levelNodes = [
  { id: 1, title: 'Forest Gate', topic: 'Treasure Box Multiplication' },
  { id: 2, title: 'Crystal Bridge', topic: 'Division Heroes Adventure' },
  { id: 3, title: 'Elven Ruins', topic: 'Fraction and Number Quest' },
  { id: 4, title: 'Moonlit Keep', topic: 'Shape Slide Explorer' },
  { id: 5, title: 'Oracle Tower', topic: 'Symmetry Super Challenge' },
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
      {/* Fixed Header */}
      <div className="shrink-0 px-3 pt-2 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-purple-300" />
            <h2 className="font-game text-base font-black">Attempts</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setFilterLevel(null)} className="rounded-md bg-purple-700/40 p-1.5 transition hover:bg-purple-700/60">
              <Filter className="h-3.5 w-3.5 text-fuchsia-400" />
            </button>
            <div className="flex items-center gap-1.5 rounded-md bg-[#2d1f5e] px-2.5 py-1">
              <Search className="h-3.5 w-3.5 text-purple-400" />
              <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-20 bg-transparent text-xs text-white placeholder-purple-400/60 focus:outline-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="student-scroll-area px-3 pb-2">
        {/* Level Overview */}
        <div className="grid gap-1.5 mb-3">
          {levelNodes.map(level => {
            const complete = completedLevels.includes(level.id)
            const open = level.id === Math.min(5, completedLevels.length + 1) && !complete
            return (
              <div key={level.id} onClick={() => setFilterLevel(filterLevel === level.id ? null : level.id)} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 cursor-pointer transition ${filterLevel === level.id ? 'border-purple-400/40 bg-purple-800/40' : 'border-purple-400/15 bg-purple-950/30'}`}>
                <div className="min-w-0">
                  <p className="text-xs font-black truncate">Lvl {level.id}: {level.title}</p>
                  <p className="text-[10px] text-purple-200 truncate">{level.topic}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${complete ? 'bg-[#9333ea] text-[#faf5ff]' : open ? 'bg-purple-800/40 text-purple-100' : 'bg-purple-900/40 text-purple-300'}`}>
                  {complete ? 'Done' : open ? 'Ready' : 'Lock'}
                </span>
              </div>
            )
          })}
        </div>

        {/* History */}
        {attemptsLoading ? (
          <div className="py-6 text-center text-xs text-purple-300/60">Loading attempts...</div>
        ) : attempts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-purple-400/30 p-6 text-center text-xs text-purple-100/50">
            No attempts yet. Play the quiz to see history.
          </div>
        ) : (
          <div className="space-y-2">
            {attempts
              .filter(a =>
                !search ||
                getLevelTitle(a.levelNumber).toLowerCase().includes(search.toLowerCase()) ||
                a.selectedAnswer.toLowerCase().includes(search.toLowerCase())
              )
              .map(attempt => {
                const correct = Boolean(attempt.isCorrect)
                return (
                  <div key={attempt.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${correct ? 'border-green-200/60 bg-green-50/10' : 'border-red-200/60 bg-red-50/5'}`}>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-md ${correct ? 'bg-green-500' : 'bg-red-500'}`}>
                      {correct ? <CheckCircle2 className="h-5 w-5 text-white" /> : <XCircle className="h-5 w-5 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-black ${correct ? 'text-green-400' : 'text-red-400'}`}>{correct ? 'Passed' : 'Failed'}</span>
                        <span className="text-[10px] text-white/40">{formatDate(attempt.attemptedAt)}</span>
                      </div>
                      <p className="text-[10px] text-white/50 truncate">{getLevelTitle(attempt.levelNumber)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-base font-black leading-none ${correct ? 'text-green-400' : 'text-red-400'}`}>{attempt.scoreEarned > 0 ? `+${attempt.scoreEarned}` : '0'}</p>
                      <p className="text-[10px] text-white/40">{formatTime(attempt.attemptedAt)}</p>
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
