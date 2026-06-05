'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Gamepad2, Lock, LogOut, Sparkles, Star } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { characterOptions } from '@/lib/characterOptions'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
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

  return (
    <main className="h-full bg-[#0f0a1f] text-white overflow-hidden flex flex-col">
      <nav className="sticky top-0 z-20 border-b border-primary-200/10 bg-[#1a1233]/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Gamepad2 className="h-6 w-6 shrink-0 text-[#c084fc]" />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black font-game">Choose Character</h1>
              <p className="truncate text-xs text-primary-100/45">{user.username} adventure profile</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" icon={<LogOut className="h-3.5 w-3.5" />} onClick={logout}>
            Sign Out
          </Button>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-4 py-6 student-scroll-area">
        <div className="mb-5 flex flex-col gap-4 rounded-lg border border-primary-200/15 bg-[#0f2116]/90 p-5 shadow-card backdrop-blur-md md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-wide text-[#c084fc]">
              {existingCharacter ? 'Current avatar' : 'First login setup'}
            </p>
            <h2 className="mt-1 text-2xl font-black">Select your player avatar before entering the dashboard</h2>
            <p className="mt-2 text-sm font-semibold text-primary-100/65">
              {existingCharacter
                ? 'Your first avatar is locked in. Use stars earned from boss clears to unlock another character.'
                : 'Your first avatar is free. After this, other avatars unlock from the store with earned stars.'}
            </p>
          </div>
          <div className="grid w-full gap-3 md:w-96 md:grid-cols-[1fr_auto] md:items-end">
            <Input
              label="Character Name"
              value={name}
              onChange={event => setName(event.target.value)}
              maxLength={64}
              placeholder="Hero name"
            />
            <div className="rounded-lg border border-primary-200/15 bg-primary-950/30 px-4 py-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-wide text-primary-100/55">Stars</p>
              <p className="flex items-center justify-center gap-1 text-xl font-black text-[#e9d5ff]">
                <Star className="h-4 w-4 fill-current" />
                {access.starBalance}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
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
                  'relative flex flex-col rounded-xl border-2 p-5 text-left transition',
                  theme.border, theme.bg,
                  locked && !canAfford ? 'cursor-not-allowed opacity-50' : 'hover:brightness-110',
                  selected ? `ring-4 ${theme.ring}` : '',
                ].join(' ')}
              >
                {/* Selected badge */}
                {selected && (
                  <span className="absolute right-3 top-3 rounded-full bg-white/20 p-1.5">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </span>
                )}
                {/* Lock badge */}
                {locked && (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-xs font-black text-white">
                    <Lock className="h-3 w-3" /> {price} stars
                  </span>
                )}

                {/* Character image */}
                <div className="relative h-44 w-full overflow-hidden rounded-lg">
                  <Image
                    src={option.imagePath}
                    alt={option.label}
                    fill
                    sizes="(min-width: 768px) 28vw, 90vw"
                    className="object-contain object-center scale-[1.9] origin-center drop-shadow-[0_12px_20px_rgba(0,0,0,0.6)]"
                    unoptimized
                    priority={option.class === 'warrior'}
                  />
                  {locked && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                      <Lock className="h-10 w-10 text-white/80" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="mt-4 flex-1 flex flex-col">
                  <p className={`text-xs font-black uppercase tracking-widest ${theme.labelColor}`}>{theme.label}</p>
                  <h3 className="mt-1 text-2xl font-black text-white">{option.label}</h3>
                  <p className="mt-2 text-sm font-semibold text-white/65 flex-1">{option.description}</p>

                  {/* Stats */}
                  <div className="mt-4 flex gap-2">
                    <span className={`flex items-center gap-1 rounded-full ${theme.statBg} px-3 py-1.5 text-xs font-black text-white`}>❤️ HP {option.stats.maxHp}</span>
                    <span className={`flex items-center gap-1 rounded-full ${theme.statBg} px-3 py-1.5 text-xs font-black text-white`}>⚔️ ATK {option.stats.attack}</span>
                    <span className={`flex items-center gap-1 rounded-full ${theme.statBg} px-3 py-1.5 text-xs font-black text-white`}>💨 SPD {option.stats.speed}</span>
                  </div>

                  {/* Owned / status */}
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5">
                    {owned
                      ? <><CheckCircle2 className="h-4 w-4 text-green-400" /><span className="text-sm font-black text-green-300">Owned</span></>
                      : canAfford
                        ? <><Star className="h-4 w-4 text-yellow-400" /><span className="text-sm font-black text-yellow-300">Ready to unlock</span></>
                        : <><Lock className="h-4 w-4 text-white/50" /><span className="text-sm font-black text-white/50">{Math.max(0, price - access.starBalance)} more stars needed</span></>
                    }
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-primary-200/35 bg-primary-950/45 px-3 py-2 text-sm text-primary-100">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end">
          {(() => {
            const selectedOption = characterOptions.find(option => option.class === selectedClass) ?? characterOptions[0]
            const firstPick = !existingCharacter
            const owned = firstPick || access.ownedClasses.includes(selectedClass) || existingCharacter?.class === selectedClass
            const price = access.prices[selectedClass] ?? selectedOption.unlockCost
            const canAfford = access.starBalance >= price
            const locked = !owned

            return (
          <Button
            size="lg"
            loading={saving}
            icon={<Sparkles className="h-4 w-4" />}
            onClick={saveSelection}
            disabled={!name.trim() || (locked && !canAfford)}
          >
            {firstPick
              ? 'Enter Dashboard'
              : locked
                ? `Buy & Equip (${price} stars)`
                : 'Enter Dashboard'}
          </Button>
            )
          })()}
        </div>
      </section>
    </main>
  )
}
