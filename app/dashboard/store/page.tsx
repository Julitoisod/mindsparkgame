'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, Store, ShoppingCart, Loader2, Check } from 'lucide-react'
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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-sm font-game text-purple-300">Loading store...</div>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-purple-300">Store</p>
          <h2 className="font-game text-3xl font-black">Character Unlocks</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-purple-900/40 backdrop-blur-md px-4 py-2">
            <Star className="h-5 w-5 fill-current text-purple-300" />
            <span className="text-lg font-black text-purple-300">{access.starBalance}</span>
          </div>
          <Link
            href="/character-select"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#7e22ce] px-5 text-sm font-black text-[#faf5ff] transition hover:bg-[#9333ea]"
          >
            <Store className="h-4 w-4" />
            Manage Characters
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {characterOptions.map(option => {
          const owned = access.ownedClasses.includes(option.class) || character?.class === option.class
          const current = character?.class === option.class
          const price = access.prices[option.class] ?? option.unlockCost

          const classTheme: Record<string, { border: string; bg: string; label: string; labelColor: string; statBg: string }> = {
            warrior: { border: 'border-blue-500', bg: 'bg-[#0a1a3a]', label: 'WARRIOR', labelColor: 'text-blue-400', statBg: 'bg-blue-900/40' },
            mage:    { border: 'border-fuchsia-500', bg: 'bg-[#1a0a2e]', label: 'MAGE', labelColor: 'text-fuchsia-400', statBg: 'bg-fuchsia-900/40' },
            archer:  { border: 'border-green-500', bg: 'bg-[#0a1f0a]', label: 'ARCHER', labelColor: 'text-green-400', statBg: 'bg-green-900/40' },
          }
          const theme = classTheme[option.class] ?? classTheme['warrior']

          return (
            <article key={option.class} className={`rounded-xl border-2 ${theme.border} ${theme.bg} p-5 shadow-lg flex flex-col`}>
              <div className="relative h-44 w-full overflow-hidden rounded-lg">
                <Image
                  src={option.imagePath}
                  alt={option.label}
                  fill
                  sizes="(min-width: 768px) 28vw, 90vw"
                  className="object-contain object-center drop-shadow-[0_12px_20px_rgba(0,0,0,0.6)] scale-[1.9] origin-center"
                  unoptimized
                />
              </div>
              <div className="mt-4 flex-1 flex flex-col">
                <p className={`text-xs font-black uppercase tracking-widest ${theme.labelColor}`}>{theme.label}</p>
                <h3 className="mt-1 text-2xl font-black text-white">{option.label}</h3>
                <p className="mt-2 text-sm font-semibold text-white/65 flex-1">{option.description}</p>

                {/* Stats */}
                <div className="mt-4 flex gap-2">
                  <span className={`flex items-center gap-1 rounded-full ${theme.statBg} px-3 py-1.5 text-xs font-black text-white`}>
                    ❤️ HP {option.stats.maxHp}
                  </span>
                  <span className={`flex items-center gap-1 rounded-full ${theme.statBg} px-3 py-1.5 text-xs font-black text-white`}>
                    ⚔️ ATK {option.stats.attack}
                  </span>
                  <span className={`flex items-center gap-1 rounded-full ${theme.statBg} px-3 py-1.5 text-xs font-black text-white`}>
                    💨 SPD {option.stats.speed}
                  </span>
                </div>

                {/* Owned / Buy / Select */}
                {owned ? (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5">
                    <Check className="h-5 w-5 text-green-400" />
                    <span className="text-sm font-black text-green-300">{current ? 'Equipped' : 'Owned'}</span>
                    {!current && (
                      <button
                        onClick={() => handlePurchase(option.class)}
                        className="ml-auto rounded-lg bg-white/10 px-3 py-1 text-xs font-black text-white transition hover:bg-white/20"
                      >
                        Select
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handlePurchase(option.class)}
                    disabled={purchasing === option.class || access.starBalance < price}
                    className={`mt-4 w-full rounded-lg border-2 ${theme.border} py-2.5 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-purple-300/60 flex items-center justify-center gap-2`}
                  >
                    {purchasing === option.class ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Buying...</>
                    ) : access.starBalance < price ? (
                      <><Star className="h-4 w-4" />Not enough stars</>
                    ) : (
                      <><ShoppingCart className="h-4 w-4" />Buy for {price} stars</>
                    )}
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}