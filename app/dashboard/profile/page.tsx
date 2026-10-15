'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { characterOptions } from '@/lib/characterOptions'
import { BADGES } from '@/lib/badges'
import { levelStories } from '@/lib/storyContent'

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
  // Playtime readouts removed (2026-10 item 16): answering is untimed, so the
  // "0m" never moved and only confused the panel.
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
            </div>
          </div>
        </div>

        {/* Compact Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-[#9B83F5]/15 bg-[#3459C7]/35 px-2 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-[#9B83F5]/70">Class</p>
            <p className="text-xs font-bold text-[#F4F2FF] capitalize mt-0.5">{character.class}</p>
          </div>
          <div className="rounded-lg border border-[#9B83F5]/15 bg-[#3459C7]/35 px-2 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-[#9B83F5]/70">Level</p>
            <p className="text-xs font-bold text-[#F4F2FF] mt-0.5">{stats.level}</p>
          </div>
          <div className="rounded-lg border border-[#9B83F5]/15 bg-[#3459C7]/35 px-2 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-[#9B83F5]/70">Zone</p>
            <p className="text-xs font-bold text-[#F4F2FF] mt-0.5">{progress?.currentZone ?? 1}</p>
          </div>
          <div className="rounded-lg border border-[#9B83F5]/15 bg-[#3459C7]/35 px-2 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-[#9B83F5]/70">Member</p>
            <p className="text-xs font-bold text-[#F4F2FF] mt-0.5">{new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div className="rounded-lg border border-[#9B83F5]/15 bg-[#3459C7]/35 px-2 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-[#9B83F5]/70">Left</p>
            <p className="text-xs font-bold text-[#F4F2FF] mt-0.5">{remainingLevels} lvls</p>
          </div>
        </div>

        {/* Progress */}
        <div className="rounded-lg border border-[#9B83F5]/15 bg-[#22326f]/55 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white font-game">Progress</span>
            <span className="text-xs font-bold text-[#9B83F5]">{completedCount}/5</span>
          </div>
          <div className="h-2 rounded-full bg-[#3459C7]/35 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#6255E8] to-[#9B83F5] transition-all" style={{ width: `${completionPercent}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-2 divide-x divide-white/10">
            <div className="text-center">
              <p className="text-lg font-black text-white">{access.starBalance}</p>
              <p className="text-[10px] text-white/50 uppercase">Stars</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-white">{completionPercent}%</p>
              <p className="text-[10px] text-white/50 uppercase">Complete</p>
            </div>
          </div>
        </div>

        {/* Owned classes */}
        <div className="rounded-lg border border-[#9B83F5]/15 bg-[#22326f]/55 p-3">
          <p className="text-xs font-bold text-white/80 mb-2">Unlocked Classes</p>
          {access.ownedClasses.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {access.ownedClasses.map(c => (
                <span key={c} className="rounded-full border border-[#9B83F5]/20 bg-[#3459C7]/35 px-2.5 py-0.5 text-[10px] font-medium capitalize text-[#F4F2FF]">
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-white/40">No unlocked classes yet</p>
          )}
        </div>

        {/* Account card removed (2026-10 panel feedback): students sign in with a
            username and password only, and the email here is a generated
            placeholder (name@student.mindspark) that only confused them. */}

        {/* Trophies — earned by clearing each level; shown before badges */}
        <div className="rounded-lg border border-amber-400/20 bg-[#22326f]/55 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-white/80">Trophies</p>
            <span className="text-[10px] font-bold text-amber-300">{completedCount}/{levelStories.length}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {levelStories.map(t => {
              const earned = (progress?.completedLevels ?? []).includes(t.level)
              return (
                <div key={t.level} className={`shrink-0 w-16 rounded-lg border px-2 py-1.5 text-center ${earned ? 'border-amber-400/40 bg-[#3459C7]/35' : 'border-[#9B83F5]/10 bg-[#3459C7]/35/50 opacity-50 grayscale'}`}>
                  <Image src={t.trophyImage} alt={t.trophyName} width={40} height={40} unoptimized className="mx-auto mb-0.5 h-9 w-9 object-contain" />
                  <p className={`text-[8px] leading-tight font-bold ${earned ? 'text-[#F4F2FF]' : 'text-[#F4F2FF]/50'}`}>{t.trophyName.replace(/ Trophy$/, '')}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Badges — centered, no per-badge card, wraps instead of scrolling */}
        <div className="rounded-lg border border-[#9B83F5]/15 bg-[#22326f]/55 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-white/80">Badges</p>
            <span className="text-[10px] font-bold text-[#9B83F5]">{BADGES.filter(b => earnedBadges.includes(b.id)).length}/{BADGES.length}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {BADGES.map(b => {
              const earned = earnedBadges.includes(b.id)
              return (
                <div key={b.id} className={`w-16 text-center ${earned ? '' : 'opacity-50 grayscale'}`}>
                  <Image src={b.image} alt={b.name} width={40} height={40} unoptimized className="mx-auto mb-0.5 h-9 w-9 object-contain" />
                  <p className={`text-[8px] leading-tight font-bold ${earned ? 'text-[#F4F2FF]' : 'text-[#F4F2FF]/50'}`}>{b.name}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}