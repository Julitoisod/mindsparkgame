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
      <main className="flex min-h-screen items-center justify-center bg-game-gradient text-primary-300">
        <Sparkles className="mr-3 h-5 w-5 animate-pulse" />
        <span className="font-game text-sm">Preparing character selection...</span>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#07170d] text-white">
      <nav className="sticky top-0 z-20 border-b border-primary-200/10 bg-[#041008]/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Gamepad2 className="h-6 w-6 shrink-0 text-[#74c476]" />
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

      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-5 flex flex-col gap-4 rounded-lg border border-primary-200/15 bg-[#0f2116]/90 p-5 shadow-card backdrop-blur-md md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-wide text-[#74c476]">
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
              <p className="flex items-center justify-center gap-1 text-xl font-black text-[#c7e9c0]">
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

            return (
              <button
                key={option.class}
                type="button"
                onClick={() => {
                  if (locked && !canAfford) return
                  setSelectedClass(option.class)
                }}
                disabled={locked && !canAfford}
                className={[
                  'group relative min-h-[440px] rounded-lg border bg-[#0f2116]/90 p-4 text-left shadow-card backdrop-blur-md transition',
                  locked && !canAfford ? 'cursor-not-allowed opacity-70' : '',
                  selected
                    ? 'border-[#74c476]/80 ring-2 ring-[#74c476]/25'
                    : 'border-primary-200/10 hover:border-primary-200/30 hover:bg-[#14331f]/90',
                ].join(' ')}
              >
                {selected && (
                  <span className="absolute right-3 top-3 rounded-full bg-[#74c476] p-1.5 text-[#041008]">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                )}
                {locked && (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-primary-200/20 bg-primary-950/60 px-3 py-1 text-xs font-black text-primary-50">
                    <Lock className="h-3.5 w-3.5" />
                    {price} stars
                  </span>
                )}
                <div className="relative mx-auto h-64 w-full">
                  <Image
                    src={option.imagePath}
                    alt={option.label}
                    fill
                    sizes="(min-width: 768px) 30vw, 90vw"
                    className="object-contain object-bottom drop-shadow-[0_18px_24px_rgba(0,0,0,0.45)]"
                    unoptimized
                    priority={option.class === 'warrior'}
                  />
                  {locked && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-primary-950/40">
                      <Lock className="h-10 w-10 text-white/90" />
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-primary-100/45">{option.class}</p>
                  <h3 className="mt-1 text-xl font-black">{option.label}</h3>
                  <p className="mt-2 min-h-12 text-sm font-semibold text-primary-100/65">{option.description}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-bold">
                    <span className="rounded-md bg-primary-950/30 px-2 py-2 text-primary-100">HP {option.stats.maxHp}</span>
                    <span className="rounded-md bg-primary-950/30 px-2 py-2 text-primary-100">ATK {option.stats.attack}</span>
                    <span className="rounded-md bg-primary-950/30 px-2 py-2 text-primary-100">SPD {option.stats.speed}</span>
                  </div>
                  <p className="mt-3 rounded-md bg-primary-950/30 px-3 py-2 text-xs font-bold text-[#c7e9c0]">
                    {owned ? 'Owned' : canAfford ? 'Ready to unlock' : `${Math.max(0, price - access.starBalance)} more stars needed`}
                  </p>
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
