'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Gamepad2, Heart, Lock, LogOut, Sparkles, Star, Swords, Wind } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { characterOptions } from '@/lib/characterOptions'
import Button from '@/components/ui/Button'
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

export default function CharacterSelectPage() {
  const router = useRouter()
  const { user, loading: authLoading, isAuthed, logout } = useAuth()
  const [existingCharacter, setExistingCharacter] = useState<CharacterData | null>(null)
  const [selectedClass, setSelectedClass] = useState<CharacterClass>('warrior')
  const [name, setName] = useState('')
  const [loadingCharacter, setLoadingCharacter] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [access, setAccess] = useState<CharacterAccess>(defaultAccess)

  useEffect(() => {
    if (authLoading) return
    if (!isAuthed) {
      router.replace('/login')
      return
    }
    if (user?.role === 'teacher') {
      router.replace('/teacher/students')
    }
  }, [authLoading, isAuthed, router, user?.role])

  useEffect(() => {
    if (user?.role !== 'student') return

    fetch('/api/character', { credentials: 'include' })
      .then(response => response.json())
      .then(json => {
        const character = json.success && json.data?.length ? json.data[0] : null
        if (character) {
          setExistingCharacter(character)
          setSelectedClass(character.class)
          setName(character.name)
          setAccess(normalizeAccess(json.meta, character.class))
        } else {
          setName(`${user.username}'s Hero`)
          setAccess(normalizeAccess(json.meta))
        }
      })
      .finally(() => setLoadingCharacter(false))
  }, [user])

  async function saveSelection() {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, class: selectedClass }),
      })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.message ?? 'Failed to save character')
      if (json.meta) setAccess(normalizeAccess(json.meta, selectedClass))
      router.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save character')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loadingCharacter || user?.role !== 'student') {
    return (
      <main className="flex h-full items-center justify-center bg-game-gradient text-primary-300">
        <Sparkles className="mr-3 h-5 w-5 animate-pulse" />
        <span className="font-game text-sm">Preparing character selection...</span>
      </main>
    )
  }

  const selectedOption = characterOptions.find(option => option.class === selectedClass) ?? characterOptions[0]
  const firstPick = !existingCharacter
  const selectedOwned = firstPick || access.ownedClasses.includes(selectedClass) || existingCharacter?.class === selectedClass
  const selectedPrice = access.prices[selectedClass] ?? selectedOption.unlockCost
  const selectedLocked = !selectedOwned
  const selectedAffordable = access.starBalance >= selectedPrice

  return (
    <main className="relative h-dvh overflow-hidden text-white">
      {/* 2026-10 revision item 9: artwork supplied by the panel */}
      <Image
        src="/revision/character-select-bg.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[#22326f]/45" />

      <div className="relative z-10 flex h-full flex-col">
      <nav className="sticky top-0 z-20 border-b border-[#9B83F5]/30 bg-[#22326f]/80 px-4 py-1.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Gamepad2 className="h-5 w-5 shrink-0 text-[#c084fc]" />
            <h1 className="truncate text-base font-black font-game">Choose Character</h1>
            <p className="truncate text-[11px] text-primary-100/45">{user.username} adventure profile</p>
          </div>
          <Button variant="ghost" size="sm" icon={<LogOut className="h-3.5 w-3.5" />} onClick={logout}>
            Sign Out
          </Button>
        </div>
      </nav>

      <section className="mx-auto w-full max-w-7xl px-4 py-2 student-scroll-area">
        {/* Item 8: centered title, avatar row, then one Enter Dashboard button.
            The star counter that used to sit here is gone — stars live in the
            dashboard only (item 7). The character name is assigned
            automatically so the student just picks a face and goes. */}
        <div className="mb-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D9B8FF]">
            {existingCharacter ? 'Current avatar' : 'First login setup'}
          </p>
          <h2 className="mt-1 flex items-center justify-center gap-3 text-xl font-black leading-tight">
            <Sparkles className="h-4 w-4 text-[#D9B8FF]" />
            Pick your avatar to start
            <Sparkles className="h-4 w-4 text-[#D9B8FF]" />
          </h2>
          <p className="mt-1 text-[11px] font-semibold text-[#F4F2FF]/75">
            {existingCharacter
              ? 'First avatar is locked in. Unlock more with stars from boss clears.'
              : 'Your first avatar is free! Unlock more later with earned stars.'}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {characterOptions.map(option => {
            const selected = selectedClass === option.class
            const firstPick = !existingCharacter
            const owned = firstPick || access.ownedClasses.includes(option.class) || existingCharacter?.class === option.class
            const price = access.prices[option.class] ?? option.unlockCost
            const canAfford = access.starBalance >= price
            const locked = !owned

            const classTheme: Record<string, { border: string; bg: string; labelColor: string; label: string; statBg: string; ring: string }> = {
              warrior: { border: 'border-blue-500',    bg: 'bg-[#0a1a3a]', labelColor: 'text-blue-400',    label: 'WARRIOR', statBg: 'bg-blue-900/40',    ring: 'ring-blue-400/40' },
              mage:    { border: 'border-fuchsia-500', bg: 'bg-[#1a0a2e]', labelColor: 'text-fuchsia-400', label: 'MAGE',    statBg: 'bg-fuchsia-900/40', ring: 'ring-fuchsia-400/40' },
              archer:  { border: 'border-green-500',   bg: 'bg-[#0a1f0a]', labelColor: 'text-green-400',   label: 'ARCHER',  statBg: 'bg-green-900/40',   ring: 'ring-green-400/40' },
            }
            const theme = classTheme[option.class] ?? classTheme['warrior']

            return (
              <button
                key={option.class}
                type="button"
                onClick={() => { if (locked && !canAfford) return; setSelectedClass(option.class) }}
                disabled={locked && !canAfford}
                className={[
                  'relative flex flex-col rounded-xl border-2 p-2.5 text-left transition',
                  theme.border, theme.bg,
                  locked && !canAfford ? 'cursor-not-allowed opacity-50' : 'hover:brightness-110',
                  selected ? `ring-2 ${theme.ring}` : '',
                ].join(' ')}
              >
                {/* Selected badge */}
                {selected && (
                  <span className="absolute right-2 top-2 rounded-full bg-white/20 p-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  </span>
                )}
                {/* Lock badge */}
                {locked && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-black text-white">
                    <Lock className="h-3 w-3" /> {price} stars
                  </span>
                )}

                {/* Character image */}
                <div className="relative h-20 w-full overflow-hidden rounded-lg [@media(max-height:400px)]:h-14">
                  <Image
                    src={option.imagePath}
                    alt={option.label}
                    fill
                    sizes="(min-width: 640px) 28vw, 90vw"
                    className="object-contain object-center scale-[1.9] origin-center drop-shadow-[0_12px_20px_rgba(0,0,0,0.6)]"
                    unoptimized
                    priority={option.class === 'warrior'}
                  />
                  {locked && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                      <Lock className="h-7 w-7 text-white/80" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="mt-2 flex-1 flex flex-col">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${theme.labelColor}`}>
                    {theme.label} · <span className="normal-case tracking-normal text-white">{option.label}</span>
                  </p>
                  <p className="mt-1 text-[11px] font-semibold leading-snug text-white/65 flex-1">{option.description}</p>

                  {/* Stats */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={`flex items-center gap-1 rounded-full ${theme.statBg} px-2 py-0.5 text-[10px] font-black text-white`}><Heart className="h-2.5 w-2.5 fill-current" /> HP {option.stats.maxHp}</span>
                    <span className={`flex items-center gap-1 rounded-full ${theme.statBg} px-2 py-0.5 text-[10px] font-black text-white`}><Swords className="h-2.5 w-2.5" /> ATK {option.stats.attack}</span>
                    <span className={`flex items-center gap-1 rounded-full ${theme.statBg} px-2 py-0.5 text-[10px] font-black text-white`}><Wind className="h-2.5 w-2.5" /> SPD {option.stats.speed}</span>
                  </div>

                  {/* Owned / status */}
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1">
                    {owned
                      ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-400" /><span className="text-xs font-black text-green-300">Owned</span></>
                      : canAfford
                        ? <><Star className="h-3.5 w-3.5 text-yellow-400" /><span className="text-xs font-black text-yellow-300">Ready to unlock</span></>
                        : <><Lock className="h-3.5 w-3.5 text-white/50" /><span className="text-xs font-black text-white/50">{Math.max(0, price - access.starBalance)} more stars needed</span></>
                    }
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex justify-center">
          <Button
            size="lg"
            loading={saving}
            icon={<Sparkles className="h-4 w-4" />}
            onClick={saveSelection}
            disabled={!name.trim() || (selectedLocked && !selectedAffordable)}
          >
            {firstPick || !selectedLocked ? 'Enter Dashboard' : `Buy & Equip (${selectedPrice} stars)`}
          </Button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-[#9B83F5]/40 bg-[#22326f]/80 px-3 py-1.5 text-center text-xs text-[#F4F2FF]">
            {error}
          </p>
        )}
      </section>
      </div>
    </main>
  )
}
