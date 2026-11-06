'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Gamepad2,
  History,
  LogOut,
  Map,
  Store,
  Trophy,
  User,
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { id: 'map', label: 'Map', icon: Map, href: '/dashboard/map' },
  { id: 'profile', label: 'Profile', icon: User, href: '/dashboard/profile' },
  { id: 'store', label: 'Store', icon: Store, href: '/dashboard/store' },
  { id: 'leaderboard', label: 'Ranks', icon: Trophy, href: '/dashboard/leaderboard' },
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

  const activeItem = navItems.find(item => pathname.startsWith(item.href))?.id ?? 'map'

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
      <div className="flex h-full items-center justify-center bg-[#0f0a1f]">
        <div className="flex items-center gap-3 text-[#9B83F5]">
          <Gamepad2 className="h-6 w-6 animate-pulse" />
          <span className="font-game text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="student-app-shell text-white">
      {/* Floating icon nav — one rounded tray, every button the same shape
          (Nov 2026). Its size lives in --student-nav-w / -h (globals.css) so
          page headers can keep clear of it. Hidden during battle via CSS. */}
      <nav className="student-nav-rail absolute right-2 top-2 z-40 flex items-center gap-1.5 rounded-[22px] border border-white/15 bg-[#1a1233]/55 p-1.5 shadow-xl backdrop-blur-md">
        {navItems.map(item => {
          const Icon = item.icon
          const active = activeItem === item.id
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-2xl border transition',
                active
                  ? 'border-yellow-300/70 bg-gradient-to-b from-[#9B83F5] to-[#6255E8] shadow-md shadow-[#6255E8]/50'
                  : 'border-white/10 bg-white/5 hover:bg-[#6255E8]/40',
              ].join(' ')}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="text-[8px] font-black uppercase leading-none tracking-wide">{item.label}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={logout}
          aria-label="Log out"
          className="flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-2xl border border-pink-300/25 bg-white/5 transition hover:bg-pink-500/30"
        >
          <LogOut className="h-[18px] w-[18px] text-pink-200" />
          <span className="text-[8px] font-black uppercase leading-none tracking-wide text-pink-200">Logout</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="student-content max-w-full">
        {children}
      </main>
    </div>
  )
}
