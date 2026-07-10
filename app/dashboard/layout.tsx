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
  User,
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'

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
        <div className="flex items-center gap-3 text-[#c084fc]">
          <Gamepad2 className="h-6 w-6 animate-pulse" />
          <span className="font-game text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="student-app-shell text-white">
      {/* Floating icon nav — students tap icons directly (hidden during battle via CSS) */}
      <nav className="student-nav-rail absolute right-2 top-2 z-40 flex items-center gap-1.5">
        {navItems.map(item => {
          const Icon = item.icon
          const active = activeItem === item.id
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-label={item.label}
              className={[
                'flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl border shadow-lg backdrop-blur-sm transition',
                active
                  ? 'border-yellow-300/60 bg-gradient-to-b from-purple-500 to-fuchsia-600 shadow-purple-500/50'
                  : 'border-purple-300/25 bg-[#1a1233]/80 hover:bg-purple-500/30',
              ].join(' ')}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[8px] font-black uppercase leading-none tracking-wide">{item.label}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={logout}
          aria-label="Sign out"
          className="flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl border border-pink-300/30 bg-[#1a1233]/80 shadow-lg backdrop-blur-sm transition hover:bg-pink-500/30"
        >
          <LogOut className="h-5 w-5 text-pink-200" />
          <span className="text-[8px] font-black uppercase leading-none tracking-wide text-pink-200">Exit</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="student-content max-w-full">
        {children}
      </main>
    </div>
  )
}
