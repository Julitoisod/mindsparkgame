'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gamepad2,
  History,
  Map,
  Menu,
  Play,
  Star,
  Store,
  User,
  X,
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { useGame } from '@/hooks/useGame'

import type { CharacterClass } from '@/types/character'

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

const navItems = [
  { id: 'map', label: 'Map', icon: Map, href: '/dashboard/map' },
  { id: 'profile', label: 'Profile', icon: User, href: '/dashboard/profile' },
  { id: 'store', label: 'Store', icon: Store, href: '/dashboard/store' },
  { id: 'attempts', label: 'Attempts', icon: History, href: '/dashboard/attempts' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading: authLoading, isAuthed, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const activeItem = navItems.find(item => pathname.startsWith(item.href))?.id ?? 'map'

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setSidebarOpen(false)
      }
    }
    if (sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sidebarOpen])

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Redirect unauthenticated users or teachers via useEffect (not during render)
  useEffect(() => {
    if (authLoading) return
    if (!isAuthed) {
      router.replace('/login')
    } else if (user?.role === 'teacher') {
      router.replace('/teacher/students')
    }
  }, [authLoading, isAuthed, user?.role, router])

  if (authLoading || !isAuthed || user?.role === 'teacher') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0a1f]">
        <div className="flex items-center gap-3 text-[#c084fc]">
          <Gamepad2 className="h-6 w-6 animate-pulse" />
          <span className="font-game text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-[#1a1233] via-[#3b2a73] to-[#6b21a8] text-white overflow-hidden flex flex-col">
      {/* Mobile Header */}
      <header className="shrink-0 z-30 flex items-center justify-between border-b border-purple-500/30 bg-gradient-to-r from-[#1a1233] via-[#3b2a73] to-[#581c87] px-4 py-2 lg:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg shadow-purple-500/40"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div>
            <h1 className="font-game text-lg font-black bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-300 bg-clip-text text-transparent">MindSpark</h1>
            <p className="text-xs text-purple-200">Student hub</p>
          </div>
        </div>
        <MobileStats />
      </header>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop & Mobile Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            ref={sidebarRef}
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 top-0 z-50 w-[280px] border-r border-purple-500/30 bg-gradient-to-b from-[#1a1233] via-[#3b2a73] to-[#581c87] p-4 text-white lg:relative lg:block lg:translate-x-0 lg:border-b-0 lg:bg-transparent lg:p-0 lg:pr-4"
          >
            <div className="flex items-center justify-between lg:hidden mb-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg shadow-purple-500/40">
                  <Gamepad2 className="h-6 w-6" />
                </span>
                <div>
                  <h1 className="font-game text-lg font-black bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-300 bg-clip-text text-transparent">MindSpark</h1>
                  <p className="text-xs text-purple-200">Student hub</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-purple-400/30 text-purple-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Desktop Logo - Hidden on mobile */}
            <div className="hidden lg:flex items-center gap-3 mb-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg shadow-purple-500/40">
                <Gamepad2 className="h-6 w-6" />
              </span>
              <div>
                <h1 className="font-game text-lg font-black bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-300 bg-clip-text text-transparent">MindSpark</h1>
                <p className="text-xs text-purple-200">Student hub</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
              {navItems.map((item, idx) => {
                const Icon = item.icon
                const active = activeItem === item.id
                // Colorful icon backgrounds for each nav item
                const navColors = [
                  'bg-gradient-to-br from-[#9333ea]lue-500 to-[#c084fc]yan-500 shadow-blue-500/40',     // Map
                  'bg-gradient-to-br from-purple-500 to-pink-500 shadow-purple-500/40', // Profile
                  'bg-gradient-to-br from-orange-500 to-red-500 shadow-orange-500/40',  // Store
                  'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/40', // Attempts
                ]
                const iconBg = navColors[idx % navColors.length]
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={[
                      'flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-black transition',
                      active
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-purple-500/40'
                        : 'text-purple-100 hover:bg-purple-500/20',
                    ].join(' ')}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-md text-white shadow-md ${iconBg}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Desktop Stats */}
            <div className="hidden lg:block mt-6">
              <DashboardStats />
            </div>

            {/* Sign Out */}
            <button
              onClick={logout}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-lg border border-pink-400/30 bg-pink-500/10 py-3 text-sm font-bold text-pink-100 transition hover:bg-pink-500/25"
            >
              <Play className="h-4 w-4" />
              Sign Out
            </button>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}

function MobileStats() {
  const { user } = useAuth()
  const { progress } = useGame(0)
  const [access, setAccess] = useState<CharacterAccess>(defaultAccess)

  useEffect(() => {
    if (user?.role !== 'student') return
    fetch('/api/character', { credentials: 'include' })
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data?.length) {
          setAccess(normalizeAccess(json.meta, json.data[0].class))
        }
      })
      .catch(() => {
        // Silently handle fetch failures
      })
  }, [user?.role])

  const completedLevels = progress?.completedLevels ?? []
  const unlockedLevel = Math.min(5, completedLevels.length + 1)

  return (
    <div className="flex items-center gap-2 text-white">
      <div className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 px-3 py-1.5 shadow-md shadow-yellow-500/40">
        <Star className="h-4 w-4 fill-current text-white" />
        <span className="text-sm font-black">{access.starBalance}</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 px-3 py-1.5 shadow-md shadow-purple-500/40">
        <span className="text-sm font-black">{unlockedLevel}/5</span>
      </div>
    </div>
  )
}

function DashboardStats() {
  const { user } = useAuth()
  const { progress, loadProgress } = useGame(0)
  const [access, setAccess] = useState<CharacterAccess>(defaultAccess)

  useEffect(() => {
    if (user?.role !== 'student') return
    fetch('/api/character', { credentials: 'include' })
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data?.length) {
          setAccess(normalizeAccess(json.meta, json.data[0].class))
        }
        loadProgress?.()
      })
      .catch(() => {
        // Silently handle fetch failures (e.g. DB not running, network issues)
        loadProgress?.()
      })
  }, [user?.role, loadProgress])

  const completedLevels = progress?.completedLevels ?? []
  const unlockedLevel = Math.min(5, completedLevels.length + 1)

  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg border border-purple-400/20 bg-purple-950/30 p-3 text-center">
      <div className="rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 p-3 shadow-lg shadow-yellow-500/40">
        <p className="text-[10px] font-black uppercase text-white">⭐ Stars</p>
        <p className="mt-1 flex items-center justify-center gap-1 text-xl font-black text-white">
          <Star className="h-4 w-4 fill-current" />
          {access.starBalance}
        </p>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 p-3 shadow-lg shadow-purple-500/40">
        <p className="text-[10px] font-black uppercase text-white">🗝️ Unlocked</p>
        <p className="mt-1 text-xl font-black text-white">{unlockedLevel}/5</p>
      </div>
    </div>
  )
}