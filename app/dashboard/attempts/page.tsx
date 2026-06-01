'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock, Filter, History, Search, XCircle } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { useGame } from '@/hooks/useGame'
import GameProgressCard from '@/components/dashboard/GameProgressCard'
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

  // Fetch attempts when character is loaded
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-sm font-game text-purple-300">Loading attempts...</div>
      </div>
    )
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        {/* Level Overview */}
        <div className="rounded-lg border border-purple-400/25 bg-purple-950/40 backdrop-blur-md p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-5 w-5 text-purple-300" />
            <h2 className="font-game text-2xl font-black">Level Progress</h2>
          </div>
          <div className="grid gap-3">
            {levelNodes.map(level => {
              const complete = completedLevels.includes(level.id)
              const open = level.id === Math.min(5, completedLevels.length + 1) && !complete
              return (
                <div key={level.id} className="flex items-center justify-between gap-3 rounded-lg border border-purple-400/20 bg-purple-950/40 backdrop-blur-md px-4 py-3">
                  <div>
                    <p className="font-black">Level {level.id}: {level.title}</p>
                    <p className="text-sm font-semibold text-purple-200">{level.topic}</p>
                  </div>
                  <span
                    className={[
                      'rounded-full px-3 py-1 text-xs font-black uppercase',
                      complete ? 'bg-[#9333ea] text-[#faf5ff]' : open ? 'bg-purple-800/40 backdrop-blur-md text-purple-100' : 'bg-purple-900/40 backdrop-blur-md text-purple-200',
                    ].join(' ')}
                  >
                    {complete ? 'Boss cleared' : open ? 'Ready' : 'Locked'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Attempt History Table */}
        <div className="rounded-2xl bg-[#1a0f3a] p-5 shadow-xl">
          {/* Header */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-400" />
              <h2 className="font-game text-xl font-black text-white">Attempt History</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterLevel(null)}
                className="rounded-lg bg-purple-700/40 p-2 transition hover:bg-purple-700/60"
              >
                <Filter className="h-4 w-4 text-fuchsia-400" />
              </button>
              <div className="flex items-center gap-2 rounded-xl bg-[#2d1f5e] px-4 py-2">
                <Search className="h-4 w-4 text-purple-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-32 bg-transparent text-sm text-white placeholder-purple-400/60 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {attemptsLoading ? (
            <div className="py-8 text-center text-sm text-purple-300/60">Loading attempts...</div>
          ) : attempts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-purple-400/30 p-8 text-center text-sm text-purple-100/50">
              No attempts recorded yet. Play the quiz to see your history here!
            </div>
          ) : (
            <div className="space-y-3">
              {attempts
                .filter(a =>
                  !search ||
                  getLevelTitle(a.levelNumber).toLowerCase().includes(search.toLowerCase()) ||
                  a.selectedAnswer.toLowerCase().includes(search.toLowerCase())
                )
                .map(attempt => {
                  const correct = Boolean(attempt.isCorrect)
                  return (
                    <div
                      key={attempt.id}
                      className={[
                        'flex items-center gap-4 rounded-2xl border px-5 py-4',
                        correct
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-[#fff0f0]',
                      ].join(' ')}
                    >
                      {/* Circle icon with sparkle dots */}
                      <div className="relative shrink-0">
                        <div className={[
                          'flex h-12 w-12 items-center justify-center rounded-full shadow-md',
                          correct ? 'bg-green-500' : 'bg-red-500',
                        ].join(' ')}>
                          {correct
                            ? <CheckCircle2 className="h-7 w-7 text-white" />
                            : <XCircle className="h-7 w-7 text-white" />}
                        </div>
                        {/* sparkle dots */}
                        <span className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ${correct ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span className={`absolute -bottom-1 -left-1 h-2 w-2 rounded-full ${correct ? 'bg-green-300' : 'bg-red-300'}`} />
                        <span className={`absolute top-1 -left-2.5 h-1.5 w-1.5 rounded-full ${correct ? 'bg-green-200' : 'bg-red-200'}`} />
                      </div>

                      {/* Label + date */}
                      <div className="min-w-0 w-28">
                        <p className={`text-sm font-black ${correct ? 'text-green-700' : 'text-red-600'}`}>Attempt</p>
                        <p className="text-xs text-gray-500">{formatDate(attempt.attemptedAt)}</p>
                      </div>

                      {/* Divider */}
                      <div className={`h-10 w-px shrink-0 ${correct ? 'bg-green-200' : 'bg-red-200'}`} />

                      {/* Score */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-2xl font-black leading-none ${correct ? 'text-green-600' : 'text-red-600'}`}>
                          {attempt.scoreEarned > 0 ? `+${attempt.scoreEarned}` : '0'}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-gray-400">Score</p>
                      </div>

                      {/* Badge + time */}
                      <div className="shrink-0 flex items-center gap-3">
                        <span className={[
                          'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-bold',
                          correct
                            ? 'border-green-300 bg-white text-green-600'
                            : 'border-red-300 bg-white text-red-500',
                        ].join(' ')}>
                          {correct
                            ? <CheckCircle2 className="h-4 w-4" />
                            : <XCircle className="h-4 w-4" />}
                          {correct ? 'Passed' : 'Failed'}
                        </span>
                        <span className="flex items-center gap-1 text-sm font-bold text-gray-500 whitespace-nowrap">
                          <Clock className="h-4 w-4" />
                          {formatTime(attempt.attemptedAt)}
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>
      <GameProgressCard progress={progress} onLoad={loadProgress} loading={false} />
    </section>
  )
}
