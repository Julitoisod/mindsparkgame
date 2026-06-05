'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Star, ShoppingCart, Loader2, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuth } from '@/hooks/useAuth'
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
        toast.success(`Unlocked ${option.label}!`)
      } else {
        toast.error(json.message || 'Purchase failed')
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
        <div className="text-sm font-game text-purple-300">Loading store...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-purple-300">Store</p>
          <h2 className="font-game text-lg font-black">Unlocks</h2>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-purple-900/40 backdrop-blur-md px-3 py-1.5">
          <Star className="h-4 w-4 fill-current text-purple-300" />
          <span className="text-sm font-black text-purple-300">{access.starBalance}</span>
        </div>
      </div>

      {/* Carousel */}
      <div className="flex-1 flex flex-col min-h-0 px-4 pb-2">
        <div
          className="flex-1 min-h-0 rounded-xl border-2 overflow-hidden relative flex"
          style={{
            borderColor: current ? theme.accent : `${theme.accent}88`,
            background: theme.bgColor,
            boxShadow: current ? `0 0 24px ${theme.accent}44, inset 0 0 24px ${theme.accent}22` : 'none',
          }}
        >
          {/* Left: Info */}
          <div className="flex-1 flex flex-col p-3 min-w-0 gap-2 justify-between">
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest ${theme.labelColor}`}>{theme.label}</p>
              <h3 className="text-lg font-black text-white leading-tight mt-0.5">{currentOption.label}</h3>
              <div className="flex items-center gap-0.5 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${i < theme.rarity ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}`}
                  />
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-6 text-[9px] font-black text-white/50">HP</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${hpPct}%`, background: theme.accent }} />
                </div>
                <span className="text-[10px] font-black text-white w-5 text-right">{currentOption.stats.maxHp}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 text-[9px] font-black text-white/50">ATK</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${atkPct}%`, background: theme.accent }} />
                </div>
                <span className="text-[10px] font-black text-white w-5 text-right">{currentOption.stats.attack}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 text-[9px] font-black text-white/50">SPD</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${spdPct}%`, background: theme.accent }} />
                </div>
                <span className="text-[10px] font-black text-white w-5 text-right">{currentOption.stats.speed}</span>
              </div>
            </div>

            <div>
              <p className="text-[11px] text-white/70 leading-snug line-clamp-3">{currentOption.description}</p>
            </div>

            {/* Action */}
            <div className="mt-1">
              {owned ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1">
                    <Check className="h-3.5 w-3.5 text-green-400" />
                    <span className="text-[10px] font-black text-green-300">{current ? 'Equipped' : 'Owned'}</span>
                  </div>
                  {!current && (
                    <button
                      onClick={() => handlePurchase(currentOption.class)}
                      className="ml-auto rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-black text-white transition hover:bg-white/20"
                    >
                      Select
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => handlePurchase(currentOption.class)}
                  disabled={purchasing === currentOption.class || access.starBalance < price}
                  className="w-full rounded-lg border-2 py-2 text-sm font-black text-white transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ borderColor: theme.accent }}
                >
                  {purchasing === currentOption.class ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Buying...</>
                  ) : access.starBalance < price ? (
                    <><Star className="h-4 w-4" />Need {price} stars</>
                  ) : (
                    <><ShoppingCart className="h-4 w-4" />Buy for {price} stars</>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right: Sprite */}
          <div className="character-showcase" style={{ color: theme.accent }}>
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
        <div className="shrink-0 flex items-center justify-between py-2">
          <button onClick={() => setCurrentIndex(i => i - 1)} disabled={!canPrev} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-30 text-white">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-1.5">
            {characterOptions.map((_, i) => (
              <button key={i} onClick={() => setCurrentIndex(i)} className={`h-2 rounded-full transition-all ${i === currentIndex ? 'w-5 bg-white' : 'w-2 bg-white/30'}`} />
            ))}
          </div>
          <button onClick={() => setCurrentIndex(i => i + 1)} disabled={!canNext} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-30 text-white">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
