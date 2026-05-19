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
        <div className="text-sm font-game text-[#006d2c]">Loading store...</div>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#238b45]">Store</p>
          <h2 className="font-game text-3xl font-black">Character Unlocks</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-[#e5f5e0] px-4 py-2">
            <Star className="h-5 w-5 fill-current text-[#238b45]" />
            <span className="text-lg font-black text-[#006d2c]">{access.starBalance}</span>
          </div>
          <Link
            href="/character-select"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#006d2c] px-5 text-sm font-black text-[#f7fcf5] transition hover:bg-[#238b45]"
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
          return (
            <article key={option.class} className="rounded-lg border border-[#006d2c]/15 bg-[#f7fcf5] p-4 shadow-sm">
              <div className="relative h-40 sm:h-48">
                <Image
                  src={option.imagePath}
                  alt={option.label}
                  fill
                  sizes="(min-width: 768px) 28vw, 90vw"
                  className="object-contain object-center scale-[2] sm:scale-[2.2]"
                  unoptimized
                />
              </div>
              <h3 className="mt-3 text-xl font-black">{option.label}</h3>
              <p className="mt-1 text-sm font-semibold text-[#00441b]/65">{option.description}</p>
              <div className="mt-4 flex items-center justify-between rounded-lg bg-[#e5f5e0] px-3 py-2">
                <span className="text-xs font-black uppercase text-[#006d2c]">{current ? 'Equipped' : owned ? 'Owned' : 'Locked'}</span>
                <span className="flex items-center gap-1 text-sm font-black">
                  <Star className="h-4 w-4 fill-current text-[#238b45]" />
                  {owned ? 0 : price}
                </span>
              </div>
              {!owned && (
                <button
                  onClick={() => handlePurchase(option.class)}
                  disabled={purchasing === option.class || access.starBalance < price}
                  className="mt-3 w-full rounded-lg bg-[#006d2c] py-2 text-sm font-black text-[#f7fcf5] transition hover:bg-[#238b45] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {purchasing === option.class ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buying...
                    </>
                  ) : access.starBalance < price ? (
                    <>
                      <Star className="h-4 w-4" />
                      Not enough stars
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" />
                      Buy for {price} stars
                    </>
                  )}
                </button>
              )}
              {owned && !current && (
                <button
                  onClick={() => handlePurchase(option.class)}
                  className="mt-3 w-full rounded-lg border-2 border-[#006d2c] py-2 text-sm font-black text-[#006d2c] transition hover:bg-[#e5f5e0] flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  Select
                </button>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}