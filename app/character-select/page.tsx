'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Check, CheckCircle2, Compass, Gamepad2, Heart, Loader2, Lock, LogOut, Sparkles, Star, Swords, Wind } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { characterOptions } from '@/lib/characterOptions'
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
      {/* Suggested design (Nov 24): the same kingdom art as the other student
          screens (it replaces the 2026-10 night scene) */}
      <Image
        src="/revision/student-login-bg.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c1f63]/35 via-[#0c1f63]/20 to-[#160f48]/75" />

      <div className="relative z-10 flex h-full flex-col">
      <nav className="sticky top-0 z-20 border-b-2 border-[color:var(--ms-edge)] bg-gradient-to-b from-[#173a9e]/95 to-[#0c1f63]/95 px-3 py-1 shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="game-badge game-badge-blue h-8 w-8"><Gamepad2 className="h-4 w-4" /></span>
            <h1 className="game-title truncate text-lg">Choose Character</h1>
            <span className="h-4 w-px shrink-0 bg-white/30" aria-hidden />
            <p className="truncate text-[11px] font-semibold text-white/75">Select your adventure profile</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-white/60 bg-white/10 px-3 py-1 text-xs font-black text-white transition hover:bg-white/20"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </nav>

      <section className="mx-auto w-full max-w-7xl px-4 py-2 student-scroll-area">
        {/* Item 8: centered title, avatar row, then one Enter Dashboard button.
            The star counter that used to sit here is gone — stars live in the
            dashboard only (item 7). The character name is assigned
            automatically so the student just picks a face and goes. */}
        <div className="mb-3 text-center [@media(max-height:460px)]:mb-1.5">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#c4b5fd]/70 bg-gradient-to-b from-[#5b2bb5] to-[#34137e] px-4 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#ede9fe] shadow">
            <span className="text-[color:var(--ms-gold)]" aria-hidden>◆</span>
            {existingCharacter ? 'Current avatar' : 'First login setup'}
            <span className="text-[color:var(--ms-gold)]" aria-hidden>◆</span>
          </p>
          <h2 className="game-title mt-1 flex items-center justify-center gap-3 text-xl [@media(max-height:460px)]:mt-0.5 [@media(max-height:460px)]:text-lg">
            <Sparkles className="h-5 w-5 fill-[var(--ms-gold)] text-[color:var(--ms-gold)]" />
            Pick your avatar to start
            <Sparkles className="h-5 w-5 fill-[var(--ms-gold)] text-[color:var(--ms-gold)]" />
          </h2>
          <p className="mt-1 text-[11px] font-semibold text-[#F4F2FF]/80 [@media(max-height:460px)]:hidden">
            {existingCharacter
              ? 'First avatar is locked in. Unlock more with stars from boss clears.'
              : 'Your first avatar is free! Unlock more later with earned stars.'}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 [@media(max-height:460px)]:gap-2.5">
          {characterOptions.map(option => {
            const selected = selectedClass === option.class
            const firstPick = !existingCharacter
            const owned = firstPick || access.ownedClasses.includes(option.class) || existingCharacter?.class === option.class
            const price = access.prices[option.class] ?? option.unlockCost
            const canAfford = access.starBalance >= price
            const locked = !owned

            // Each class glows in its own colour; `color` also tints the magic circle
            const classTheme: Record<string, { color: string; tint: string; labelColor: string; label: string }> = {
              warrior: { color: '#4aa3ff', tint: 'from-[#14317a] to-[#0a1a48]', labelColor: 'text-[#7cc4ff]', label: 'WARRIOR' },
              mage:    { color: '#c77dff', tint: 'from-[#3d1a78] to-[#1c0b45]', labelColor: 'text-[#d8a8ff]', label: 'MAGE' },
              archer:  { color: '#3ddc84', tint: 'from-[#14532d] to-[#0a2a18]', labelColor: 'text-[#86efac]', label: 'ARCHER' },
            }
            const theme = classTheme[option.class] ?? classTheme['warrior']

            return (
              <button
                key={option.class}
                type="button"
                onClick={() => { if (locked && !canAfford) return; setSelectedClass(option.class) }}
                disabled={locked && !canAfford}
                className={[
                  'relative flex flex-col overflow-hidden rounded-2xl border-2 bg-gradient-to-b p-2.5 text-left transition [@media(max-height:460px)]:p-1.5',
                  theme.tint,
                  locked && !canAfford ? 'cursor-not-allowed opacity-50' : 'hover:brightness-110',
                ].join(' ')}
                style={{
                  borderColor: theme.color,
                  color: theme.color,
                  boxShadow: selected ? `0 0 0 2px ${theme.color}66, 0 0 22px ${theme.color}aa` : `0 0 10px ${theme.color}55`,
                }}
              >
                {/* Selected badge */}
                {selected && (
                  <span className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-white/20">
                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                  </span>
                )}
                {/* Lock badge */}
                {locked && (
                  <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-black text-white">
                    <Lock className="h-3 w-3" /> {price} stars
                  </span>
                )}

                {/* The hero on a magic circle */}
                <div className="relative h-24 w-full overflow-hidden [@media(max-height:460px)]:h-20">
                  <span className="game-magic-circle" aria-hidden />
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
                <div className="mt-1.5 flex flex-1 flex-col">
                  <p className={`text-center text-[11px] font-black uppercase tracking-widest ${theme.labelColor}`}>
                    {theme.label} <span className="normal-case tracking-normal text-white">· {option.label}</span>
                  </p>
                  <p className="mt-1 flex-1 text-center text-[11px] font-semibold leading-snug text-white/70 [@media(max-height:460px)]:hidden">{option.description}</p>

                  {/* Stats */}
                  <div className="mt-1.5 flex flex-wrap justify-center gap-1.5 [@media(max-height:460px)]:mt-1">
                    <span className="flex items-center gap-1 rounded-full border border-white/15 bg-black/35 px-2 py-0.5 text-[10px] font-black text-white"><Heart className="h-2.5 w-2.5 fill-[#f87171] text-[#ef4444]" /> HP {option.stats.maxHp}</span>
                    <span className="flex items-center gap-1 rounded-full border border-white/15 bg-black/35 px-2 py-0.5 text-[10px] font-black text-white"><Swords className="h-2.5 w-2.5 text-[#67e8f9]" /> ATK {option.stats.attack}</span>
                    <span className="flex items-center gap-1 rounded-full border border-white/15 bg-black/35 px-2 py-0.5 text-[10px] font-black text-white"><Wind className="h-2.5 w-2.5 text-[#93c5fd]" /> SPD {option.stats.speed}</span>
                  </div>

                  {/* Owned / status */}
                  <div className={`mt-1.5 flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1 [@media(max-height:460px)]:mt-1 [@media(max-height:460px)]:py-0.5 ${owned ? 'border-[#4ade80]/50 bg-[#14532d]/60' : 'border-white/15 bg-black/30'}`}>
                    {owned
                      ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-400" /><span className="text-xs font-black text-green-300">Owned</span></>
                      : canAfford
                        ? <><Star className="h-3.5 w-3.5 fill-[var(--ms-gold)] text-[color:var(--ms-gold)]" /><span className="text-xs font-black text-yellow-300">Ready to unlock</span></>
                        : <><Lock className="h-3.5 w-3.5 text-white/50" /><span className="text-xs font-black text-white/50">{Math.max(0, price - access.starBalance)} more stars needed</span></>
                    }
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex justify-center [@media(max-height:460px)]:mt-2.5">
          <button
            type="button"
            onClick={saveSelection}
            disabled={saving || !name.trim() || (selectedLocked && !selectedAffordable)}
            className="game-btn-gold px-8 py-1.5 text-lg"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Compass className="h-5 w-5" />}
            {firstPick || !selectedLocked ? 'Enter Dashboard' : `Buy & Equip (${selectedPrice} stars)`}
          </button>
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
