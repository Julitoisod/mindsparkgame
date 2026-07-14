'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { characterOptions } from '@/lib/characterOptions'
import { BADGES } from '@/lib/badges'

import type { CharacterData, CharacterStats } from '@/types/character'

interface GameProgress {
  currentZone: number
  completedLevels: number[]
  playtimeSeconds: number
}

interface CharacterAccess {
  starBalance: number
  ownedClasses: string[]
}

export default function DashboardProfilePage() {
  const { user, isAuthed } = useAuth()
  const [character, setCharacter] = useState<CharacterData | null>(null)
  const [progress, setProgress] = useState<GameProgress | null>(null)
  const [access, setAccess] = useState<CharacterAccess>({ starBalance: 0, ownedClasses: [] })
  const [earnedBadges, setEarnedBadges] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthed || user?.role !== 'student') return

    fetch('/api/character', { credentials: 'include' })
      .then(r => r.json())
      .then(charRes => {
        if (charRes.success && charRes.data?.length) {
          const raw = charRes.data[0]
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

          setAccess({
            starBalance: charRes.meta?.starBalance ?? 0,
            ownedClasses: charRes.meta?.ownedClasses ?? [],
          })

          return fetch(`/api/progress?characterId=${raw.id}`, { credentials: 'include' }).then(r => r.json())
        }
        return null
      })
      .then(progRes => {
        if (progRes?.success && progRes?.data) {
          setProgress({
            currentZone: progRes.data.currentZone ?? 1,
            completedLevels: progRes.data.completedLevels ?? [],
            playtimeSeconds: progRes.data.playtimeSeconds ?? 0,
          })
          setAccess(prev => ({ ...prev, starBalance: progRes.meta?.starBalance ?? prev.starBalance }))
          if (Array.isArray(progRes.meta?.earnedBadges)) {
            setEarnedBadges(progRes.meta.earnedBadges)
          }
        }
      })
      .finally(() => setLoading(false))
  }, [isAuthed, user?.role])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm font-game text-purple-300">Loading profile...</div>
      </div>
    )
  }

  if (!user || !character) return null

  const stats = character.stats as CharacterStats
  const completedCount = progress?.completedLevels?.length ?? 0
  const playtime = progress?.playtimeSeconds ?? 0
  const hours = Math.floor(playtime / 3600)
  const minutes = Math.floor((playtime % 3600) / 60)
  const playtimeLabel = hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
  const completionPercent = Math.min(100, Math.round((completedCount / 5) * 100))
  const remainingLevels = Math.max(0, 5 - completedCount)

  const charOption = characterOptions.find(c => c.class === character.class)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Scrollable content */}
      <div className="student-scroll-area px-3 py-4 space-y-4">
        {/* Profile Header */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0 h-14 w-14 rounded-xl overflow-hidden border-2 border-purple-400/30">
            <Image
              src={charOption?.imagePath ?? '/AVATAR CHARACTERS/3 AVATAR/2D-KNIGHT BOY CHARACTER/_PNG/1_KNIGHT_ AVATAR/Knight_01__IDLE_000.png'}
              alt={character.class}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white font-game truncate">{character.name}</h2>
            <p className="text-xs text-white/65 capitalize">{character.class} · Lvl {stats.level} · {completionPercent}%</p>
            <div className="flex gap-3 mt-0.5">
              <span className="text-[10px] text-white/50">{access.starBalance} stars</span>
              <span className="text-[10px] text-white/50">{completedCount}/5 done</span>
              <span className="text-[10px] text-white/50">{playtimeLabel}</span>
            </div>
          </div>
        </div>

        {/* Compact Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-[#c084fc]/15 bg-[#241a47] px-2 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-[#c084fc]/70">Class</p>
            <p className="text-xs font-bold text-[#f3e8ff] capitalize mt-0.5">{character.class}</p>
          </div>
          <div className="rounded-lg border border-[#c084fc]/15 bg-[#241a47] px-2 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-[#c084fc]/70">Level</p>
            <p className="text-xs font-bold text-[#f3e8ff] mt-0.5">{stats.level}</p>
          </div>
          <div className="rounded-lg border border-[#c084fc]/15 bg-[#241a47] px-2 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-[#c084fc]/70">Zone</p>
            <p className="text-xs font-bold text-[#f3e8ff] mt-0.5">{progress?.currentZone ?? 1}</p>
          </div>
          <div className="rounded-lg border border-[#c084fc]/15 bg-[#241a47] px-2 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-[#c084fc]/70">Playtime</p>
            <p className="text-xs font-bold text-[#f3e8ff] mt-0.5">{playtimeLabel}</p>
          </div>
          <div className="rounded-lg border border-[#c084fc]/15 bg-[#241a47] px-2 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-[#c084fc]/70">Member</p>
            <p className="text-xs font-bold text-[#f3e8ff] mt-0.5">{new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div className="rounded-lg border border-[#c084fc]/15 bg-[#241a47] px-2 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-[#c084fc]/70">Left</p>
            <p className="text-xs font-bold text-[#f3e8ff] mt-0.5">{remainingLevels} lvls</p>
          </div>
        </div>

        {/* Progress */}
        <div className="rounded-lg border border-[#c084fc]/15 bg-[#1a0f3a]/60 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white font-game">Progress</span>
            <span className="text-xs font-bold text-[#c084fc]">{completedCount}/5</span>
          </div>
          <div className="h-2 rounded-full bg-[#241a47] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#9333ea] to-[#c084fc] transition-all" style={{ width: `${completionPercent}%` }} />
          </div>
          <div className="flex justify-between mt-2">
            <div className="text-center">
              <p className="text-lg font-black text-white">{access.starBalance}</p>
              <p className="text-[10px] text-white/50 uppercase">Stars</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-white">{completionPercent}%</p>
              <p className="text-[10px] text-white/50 uppercase">Complete</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-white">{hours > 0 ? `${hours}h` : `${minutes}m`}</p>
              <p className="text-[10px] text-white/50 uppercase">Playtime</p>
            </div>
          </div>
        </div>

        {/* Owned classes */}
        <div className="rounded-lg border border-[#c084fc]/15 bg-[#1a0f3a]/60 p-3">
          <p className="text-xs font-bold text-white/80 mb-2">Unlocked Classes</p>
          {access.ownedClasses.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {access.ownedClasses.map(c => (
                <span key={c} className="rounded-full border border-[#c084fc]/20 bg-[#241a47] px-2.5 py-0.5 text-[10px] font-medium capitalize text-[#f3e8ff]">
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-white/40">No unlocked classes yet</p>
          )}
        </div>

        {/* Account info */}
        <div className="rounded-lg border border-[#c084fc]/15 bg-[#1a0f3a]/60 p-3 space-y-2">
          <p className="text-xs font-bold text-white/80 mb-1">Account</p>
          <div className="flex justify-between text-xs">
            <span className="text-white/50">Username</span>
            <span className="text-white font-bold">{user.username}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/50">Email</span>
            <span className="text-white font-bold truncate max-w-[180px]">{user.email}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/50">Role</span>
            <span className="text-white font-bold capitalize">{user.role}</span>
          </div>
        </div>

        {/* Badges — compact horizontal scroll */}
        <div className="rounded-lg border border-[#c084fc]/15 bg-[#1a0f3a]/60 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-white/80">Badges</p>
            <span className="text-[10px] font-bold text-[#c084fc]">{earnedBadges.length}/{BADGES.length}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {BADGES.map(b => {
              const earned = earnedBadges.includes(b.id)
              return (
                <div key={b.id} className={`shrink-0 w-16 rounded-lg border px-2 py-1.5 text-center ${earned ? 'border-[#c084fc]/30 bg-[#241a47]' : 'border-[#c084fc]/10 bg-[#241a47]/50 opacity-50 grayscale'}`}>
                  <b.icon className={`mx-auto mb-0.5 h-5 w-5 ${earned ? 'text-yellow-300' : 'text-[#f3e8ff]/50'}`} />
                  <p className={`text-[8px] leading-tight font-bold ${earned ? 'text-[#f3e8ff]' : 'text-[#f3e8ff]/50'}`}>{b.name}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}