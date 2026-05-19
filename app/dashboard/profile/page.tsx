'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  Award,
  Calendar,
  Clock,
  Star,
  Sword,
  Shield,
  Zap,
  Trophy,
  Lock,
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import Card from '@/components/ui/Card'
import { characterOptions } from '@/lib/characterOptions'
import { BADGES, getBadgeById } from '@/lib/badges'

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
  const { user, isAuthed, logout } = useAuth()
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-sm font-game text-[#006d2c]">Loading profile...</div>
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
    <div className="space-y-6 pb-20">
      {/* Character Info - Larger Display */}
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        {/* Character Avatar & Basic Info */}
        <Card glow="green" className="w-full flex-shrink-0 py-5 md:w-56">
          <div className="relative h-52 -m-5 mb-1 sm:h-64 sm:-m-6 md:h-56 md:-m-5">
            <Image
              src={charOption?.imagePath ?? '/AVATAR CHARACTERS/3 AVATAR/2D-KNIGHT BOY CHARACTER/_PNG/1_KNIGHT_ AVATAR/Knight_01__IDLE_000.png'}
              alt={character.class}
              fill
              className="object-contain opacity-90 scale-[1.18] origin-bottom sm:scale-[1.4] md:scale-[1.22]"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a2915] to-transparent" />
          </div>
          <div className="relative z-10 -mt-4 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-xl border-4 border-[#0a2915] bg-gradient-to-br from-[#238b45] to-[#74c476] sm:h-28 sm:w-28 md:h-24 md:w-24">
              <span className="text-3xl font-bold text-[#041008] font-game sm:text-4xl md:text-3xl">{character.name.slice(0, 2).toUpperCase()}</span>
            </div>
            <h2 className="mt-3 text-lg font-bold text-[#041008] font-game sm:text-xl">{character.name}</h2>
            <p className="mt-1 text-xs capitalize text-[#041008]/65 sm:text-sm">{character.class} · Lvl {stats.level}</p>
          </div>
        </Card>

        {/* Profile Details */}
        <Card glow="green" className="flex-1 py-5 md:py-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-6 h-6 text-[#74c476]" />
              <span className="text-lg font-bold text-[#041008] font-game">Profile Details</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#74c476]/15 bg-[#0a2915] px-4 py-3">
                <span className="text-xs uppercase tracking-[0.2em] text-[#74c476]/70 block">Class</span>
                <span className="mt-1 block text-lg font-bold text-[#e5f5e0] capitalize">{character.class}</span>
              </div>
              <div className="rounded-xl border border-[#74c476]/15 bg-[#0a2915] px-4 py-3">
                <span className="text-xs uppercase tracking-[0.2em] text-[#74c476]/70 block">Level</span>
                <span className="mt-1 block text-lg font-bold text-[#e5f5e0]">Lvl {stats.level}</span>
              </div>
              <div className="rounded-xl border border-[#74c476]/15 bg-[#0a2915] px-4 py-3">
                <span className="text-xs uppercase tracking-[0.2em] text-[#74c476]/70 block">Current Zone</span>
                <span className="mt-1 block text-lg font-bold text-[#e5f5e0]">Zone {progress?.currentZone ?? 1}</span>
              </div>
              <div className="rounded-xl border border-[#74c476]/15 bg-[#0a2915] px-4 py-3">
                <span className="text-xs uppercase tracking-[0.2em] text-[#74c476]/70 block">Playtime</span>
                <span className="mt-1 block text-lg font-bold text-[#e5f5e0]">{playtimeLabel}</span>
              </div>
              <div className="rounded-xl border border-[#74c476]/15 bg-[#0a2915] px-4 py-3">
                <span className="text-xs uppercase tracking-[0.2em] text-[#74c476]/70 block">Member Since</span>
                <span className="mt-1 block text-lg font-bold text-[#e5f5e0]">{new Date(user.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#74c476]/15 bg-[#0a2915] px-4 py-3">
                <span className="text-xs uppercase tracking-[0.2em] text-[#74c476]/70 block">Role</span>
                <span className="mt-1 block text-lg font-bold text-[#e5f5e0] capitalize">{user.role}</span>
              </div>
              <div className="rounded-xl border border-[#74c476]/15 bg-[#0a2915] px-4 py-3">
                <span className="text-xs uppercase tracking-[0.2em] text-[#74c476]/70 block">Complete</span>
                <span className="mt-1 block text-lg font-bold text-[#e5f5e0]">{completionPercent}%</span>
              </div>
              <div className="rounded-xl border border-[#74c476]/15 bg-[#0a2915] px-4 py-3">
                <span className="text-xs uppercase tracking-[0.2em] text-[#74c476]/70 block">Left</span>
                <span className="mt-1 block text-lg font-bold text-[#e5f5e0]">{remainingLevels} levels</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#74c476]/15 bg-[#0a2915] px-4 py-3">
              <span className="text-xs uppercase tracking-[0.2em] text-[#74c476]/70 block">Unlocked Classes</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {access.ownedClasses.length > 0 ? (
                  access.ownedClasses.map(className => (
                    <span
                      key={className}
                      className="rounded-full border border-[#74c476]/20 bg-[#041008] px-3 py-1 text-sm font-medium capitalize text-[#e5f5e0]"
                    >
                      {className}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[#c7e9c0]/70">No unlocked classes yet</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress & Account Stats - Larger display */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Game Stats */}
        <Card glow="green" padding="md">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-6 h-6 text-[#74c476]" />
            <span className="text-lg font-bold text-[#041008] font-game">Progress</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between bg-[#0a2915] rounded-xl px-4 py-3">
              <Star className="w-5 h-5 text-[#c7e9c0]" />
              <span className="text-xl font-bold text-[#c7e9c0]">{access.starBalance}</span>
            </div>
            <div className="flex items-center justify-between bg-[#0a2915] rounded-xl px-4 py-3">
              <Trophy className="w-5 h-5 text-[#74c476]" />
              <span className="text-xl font-bold text-[#041008]">{completedCount}/5</span>
            </div>
            <div className="flex items-center justify-between bg-[#0a2915] rounded-xl px-4 py-3">
              <Clock className="w-5 h-5 text-primary-300" />
              <span className="text-xl font-bold text-[#041008]">{hours > 0 ? `${hours}h` : `${minutes}m`}</span>
            </div>
            <div className="flex items-center justify-between bg-[#0a2915] rounded-xl px-4 py-3">
              <Award className="w-5 h-5 text-primary-200" />
              <span className="text-xl font-bold text-[#041008]">Zone {progress?.currentZone ?? 1}</span>
            </div>
          </div>
        </Card>

        {/* Account Info */}
        <Card glow="green" padding="md">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-6 h-6 text-[#74c476]" />
            <span className="text-lg font-bold text-[#041008] font-game">Account</span>
          </div>
          <div className="space-y-3">
            <div className="bg-[#0a2915] rounded-xl px-4 py-3">
              <span className="text-sm text-[#041008]/45 block">Username</span>
              <span className="block break-words text-lg font-bold text-[#041008]">{user.username}</span>
            </div>
            <div className="bg-[#0a2915] rounded-xl px-4 py-3">
              <span className="text-sm text-[#041008]/45 block">Email</span>
              <span className="block break-words text-lg font-bold text-[#041008]">{user.email}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Badges & Achievements */}
      <Card glow="green" padding="md">
        <div className="flex items-center gap-3 mb-4">
          <Award className="w-6 h-6 text-[#74c476]" />
          <span className="text-lg font-bold text-[#041008] font-game">Badges & Achievements</span>
          <span className="ml-auto rounded-full bg-[#0a2915] px-3 py-1 text-sm font-bold text-[#74c476]">
            {earnedBadges.length}/{BADGES.length}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BADGES.map(badge => {
            const earned = earnedBadges.includes(badge.id)
            return (
              <div
                key={badge.id}
                className={`relative rounded-xl border px-4 py-3 transition ${
                  earned
                    ? 'border-[#74c476]/30 bg-[#0a2915]'
                    : 'border-[#74c476]/10 bg-[#0a2915]/50 opacity-50 grayscale'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{badge.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold ${earned ? 'text-[#e5f5e0]' : 'text-[#e5f5e0]/60'}`}>
                      {badge.name}
                    </p>
                    <p className={`text-xs ${earned ? 'text-[#c7e9c0]/80' : 'text-[#c7e9c0]/40'}`}>
                      {badge.description}
                    </p>
                  </div>
                  {!earned && (
                    <Lock className="h-4 w-4 shrink-0 text-[#74c476]/40" />
                  )}
                </div>
                {earned && (
                  <div className="mt-2 flex items-center gap-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#74c476]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#74c476]">
                      <Award className="h-3 w-3" /> Earned
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}