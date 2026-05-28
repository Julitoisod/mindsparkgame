'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock, Filter, History, XCircle } from 'lucide-react'

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
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
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
        <div className="rounded-lg border border-purple-400/25 bg-purple-950/40 backdrop-blur-md p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-300" />
              <h2 className="font-game text-xl font-black">Attempt History</h2>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-purple-300/60" />
              <select
                value={filterLevel ?? ''}
                onChange={e => setFilterLevel(e.target.value ? Number(e.target.value) : null)}
                className="rounded-lg border border-purple-400/30 bg-white px-3 py-1.5 text-sm font-bold text-purple-100 focus:outline-none focus:ring-2 focus:ring-[#9333ea]"
              >
                <option value="">All Levels</option>
                {levelNodes.map(l => (
                  <option key={l.id} value={l.id}>Level {l.id}: {l.title}</option>
                ))}
              </select>
            </div>
          </div>

          {attemptsLoading ? (
            <div className="py-8 text-center text-sm text-purple-300/60">Loading attempts...</div>
          ) : attempts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-purple-400/30 p-8 text-center text-sm text-purple-100/50">
              No attempts recorded yet. Play the quiz to see your history here!
            </div>
          ) : (
            <div className="space-y-2">
              {attempts.map(attempt => (
                <div
                  key={attempt.id}
                  className={[
                    'flex items-center gap-3 rounded-lg border px-4 py-3',
                    attempt.isCorrect
                      ? 'border-emerald-500/20 bg-emerald-50'
                      : 'border-red-400/20 bg-red-50',
                  ].join(' ')}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    {attempt.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-purple-100">
                        {getLevelTitle(attempt.levelNumber)}
                      </span>
                      <span className={[
                        'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                        attempt.phase === 'boss'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700',
                      ].join(' ')}>
                        {attempt.phase === 'boss' ? 'Boss' : 'Quiz'}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-purple-200">
                      Answer: <span className="font-semibold">{attempt.selectedAnswer}</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-purple-100/70">
                      {attempt.scoreEarned > 0 ? `+${attempt.scoreEarned} pts` : '—'}
                    </p>
                    <p className="text-[10px] text-purple-100/45">{formatDate(attempt.attemptedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <GameProgressCard progress={progress} onLoad={loadProgress} loading={false} />
    </section>
  )
}
