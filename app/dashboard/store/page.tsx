'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Star, Unlock, Loader2, Check, ChevronLeft, ChevronRight, Heart, Sword, Swords, Wind } from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuth } from '@/hooks/useAuth'
import ScreenTitle from '@/components/game/ScreenTitle'
import { characterOptions, getCharacterOption } from '@/lib/characterOptions'

import type { CharacterClass, CharacterData } from '@/types/character'

type CharacterAccess = {
  starBalance: number
  ownedClasses: CharacterClass[]
  prices: Partial<Record<CharacterClass, number>>
}

const defaultAccess: CharacterAccess = {
  starBalance: 0,
  ownedClasses: [],
  prices: {},
}

function normalizeAccess(meta: unknown, currentClass?: CharacterClass): CharacterAccess {
  const raw = meta && typeof meta === 'object' ? meta as Partial<CharacterAccess> : {}
  const owned = new Set<CharacterClass>()
  if (Array.isArray(raw.ownedClasses)) {
    raw.ownedClasses.forEach(item => owned.add(item))
  }
  if (currentClass) owned.add(currentClass)

  return {
    starBalance: Number(raw.starBalance ?? 0),
    ownedClasses: Array.from(owned),
    prices: raw.prices ?? {},
  }
}

export default function DashboardStorePage() {
  const { user, isAuthed } = useAuth()
  const [character, setCharacter] = useState<CharacterData | null>(null)
  const [access, setAccess] = useState<CharacterAccess>(defaultAccess)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<CharacterClass | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

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
          setAccess(normalizeAccess(json.meta, raw.class))
        } else {
          setAccess(normalizeAccess(json.meta))
        }
      })
      .finally(() => setLoading(false))
  }, [isAuthed, user?.role])

  const handlePurchase = async (characterClass: CharacterClass) => {
    const option = getCharacterOption(characterClass)
    setPurchasing(characterClass)
    try {
      const res = await fetch('/api/character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ class: characterClass, name: `${user?.username}'s ${option.label}` }),
      })
      const json = await res.json()
      if (json.success) {
        setAccess(prev => ({
          ...prev,
          starBalance: json.meta.starBalance,
          ownedClasses: json.meta.ownedClasses,
        }))
        setCharacter(json.data)
        toast.success(json.message === 'Character selected' ? `${option.label} is now your hero!` : `Unlocked ${option.label}!`)
      } else {
        toast.error(json.message || 'Unlock failed')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setPurchasing(null)
    }
  }

  const currentOption = characterOptions[currentIndex]
  const owned = access.ownedClasses.includes(currentOption.class) || character?.class === currentOption.class
  const current = character?.class === currentOption.class
  const price = access.prices[currentOption.class] ?? currentOption.unlockCost

  const classTheme: Record<string, { border: string; bgColor: string; label: string; labelColor: string; statBg: string; accent: string; rarity: number }> = {
    warrior: { border: 'border-blue-500', bgColor: '#0a1a3a', label: 'WARRIOR', labelColor: 'text-blue-400', statBg: 'bg-blue-900/40', accent: '#3b82f6', rarity: 5 },
    mage:    { border: 'border-fuchsia-500', bgColor: '#1a0a2e', label: 'MAGE', labelColor: 'text-fuchsia-400', statBg: 'bg-fuchsia-900/40', accent: '#d946ef', rarity: 4 },
    archer:  { border: 'border-green-500', bgColor: '#0a1f0a', label: 'ARCHER', labelColor: 'text-green-400', statBg: 'bg-green-900/40', accent: '#22c55e', rarity: 4 },
  }
  const theme = classTheme[currentOption.class] ?? classTheme['warrior']

  const canNext = currentIndex < characterOptions.length - 1
  const canPrev = currentIndex > 0

  const hpPct = Math.min((currentOption.stats.maxHp / 150) * 100, 100)
  const atkPct = Math.min((currentOption.stats.attack / 20) * 100, 100)
  const spdPct = Math.min((currentOption.stats.speed / 10) * 100, 100)

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm font-game text-purple-300">Loading avatars...</div>
      </div>
    )
  }

  const statRows = [
    { label: 'HP', icon: Heart, value: currentOption.stats.maxHp, pct: hpPct, bar: 'from-[#86efac] to-[#16a34a]', iconClass: 'fill-[#f87171] text-[#dc2626]' },
    { label: 'ATK', icon: Swords, value: currentOption.stats.attack, pct: atkPct, bar: 'from-[#a5f3fc] to-[#0ea5e9]', iconClass: 'text-[#67e8f9]' },
    { label: 'SPD', icon: Wind, value: currentOption.stats.speed, pct: spdPct, bar: 'from-[#ddd6fe] to-[#7c3aed]', iconClass: 'text-[#c4b5fd]' },
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header (suggested design, Nov 24): back, star badge, title, star count.
          "Store" label removed, title renamed (panel revision, Nov 2026b) */}
      <div className="shrink-0 px-3 pt-1">
        <ScreenTitle title="Unlock Avatar" icon={Star}>
          <span data-testid="star-balance" className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-[#a78bfa]/70 bg-[#2a1466]/85 px-2.5 py-0.5 shadow-md">
            <Star className="h-4 w-4 fill-[var(--ms-gold)] text-[color:var(--ms-gold-deep)]" />
            <span className="text-sm font-black text-white">{access.starBalance}</span>
          </span>
        </ScreenTitle>
      </div>

      {/* Info card + the hero on a pedestal over the kingdom art */}
      <div className="flex min-h-0 flex-1 gap-2 px-3 pb-1 pt-1.5">
        <div
          className="game-panel flex w-[54%] min-w-0 flex-col justify-between gap-1.5 px-3 py-2"
          style={{
            borderColor: theme.accent,
            boxShadow: current ? `0 0 18px ${theme.accent}66, inset 0 1px 0 rgba(255,255,255,0.22)` : undefined,
          }}
        >
          <div>
            <span
              className="inline-flex items-center gap-1.5 rounded-md border border-white/40 px-2.5 py-0.5 text-[11px] font-black tracking-widest text-white shadow"
              style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}99)` }}
            >
              <Sword className="h-3.5 w-3.5" /> {theme.label}
            </span>
            <h3 className="game-title mt-1 text-2xl">{currentOption.label}</h3>
            <div className="mt-0.5 flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < theme.rarity ? 'fill-[var(--ms-gold)] text-[color:var(--ms-gold-deep)]' : 'text-white/25'}`}
                />
              ))}
            </div>
          </div>

          {/* Stats: icon, coloured bar, value */}
          <div className="space-y-1">
            {statRows.map(({ label, icon: Icon, value, pct, bar, iconClass }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClass}`} />
                <span className="w-7 text-[10px] font-black text-white/80">{label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full border border-black/30 bg-[#081648]">
                  <div className={`h-full rounded-full bg-gradient-to-r ${bar}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="w-7 text-right text-[11px] font-black text-white">{value}</span>
              </div>
            ))}
          </div>

          <p className="line-clamp-2 text-center text-[11px] italic leading-snug text-white/80">{currentOption.description}</p>

          {/* Action: the gold-framed button */}
          <div className="px-3">
            {owned ? (
              current ? (
                <div role="status" className="game-btn-gold w-full py-1 text-base">
                  <Check className="h-5 w-5 text-[#4ade80]" strokeWidth={3} /> Equipped
                </div>
              ) : (
                // Owned characters switch for free — a full-size button, like Unlock
                <button
                  onClick={() => handlePurchase(currentOption.class)}
                  disabled={purchasing === currentOption.class}
                  className="game-btn-gold w-full py-1 text-sm"
                >
                  {purchasing === currentOption.class
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Switching...</>
                    : <><Check className="h-4 w-4" />Owned — Use this hero</>}
                </button>
              )
            ) : (
              <button
                onClick={() => handlePurchase(currentOption.class)}
                disabled={purchasing === currentOption.class || access.starBalance < price}
                className="game-btn-gold w-full py-1 text-sm"
              >
                {purchasing === currentOption.class ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Unlocking...</>
                ) : access.starBalance < price ? (
                  <><Star className="h-4 w-4" />Need {price} stars</>
                ) : (
                  <><Unlock className="h-4 w-4" />Unlock for {price} stars</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Showcase */}
        <div className="character-showcase" style={{ color: theme.accent }}>
          <span className="game-pedestal" aria-hidden />
          <Image
            src={currentOption.imagePath}
            alt={currentOption.label}
            width={220}
            height={220}
            className="character-sprite"
            unoptimized
          />
        </div>
      </div>

      {/* Navigation dots + arrows */}
      <div className="shrink-0 flex items-center justify-between px-3 pb-1.5">
        <button onClick={() => setCurrentIndex(i => i - 1)} disabled={!canPrev} aria-label="Previous avatar" className="game-badge game-badge-blue h-8 w-8 disabled:opacity-30">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex gap-1.5">
          {characterOptions.map((option, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)} aria-label={`Show ${option.label}`} className={`h-2 rounded-full transition-all ${i === currentIndex ? 'w-5 bg-white' : 'w-2 bg-white/40'}`} />
          ))}
        </div>
        <button onClick={() => setCurrentIndex(i => i + 1)} disabled={!canNext} aria-label="Next avatar" className="game-badge game-badge-blue h-8 w-8 disabled:opacity-30">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
