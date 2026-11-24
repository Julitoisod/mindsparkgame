'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { BarChart3, CalendarDays, Crown, Gift, Lock, MapPin, Shield, Star, Trophy, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { characterOptions } from '@/lib/characterOptions'
import { BADGES } from '@/lib/badges'
import { levelStories } from '@/lib/storyContent'
import { trophyLevels } from '@/lib/scoring'
import { ChangePasswordForm } from '@/components/account/AccountSettings'

import type { CharacterData, CharacterStats } from '@/types/character'

interface GameProgress {
  currentZone: number
  completedLevels: number[]
  playtimeSeconds: number
  /** Levels whose boss was defeated — one Forest Trophy each */
  trophies: number[]
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
            trophies: trophyLevels(progRes.data.questFlags),
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
  // Suggested design (Nov 24): every tile carries an icon badge
  const tiles = [
    { label: 'Class', value: character.class.charAt(0).toUpperCase() + character.class.slice(1), icon: Shield, badge: 'game-badge-gold' },
    { label: 'Level', value: String(stats.level), icon: Star, badge: 'game-badge-blue' },
    { label: 'Zone', value: String(progress?.currentZone ?? 1), icon: MapPin, badge: 'game-badge-green' },
    { label: 'Member', value: new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), icon: CalendarDays, badge: 'game-badge-red' },
    { label: 'Left', value: `${remainingLevels} lvls`, icon: Zap, badge: 'game-badge-gold' },
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Scrollable content */}
      <div className="student-scroll-area px-3 py-4 space-y-4">
        {/* Hero header (suggested design, Nov 24): gold-framed portrait under a
            crown, the name on a banner. Keeps clear of the nav tray. */}
        <div className="student-page-head -mt-1 flex items-center">
          <div className="relative z-10 shrink-0">
            <Crown className="absolute -top-3.5 left-1/2 z-10 h-5 w-5 -translate-x-1/2 fill-[var(--ms-gold)] text-[color:var(--ms-gold-deep)]" />
            <div className="game-panel game-panel-gold relative h-14 w-14 overflow-hidden rounded-xl">
              <Image
                src={charOption?.imagePath ?? '/AVATAR CHARACTERS/3 AVATAR/2D-KNIGHT BOY CHARACTER/_PNG/1_KNIGHT_ AVATAR/Knight_01__IDLE_000.png'}
                alt={character.class}
                fill
                className="scale-[1.9] object-contain"
                unoptimized
              />
            </div>
          </div>
          <div className="game-panel -ml-2.5 min-w-0 rounded-l-none rounded-r-2xl py-1 pl-5 pr-4">
            <h2 className="game-title truncate text-lg">{character.name}</h2>
            <p className="flex items-center gap-1 text-[11px] font-bold capitalize text-[#ffe08a]">
              <Crown className="h-3 w-3" /> {character.class} · Lvl {stats.level} · {completionPercent}%
            </p>
            <p className="flex items-center gap-1 text-[10px] font-semibold text-white/75">
              <Star className="h-3 w-3 fill-[var(--ms-gold)] text-[color:var(--ms-gold)]" /> {access.starBalance} stars
              <span className="text-white/35">|</span> {completedCount}/5 done
            </p>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-2">
          {tiles.map(({ label, value, icon: Icon, badge }) => (
            <div key={label} className="game-panel flex min-w-0 items-center gap-2 px-2.5 py-1.5">
              <span className={`game-badge ${badge} h-8 w-8`}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-[#ffd76a]">{label}</p>
                <p className="truncate text-sm font-black text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Progress: gold tab, gold bar, stars + completion */}
        <div className="game-panel px-3 pb-2.5 pt-4">
          <span className="game-pill-gold absolute -top-2.5 left-3 text-[11px]"><BarChart3 className="h-3.5 w-3.5" /> Progress</span>
          <span className="game-pill-gold absolute -top-2.5 right-3 text-[11px]">{completedCount}/5</span>
          <div className="h-2.5 overflow-hidden rounded-full border border-black/30 bg-[#081648]">
            <div className="h-full rounded-full bg-gradient-to-r from-[var(--ms-gold-deep)] via-[var(--ms-gold)] to-[var(--ms-gold-light)] transition-all" style={{ width: `${completionPercent}%` }} />
          </div>
          <div className="mt-2 grid grid-cols-2 divide-x divide-white/15">
            <div className="flex items-center justify-center gap-2">
              <Star className="h-6 w-6 fill-[var(--ms-gold)] text-[color:var(--ms-gold-deep)]" />
              <div className="leading-none">
                <p className="game-title text-xl">{access.starBalance}</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-[#ffd76a]">Stars</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Trophy className="h-6 w-6 fill-[var(--ms-gold)] text-[color:var(--ms-gold-deep)]" />
              <div className="leading-none">
                <p className="game-title text-xl">{completionPercent}%</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-[#ffd76a]">Complete</p>
              </div>
            </div>
          </div>
        </div>

        {/* Owned classes */}
        <div className="game-panel game-panel-purple px-3 py-2">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-white">
            <span className="game-badge game-badge-gold h-5 w-5"><Lock className="h-3 w-3" /></span> Unlocked Classes
          </p>
          {access.ownedClasses.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {access.ownedClasses.map(c => (
                <span key={c} className="rounded-full border border-[#93c5fd]/60 bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] px-2.5 py-0.5 text-[10px] font-black capitalize text-white">
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-white/60">No unlocked classes yet</p>
          )}
        </div>

        {/* Account card removed (2026-10 panel feedback): students sign in with a
            username and password only, and the email here is a generated
            placeholder (name@student.mindspark) that only confused them. */}

        {/* Rewards — trophies and badges grouped under one heading (panel revision, Nov 2026b) */}
        <section className="game-panel p-3" data-testid="profile-rewards">
          <div className="mb-2 flex items-center gap-1.5">
            <Gift className="h-4 w-4 text-amber-300" />
            <h3 className="game-title text-base">Rewards</h3>
          </div>
          <div className="space-y-2">
          {/* Trophies — one per boss defeated (Nov 2026); shown before badges */}
          <div className="rounded-lg bg-black/15 p-2.5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-white/80">Trophies</p>
              <span className="text-[10px] font-bold text-amber-300">{progress?.trophies.length ?? 0}/{levelStories.length}</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {levelStories.map(t => {
                const earned = (progress?.trophies ?? []).includes(t.level)
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
          <div className="rounded-lg bg-black/15 p-2.5">
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
        </section>

        {/* Change Password — students manage their own password (Nov 2026) */}
        <div className="game-panel p-3" data-testid="student-change-password">
          <p className="text-xs font-bold text-white/80">Change Password</p>
          <p className="mb-2 text-[10px] text-white/50">Pick a password only you know.</p>
          <ChangePasswordForm tone="dark" />
        </div>
      </div>
    </div>
  )
}